import type { ReactNode } from "react";

/**
 * @description Deterministic reason a requested move or reorder was refused.
 * @summary Reported through {@link TaskMoveRejectedEvent.reason} whenever the
 * board declines an interaction; the task always stays where it was and the
 * rejection is announced to assistive technology. `cancelled` covers a dropped
 * or escaped gesture, `disabled` and `readonly` cover blocked boards,
 * `invalid-index` covers an unreachable drop position, `unchanged` covers a
 * no-op reorder, `unknown-column` covers a target the board cannot resolve, and
 * `wip-limit` covers a full destination column.
 * @typedef {string} KanbanMoveRejectionReason
 * @memberOf module:for-react.kanban
 */
export type KanbanMoveRejectionReason =
  | "cancelled"
  | "disabled"
  | "invalid-index"
  | "readonly"
  | "unchanged"
  | "unknown-column"
  | "wip-limit";

/**
 * @description Host-declared column of a {@link KanbanBoard}.
 * @summary Columns are presentation metadata only: the board renders them in the
 * given order and matches tasks to them through {@link KanbanConfig.status}.
 * Column order, membership and WIP limits are host-owned and never rewritten by
 * the board.
 * @interface KanbanColumnConfig
 * @property {string} id - Stable column identifier used for grouping, events and
 * DOM relationships.
 * @property {string} title - Human-readable column title.
 * @property {number} [wipLimit] - Optional work-in-progress ceiling. A move into
 * a column already at its limit is rejected with reason `wip-limit`; the board
 * never hides or drops a card to enforce it.
 * @memberOf module:for-react.kanban
 */
export interface KanbanColumnConfig {
  readonly id: string;
  readonly title: string;
  readonly wipLimit?: number;
}

/**
 * @description Host-supplied mapping between tasks and board columns.
 * @summary Required by {@link KanbanBoard}. The board calls these accessors to
 * derive each column's contents; it never stores, clones or mutates tasks, so
 * `status` must reflect the host's current truth. `swimlane` is accepted for
 * configuration parity with the Angular entry point but is **type-level only**:
 * the Angular baseline does not consume it and this board never renders
 * swimlane rows.
 * @template T The host task type.
 * @interface KanbanConfig
 * @property {function(T): string} id - Stable unique task identifier used for
 * selection, React keys and dnd-kit ids.
 * @property {function(T): string} title - Task title used for labels,
 * announcements and the default card body.
 * @property {function(T): string} status - Column id the task belongs to.
 * @property {KanbanColumnConfig[]} columns - Ordered columns to render.
 * @property {function(T): (string | undefined)} [swimlane] - Accepted for
 * Angular configuration parity only; never rendered by this board.
 * @memberOf module:for-react.kanban
 */
export interface KanbanConfig<T> {
  readonly id: (item: T) => string;
  readonly title: (item: T) => string;
  readonly status: (item: T) => string;
  readonly columns: readonly KanbanColumnConfig[];
  readonly swimlane?: (item: T) => string | undefined;
}

/**
 * @description Accepted request to move a task into another column.
 * @summary Emitted through `onTaskMoved`; the board does not apply the move, the
 * host persists the event and re-supplies `items`.
 * @template T The host task type.
 * @interface TaskMoveEvent
 * @property {T} task - Task the host asked to move.
 * @property {string} fromColumn - Column id the task came from.
 * @property {string} toColumn - Column id the task was dropped into.
 * @property {number} previousIndex - Index of the task in the full source
 * column population before the move.
 * @property {number} currentIndex - Index the task should occupy in the full
 * destination column population.
 * @memberOf module:for-react.kanban
 */
export interface TaskMoveEvent<T> {
  readonly task: T;
  readonly fromColumn: string;
  readonly toColumn: string;
  readonly previousIndex: number;
  readonly currentIndex: number;
}

