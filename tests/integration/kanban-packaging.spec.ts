/**
 * @module for-react/kanban-packaging.spec
 * @summary SAA-2010 — built-artifact regression for the dual ESM+CJS
 * `./kanban` export (SAA-2009 / DECAF-895).
 * @description Mirrors `calendar-packaging.spec.ts` and proves the packaged
 * contract outside Jest's module registry with fresh Node processes:
 *
 * - `exports["./kanban"]` declares `import.types`/`import.default`,
 *   `require.types`/`require.default` and `default`;
 * - `exports["./kanban/styles.css"]` maps to the bundled stylesheet;
 * - plain-node ESM resolves `@decaf-ts/for-react/kanban` to the ESM bundle and
 *   exposes exactly the 14 public exports;
 * - plain-node CJS loads the same subpath (no
 *   `ERR_PACKAGE_PATH_NOT_EXPORTED`) through `lib/cjs/kanban/index.cjs` and
 *   exposes the same 14 exports.
 *
 * Each probe runs in a fresh process so the module cache cannot leak between
 * assertions. The built-artifact suite skips with an explicit message when
 * `lib/` has not been built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");

const CJS_KANBAN = path.join(ROOT, "lib/cjs/kanban/index.cjs");
const ESM_KANBAN = path.join(ROOT, "lib/esm/kanban/index.js");
const KANBAN_CSS = path.join(ROOT, "lib/kanban/styles.css");

const HAS_LIB = [CJS_KANBAN, ESM_KANBAN].every((file) =>
  fs.existsSync(file)
);
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/kanban is not built; run `npm run build:prod` before this probe";

const KANBAN_SUBPATH = "@decaf-ts/for-react/kanban";

const PUBLIC_EXPORTS = [
  "KanbanBoard",
  "KanbanBoardComponent",
  "KanbanCard",
  "KanbanColumn",
  "RgxKanban",
  "applyFilter",
  "applyPreview",
  "clamp",
  "groupByStatus",
  "kanbanCardDndId",
  "kanbanColumnDroppableId",
  "kanbanColumnIdFromDroppableId",
  "kanbanConfigFromFields",
  "resolveMoveIndices",
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

const ESM_KANBAN_PROBE = `
const resolved = import.meta.resolve('${KANBAN_SUBPATH}');
const mod = await import('${KANBAN_SUBPATH}');
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort() }));
`;

const CJS_KANBAN_PROBE = `
const resolved = require.resolve('${KANBAN_SUBPATH}');
const mod = require('${KANBAN_SUBPATH}');
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort() }));
`;

describe("kanban packaging", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<string, any>;
  };

  const kanbanExport = packageJson.exports?.["./kanban"] as
    | string
    | Record<string, any>
    | undefined;

  it("declares ./kanban as a dual ESM+CJS export", () => {
    expect(typeof kanbanExport).toBe("object");
    expect(Array.isArray(kanbanExport)).toBe(false);

    const conditions = kanbanExport as Record<string, any>;
    expect(conditions.import?.types).toBe("./lib/types/kanban/index.d.mts");
    expect(conditions.import?.default).toBe("./lib/esm/kanban/index.js");
    expect(conditions.require?.types).toBe("./lib/types/kanban/index.d.cts");
    expect(conditions.require?.default).toBe("./lib/cjs/kanban/index.cjs");
    expect(conditions.default).toBe("./lib/esm/kanban/index.js");
  });

  it("maps ./kanban/styles.css to the bundled stylesheet", () => {
    expect(packageJson.exports?.["./kanban/styles.css"]).toBe(
      "./lib/kanban/styles.css"
    );
  });

  (HAS_LIB ? describe : describe.skip)("built artifacts", () => {
    if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

    it("ships the bundled stylesheet next to the entrypoints", () => {
      expect(fs.existsSync(KANBAN_CSS)).toBe(true);
      const css = fs.readFileSync(KANBAN_CSS, "utf8");
      expect(css).toContain(".dcf-kanban");
      expect(css).toContain(".dcf-kanban-card--dragging");
    });

    it("resolves ./kanban through plain-node ESM and exposes the 14 exports", () => {
      const result = probe(ESM_KANBAN_PROBE, ["--input-type=module"]);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]esm[\\/]kanban[\\/]index\.js$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(14);
    });

    it("loads ./kanban through plain-node CJS and exposes the 14 exports", () => {
      const result = probe(CJS_KANBAN_PROBE);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]cjs[\\/]kanban[\\/]index\.cjs$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(14);
    });
  });
});
