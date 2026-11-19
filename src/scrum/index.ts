/**
 * @namespace scrum
 * @description Named `./scrum` subpath export of `@decaf-ts/for-react`.
 * @summary Backlog and sprint views for task-management screens, composed from
 * the controlled Kanban board rather than a second drag/drop engine. The host
 * owns the task collection, the sprint list, the selected sprint, the
 * task-to-sprint and task-to-column mappings, selection, and everything that
 * happens after a reorder, move or assignment. {@link SprintBoard} renders one
 * sprint's status columns from a {@link ScrumConfig}; {@link Backlog} renders the
 * tasks without a sprint in one column and adds an inline sprint-assignment
 * control; {@link SprintSelector} is a controlled sprint picker. Every component
 * is emit-only and reports typed move, reorder, selection, edit, assignment,
 * rejection and retry events without mutating host data. Importing this subpath
 * loads the shared `/kanban` implementation and its styles; it adds no new
 * runtime dependency of its own. The public surface is re-exported from
 * `public-api.ts`.
 * @memberOf module:for-react
 */
export * from "./public-api.js";
