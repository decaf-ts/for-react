import React, { useCallback, useMemo, useState } from "react";
import {
  KanbanBoard,
  type KanbanCardRenderer,
  type KanbanColumnConfig,
  type KanbanConfig,
  type KanbanFilter,
  type KanbanSelectionEvent,
  type TaskMoveRejectedEvent,
  type TaskReorderEvent,
} from "../kanban/public-api.js";
import {
  SCRUM_BACKLOG_COLUMN_ID,
  scrumSprintIdOf,
  type BacklogReorderEvent,
  type BacklogReorderRejectedEvent,
  type ScrumAssignmentRejectionReason,
  type ScrumConfig,
  type ScrumSprint,
  type SprintAssignmentRejectedEvent,
  type SprintAssignmentRequestedEvent,
} from "./scrum.types.js";

let nextBacklogInstance = 0;

/**
 * @description Props accepted by {@link Backlog}.
 * @summary The backlog is a single Kanban column holding the host tasks whose
 * normalised sprint id is `null`, plus an inline sprint-assignment control. All
 * other state is controlled and forwarded to `KanbanBoard`, so `items`,
 * `selectedId`, `readOnly`/`readonly`, `disabled`, `loading`, `error` and every
 * callback describe the host's truth and are never applied by the component.
 * All labels are plain strings with English defaults, so i18n is resolved by the
 * host page. `readonly` is accepted as an Angular compatibility alias for
 * `readOnly`; when both are supplied, `readOnly` wins. The assignment control is
 * disabled while the view is disabled, read-only, loading or in error, and when
 * `sprints` is empty.
 * @template T The host task type.
 * @interface BacklogProps
 * @property {T[]} [items=[]] - Host-owned task collection; only tasks with no
 * sprint id are rendered.
 * @property {ScrumConfig<T>} config - Required task column/sprint mapping.
 * @property {ScrumSprint[]} [sprints=[]] - Sprints offered by the assignment
 * control; an empty list disables it.
 * @property {string | null} [selectedId=null] - Controlled selected task id.
 * @property {boolean} [readOnly] - View-only board; selection still emits
 * `onTaskSelected` but edits, drags and assignment do not. Takes precedence over
 * `readonly`.
 * @property {boolean} [readonly] - Angular-compatible alias for `readOnly`.
 * @property {boolean} [disabled=false] - Suppresses selection, edit, drag and
 * assignment and forces view-only rendering.
 * @property {boolean} [loading=false] - Renders the loading state, suspends
 * dragging and disables assignment.
 * @property {string | null} [error=null] - Renders the error state plus a retry
 * action, suspends dragging and disables assignment.
 * @property {KanbanFilter<T> | null} [filter=null] - Host search/filter
 * predicate applied to the backlog column.
 * @property {string} [label="Backlog"] - Accessible name of the board region.
 * @property {string} [columnTitle="Backlog"] - Title of the single rendered
 * column.
 * @property {string} [emptyMessage="No backlog tasks"] - Empty-column copy.
 * @property {string} [loadingMessage="Loading backlog..."] - Loading copy.
 * @property {string} [errorMessage="Unable to load the backlog."] - Fallback
 * error copy used when `error` is empty.
 * @property {string} [retryLabel="Retry"] - Retry control label.
 * @property {string} [assignmentLabel="Assign to sprint"] - Label of the
 * per-card assignment control.
 * @property {string} [assignmentPlaceholder="Select a sprint"] - Placeholder
 * option of the assignment control.
 * @property {boolean} [showDragHandles=true] - Renders per-card pointer drag
 * handles.
 * @property {string} [instanceId=""] - Stable id prefix for accessible and
 * dnd-kit relationships; generated when empty.
 * @property {KanbanCardRenderer<T>} [renderCard] - Card summary render prop;
 * when omitted the card shows `config.title(task)`. The assignment control is
 * always rendered beneath the summary and is not replaced by this prop.
 * @property {function(BacklogReorderEvent<T>): void} [onBacklogReordered] -
 * Emitted when an in-backlog reorder is accepted.
 * @property {function(BacklogReorderRejectedEvent<T>): void}
 * [onBacklogReorderRejected] - Emitted with a deterministic Kanban reason
 * whenever a reorder is refused.
 * @property {function(SprintAssignmentRequestedEvent<T>): void}
 * [onSprintAssignmentRequested] - Emitted when a valid sprint is chosen in the
 * assignment control.
 * @property {function(SprintAssignmentRejectedEvent<T>): void}
 * [onSprintAssignmentRejected] - Emitted instead of a request event when the
 * assignment is refused; the control is already back on the task's sprint.
 * @property {function(KanbanSelectionEvent<T>): void} [onTaskSelected] -
 * Emitted when a task is selected; suppressed while `disabled`.
 * @property {function(KanbanSelectionEvent<T>): void} [onTaskEditRequested] -
 * Emitted on `E`, `F2`, double-click or a second `Enter`; suppressed while
 * `disabled` or read-only.
 * @property {function(): void} [onSelectionCleared] - Emitted when `Escape`
 * dismisses keyboard selection.
 * @property {function(): void} [onRetryRequested] - Emitted when the error
 * state's retry control is activated.
 * @memberOf module:for-react.scrum
 */
