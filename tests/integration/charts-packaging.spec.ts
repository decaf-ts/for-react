/**
 * @module for-react/charts-packaging.spec
 * @summary SAA-2076 — built-artifact regression for the dual ESM+CJS
 * `./charts` export (DECAF-895 / SAA-2072).
 * @description Mirrors `kanban-packaging.spec.ts` and proves the packaged
 * contract outside Jest's module registry with fresh Node processes:
 *
 * - `exports["./charts"]` declares `import.types`/`import.default`,
 *   `require.types`/`require.default` and `default`;
 * - `exports["./charts/styles.css"]` maps to the bundled stylesheet;
 * - the emitted ESM/CJS entrypoints, type declarations and stylesheet exist;
 * - plain-node ESM and CJS resolve `@decaf-ts/for-react/charts` to their
 *   respective bundles and expose the same 56-key runtime surface.
 *
 * Each probe runs in a fresh process so the module cache cannot leak between
 * assertions. The built-artifact suite skips with an explicit message when
 * `lib/` has not been built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");

const CJS_CHARTS = path.join(ROOT, "lib/cjs/charts/index.cjs");
const ESM_CHARTS = path.join(ROOT, "lib/esm/charts/index.js");
const CJS_TYPES = path.join(ROOT, "lib/types/charts/index.d.cts");
const ESM_TYPES = path.join(ROOT, "lib/types/charts/index.d.mts");
const CHARTS_CSS = path.join(ROOT, "lib/charts/styles.css");

const HAS_LIB = [CJS_CHARTS, ESM_CHARTS].every((file) => fs.existsSync(file));
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/charts is not built; run `npm run build:prod` before this probe";

const CHARTS_SUBPATH = "@decaf-ts/for-react/charts";

const PUBLIC_EXPORTS = [
  "BarChart",
  "BarChartComponent",
  "BarChartConfigModel",
  "BaseChart",
  "CHART_CONFIG_DEFAULTS",
  "CHART_CONFIG_MODELS",
  "CHART_TYPES",
  "ChartComponent",
  "CurveEditor",
  "CurveEditorComponent",
  "LineChart",
  "LineChartComponent",
  "LineChartConfigModel",
  "PieChart",
  "PieChartComponent",
  "PieChartConfigModel",
  "RgxBarChart",
  "RgxChart",
  "RgxCurveEditor",
  "RgxLineChart",
  "RgxPieChart",
  "RgxScatterChart",
  "ScatterChart",
  "ScatterChartComponent",
  "ScatterChartConfigModel",
  "VirtualDataset",
  "VirtualDatasetView",
  "applyVirtualDatasetQueryOptions",
  "buildChartConfigModel",
  "buildChartOption",
  "chartCategories",
  "chartConfigModelFor",
  "chartRowValue",
  "combineVirtualDatasetConditions",
  "computeMonotoneTangents",
  "curveToLatex",
  "dataToPixel",
  "evaluateCurve",
  "formatLatexNumber",
  "groupChartRows",
  "intersectVirtualDatasetProjection",
  "isChartDatasetSource",
  "isChartDatasetView",
  "mergeVirtualDatasetQuery",
  "normalizeChartConfig",
  "normalizeVirtualDatasetQuery",
  "pixelToData",
  "polynomialLatex",
  "registerChartComponents",
  "sampleCurve",
  "seriesValues",
  "sortCurvePoints",
  "toChartDatasetSource",
  "toChartRows",
  "toPlainChartConfig",
  "useECharts",
].sort();

interface ProbeResult {
  resolved?: string;
  keys?: string[];
}

function probe(script: string, flags: string[] = []): ProbeResult {
  const stdout = execFileSync(process.execPath, [...flags, "-e", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env },
  });
  return JSON.parse(stdout.trim()) as ProbeResult;
}

const ESM_CHARTS_PROBE = `
const resolved = import.meta.resolve('${CHARTS_SUBPATH}');
const mod = await import('${CHARTS_SUBPATH}');
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort() }));
`;

const CJS_CHARTS_PROBE = `
const resolved = require.resolve('${CHARTS_SUBPATH}');
const mod = require('${CHARTS_SUBPATH}');
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort() }));
`;

describe("charts packaging", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<string, any>;
  };

  const chartsExport = packageJson.exports?.["./charts"] as
    | string
    | Record<string, any>
    | undefined;

  it("declares ./charts as a dual ESM+CJS export", () => {
    expect(typeof chartsExport).toBe("object");
    expect(Array.isArray(chartsExport)).toBe(false);

    const conditions = chartsExport as Record<string, any>;
    expect(conditions.import?.types).toBe("./lib/types/charts/index.d.mts");
    expect(conditions.import?.default).toBe("./lib/esm/charts/index.js");
    expect(conditions.require?.types).toBe("./lib/types/charts/index.d.cts");
    expect(conditions.require?.default).toBe("./lib/cjs/charts/index.cjs");
    expect(conditions.default).toBe("./lib/esm/charts/index.js");
  });

  it("maps ./charts/styles.css to the bundled stylesheet", () => {
    expect(packageJson.exports?.["./charts/styles.css"]).toBe(
      "./lib/charts/styles.css"
    );
  });

  (HAS_LIB ? describe : describe.skip)("built artifacts", () => {
    if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

    it("ships both entrypoints and type declarations", () => {
      expect(fs.existsSync(ESM_CHARTS)).toBe(true);
      expect(fs.existsSync(CJS_CHARTS)).toBe(true);
      expect(fs.existsSync(ESM_TYPES)).toBe(true);
      expect(fs.existsSync(CJS_TYPES)).toBe(true);
    });

    it("ships the bundled stylesheet next to the entrypoints", () => {
      expect(fs.existsSync(CHARTS_CSS)).toBe(true);
      const css = fs.readFileSync(CHARTS_CSS, "utf8");
      expect(css).toContain(".dcf-chart");
      expect(css).toContain(".dcf-curve-editor");
    });

    it("resolves ./charts through plain-node ESM and exposes 56 exports", () => {
      const result = probe(ESM_CHARTS_PROBE, ["--input-type=module"]);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]esm[\\/]charts[\\/]index\.js$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(56);
    });

    it("loads ./charts through plain-node CJS and exposes 56 exports", () => {
      const result = probe(CJS_CHARTS_PROBE);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]cjs[\\/]charts[\\/]index\.cjs$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(56);
    });
  });
});
