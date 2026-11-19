/**
 * @module for-react/kanban.spec
 * @summary SAA-2010 — component contract for the React `/kanban` port
 * (SAA-2009 / DECAF-895), mirroring the Angular `kanban.stories.spec.ts`.
 * @description Proves the controlled-view contract, render-prop contexts and
 * the Angular keyboard state machine against the source entry point:
 *
 * - defaults, generated instance ids, accessible names and the help/live
 *   regions;
 * - loading, error/retry, empty, zero-column, read-only and disabled states;
 * - selection and edit emission (with disabled/read-only suppression);
 * - filtering, visible counters and existing over-limit WIP columns;
 * - `renderCard`/`renderColumnHeader`/`renderEmpty` context parity;
 * - pickup, arrow preview, commit, selection, edit and cancel keys, including
 *   WIP/disabled/read-only rejections and cross-column focus navigation.
 */
import React from "react";
import { fireEvent, render } from "@testing-library/react";
import {
  KanbanBoard,
  kanbanColumnDroppableId,
  type KanbanBoardProps,
  type KanbanCardTemplateContext,
  type KanbanColumnHeaderTemplateContext,
  type KanbanColumnConfig,
  type KanbanConfig,
  type KanbanEmptyTemplateContext,
  type KanbanSelectionEvent,
  type TaskMoveEvent,
  type TaskMoveRejectedEvent,
  type TaskReorderEvent,
} from "../../src/kanban";

interface Task {
  id: string;
  title: string;
  status: string;
  assignee: string;
}

const COLUMNS: readonly KanbanColumnConfig[] = [
  { id: "todo", title: "To do", wipLimit: 4 },
  { id: "doing", title: "In progress", wipLimit: 2 },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

const TASKS: readonly Task[] = [
  {
    id: "task-1",
    title: "Draft Kanban API contract",
    status: "todo",
    assignee: "Ada",
  },
  {
    id: "task-2",
    title: "Wire drag and drop",
    status: "todo",
    assignee: "Grace",
  },
  {
    id: "task-3",
    title: "Document keyboard move flow",
    status: "todo",
    assignee: "Linus",
  },
  {
    id: "task-4",
    title: "Project card templates",
    status: "doing",
    assignee: "Ada",
  },
  {
    id: "task-5",
    title: "Enforce WIP limits",
    status: "doing",
    assignee: "Grace",
  },
  {
    id: "task-6",
    title: "Screen reader announcements",
    status: "review",
    assignee: "Linus",
  },
  {
    id: "task-7",
    title: "Phase 2 bundle isolation",
    status: "done",
    assignee: "Ada",
  },
];

const DEFAULT_HELP =
  "Press Space to pick up a card, use the arrow keys to move it, press Enter to select or drop, press Enter again to edit, press E to edit, and Escape to cancel or clear the selection.";

function makeConfig(
  columns: readonly KanbanColumnConfig[] = COLUMNS
): KanbanConfig<Task> {
  return {
    id: (task) => task.id,
    title: (task) => task.title,
    status: (task) => task.status,
    columns,
  };
}

type BoardProps = KanbanBoardProps<Task>;

function renderBoard(
  props: Partial<BoardProps> = {},
  items: readonly Task[] = TASKS
): ReturnType<typeof render> {
  return render(
    <KanbanBoard<Task> items={items} config={makeConfig()} {...props} />
  );
}

function card(container: HTMLElement, taskId: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    `[data-kanban-task-id="${taskId}"]`
  );
  if (!element) {
    throw new Error(`No card rendered for ${taskId}`);
  }
  return element;
}

function cardIds(container: HTMLElement, columnId: string): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      `[data-column-id="${columnId}"] [data-kanban-task-id]`
    )
  ).map((element) => element.dataset.kanbanTaskId as string);
}

function column(container: HTMLElement, columnId: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    `[data-column-id="${columnId}"]`
  );
  if (!element) {
    throw new Error(`No column rendered for ${columnId}`);
  }
  return element;
}

function live(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>(".dcf-kanban__live");
  if (!element) {
    throw new Error("No live region rendered");
  }
  return element;
}

function helpText(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>(".dcf-kanban__help");
  if (!element) {
    throw new Error("No keyboard help rendered");
  }
  return element;
}

function countText(container: HTMLElement, columnId: string): string {
  return (
    column(container, columnId)
      .querySelector(".dcf-kanban-column__count")
      ?.textContent?.replace(/\s+/g, " ")
      .trim() ?? ""
  );
}

function press(
  element: HTMLElement,
  key: string,
  options: { code?: string } = {}
): void {
  fireEvent.keyDown(element, {
    key,
    code: options.code ?? key,
    bubbles: true,
    cancelable: true,
  });
}

function space(element: HTMLElement): void {
  press(element, " ", { code: "Space" });
}

function activeTaskId(): string | null {
  const active = document.activeElement as HTMLElement | null;
  return active?.dataset?.kanbanTaskId ?? null;
}