export interface BacklogProps<T = unknown> {
  items?: readonly T[];
  config: ScrumConfig<T>;
  sprints?: readonly ScrumSprint[];
  selectedId?: string | null;
  readOnly?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  filter?: KanbanFilter<T> | null;
  label?: string;
  columnTitle?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  errorMessage?: string;
  retryLabel?: string;
  assignmentLabel?: string;
  assignmentPlaceholder?: string;
  showDragHandles?: boolean;
  instanceId?: string;
  renderCard?: KanbanCardRenderer<T>;
  onBacklogReordered?: (event: BacklogReorderEvent<T>) => void;
  onBacklogReorderRejected?: (
    event: BacklogReorderRejectedEvent<T>
  ) => void;
  onSprintAssignmentRequested?: (
    event: SprintAssignmentRequestedEvent<T>
  ) => void;
  onSprintAssignmentRejected?: (
    event: SprintAssignmentRejectedEvent<T>
  ) => void;
  onTaskSelected?: (event: KanbanSelectionEvent<T>) => void;
  onTaskEditRequested?: (event: KanbanSelectionEvent<T>) => void;
  onSelectionCleared?: () => void;
  onRetryRequested?: () => void;
}

/**
 * @description Controlled, emit-only backlog composed from the Kanban board.
 * @summary Filters the host-owned `items` to the tasks {@link scrumSprintIdOf}
 * resolves to `null` and renders them in one Kanban column identified by
 * {@link SCRUM_BACKLOG_COLUMN_ID}. Ordering, drag/drop, keyboard operation,
 * selection and filtering come from `KanbanBoard`; the component adds only the
 * sprint-assignment control. It never mutates a task, calls an API or applies an
 * assignment: a valid choice is reported through `onSprintAssignmentRequested`
 * with the previous sprint, an invalid one through `onSprintAssignmentRejected`
 * with a deterministic reason, and the select always reverts to the task's
 * current sprint so the host stays authoritative. Reorders are reported through
 * `onBacklogReordered`/`onBacklogReorderRejected`. Because it composes
 * `KanbanBoard`, this entry point ships no duplicate drop-list or drag/drop
 * engine and adds no runtime dependency of its own.
 * @template T The host task type.
 * @param {BacklogProps<T>} props - Controlled backlog props.
 * @returns {React.ReactElement} The rendered backlog region.
 * @memberOf module:for-react.scrum
 */
