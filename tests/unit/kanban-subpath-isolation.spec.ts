/**
 * @module for-react/kanban-subpath-isolation.spec
 * @summary SAA-2010 — `./kanban` subpath isolation from the package root.
 * @description Proves the package contract outside the Jest module registry by
 * probing the emitted bundles in fresh Node processes:
 *
 * - `package.json` maps `./kanban` to the emitted ESM/CJS entrypoints;
 * - importing the package root (CJS `require` and ESM dynamic `import`) never
 *   evaluates `@dnd-kit/*`;
 * - the `./kanban` subpath loads `@dnd-kit/core`/`sortable` and exposes
 *   exactly the 14 documented runtime exports.
 *
 * Each probe runs in a fresh process so the module cache cannot leak between
 * assertions and the result is independent of Jest's own module graph. The
 * suite skips with an explicit message only when `lib/` has not been built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");

const CJS_ROOT = path.join(ROOT, "lib/cjs/index.cjs");
const CJS_KANBAN = path.join(ROOT, "lib/cjs/kanban/index.cjs");
const ESM_ROOT = path.join(ROOT, "lib/esm/index.js");
const ESM_KANBAN = path.join(ROOT, "lib/esm/kanban/index.js");

const HAS_LIB = [CJS_ROOT, CJS_KANBAN, ESM_ROOT, ESM_KANBAN].every((file) =>
  fs.existsSync(file)
);
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/ is not built; run the package build before this probe";

const DEP_CACHE = /[\\/]node_modules[\\/]@dnd-kit[\\/]/;
const DEP_SPECIFIER = /^@dnd-kit(\/|$)/;

const KANBAN_EXPORTS = [
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
const loaded = Object.keys(require.cache).filter((key) => ${DEP_CACHE.toString()}.test(key));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, loaded, keys: Object.keys(mod).sort() }));
`;

const ESM_PROBE = (entry: string) => `
import { registerHooks } from 'node:module';
const seen = [];
registerHooks({ resolve(specifier, context, nextResolve) { seen.push(specifier); return nextResolve(specifier, context); } });
const mod = await import('${entry}');
const loaded = seen.filter((specifier) => ${DEP_SPECIFIER.toString()}.test(specifier));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, loaded, keys: Object.keys(mod).sort() }));
`;

function expectDndKit(loaded: unknown): void {
  const specifiers = loaded as string[];
  expect(
    specifiers.some((specifier) => /@dnd-kit[\\/]core/.test(specifier))
  ).toBe(true);
  expect(
    specifiers.some((specifier) => /@dnd-kit[\\/]sortable/.test(specifier))
  ).toBe(true);
}

(HAS_LIB ? describe : describe.skip)("kanban subpath isolation", () => {
  if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<
      string,
      { import?: { default?: string }; require?: { default?: string } }
    >;
  };

  it("maps the ./kanban subpath to the emitted ESM and CJS entrypoints", () => {
    const kanban = packageJson.exports?.["./kanban"];
    expect(kanban?.import?.default).toBe("./lib/esm/kanban/index.js");
    expect(kanban?.require?.default).toBe("./lib/cjs/kanban/index.cjs");
  });

  it("does not load @dnd-kit from the CJS package root", () => {
    const result = probe(CJS_PROBE("./lib/cjs/index.cjs"));
    expect(result.loaded).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it("does not load @dnd-kit from the ESM package root", () => {
    const result = probe(ESM_PROBE("./lib/esm/index.js"), [
      "--input-type=module",
    ]);
    expect(result.loaded).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it("loads @dnd-kit from ./kanban and exports the 14-key surface (CJS)", () => {
    const result = probe(CJS_PROBE("./lib/cjs/kanban/index.cjs"));
    expect(result.count).toBe(14);
    expect(result.keys).toEqual(KANBAN_EXPORTS);
    expectDndKit(result.loaded);
  });

  it("loads @dnd-kit from ./kanban and exports the 14-key surface (ESM)", () => {
    const result = probe(ESM_PROBE("./lib/esm/kanban/index.js"), [
      "--input-type=module",
    ]);
    expect(result.count).toBe(14);
    expect(result.keys).toEqual(KANBAN_EXPORTS);
    expectDndKit(result.loaded);
  });

  it("keeps the kanban surface out of the package root export", () => {
    const root = probe(CJS_PROBE("./lib/cjs/index.cjs"));
    const keys = root.keys as string[];
    for (const key of [
      "KanbanBoard",
      "KanbanBoardComponent",
      "RgxKanban",
      "kanbanConfigFromFields",
    ]) {
      expect(keys).not.toContain(key);
    }
  });
});
