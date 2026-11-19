import type { KanbanConfig } from "./kanban.types.js";

/**
 * @description Keyboard preview of a pending move.
 * @summary Tracks where a grabbed card would land while the user navigates with
 * the arrow keys. The board keeps the preview local; host data is untouched until
 * the preview is committed and a move/reorder event is emitted.
 * @template T The host task type.
 * @interface KanbanPreview
 * @property {T} task - Task being previewed.
 * @property {string} taskId - Id of the previewed task.
 * @property {string} fromColumn - Column id the task started in.
 * @property {string} toColumn - Column id the preview currently targets.
 * @property {number} fromVisibleIndex - Visible index the task started at.
 * @property {number} toVisibleIndex - Visible index the preview currently
 * targets.
 * @memberOf module:for-react.kanban
 */
export interface KanbanPreview<T> {
  readonly task: T;
  readonly taskId: string;
  readonly fromColumn: string;
  readonly toColumn: string;
  readonly fromVisibleIndex: number;
  readonly toVisibleIndex: number;
}

/**
 * @description Full-population indices of an accepted move.
 * @summary Returned by {@link resolveMoveIndices}. Indices refer to the complete
 * host column population, not the filtered visible list, so hosts can apply them
 * without re-deriving hidden tasks.
 * @interface ResolvedMove
 * @property {number} previousIndex - Index before the move.
 * @property {number} currentIndex - Index after the move.
 * @memberOf module:for-react.kanban
 */
export interface ResolvedMove {
  readonly previousIndex: number;
  readonly currentIndex: number;
}

/**
 * @description Constrains a number to an inclusive range.
 * @summary Used by the board and keyboard preview to keep indices inside the
 * current list bounds.
 * @param {number} value - Candidate value.
 * @param {number} min - Inclusive lower bound.
 * @param {number} max - Inclusive upper bound.
 * @returns {number} `value` clamped to `[min, max]`.
 * @memberOf module:for-react.kanban
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * @description Groups host tasks into the configured columns.
 * @summary Seeds one bucket per declared column, in column order, then appends
 * each task to the bucket named by `config.status`. Tasks whose status matches no
 * column are omitted rather than invented as a new column.
 * @template T The host task type.
 * @param {T[]} items - Host task collection.
 * @param {KanbanConfig<T>} config - Task/column mapping.
 * @returns {Map<string, T[]>} Column id to tasks, preserving host order.
 * @memberOf module:for-react.kanban
 */
export function groupByStatus<T>(
  items: readonly T[],
  config: KanbanConfig<T>
): Map<string, readonly T[]> {
  const grouped = new Map<string, T[]>();
  for (const column of config.columns) {
    grouped.set(column.id, []);
  }
  for (const item of items) {
    const bucket = grouped.get(config.status(item));
    if (bucket) {
      bucket.push(item);
    }
  }
  return grouped;
}

/**
 * @description Applies a host filter predicate to every column.
 * @summary Copies each column list and filters it; with a `null` predicate the
 * lists are copied unchanged. Filtering is presentation-only and never affects
 * the full-population indices in move events.
 * @template T The host task type.
 * @param {Map<string, T[]>} grouped - Output of {@link groupByStatus}.
 * @param {function(T): boolean | null} filter - Host predicate, or `null`.
 * @returns {Map<string, T[]>} Filtered copies keyed by column id.
 * @memberOf module:for-react.kanban
 */
export function applyFilter<T>(
  grouped: ReadonlyMap<string, readonly T[]>,
  filter: ((item: T) => boolean) | null
): Map<string, readonly T[]> {
  const filtered = new Map<string, readonly T[]>();
  for (const [columnId, items] of grouped) {
    filtered.set(columnId, filter ? items.filter(filter) : items.slice());
  }
  return filtered;
}

