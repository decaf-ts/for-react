/**
 * @module for-react/cron-packaging.spec
 * @summary SAA-1957 — built-artifact regression for the dual ESM+CJS
 * `./cron` export (SAA-1955 / DECAF-895).
 * @description Mirrors `math-packaging.spec.ts` and proves the packaged
 * contract outside Jest's module registry with fresh Node processes:
 *
 * - `exports["./cron"]` declares `import.types`/`import.default`,
 *   `require.types`/`require.default` and `default`;
 * - plain-node ESM resolves `@decaf-ts/for-react/cron` to the ESM bundle and
 *   exposes exactly the 27 public exports;
 * - plain-node CJS loads the same subpath (no
 *   `ERR_PACKAGE_PATH_NOT_EXPORTED`) through `lib/cjs/cron/index.cjs` and
 *   exposes the same 27 exports.
 *
 * Each probe runs in a fresh process so the module cache cannot leak between
 * assertions. The built-artifact suite skips with an explicit message when
 * `lib/` has not been built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");

const CJS_CRON = path.join(ROOT, "lib/cjs/cron/index.cjs");
const ESM_CRON = path.join(ROOT, "lib/esm/cron/index.js");

const HAS_LIB = [CJS_CRON, ESM_CRON].every((file) => fs.existsSync(file));
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/cron is not built; run `npm run build:prod` before this probe";

const CRON_SUBPATH = "@decaf-ts/for-react/cron";

const PUBLIC_EXPORTS = [
  "CRON_FIELD_KEYS",
  "CronBuilder",
  "CronBuilderComponent",
  "CronSelector",
  "CronSelectorComponent",
  "CronSelectorField",
  "CronSelectorFieldComponent",
  "DEFAULT_CRON",
  "DEFAULT_FIELD_VALUES",
  "DEFAULT_SCHEDULE",
  "HOUR_INTERVALS",
  "RgxCronBuilder",
  "RgxCronSelector",
  "RgxCronSelectorField",
  "WEEKDAY_OPTIONS",
  "buildCronFromFields",
  "createTimedCron",
  "describeCronValue",
  "extractTime",
  "fieldsFromCron",
  "isModeHidden",
  "parseIntervalValue",
  "registerCronComponents",
  "resolveCronLocale",
  "scheduleToCron",
  "splitTime",
  "visibleModes",
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

const ESM_CRON_PROBE = `
const resolved = import.meta.resolve('${CRON_SUBPATH}');
const mod = await import('${CRON_SUBPATH}');
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort() }));
`;

const CJS_CRON_PROBE = `
const resolved = require.resolve('${CRON_SUBPATH}');
const mod = require('${CRON_SUBPATH}');
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort() }));
`;

describe("cron packaging", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<string, any>;
  };

  const cronExport = packageJson.exports?.["./cron"] as
    | string
    | Record<string, any>
    | undefined;

  it("declares ./cron as a dual ESM+CJS export", () => {
    expect(typeof cronExport).toBe("object");
    expect(Array.isArray(cronExport)).toBe(false);

    const conditions = cronExport as Record<string, any>;
    expect(conditions.import?.types).toBe("./lib/types/cron/index.d.mts");
    expect(conditions.import?.default).toBe("./lib/esm/cron/index.js");
    expect(conditions.require?.types).toBe("./lib/types/cron/index.d.cts");
    expect(conditions.require?.default).toBe("./lib/cjs/cron/index.cjs");
    expect(conditions.default).toBe("./lib/esm/cron/index.js");
  });

  (HAS_LIB ? describe : describe.skip)("built artifacts", () => {
    if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

    it("resolves ./cron through plain-node ESM and exposes the 27 exports", () => {
      const result = probe(ESM_CRON_PROBE, ["--input-type=module"]);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]esm[\\/]cron[\\/]index\.js$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(27);
    });

    it("loads ./cron through plain-node CJS and exposes the 27 exports", () => {
      const result = probe(CJS_CRON_PROBE);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]cjs[\\/]cron[\\/]index\.cjs$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(27);
    });
  });
});
