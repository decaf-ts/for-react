/**
 * @module for-react/storyboard-packaging.spec
 * @summary SAA-2055 — built-artifact regression for the dual ESM+CJS
 * `./storyboard` export (SAA-2052).
 * @description Mirrors `scrum-packaging.spec.ts` and proves the packaged
 * contract outside Jest's module registry with fresh Node processes:
 *
 * - `exports["./storyboard"]` declares `import.types`/`import.default`,
 *   `require.types`/`require.default` and `default`;
 * - `exports["./storyboard/styles.css"]` maps to the bundled stylesheet;
 * - the emitted `lib/{esm,cjs,types}/storyboard/*` artifacts and the bundled
 *   stylesheet exist and carry the documented surface;
 * - plain-node ESM resolves `@decaf-ts/for-react/storyboard` to the ESM bundle
 *   and exposes exactly the 30 public runtime exports;
 * - plain-node CJS loads the same subpath (no
 *   `ERR_PACKAGE_PATH_NOT_EXPORTED`) through `lib/cjs/storyboard/index.cjs` and
 *   exposes the same 30 exports.
 *
 * Each probe runs in a fresh process so the module cache cannot leak between
 * assertions. The built-artifact suite skips with an explicit message when
 * `lib/` has not been built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");

const CJS_STORYBOARD = path.join(ROOT, "lib/cjs/storyboard/index.cjs");
const ESM_STORYBOARD = path.join(ROOT, "lib/esm/storyboard/index.js");
const TYPES_MTS = path.join(ROOT, "lib/types/storyboard/index.d.mts");
const TYPES_CTS = path.join(ROOT, "lib/types/storyboard/index.d.cts");
const STORYBOARD_CSS = path.join(ROOT, "lib/storyboard/styles.css");

const HAS_LIB = [CJS_STORYBOARD, ESM_STORYBOARD].every((file) =>
  fs.existsSync(file)
);
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/storyboard is not built; run `npm run build:prod` before this probe";

const STORYBOARD_SUBPATH = "@decaf-ts/for-react/storyboard";

const PUBLIC_EXPORTS = [
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

interface ProbeResult {
  resolved?: string;
  keys?: string[];
  constants?: Record<string, unknown>;
}

function probe(script: string, flags: string[] = []): ProbeResult {
  const stdout = execFileSync(process.execPath, [...flags, "-e", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env },
  });
  return JSON.parse(stdout.trim()) as ProbeResult;
}

const ESM_STORYBOARD_PROBE = `
const resolved = import.meta.resolve('${STORYBOARD_SUBPATH}');
const mod = await import('${STORYBOARD_SUBPATH}');
const constants = {
  storage: mod.TUTORIAL_STORAGE_KEY,
  active: mod.TUTORIAL_ACTIVE_CLASS,
  whitelist: mod.TUTORIAL_WHITELIST_ATTRIBUTE,
  focus: mod.DEFAULT_TUTORIAL_FOCUS,
  message: mod.DEFAULT_TUTORIAL_MESSAGE,
};
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort(), constants }));
`;

const CJS_STORYBOARD_PROBE = `
const resolved = require.resolve('${STORYBOARD_SUBPATH}');
const mod = require('${STORYBOARD_SUBPATH}');
const constants = {
  storage: mod.TUTORIAL_STORAGE_KEY,
  active: mod.TUTORIAL_ACTIVE_CLASS,
  whitelist: mod.TUTORIAL_WHITELIST_ATTRIBUTE,
  focus: mod.DEFAULT_TUTORIAL_FOCUS,
  message: mod.DEFAULT_TUTORIAL_MESSAGE,
};
process.stdout.write(JSON.stringify({ resolved, keys: Object.keys(mod).sort(), constants }));
`;

const EXPECTED_CONSTANTS = {
  storage: "dcf-storyboard-tutorial",
  active: "dcf-storyboard-tutorial--active",
  whitelist: "data-dcf-tutorial-whitelisted",
  focus: "fade",
  message: "bubble",
};

describe("storyboard packaging", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<string, any>;
  };

  const storyboardExport = packageJson.exports?.["./storyboard"] as
    | string
    | Record<string, any>
    | undefined;

  it("declares ./storyboard as a dual ESM+CJS export", () => {
    expect(typeof storyboardExport).toBe("object");
    expect(Array.isArray(storyboardExport)).toBe(false);

    const conditions = storyboardExport as Record<string, any>;
    expect(conditions.import?.types).toBe("./lib/types/storyboard/index.d.mts");
    expect(conditions.import?.default).toBe("./lib/esm/storyboard/index.js");
    expect(conditions.require?.types).toBe("./lib/types/storyboard/index.d.cts");
    expect(conditions.require?.default).toBe("./lib/cjs/storyboard/index.cjs");
    expect(conditions.default).toBe("./lib/esm/storyboard/index.js");
  });

  it("maps ./storyboard/styles.css to the bundled stylesheet", () => {
    expect(packageJson.exports?.["./storyboard/styles.css"]).toBe(
      "./lib/storyboard/styles.css"
    );
  });

  (HAS_LIB ? describe : describe.skip)("built artifacts", () => {
    if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

    it("emits both declaration files", () => {
      expect(fs.existsSync(TYPES_MTS)).toBe(true);
      expect(fs.existsSync(TYPES_CTS)).toBe(true);
      expect(fs.readFileSync(TYPES_MTS, "utf8")).toContain(
        "StoryboardTutorialEngine"
      );
      expect(fs.readFileSync(TYPES_CTS, "utf8")).toContain(
        "StoryboardTutorialEngine"
      );
    });

    it("ships the bundled stylesheet next to the entrypoints", () => {
      expect(fs.existsSync(STORYBOARD_CSS)).toBe(true);
      const css = fs.readFileSync(STORYBOARD_CSS, "utf8");
      expect(css).toContain(".dcf-storyboard-tutorial");
      expect(css).toContain(".dcf-storyboard-tutorial__overlay");
      expect(css).toContain(".dcf-storyboard-tutorial__bubble");
    });

    it("resolves ./storyboard through plain-node ESM and exposes the 30 exports", () => {
      const result = probe(ESM_STORYBOARD_PROBE, ["--input-type=module"]);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]esm[\\/]storyboard[\\/]index\.js$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(30);
      expect(result.constants).toEqual(EXPECTED_CONSTANTS);
    });

    it("loads ./storyboard through plain-node CJS and exposes the 30 exports", () => {
      const result = probe(CJS_STORYBOARD_PROBE);

      expect(result.resolved).toMatch(
        /[\\/]lib[\\/]cjs[\\/]storyboard[\\/]index\.cjs$/
      );
      expect(result.keys).toEqual(PUBLIC_EXPORTS);
      expect(result.keys).toHaveLength(30);
      expect(result.constants).toEqual(EXPECTED_CONSTANTS);
    });
  });
});
