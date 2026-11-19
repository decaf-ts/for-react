#!/usr/bin/env node
/**
 * @module for-react/scripts/fix-declaration-specifiers
 * @summary Post-build repair for emitted declaration re-export specifiers.
 * @description `build-scripts` appends the declaration extension to the emitted
 * source specifier, so a source `export * from "./public-api.js"` becomes
 * `export * from "./public-api.js.d.mts"` in `lib/types/**`. TypeScript strips
 * the trailing `.d.mts`, looks for `public-api.js.mts` / `public-api.js.d.mts`,
 * finds neither, and reports every subpath as having zero exports (SAA-2081).
 *
 * This internal build utility runs immediately after `build-scripts` in
 * `build:prod` and:
 *
 * 1. rewrites relative specifiers by replacing the JavaScript extension with
 *    the declaration extension (`X.js.d.mts` -> `X.d.mts`, `X.js.d.cts` ->
 *    `X.d.cts`, and the `jsx` / `mjs` / `cjs` variants);
 * 2. guards the result: any relative declaration specifier that still does not
 *    resolve to an on-disk file fails the build with exit code `1` and lists
 *    the offenders, so a broken `lib/types` never ships silently.
 *
 * It is not part of the published API and is intentionally standalone (Node
 * built-ins only), matching the other `scripts/*.mjs` build steps.
 */
import fs from "node:fs";
import path from "node:path";

/** Absolute repository root the script is invoked from (`process.cwd()`). */
const root = process.cwd();

/** Absolute path to the emitted declaration tree (`lib/types`). */
const typesRoot = path.join(root, "lib", "types");

if (!fs.existsSync(typesRoot)) {
  console.error(
    "[fix-declaration-specifiers] missing lib/types; run build-scripts first"
  );
  process.exit(1);
}

/**
 * @description Recursively collects declaration files (`.d.mts` / `.d.cts`) in
 * a stable, name-sorted order so the rewrite and the failure report are
 * deterministic across filesystems.
 * @param {string} dir - Absolute directory to descend into.
 * @returns {string[]} Absolute paths of every declaration file beneath `dir`.
 */
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      if (entry.isFile() && /\.d\.(m|c)ts$/.test(entry.name)) return [full];
      return [];
    });
}

/**
 * @description Matches import/export `from` clauses, dynamic `import("...")`
 * calls and `require("...")` calls, capturing the quoted specifier in a group
 * per call shape. Only captures are used; matches are rewritten in place.
 * @type {RegExp}
 */
const SPECIFIER_REGEX =
  /(\b(?:import|export)\b[\s\S]*?\bfrom\s*["'])([^"']+)(["'])|(\bimport\s*\(\s*["'])([^"']+)(["']\s*\))|(\brequire\s*\(\s*["'])([^"']+)(["']\s*\))/gm;

/**
 * @description Reports whether a specifier is relative or root-absolute; bare
 * package specifiers are left untouched because their resolution belongs to the
 * consumer's module resolver.
 * @param {string} specifier - Import/export specifier to classify.
 * @returns {boolean} `true` for `./`, `../` and `/` specifiers.
 */
function isRelativeSpecifier(specifier) {
  return (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith("/")
  );
}

/**
 * @description Applies the rewrite rule to a declaration file's contents:
 * for each relative specifier, replace a trailing JavaScript extension followed
 * by a declaration extension with just the declaration extension
 * (`./foo.js.d.mts` -> `./foo.d.mts`). Non-relative and already-correct
 * specifiers are returned unchanged.
 * @param {string} content - Full text of one emitted declaration file.
 * @returns {{updated: string, count: number}} Rewritten text and the number of
 * specifiers that actually changed.
 */
function rewriteContent(content) {
  // build-scripts appends the declaration extension to the emitted source
  // specifier, turning a source `./foo.js` into `./foo.js.d.mts`. TypeScript
  // strips the trailing `.d.mts` and then looks for `foo.js.mts`/
  // `foo.js.d.mts`, neither of which exist, so the re-export resolves to zero
  // exports. Replace the JS extension with the declaration extension instead.
  let count = 0;
  const updated = content.replace(
    SPECIFIER_REGEX,
    (full, p1, s1, q1, p2, s2, q2, p3, s3, q3) => {
      const prefix = p1 ?? p2 ?? p3;
      const specifier = s1 ?? s2 ?? s3;
      const suffix = q1 ?? q2 ?? q3;
      if (!specifier || !isRelativeSpecifier(specifier)) return full;
      const fixed = specifier.replace(
        /\.(?:jsx?|mjs|cjs)(\.d\.(?:mts|cts))$/i,
        "$1"
      );
      if (fixed !== specifier) count += 1;
      return `${prefix}${fixed}${suffix}`;
    }
  );
  return { updated, count };
}

/**
 * @description Resolution guard: returns every relative specifier in `content`
 * that does not resolve to an existing on-disk path relative to `file`. Used
 * after rewriting, so a leftover `X.js.d.mts` or a genuinely missing target is
 * reported instead of silently shipping.
 * @param {string} file - Absolute path of the declaration file being checked.
 * @param {string} content - Text of that file after any rewrite.
 * @returns {string[]} The unresolved relative specifiers, in encounter order.
 */
function collectUnresolved(file, content) {
  const unresolved = [];
  for (const match of content.matchAll(SPECIFIER_REGEX)) {
    const specifier = match[2] ?? match[5] ?? match[8];
    if (!specifier || !isRelativeSpecifier(specifier)) continue;
    const resolved = specifier.startsWith("/")
      ? specifier
      : path.resolve(path.dirname(file), specifier);
    if (!fs.existsSync(resolved)) unresolved.push(specifier);
  }
  return unresolved;
}

const files = walk(typesRoot);
let rewritten = 0;
let rewrittenFiles = 0;
const unresolved = [];

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  const { updated, count } = rewriteContent(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated, "utf8");
    rewrittenFiles += 1;
    rewritten += count;
  }
  for (const specifier of collectUnresolved(file, updated)) {
    unresolved.push(`${path.relative(root, file)} -> ${specifier}`);
  }
}

if (unresolved.length) {
  console.error(
    `[fix-declaration-specifiers] ${unresolved.length} declaration specifier(s) still do not resolve:`
  );
  for (const entry of unresolved.slice(0, 25)) {
    console.error(`  ${entry}`);
  }
  if (unresolved.length > 25) {
    console.error(`  ... and ${unresolved.length - 25} more`);
  }
  process.exit(1);
}

console.log(
  `[fix-declaration-specifiers] repaired ${rewritten} specifier(s) across ${rewrittenFiles} of ${files.length} declaration file(s); all relative specifiers resolve`
);