/**
 * @description Projects a keyboard preview onto the rendered lists.
 * @summary Returns the same lists when there is no preview or the previewed task
 * is no longer visible. Otherwise moves the task to `toVisibleIndex` in the
 * target list (or within its own list for an in-column preview) without mutating
 * the input collections.
 * @template T The host task type.
 * @param {Map<string, T[]>} lists - Filtered column lists.
 * @param {KanbanPreview<T> | null} preview - Pending keyboard preview.
 * @param {function(T): string} idOf - Task id accessor.
 * @returns {Map<string, T[]>} Lists with the preview applied.
 * @memberOf module:for-react.kanban
 */
export function applyPreview<T>(
  lists: ReadonlyMap<string, readonly T[]>,
  preview: KanbanPreview<T> | null,
  idOf: (item: T) => string
): Map<string, readonly T[]> {
  const result = new Map<string, readonly T[]>();
  for (const [columnId, items] of lists) {
    result.set(columnId, items);
  }
  if (!preview) {
    return result;
  }
  const source = lists.get(preview.fromColumn) ?? [];
  const sourceIndex = source.findIndex((item) => idOf(item) === preview.taskId);
  if (sourceIndex < 0) {
    return result;
  }
  const task = source[sourceIndex];
  const sourceWithoutTask = source.filter(
    (_item, index) => index !== sourceIndex
  );
  if (preview.fromColumn === preview.toColumn) {
    const target = sourceWithoutTask.slice();
    target.splice(clamp(preview.toVisibleIndex, 0, target.length), 0, task);
    result.set(preview.fromColumn, target);
    return result;
  }
  result.set(preview.fromColumn, sourceWithoutTask);
  const target = (lists.get(preview.toColumn) ?? []).slice();
  target.splice(clamp(preview.toVisibleIndex, 0, target.length), 0, task);
  result.set(preview.toColumn, target);
  return result;
}

/**
 * @description Resolves a visible drop into full-population indices.
 * @summary Translates the visible source/destination positions of a drag or
 * keyboard move into indices in the complete host column population, using the
 * neighbouring visible tasks as anchors. Handles same-column reorders and
 * cross-column moves, and returns `null` when the task is not where the gesture
 * claims it is so the board can reject with `invalid-index`.
 * @template T The host task type.
 * @param {T} task - Task being moved.
 * @param {string} fromColumn - Source column id.
 * @param {string} toColumn - Destination column id.
 * @param {number} previousVisibleIndex - Visible source index of the task.
 * @param {number} currentVisibleIndex - Requested visible destination index.
 * @param {T[]} fullSource - Complete source column population.
 * @param {T[]} fullTarget - Complete destination column population.
 * @param {T[]} visibleSource - Visible (filtered) source column list.
 * @param {T[]} visibleTarget - Visible (filtered) destination column list.
 * @param {function(T): string} idOf - Task id accessor.
 * @returns {ResolvedMove | null} Full-population indices, or `null` when the
 * gesture cannot be resolved.
 * @memberOf module:for-react.kanban
 */