function hasClass(element: Element | null, className: string): boolean {
  return !!element?.classList.contains(className);
}

describe("KanbanBoard — defaults and structure", () => {
  it("renders the default region, generated instance id and four columns", () => {
    const { container } = renderBoard();

    const board = container.querySelector<HTMLElement>(".dcf-kanban");
    expect(board).not.toBeNull();
    expect(board?.getAttribute("role")).toBe("region");
    expect(board?.getAttribute("aria-label")).toBe("Kanban board");

    const host = container.querySelector<HTMLElement>(".dcf-kanban-host");
    const instanceId = host?.dataset.kanbanInstance;
    expect(instanceId).toMatch(/^decaf-kanban-\d+$/);
    expect(container.querySelectorAll(".dcf-kanban-column")).toHaveLength(4);
    expect(
      Array.from(container.querySelectorAll("[data-column-id]")).map(
        (element) => element.getAttribute("data-column-id")
      )
    ).toEqual(["todo", "doing", "review", "done"]);
    expect(container.querySelectorAll("[data-kanban-task-id]")).toHaveLength(7);
  });

  it("wires the keyboard help through aria-describedby", () => {
    const { container } = renderBoard();

    const instanceId = container.querySelector<HTMLElement>(".dcf-kanban-host")
      ?.dataset.kanbanInstance as string;
    const help = helpText(container);
    expect(help.id).toBe(`${instanceId}-keyboard-help`);
    expect(help.textContent).toBe(DEFAULT_HELP);

    for (const element of Array.from(
      container.querySelectorAll<HTMLElement>("[data-kanban-task-id]")
    )) {
      expect(element.getAttribute("aria-describedby")).toBe(help.id);
    }
  });

  it("renders cards as listitems with accessible names and grab state", () => {
    const { container } = renderBoard();
    const first = card(container, "task-1");

    expect(first.getAttribute("role")).toBe("listitem");
    expect(first.getAttribute("aria-label")).toBe(
      "Draft Kanban API contract, To do, position 1 of 3"
    );
    expect(first.getAttribute("aria-grabbed")).toBe("false");
    expect(first.hasAttribute("aria-current")).toBe(false);
    expect(first.getAttribute("tabindex")).toBe("0");
    expect(first.querySelectorAll(".dcf-kanban-card__handle")).toHaveLength(1);

    const last = card(container, "task-7");
    expect(last.getAttribute("aria-label")).toBe(
      "Phase 2 bundle isolation, Done, position 1 of 1"
    );
  });

  it("marks the controlled selection with aria-current and the selected class", () => {
    const { container } = renderBoard({ selectedId: "task-4" });
    const selected = card(container, "task-4");

    expect(selected.getAttribute("aria-current")).toBe("true");
    expect(selected.getAttribute("aria-label")).toBe(
      "Project card templates, In progress, position 1 of 2, selected"
    );
    expect(hasClass(selected, "dcf-kanban-card--selected")).toBe(true);
    expect(container.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
  });

  it("labels every populated column as a list named by its heading", () => {
    const { container } = renderBoard();
    const todo = column(container, "todo");
    const dropzone = todo.querySelector<HTMLElement>(
      ".dcf-kanban-column__dropzone"
    );

    expect(dropzone?.getAttribute("role")).toBe("list");
    const heading = todo.querySelector<HTMLElement>(
      ".dcf-kanban-column__title"
    );
    expect(heading?.textContent).toBe("To do");
    expect(dropzone?.getAttribute("aria-labelledby")).toBe(heading?.id);
    expect(todo.getAttribute("role")).toBe("group");
  });
});

describe("KanbanBoard — host-controlled states", () => {
  it("renders empty messages per column when there are no items", () => {
    const { container } = renderBoard({}, []);

    expect(container.querySelectorAll(".dcf-kanban-column")).toHaveLength(4);
    expect(container.querySelectorAll("[data-kanban-task-id]")).toHaveLength(0);
    const empty = Array.from(
      container.querySelectorAll<HTMLElement>(".dcf-kanban-column__empty")
    );
    expect(empty).toHaveLength(4);
    for (const element of empty) {
      expect(element.textContent).toBe("No tasks");
    }
    for (const columnId of ["todo", "doing", "review", "done"]) {
      expect(countText(container, columnId)).toBe(
        columnId === "todo" || columnId === "doing"
          ? columnId === "todo"
            ? "0 / 4"
            : "0 / 2"
          : "0"
      );
      const dropzone = column(container, columnId).querySelector(
        ".dcf-kanban-column__dropzone"
      );
      expect(dropzone?.getAttribute("role")).toBe("group");
    }
  });

  it("renders a custom empty message", () => {
    const { container } = renderBoard({ emptyMessage: "Nothing here" }, []);

    expect(
      container.querySelector(".dcf-kanban-column__empty")?.textContent
    ).toBe("Nothing here");
  });

  it("renders the loading status instead of the board", () => {
    const { container } = renderBoard({ loading: true });

    const status = container.querySelector<HTMLElement>(
      ".dcf-kanban__state--loading"
    );
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(status?.textContent).toContain("Loading tasks...");
    expect(container.querySelector(".dcf-kanban__spinner")).not.toBeNull();
    expect(container.querySelector(".dcf-kanban__board")).toBeNull();
    expect(
      container.querySelector(".dcf-kanban")?.getAttribute("aria-busy")
    ).toBe("true");
  });

  it("renders the error alert and calls onRetryRequested", () => {
    const onRetryRequested = jest.fn();
    const { container } = renderBoard({
      error: "The board could not be loaded.",
      onRetryRequested,
      retryLabel: "Try again",
    });

    const alert = container.querySelector<HTMLElement>('[role="alert"]');
    expect(alert?.textContent).toContain("The board could not be loaded.");
    expect(container.querySelector(".dcf-kanban__board")).toBeNull();
    const retry = alert?.querySelector<HTMLButtonElement>(".dcf-kanban__retry");
    expect(retry?.textContent).toBe("Try again");
    fireEvent.click(retry as HTMLButtonElement);
    expect(onRetryRequested).toHaveBeenCalledTimes(1);
  });

  it("renders a board-level empty state for a zero-column config", () => {
    const { container } = render(
      <KanbanBoard<Task>
        items={TASKS}
        config={makeConfig([])}
        label="Empty board"
      />
    );
    const board = container.querySelector<HTMLElement>(".dcf-kanban__board");

    expect(container.querySelectorAll(".dcf-kanban-column")).toHaveLength(0);
    expect(board?.getAttribute("role")).toBe("group");
    expect(board?.getAttribute("tabindex")).toBe("0");
    expect(board?.getAttribute("aria-label")).toBe("Empty board");
    expect(
      container.querySelector(".dcf-kanban__state--empty")?.textContent
    ).toBe("No tasks");
  });

  it("makes a read-only board static while keeping selection available", () => {
    const onTaskSelected = jest.fn<void, [KanbanSelectionEvent<Task>]>();
    const { container } = renderBoard({ readOnly: true, onTaskSelected });

    expect(container.querySelector(".dcf-kanban__handle")).toBeNull();
    expect(container.querySelectorAll(".dcf-kanban-card__handle")).toHaveLength(
      0
    );
    expect(
      hasClass(container.querySelector(".dcf-kanban"), "dcf-kanban--readonly")
    ).toBe(true);
    for (const columnId of ["todo", "doing", "review", "done"]) {
      expect(
        hasClass(column(container, columnId), "dcf-kanban-column--readonly")
      ).toBe(true);
    }
    const first = card(container, "task-1");
    expect(hasClass(first, "dcf-kanban-card--readonly")).toBe(true);
    expect(first.getAttribute("tabindex")).toBe("0");

    fireEvent.click(first);
    expect(onTaskSelected).toHaveBeenCalledWith({
      task: TASKS[0],
      column: "todo",
    });
  });

  it("removes handles and tab order and suppresses selection when disabled", () => {
    const onTaskSelected = jest.fn<void, [KanbanSelectionEvent<Task>]>();
    const onTaskEditRequested = jest.fn<void, [KanbanSelectionEvent<Task>]>();
    const { container } = renderBoard({
      disabled: true,
      onTaskSelected,
      onTaskEditRequested,
    });
    const first = card(container, "task-1");

    expect(container.querySelectorAll(".dcf-kanban-card__handle")).toHaveLength(
      0
    );
    expect(first.hasAttribute("tabindex")).toBe(false);
    expect(hasClass(first, "dcf-kanban-card--disabled")).toBe(true);
    expect(
      hasClass(container.querySelector(".dcf-kanban"), "dcf-kanban--disabled")
    ).toBe(true);

    fireEvent.click(first);
    fireEvent.doubleClick(first);
    press(first, "Enter");
    press(first, "e");
    expect(onTaskSelected).not.toHaveBeenCalled();
    expect(onTaskEditRequested).not.toHaveBeenCalled();
  });

  it("hides drag handles when showDragHandles is false", () => {
    const { container } = renderBoard({ showDragHandles: false });

    expect(container.querySelectorAll(".dcf-kanban-card__handle")).toHaveLength(
      0
    );
    expect(container.querySelectorAll("[data-kanban-task-id]")).toHaveLength(7);
  });

  it("renders a custom loading message in the loading status", () => {
    const { container } = renderBoard({
      loading: true,
      loadingMessage: "Fetching the sprint...",
    });

    const status = container.querySelector<HTMLElement>(
      ".dcf-kanban__state--loading"
    );
    expect(status?.textContent).toContain("Fetching the sprint...");
    expect(status?.textContent).not.toContain("Loading tasks...");
  });

  it("renders a custom keyboard help and targets it with aria-describedby", () => {
    const { container } = renderBoard({
      keyboardHelp: "Space picks up. Enter drops. Escape cancels.",
    });
    const help = helpText(container);
    const instanceId = container.querySelector<HTMLElement>(".dcf-kanban-host")
      ?.dataset.kanbanInstance as string;

    expect(help.textContent).toBe(
      "Space picks up. Enter drops. Escape cancels."
    );
    expect(help.id).toBe(`${instanceId}-keyboard-help`);
    for (const element of Array.from(
      container.querySelectorAll<HTMLElement>("[data-kanban-task-id]")
    )) {
      expect(element.getAttribute("aria-describedby")).toBe(help.id);
    }
  });

  it("merges a custom className onto the kanban host", () => {
    const { container } = renderBoard({ className: "sprint-board" });
    const host = container.querySelector<HTMLElement>(".dcf-kanban-host");

    expect(host?.className).toBe("dcf-kanban-host sprint-board");
    expect(hasClass(host, "dcf-kanban-host")).toBe(true);
    expect(hasClass(host, "sprint-board")).toBe(true);
  });
});

describe("KanbanBoard — selection and edit emission", () => {
  it("emits onTaskSelected with the task and column on click", () => {
    const onTaskSelected = jest.fn<void, [KanbanSelectionEvent<Task>]>();
    const { container } = renderBoard({ onTaskSelected });

    fireEvent.click(card(container, "task-4"));

    expect(onTaskSelected).toHaveBeenCalledTimes(1);
    expect(onTaskSelected).toHaveBeenCalledWith({
      task: TASKS[3],
      column: "doing",
    });
  });

  it("emits onTaskEditRequested on double click", () => {
    const onTaskEditRequested = jest.fn<void, [KanbanSelectionEvent<Task>]>();
    const { container } = renderBoard({ onTaskEditRequested });

    fireEvent.doubleClick(card(container, "task-2"));

    expect(onTaskEditRequested).toHaveBeenCalledWith({
      task: TASKS[1],
      column: "todo",
    });
  });

  it("suppresses edit on a read-only board", () => {
    const onTaskEditRequested = jest.fn<void, [KanbanSelectionEvent<Task>]>();
    const { container } = renderBoard({ readOnly: true, onTaskEditRequested });
    const first = card(container, "task-1");

    fireEvent.doubleClick(first);
    press(first, "e");
    press(first, "F2");

    expect(onTaskEditRequested).not.toHaveBeenCalled();
  });

  it("emits edit for E and F2 on an editable board", () => {
    const onTaskEditRequested = jest.fn<void, [KanbanSelectionEvent<Task>]>();
    const { container } = renderBoard({ onTaskEditRequested });

    press(card(container, "task-2"), "e");
    press(card(container, "task-2"), "F2");

    expect(onTaskEditRequested).toHaveBeenCalledTimes(2);
    expect(onTaskEditRequested).toHaveBeenNthCalledWith(1, {
      task: TASKS[1],
      column: "todo",
    });
    expect(onTaskEditRequested).toHaveBeenNthCalledWith(2, {
      task: TASKS[1],
      column: "todo",
    });
  });
});

describe("KanbanBoard — filtering, counters and WIP state", () => {
  it("hides non-matching cards but keeps every column and updates counters", () => {
    const { container } = renderBoard({
      filter: (task) => task.assignee === "Ada",
    });

    expect(container.querySelectorAll(".dcf-kanban-column")).toHaveLength(4);
    expect(container.querySelectorAll("[data-kanban-task-id]")).toHaveLength(3);
    expect(cardIds(container, "todo")).toEqual(["task-1"]);
    expect(cardIds(container, "doing")).toEqual(["task-4"]);
    expect(cardIds(container, "review")).toEqual([]);
    expect(cardIds(container, "done")).toEqual(["task-7"]);
    expect(countText(container, "todo")).toBe("1 / 4");
    expect(countText(container, "doing")).toBe("1 / 2");
    expect(countText(container, "review")).toBe("0");
    expect(countText(container, "done")).toBe("1");
    expect(
      container.querySelector('[data-kanban-task-id="task-2"]')
    ).toBeNull();
  });

  it("renders an existing over-limit column with 3 / 2 and over-limit classes", () => {
    const items = TASKS.map((task) =>
      task.id === "task-1" ? { ...task, status: "doing" } : task
    );
    const { container } = renderBoard({}, items);
    const doing = column(container, "doing");

    expect(hasClass(doing, "dcf-kanban-column--over-limit")).toBe(true);
    expect(
      hasClass(
        doing.querySelector(".dcf-kanban-column__dropzone"),
        "dcf-kanban-column__dropzone--over-limit"
      )
    ).toBe(true);
    expect(countText(container, "doing")).toBe("3 / 2");
    expect(cardIds(container, "doing")).toEqual(["task-1", "task-4", "task-5"]);
  });

  it("rejects a keyboard move into a full WIP column without moving the card", () => {
    const onTaskMoved = jest.fn<void, [TaskMoveEvent<Task>]>();
    const onTaskReordered = jest.fn<void, [TaskReorderEvent<Task>]>();
    const onTaskMoveRejected = jest.fn<void, [TaskMoveRejectedEvent<Task>]>();
    const { container } = renderBoard({
      onTaskMoved,
      onTaskReordered,
      onTaskMoveRejected,
    });

    space(card(container, "task-1"));
    press(card(container, "task-1"), "ArrowRight");

    expect(onTaskMoveRejected).toHaveBeenCalledTimes(1);
    expect(onTaskMoveRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        task: TASKS[0],
        fromColumn: "todo",
        toColumn: "doing",
        reason: "wip-limit",
        wipLimit: 2,
      })
    );
    expect(onTaskMoved).not.toHaveBeenCalled();
    expect(onTaskReordered).not.toHaveBeenCalled();
    expect(cardIds(container, "todo")).toEqual(["task-1", "task-2", "task-3"]);
    expect(cardIds(container, "doing")).toEqual(["task-4", "task-5"]);
    expect(live(container).textContent).toBe(
      "Cannot move Draft Kanban API contract to In progress: the work-in-progress limit of 2 is reached."
    );
  });

  it("keeps every card visible when the filter matches nothing", () => {
    const { container } = renderBoard({ filter: () => false });

    expect(container.querySelectorAll(".dcf-kanban-column")).toHaveLength(4);
    expect(container.querySelectorAll("[data-kanban-task-id]")).toHaveLength(0);
    expect(
      container.querySelectorAll(".dcf-kanban-column__empty")
    ).toHaveLength(4);
  });
});

