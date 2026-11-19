/**
 * @module for-react/storyboard-subpath-isolation.spec
 * @summary SAA-2055 — `./storyboard` subpath isolation from the package root.
 * @description Proves the package contract outside the Jest module registry by
 * probing the emitted bundles in fresh Node processes:
 *
 * - `package.json` maps `./storyboard` to the emitted ESM/CJS entrypoints;
 * - importing the package root (CJS `require` and ESM dynamic `import`) never
 *   evaluates the `storyboard` modules;
 * - the storyboard surface is absent from the package root export;
 * - the `./storyboard` subpath itself loads the storyboard modules.
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
const CJS_STORYBOARD = path.join(ROOT, "lib/cjs/storyboard/index.cjs");
const ESM_ROOT = path.join(ROOT, "lib/esm/index.js");
const ESM_STORYBOARD = path.join(ROOT, "lib/esm/storyboard/index.js");

const HAS_LIB = [CJS_ROOT, CJS_STORYBOARD, ESM_ROOT, ESM_STORYBOARD].every(
  (file) => fs.existsSync(file)
);
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/ is not built; run `npm run build:prod` before this probe";

const STORYBOARD_MODULE = /[\\/]lib[\\/](?:esm|cjs)[\\/]storyboard[\\/]/;

const STORYBOARD_EXPORTS = [
  "BubbleMessageStrategy",
  "DEFAULT_LABELS",
  "DEFAULT_TUTORIAL_DRAG_THRESHOLD",
  "DEFAULT_TUTORIAL_FOCUS",
  "DEFAULT_TUTORIAL_INPUT_LENGTH",
  "DEFAULT_TUTORIAL_MESSAGE",
  "FadeFocusStrategy",
  "HighlightFocusStrategy",
  "StoryboardTutorial",
  "StoryboardTutorialActionDetector",
  "StoryboardTutorialComponent",
  "StoryboardTutorialEngine",
  "StoryboardTutorialStore",
  "TUTORIAL_ACTIVE_CLASS",
  "TUTORIAL_BUBBLE_CLASS",
  "TUTORIAL_FADE_CLASS",
  "TUTORIAL_FADE_TARGET_CLASS",
  "TUTORIAL_HIGHLIGHT_CLASS",
  "TUTORIAL_HIGHLIGHT_TARGET_CLASS",
  "TUTORIAL_STORAGE_KEY",
  "TUTORIAL_WHITELIST_ATTRIBUTE",
  "createStoryboardTutorialStore",
  "defaultStoryboardTutorialClock",
  "resolveTutorialCompletion",
  "storyboardTutorialStore",
  "useStoryboardTutorial",
  "useStoryboardTutorialActive",
  "useStoryboardTutorialRunning",
  "useStoryboardTutorialState",
  "useStoryboardTutorialStatus",
].sort();

const ROOT_STORYBOARD_NAMES = [
  "BubbleMessageStrategy",
  "FadeFocusStrategy",
  "HighlightFocusStrategy",
  "StoryboardTutorial",
  "StoryboardTutorialActionDetector",
  "StoryboardTutorialComponent",
  "StoryboardTutorialEngine",
  "StoryboardTutorialStore",
  "resolveTutorialCompletion",
  "storyboardTutorialStore",
];

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
const storyboard = cache.filter((key) => ${STORYBOARD_MODULE.toString()}.test(key));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, storyboard, keys: Object.keys(mod).sort() }));
`;

const ESM_PROBE = (entry: string) => `
import { registerHooks } from 'node:module';
const resolved = [];
registerHooks({ resolve(specifier, context, nextResolve) {
  const result = nextResolve(specifier, context);
  resolved.push(result.url);
  return result;
} });
const mod = await import('${entry}');
const storyboard = resolved.filter((url) => ${STORYBOARD_MODULE.toString()}.test(url));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, storyboard, keys: Object.keys(mod).sort() }));
`;

(HAS_LIB ? describe : describe.skip)("storyboard subpath isolation", () => {
  if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<
      string,
      { import?: { default?: string }; require?: { default?: string } }
    >;
  };

  it("maps the ./storyboard subpath to the emitted ESM and CJS entrypoints", () => {
    const storyboard = packageJson.exports?.["./storyboard"];
    expect(storyboard?.import?.default).toBe("./lib/esm/storyboard/index.js");
    expect(storyboard?.require?.default).toBe("./lib/cjs/storyboard/index.cjs");
  });

  it("does not load storyboard modules from the CJS package root", () => {
    const result = probe(CJS_PROBE("./lib/cjs/index.cjs"));

    expect(result.storyboard).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it("does not load storyboard modules from the ESM package root", () => {
    const result = probe(ESM_PROBE("./lib/esm/index.js"), [
      "--input-type=module",
    ]);

    expect(result.storyboard).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it("keeps the storyboard surface out of the package root export", () => {
    for (const result of [
      probe(CJS_PROBE("./lib/cjs/index.cjs")),
      probe(ESM_PROBE("./lib/esm/index.js"), ["--input-type=module"]),
    ]) {
      const keys = result.keys as string[];
      for (const name of ROOT_STORYBOARD_NAMES) {
        expect(keys).not.toContain(name);
      }
    }
  });

  it("loads the storyboard modules through ./storyboard (CJS)", () => {
    const result = probe(CJS_PROBE("./lib/cjs/storyboard/index.cjs"));

    expect(result.storyboard).not.toEqual([]);
    expect(result.count).toBe(30);
    expect(result.keys).toEqual(STORYBOARD_EXPORTS);
  });

  it("loads the storyboard modules through ./storyboard (ESM)", () => {
    const result = probe(ESM_PROBE("./lib/esm/storyboard/index.js"), [
      "--input-type=module",
    ]);

    expect(result.storyboard).not.toEqual([]);
    expect(result.count).toBe(30);
    expect(result.keys).toEqual(STORYBOARD_EXPORTS);
  });
});
