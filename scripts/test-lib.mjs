#!/usr/bin/env node
/**
 * @file Built-artifact gate for the published package surface.
 * @description Verifies that every target declared under the package `exports`
 * map exists on disk, that each esm and cjs artifact loads and exposes named
 * exports, that the root surface carries the baseline and model-builder runtime
 * exports, and that the esm and cjs subpath sets stay in parity. Wired into
 * `test:lib` and the `prepare-pr`/`prepare-release` chains so it runs after
 * `build:prod`; exits with code `1` when any check fails.
 * @summary Post-build smoke test over the emitted esm, cjs and type artifacts.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

/** Absolute repository root, resolved from this script's location. */
const ROOT = path.resolve(import.meta.dirname, "..");
/** Parsed `package.json` whose `exports` map drives the checks. */
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
/** CommonJS resolver used to require the emitted cjs artifacts. */
const require = createRequire(import.meta.url);

/** Collected failures, each with a label and a message. */
const failures = [];
/** Per-check outcomes, each with a label and a pass flag. */
const checks = [];

/**
 * @description Runs one assertion callback and records its outcome.
 * @summary Pushes a pass/fail entry into {@link checks} and captures a thrown
 * message into {@link failures} instead of aborting the run, so all targets are
 * reported in a single pass.
 * @param {string} name - Human-readable label printed in the report.
 * @param {function(): void} fn - Assertion to execute; throws on failure.
 * @returns {void}
 */
function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    failures.push({ name, error: error?.message ?? String(error) });
    checks.push({ name, ok: false });
  }
}

/**
 * @description Resolves a declared export target to an absolute artifact path.
 * @summary Rejects non-relative specifiers and targets whose artifact is not on
 * disk, so a stale `exports` entry fails before any load is attempted.
 * @param {string} target - Target path taken from the package `exports` map.
 * @returns {string} Absolute path to the existing artifact.
 * @throws {Error} When the target is not a `./` path or the artifact is missing.
 */
function relativeTarget(target) {
  if (typeof target !== "string" || !target.startsWith("./"))
    throw new Error(`invalid target ${JSON.stringify(target)}`);
  const resolved = path.resolve(ROOT, target);
  if (!fs.existsSync(resolved))
    throw new Error(`missing artifact ${target}`);
  return resolved;
}

/**
 * @description Enumerates the concrete artifacts declared by the `exports` map.
 * @summary Skips stylesheet targets, records string entries as plain files, and
 * expands conditional entries into separate esm, cjs and type artifacts.
 * @returns {Array<{subpath: string, kind: string, target: string}>} Declared
 * targets paired with their subpath and artifact kind.
 */
function exportTargets() {
  const entries = [];
  for (const [subpath, value] of Object.entries(pkg.exports ?? {})) {
    if (typeof value === "string") {
      if (value.endsWith(".css")) continue;
      entries.push({ subpath, kind: "file", target: value });
      continue;
    }
    const esm = value.import?.default;
    const cjs = value.require?.default;
    if (esm) entries.push({ subpath, kind: "esm", target: esm });
    if (cjs) entries.push({ subpath, kind: "cjs", target: cjs });
    for (const kind of ["import", "require"]) {
      const types = value[kind]?.types;
      if (types) entries.push({ subpath, kind: `${kind}-types`, target: types });
    }
  }
  return entries;
}

const targets = exportTargets();
const declared = targets.filter((entry) => entry.kind !== "file");

for (const entry of declared) {
  check(`${entry.subpath} ${entry.kind} artifact`, () =>
    relativeTarget(entry.target)
  );
}

const esmTargets = declared.filter((entry) => entry.kind === "esm");
const cjsTargets = declared.filter((entry) => entry.kind === "cjs");

/**
 * @description Imports an esm artifact and verifies it exposes named exports.
 * @summary Loads through a file URL so the emitted bundle is evaluated outside
 * the package `exports` map.
 * @param {{subpath: string, kind: string, target: string}} entry - Declared esm
 * target to load.
 * @returns {Promise<Object>} The loaded esm module namespace.
 * @throws {Error} When the artifact exposes no named exports.
 */
