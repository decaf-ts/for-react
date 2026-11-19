import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn.js";
import type {
  KanbanBoardProps,
  KanbanCardKeyboardEvent,
  KanbanCardTemplateContext,
  KanbanColumnConfig,
  KanbanEmptyTemplateContext,
  KanbanMoveRejectionReason,
  KanbanSelectionEvent,
  TaskMoveRejectedEvent,
} from "./kanban.types.js";
import {
  applyFilter,
  applyPreview,
  clamp,
  groupByStatus,
  kanbanColumnIdFromDroppableId,
  resolveMoveIndices,
  type KanbanPreview,
  type ResolvedMove,
} from "./kanban.utils.js";

let nextKanbanInstance = 0;

const DEFAULT_KEYBOARD_HELP =
  "Press Space to pick up a card, use the arrow keys to move it, press Enter to select or drop, press Enter again to edit, press E to edit, and Escape to cancel or clear the selection.";

interface CardDragData<T> {
  type: "card";
  task: T;
  columnId: string;
  index: number;
}

interface ColumnDragData {
  type: "column";
  columnId: string;
}

interface ActiveDrag<T> {
  task: T;
  columnId: string;
  index: number;
}

/**
 * @description Controlled, emit-only Kanban board.
 * @summary Renders the columns declared in `config.columns` from the host-owned
 * `items`, grouped by `config.status`. The component never mutates a task, calls
 * an API or moves a card on its own: an accepted interaction is reported through
 * `onTaskMoved`/`onTaskReordered`, selection through `onTaskSelected`/
 * `onTaskEditRequested`/`onSelectionCleared`, and a refused interaction through
 * `onTaskMoveRejected` with a deterministic reason. The host persists the event
 * and re-supplies `items`.
 *
 * Pointer dragging, sortable transforms and the drag overlay use dnd-kit
 * (`DndContext`, `useDroppable` per column, `useSortable` per card,
 * `DragOverlay`, `closestCorners`, `PointerSensor` and `accessibility
 * .announcements`). Keyboard interaction is **not** dnd-kit's `KeyboardSensor`:
 * the board owns the Angular non-negotiable state machine — `Space` picks up,
 * arrow keys move with a WIP-aware preview, `Enter` commits, second `Enter`/`E`/
 * `F2`/double-click requests edit, and `Escape` cancels or clears selection —
 * with polite live-region announcements.
 *
 * Deviations from the Angular baseline are intentional: no `KeyboardSensor`
 * keyboard parity is claimed, and `config.swimlane` is accepted at type level but
 * never rendered. The three Angular template directives become the `renderCard`,
 * `renderColumnHeader` and `renderEmpty` render props.
 * @template T The host task type.
 * @param {KanbanBoardProps<T>} props - Controlled board props.
 * @returns {React.ReactElement} The rendered board region.
 * @memberOf module:for-react.kanban
 */
