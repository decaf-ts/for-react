/**
 * @file Library barrel that exposes the package's public API.
 * @description Delegates to the curated public-apis barrel so consumers import from
 * the package root rather than deep paths.
 * @summary Keeps the exported surface stable across releases.
 */
export * from "./public-apis.js";