describe("KanbanBoard — render props", () => {
  it("passes the identical card context to renderCard", () => {
    const renderCard = jest.fn((context: KanbanCardTemplateContext<Task>) => (
      <span>{context.task.title}</span>
    ));
    const { container } = renderBoard({
      renderCard,
      selectedId: "task-4",
    });

    expect(renderCard).toHaveBeenCalledTimes(7);
    const first = renderCard.mock.calls.find(
      ([context]) => context.task.id === "task-1"
    )?.[0];
    expect(first).toEqual({
      $implicit: TASKS[0],
      task: TASKS[0],
      column: COLUMNS[0],
      index: 0,
      selected: false,
      readOnly: false,
    });
    const selected = renderCard.mock.calls.find(
      ([context]) => context.task.id === "task-4"
    )?.[0];
    expect(selected).toEqual({
      $implicit: TASKS[3],
      task: TASKS[3],
      column: COLUMNS[1],
      index: 0,
      selected: true,
      readOnly: false,
    });
    expect(
      container.querySelector('[data-kanban-task-id="task-1"]')?.textContent
    ).toContain("Draft Kanban API contract");
  });

  it("passes readOnly through the card context", () => {
    const renderCard = jest.fn((context: KanbanCardTemplateContext<Task>) => (
      <span>{context.task.id}</span>
    ));
    renderBoard({ renderCard, readOnly: true });

    for (const [context] of renderCard.mock.calls) {
      expect(context.readOnly).toBe(true);
    }
  });

  it("passes the column header context with count and WIP limit", () => {
    const renderColumnHeader = jest.fn(
      (context: KanbanColumnHeaderTemplateContext) => (
        <span>
          {context.column.title}:{context.count}
        </span>
      )
    );
    renderBoard({ renderColumnHeader });

    expect(renderColumnHeader).toHaveBeenCalledTimes(4);
    const contexts = renderColumnHeader.mock.calls.map(([context]) => context);
    expect(contexts[0]).toEqual({
      $implicit: COLUMNS[0],
      column: COLUMNS[0],
      count: 3,
      wipLimit: 4,
      readOnly: false,
    });
    expect(contexts[1]).toEqual({
      $implicit: COLUMNS[1],
      column: COLUMNS[1],
      count: 2,
      wipLimit: 2,
      readOnly: false,
    });
    expect(contexts[2]).toEqual({
      $implicit: COLUMNS[2],
      column: COLUMNS[2],
      count: 1,
      wipLimit: undefined,
      readOnly: false,
    });
    expect(contexts[3]).toEqual({
      $implicit: COLUMNS[3],
      column: COLUMNS[3],
      count: 1,
      wipLimit: undefined,
      readOnly: false,
    });
  });

  it("reports readOnly through the column header context", () => {
    const renderColumnHeader = jest.fn(
      (context: KanbanColumnHeaderTemplateContext) => (
        <span>{context.column.title}</span>
      )
    );
    renderBoard({ renderColumnHeader, disabled: true });

    for (const [context] of renderColumnHeader.mock.calls) {
      expect(context.readOnly).toBe(true);
    }
  });

  it("calls renderEmpty per empty column with the column context", () => {
    const renderEmpty = jest.fn((context: KanbanEmptyTemplateContext) => (
      <p>empty {context.column?.id}</p>
    ));
    renderBoard({ renderEmpty }, []);

    expect(renderEmpty).toHaveBeenCalledTimes(4);
    const contexts = renderEmpty.mock.calls.map(([context]) => context);
    contexts.forEach((context, index) => {
      expect(context).toEqual({
        $implicit: COLUMNS[index],
        column: COLUMNS[index],
        count: 0,
        board: false,
      });
    });
    expect(document.querySelectorAll(".dcf-kanban-column__empty")).toHaveLength(
      0
    );
  });

  it("calls renderEmpty once for a board with no columns", () => {
    const renderEmpty = jest.fn((context: KanbanEmptyTemplateContext) => (
      <p>board: {String(context.board)}</p>
    ));
    render(
      <KanbanBoard<Task>
        items={TASKS}
        config={makeConfig([])}
        renderEmpty={renderEmpty}
      />
    );

    expect(renderEmpty).toHaveBeenCalledTimes(1);
    expect(renderEmpty.mock.calls[0][0]).toEqual({
      $implicit: null,
      column: null,
      count: 0,
      board: true,
    });
  });
});

