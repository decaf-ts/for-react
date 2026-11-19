import type {
  KanbanConfig,
  KanbanMoveRejectionReason,
  KanbanSelectionEvent,
  TaskMoveEvent,
  TaskMoveRejectedEvent,
  TaskReorderEvent,
} from "../kanban/public-api.js";

/**
 * @description Column id used by the synthetic single column a {@link Backlog}
 * renders.
 * @summary `Backlog` filters host tasks down to those without a sprint and feeds
 * them to one Kanban column carrying this id. It is exported so hosts and tests
 * that inspect the generated board can recognise the column; it is never written
 * back to host tasks and a host column may legitimately share the name.
 * @constant
 * @type {string}
 * @default "backlog"
 * @memberOf module:for-react.scrum
 */
export const SCRUM_BACKLOG_COLUMN_ID = "backlog";

/**
 * @description Host-declared sprint metadata consumed by {@link Backlog} and
 * {@link SprintSelector}.
 * @summary Sprints are presentation metadata only: the scrum entry point renders
 * the given order, matches tasks through {@link ScrumConfig.sprint} and never
 * creates, renames, reorders or completes a sprint. Sprint lifecycle policy
 * (planned → active → completed) stays with the host.
 * @interface ScrumSprint
 * @property {string} id - Stable sprint identifier matched against
 * {@link ScrumConfig.sprint} and event payloads.
 * @property {string} title - Human-readable sprint title used in selectors and
 * announcements.
 * @property {string} [description] - Optional supporting copy; accepted for
 * parity and never rendered by the current components.
 * @memberOf module:for-react.scrum
 */
export interface ScrumSprint {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
}

/**
 * @description Kanban task mapping extended with the task-to-sprint accessor.
 * @summary Required by every scrum component. All Kanban accessors keep their
 * meaning, so the same config can drive {@link SprintBoard} and the underlying
 * `KanbanBoard`. `sprint` reports the host's current sprint membership and is
 * normalised through {@link scrumSprintIdOf}: only `null`, `undefined` and the
 * empty string mean "backlog", and the components never trim or rewrite a host
 * sprint id.
 * @template T The host task type.
 * @interface ScrumConfig
 * @property {function(T): (string | null | undefined)} sprint - Sprint id the
 * task belongs to; a `nullish` or empty value places it in the backlog.
 * @memberOf module:for-react.scrum
 */
export interface ScrumConfig<T> extends KanbanConfig<T> {
  readonly sprint: (item: T) => string | null | undefined;
}

/**
 * @description Accepted sprint selection reported by {@link SprintSelector}.
 * @summary Emitted through `onSprintSelected`; the component never applies the
 * selection itself, so the host updates `selectedSprintId` and decides which
 * board to show. `null` means the placeholder option was chosen.
 * @interface SprintSelectionEvent
 * @property {string | null} sprintId - Selected sprint id, or `null` when the
 * selection was cleared.
 * @memberOf module:for-react.scrum
 */
export interface SprintSelectionEvent {
  readonly sprintId: string | null;
}

/**
 * @description Accepted reorder inside a {@link Backlog}.
 * @summary Emitted through `onBacklogReordered` after the backing Kanban board
 * accepts an in-column reorder. The component does not apply the reorder; the
 * host persists it and re-supplies `items`. Indices refer to the backlog
 * population the component rendered (tasks without a sprint), before any
 * `filter` narrowing — not to the unfiltered host `items` array.
 * @template T The host task type.
 * @interface BacklogReorderEvent
 * @property {T} task - Task being reordered.
 * @property {number} previousIndex - Index before the reorder in the backlog
 * population.
 * @property {number} currentIndex - Index the task should occupy after the
 * reorder in the backlog population.
 * @memberOf module:for-react.scrum
 */
export interface BacklogReorderEvent<T> {
  readonly task: T;
  readonly previousIndex: number;
  readonly currentIndex: number;
}

/**
 * @description Refused reorder inside a {@link Backlog}.
 * @summary Emitted through `onBacklogReorderRejected` with the Kanban rejection
 * reason. The task stays where it was; the component has already restored the
 * visual order and never applies a partial reorder.
 * @template T The host task type.
 * @interface BacklogReorderRejectedEvent
 * @property {T} task - Task whose reorder was refused.
 * @property {number} previousIndex - Index of the task before the attempted
 * reorder.
 * @property {number} currentIndex - Requested destination index.
 * @property {KanbanMoveRejectionReason} reason - Deterministic rejection reason
 * re-used from the Kanban contract.
 * @memberOf module:for-react.scrum
 */
export interface BacklogReorderRejectedEvent<T> {
  readonly task: T;
  readonly previousIndex: number;
  readonly currentIndex: number;
  readonly reason: KanbanMoveRejectionReason;
}

/**
 * @description Deterministic reason a requested sprint assignment was refused.
 * @summary Reported through {@link SprintAssignmentRejectedEvent.reason}. The
 * backlog select always reverts to the task's current sprint, so a rejection
 * never leaves a task visually assigned: `disabled`, `error`, `loading` and
 * `readonly` mean the view cannot accept input, `unchanged` means the requested
 * sprint equals the current one (or no sprint was chosen), and `unknown-sprint`
 * means the requested id is absent from the host-supplied `sprints`.
 * @typedef {string} ScrumAssignmentRejectionReason
 * @memberOf module:for-react.scrum
 */
