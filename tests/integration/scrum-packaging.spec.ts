/**
 * @module for-react/scrum-packaging.spec
 * @summary SAA-2042 — built-artifact regression for the dual ESM+CJS
 * `./scrum` export (SAA-2033 / DECAF-895).
 * @description Mirrors `kanban-packaging.spec.ts` and proves the packaged
 * contract outside Jest's module registry with fresh Node processes:
 *
 * - `exports["./scrum"]` declares `import.types`/`import.default`,
 *   `require.types`/`require.default` and `default`;
 * - `exports["./scrum/styles.css"]` maps to the bundled stylesheet;
 * - plain-node ESM resolves `@decaf-ts/for-react/scrum` to the ESM bundle and
 *   exposes exactly the 8 public runtime exports;
 * - plain-node CJS loads the same subpath (no
 *   `ERR_PACKAGE_PATH_NOT_EXPORTED`) through `lib/cjs/scrum/index.cjs` and
 *   exposes the same 8 exports.
 *
 * Each probe runs in a fresh process so the module cache cannot leak between
 * assertions. The built-artifact suite skips with an explicit message when
 * `lib/` has not been built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");

const CJS_SCRUM = path.join(ROOT, "lib/cjs/scrum/index.cjs");
const ESM_SCRUM = path.join(ROOT, "lib/esm/scrum/index.js");
const SCRUM_CSS = path.join(ROOT, "lib/scrum/styles.css");

const HAS_LIB = [CJS_SCRUM, ESM_SCRUM].every((file) => fs.existsSync(file));
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/scrum is not built; run `npm run build:prod` before this probe";

const SCRUM_SUBPATH = "@decaf-ts/for-react/scrum";

const PUBLIC_EXPORTS = [
  "Backlog",
  "BacklogComponent",
  "SCRUM_BACKLOG_COLUMN_ID",
  "SprintBoard",
  "SprintBoardComponent",
  "SprintSelector",
  "SprintSelectorComponent",
  "scrumSprintIdOf",
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

const ESM_SCRUM_PROBE = `
const resolved = import.meta.resolve('${SCRUM_SUBPATH}');
const mod = await import('${SCRUM_SUBPATH}');
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort() }));
`;

const CJS_SCRUM_PROBE = `
const resolved = require.resolve('${SCRUM_SUBPATH}');
const mod = require('${SCRUM_SUBPATH}');
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort() }));
`;

describe("scrum packaging", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<string, any>;
  };

  const scrumExport = packageJson.exports?.["./scrum"] as
    | string
    | Record<string, any>
    | undefined;

  it("declares ./scrum as a dual ESM+CJS export", () => {
    expect(typeof scrumExport).toBe("object");
    expect(Array.isArray(scrumExport)).toBe(false);

    const conditions = scrumExport as Record<string, any>;
    expect(conditions.import?.types).toBe("./lib/types/scrum/index.d.mts");
    expect(conditions.import?.default).toBe("./lib/esm/scrum/index.js");
    expect(conditions.require?.types).toBe("./lib/types/scrum/index.d.cts");
    expect(conditions.require?.default).toBe("./lib/cjs/scrum/index.cjs");
    expect(conditions.default).toBe("./lib/esm/scrum/index.js");
  });

  it("maps ./scrum/styles.css to the bundled stylesheet", () => {
    expect(packageJson.exports?.["./scrum/styles.css"]).toBe(
      "./lib/scrum/styles.css"
    );
  });

  (HAS_LIB ? describe : describe.skip)("built artifacts", () => {
    if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

    it("ships the bundled stylesheet next to the entrypoints", () => {
      expect(fs.existsSync(SCRUM_CSS)).toBe(true);
      const css = fs.readFileSync(SCRUM_CSS, "utf8");
      expect(css).toContain(".dcf-scrum-sprint-board-host");
      expect(css).toContain(".dcf-scrum-backlog__select");
      expect(css).toContain(".dcf-sprint-selector__select");
    });

    it("resolves ./scrum through plain-node ESM and exposes the 8 exports", () => {
      const result = probe(ESM_SCRUM_PROBE, ["--input-type=module"]);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]esm[\\/]scrum[\\/]index\.js$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(8);
    });

    it("loads ./scrum through plain-node CJS and exposes the 8 exports", () => {
      const result = probe(CJS_SCRUM_PROBE);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]cjs[\\/]scrum[\\/]index\.cjs$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(8);
    });
  });
});