describe("KanbanBoard — keyboard state machine", () => {
  it("Space picks a card up and announces it in the live region", () => {
    const { container } = renderBoard();
    space(card(container, "task-1"));

    const grabbed = card(container, "task-1");
    expect(grabbed.getAttribute("aria-grabbed")).toBe("true");
    expect(hasClass(grabbed, "dcf-kanban-card--grabbed")).toBe(true);
    expect(live(container).textContent).toBe(
      "Draft Kanban API contract picked up in To do. Use the arrow keys to move, Enter to drop, Escape to cancel."
    );
    expect(live(container).getAttribute("role")).toBe("status");
    expect(live(container).getAttribute("aria-live")).toBe("polite");
    expect(live(container).getAttribute("aria-atomic")).toBe("true");
    expect(hasClass(live(container), "dcf-kanban__sr-only")).toBe(true);
  });

  it("ArrowDown/ArrowUp preview the position without committing", () => {
    const { container } = renderBoard();
    space(card(container, "task-1"));

    press(card(container, "task-1"), "ArrowDown");
    expect(cardIds(container, "todo")).toEqual(["task-2", "task-1", "task-3"]);
    expect(live(container).textContent).toBe(
      "Draft Kanban API contract: To do, position 2."
    );
    expect(card(container, "task-1").getAttribute("aria-label")).toBe(
      "Draft Kanban API contract, To do, position 2 of 3"
    );

    press(card(container, "task-1"), "ArrowUp");
    expect(cardIds(container, "todo")).toEqual(["task-1", "task-2", "task-3"]);
    expect(live(container).textContent).toBe(
      "Draft Kanban API contract: To do, position 1."
    );
  });

  it("Enter while grabbed commits a same-column reorder and announces the move", () => {
    const onTaskReordered = jest.fn<void, [TaskReorderEvent<Task>]>();
    const onTaskMoved = jest.fn<void, [TaskMoveEvent<Task>]>();
    const { container } = renderBoard({ onTaskReordered, onTaskMoved });

    space(card(container, "task-1"));
    press(card(container, "task-1"), "ArrowDown");
    press(card(container, "task-1"), "Enter");

    expect(onTaskReordered).toHaveBeenCalledWith({
      task: TASKS[0],
      column: "todo",
      previousIndex: 0,
      currentIndex: 1,
    });
    expect(onTaskMoved).not.toHaveBeenCalled();
    expect(live(container).textContent).toBe(
      "Draft Kanban API contract moved to To do, position 2."
    );
    expect(card(container, "task-1").getAttribute("aria-grabbed")).toBe(
      "false"
    );
  });

  it("ArrowRight previews a cross-column move and moves the card between lists", () => {
    const { container } = renderBoard();
    space(card(container, "task-4"));

    press(card(container, "task-4"), "ArrowRight");

    expect(cardIds(container, "doing")).toEqual(["task-5"]);
    expect(cardIds(container, "review")).toEqual(["task-4", "task-6"]);
    expect(live(container).textContent).toBe(
      "Project card templates: Review, position 1."
    );
    expect(card(container, "task-4").getAttribute("aria-grabbed")).toBe("true");
  });

  it("Enter commits a cross-column move into an empty column", () => {
    const onTaskMoved = jest.fn<void, [TaskMoveEvent<Task>]>();
    const onTaskReordered = jest.fn<void, [TaskReorderEvent<Task>]>();
    const columns: readonly KanbanColumnConfig[] = [
      { id: "todo", title: "To do" },
      { id: "review", title: "Review" },
    ];
    const items = [TASKS[0], TASKS[1]];
    const { container } = render(
      <KanbanBoard<Task>
        items={items}
        config={makeConfig(columns)}
        onTaskMoved={onTaskMoved}
        onTaskReordered={onTaskReordered}
      />
    );

    space(card(container, "task-1"));
    press(card(container, "task-1"), "ArrowRight");
    press(card(container, "task-1"), "Enter");

    expect(onTaskMoved).toHaveBeenCalledWith({
      task: TASKS[0],
      fromColumn: "todo",
      toColumn: "review",
      previousIndex: 0,
      currentIndex: 0,
    });
    expect(onTaskReordered).not.toHaveBeenCalled();
    expect(live(container).textContent).toBe(
      "Draft Kanban API contract moved to Review, position 1."
    );
    // The board is controlled: only the host re-renders the moved items.
    expect(cardIds(container, "todo")).toEqual(["task-1", "task-2"]);
    expect(cardIds(container, "review")).toEqual([]);
  });

  it("commits a cross-column move at the previewed index", () => {
    const onTaskMoved = jest.fn<void, [TaskMoveEvent<Task>]>();
    const { container } = renderBoard({ onTaskMoved });

    space(card(container, "task-4"));
    press(card(container, "task-4"), "ArrowRight");
    press(card(container, "task-4"), "Enter");

    expect(onTaskMoved).toHaveBeenCalledWith(
      expect.objectContaining({
        task: TASKS[3],
        fromColumn: "doing",
        toColumn: "review",
        previousIndex: 0,
        currentIndex: 0,
      })
    );
  });

  it("rejects a WIP-aware cross-column preview and announces the limit", () => {
    const onTaskMoveRejected = jest.fn<void, [TaskMoveRejectedEvent<Task>]>();
    const { container } = renderBoard({ onTaskMoveRejected });

    space(card(container, "task-1"));
    press(card(container, "task-1"), "ArrowRight");

    expect(onTaskMoveRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        task: TASKS[0],
        fromColumn: "todo",
        toColumn: "doing",
        reason: "wip-limit",
        wipLimit: 2,
      })
    );
    expect(live(container).textContent).toBe(
      "Cannot move Draft Kanban API contract to In progress: the work-in-progress limit of 2 is reached."
    );
    // The preview stays on the source column.
    expect(cardIds(container, "todo")).toEqual(["task-1", "task-2", "task-3"]);
    expect(card(container, "task-1").getAttribute("aria-grabbed")).toBe("true");
  });

  it("Escape cancels a preview with the cancelled reason", () => {
    const onTaskMoveRejected = jest.fn<void, [TaskMoveRejectedEvent<Task>]>();
    const onTaskMoved = jest.fn<void, [TaskMoveEvent<Task>]>();
    const onTaskReordered = jest.fn<void, [TaskReorderEvent<Task>]>();
    const { container } = renderBoard({
      onTaskMoveRejected,
      onTaskMoved,
      onTaskReordered,
    });

    space(card(container, "task-1"));
    press(card(container, "task-1"), "ArrowDown");
    press(card(container, "task-1"), "Escape");

    expect(onTaskMoveRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        task: TASKS[0],
        fromColumn: "todo",
        toColumn: "todo",
        reason: "cancelled",
      })
    );
    expect(onTaskMoved).not.toHaveBeenCalled();
    expect(onTaskReordered).not.toHaveBeenCalled();
    expect(live(container).textContent).toBe(
      "Move cancelled. Draft Kanban API contract was not moved."
    );
    expect(card(container, "task-1").getAttribute("aria-grabbed")).toBe(
      "false"
    );
    expect(cardIds(container, "todo")).toEqual(["task-1", "task-2", "task-3"]);
  });

  it("first Enter selects, second Enter requests edit", () => {
    const onTaskSelected = jest.fn<void, [KanbanSelectionEvent<Task>]>();
    const onTaskEditRequested = jest.fn<void, [KanbanSelectionEvent<Task>]>();
    const { container } = renderBoard({
      onTaskSelected,
      onTaskEditRequested,
    });

    press(card(container, "task-2"), "Enter");
    expect(onTaskSelected).toHaveBeenCalledWith({
      task: TASKS[1],
      column: "todo",
    });
    expect(onTaskEditRequested).not.toHaveBeenCalled();

    press(card(container, "task-2"), "Enter");
    expect(onTaskEditRequested).toHaveBeenCalledWith({
      task: TASKS[1],
      column: "todo",
    });
    expect(onTaskSelected).toHaveBeenCalledTimes(1);
  });

  it("Escape clears a keyboard selection and calls onSelectionCleared", () => {
    const onSelectionCleared = jest.fn();
    const { container } = renderBoard({ onSelectionCleared });

    press(card(container, "task-1"), "Escape");

    expect(onSelectionCleared).toHaveBeenCalledTimes(1);
  });

  it("moves focus between cards and across columns with arrow keys", () => {
    const { container } = renderBoard();
    const first = card(container, "task-1");
    first.focus();
    expect(activeTaskId()).toBe("task-1");

    press(first, "ArrowDown");
    expect(activeTaskId()).toBe("task-2");

    press(card(container, "task-2"), "ArrowUp");
    expect(activeTaskId()).toBe("task-1");

    press(card(container, "task-1"), "ArrowRight");
    expect(activeTaskId()).toBe("task-4");

    press(card(container, "task-4"), "ArrowRight");
    expect(activeTaskId()).toBe("task-6");

    press(card(container, "task-6"), "ArrowLeft");
    expect(activeTaskId()).toBe("task-4");
    press(card(container, "task-4"), "ArrowLeft");
    expect(activeTaskId()).toBe("task-1");
  });

  it("announces an empty column instead of moving focus into it", () => {
    const columns: readonly KanbanColumnConfig[] = [
      { id: "todo", title: "To do" },
      { id: "review", title: "Review" },
    ];
    const { container } = render(
      <KanbanBoard<Task> items={[TASKS[0]]} config={makeConfig(columns)} />
    );
    const first = card(container, "task-1");
    first.focus();

    press(first, "ArrowRight");

    expect(live(container).textContent).toBe("Review is empty.");
    expect(activeTaskId()).toBe("task-1");
  });

  it("rejects pickup on a disabled board", () => {
    const onTaskMoveRejected = jest.fn<void, [TaskMoveRejectedEvent<Task>]>();
    const { container } = renderBoard({
      disabled: true,
      onTaskMoveRejected,
    });

    space(card(container, "task-1"));

    expect(onTaskMoveRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        task: TASKS[0],
        fromColumn: "todo",
        toColumn: "todo",
        reason: "disabled",
      })
    );
    expect(live(container).textContent).toBe(
      "Cannot move Draft Kanban API contract: the board is disabled."
    );
  });

  it("rejects pickup on a read-only board", () => {
    const onTaskMoveRejected = jest.fn<void, [TaskMoveRejectedEvent<Task>]>();
    const { container } = renderBoard({
      readOnly: true,
      onTaskMoveRejected,
    });

    space(card(container, "task-1"));

    expect(onTaskMoveRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        task: TASKS[0],
        fromColumn: "todo",
        toColumn: "todo",
        reason: "readonly",
      })
    );
    expect(live(container).textContent).toBe(
      "Cannot move Draft Kanban API contract: the board is read-only."
    );
  });

  it("exposes the generated droppable ids on the column dropzones", () => {
    const { container } = renderBoard({ instanceId: "board" });
    const todo = column(container, "todo").querySelector(
      ".dcf-kanban-column__dropzone"
    );

    expect(todo).not.toBeNull();
    expect(kanbanColumnDroppableId("board", "todo")).toBe("board-todo-drop");
    expect(
      container.querySelector('[data-kanban-instance="board"]')
    ).not.toBeNull();
    expect(
      container.querySelectorAll(".dcf-kanban-column__dropzone")
    ).toHaveLength(4);
  });
});