export type ScrumAssignmentRejectionReason =
  | "disabled"
  | "error"
  | "loading"
  | "readonly"
  | "unchanged"
  | "unknown-sprint";

/**
 * @description Accepted sprint-assignment request from a {@link Backlog}.
 * @summary Emitted through `onSprintAssignmentRequested` when the host's sprint
 * list contains the requested id and the view is interactive. The select is
 * reverted to `previousSprintId` before the callback runs, so the host owns the
 * resulting membership and re-supplies `items`; the component never mutates a
 * task.
 * @template T The host task type.
 * @interface SprintAssignmentRequestedEvent
 * @property {T} task - Task the host asked to assign.
 * @property {string} sprintId - Requested destination sprint id.
 * @property {string | null} previousSprintId - Sprint the task belonged to
 * before the request, or `null` when it came from the backlog.
 * @memberOf module:for-react.scrum
 */
export interface SprintAssignmentRequestedEvent<T> {
  readonly task: T;
  readonly sprintId: string;
  readonly previousSprintId: string | null;
}

/**
 * @description Refused sprint-assignment request from a {@link Backlog}.
 * @summary Emitted through `onSprintAssignmentRejected` instead of a request
 * event. The select has already been reverted to `previousSprintId`; hosts
 * typically surface the reason but must not treat the task as assigned.
 * @template T The host task type.
 * @interface SprintAssignmentRejectedEvent
 * @property {T} task - Task whose assignment was refused.
 * @property {string} sprintId - Requested sprint id, or the empty string when
 * no sprint was chosen.
 * @property {string | null} previousSprintId - Sprint the task belonged to
 * before the request, or `null` when it came from the backlog.
 * @property {ScrumAssignmentRejectionReason} reason - Deterministic rejection
 * reason.
 * @memberOf module:for-react.scrum
 */
export interface SprintAssignmentRejectedEvent<T> {
  readonly task: T;
  readonly sprintId: string;
  readonly previousSprintId: string | null;
  readonly reason: ScrumAssignmentRejectionReason;
}

/**
 * @description Accepted cross-column move reported by a {@link SprintBoard}.
 * @summary Extends the Kanban {@link TaskMoveEvent} with the sprint the board was
 * scoped to. Emitted through `onTaskMoved`; the host persists the move and
 * re-supplies `items`. Because the board only sees one sprint, the inherited
 * indices refer to that sprint's task population before any `filter` narrowing.
 * @template T The host task type.
 * @interface SprintBoardMoveEvent
 * @property {string} sprintId - Sprint id the emitting board was scoped to.
 * @memberOf module:for-react.scrum
 */
export interface SprintBoardMoveEvent<T> extends TaskMoveEvent<T> {
  readonly sprintId: string;
}

/**
 * @description Accepted in-column reorder reported by a {@link SprintBoard}.
 * @summary Extends the Kanban {@link TaskReorderEvent} with the sprint the board
 * was scoped to. The inherited indices refer to that sprint's task population
 * before any `filter` narrowing.
 * @template T The host task type.
 * @interface SprintBoardReorderEvent
 * @property {string} sprintId - Sprint id the emitting board was scoped to.
 * @memberOf module:for-react.scrum
 */
export interface SprintBoardReorderEvent<T> extends TaskReorderEvent<T> {
  readonly sprintId: string;
}

/**
 * @description Task reference carried by a {@link SprintBoard} selection or
 * edit-request event.
 * @summary Extends the Kanban {@link KanbanSelectionEvent} with the sprint the
 * board was scoped to, so a host sharing one selection handler across boards can
 * tell them apart.
 * @template T The host task type.
 * @interface SprintBoardSelectionEvent
 * @property {string} sprintId - Sprint id the emitting board was scoped to.
 * @memberOf module:for-react.scrum
 */
export interface SprintBoardSelectionEvent<T> extends KanbanSelectionEvent<T> {
  readonly sprintId: string;
}

/**
 * @description Refused move or reorder reported by a {@link SprintBoard}.
 * @summary Extends the Kanban {@link TaskMoveRejectedEvent} with the sprint the
 * board was scoped to. The task stays in place and the board has already
 * announced the rejection.
 * @template T The host task type.
 * @interface SprintBoardMoveRejectedEvent
 * @property {string} sprintId - Sprint id the emitting board was scoped to.
 * @memberOf module:for-react.scrum
 */
export interface SprintBoardMoveRejectedEvent<T>
  extends TaskMoveRejectedEvent<T> {
  readonly sprintId: string;
}

/**
 * @description Normalises a task's sprint membership for the scrum components.
 * @summary Reads {@link ScrumConfig.sprint} and maps `null`, `undefined` and the
 * empty string to `null` (backlog); every other value is stringified unchanged,
 * so a numeric host id becomes its decimal string without trimming. Both
 * {@link Backlog} and {@link SprintBoard} scope tasks through this helper, which
 * keeps their split complementary: a task either belongs to exactly one sprint
 * or to the backlog.
 * @template T The host task type.
 * @param {ScrumConfig<T>} config - Scrum task mapping carrying the sprint
 * accessor.
 * @param {T} item - Task to inspect.
 * @returns {string | null} The sprint id, or `null` when the task is in the
 * backlog.
 * @memberOf module:for-react.scrum
 */
export function scrumSprintIdOf<T>(
  config: ScrumConfig<T>,
  item: T
): string | null {
  const value = config.sprint(item);
  return value === null || value === undefined || value === ""
    ? null
    : String(value);
}
