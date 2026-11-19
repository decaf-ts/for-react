/**
 * @namespace kanban
 * @description Named `./kanban` subpath export of `@decaf-ts/for-react`.
 * @summary Controlled, emit-only Kanban board ported from the Angular kanban
 * entry point. The host owns the task collection, the task-to-column mapping,
 * selection and every piece of board state; the board renders columns from a
 * {@link KanbanConfig} and emits typed move, reorder, selection, edit,
 * clear-selection, rejection and retry events without ever mutating host data.
 * Drag and drop uses `@dnd-kit/core` plus `@dnd-kit/sortable`, while the
 * keyboard interaction is the Angular board's own state machine (not dnd-kit's
 * `KeyboardSensor`). Importing this subpath is the only way to load the board
 * and its styles; hosts that stay on the root entrypoint never evaluate them.
 * The public surface is re-exported from `public-api.ts`.
 * @memberOf module:for-react
 */
export * from "./public-api.js";
