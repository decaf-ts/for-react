#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      if (entry.isFile() && entry.name.endsWith(".css")) return [full];
      return [];
    });
}

function bundle(sourceRoot, outFile, header) {
  if (!fs.existsSync(sourceRoot)) {
    console.error(`[bundle-styles] missing source directory: ${sourceRoot}`);
    process.exit(1);
  }

  const files = walk(sourceRoot);
  const parts = [
    `/* ${header} (generated) */`,
    ...files.map((file) => {
      const relative = path.relative(root, file).split(path.sep).join("/");
      return `\n/* ${relative} */\n${fs.readFileSync(file, "utf8").trim()}\n`;
    }),
  ];

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${parts.join("\n")}\n`, "utf8");
  console.log(
    `[bundle-styles] wrote ${path.relative(root, outFile)} from ${files.length} stylesheets`
  );
}

if (!fs.existsSync(path.join(root, "lib"))) {
  console.error("[bundle-styles] missing lib directory; run build-scripts first");
  process.exit(1);
}

bundle(
  path.join(root, "src", "lib"),
  path.join(root, "lib", "styles.css"),
  "@decaf-ts/for-react component styles"
);

bundle(
  path.join(root, "src", "gantt"),
  path.join(root, "lib", "gantt", "styles.css"),
  "@decaf-ts/for-react/gantt adapter styles"
);

bundle(
  path.join(root, "src", "diagrams"),
  path.join(root, "lib", "diagrams", "styles.css"),
  "@decaf-ts/for-react/diagrams adapter styles"
);

bundle(
  path.join(root, "src", "cron"),
  path.join(root, "lib", "cron", "styles.css"),
  "@decaf-ts/for-react/cron adapter styles"
);

bundle(
  path.join(root, "src", "calendar"),
  path.join(root, "lib", "calendar", "styles.css"),
  "@decaf-ts/for-react/calendar component styles"
);

bundle(
  path.join(root, "src", "kanban"),
  path.join(root, "lib", "kanban", "styles.css"),
  "@decaf-ts/for-react/kanban component styles"
);

bundle(
  path.join(root, "src", "scrum"),
  path.join(root, "lib", "scrum", "styles.css"),
  "@decaf-ts/for-react/scrum component styles"
);