/**
 * @description Accepted request to reorder a task within its own column.
 * @summary Emitted through `onTaskReordered`; like every board event it describes
 * a request, and the host decides the resulting order.
 * @template T The host task type.
 * @interface TaskReorderEvent
 * @property {T} task - Task being reordered.
 * @property {string} column - Column id that contains the task.
 * @property {number} previousIndex - Index before the reorder in the full
 * column population.
 * @property {number} currentIndex - Index the task should occupy after the
 * reorder in the full column population.
 * @memberOf module:for-react.kanban
 */
export interface TaskReorderEvent<T> {
  readonly task: T;
  readonly column: string;
  readonly previousIndex: number;
  readonly currentIndex: number;
}

/**
 * @description Task reference carried by selection and edit-request events.
 * @summary Shared payload of `onTaskSelected` and `onTaskEditRequested`. The
 * board reports the request only; the host owns `selectedId` and any resulting
 * editor.
 * @template T The host task type.
 * @interface KanbanSelectionEvent
 * @property {T} task - Task that was selected or whose edit was requested.
 * @property {string} column - Column id containing the task.
 * @memberOf module:for-react.kanban
 */
export interface KanbanSelectionEvent<T> {
  readonly task: T;
  readonly column: string;
}

/**
 * @description Refused move or reorder, reported to the host.
 * @summary Emitted through `onTaskMoveRejected` instead of a move event. The
 * board has already left the task in place and announced the rejection; hosts
 * typically surface the reason but must not treat the board as having applied
 * the move.
 * @template T The host task type.
 * @interface TaskMoveRejectedEvent
 * @property {T} task - Task whose move was refused.
 * @property {string} fromColumn - Column id the task came from.
 * @property {string} toColumn - Column id the move targeted; empty when the
 * target could not be determined.
 * @property {number} previousIndex - Index of the task in the source population,
 * or `-1` when the board could not resolve it.
 * @property {number} currentIndex - Requested destination index, or `-1` when
 * the gesture carried none.
 * @property {KanbanMoveRejectionReason} reason - Deterministic rejection
 * reason.
 * @property {number} [wipLimit] - Destination WIP limit, present only for a
 * `wip-limit` rejection.
 * @memberOf module:for-react.kanban
 */
export interface TaskMoveRejectedEvent<T> {
  readonly task: T;
  readonly fromColumn: string;
  readonly toColumn: string;
  readonly previousIndex: number;
  readonly currentIndex: number;
  readonly reason: KanbanMoveRejectionReason;
  readonly wipLimit?: number;
}

/**
 * @description Context passed to the `renderCard` render prop.
 * @summary Replaces the Angular card template directive with an identical context
 * object. `$implicit` mirrors the Angular `let-task` binding for parity.
 * @template T The host task type.
 * @interface KanbanCardTemplateContext
 * @property {T} $implicit - The task, mirroring the Angular implicit binding.
 * @property {T} task - The task being rendered.
 * @property {KanbanColumnConfig} column - Column that contains the task.
 * @property {number} index - Zero-based visible index within the column.
 * @property {boolean} selected - Whether the task matches the controlled
 * `selectedId`.
 * @property {boolean} readOnly - Whether the board is currently view-only.
 * @memberOf module:for-react.kanban
 */
export interface KanbanCardTemplateContext<T> {
  readonly $implicit: T;
  readonly task: T;
  readonly column: KanbanColumnConfig;
  readonly index: number;
  readonly selected: boolean;
  readonly readOnly: boolean;
}

/**
 * @description Context passed to the `renderColumnHeader` render prop.
 * @summary Replaces the Angular column-header template directive. The board has
 * already resolved the column and its visible task count; the renderer only
 * supplies markup.
 * @interface KanbanColumnHeaderTemplateContext
 * @property {KanbanColumnConfig} $implicit - The column, mirroring the Angular
 * implicit binding.
 * @property {KanbanColumnConfig} column - Column being rendered.
 * @property {number} count - Visible task count in the column.
 * @property {number} [wipLimit] - Declared WIP limit, if any.
 * @property {boolean} readOnly - Whether the column is currently view-only.
 * @memberOf module:for-react.kanban
 */
