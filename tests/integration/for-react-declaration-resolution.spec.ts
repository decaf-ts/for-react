/**
 * @module for-react/for-react-declaration-resolution.spec
 * @summary SAA-2082 — regression guard for emitted subpath type declarations.
 * @description A packaging defect (SAA-2081) emitted declaration re-exports as
 * `export * from "./public-api.js.d.mts"` while the file on disk is
 * `public-api.d.mts`. TypeScript strips the trailing `.d.mts`, then looks for
 * `public-api.js.mts` / `public-api.js.d.mts` / `public-api.js.mjs`, none of
 * which exist, so consumer `tsc` reports TS2305 for the root and every subpath.
 *
 * This spec fails if either guard regresses:
 *
 * - on-disk re-export integrity: every relative `from "..."` specifier in the
 *   emitted entry declarations resolves to an existing file and none keeps the
 *   `.js.d.mts` / `.js.d.cts` suffix;
 * - consumer `tsc` probe: a temp package symlinks this repo as
 *   `node_modules/@decaf-ts/for-react` and typechecks imports from the root,
 *   `./kanban` and `./calendar` with `moduleResolution: node16` and `bundler`.
 *
 * The probe is self-contained: only pre-existing entries are unconditional.
 * `./charts` is a feature-gated subpath owned by another ticket, so its probe
 * is an optional extra clause that runs only when its emitted declaration is
 * present. Its absence must never skip the core suite.
 *
 * The built-artifact suite skips with an explicit message when `lib/` has not
 * been built.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");

const ENTRY_DECLARATIONS = [
  "lib/types/index.d.mts",
  "lib/types/index.d.cts",
  "lib/types/kanban/index.d.mts",
  "lib/types/calendar/index.d.mts",
].map((relative) => path.join(ROOT, relative));

const TYPES_ROOT = path.join(ROOT, "lib/types");

const CHARTS_DECLARATION = path.join(TYPES_ROOT, "charts/index.d.mts");

const HAS_LIB =
  fs.existsSync(TYPES_ROOT) &&
  ENTRY_DECLARATIONS.every((file) => fs.existsSync(file));
const HAS_CHARTS = HAS_LIB && fs.existsSync(CHARTS_DECLARATION);
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/types declarations are not built; run `NODE_ENV=development npm run build:prod` before this probe";

const CORE_IMPORTS = [
  'import { RgxRenderingEngine } from "@decaf-ts/for-react";',
  'import { RgxKanban } from "@decaf-ts/for-react/kanban";',
  'import { RgxCalendar } from "@decaf-ts/for-react/calendar";',
];
const CORE_SYMBOLS = ["RgxRenderingEngine", "RgxKanban", "RgxCalendar"];

const CHARTS_IMPORTS = [
  'import { LineChart } from "@decaf-ts/for-react/charts";',
];
const CHARTS_SYMBOLS = ["LineChart"];

const BAD_SPECIFIER = /\.js\.d\.(m|c)ts$/;
const SPECIFIER_REGEX = /\bfrom\s*["']([^"']+)["']/g;

interface DeclarationIssue {
  file: string;
  specifier: string;
}

function relativeSpecifiers(content: string): string[] {
  const specifiers: string[] = [];
  for (const match of content.matchAll(SPECIFIER_REGEX)) {
    const specifier = match[1];
    if (specifier && specifier.startsWith(".")) specifiers.push(specifier);
  }
  return specifiers;
}

function walkDeclarationFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkDeclarationFiles(full);
      if (entry.isFile() && /\.d\.(m|c)ts$/.test(entry.name)) return [full];
      return [];
    });
}

interface TscProbeResult {
  status: number | null;
  output: string;
  errors: number;
}

function runConsumerProbe(
  module: "node16" | "esnext",
  moduleResolution: "node16" | "bundler",
  imports: string[],
  symbols: string[]
): TscProbeResult {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "for-react-types-"));
  try {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ name: "for-react-types-probe", type: "module" }),
      "utf8"
    );

    const scopeDir = path.join(tempDir, "node_modules/@decaf-ts");
    fs.mkdirSync(scopeDir, { recursive: true });
    fs.symlinkSync(
      ROOT,
      path.join(scopeDir, "for-react"),
      process.platform === "win32" ? "junction" : "dir"
    );

    fs.writeFileSync(
      path.join(tempDir, "probe.mts"),
      [
        ...imports,
        "",
        `export const typesProbe = [${symbols.join(", ")}];`,
        "",
      ].join("\n"),
      "utf8"
    );

    const tsc = path.join(ROOT, "node_modules/.bin/tsc");
    const result = spawnSync(
      tsc,
      [
        "--noEmit",
        "--skipLibCheck",
        "--strict",
        "--target",
        "es2022",
        "--module",
        module,
        "--moduleResolution",
        moduleResolution,
        "probe.mts",
      ],
      { cwd: tempDir, encoding: "utf8" }
    );

    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    const errors = (output.match(/error TS\d+/g) ?? []).length;
    return { status: result.status, output, errors };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

(HAS_LIB ? describe : describe.skip)("for-react declaration resolution", () => {
  if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

  it("resolves every relative re-export in the emitted entry declarations", () => {
    const missing: DeclarationIssue[] = [];
    const suffixed: DeclarationIssue[] = [];

    for (const file of ENTRY_DECLARATIONS) {
      const content = fs.readFileSync(file, "utf8");
      for (const specifier of relativeSpecifiers(content)) {
        if (BAD_SPECIFIER.test(specifier)) {
          suffixed.push({ file: path.relative(ROOT, file), specifier });
          continue;
        }
        const resolved = path.resolve(path.dirname(file), specifier);
        if (!fs.existsSync(resolved)) {
          missing.push({ file: path.relative(ROOT, file), specifier });
        }
      }
    }

    expect(suffixed).toEqual([]);
    expect(missing).toEqual([]);
  });

  it("emits no declaration specifier with the .js.d.(m|c)ts suffix", () => {
    const suffixed: DeclarationIssue[] = [];
    for (const file of walkDeclarationFiles(TYPES_ROOT)) {
      const content = fs.readFileSync(file, "utf8");
      for (const specifier of relativeSpecifiers(content)) {
        if (BAD_SPECIFIER.test(specifier)) {
          suffixed.push({ file: path.relative(ROOT, file), specifier });
        }
      }
    }
    expect(suffixed).toEqual([]);
  });

  it("typechecks package root and pre-existing subpaths for consumers with node16 resolution", () => {
    const result = runConsumerProbe(
      "node16",
      "node16",
      CORE_IMPORTS,
      CORE_SYMBOLS
    );
    expect(result.output).toBe("");
    expect(result.errors).toBe(0);
    expect(result.status).toBe(0);
  });

  it("typechecks package root and pre-existing subpaths for consumers with bundler resolution", () => {
    const result = runConsumerProbe(
      "esnext",
      "bundler",
      CORE_IMPORTS,
      CORE_SYMBOLS
    );
    expect(result.output).toBe("");
    expect(result.errors).toBe(0);
    expect(result.status).toBe(0);
  });

  (HAS_CHARTS ? it : it.skip)(
    "typechecks the optional charts subpath for consumers with node16 resolution",
    () => {
      const result = runConsumerProbe(
        "node16",
        "node16",
        CHARTS_IMPORTS,
        CHARTS_SYMBOLS
      );
      expect(result.output).toBe("");
      expect(result.errors).toBe(0);
      expect(result.status).toBe(0);
    }
  );

  (HAS_CHARTS ? it : it.skip)(
    "typechecks the optional charts subpath for consumers with bundler resolution",
    () => {
      const result = runConsumerProbe(
        "esnext",
        "bundler",
        CHARTS_IMPORTS,
        CHARTS_SYMBOLS
      );
      expect(result.output).toBe("");
      expect(result.errors).toBe(0);
      expect(result.status).toBe(0);
    }
  );
});
