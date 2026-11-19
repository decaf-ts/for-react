/**
 * @namespace diagrams
 * @description Named `./diagrams` subpath export of `@decaf-ts/for-react`.
 * @summary Graph/diagram editor surface backed by `@xyflow/react`. Importing
 * this subpath is the only way to load React Flow; hosts that stay on the root
 * entrypoint never download or evaluate it. The public surface is re-exported
 * from `public-api.ts`.
 * @memberOf module:for-react
 */
export * from './public-api.js';