async function loadEsm(entry) {
  const file = relativeTarget(entry.target);
  const mod = await import(pathToFileURL(file).href);
  if (!mod || Object.keys(mod).length === 0)
    throw new Error(`${entry.target} exposes no named exports`);
  return mod;
}

/**
 * @description Requires a cjs artifact and verifies it exposes named exports.
 * @summary Resolves through the package-aware {@link require} helper created for
 * this script.
 * @param {{subpath: string, kind: string, target: string}} entry - Declared cjs
 * target to load.
 * @returns {Object} The loaded cjs module exports.
 * @throws {Error} When the artifact exposes no named exports.
 */
function loadCjs(entry) {
  const file = relativeTarget(entry.target);
  const mod = require(file);
  if (!mod || Object.keys(mod).length === 0)
    throw new Error(`${entry.target} exposes no named exports`);
  return mod;
}

const esmModules = new Map();
const cjsModules = new Map();

for (const entry of esmTargets) {
  await (async () => {
    try {
      esmModules.set(entry.subpath, await loadEsm(entry));
      checks.push({ name: `${entry.subpath} esm import`, ok: true });
    } catch (error) {
      failures.push({
        name: `${entry.subpath} esm import`,
        error: error?.message ?? String(error),
      });
      checks.push({ name: `${entry.subpath} esm import`, ok: false });
    }
  })();
}

for (const entry of cjsTargets) {
  try {
    cjsModules.set(entry.subpath, loadCjs(entry));
    checks.push({ name: `${entry.subpath} cjs require`, ok: true });
  } catch (error) {
    failures.push({
      name: `${entry.subpath} cjs require`,
      error: error?.message ?? String(error),
    });
    checks.push({ name: `${entry.subpath} cjs require`, ok: false });
  }
}

/** Named exports the root surface must always expose for host applications. */
const requiredRootExports = [
  "RgxModelBuilder",
  "RgxRenderingEngine",
  "RgxFormService",
  "ModelBuilder",
  "AttributeBuilder",
];

for (const [label, modules] of [
  ["esm", esmModules],
  ["cjs", cjsModules],
]) {
  const root = modules.get(".");
  if (!root) continue;
  check(`root ${label} baseline surface`, () => {
    const missing = requiredRootExports.filter(
      (name) => typeof root[name] === "undefined"
    );
    if (missing.length)
      throw new Error(`missing exports: ${missing.join(", ")}`);
  });
  check(`root ${label} ModelBuilder runtime`, () => {
    const { ModelBuilder, Model } = root;
    if (typeof ModelBuilder?.builder !== "function")
      throw new Error("ModelBuilder.builder is not callable");
    const built = ModelBuilder.builder()
      .setName("TestLibProbe")
      .string("name")
      .required()
      .build();
    if (typeof built !== "function")
      throw new Error("ModelBuilder.build did not return a constructor");
    const instance = new built({ name: "probe" });
    if (instance.name !== "probe")
      throw new Error("built model did not carry the probe value");
    if (typeof Model?.isModel === "function" && !Model.isModel(built))
      throw new Error("built class is not recognised as a decaf Model");
  });
}

const esmSubpaths = [...esmModules.keys()].filter((key) => key !== ".");
const cjsSubpaths = [...cjsModules.keys()].filter((key) => key !== ".");
check("esm and cjs subpath parity", () => {
  const missingCjs = esmSubpaths.filter(
    (key) => !cjsSubpaths.includes(key) && key !== "./barcode"
  );
  if (missingCjs.length)
    throw new Error(`esm subpaths without declared cjs: ${missingCjs.join(", ")}`);
});

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}`);
}

if (failures.length) {
  console.error(`\n${failures.length} built-lib check(s) failed:`);
  for (const failure of failures) console.error(`- ${failure.name}: ${failure.error}`);
  process.exit(1);
}

console.log(
  `\ntest:lib OK — ${esmTargets.length} esm, ${cjsTargets.length} cjs and ${declared.length} declared targets verified`
);