export function KanbanBoard<T = unknown>(
  props: KanbanBoardProps<T>
): React.ReactElement {
  const {
    items = [],
    config,
    selectedId = null,
    readOnly = false,
    disabled = false,
    loading = false,
    error = null,
    filter = null,
    label = "Kanban board",
    emptyMessage = "No tasks",
    loadingMessage = "Loading tasks...",
    errorMessage = "Unable to load tasks.",
    retryLabel = "Retry",
    keyboardHelp = DEFAULT_KEYBOARD_HELP,
    showDragHandles = true,
    instanceId = "",
    className,
    renderCard,
    renderColumnHeader,
    renderEmpty,
    onTaskMoved,
    onTaskReordered,
    onTaskSelected,
    onTaskEditRequested,
    onSelectionCleared,
    onTaskMoveRejected,
    onRetryRequested,
  } = props;

  const [generatedInstanceId] = useState(
    () => `decaf-kanban-${++nextKanbanInstance}`
  );
  const resolvedInstanceId = instanceId || generatedInstanceId;
  const helpId = `${resolvedInstanceId}-keyboard-help`;

  const [keyboardSelectedId, setKeyboardSelectedId] = useState<string | null>(
    null
  );
  const [preview, setPreview] = useState<KanbanPreview<T> | null>(null);
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [activeDrag, setActiveDrag] = useState<ActiveDrag<T> | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    id: string;
    token: number;
  } | null>(null);
  const focusToken = useRef(0);
  const hostRef = useRef<HTMLDivElement>(null);

  const columns = config.columns;
  const isReadOnly = readOnly || disabled;
  const isBusy = loading || !!error;
  const dragDisabled = isReadOnly || isBusy;

  const grouped = useMemo(() => groupByStatus(items, config), [items, config]);
  const filtered = useMemo(
    () => applyFilter(grouped, filter ?? null),
    [grouped, filter]
  );
  const visible = useMemo(
    () => applyPreview(filtered, preview, (item) => config.id(item)),
    [filtered, preview, config]
  );
  const hasVisibleItems = useMemo(() => {
    for (const columnItems of visible.values()) {
      if (columnItems.length) {
        return true;
      }
    }
    return false;
  }, [visible]);
  const columnViews = useMemo(
    () =>
      columns.map((column) => ({
        column,
        items: visible.get(column.id) ?? [],
      })),
    [columns, visible]
  );

  const columnOf = (columnId: string): KanbanColumnConfig | undefined =>
    columns.find((column) => column.id === columnId);
  const columnTitle = (columnId: string): string =>
    columnOf(columnId)?.title ?? columnId;
  const taskId = (item: T): string => config.id(item);
  const titleOf = (item: T): string => config.title(item);

  const announce = (message: string): void => {
    setAnnouncement(message);
  };

  const focusTaskNow = (id: string): void => {
    const root = hostRef.current;
    if (!root) {
      return;
    }
    const cards = root.querySelectorAll<HTMLElement>("[data-kanban-task-id]");
    for (const card of Array.from(cards)) {
      if (card.dataset.kanbanTaskId === id) {
        card.focus();
        return;
      }
    }
  };

  const focusTaskAfterRender = (id: string): void => {
    focusToken.current += 1;
    setFocusRequest({ id, token: focusToken.current });
  };

  useEffect(() => {
    if (focusRequest) {
      focusTaskNow(focusRequest.id);
    }
  }, [focusRequest]);

  const reject = (
    task: T,
    fromColumn: string,
    toColumn: string,
    previousIndex: number,
    currentIndex: number,
    reason: KanbanMoveRejectionReason,
    wipLimit?: number
  ): void => {
    const event: TaskMoveRejectedEvent<T> = {
      task,
      fromColumn,
      toColumn,
      previousIndex,
      currentIndex,
      reason,
    };
    onTaskMoveRejected?.(
      wipLimit === undefined ? event : { ...event, wipLimit }
    );
    announce(rejectionMessage(task, toColumn, reason, wipLimit));
  };

  const rejectionMessage = (
    task: T,
    toColumn: string,
    reason: KanbanMoveRejectionReason,
    wipLimit?: number
  ): string => {
    const title = titleOf(task);
    const column = columnTitle(toColumn);
    switch (reason) {
      case "wip-limit":
        return `Cannot move ${title} to ${column}: the work-in-progress limit${
          wipLimit === undefined ? "" : ` of ${wipLimit}`
        } is reached.`;
      case "readonly":
        return `Cannot move ${title}: the board is read-only.`;
      case "disabled":
        return `Cannot move ${title}: the board is disabled.`;
      case "unchanged":
        return `${title} was not moved.`;
      case "cancelled":
        return `Move cancelled. ${title} was not moved.`;
      case "unknown-column":
        return `Cannot move ${title}: unknown column.`;
      case "invalid-index":
        return `Cannot move ${title}: invalid drop position.`;
      default:
        return `Cannot move ${title}.`;
    }
  };

  const commitMove = (
    task: T,
    fromColumn: string,
    toColumn: string,
    resolved: ResolvedMove
  ): void => {
    if (fromColumn === toColumn) {
      onTaskReordered?.({
        task,
        column: fromColumn,
        previousIndex: resolved.previousIndex,
        currentIndex: resolved.currentIndex,
      });
    } else {
      onTaskMoved?.({
        task,
        fromColumn,
        toColumn,
        previousIndex: resolved.previousIndex,
        currentIndex: resolved.currentIndex,
      });
    }
    announce(
      `${titleOf(task)} moved to ${columnTitle(toColumn)}, position ${
        resolved.currentIndex + 1
      }.`
    );
    focusTaskAfterRender(taskId(task));
  };

  const handleDrop = (
    task: T,
    fromColumn: string,
    toColumn: string,
    previousVisibleIndex: number,
    currentVisibleIndex: number
  ): void => {
    if (dragDisabled) {
      reject(
        task,
        fromColumn,
        toColumn,
        previousVisibleIndex,
        currentVisibleIndex,
        disabled ? "disabled" : "readonly"
      );
      return;
    }
    setPreview(null);
    setGrabbedId(null);
    const fullSource = grouped.get(fromColumn);
    const fullTarget = grouped.get(toColumn);
    if (!fullSource || !fullTarget) {
      reject(
        task,
        fromColumn,
        toColumn,
        previousVisibleIndex,
        currentVisibleIndex,
        "unknown-column"
      );
      return;
    }
    const limit = columnOf(toColumn)?.wipLimit;
    if (
      fromColumn !== toColumn &&
      limit !== undefined &&
      fullTarget.length >= limit
    ) {
      reject(
        task,
        fromColumn,
        toColumn,
        previousVisibleIndex,
        currentVisibleIndex,
        "wip-limit",
        limit
      );
      return;
    }
    const visibleSource = filtered.get(fromColumn) ?? [];
    const visibleTarget = filtered.get(toColumn) ?? [];
    const resolved = resolveMoveIndices(
      task,
      fromColumn,
      toColumn,
      previousVisibleIndex,
      currentVisibleIndex,
      fullSource,
      fullTarget,
      visibleSource,
      visibleTarget,
      (item) => config.id(item)
    );
    if (!resolved) {
      reject(
        task,
        fromColumn,
        toColumn,
        previousVisibleIndex,
        currentVisibleIndex,
        "invalid-index"
      );
      return;
    }
    if (
      fromColumn === toColumn &&
      resolved.previousIndex === resolved.currentIndex
    ) {
      reject(
        task,
        fromColumn,
        toColumn,
        resolved.previousIndex,
        resolved.currentIndex,
        "unchanged"
      );
      return;
    }
    commitMove(task, fromColumn, toColumn, resolved);
  };

  const beginGrab = (task: T, columnId: string, index: number): void => {
    if (dragDisabled) {
      reject(
        task,
        columnId,
        columnId,
        -1,
        -1,
        disabled ? "disabled" : "readonly"
      );
      return;
    }
    const full = grouped.get(columnId) ?? [];
    const fullIndex = full.findIndex(
      (item) => config.id(item) === taskId(task)
    );
    if (fullIndex < 0) {
      reject(task, columnId, columnId, -1, index, "invalid-index");
      return;
    }
    if (preview && preview.taskId !== taskId(task)) {
      setPreview(null);
      setGrabbedId(null);
    }
    setPreview({
      task,
      taskId: taskId(task),
      fromColumn: columnId,
      toColumn: columnId,
      fromVisibleIndex: index,
      toVisibleIndex: index,
    });
    setGrabbedId(taskId(task));
    announce(
      `${titleOf(task)} picked up in ${columnTitle(
        columnId
      )}. Use the arrow keys to move, Enter to drop, Escape to cancel.`
    );
    focusTaskAfterRender(taskId(task));
  };

  const movePreview = (key: string): void => {
    if (!preview) {
      return;
    }
    const targetColumnIndex = columns.findIndex(
      (column) => column.id === preview.toColumn
    );
    if (targetColumnIndex < 0) {
      cancelPreview("unknown-column");
      return;
    }
    const lists = filtered;
    const currentList = lists.get(preview.toColumn) ?? [];
    if (key === "ArrowUp" || key === "ArrowDown") {
      const delta = key === "ArrowUp" ? -1 : 1;
      const max =
        preview.fromColumn === preview.toColumn
          ? Math.max(currentList.length - 1, 0)
          : currentList.length;
      const next = clamp(preview.toVisibleIndex + delta, 0, max);
      if (next === preview.toVisibleIndex) {
        return;
      }
      setPreview({ ...preview, toVisibleIndex: next });
      announce(
        `${titleOf(preview.task)}: ${columnTitle(
          preview.toColumn
        )}, position ${next + 1}.`
      );
      focusTaskAfterRender(preview.taskId);
      return;
    }
    const direction = key === "ArrowLeft" ? -1 : 1;
    const nextColumnIndex = clamp(
      targetColumnIndex + direction,
      0,
      columns.length - 1
    );
    if (nextColumnIndex === targetColumnIndex) {
      return;
    }
    const nextColumn = columns[nextColumnIndex];
    const limit = nextColumn.wipLimit;
    const targetCount = (grouped.get(nextColumn.id) ?? []).length;
    if (
      nextColumn.id !== preview.fromColumn &&
      limit !== undefined &&
      targetCount >= limit
    ) {
      reject(
        preview.task,
        preview.fromColumn,
        nextColumn.id,
        -1,
        clamp(preview.toVisibleIndex, 0, targetCount),
        "wip-limit",
        limit
      );
      return;
    }
    const nextIndex = clamp(
      preview.toVisibleIndex,
      0,
      (lists.get(nextColumn.id) ?? []).length
    );
    setPreview({
      ...preview,
      toColumn: nextColumn.id,
      toVisibleIndex: nextIndex,
    });
    announce(
      `${titleOf(preview.task)}: ${nextColumn.title}, position ${
        nextIndex + 1
      }.`
    );
    focusTaskAfterRender(preview.taskId);
  };

  const cancelPreview = (
    reason: KanbanMoveRejectionReason,
    wipLimit?: number
  ): void => {
    if (!preview) {
      return;
    }
    const previousIndex = (grouped.get(preview.fromColumn) ?? []).findIndex(
      (item) => config.id(item) === preview.taskId
    );
    reject(
      preview.task,
      preview.fromColumn,
      preview.toColumn,
      previousIndex,
      preview.fromColumn === preview.toColumn ? previousIndex : -1,
      reason,
      wipLimit
    );
    setPreview(null);
    setGrabbedId(null);
    focusTaskAfterRender(preview.taskId);
  };

  const commitPreview = (): void => {
    if (!preview) {
      return;
    }
    const fullSource = grouped.get(preview.fromColumn);
    const fullTarget = grouped.get(preview.toColumn);
    if (!fullSource || !fullTarget) {
      cancelPreview("unknown-column");
      return;
    }
    const limit = columnOf(preview.toColumn)?.wipLimit;
    if (
      preview.fromColumn !== preview.toColumn &&
      limit !== undefined &&
      fullTarget.length >= limit
    ) {
      cancelPreview("wip-limit", limit);
      return;
    }
    const visibleSource = filtered.get(preview.fromColumn) ?? [];
    const visibleTarget = filtered.get(preview.toColumn) ?? [];
    const resolved = resolveMoveIndices(
      preview.task,
      preview.fromColumn,
      preview.toColumn,
      preview.fromVisibleIndex,
      preview.toVisibleIndex,
      fullSource,
      fullTarget,
      visibleSource,
      visibleTarget,
      (item) => config.id(item)
    );
    const fromColumn = preview.fromColumn;
    const toColumn = preview.toColumn;
    if (!resolved) {
      cancelPreview("invalid-index");
      return;
    }
    if (
      fromColumn === toColumn &&
      resolved.previousIndex === resolved.currentIndex
    ) {
      cancelPreview("unchanged");
      return;
    }
    setPreview(null);
    setGrabbedId(null);
    commitMove(preview.task, fromColumn, toColumn, resolved);
  };

  const focusAdjacent = (
    columnId: string,
    index: number,
    key: string
  ): void => {
    const lists = visible;
    if (key === "ArrowUp" || key === "ArrowDown") {
      const list = lists.get(columnId) ?? [];
      if (!list.length) {
        return;
      }
      const next = clamp(
        index + (key === "ArrowUp" ? -1 : 1),
        0,
        list.length - 1
      );
      if (next !== index) {
        focusTaskNow(config.id(list[next]));
      }
      return;
    }
    const columnIndex = columns.findIndex((column) => column.id === columnId);
    if (columnIndex < 0) {
      return;
    }
    const nextColumnIndex = clamp(
      columnIndex + (key === "ArrowLeft" ? -1 : 1),
      0,
      columns.length - 1
    );
    if (nextColumnIndex === columnIndex) {
      return;
    }
    const nextColumn = columns[nextColumnIndex];
    const list = lists.get(nextColumn.id) ?? [];
    if (!list.length) {
      announce(`${nextColumn.title} is empty.`);
      return;
    }
    const next = clamp(index, 0, list.length - 1);
    focusTaskNow(config.id(list[next]));
  };

  const onCardSelected = (event: KanbanSelectionEvent<T>): void => {
    if (disabled) {
      return;
    }
    setKeyboardSelectedId(null);
    onTaskSelected?.(event);
  };

  const onCardEditRequested = (event: KanbanSelectionEvent<T>): void => {
    if (disabled || isReadOnly) {
      return;
    }
    onTaskEditRequested?.(event);
  };

  const onCardKeydown = (payload: KanbanCardKeyboardEvent<T>): void => {
    const { event, task, column, index } = payload;
    const isSpace =
      event.code === "Space" || event.key === " " || event.key === "Spacebar";
    if (disabled) {
      if (isSpace) {
        event.preventDefault();
        reject(task, column, column, -1, index, "disabled");
      }
      return;
    }
    const isEnter = event.key === "Enter";
    const isEscape = event.key === "Escape";
    const isArrow =
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight";
    const grabbed = grabbedId === config.id(task);
    if (isSpace) {
      event.preventDefault();
      if (grabbed) {
        cancelPreview("cancelled");
      } else {
        beginGrab(task, column, index);
      }
      return;
    }
    if (grabbed) {
      if (isEscape) {
        event.preventDefault();
        cancelPreview("cancelled");
        return;
      }
      if (isEnter) {
        event.preventDefault();
        commitPreview();
        return;
      }
      if (isArrow) {
        event.preventDefault();
        movePreview(event.key);
        return;
      }
      return;
    }
    if (isEnter) {
      event.preventDefault();
      const id = config.id(task);
      if (keyboardSelectedId === id) {
        setKeyboardSelectedId(null);
        onCardEditRequested({ task, column });
      } else {
        setKeyboardSelectedId(id);
        onTaskSelected?.({ task, column });
      }
      return;
    }
    if (isEscape) {
      event.preventDefault();
      setKeyboardSelectedId(null);
      onSelectionCleared?.();
      return;
    }
    if (event.key === "e" || event.key === "E" || event.key === "F2") {
      event.preventDefault();
      onCardEditRequested({ task, column });
      return;
    }
    if (isArrow) {
      event.preventDefault();
      focusAdjacent(column, index, event.key);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const resolveOverIndex = (
    toColumn: string,
    overTask: T | undefined
  ): number => {
    const target = filtered.get(toColumn) ?? [];
    if (!overTask) {
      return target.length;
    }
    const index = target.findIndex(
      (item) => config.id(item) === config.id(overTask)
    );
    return index >= 0 ? index : target.length;
  };

  const onDragStart = (event: DragStartEvent): void => {
    const data = event.active.data.current as CardDragData<T> | undefined;
    if (!data || data.type !== "card") {
      return;
    }
    setActiveDrag({
      task: data.task,
      columnId: data.columnId,
      index: data.index,
    });
  };

  const onDragEnd = (event: DragEndEvent): void => {
    const data = event.active.data.current as CardDragData<T> | undefined;
    setActiveDrag(null);
    if (!data || data.type !== "card") {
      return;
    }
    const task = data.task;
    const fromColumn = data.columnId;
    const visibleSource = filtered.get(fromColumn) ?? [];
    const previousIndex = visibleSource.findIndex(
      (item) => config.id(item) === config.id(task)
    );
    if (!event.over) {
      reject(task, fromColumn, fromColumn, previousIndex, -1, "cancelled");
      return;
    }
    const overData = event.over.data.current as
      CardDragData<T> | ColumnDragData | undefined;
    let toColumn: string | null = null;
    let currentIndex = 0;
    if (overData?.type === "column") {
      toColumn = overData.columnId;
      currentIndex = resolveOverIndex(toColumn, undefined);
    } else if (overData?.type === "card") {
      toColumn = overData.columnId;
      currentIndex = resolveOverIndex(toColumn, overData.task);
    } else {
      toColumn = kanbanColumnIdFromDroppableId(
        resolvedInstanceId,
        String(event.over.id)
      );
      if (toColumn) {
        currentIndex = resolveOverIndex(toColumn, undefined);
      }
    }
    if (!toColumn) {
      reject(task, fromColumn, "", previousIndex, -1, "unknown-column");
      return;
    }
    handleDrop(task, fromColumn, toColumn, previousIndex, currentIndex);
  };

  const onDragCancel = (event: DragCancelEvent): void => {
    const data = event.active.data.current as CardDragData<T> | undefined;
    setActiveDrag(null);
    if (!data || data.type !== "card") {
      return;
    }
    const visibleSource = filtered.get(data.columnId) ?? [];
    const previousIndex = visibleSource.findIndex(
      (item) => config.id(item) === config.id(data.task)
    );
    reject(
      data.task,
      data.columnId,
      data.columnId,
      previousIndex,
      previousIndex,
      "cancelled"
    );
  };

  const announcements = useMemo<Announcements>(
    () => ({
      onDragStart({ active }) {
        const data = active.data.current as CardDragData<T> | undefined;
        if (!data) {
          return "";
        }
        return `${titleOf(data.task)} picked up in ${columnTitle(
          data.columnId
        )}. Use the arrow keys to move, Enter to drop, Escape to cancel.`;
      },
      onDragOver({ over }) {
        if (!over) {
          return "";
        }
        const overData = over.data.current as
          CardDragData<T> | ColumnDragData | undefined;
        const columnId =
          overData?.type === "card" || overData?.type === "column"
            ? overData.columnId
            : null;
        return columnId ? `${columnTitle(columnId)}.` : "";
      },
      onDragEnd() {
        return "";
      },
      onDragCancel() {
        return "";
      },
    }),
    [config, resolvedInstanceId]
  );

  const boardEmptyContext: KanbanEmptyTemplateContext = {
    $implicit: null,
    column: null,
    count: 0,
    board: true,
  };

  const overlayContext: KanbanCardTemplateContext<T> | null = activeDrag
    ? {
        $implicit: activeDrag.task,
        task: activeDrag.task,
        column: columnOf(activeDrag.columnId) ?? {
          id: activeDrag.columnId,
          title: activeDrag.columnId,
        },
        index: activeDrag.index,
        selected: selectedId === config.id(activeDrag.task),
        readOnly: dragDisabled,
      }
    : null;

  return (
    <div
      ref={hostRef}
      className={["dcf-kanban-host", className].filter(Boolean).join(" ")}
      data-kanban-instance={resolvedInstanceId}
    >
      <DndContext
        id={`${resolvedInstanceId}-dnd`}
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div
          className={[
            "dcf-kanban",
            isReadOnly ? "dcf-kanban--readonly" : null,
            disabled ? "dcf-kanban--disabled" : null,
            isBusy ? "dcf-kanban--busy" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          role="region"
          aria-label={label}
          aria-busy={loading}
          aria-disabled={isReadOnly}
        >
          {loading ? (
            <div
              className="dcf-kanban__state dcf-kanban__state--loading"
              role="status"
              aria-live="polite"
            >
              <span className="dcf-kanban__spinner" aria-hidden="true" />
              <span>{loadingMessage}</span>
            </div>
          ) : error ? (
            <div
              className="dcf-kanban__state dcf-kanban__state--error"
              role="alert"
            >
              <span>{error || errorMessage}</span>
              <button
                type="button"
                className="dcf-kanban__retry"
                onClick={() => onRetryRequested?.()}
              >
                {retryLabel}
              </button>
            </div>
          ) : (
            <div
              className="dcf-kanban__board"
              role={hasVisibleItems ? undefined : "group"}
              tabIndex={hasVisibleItems ? undefined : 0}
              aria-label={hasVisibleItems ? undefined : label}
            >
              {columnViews.map((view) => (
                <KanbanColumn
                  key={view.column.id}
                  column={view.column}
                  config={config}
                  items={view.items}
                  instanceId={resolvedInstanceId}
                  selectedId={selectedId}
                  grabbedId={grabbedId}
                  readOnly={isReadOnly}
                  disabled={disabled}
                  showDragHandles={showDragHandles}
                  emptyMessage={emptyMessage}
                  helpId={helpId}
                  renderCard={renderCard}
                  renderColumnHeader={renderColumnHeader}
                  renderEmpty={renderEmpty}
                  onCardSelected={onCardSelected}
                  onCardEditRequested={onCardEditRequested}
                  onCardKeydown={onCardKeydown}
                />
              ))}
              {columnViews.length === 0 ? (
                renderEmpty ? (
                  renderEmpty(boardEmptyContext)
                ) : (
                  <p className="dcf-kanban__state dcf-kanban__state--empty">
                    {emptyMessage}
                  </p>
                )
              ) : null}
            </div>
          )}

          <p className="dcf-kanban__help" id={helpId}>
            {keyboardHelp}
          </p>
          <div
            className="dcf-kanban__live dcf-kanban__sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {announcement}
          </div>
        </div>

        <DragOverlay>
          {activeDrag && overlayContext ? (
            <div className="dcf-kanban-card dcf-kanban-drag-preview">
              <div className="dcf-kanban-card__body">
                {renderCard ? (
                  renderCard(overlayContext)
                ) : (
                  <span className="dcf-kanban-card__title">
                    {config.title(activeDrag.task)}
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/**
 * @description Alias of {@link KanbanBoard} kept for callers porting Angular
 * component names to the React package.
 * @summary Behaves exactly like {@link KanbanBoard}; it is a naming bridge with no
 * separate implementation.
 * @constant
 * @type {function}
 * @memberOf module:for-react.kanban
 */
export const KanbanBoardComponent = KanbanBoard;

/**
 * @description Alias of {@link KanbanBoard} following the `Rgx*` naming convention
 * of the main for-react UI kit.
 * @summary Behaves exactly like {@link KanbanBoard}; it is a naming bridge with no
 * separate implementation.
 * @constant
 * @type {function}
 * @memberOf module:for-react.kanban
 */
export const RgxKanban = KanbanBoard;
