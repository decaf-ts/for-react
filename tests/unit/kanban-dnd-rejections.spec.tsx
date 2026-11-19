/**
 * @module for-react/kanban-dnd-rejections.spec
 * @summary SAA-2043 — board-level assertions for the pointer drag-end rejection
 * branches that cannot be driven through jsdom pointer gestures: the same-position
 * `unchanged` drop, a drop on a target bucket that does not exist and an over id
 * that cannot be mapped back to a column.
 * @description Wraps the real `@dnd-kit/core` `DndContext` so the board's own
 * `onDragEnd` handler can be invoked with controlled drag payloads, then asserts
 * the emitted `onTaskMoveRejected` event and the live-region message.
 */
import React from "react";
import { act, render } from "@testing-library/react";

jest.mock("@dnd-kit/core", () => {
  const actual = jest.requireActual("@dnd-kit/core");
  const react = jest.requireActual("react");
  return {
    ...actual,
    DndContext: (props: Record<string, unknown>) => {
      (globalThis as Record<string, unknown>).__kanbanDndProps = props;
      return react.createElement(actual.DndContext, props);
    },
  };
});

import {
  KanbanBoard,
  type KanbanColumnConfig,
  type KanbanConfig,
  type TaskMoveRejectedEvent,
} from "../../src/kanban";

interface Task {
  id: string;
  title: string;
  status: string;
}

const COLUMNS: readonly KanbanColumnConfig[] = [
  { id: "todo", title: "To do", wipLimit: 4 },
  { id: "doing", title: "In progress", wipLimit: 2 },
  { id: "review", title: "Review" },
];

const TASKS: readonly Task[] = [
  { id: "task-1", title: "Draft Kanban API contract", status: "todo" },
  { id: "task-2", title: "Wire drag and drop", status: "todo" },
  { id: "task-3", title: "Document keyboard move flow", status: "todo" },
  { id: "task-4", title: "Project card templates", status: "doing" },
  { id: "task-5", title: "Enforce WIP limits", status: "doing" },
];

const CONFIG: KanbanConfig<Task> = {
  id: (task) => task.id,
  title: (task) => task.title,
  status: (task) => task.status,
  columns: COLUMNS,
};

interface DragEndPayload {
  active: { id: string; data: { current: unknown } };
  over: { id: string; data: { current: unknown } } | null;
}

function dragEnd(payload: DragEndPayload): void {
  const props = (globalThis as Record<string, unknown>).__kanbanDndProps as {
    onDragEnd: (event: DragEndPayload) => void;
  };
  act(() => {
    props.onDragEnd(payload);
  });
}

function renderBoard(
  onTaskMoveRejected: jest.Mock<void, [TaskMoveRejectedEvent<Task>]>
): ReturnType<typeof render> {
  return render(
    <KanbanBoard<Task>
      instanceId="probe"
      items={TASKS}
      config={CONFIG}
      onTaskMoveRejected={onTaskMoveRejected}
    />
  );
}

function cardIds(container: HTMLElement, columnId: string): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      `[data-column-id="${columnId}"] [data-kanban-task-id]`
    )
  ).map((element) => element.dataset.kanbanTaskId as string);
}

function liveText(container: HTMLElement): string {
  return (
    container.querySelector<HTMLElement>(".dcf-kanban__live")?.textContent ?? ""
  );
}

describe("KanbanBoard — pointer drag-end rejection reasons", () => {
  it("rejects dropping a card back on itself with the unchanged reason", () => {
    const onTaskMoveRejected = jest.fn<void, [TaskMoveRejectedEvent<Task>]>();
    const { container } = renderBoard(onTaskMoveRejected);
    const dragged = {
      type: "card",
      task: TASKS[0],
      columnId: "todo",
      index: 0,
    };

    dragEnd({
      active: { id: "probe-task-1", data: { current: dragged } },
      over: { id: "probe-task-1", data: { current: dragged } },
    });

    expect(onTaskMoveRejected).toHaveBeenCalledTimes(1);
    expect(onTaskMoveRejected).toHaveBeenCalledWith({
      task: TASKS[0],
      fromColumn: "todo",
      toColumn: "todo",
      previousIndex: 0,
      currentIndex: 0,
      reason: "unchanged",
    });
    expect(liveText(container)).toBe(
      "Draft Kanban API contract was not moved."
    );
    expect(cardIds(container, "todo")).toEqual(["task-1", "task-2", "task-3"]);
  });

  it("rejects a drop on a target bucket that does not exist", () => {
    const onTaskMoveRejected = jest.fn<void, [TaskMoveRejectedEvent<Task>]>();
    const { container } = renderBoard(onTaskMoveRejected);

    dragEnd({
      active: {
        id: "probe-task-1",
        data: {
          current: {
            type: "card",
            task: TASKS[0],
            columnId: "todo",
            index: 0,
          },
        },
      },
      over: {
        id: "probe-ghost-drop",
        data: { current: { type: "column", columnId: "ghost" } },
      },
    });

    expect(onTaskMoveRejected).toHaveBeenCalledTimes(1);
    expect(onTaskMoveRejected).toHaveBeenCalledWith({
      task: TASKS[0],
      fromColumn: "todo",
      toColumn: "ghost",
      previousIndex: 0,
      currentIndex: 0,
      reason: "unknown-column",
    });
    expect(liveText(container)).toBe(
      "Cannot move Draft Kanban API contract: unknown column."
    );
    expect(cardIds(container, "todo")).toEqual(["task-1", "task-2", "task-3"]);
  });

  it("rejects an over id that cannot be mapped back to a column", () => {
    const onTaskMoveRejected = jest.fn<void, [TaskMoveRejectedEvent<Task>]>();
    const { container } = renderBoard(onTaskMoveRejected);

    dragEnd({
      active: {
        id: "probe-task-1",
        data: {
          current: {
            type: "card",
            task: TASKS[0],
            columnId: "todo",
            index: 0,
          },
        },
      },
      over: { id: "foreign-drop", data: { current: undefined } },
    });

    expect(onTaskMoveRejected).toHaveBeenCalledTimes(1);
    expect(onTaskMoveRejected).toHaveBeenCalledWith({
      task: TASKS[0],
      fromColumn: "todo",
      toColumn: "",
      previousIndex: 0,
      currentIndex: -1,
      reason: "unknown-column",
    });
    expect(liveText(container)).toBe(
      "Cannot move Draft Kanban API contract: unknown column."
    );
    expect(cardIds(container, "todo")).toEqual(["task-1", "task-2", "task-3"]);
  });
});
