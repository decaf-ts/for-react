#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const packageJsonPath = path.resolve(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const subpath = "./barcode";
const target = pkg?.exports?.[subpath];

if (!target || typeof target !== "object" || Array.isArray(target)) {
  console.error(`[patch-barcode-exports] missing "${subpath}" export`);
  process.exit(1);
}

const importEntry = target.import;
if (
  !importEntry ||
  typeof importEntry !== "object" ||
  typeof importEntry.default !== "string"
) {
  console.error(`[patch-barcode-exports] missing "${subpath}" import entry`);
  process.exit(1);
}

pkg.exports[subpath] = { import: importEntry };
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log(
  `[patch-barcode-exports] marked "${subpath}" ESM-only (import condition only)`
);
