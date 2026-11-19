import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard.js";
import type {
  KanbanCardKeyboardEvent,
  KanbanCardRenderer,
  KanbanColumnConfig,
  KanbanColumnHeaderRenderer,
  KanbanConfig,
  KanbanEmptyRenderer,
  KanbanSelectionEvent,
} from "./kanban.types.js";
import { kanbanCardDndId, kanbanColumnDroppableId } from "./kanban.utils.js";

/**
 * @description Props accepted by the exported {@link KanbanColumn} primitive.
 * @summary Low-level column contract used by {@link KanbanBoard}. Hosts normally
 * use the board; composing columns directly means supplying the droppable
 * context, sortable ids and card handlers yourself. The column owns its labelled
 * region, dropzone, sortable context and empty state, and never mutates tasks.
 * @template T The host task type.
 * @interface KanbanColumnProps
 * @property {KanbanColumnConfig} column - Column metadata and WIP limit.
 * @property {KanbanConfig<T>} config - Task accessors.
 * @property {T[]} items - Visible tasks in the column, in display order.
 * @property {string} instanceId - Board instance id prefix for dnd-kit ids.
 * @property {string | null} selectedId - Controlled selected task id.
 * @property {string | null} grabbedId - Task id currently grabbed for a keyboard
 * move.
 * @property {boolean} readOnly - Whether the column is view-only.
 * @property {boolean} disabled - Whether the column is disabled.
 * @property {boolean} showDragHandles - Whether cards render pointer drag handles.
 * @property {string} emptyMessage - Fallback empty-column copy.
 * @property {string} helpId - Id of the keyboard-help element referenced by cards.
 * @property {KanbanCardRenderer<T>} [renderCard] - Card body render prop.
 * @property {KanbanColumnHeaderRenderer} [renderColumnHeader] - Column header
 * render prop.
 * @property {KanbanEmptyRenderer} [renderEmpty] - Empty-column render prop.
 * @property {function(KanbanSelectionEvent<T>): void} [onCardSelected] - Card
 * selection callback.
 * @property {function(KanbanSelectionEvent<T>): void} [onCardEditRequested] - Card
 * edit-request callback.
 * @property {function(KanbanCardKeyboardEvent<T>): void} [onCardKeydown] - Card
 * keyboard callback consumed by the board state machine.
 * @memberOf module:for-react.kanban
 */
export interface KanbanColumnProps<T> {
  column: KanbanColumnConfig;
  config: KanbanConfig<T>;
  items: readonly T[];
  instanceId: string;
  selectedId: string | null;
  grabbedId: string | null;
  readOnly: boolean;
  disabled: boolean;
  showDragHandles: boolean;
  emptyMessage: string;
  helpId: string;
  renderCard?: KanbanCardRenderer<T>;
  renderColumnHeader?: KanbanColumnHeaderRenderer;
  renderEmpty?: KanbanEmptyRenderer;
  onCardSelected?: (event: KanbanSelectionEvent<T>) => void;
  onCardEditRequested?: (event: KanbanSelectionEvent<T>) => void;
  onCardKeydown?: (payload: KanbanCardKeyboardEvent<T>) => void;
}

/**
 * @description One column of a Kanban board.
 * @summary Registers the column as a dnd-kit droppable, wraps its cards in a
 * sortable context, renders the optional column header and empty-state render
 * props, and flags over-limit columns from the declared `wipLimit`. The board
 * enforces WIP limits by rejecting moves; this component only reflects the state
 * it is given.
 * @template T The host task type.
 * @param {KanbanColumnProps<T>} props - Column props.
 * @returns {React.ReactElement} The rendered column.
 * @memberOf module:for-react.kanban
 */
export function KanbanColumn<T>(
  props: KanbanColumnProps<T>
): React.ReactElement {
  const {
    column,
    config,
    items,
    instanceId,
    selectedId,
    grabbedId,
    readOnly,
    disabled,
    showDragHandles,
    emptyMessage,
    helpId,
    renderCard,
    renderColumnHeader,
    renderEmpty,
    onCardSelected,
    onCardEditRequested,
    onCardKeydown,
  } = props;

  const dragDisabled = disabled || readOnly;
  const headingId = `${instanceId}-${column.id}-heading`;
  const droppableId = kanbanColumnDroppableId(instanceId, column.id);
  const { isOver, setNodeRef } = useDroppable({
    id: droppableId,
    data: { type: "column", columnId: column.id },
    disabled: dragDisabled,
  });

  const limit = column.wipLimit;
  const overLimit = limit !== undefined && limit >= 0 && items.length > limit;
  const itemIds = items.map((item) =>
    kanbanCardDndId(instanceId, config.id(item))
  );

  const headerContext = {
    $implicit: column,
    column,
    count: items.length,
    wipLimit: column.wipLimit,
    readOnly: dragDisabled,
  };
  const emptyContext = {
    $implicit: column,
    column,
    count: 0,
    board: false,
  };

  const dropzoneClassName = [
    "dcf-kanban-column__dropzone",
    items.length === 0 ? "dcf-kanban-column__dropzone--empty" : null,
    overLimit ? "dcf-kanban-column__dropzone--over-limit" : null,
    isOver && !dragDisabled ? "dcf-kanban-column__dropzone--receiving" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={[
        "dcf-kanban-column-host",
        "dcf-kanban-column",
        overLimit ? "dcf-kanban-column--over-limit" : null,
        dragDisabled ? "dcf-kanban-column--readonly" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      data-column-id={column.id}
      data-column-title={column.title}
      role="group"
      aria-labelledby={headingId}
    >
      <header className="dcf-kanban-column__header">
        {renderColumnHeader ? (
          renderColumnHeader(headerContext)
        ) : (
          <>
            <h2 className="dcf-kanban-column__title" id={headingId}>
              {column.title}
            </h2>
            <span className="dcf-kanban-column__count">
              {items.length}
              {column.wipLimit !== undefined ? ` / ${column.wipLimit}` : null}
            </span>
          </>
        )}
      </header>

      <div
        ref={setNodeRef}
        className={dropzoneClassName}
        aria-disabled={dragDisabled}
        aria-labelledby={headingId}
        role={items.length ? "list" : "group"}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <KanbanCard
              key={config.id(item)}
              task={item}
              config={config}
              column={column}
              index={index}
              count={items.length}
              instanceId={instanceId}
              selected={selectedId === config.id(item)}
              grabbed={grabbedId === config.id(item)}
              readOnly={dragDisabled}
              disabled={disabled}
              showHandle={showDragHandles && !dragDisabled}
              helpId={helpId}
              renderCard={renderCard}
              onSelect={onCardSelected}
              onEditRequested={onCardEditRequested}
              onKeydown={(event) =>
                onCardKeydown?.({
                  event: event.nativeEvent,
                  task: item,
                  column: column.id,
                  index,
                })
              }
            />
          ))}
        </SortableContext>
        {items.length === 0 ? (
          renderEmpty ? (
            renderEmpty(emptyContext)
          ) : (
            <p className="dcf-kanban-column__empty">{emptyMessage}</p>
          )
        ) : null}
      </div>
    </section>
  );
}