export interface KanbanColumnHeaderTemplateContext {
  readonly $implicit: KanbanColumnConfig;
  readonly column: KanbanColumnConfig;
  readonly count: number;
  readonly wipLimit?: number;
  readonly readOnly: boolean;
}

/**
 * @description Context passed to the `renderEmpty` render prop.
 * @summary Replaces the Angular empty-state template directive. The board calls it
 * once per empty column with `board: false`, and once for a board that renders no
 * columns with `board: true`, a `null` column and `count: 0`.
 * @interface KanbanEmptyTemplateContext
 * @property {KanbanColumnConfig | null} $implicit - The empty column, or `null`
 * for the board-level case; mirrors the Angular implicit binding.
 * @property {KanbanColumnConfig | null} column - The empty column, or `null` for
 * the board-level case.
 * @property {number} count - Always `0`.
 * @property {boolean} board - `true` when the context describes the whole board
 * rather than one column.
 * @memberOf module:for-react.kanban
 */
export interface KanbanEmptyTemplateContext {
  readonly $implicit: KanbanColumnConfig | null;
  readonly column: KanbanColumnConfig | null;
  readonly count: number;
  readonly board: boolean;
}

/**
 * @description Keyboard payload forwarded from a focused card.
 * @summary Internal composition contract used by {@link KanbanColumn} to hand a
 * card's DOM key event to {@link KanbanBoard}'s keyboard state machine. Hosts
 * normally never observe this type.
 * @template T The host task type.
 * @interface KanbanCardKeyboardEvent
 * @property {KeyboardEvent} event - Native DOM keyboard event.
 * @property {T} task - Task that owned focus.
 * @property {string} column - Column id of the focused task.
 * @property {number} index - Visible index of the focused task.
 * @memberOf module:for-react.kanban
 */
export interface KanbanCardKeyboardEvent<T> {
  readonly event: KeyboardEvent;
  readonly task: T;
  readonly column: string;
  readonly index: number;
}

/**
 * @description Low-level drop descriptor retained for Angular parity.
 * @summary Describes a drop in terms of the source and destination droppable ids.
 * The React board resolves drops through `resolveMoveIndices` and emits
 * {@link TaskMoveEvent} or {@link TaskReorderEvent} instead, so hosts do not
 * consume this type directly.
 * @template T The host task type.
 * @interface KanbanColumnDropEvent
 * @property {string} previousDropListId - Droppable id of the source list.
 * @property {string} dropListId - Droppable id of the destination list.
 * @property {number} previousIndex - Source index before the drop.
 * @property {number} currentIndex - Requested destination index.
 * @property {T} task - Task that was dropped.
 * @memberOf module:for-react.kanban
 */
export interface KanbanColumnDropEvent<T> {
  readonly previousDropListId: string;
  readonly dropListId: string;
  readonly previousIndex: number;
  readonly currentIndex: number;
  readonly task: T;
}

/**
 * @description Callback invoked when the error state's retry control is
 * activated.
 * @summary The board never retries by itself; it only reports the request so the
 * host can re-fetch and update `items`/`error`.
 * @typedef {function(): void} KanbanRetryHandler
 * @memberOf module:for-react.kanban
 */
export type KanbanRetryHandler = () => void;

/**
 * @description Host-supplied predicate that narrows the rendered tasks.
 * @summary Applied per column after status grouping. Filtering affects
 * presentation only; move and reorder events still report indices in the full
 * host population, so a hidden task never corrupts the host order.
 * @template T The host task type.
 * @typedef {function(T): boolean} KanbanFilter
 * @memberOf module:for-react.kanban
 */
export type KanbanFilter<T> = (item: T) => boolean;

