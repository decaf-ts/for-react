/**
 * @module for-react/charts-subpath-isolation.spec
 * @summary SAA-2076 — `./charts` subpath isolation from the package root.
 * @description Proves the package contract outside the Jest module registry by
 * probing the emitted bundles in fresh Node processes:
 *
 * - `package.json` maps `./charts` to the emitted ESM/CJS entrypoints;
 * - importing the package root (CJS `require` and ESM dynamic `import`) never
 *   evaluates `echarts` or `@cortex-js/compute-engine`;
 * - the `./charts` subpath loads both heavy engines.
 *
 * Each probe runs in a fresh process so the module cache cannot leak between
 * assertions. The suite skips with an explicit message only when `lib/` has not
 * been built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");

const CJS_ROOT = path.join(ROOT, "lib/cjs/index.cjs");
const CJS_CHARTS = path.join(ROOT, "lib/cjs/charts/index.cjs");
const ESM_ROOT = path.join(ROOT, "lib/esm/index.js");
const ESM_CHARTS = path.join(ROOT, "lib/esm/charts/index.js");

const HAS_LIB = [CJS_ROOT, CJS_CHARTS, ESM_ROOT, ESM_CHARTS].every((file) =>
  fs.existsSync(file)
);
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/ is not built; run the package build before this probe";

const ECHARTS_CACHE = /[\\/]node_modules[\\/]echarts[\\/]/;
const COMPUTE_ENGINE_CACHE = /[\\/]node_modules[\\/]@cortex-js[\\/]compute-engine[\\/]/;
const ECHARTS_SPECIFIER = /^echarts(\/|$)/;
const COMPUTE_ENGINE_SPECIFIER = /^@cortex-js\/compute-engine(\/|$)/;

function probe(script: string, flags: string[] = []): Record<string, unknown> {
  const stdout = execFileSync(process.execPath, [...flags, "-e", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env },
  });
  return JSON.parse(stdout.trim()) as Record<string, unknown>;
}

const CJS_PROBE = (entry: string) => `
const mod = require('${entry}');
const loaded = Object.keys(require.cache).filter(
  (key) => ${ECHARTS_CACHE.toString()}.test(key) || ${COMPUTE_ENGINE_CACHE.toString()}.test(key)
);
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, loaded, keys: Object.keys(mod).sort() }));
`;

const ESM_PROBE = (entry: string) => `
import { registerHooks } from 'node:module';
const seen = [];
registerHooks({ resolve(specifier, context, nextResolve) { seen.push(specifier); return nextResolve(specifier, context); } });
const mod = await import('${entry}');
const loaded = seen.filter(
  (specifier) => ${ECHARTS_SPECIFIER.toString()}.test(specifier) || ${COMPUTE_ENGINE_SPECIFIER.toString()}.test(specifier)
);
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, loaded, keys: Object.keys(mod).sort() }));
`;

function expectEngines(loaded: unknown): void {
  const specifiers = loaded as string[];
  expect(
    specifiers.some((specifier) => /^echarts(\/|$)/.test(specifier) || /[\\/]echarts[\\/]/.test(specifier))
  ).toBe(true);
  expect(
    specifiers.some(
      (specifier) =>
        /^@cortex-js\/compute-engine(\/|$)/.test(specifier) ||
        /[\\/]@cortex-js[\\/]compute-engine[\\/]/.test(specifier)
    )
  ).toBe(true);
}

(HAS_LIB ? describe : describe.skip)("charts subpath isolation", () => {
  if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<
      string,
      { import?: { default?: string }; require?: { default?: string } }
    >;
  };

  it("maps the ./charts subpath to the emitted ESM and CJS entrypoints", () => {
    const charts = packageJson.exports?.["./charts"];
    expect(charts?.import?.default).toBe("./lib/esm/charts/index.js");
    expect(charts?.require?.default).toBe("./lib/cjs/charts/index.cjs");
  });

  it("does not load echarts or the compute engine from the CJS root", () => {
    const result = probe(CJS_PROBE("./lib/cjs/index.cjs"));
    expect(result.loaded).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it("does not load echarts or the compute engine from the ESM root", () => {
    const result = probe(ESM_PROBE("./lib/esm/index.js"), [
      "--input-type=module",
    ]);
    expect(result.loaded).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it("loads both engines from ./charts (CJS)", () => {
    const result = probe(CJS_PROBE("./lib/cjs/charts/index.cjs"));
    expect(result.count).toBe(56);
    expectEngines(result.loaded);
  });

  it("loads both engines from ./charts (ESM)", () => {
    const result = probe(ESM_PROBE("./lib/esm/charts/index.js"), [
      "--input-type=module",
    ]);
    expect(result.count).toBe(56);
    expectEngines(result.loaded);
  });

  it("keeps the charts surface out of the package root export", () => {
    const root = probe(CJS_PROBE("./lib/cjs/index.cjs"));
    const keys = root.keys as string[];
    for (const key of [
      "LineChart",
      "BarChart",
      "CurveEditor",
      "VirtualDataset",
      "buildChartOption",
    ]) {
      expect(keys).not.toContain(key);
    }
  });
});