describe("KanbanBoard — emitted rejection reasons", () => {
  it("rejects a same-position keyboard commit with the unchanged reason", () => {
    const onTaskMoveRejected = jest.fn<void, [TaskMoveRejectedEvent<Task>]>();
    const onTaskMoved = jest.fn<void, [TaskMoveEvent<Task>]>();
    const onTaskReordered = jest.fn<void, [TaskReorderEvent<Task>]>();
    const { container } = renderBoard({
      onTaskMoveRejected,
      onTaskMoved,
      onTaskReordered,
    });

    space(card(container, "task-1"));
    press(card(container, "task-1"), "Enter");

    expect(onTaskMoveRejected).toHaveBeenCalledTimes(1);
    expect(onTaskMoveRejected).toHaveBeenCalledWith({
      task: TASKS[0],
      fromColumn: "todo",
      toColumn: "todo",
      previousIndex: 0,
      currentIndex: 0,
      reason: "unchanged",
    });
    expect(onTaskMoved).not.toHaveBeenCalled();
    expect(onTaskReordered).not.toHaveBeenCalled();
    expect(live(container).textContent).toBe(
      "Draft Kanban API contract was not moved."
    );
    expect(card(container, "task-1").getAttribute("aria-grabbed")).toBe(
      "false"
    );
    expect(cardIds(container, "todo")).toEqual(["task-1", "task-2", "task-3"]);
  });

  it("rejects a stale preview index with the invalid-index reason", () => {
    const onTaskMoveRejected = jest.fn<void, [TaskMoveRejectedEvent<Task>]>();
    const { container, rerender } = renderBoard({ onTaskMoveRejected });

    space(card(container, "task-3"));
    rerender(
      <KanbanBoard<Task>
        items={TASKS}
        config={makeConfig()}
        filter={(task) => task.id === "task-3"}
        onTaskMoveRejected={onTaskMoveRejected}
      />
    );
    press(card(container, "task-3"), "Enter");

    expect(onTaskMoveRejected).toHaveBeenCalledTimes(1);
    expect(onTaskMoveRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        task: TASKS[2],
        fromColumn: "todo",
        toColumn: "todo",
        reason: "invalid-index",
      })
    );
    expect(live(container).textContent).toBe(
      "Cannot move Document keyboard move flow: invalid drop position."
    );
    expect(card(container, "task-3").getAttribute("aria-grabbed")).toBe(
      "false"
    );
  });
});
