/**
 * @namespace barcode
 * @description Named `./barcode` subpath export of `@decaf-ts/for-react`.
 * @summary Framework-agnostic barcode helpers plus the `<Barcode>` React
 * component backed by the optional `@bwip-js/browser` peer. Importing this
 * subpath is the only way to load the encoder; hosts that stay on the root
 * entrypoint never download or evaluate it. The public surface is re-exported
 * from `public-api.ts`.
 * @memberOf module:for-react
 */
export * from "./public-api.js";
