/**
 * @file Public-API barrel for the Decaf React integration.
 * @description Entry point for the Decaf React integration.
 * @summary Re-exports the rendering engine, helpers, directives, services and utilities
 * required by host applications. Consumers should import from this barrel instead of
 * deep paths to ensure backwards compatibility between releases.
 */
export * from "./components/index.js";
export * from "./engine/index.js";
export * from "./directives/index.js";
export * from "./i18n/index.js";
export * from "./pipes/index.js";
export * from "./services/index.js";
export * from "./utils/index.js";
export * from "./for-react-common.js";
