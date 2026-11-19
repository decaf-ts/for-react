/**
 * @module for-react/calendar-packaging.spec
 * @summary SAA-1988 — built-artifact regression for the dual ESM+CJS
 * `./calendar` export (SAA-1986 / DECAF-895).
 * @description Mirrors `cron-packaging.spec.ts` and proves the packaged
 * contract outside Jest's module registry with fresh Node processes:
 *
 * - `exports["./calendar"]` declares `import.types`/`import.default`,
 *   `require.types`/`require.default` and `default`;
 * - plain-node ESM resolves `@decaf-ts/for-react/calendar` to the ESM bundle
 *   and exposes exactly the 19 public exports;
 * - plain-node CJS loads the same subpath (no
 *   `ERR_PACKAGE_PATH_NOT_EXPORTED`) through `lib/cjs/calendar/index.cjs` and
 *   exposes the same 19 exports.
 *
 * Each probe runs in a fresh process so the module cache cannot leak between
 * assertions. The built-artifact suite skips with an explicit message when
 * `lib/` has not been built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");

const CJS_CALENDAR = path.join(ROOT, "lib/cjs/calendar/index.cjs");
const ESM_CALENDAR = path.join(ROOT, "lib/esm/calendar/index.js");

const HAS_LIB = [CJS_CALENDAR, ESM_CALENDAR].every((file) =>
  fs.existsSync(file)
);
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/calendar is not built; run `npm run build:prod` before this probe";

const CALENDAR_SUBPATH = "@decaf-ts/for-react/calendar";

const PUBLIC_EXPORTS = [
  "Calendar",
  "CalendarComponent",
  "MAX_EVENT_MARKERS",
  "RgxCalendar",
  "addDaysToDateKey",
  "buildMonthGrid",
  "dayAriaLabel",
  "eventMarkers",
  "formatDayLabel",
  "formatMonthTitle",
  "groupEventsByDate",
  "normalizeCalendarLocaleTag",
  "normalizeDateKey",
  "normalizeYearMonth",
  "parseDateKey",
  "resolveDateFnsLocale",
  "toDateKey",
  "weekdayIndexOf",
  "weekdayLabels",
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

const ESM_CALENDAR_PROBE = `
const resolved = import.meta.resolve('${CALENDAR_SUBPATH}');
const mod = await import('${CALENDAR_SUBPATH}');
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort() }));
`;

const CJS_CALENDAR_PROBE = `
const resolved = require.resolve('${CALENDAR_SUBPATH}');
const mod = require('${CALENDAR_SUBPATH}');
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort() }));
`;

describe("calendar packaging", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<string, any>;
  };

  const calendarExport = packageJson.exports?.["./calendar"] as
    | string
    | Record<string, any>
    | undefined;

  it("declares ./calendar as a dual ESM+CJS export", () => {
    expect(typeof calendarExport).toBe("object");
    expect(Array.isArray(calendarExport)).toBe(false);

    const conditions = calendarExport as Record<string, any>;
    expect(conditions.import?.types).toBe("./lib/types/calendar/index.d.mts");
    expect(conditions.import?.default).toBe("./lib/esm/calendar/index.js");
    expect(conditions.require?.types).toBe("./lib/types/calendar/index.d.cts");
    expect(conditions.require?.default).toBe("./lib/cjs/calendar/index.cjs");
    expect(conditions.default).toBe("./lib/esm/calendar/index.js");
  });

  (HAS_LIB ? describe : describe.skip)("built artifacts", () => {
    if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

    it("resolves ./calendar through plain-node ESM and exposes the 19 exports", () => {
      const result = probe(ESM_CALENDAR_PROBE, ["--input-type=module"]);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]esm[\\/]calendar[\\/]index\.js$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(19);
    });

    it("loads ./calendar through plain-node CJS and exposes the 19 exports", () => {
      const result = probe(CJS_CALENDAR_PROBE);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]cjs[\\/]calendar[\\/]index\.cjs$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(19);
    });
  });
});
