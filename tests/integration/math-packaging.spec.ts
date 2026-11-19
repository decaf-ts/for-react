/**
 * @module for-react/math-packaging.spec
 * @summary SAA-1938 — built-artifact regression for the dual ESM+CJS
 * `./math` export (SAA-1937 / DECAF-895).
 * @description Mirrors `barcode-packaging.spec.ts` and proves the packaged
 * contract outside Jest's module registry with fresh Node processes:
 *
 * - `exports["./math"]` declares `import.types`/`import.default`,
 *   `require.types`/`require.default` and `default`;
 * - plain-node ESM resolves `@decaf-ts/for-react/math` to the ESM bundle and
 *   exposes exactly the three runtime exports;
 * - plain-node CJS loads the same subpath (no
 *   `ERR_PACKAGE_PATH_NOT_EXPORTED`), exposes the same three exports, and does
 *   not evaluate `mathlive` at module load;
 * - the CJS artifact keeps the `mathlive` require inside the component
 *   function body, never at module top level;
 * - the `mathlive` export map keeps the SSR/import-only condition for ESM
 *   while CJS `require('mathlive')` still resolves via `default`/`require`
 *   (browser library; its console warning and browser-only evaluation are
 *   allowed);
 * - plain-node `react-dom/server` renders the inert `<math-field>` host with
 *   no MathLive evaluation.
 *
 * Each probe runs in a fresh process so the module cache cannot leak between
 * assertions. The built-artifact suite skips with an explicit message when
 * `lib/` has not been built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");

const CJS_ROOT = path.join(ROOT, "lib/cjs/index.cjs");
const ESM_ROOT = path.join(ROOT, "lib/esm/index.js");
const CJS_MATH = path.join(ROOT, "lib/cjs/math/index.cjs");
const ESM_MATH = path.join(ROOT, "lib/esm/math/index.js");
const CJS_MATH_COMPONENT = path.join(
  ROOT,
  "lib/cjs/math/components/math-input/MathInput.cjs"
);

const HAS_LIB = [
  CJS_ROOT,
  ESM_ROOT,
  CJS_MATH,
  ESM_MATH,
  CJS_MATH_COMPONENT,
].every((file) => fs.existsSync(file));
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/ is not built; run `npm run build:prod` before this probe";

const MATH_SUBPATH = "@decaf-ts/for-react/math";
const PUBLIC_EXPORTS = [
  "MathInput",
  "MathInputComponent",
  "RgxMathInput",
].sort();
const MATHLIVE_CACHE = /[\\/]node_modules[\\/]mathlive[\\/]/;

interface ProbeResult {
  resolved?: string;
  keys?: string[];
  loaded?: string[];
  html?: string;
  err?: string | null;
}

function probe(
  script: string,
  flags: string[] = [],
  env: NodeJS.ProcessEnv = {}
): ProbeResult {
  const stdout = execFileSync(process.execPath, [...flags, "-e", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return JSON.parse(stdout.trim()) as ProbeResult;
}

const ESM_MATH_PROBE = `
import { registerHooks } from 'node:module';
const seen = [];
registerHooks({ resolve(specifier, context, nextResolve) { seen.push(specifier); return nextResolve(specifier, context); } });
const resolved = import.meta.resolve('${MATH_SUBPATH}');
const mod = await import('${MATH_SUBPATH}');
const loaded = seen.filter((specifier) => /^mathlive$/.test(specifier));
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort(), loaded }));
`;

const CJS_MATH_PROBE = `
const mod = require('${MATH_SUBPATH}');
const loaded = Object.keys(require.cache).filter((key) => ${MATHLIVE_CACHE.toString()}.test(key));
process.stdout.write(JSON.stringify({ keys: Object.keys(mod).sort(), loaded }));
`;

const ESM_MATHLIVE_RESOLVE_PROBE = `
const resolved = import.meta.resolve('mathlive');
process.stdout.write(JSON.stringify({ resolved }));
`;

const CJS_MATHLIVE_PROBE = `
const original = { log: console.log, warn: console.warn, info: console.info, error: console.error };
console.log = console.warn = console.info = console.error = () => undefined;
let resolved;
let err = null;
try { resolved = require.resolve('mathlive'); } catch (error) { err = error.code || error.name; }
try { require('mathlive'); } catch (error) { err = err || error.code || error.name; }
Object.assign(console, original);
process.stdout.write(JSON.stringify({ resolved, err }));
`;

const SSR_MATH_PROBE = `
import { registerHooks } from 'node:module';
const seen = [];
registerHooks({ resolve(specifier, context, nextResolve) { seen.push(specifier); return nextResolve(specifier, context); } });
const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');
const mod = await import('${MATH_SUBPATH}');
const html = renderToStaticMarkup(React.createElement(mod.MathInput, { value: 'x', placeholder: 'y', disabled: true }));
const loaded = seen.filter((specifier) => /^mathlive$/.test(specifier));
process.stdout.write(JSON.stringify({ html, loaded }));
`;

describe("math packaging", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<string, any>;
  };

  const mathExport = packageJson.exports?.["./math"] as
    string | Record<string, any> | undefined;

  it("declares ./math as a dual ESM+CJS export", () => {
    expect(typeof mathExport).toBe("object");
    expect(Array.isArray(mathExport)).toBe(false);

    const conditions = mathExport as Record<string, any>;
    expect(conditions.import?.types).toBe("./lib/types/math/index.d.mts");
    expect(conditions.import?.default).toBe("./lib/esm/math/index.js");
    expect(conditions.require?.types).toBe("./lib/types/math/index.d.cts");
    expect(conditions.require?.default).toBe("./lib/cjs/math/index.cjs");
    expect(conditions.default).toBe("./lib/esm/math/index.js");
  });

  (HAS_LIB ? describe : describe.skip)("built artifacts", () => {
    if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

    it("keeps the mathlive require inside the component body, never at top level", () => {
      const source = fs.readFileSync(CJS_MATH_COMPONENT, "utf8");
      const componentStart = source.indexOf("function MathInput(");

      expect(componentStart).toBeGreaterThan(-1);

      const requires = [...source.matchAll(/require\(["']mathlive["']\)/g)];
      expect(requires.length).toBeGreaterThan(0);

      for (const occurrence of requires) {
        expect(occurrence.index as number).toBeGreaterThan(componentStart);
      }

      const code = source.replace(/\/\*[\s\S]*?\*\//g, "");
      const codeComponentStart = code.indexOf("function MathInput(");
      expect(codeComponentStart).toBeGreaterThan(-1);

      for (const occurrence of code.matchAll(/mathlive/g)) {
        expect(occurrence.index as number).toBeGreaterThan(codeComponentStart);
      }

      const requireLine = source
        .split(/\r?\n/)
        .find((line) => /require\(["']mathlive["']\)/.test(line));
      expect(requireLine?.trim()).toMatch(
        /^importPromiseRef\.current = Promise\.resolve\(\)\.then/
      );
    });

    it("resolves ./math through plain-node ESM and exposes the three exports", () => {
      const result = probe(ESM_MATH_PROBE, ["--input-type=module"]);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]esm[\\/]math[\\/]index\.js$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.loaded).toEqual([]);
    });

    it("loads ./math through plain-node CJS without evaluating mathlive", () => {
      const result = probe(CJS_MATH_PROBE);

      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.loaded).toEqual([]);
    });

    it("resolves mathlive to the import-only SSR entry for the node condition", () => {
      const result = probe(ESM_MATHLIVE_RESOLVE_PROBE, ["--input-type=module"]);

      expect(result.resolved).toMatch(/mathlive-ssr\.min\.mjs$/);
    });

    it("resolves mathlive from CJS via the default/require condition", () => {
      const result = probe(CJS_MATHLIVE_PROBE);

      expect(result.resolved).toMatch(/[\\/]mathlive[\\/]mathlive\.min\.js$/);
      expect(result.err).not.toBe("ERR_PACKAGE_PATH_NOT_EXPORTED");
    });

    it("server-renders the inert math-field host without evaluating mathlive", () => {
      const result = probe(SSR_MATH_PROBE, ["--input-type=module"]);

      expect(result.html).toContain("<math-field");
      expect(result.html).toContain("decaf-math-input__field");
      expect(result.html).toMatch(/<math-field[^>]*><\/math-field>/);
      expect(result.loaded).toEqual([]);
    });
  });
});
