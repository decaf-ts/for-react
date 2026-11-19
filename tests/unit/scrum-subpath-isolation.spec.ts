/**
 * @module for-react/scrum-subpath-isolation.spec
 * @summary SAA-2042 — `./scrum` subpath isolation from the package root.
 * @description Proves the package contract outside the Jest module registry by
 * probing the emitted bundles in fresh Node processes:
 *
 * - `package.json` maps `./scrum` to the emitted ESM/CJS entrypoints;
 * - importing the package root (CJS `require` and ESM dynamic `import`) never
 *   evaluates the `scrum` modules or `@dnd-kit/*`;
 * - the `./scrum` subpath loads `@dnd-kit/core`/`sortable` transitively
 *   through the kanban layer and exposes exactly the 8 documented runtime
 *   exports;
 * - the scrum surface is absent from the package root export.
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
const CJS_SCRUM = path.join(ROOT, "lib/cjs/scrum/index.cjs");
const ESM_ROOT = path.join(ROOT, "lib/esm/index.js");
const ESM_SCRUM = path.join(ROOT, "lib/esm/scrum/index.js");

const HAS_LIB = [CJS_ROOT, CJS_SCRUM, ESM_ROOT, ESM_SCRUM].every((file) =>
  fs.existsSync(file)
);
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/ is not built; run the package build before this probe";

const DND_CACHE = /[\\/]node_modules[\\/]@dnd-kit[\\/]/;
const DND_SPECIFIER = /^@dnd-kit(\/|$)/;
const SCRUM_MODULE = /[\\/]lib[\\/](?:esm|cjs)[\\/]scrum[\\/]/;

const SCRUM_EXPORTS = [
  "Backlog",
  "BacklogComponent",
  "SCRUM_BACKLOG_COLUMN_ID",
  "SprintBoard",
  "SprintBoardComponent",
  "SprintSelector",
  "SprintSelectorComponent",
  "scrumSprintIdOf",
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
const cache = Object.keys(require.cache);
const dnd = cache.filter((key) => ${DND_CACHE.toString()}.test(key));
const scrum = cache.filter((key) => ${SCRUM_MODULE.toString()}.test(key));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, dnd, scrum, keys: Object.keys(mod).sort() }));
`;

const ESM_PROBE = (entry: string) => `
import { registerHooks } from 'node:module';
const seen = [];
const resolved = [];
registerHooks({ resolve(specifier, context, nextResolve) {
  seen.push(specifier);
  const result = nextResolve(specifier, context);
  resolved.push(result.url);
  return result;
} });
const mod = await import('${entry}');
const dnd = seen.filter((specifier) => ${DND_SPECIFIER.toString()}.test(specifier));
const scrum = resolved.filter((url) => ${SCRUM_MODULE.toString()}.test(url));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, dnd, scrum, keys: Object.keys(mod).sort() }));
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

(HAS_LIB ? describe : describe.skip)("scrum subpath isolation", () => {
  if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<
      string,
      { import?: { default?: string }; require?: { default?: string } }
    >;
  };

  it("maps the ./scrum subpath to the emitted ESM and CJS entrypoints", () => {
    const scrum = packageJson.exports?.["./scrum"];
    expect(scrum?.import?.default).toBe("./lib/esm/scrum/index.js");
    expect(scrum?.require?.default).toBe("./lib/cjs/scrum/index.cjs");
  });

  it("does not load scrum or @dnd-kit from the CJS package root", () => {
    const result = probe(CJS_PROBE("./lib/cjs/index.cjs"));
    expect(result.scrum).toEqual([]);
    expect(result.dnd).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it("does not load scrum or @dnd-kit from the ESM package root", () => {
    const result = probe(ESM_PROBE("./lib/esm/index.js"), [
      "--input-type=module",
    ]);
    expect(result.scrum).toEqual([]);
    expect(result.dnd).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it("loads @dnd-kit through ./scrum and exports the 8-key surface (CJS)", () => {
    const result = probe(CJS_PROBE("./lib/cjs/scrum/index.cjs"));
    expect(result.count).toBe(8);
    expect(result.keys).toEqual(SCRUM_EXPORTS);
    expect(result.scrum).not.toEqual([]);
    expectDndKit(result.dnd);
  });

  it("loads @dnd-kit through ./scrum and exports the 8-key surface (ESM)", () => {
    const result = probe(ESM_PROBE("./lib/esm/scrum/index.js"), [
      "--input-type=module",
    ]);
    expect(result.count).toBe(8);
    expect(result.keys).toEqual(SCRUM_EXPORTS);
    expect(result.scrum).not.toEqual([]);
    expectDndKit(result.dnd);
  });

  it("keeps the scrum surface out of the package root export", () => {
    const root = probe(CJS_PROBE("./lib/cjs/index.cjs"));
    const keys = root.keys as string[];
    for (const key of [
      "Backlog",
      "SprintBoard",
      "SprintSelector",
      "scrumSprintIdOf",
    ]) {
      expect(keys).not.toContain(key);
    }
  });
});
