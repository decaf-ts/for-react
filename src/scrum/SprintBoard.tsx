import React, { useCallback, useMemo } from "react";
import {
  KanbanBoard,
  type KanbanCardRenderer,
  type KanbanFilter,
  type KanbanSelectionEvent,
  type TaskMoveEvent,
  type TaskMoveRejectedEvent,
  type TaskReorderEvent,
} from "../kanban/public-api.js";
import {
  scrumSprintIdOf,
  type ScrumConfig,
  type SprintBoardMoveEvent,
  type SprintBoardMoveRejectedEvent,
  type SprintBoardReorderEvent,
  type SprintBoardSelectionEvent,
} from "./scrum.types.js";

/**
 * @description Props accepted by {@link SprintBoard}.
 * @summary A sprint board is a Kanban board scoped to one sprint: `items` is
 * filtered through {@link scrumSprintIdOf} and only tasks whose sprint id equals
 * `sprintId` are rendered. All other state is controlled and forwarded to
 * `KanbanBoard`, so `items`, `selectedId`, `readOnly`/`readonly`, `disabled`,
 * `loading`, `error` and every callback describe the host's truth and are never
 * applied by the component. All labels are plain strings with English defaults,
 * so i18n is resolved by the host page. `readonly` is accepted as an Angular
 * compatibility alias for `readOnly`; when both are supplied, `readOnly` wins.
 * @template T The host task type.
 * @interface SprintBoardProps
 * @property {T[]} [items=[]] - Host-owned task collection; tasks outside
 * `sprintId` are filtered out before rendering.
 * @property {ScrumConfig<T>} config - Required task/column/sprint mapping.
 * @property {string} sprintId - Sprint the board is scoped to; required.
 * @property {string | null} [selectedId=null] - Controlled selected task id.
 * @property {boolean} [readOnly] - View-only board; selection still emits
 * `onTaskSelected` but edits and drags do not. Takes precedence over `readonly`.
 * @property {boolean} [readonly] - Angular-compatible alias for `readOnly`.
 * @property {boolean} [disabled=false] - Suppresses selection, edit and drag and
 * forces view-only rendering.
 * @property {boolean} [loading=false] - Renders the loading state and suspends
 * dragging.
 * @property {string | null} [error=null] - Renders the error state plus a retry
 * action and suspends dragging.
 * @property {KanbanFilter<T> | null} [filter=null] - Host search/filter
 * predicate applied per column after sprint scoping.
 * @property {string} [label="Sprint board"] - Accessible name of the board
 * region.
 * @property {string} [emptyMessage="No tasks in this sprint"] - Empty
 * column/board copy.
 * @property {string} [loadingMessage="Loading sprint..."] - Loading copy.
 * @property {string} [errorMessage="Unable to load the sprint."] - Fallback
 * error copy used when `error` is empty.
 * @property {string} [retryLabel="Retry"] - Retry control label.
 * @property {boolean} [showDragHandles=true] - Renders per-card pointer drag
 * handles.
 * @property {string} [instanceId=""] - Stable id prefix for accessible and
 * dnd-kit relationships; generated when empty.
 * @property {KanbanCardRenderer<T>} [renderCard] - Card body render prop; when
 * omitted the card shows `config.title(task)`.
 * @property {function(SprintBoardMoveEvent<T>): void} [onTaskMoved] - Emitted
 * when a cross-column move is accepted, carrying `sprintId`.
 * @property {function(SprintBoardReorderEvent<T>): void} [onTaskReordered] -
 * Emitted when an in-column reorder is accepted, carrying `sprintId`.
 * @property {function(SprintBoardSelectionEvent<T>): void} [onTaskSelected] -
 * Emitted when a task is selected; suppressed while `disabled`.
 * @property {function(SprintBoardSelectionEvent<T>): void}
 * [onTaskEditRequested] - Emitted on `E`, `F2`, double-click or a second
 * `Enter`; suppressed while `disabled` or read-only.
 * @property {function(): void} [onSelectionCleared] - Emitted when `Escape`
 * dismisses keyboard selection.
 * @property {function(SprintBoardMoveRejectedEvent<T>): void}
 * [onTaskMoveRejected] - Emitted with a deterministic Kanban reason and
 * `sprintId` whenever a move is refused.
 * @property {function(): void} [onRetryRequested] - Emitted when the error
 * state's retry control is activated.
 * @memberOf module:for-react.scrum
 */
export interface SprintBoardProps<T = unknown> {
  items?: readonly T[];
  config: ScrumConfig<T>;
  sprintId: string;
  selectedId?: string | null;
  readOnly?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  filter?: KanbanFilter<T> | null;
  label?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  errorMessage?: string;
  retryLabel?: string;
  showDragHandles?: boolean;
  instanceId?: string;
  renderCard?: KanbanCardRenderer<T>;
  onTaskMoved?: (event: SprintBoardMoveEvent<T>) => void;
  onTaskReordered?: (event: SprintBoardReorderEvent<T>) => void;
  onTaskSelected?: (event: SprintBoardSelectionEvent<T>) => void;
  onTaskEditRequested?: (event: SprintBoardSelectionEvent<T>) => void;
  onSelectionCleared?: () => void;
  onTaskMoveRejected?: (event: SprintBoardMoveRejectedEvent<T>) => void;
  onRetryRequested?: () => void;
}

