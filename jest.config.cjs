/**
 * Jest configuration compatible with CommonJS so it can run inside a module-scoped package.
 */
/** @type {import("@jest/types").Config.InitialOptions} */
const config = {
  verbose: true,
  rootDir: __dirname,
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: "./tsconfig.jest.json", isolatedModules: true },
    ],
  },
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testRegex: "/tests/.*\\.(test|spec)\\.(ts|tsx)$",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "\\.(css|scss|sass)$": "<rootDir>/tests/styleMock.cjs",
    "\\.(png|jpg|jpeg|gif|svg)$": "<rootDir>/tests/fileMock.cjs",
    "^@decaf-ts/core/ram$":
      "<rootDir>/node_modules/@decaf-ts/core/lib/ram/index.cjs",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: false,
  coverageDirectory: "./workdocs/reports/coverage",
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}", "!src/bin/**/*"],
  reporters: ["default"],
};

module.exports = config;
