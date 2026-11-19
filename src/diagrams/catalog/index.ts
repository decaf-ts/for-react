/**
 * @module for-react/diagrams/catalog
 * @summary Node catalogue plumbing (DECAF-50 §4.12/§4.13).
 * @description Exposes the manifest-backed node catalogue: the pluggable
 * frontend sources (HTTP bridge, P4 fixtures and the demo composite fallback),
 * the root-scoped store, the concrete manifest projection and declarative
 * resolution, and the catalog service manifest readers/dispatchers use.
 */
export * from './GraphNodeCatalogApi.js';
export * from './GraphNodeCatalogReader.js';
export * from './GraphNodeCatalogService.js';
export * from './GraphNodeCatalogStore.js';
export * from './GraphNodeCatalogCompositeSource.js';
export * from './GraphNodeManifestFixtures.js';
export * from './GraphNodeResolution.js';