/**
 * @description Property-name map used to build a {@link KanbanConfig} from a
 * plain model.
 * @summary Consumed by {@link kanbanConfigFromFields}; each key names a task
 * property rather than a value, so the generated accessors always read the
 * host's current task objects.
 * @template T The host task type.
 * @interface KanbanFieldMap
 * @property {string} id - Property holding the stable task id.
 * @property {string} title - Property holding the task title.
 * @property {string} status - Property holding the task's column id.
 * @property {string} [swimlane] - Optional property holding a swimlane label;
 * accepted for parity and never rendered.
 * @memberOf module:for-react.kanban
 */
export interface KanbanFieldMap<T> {
  readonly id: keyof T;
  readonly title: keyof T;
  readonly status: keyof T;
  readonly swimlane?: keyof T;
}

/**
 * @description Render prop replacing the Angular card template directive.
 * @summary Receives a {@link KanbanCardTemplateContext} and returns the card body;
 * the board keeps ownership of the card shell, drag handle, accessibility
 * attributes and keyboard handling.
 * @template T The host task type.
 * @typedef {function(KanbanCardTemplateContext<T>): ReactNode} KanbanCardRenderer
 * @memberOf module:for-react.kanban
 */
export type KanbanCardRenderer<T> = (
  context: KanbanCardTemplateContext<T>
) => ReactNode;

/**
 * @description Render prop replacing the Angular column-header template
 * directive.
 * @summary Receives a {@link KanbanColumnHeaderTemplateContext} and returns the
 * header content; the board keeps ownership of the labelled column region and
 * dropzone.
 * @typedef {function(KanbanColumnHeaderTemplateContext): ReactNode} KanbanColumnHeaderRenderer
 * @memberOf module:for-react.kanban
 */
export type KanbanColumnHeaderRenderer = (
  context: KanbanColumnHeaderTemplateContext
) => ReactNode;

/**
 * @description Render prop replacing the Angular empty-state template directive.
 * @summary Receives a {@link KanbanEmptyTemplateContext} per empty column and once
 * for a board with no columns.
 * @typedef {function(KanbanEmptyTemplateContext): ReactNode} KanbanEmptyRenderer
 * @memberOf module:for-react.kanban
 */
export type KanbanEmptyRenderer = (
  context: KanbanEmptyTemplateContext
) => ReactNode;

function fieldToString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * @description Builds a {@link KanbanConfig} from a property-name map.
 * @summary Convenience for hosts whose tasks expose `id`, `title` and `status`
 * as plain fields. Values are stringified with `null`/`undefined` becoming `""`.
 * When `fields.swimlane` is provided the returned config also carries a
 * `swimlane` accessor, but that accessor is type-level parity only and the board
 * never renders it.
 * @template T The host task type.
 * @param {KanbanFieldMap<T>} fields - Property names for the id, title, status and
 * optional swimlane.
 * @param {KanbanColumnConfig[]} columns - Ordered columns to render.
 * @returns {KanbanConfig<T>} Config suitable for {@link KanbanBoard}.
 * @memberOf module:for-react.kanban
 */
export function kanbanConfigFromFields<T extends object>(
  fields: KanbanFieldMap<T>,
  columns: readonly KanbanColumnConfig[]
): KanbanConfig<T> {
  const config: KanbanConfig<T> = {
    id: (item: T) => fieldToString(item[fields.id]),
    title: (item: T) => fieldToString(item[fields.title]),
    status: (item: T) => fieldToString(item[fields.status]),
    columns,
  };
  if (fields.swimlane) {
    const swimlane = fields.swimlane;
    return {
      ...config,
      swimlane: (item: T) => {
        const value = item[swimlane];
        return value === null || value === undefined
          ? undefined
          : String(value);
      },
    };
  }
  return config;
}

