/**
 * @namespace calendar
 * @description Named `./calendar` subpath export of `@decaf-ts/for-react`.
 * @summary Controlled month-grid calendar ported from the Angular calendar:
 * month navigation, single-date selection, and host-owned event/marker
 * projection, backed by react-day-picker. Importing this subpath is the only
 * way to load the calendar and its styles; hosts that stay on the root
 * entrypoint never evaluate them. The public surface is re-exported from
 * `public-api.ts`.
 * @memberOf module:for-react
 */
export * from "./public-api.js";
