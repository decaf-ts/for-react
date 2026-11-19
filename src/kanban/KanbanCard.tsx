import React, { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import type {
  KanbanCardRenderer,
  KanbanCardTemplateContext,
  KanbanColumnConfig,
  KanbanConfig,
  KanbanSelectionEvent,
} from "./kanban.types.js";
import { kanbanCardDndId } from "./kanban.utils.js";

/**
 * @description Props accepted by the exported {@link KanbanCard} primitive.
 * @summary Low-level card contract used by {@link KanbanColumn}. Hosts normally
 * use {@link KanbanBoard}; composing cards directly means supplying the sortable
 * context and keyboard handlers yourself. Card content is delegated to
 * `renderCard`, while the card shell keeps ownership of the drag handle,
 * ARIA attributes and pointer/keyboard wiring.
 * @template T The host task type.
 * @interface KanbanCardProps
 * @property {T} task - Task to render.
 * @property {KanbanConfig<T>} config - Task accessors.
 * @property {KanbanColumnConfig} column - Column containing the task.
 * @property {number} index - Zero-based visible index within the column.
 * @property {number} count - Visible task count of the column.
 * @property {string} instanceId - Board instance id prefix for dnd-kit ids.
 * @property {boolean} selected - Whether the card matches the controlled
 * selection.
 * @property {boolean} grabbed - Whether the card is currently picked up for a
 * keyboard move.
 * @property {boolean} readOnly - Whether the card is view-only.
 * @property {boolean} disabled - Whether the card is disabled.
 * @property {boolean} showHandle - Whether to render the pointer drag handle.
 * @property {string} helpId - Id of the keyboard-help element referenced by
 * `aria-describedby`.
 * @property {KanbanCardRenderer<T>} [renderCard] - Card body render prop.
 * @property {function(KanbanSelectionEvent<T>): void} [onSelect] - Called when the
 * card is activated.
 * @property {function(KanbanSelectionEvent<T>): void} [onEditRequested] - Called
 * when edit is requested, for example by double-click.
 * @property {function(React.KeyboardEvent<HTMLDivElement>): void} [onKeydown] -
 * Keyboard handler owned by the board's state machine.
 * @memberOf module:for-react.kanban
 */
export interface KanbanCardProps<T> {
  task: T;
  config: KanbanConfig<T>;
  column: KanbanColumnConfig;
  index: number;
  count: number;
  instanceId: string;
  selected: boolean;
  grabbed: boolean;
  readOnly: boolean;
  disabled: boolean;
  showHandle: boolean;
  helpId: string;
  renderCard?: KanbanCardRenderer<T>;
  onSelect?: (event: KanbanSelectionEvent<T>) => void;
  onEditRequested?: (event: KanbanSelectionEvent<T>) => void;
  onKeydown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

function cardClassName(
  selected: boolean,
  grabbed: boolean,
  readOnly: boolean,
  disabled: boolean,
  dragging: boolean
): string {
  return [
    "dcf-kanban-card",
    selected ? "dcf-kanban-card--selected" : null,
    grabbed ? "dcf-kanban-card--grabbed" : null,
    readOnly ? "dcf-kanban-card--readonly" : null,
    disabled ? "dcf-kanban-card--disabled" : null,
    dragging ? "dcf-kanban-card--dragging" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function cardTransform(
  transform: { x: number; y: number; scaleX: number; scaleY: number } | null
): React.CSSProperties {
  if (!transform) {
    return {};
  }
  return {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`,
  };
}

/**
 * @description Single sortable Kanban card.
 * @summary Registers the card with dnd-kit's `useSortable`, renders the optional
 * pointer drag handle, and exposes a focusable `role="listitem"` with an
 * accessible name built from the title, column and position. Click and
 * double-click are translated into selection and edit requests; keyboard keys are
 * forwarded to the board's keyboard state machine. The card never mutates its
 * task.
 * @template T The host task type.
 * @param {KanbanCardProps<T>} props - Card props.
 * @returns {React.ReactElement} The rendered card element.
 * @memberOf module:for-react.kanban
 */
export function KanbanCard<T>(props: KanbanCardProps<T>): React.ReactElement {
  const {
    task,
    config,
    column,
    index,
    count,
    instanceId,
    selected,
    grabbed,
    readOnly,
    disabled,
    showHandle,
    helpId,
    renderCard,
    onSelect,
    onEditRequested,
    onKeydown,
  } = props;

  const taskId = config.id(task);
  const title = config.title(task);
  const interactive = !disabled;
  const sortable = useSortable({
    id: kanbanCardDndId(instanceId, taskId),
    data: { type: "card", task, columnId: column.id, index },
    disabled: disabled || readOnly,
  });
  const pointerDown = sortable.listeners?.onPointerDown as
    React.PointerEventHandler<HTMLElement> | undefined;
  const dragJustEnded = useRef(false);

  useEffect(() => {
    if (sortable.isDragging) {
      dragJustEnded.current = true;
      return;
    }
    if (dragJustEnded.current) {
      const timer = setTimeout(() => {
        dragJustEnded.current = false;
      }, 0);
      return () => clearTimeout(timer);
    }
    return;
  }, [sortable.isDragging]);

  const context: KanbanCardTemplateContext<T> = {
    $implicit: task,
    task,
    column,
    index,
    selected,
    readOnly,
  };

  const ariaLabel = `${title}, ${column.title}, position ${index + 1} of ${count}${
    selected ? ", selected" : ""
  }`;

  const handleSelect = () => {
    if (!interactive || dragJustEnded.current) {
      return;
    }
    onSelect?.({ task, column: column.id });
  };

  const handleDoubleClick = () => {
    if (!interactive || readOnly) {
      return;
    }
    onEditRequested?.({ task, column: column.id });
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        ...cardTransform(sortable.transform),
        transition: sortable.transition,
      }}
      className={cardClassName(
        selected,
        grabbed,
        readOnly,
        disabled,
        sortable.isDragging
      )}
      data-kanban-task-id={taskId}
      tabIndex={disabled ? undefined : 0}
      role="listitem"
      aria-label={ariaLabel}
      aria-current={selected ? "true" : undefined}
      aria-grabbed={grabbed}
      aria-describedby={helpId || undefined}
      onClick={handleSelect}
      onDoubleClick={handleDoubleClick}
      onKeyDown={onKeydown}
      {...(showHandle || !pointerDown
        ? {}
        : {
            onPointerDown:
              pointerDown as React.PointerEventHandler<HTMLDivElement>,
          })}
    >
      {showHandle ? (
        <span
          className="dcf-kanban-card__handle"
          aria-hidden="true"
          title="Drag"
          {...(pointerDown
            ? {
                onPointerDown:
                  pointerDown as React.PointerEventHandler<HTMLSpanElement>,
              }
            : {})}
        >
          <svg viewBox="0 0 12 20" focusable="false" aria-hidden="true">
            <circle cx="3" cy="4" r="1.4" />
            <circle cx="9" cy="4" r="1.4" />
            <circle cx="3" cy="10" r="1.4" />
            <circle cx="9" cy="10" r="1.4" />
            <circle cx="3" cy="16" r="1.4" />
            <circle cx="9" cy="16" r="1.4" />
          </svg>
        </span>
      ) : null}
      <div className="dcf-kanban-card__body">
        {renderCard ? (
          renderCard(context)
        ) : (
          <span className="dcf-kanban-card__title">{title}</span>
        )}
      </div>
    </div>
  );
}