/**
 * @description Props accepted by {@link KanbanBoard}.
 * @summary Fully controlled: `items`, `config`, `selectedId`, `readOnly`,
 * `disabled`, `loading` and `error` describe the board, and every interaction is
 * reported through a callback instead of being applied. All labels are plain
 * strings with English defaults, so i18n is resolved by the host page. The
 * three Angular template directives map to `renderCard`,
 * `renderColumnHeader` and `renderEmpty`.
 * @template T The host task type.
 * @interface KanbanBoardProps
 * @property {T[]} [items=[]] - Host-owned task collection.
 * @property {KanbanConfig<T>} config - Required task/column mapping.
 * @property {string | null} [selectedId=null] - Controlled selected task id.
 * @property {boolean} [readOnly=false] - View-only board; selection still emits
 * `onTaskSelected` but edits and drags do not.
 * @property {boolean} [disabled=false] - Suppresses selection, edit and drag and
 * forces `readOnly` rendering.
 * @property {boolean} [loading=false] - Renders the loading state and suspends
 * dragging.
 * @property {string | null} [error=null] - Renders the error state plus a retry
 * action and suspends dragging.
 * @property {KanbanFilter<T> | null} [filter=null] - Host search/filter
 * predicate applied per column.
 * @property {string} [label="Kanban board"] - Accessible name of the board
 * region.
 * @property {string} [emptyMessage="No tasks"] - Empty column/board copy.
 * @property {string} [loadingMessage="Loading tasks..."] - Loading copy.
 * @property {string} [errorMessage="Unable to load tasks."] - Fallback error
 * copy used when `error` is empty.
 * @property {string} [retryLabel="Retry"] - Retry control label.
 * @property {string} [keyboardHelp=full sentence] - Keyboard help text referenced
 * by `aria-describedby` on cards.
 * @property {boolean} [showDragHandles=true] - Renders per-card pointer drag
 * handles.
 * @property {string} [instanceId=""] - Stable id prefix for accessible and
 * dnd-kit relationships; generated when empty.
 * @property {string} [className] - Extra classes on the board host element.
 * @property {KanbanCardRenderer<T>} [renderCard] - Card body render prop.
 * @property {KanbanColumnHeaderRenderer} [renderColumnHeader] - Column header
 * render prop.
 * @property {KanbanEmptyRenderer} [renderEmpty] - Empty-state render prop.
 * @property {function(TaskMoveEvent<T>): void} [onTaskMoved] - Emitted when a
 * cross-column move is accepted.
 * @property {function(TaskReorderEvent<T>): void} [onTaskReordered] - Emitted when
 * an in-column reorder is accepted.
 * @property {function(KanbanSelectionEvent<T>): void} [onTaskSelected] - Emitted
 * when a task is selected; suppressed while `disabled`.
 * @property {function(KanbanSelectionEvent<T>): void} [onTaskEditRequested] -
 * Emitted on `E`, `F2`, double-click or a second `Enter`; suppressed while
 * `disabled` or `readOnly`.
 * @property {function(): void} [onSelectionCleared] - Emitted when `Escape`
 * dismisses keyboard selection.
 * @property {function(TaskMoveRejectedEvent<T>): void} [onTaskMoveRejected] -
 * Emitted with a deterministic reason whenever a move is refused.
 * @property {function(): void} [onRetryRequested] - Emitted when the error state's
 * retry control is activated.
 * @memberOf module:for-react.kanban
 */
export interface KanbanBoardProps<T = unknown> {
  items?: readonly T[];
  config: KanbanConfig<T>;
  selectedId?: string | null;
  readOnly?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  filter?: KanbanFilter<T> | null;
  label?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  errorMessage?: string;
  retryLabel?: string;
  keyboardHelp?: string;
  showDragHandles?: boolean;
  instanceId?: string;
  className?: string;
  renderCard?: KanbanCardRenderer<T>;
  renderColumnHeader?: KanbanColumnHeaderRenderer;
  renderEmpty?: KanbanEmptyRenderer;
  onTaskMoved?: (event: TaskMoveEvent<T>) => void;
  onTaskReordered?: (event: TaskReorderEvent<T>) => void;
  onTaskSelected?: (event: KanbanSelectionEvent<T>) => void;
  onTaskEditRequested?: (event: KanbanSelectionEvent<T>) => void;
  onSelectionCleared?: () => void;
  onTaskMoveRejected?: (event: TaskMoveRejectedEvent<T>) => void;
  onRetryRequested?: () => void;
}
