/**
 * @namespace code-editor
 * @description Named `./code-editor` subpath export of `@decaf-ts/for-react`.
 * @summary Code and formula editing surface backed by CodeMirror 6. Importing
 * this subpath is the only way to load the editor; hosts that stay on the root
 * entrypoint never download or evaluate CodeMirror. The public surface is
 * re-exported from `public-api.ts`.
 * @memberOf module:for-react
 */
export * from "./public-api.js";
