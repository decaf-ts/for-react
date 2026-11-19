/**
 * @module for-react/barcode-packaging.spec
 * @summary SAA-1928 — built-artifact regression for the ESM-only `./barcode` export.
 * @description Proves the packaged contract outside Jest's module registry by
 * probing the emitted bundles and the package export map in fresh Node
 * processes:
 *
 * - `exports["./barcode"]` declares only an `import` condition, resolving to
 *   `./lib/esm/barcode/index.js`, with no `require` and no top-level `default`
 *   (the SAA-1923 ESM-only choice, forced by `@bwip-js/browser@4.11.4`
 *   publishing only `types` + `import`);
 * - importing `@decaf-ts/for-react/barcode` resolves and exposes exactly the
 *   seven public exports;
 * - the package root never evaluates `@bwip-js/browser`, under both the CJS
 *   (`require.cache`) and ESM (`registerHooks` resolved specifiers) probes;
 * - the `./barcode` entrypoint does evaluate the encoder (positive control
 *   that the probe can actually detect evaluation).
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
const ESM_BARCODE = path.join(ROOT, "lib/esm/barcode/index.js");

const HAS_LIB = [CJS_ROOT, ESM_ROOT, ESM_BARCODE].every((file) =>
  fs.existsSync(file)
);
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/ is not built; run `npm run build:prod` before this probe";

const BWIP_CACHE = /[\\/]node_modules[\\/]@bwip-js[\\/]browser[\\/]/;
const BWIP_SPECIFIER = /^@bwip-js\/browser$/;
const BARCODE_SUBPATH = "@decaf-ts/for-react/barcode";

const PUBLIC_EXPORTS = [
  "Barcode",
  "BarcodeComponent",
  "BarcodeTypes",
  "DEFAULT_BARCODE_OPTIONS",
  "createBarcodeContainer",
  "renderBarcodeSvg",
  "validateBarcodeSvg",
].sort();

interface ProbeResult {
  count?: number;
  keys?: string[];
  loaded?: unknown[];
  resolved?: string;
}

function probe(script: string, flags: string[] = []): ProbeResult {
  const stdout = execFileSync(process.execPath, [...flags, "-e", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env },
  });
  return JSON.parse(stdout.trim()) as ProbeResult;
}

const CJS_ROOT_PROBE = `
const mod = require('./lib/cjs/index.cjs');
const loaded = Object.keys(require.cache).filter((key) => ${BWIP_CACHE.toString()}.test(key));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, loaded }));
`;

const ESM_ROOT_PROBE = `
import { registerHooks } from 'node:module';
const seen = [];
registerHooks({ resolve(specifier, context, nextResolve) { seen.push(specifier); return nextResolve(specifier, context); } });
const mod = await import('./lib/esm/index.js');
const loaded = seen.filter((specifier) => ${BWIP_SPECIFIER.toString()}.test(specifier));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, loaded }));
`;

const ESM_BARCODE_PROBE = `
import { registerHooks } from 'node:module';
const seen = [];
registerHooks({ resolve(specifier, context, nextResolve) { seen.push(specifier); return nextResolve(specifier, context); } });
const resolved = import.meta.resolve('${BARCODE_SUBPATH}');
const mod = await import('${BARCODE_SUBPATH}');
const loaded = seen.filter((specifier) => ${BWIP_SPECIFIER.toString()}.test(specifier));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, keys: Object.keys(mod), loaded, resolved }));
`;

describe("barcode packaging", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<string, any>;
  };

  const barcodeExport = packageJson.exports?.["./barcode"];
  const conditions: Record<string, any> =
    typeof barcodeExport === "string"
      ? { default: barcodeExport }
      : ((barcodeExport as Record<string, any>) ?? {});

  it("declares ./barcode as an ESM-only import condition", () => {
    expect(typeof barcodeExport).toBe("object");
    expect(Array.isArray(barcodeExport)).toBe(false);
    expect(conditions.import?.default).toBe("./lib/esm/barcode/index.js");
    expect(conditions).not.toHaveProperty("require");
    expect(conditions).not.toHaveProperty("default");
  });

  (HAS_LIB ? describe : describe.skip)("built artifacts", () => {
    if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

    it("does not evaluate @bwip-js/browser from the CJS package root", () => {
      const result = probe(CJS_ROOT_PROBE);
      expect(result.loaded).toEqual([]);
      expect(result.count as number).toBeGreaterThan(100);
    });

    it("does not evaluate @bwip-js/browser from the ESM package root", () => {
      const result = probe(ESM_ROOT_PROBE, ["--input-type=module"]);
      expect(result.loaded).toEqual([]);
      expect(result.count as number).toBeGreaterThan(100);
    });

    it("resolves ./barcode to the ESM bundle and exposes exactly the seven public exports", () => {
      const result = probe(ESM_BARCODE_PROBE, ["--input-type=module"]);
      expect(result.resolved).toMatch(/[\\/]lib[\\/]esm[\\/]barcode[\\/]index\.js$/);
      expect(result.keys?.slice().sort()).toEqual(PUBLIC_EXPORTS);
      expect(result.count).toBe(PUBLIC_EXPORTS.length);
    });

    it("evaluates @bwip-js/browser only on the ./barcode entrypoint", () => {
      const isolated = probe(ESM_ROOT_PROBE, ["--input-type=module"]);
      expect(isolated.loaded).toEqual([]);

      const barcode = probe(ESM_BARCODE_PROBE, ["--input-type=module"]);
      expect(barcode.loaded as string[]).toEqual(
        expect.arrayContaining([expect.stringMatching(BWIP_SPECIFIER)])
      );
    });
  });
});