export function resolveMoveIndices<T>(
  task: T,
  fromColumn: string,
  toColumn: string,
  previousVisibleIndex: number,
  currentVisibleIndex: number,
  fullSource: readonly T[],
  fullTarget: readonly T[],
  visibleSource: readonly T[],
  visibleTarget: readonly T[],
  idOf: (item: T) => string
): ResolvedMove | null {
  const taskId = idOf(task);
  const previousIndex = fullSource.findIndex((item) => idOf(item) === taskId);
  if (previousIndex < 0) {
    return null;
  }
  if (
    previousVisibleIndex < 0 ||
    previousVisibleIndex >= visibleSource.length ||
    idOf(visibleSource[previousVisibleIndex]) !== taskId
  ) {
    return null;
  }
  if (fromColumn === toColumn) {
    if (
      currentVisibleIndex === previousVisibleIndex ||
      currentVisibleIndex < 0
    ) {
      return { previousIndex, currentIndex: previousIndex };
    }
    const reordered = visibleSource.slice();
    const moved = reordered.splice(previousVisibleIndex, 1)[0];
    const safeCurrent = clamp(currentVisibleIndex, 0, reordered.length);
    reordered.splice(safeCurrent, 0, moved);
    const next = reordered[safeCurrent + 1];
    const previous = reordered[safeCurrent - 1];
    const remaining = fullSource.filter((item) => idOf(item) !== taskId);
    let insertAt = remaining.length;
    if (next) {
      const index = remaining.findIndex((item) => idOf(item) === idOf(next));
      if (index >= 0) {
        insertAt = index;
      }
    } else if (previous) {
      const index = remaining.findIndex(
        (item) => idOf(item) === idOf(previous)
      );
      if (index >= 0) {
        insertAt = index + 1;
      }
    }
    const target = remaining.slice();
    target.splice(insertAt, 0, task);
    return {
      previousIndex,
      currentIndex: target.findIndex((item) => idOf(item) === taskId),
    };
  }
  const safeCurrent = clamp(currentVisibleIndex, 0, visibleTarget.length);
  const remaining = fullTarget.filter((item) => idOf(item) !== taskId);
  const insertBefore = visibleTarget[safeCurrent];
  const insertAfter = visibleTarget[safeCurrent - 1];
  let insertAt = remaining.length;
  if (insertBefore) {
    const index = remaining.findIndex(
      (item) => idOf(item) === idOf(insertBefore)
    );
    if (index >= 0) {
      insertAt = index;
    }
  } else if (insertAfter) {
    const index = remaining.findIndex((item) => idOf(item) === idOf(insertAfter));
    if (index >= 0) {
      insertAt = index + 1;
    }
  }
  const target = remaining.slice();
  target.splice(insertAt, 0, task);
  return {
    previousIndex,
    currentIndex: target.findIndex((item) => idOf(item) === taskId),
  };
}

/**
 * @description Builds the dnd-kit droppable id for a column.
 * @summary Format: `${instanceId}-<columnId>-drop`. Keeping the instance prefix
 * makes several boards on one page independent, and the suffix lets the board map
 * a droppable id back to a column even when drag data is unavailable.
 * @param {string} instanceId - Board instance id prefix.
 * @param {string} columnId - Column id.
 * @returns {string} Droppable id for the column.
 * @memberOf module:for-react.kanban
 */
export function kanbanColumnDroppableId(
  instanceId: string,
  columnId: string
): string {
  return `${instanceId}-${columnId}-drop`;
}

/**
 * @description Recovers a column id from a droppable id.
 * @summary Inverse of {@link kanbanColumnDroppableId} for the given board
 * instance; returns `null` when the id carries a different prefix or suffix.
 * @param {string} instanceId - Board instance id prefix to match.
 * @param {string} droppableId - Candidate droppable id.
 * @returns {string | null} The column id, or `null` when the id is not a column
 * droppable of this instance.
 * @memberOf module:for-react.kanban
 */
export function kanbanColumnIdFromDroppableId(
  instanceId: string,
  droppableId: string
): string | null {
  const prefix = `${instanceId}-`;
  const suffix = "-drop";
  if (!droppableId.startsWith(prefix) || !droppableId.endsWith(suffix)) {
    return null;
  }
  return droppableId.slice(prefix.length, droppableId.length - suffix.length);
}

/**
 * @description Builds the dnd-kit sortable id for a card.
 * @summary Format: `${instanceId}-<taskId>-card`. The instance prefix keeps cards
 * from different boards on the same page from colliding in the sortable context.
 * @param {string} instanceId - Board instance id prefix.
 * @param {string} taskId - Task id.
 * @returns {string} Sortable id for the card.
 * @memberOf module:for-react.kanban
 */
export function kanbanCardDndId(instanceId: string, taskId: string): string {
  return `${instanceId}-${taskId}-card`;
}