export function Backlog<T = unknown>(
  props: BacklogProps<T>
): React.ReactElement {
  const {
    items = [],
    config,
    sprints = [],
    selectedId = null,
    readOnly,
    readonly,
    disabled = false,
    loading = false,
    error = null,
    filter = null,
    label = "Backlog",
    columnTitle = "Backlog",
    emptyMessage = "No backlog tasks",
    loadingMessage = "Loading backlog...",
    errorMessage = "Unable to load the backlog.",
    retryLabel = "Retry",
    assignmentLabel = "Assign to sprint",
    assignmentPlaceholder = "Select a sprint",
    showDragHandles = true,
    instanceId = "",
    renderCard,
    onBacklogReordered,
    onBacklogReorderRejected,
    onSprintAssignmentRequested,
    onSprintAssignmentRejected,
    onTaskSelected,
    onTaskEditRequested,
    onSelectionCleared,
    onRetryRequested,
  } = props;

  const [generatedInstanceId] = useState(
    () => `decaf-scrum-backlog-${++nextBacklogInstance}`
  );
  const resolvedInstanceId = instanceId || generatedInstanceId;
  const isReadOnly = readOnly ?? readonly ?? false;

  const backlogItems = useMemo(
    () => items.filter((item) => scrumSprintIdOf(config, item) === null),
    [items, config]
  );

  const boardConfig = useMemo<KanbanConfig<T>>(() => {
    const column: KanbanColumnConfig = {
      id: SCRUM_BACKLOG_COLUMN_ID,
      title: columnTitle,
    };
    return {
      id: (item: T) => config.id(item),
      title: (item: T) => config.title(item),
      status: () => SCRUM_BACKLOG_COLUMN_ID,
      columns: [column],
    };
  }, [config, columnTitle]);

  const canAssign = !disabled && !isReadOnly && !loading && !error;

  const assignmentRejectionReason = useCallback(
    (
      requested: string,
      previousSprintId: string | null
    ): ScrumAssignmentRejectionReason | null => {
      if (disabled) {
        return "disabled";
      }
      if (isReadOnly) {
        return "readonly";
      }
      if (loading) {
        return "loading";
      }
      if (error) {
        return "error";
      }
      if (!requested || requested === previousSprintId) {
        return "unchanged";
      }
      if (!sprints.some((sprint) => sprint.id === requested)) {
        return "unknown-sprint";
      }
      return null;
    },
    [disabled, isReadOnly, loading, error, sprints]
  );

  const stopPropagation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const onAssign = useCallback(
    (task: T, event: React.ChangeEvent<HTMLSelectElement>) => {
      const select = event.target;
      const requested = select.value ?? "";
      const previousSprintId = scrumSprintIdOf(config, task);
      select.value = previousSprintId ?? "";
      const reason = assignmentRejectionReason(requested, previousSprintId);
      if (reason) {
        onSprintAssignmentRejected?.({
          task,
          sprintId: requested,
          previousSprintId,
          reason,
        });
        return;
      }
      onSprintAssignmentRequested?.({
        task,
        sprintId: requested,
        previousSprintId,
      });
    },
    [assignmentRejectionReason, config, onSprintAssignmentRejected, onSprintAssignmentRequested]
  );

  const renderBacklogCard = useCallback<KanbanCardRenderer<T>>(
    (context) => {
      const task = context.task;
      const previousSprintId = scrumSprintIdOf(config, task);
      const assignDisabled = !canAssign || sprints.length === 0;
      return (
        <div
          className="dcf-scrum-backlog__card"
          data-scrum-backlog-task-id={config.id(task)}
        >
          {renderCard ? (
            renderCard(context)
          ) : (
            <span className="dcf-scrum-backlog__title">
              {config.title(task)}
            </span>
          )}
          <label className="dcf-scrum-backlog__assign">
            <span className="dcf-scrum-backlog__assign-label">
              {assignmentLabel}
            </span>
            <select
              className="dcf-scrum-backlog__select"
              data-scrum-assign-task-id={config.id(task)}
              aria-label={`${assignmentLabel}: ${config.title(task)}`}
              disabled={assignDisabled}
              value={previousSprintId ?? ""}
              onClick={stopPropagation}
              onKeyDown={stopPropagation}
              onPointerDown={stopPropagation}
              onChange={(event) => onAssign(task, event)}
            >
              <option value="">{assignmentPlaceholder}</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      );
    },
    [
      assignmentLabel,
      assignmentPlaceholder,
      canAssign,
      config,
      onAssign,
      renderCard,
      sprints,
      stopPropagation,
    ]
  );

  const handleReordered = useCallback(
    (event: TaskReorderEvent<T>) =>
      onBacklogReordered?.({
        task: event.task,
        previousIndex: event.previousIndex,
        currentIndex: event.currentIndex,
      }),
    [onBacklogReordered]
  );

  const handleRejected = useCallback(
    (event: TaskMoveRejectedEvent<T>) =>
      onBacklogReorderRejected?.({
        task: event.task,
        previousIndex: event.previousIndex,
        currentIndex: event.currentIndex,
        reason: event.reason,
      }),
    [onBacklogReorderRejected]
  );

  return (
    <div className="dcf-scrum-backlog-host">
      <KanbanBoard
        items={backlogItems}
        config={boardConfig}
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
        instanceId={resolvedInstanceId}
        renderCard={renderBacklogCard}
        onTaskReordered={handleReordered}
        onTaskMoveRejected={handleRejected}
        onTaskSelected={onTaskSelected}
        onTaskEditRequested={onTaskEditRequested}
        onSelectionCleared={onSelectionCleared}
        onRetryRequested={onRetryRequested}
      />
    </div>
  );
}

/**
 * @description Alias of {@link Backlog} kept for callers porting Angular
 * component names to the React package.
 * @summary Behaves exactly like {@link Backlog}; it is a naming bridge with no
 * separate implementation.
 * @constant
 * @type {function}
 * @memberOf module:for-react.scrum
 */
export const BacklogComponent = Backlog;
