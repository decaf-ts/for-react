import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  {
    ignores: [
      "lib",
      "bin",
      "dist",
      "dist-demo",
      "docs",
      "gulpfile.js",
      "workdocs",
      "!src/**/*",
      "!tests/**/*",
      "tests/bundling/**/*",
      "tests/web/**/*",
    ],
  },
  { languageOptions: { globals: globals.browser } },
  {
    files: ["**/*.cjs"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: { globals: globals.node, sourceType: "module" },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      // '@typescript-eslint/interface-name-prefix': 'off',
      // '@typescript-eslint/explicit-function-return-type': 'off',
      // '@typescript-eslint/explicit-module-boundary-types': 'off',
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