/**
 * @description Controlled, emit-only sprint board composed from the Kanban
 * board.
 * @summary Filters the host-owned `items` to the tasks whose normalised sprint id
 * equals `sprintId`, then renders them through `KanbanBoard` with the same
 * columns, drag/drop, keyboard state machine, WIP handling and accessibility
 * contract. The component never mutates a task, calls an API or moves a card on
 * its own: accepted interactions are reported through `onTaskMoved`/
 * `onTaskReordered`, selection through `onTaskSelected`/`onTaskEditRequested`/
 * `onSelectionCleared`, and refused interactions through `onTaskMoveRejected`
 * with a deterministic reason. Every sprint-scoped event adds the board's
 * `sprintId`. Because it composes `KanbanBoard`, this entry point ships no
 * duplicate drop-list, card renderer or drag/drop engine and adds no runtime
 * dependency of its own.
 * @template T The host task type.
 * @param {SprintBoardProps<T>} props - Controlled sprint-board props.
 * @returns {React.ReactElement} The rendered sprint-board region.
 * @memberOf module:for-react.scrum
 */
export function SprintBoard<T = unknown>(
  props: SprintBoardProps<T>
): React.ReactElement {
  const {
    items = [],
    config,
    sprintId,
    selectedId = null,
    readOnly,
    readonly,
    disabled = false,
    loading = false,
    error = null,
    filter = null,
    label = "Sprint board",
    emptyMessage = "No tasks in this sprint",
    loadingMessage = "Loading sprint...",
    errorMessage = "Unable to load the sprint.",
    retryLabel = "Retry",
    showDragHandles = true,
    instanceId = "",
    renderCard,
    onTaskMoved,
    onTaskReordered,
    onTaskSelected,
    onTaskEditRequested,
    onSelectionCleared,
    onTaskMoveRejected,
    onRetryRequested,
  } = props;

  const isReadOnly = readOnly ?? readonly ?? false;

  const scopedItems = useMemo(
    () => items.filter((item) => scrumSprintIdOf(config, item) === sprintId),
    [items, config, sprintId]
  );

  const renderScopedCard = useCallback<KanbanCardRenderer<T>>(
    (context) => {
      if (renderCard) {
        return renderCard(context);
      }
      return (
        <span className="dcf-scrum-sprint-board__title">
          {config.title(context.task)}
        </span>
      );
    },
    [config, renderCard]
  );

  const handleMoved = useCallback(
    (event: TaskMoveEvent<T>) => onTaskMoved?.({ ...event, sprintId }),
    [onTaskMoved, sprintId]
  );
  const handleReordered = useCallback(
    (event: TaskReorderEvent<T>) => onTaskReordered?.({ ...event, sprintId }),
    [onTaskReordered, sprintId]
  );
  const handleSelected = useCallback(
    (event: KanbanSelectionEvent<T>) =>
      onTaskSelected?.({ ...event, sprintId }),
    [onTaskSelected, sprintId]
  );
  const handleEditRequested = useCallback(
    (event: KanbanSelectionEvent<T>) =>
      onTaskEditRequested?.({ ...event, sprintId }),
    [onTaskEditRequested, sprintId]
  );
  const handleRejected = useCallback(
    (event: TaskMoveRejectedEvent<T>) =>
      onTaskMoveRejected?.({ ...event, sprintId }),
    [onTaskMoveRejected, sprintId]
  );

  return (
    <div className="dcf-scrum-sprint-board-host" data-sprint-id={sprintId}>
      <KanbanBoard
        items={scopedItems}
        config={config}
        selectedId={selectedId}
        readOnly={isReadOnly}
        disabled={disabled}
        loading={loading}
        error={error}
        filter={filter}
        label={label}
        emptyMessage={emptyMessage}
        loadingMessage={loadingMessage}
        errorMessage={errorMessage}
        retryLabel={retryLabel}
        showDragHandles={showDragHandles}
        instanceId={instanceId}
        renderCard={renderScopedCard}
        onTaskMoved={handleMoved}
        onTaskReordered={handleReordered}
        onTaskSelected={handleSelected}
        onTaskEditRequested={handleEditRequested}
        onSelectionCleared={onSelectionCleared}
        onTaskMoveRejected={handleRejected}
        onRetryRequested={onRetryRequested}
      />
    </div>
  );
}

/**
 * @description Alias of {@link SprintBoard} kept for callers porting Angular
 * component names to the React package.
 * @summary Behaves exactly like {@link SprintBoard}; it is a naming bridge with
 * no separate implementation.
 * @constant
 * @type {function}
 * @memberOf module:for-react.scrum
 */
export const SprintBoardComponent = SprintBoard;
