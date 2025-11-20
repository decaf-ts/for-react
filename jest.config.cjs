/**
 * Jest configuration compatible with CommonJS so it can run inside a module-scoped package.
 */
/** @type {import("@jest/types").Config.InitialOptions} */
const config = {
  verbose: true,
  rootDir: __dirname,
  transform: { "^.+\\.tsx?$": "ts-jest" },
  globals: { "ts-jest": { tsconfig: "./tsconfig.jest.json" } },
  testEnvironment: "node",
  testRegex: "/tests/.*\\.(test|spec)\\.(ts|tsx)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: false,
  coverageDirectory: "./workdocs/reports/coverage",
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}", "!src/bin/**/*"],
  reporters: ["default"],
};

module.exports = config;
