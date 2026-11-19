/**
 * @module for-react
 * @description React rendering engine for the decaf-ts stack.
 * @summary Provides model-driven rendering components, form and CRUD surfaces,
 * i18n and service helpers, and the supporting engine used by React hosts. The
 * root entrypoint exposes the rendering engine and shared UI kit; the optional
 * code and formula editor ships as the separate `./code-editor` subpath so
 * CodeMirror is not loaded by hosts that do not use it. See
 * {@link module:for-react.code-editor} for the editor surface.
 */
export * from "./lib/index.js";
