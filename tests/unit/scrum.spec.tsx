/**
 * @module for-react/scrum.spec
 * @summary SAA-2042 — component contract for the React `/scrum` port
 * (SAA-2033 / DECAF-895), mirroring the Angular `scrum.stories`/functional
 * contract.
 * @description Proves the three controlled compositions against the source
 * entry point:
 *
 * - `SprintSelector`: controlled reset, generated ids, `aria-busy`, status
 *   live region and `aria-describedby` wiring;
 * - `Backlog`: backlog-only scoping, the single backlog column, per-card
 *   assignment rejection ordering (including the DOM-reachable rung precedence
 *   pairs closed under SAA-2050), successful assignment emission without task
 *   mutation, disabled selects, assignment-select event isolation, reorder
 *   events and render-prop passthrough;
 * - `SprintBoard`: sprint scoping, `sprintId` stamping on every kanban event,
 *   passthrough of selection-clear/retry and default vs custom card bodies.
 */
import React from "react";
import { fireEvent, render } from "@testing-library/react";
import {
  Backlog,
  SprintBoard,
  SprintSelector,
  SCRUM_BACKLOG_COLUMN_ID,
  type BacklogProps,
  type ScrumConfig,
  type ScrumSprint,
  type SprintBoardProps,
} from "../../src/scrum";
import type {
  KanbanCardTemplateContext,
  KanbanColumnConfig,
  KanbanSelectionEvent,
} from "../../src/kanban";

interface Task {
  id: string;
  title: string;
  status: string;
  sprintId?: string | null;
}

const SPRINTS: readonly ScrumSprint[] = [
  { id: "s1", title: "Sprint 1" },
  { id: "s2", title: "Sprint 2" },
];

const COLUMNS: readonly KanbanColumnConfig[] = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "In progress" },
  { id: "done", title: "Done" },
];

const CONFIG: ScrumConfig<Task> = {
  id: (task) => task.id,
  title: (task) => task.title,
  status: (task) => task.status,
  sprint: (task) => task.sprintId,
  columns: COLUMNS,
};

const MIXED: readonly Task[] = [
  { id: "b1", title: "Null sprint", status: "todo", sprintId: null },
  { id: "b2", title: "Undefined sprint", status: "todo" },
  { id: "b3", title: "Empty sprint", status: "todo", sprintId: "" },
  { id: "s1-a", title: "Sprint one A", status: "todo", sprintId: "s1" },
  { id: "s1-b", title: "Sprint one B", status: "doing", sprintId: "s1" },
  { id: "s2-a", title: "Sprint two A", status: "todo", sprintId: "s2" },
];

function cardIds(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>("[data-kanban-task-id]")
  ).map((element) => element.dataset.kanbanTaskId as string);
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

function press(element: HTMLElement, key: string, code = key): void {
  fireEvent.keyDown(element, { key, code, bubbles: true, cancelable: true });
}

function space(element: HTMLElement): void {
  press(element, " ", "Space");
}

function selectFor(container: HTMLElement, taskId: string): HTMLSelectElement {
  const element = container.querySelector<HTMLSelectElement>(
    `select[data-scrum-assign-task-id="${taskId}"]`
  );
  if (!element) {
    throw new Error(`No assignment select for ${taskId}`);
  }
  return element;
}

function change(select: HTMLSelectElement, value: string): void {
  fireEvent.change(select, { target: { value } });
}

type BacklogPropsShape = BacklogProps<Task>;

function renderBacklog(
  props: Partial<BacklogPropsShape> = {},
  items: readonly Task[] = MIXED
): ReturnType<typeof render> {
  return render(
    <Backlog<Task>
      items={items}
      config={CONFIG}
      sprints={SPRINTS}
      {...props}
    />
  );
}

type BoardProps = SprintBoardProps<Task>;

function renderBoard(
  props: Partial<BoardProps> = {},
  items: readonly Task[] = MIXED
): ReturnType<typeof render> {
  return render(
    <SprintBoard<Task>
      items={items}
      config={CONFIG}
      sprintId="s1"
      {...props}
    />
  );
}

describe("SprintSelector", () => {
  it("renders the default label, placeholder and generated ids", () => {
    const { container } = render(<SprintSelector sprints={SPRINTS} />);

    const select = container.querySelector<HTMLSelectElement>(
      ".dcf-sprint-selector__select"
    ) as HTMLSelectElement;
    const label = container.querySelector(".dcf-sprint-selector__label");
    expect(select).not.toBeNull();
    expect(select.id).toMatch(/^decaf-sprint-selector-\d+-select$/);
    expect(label?.getAttribute("for")).toBe(select.id);
    expect(label?.textContent).toBe("Sprint");
    expect(select.value).toBe("");
    expect(
      Array.from(select.options).map((option) => option.textContent)
    ).toEqual(["Select a sprint", "Sprint 1", "Sprint 2"]);
  });

  it("uses an explicit instance id for the select and status ids", () => {
    const { container } = render(
      <SprintSelector sprints={SPRINTS} instanceId="sprints" loading />
    );

    const select = container.querySelector("select") as HTMLSelectElement;
    const status = container.querySelector('[role="status"]');
    expect(select.id).toBe("sprints-select");
    expect(status?.id).toBe("sprints-status");
    expect(select.getAttribute("aria-describedby")).toBe("sprints-status");
  });

  it("is controlled: a change emits but never rewrites the host value", () => {
    const onSprintSelected = jest.fn();
    const { container, rerender } = render(
      <SprintSelector
        sprints={SPRINTS}
        selectedSprintId="s1"
        onSprintSelected={onSprintSelected}
      />
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.value).toBe("s1");

    change(select, "s2");

    expect(onSprintSelected).toHaveBeenCalledTimes(1);
    expect(onSprintSelected).toHaveBeenCalledWith({ sprintId: "s2" });
    // The component restores the host-owned value synchronously.
    expect(select.value).toBe("s1");

    rerender(
      <SprintSelector
        sprints={SPRINTS}
        selectedSprintId="s2"
        onSprintSelected={onSprintSelected}
      />
    );
    expect(
      (container.querySelector("select") as HTMLSelectElement).value
    ).toBe("s2");
  });

  it("emits null when the placeholder is selected", () => {
    const onSprintSelected = jest.fn();
    const { container } = render(
      <SprintSelector
        sprints={SPRINTS}
        selectedSprintId="s1"
        onSprintSelected={onSprintSelected}
      />
    );

    change(container.querySelector("select") as HTMLSelectElement, "");

    expect(onSprintSelected).toHaveBeenCalledWith({ sprintId: null });
  });

  it("is busy and disabled while loading and owns a polite live status", () => {
    const { container } = render(
      <SprintSelector sprints={SPRINTS} selectedSprintId="s1" loading />
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    const status = container.querySelector<HTMLElement>(
      ".dcf-sprint-selector__status"
    );

    expect(select.disabled).toBe(true);
    expect(select.getAttribute("aria-busy")).toBe("true");
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(status?.textContent).toBe("Loading sprints...");
    expect(select.getAttribute("aria-describedby")).toBe(status?.id);
  });

  it("describes the empty-sprint state without a live region", () => {
    const { container } = render(<SprintSelector sprints={[]} />);
    const select = container.querySelector("select") as HTMLSelectElement;
    const status = container.querySelector<HTMLElement>(
      ".dcf-sprint-selector__status"
    );

    expect(select.disabled).toBe(false);
    expect(select.getAttribute("aria-busy")).toBe("false");
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.hasAttribute("aria-live")).toBe(false);
    expect(status?.textContent).toBe("No sprints available.");
    expect(select.getAttribute("aria-describedby")).toBe(status?.id);
    // Only the placeholder option remains.
    expect(select.options).toHaveLength(1);
  });

  it("has no status region and no description when sprints are ready", () => {
    const { container } = render(<SprintSelector sprints={SPRINTS} />);
    const select = container.querySelector("select") as HTMLSelectElement;

    expect(container.querySelector(".dcf-sprint-selector__status")).toBeNull();
    expect(select.hasAttribute("aria-describedby")).toBe(false);
    expect(select.disabled).toBe(false);
  });

  it("honours the disabled prop", () => {
    const { container } = render(
      <SprintSelector sprints={SPRINTS} disabled />
    );

    expect((container.querySelector("select") as HTMLSelectElement).disabled).toBe(
      true
    );
  });
});

describe("Backlog — scoping and structure", () => {
  it("renders only backlog tasks in one backlog column", () => {
    const { container } = renderBacklog();

    expect(cardIds(container)).toEqual(["b1", "b2", "b3"]);
    expect(container.querySelectorAll(".dcf-kanban-column")).toHaveLength(1);
    const column = container.querySelector<HTMLElement>(
      '[data-column-id="backlog"]'
    );
    expect(column).not.toBeNull();
    expect(column?.querySelector(".dcf-kanban-column__title")?.textContent).toBe(
      "Backlog"
    );
    expect(SCRUM_BACKLOG_COLUMN_ID).toBe("backlog");
    expect(
      container.querySelector(".dcf-scrum-backlog-host")
    ).not.toBeNull();
  });

  it("generates a decaf-scrum-backlog instance id when none is supplied", () => {
    const { container } = renderBacklog();

    expect(
      container.querySelector<HTMLElement>(".dcf-kanban-host")?.dataset
        .kanbanInstance
    ).toMatch(/^decaf-scrum-backlog-\d+$/);
  });

  it("renders a custom column title", () => {
    const { container } = renderBacklog({ columnTitle: "Unscheduled" });

    expect(
      container.querySelector(".dcf-kanban-column__title")?.textContent
    ).toBe("Unscheduled");
  });

  it("renders an empty backlog state when every task is assigned", () => {
    const { container } = renderBacklog({}, [
      { id: "s1-a", title: "Sprint one A", status: "todo", sprintId: "s1" },
    ]);

    expect(cardIds(container)).toEqual([]);
    expect(
      container.querySelector(".dcf-kanban-column__empty")?.textContent
    ).toBe("No backlog tasks");
  });

  it("honours the readonly alias by disabling assignment and handles", () => {
    const { container } = renderBacklog({ readonly: true });
    const selects = Array.from(
      container.querySelectorAll<HTMLSelectElement>(
        "[data-scrum-assign-task-id]"
      )
    );

    expect(selects).toHaveLength(3);
    for (const select of selects) {
      expect(select.disabled).toBe(true);
    }
    expect(container.querySelectorAll(".dcf-kanban-card__handle")).toHaveLength(
      0
    );
  });
});

describe("Backlog — sprint assignment", () => {
  it("disables every select when no sprints are configured", () => {
    const { container } = renderBacklog({ sprints: [] });

    for (const select of Array.from(
      container.querySelectorAll<HTMLSelectElement>(
        "[data-scrum-assign-task-id]"
      )
    )) {
      expect(select.disabled).toBe(true);
    }
  });

  it("marks the select disabled when the board is disabled", () => {
    const { container } = renderBacklog({ disabled: true });

    for (const select of Array.from(
      container.querySelectorAll<HTMLSelectElement>(
        "[data-scrum-assign-task-id]"
      )
    )) {
      expect(select.disabled).toBe(true);
    }
  });

  it("requests assignment for a known sprint and never mutates the task", () => {
    const onSprintAssignmentRequested = jest.fn();
    const onSprintAssignmentRejected = jest.fn();
    const { container } = renderBacklog({
      onSprintAssignmentRequested,
      onSprintAssignmentRejected,
    });
    const task = MIXED[0];
    const snapshot = { ...task };

    change(selectFor(container, "b1"), "s1");

    expect(onSprintAssignmentRejected).not.toHaveBeenCalled();
    expect(onSprintAssignmentRequested).toHaveBeenCalledTimes(1);
    expect(onSprintAssignmentRequested).toHaveBeenCalledWith({
      task,
      sprintId: "s1",
      previousSprintId: null,
    });
    expect(task).toEqual(snapshot);
    expect(task.sprintId).toBeNull();
    // The host owns the value: the DOM select resets to the task's sprint.
    expect(selectFor(container, "b1").value).toBe("");
  });

  it("rejects the placeholder value as unchanged", () => {
    const onSprintAssignmentRequested = jest.fn();
    const onSprintAssignmentRejected = jest.fn();
    const { container } = renderBacklog({
      onSprintAssignmentRequested,
      onSprintAssignmentRejected,
    });

    change(selectFor(container, "b1"), "");

    expect(onSprintAssignmentRequested).not.toHaveBeenCalled();
    expect(onSprintAssignmentRejected).toHaveBeenCalledWith({
      task: MIXED[0],
      sprintId: "",
      previousSprintId: null,
      reason: "unchanged",
    });
  });

  it("rejects an unknown sprint id", () => {
    const onSprintAssignmentRequested = jest.fn();
    const onSprintAssignmentRejected = jest.fn();
    const { container } = renderBacklog({
      onSprintAssignmentRequested,
      onSprintAssignmentRejected,
    });

    const select = selectFor(container, "b1");
    const stale = document.createElement("option");
    stale.value = "sprint-x";
    stale.textContent = "Stale sprint";
    select.appendChild(stale);

    change(select, "sprint-x");

    expect(onSprintAssignmentRequested).not.toHaveBeenCalled();
    expect(onSprintAssignmentRejected).toHaveBeenCalledWith({
      task: MIXED[0],
      sprintId: "sprint-x",
      previousSprintId: null,
      reason: "unknown-sprint",
    });
  });

  it("rejects a read-only assignment", () => {
    const onSprintAssignmentRequested = jest.fn();
    const onSprintAssignmentRejected = jest.fn();
    const { container } = renderBacklog({
      readOnly: true,
      onSprintAssignmentRequested,
      onSprintAssignmentRejected,
    });

    change(selectFor(container, "b1"), "s1");

    expect(onSprintAssignmentRequested).not.toHaveBeenCalled();
    expect(onSprintAssignmentRejected).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "readonly", sprintId: "s1" })
    );
  });

  it("reports disabled before readonly when both are set", () => {
    const onSprintAssignmentRejected = jest.fn();
    const { container } = renderBacklog({
      disabled: true,
      readOnly: true,
      onSprintAssignmentRejected,
    });

    change(selectFor(container, "b1"), "s1");

    expect(onSprintAssignmentRejected).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "disabled" })
    );
  });

  it("replaces the board instead of offering assignment while loading", () => {
    const onSprintAssignmentRequested = jest.fn();
    const { container } = renderBacklog({
      loading: true,
      loadingMessage: "Loading backlog...",
      onSprintAssignmentRequested,
    });

    expect(
      container.querySelector(".dcf-kanban__state--loading")?.textContent
    ).toContain("Loading backlog...");
    expect(container.querySelectorAll("[data-scrum-assign-task-id]")).toHaveLength(
      0
    );
    expect(onSprintAssignmentRequested).not.toHaveBeenCalled();
  });

  it("replaces the board instead of offering assignment on error", () => {
    const onSprintAssignmentRequested = jest.fn();
    const onRetryRequested = jest.fn();
    const { container } = renderBacklog({
      error: "Unable to load the backlog.",
      onSprintAssignmentRequested,
      onRetryRequested,
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Unable to load the backlog."
    );
    expect(container.querySelectorAll("[data-scrum-assign-task-id]")).toHaveLength(
      0
    );
    fireEvent.click(
      container.querySelector(".dcf-kanban__retry") as HTMLButtonElement
    );
    expect(onRetryRequested).toHaveBeenCalledTimes(1);
  });
});

describe("Backlog — assignment rejection precedence", () => {
  it("reports readonly before unchanged for the placeholder value", () => {
    const onSprintAssignmentRequested = jest.fn();
    const onSprintAssignmentRejected = jest.fn();
    const { container } = renderBacklog({
      readOnly: true,
      onSprintAssignmentRequested,
      onSprintAssignmentRejected,
    });

    change(selectFor(container, "b1"), "");

    expect(onSprintAssignmentRequested).not.toHaveBeenCalled();
    expect(onSprintAssignmentRejected).toHaveBeenCalledWith({
      task: MIXED[0],
      sprintId: "",
      previousSprintId: null,
      reason: "readonly",
    });
  });

  it("reports readonly before unknown-sprint", () => {
    const onSprintAssignmentRequested = jest.fn();
    const onSprintAssignmentRejected = jest.fn();
    const { container } = renderBacklog({
      readOnly: true,
      onSprintAssignmentRequested,
      onSprintAssignmentRejected,
    });
    const select = selectFor(container, "b1");
    const stale = document.createElement("option");
    stale.value = "sprint-x";
    stale.textContent = "Stale sprint";
    select.appendChild(stale);

    change(select, "sprint-x");

    expect(onSprintAssignmentRequested).not.toHaveBeenCalled();
    expect(onSprintAssignmentRejected).toHaveBeenCalledWith({
      task: MIXED[0],
      sprintId: "sprint-x",
      previousSprintId: null,
      reason: "readonly",
    });
  });

  it("reports disabled before unchanged for the placeholder value", () => {
    const onSprintAssignmentRequested = jest.fn();
    const onSprintAssignmentRejected = jest.fn();
    const { container } = renderBacklog({
      disabled: true,
      onSprintAssignmentRequested,
      onSprintAssignmentRejected,
    });

    change(selectFor(container, "b1"), "");

    expect(onSprintAssignmentRequested).not.toHaveBeenCalled();
    expect(onSprintAssignmentRejected).toHaveBeenCalledWith({
      task: MIXED[0],
      sprintId: "",
      previousSprintId: null,
      reason: "disabled",
    });
  });

  it("reports disabled before unknown-sprint", () => {
    const onSprintAssignmentRequested = jest.fn();
    const onSprintAssignmentRejected = jest.fn();
    const { container } = renderBacklog({
      disabled: true,
      onSprintAssignmentRequested,
      onSprintAssignmentRejected,
    });
    const select = selectFor(container, "b1");
    const stale = document.createElement("option");
    stale.value = "sprint-x";
    stale.textContent = "Stale sprint";
    select.appendChild(stale);

    change(select, "sprint-x");

    expect(onSprintAssignmentRequested).not.toHaveBeenCalled();
    expect(onSprintAssignmentRejected).toHaveBeenCalledWith({
      task: MIXED[0],
      sprintId: "sprint-x",
      previousSprintId: null,
      reason: "disabled",
    });
  });

  it("reports unchanged before unknown-sprint when both rungs match", () => {
    const onSprintAssignmentRequested = jest.fn();
    const onSprintAssignmentRejected = jest.fn();
    const { container } = renderBacklog({
      onSprintAssignmentRequested,
      onSprintAssignmentRejected,
    });

    // The placeholder is both the task's current (null) sprint and an id the
    // host sprint list does not contain, so `unchanged` and `unknown-sprint`
    // are simultaneously true; the earlier rung must win.
    expect(SPRINTS.some((sprint) => sprint.id === "")).toBe(false);
    change(selectFor(container, "b1"), "");

    expect(onSprintAssignmentRequested).not.toHaveBeenCalled();
    expect(onSprintAssignmentRejected).toHaveBeenCalledWith({
      task: MIXED[0],
      sprintId: "",
      previousSprintId: null,
      reason: "unchanged",
    });
  });
});

describe("Backlog — assignment select event isolation", () => {
  it("does not select the card when the assignment select is clicked", () => {
    const onTaskSelected = jest.fn();
    const onAncestorClick = jest.fn();
    const { container } = render(
      <div onClick={onAncestorClick}>
        <Backlog<Task>
          items={MIXED}
          config={CONFIG}
          sprints={SPRINTS}
          onTaskSelected={onTaskSelected}
        />
      </div>
    );

    // Clicking the card itself still selects and bubbles to the host.
    fireEvent.click(card(container, "b1"));
    expect(onTaskSelected).toHaveBeenCalledTimes(1);
    expect(onAncestorClick).toHaveBeenCalledTimes(1);

    fireEvent.click(selectFor(container, "b1"));

    expect(onTaskSelected).toHaveBeenCalledTimes(1);
    expect(onAncestorClick).toHaveBeenCalledTimes(1);
    expect(card(container, "b1")).not.toHaveAttribute("aria-current");
  });

  it("does not drive selection, edit or drag from select keydown", () => {
    const onTaskSelected = jest.fn();
    const onTaskEditRequested = jest.fn();
    const onAncestorKeyDown = jest.fn();
    const { container } = render(
      <div onKeyDown={onAncestorKeyDown}>
        <Backlog<Task>
          items={MIXED}
          config={CONFIG}
          sprints={SPRINTS}
          onTaskSelected={onTaskSelected}
          onTaskEditRequested={onTaskEditRequested}
        />
      </div>
    );
    const select = selectFor(container, "b1");

    press(select, "Enter", "Enter");
    space(select);
    press(select, "Escape", "Escape");

    expect(onTaskSelected).not.toHaveBeenCalled();
    expect(onTaskEditRequested).not.toHaveBeenCalled();
    expect(onAncestorKeyDown).not.toHaveBeenCalled();
    const backlogCard = card(container, "b1");
    expect(backlogCard).not.toHaveAttribute("aria-current");
    expect(backlogCard).toHaveAttribute("aria-grabbed", "false");
  });

  it("does not select or drag the card when pointerdown lands on the select", () => {
    const onTaskSelected = jest.fn();
    const onAncestorPointerDown = jest.fn();
    const { container } = render(
      <div onPointerDown={onAncestorPointerDown}>
        <Backlog<Task>
          items={MIXED}
          config={CONFIG}
          sprints={SPRINTS}
          onTaskSelected={onTaskSelected}
        />
      </div>
    );

    fireEvent.pointerDown(selectFor(container, "b1"), {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      button: 0,
    });

    expect(onTaskSelected).not.toHaveBeenCalled();
    expect(onAncestorPointerDown).not.toHaveBeenCalled();
    expect(card(container, "b1")).toHaveAttribute("aria-grabbed", "false");
  });
});

describe("Backlog — reorder and selection passthrough", () => {
  it("reports a same-column reorder without the kanban column", () => {
    const onBacklogReordered = jest.fn();
    const onBacklogReorderRejected = jest.fn();
    const { container } = renderBacklog({
      onBacklogReordered,
      onBacklogReorderRejected,
    });
    const first = card(container, "b1");

    space(first);
    press(first, "ArrowDown");
    press(first, "Enter");

    expect(onBacklogReorderRejected).not.toHaveBeenCalled();
    expect(onBacklogReordered).toHaveBeenCalledWith({
      task: MIXED[0],
      previousIndex: 0,
      currentIndex: 1,
    });
  });

  it("reports a rejected reorder while read-only", () => {
    const onBacklogReordered = jest.fn();
    const onBacklogReorderRejected = jest.fn();
    const { container } = renderBacklog({
      readOnly: true,
      onBacklogReordered,
      onBacklogReorderRejected,
    });

    space(card(container, "b1"));

    expect(onBacklogReordered).not.toHaveBeenCalled();
    expect(onBacklogReorderRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        task: MIXED[0],
        reason: "readonly",
      })
    );
  });

  it("passes selection, edit and selection-clear through unchanged", () => {
    const onTaskSelected = jest.fn<void, [KanbanSelectionEvent<Task>]>();
    const onTaskEditRequested = jest.fn<void, [KanbanSelectionEvent<Task>]>();
    const onSelectionCleared = jest.fn();
    const { container } = renderBacklog({
      onTaskSelected,
      onTaskEditRequested,
      onSelectionCleared,
    });
    const first = card(container, "b1");

    fireEvent.click(first);
    expect(onTaskSelected).toHaveBeenCalledWith({
      task: MIXED[0],
      column: "backlog",
    });

    fireEvent.doubleClick(first);
    expect(onTaskEditRequested).toHaveBeenCalledWith({
      task: MIXED[0],
      column: "backlog",
    });

    press(first, "Escape");
    expect(onSelectionCleared).toHaveBeenCalledTimes(1);
  });

  it("wraps the default card title and calls a custom renderCard", () => {
    const renderCard = jest.fn(
      (context: KanbanCardTemplateContext<Task>) => (
        <strong className="custom-card">{context.task.title}</strong>
      )
    );
    const { container } = renderBacklog({ renderCard });

    expect(renderCard).toHaveBeenCalledTimes(3);
    const first = renderCard.mock.calls[0][0];
    expect(first.task).toEqual(MIXED[0]);
    expect(first.column.id).toBe("backlog");
    expect(first.readOnly).toBe(false);
    expect(container.querySelectorAll(".custom-card")).toHaveLength(3);
    expect(container.querySelector(".dcf-scrum-backlog__title")).toBeNull();
    // The assignment control is still appended beside the custom body.
    expect(container.querySelectorAll("[data-scrum-assign-task-id]")).toHaveLength(
      3
    );
  });
});

describe("SprintBoard — scoping and card rendering", () => {
  it("scopes items to the selected sprint and stamps the host", () => {
    const { container } = renderBoard();

    expect(cardIds(container)).toEqual(["s1-a", "s1-b"]);
    expect(
      container.querySelector<HTMLElement>(".dcf-scrum-sprint-board-host")
        ?.dataset.sprintId
    ).toBe("s1");
    expect(
      container.querySelector<HTMLElement>(".dcf-scrum-sprint-board-host")
    ).toHaveClass("dcf-scrum-sprint-board-host");
  });

  it("renders the default card title from the config", () => {
    const { container } = renderBoard();

    expect(
      container.querySelectorAll(".dcf-scrum-sprint-board__title")
    ).toHaveLength(2);
    expect(
      container.querySelector(".dcf-scrum-sprint-board__title")?.textContent
    ).toBe("Sprint one A");
  });

  it("prefers a custom renderCard over the default title", () => {
    const renderCard = jest.fn(
      (context: KanbanCardTemplateContext<Task>) => (
        <em className="scrum-custom">{context.task.id}</em>
      )
    );
    const { container } = renderBoard({ renderCard });

    expect(renderCard).toHaveBeenCalledTimes(2);
    expect(renderCard.mock.calls[0][0].task).toEqual(MIXED[3]);
    expect(container.querySelectorAll(".scrum-custom")).toHaveLength(2);
    expect(container.querySelector(".dcf-scrum-sprint-board__title")).toBeNull();
  });

  it("renders the empty sprint state for an unknown sprint", () => {
    const { container } = renderBoard({ sprintId: "sprint-x" });

    expect(cardIds(container)).toEqual([]);
    expect(
      container.querySelector(".dcf-kanban-column__empty")?.textContent
    ).toBe("No tasks in this sprint");
  });

  it("accepts the readonly alias and drops drag handles", () => {
    const { container } = renderBoard({ readonly: true });

    expect(container.querySelectorAll(".dcf-kanban-card__handle")).toHaveLength(
      0
    );
  });
});

describe("SprintBoard — sprintId stamping on kanban events", () => {
  it("stamps sprintId on an accepted cross-column move", () => {
    const onTaskMoved = jest.fn();
    const { container } = renderBoard({ onTaskMoved });

    space(card(container, "s1-a"));
    press(card(container, "s1-a"), "ArrowRight");
    press(card(container, "s1-a"), "Enter");

    expect(onTaskMoved).toHaveBeenCalledTimes(1);
    expect(onTaskMoved).toHaveBeenCalledWith(
      expect.objectContaining({
        task: MIXED[3],
        fromColumn: "todo",
        toColumn: "doing",
        sprintId: "s1",
      })
    );
  });

  it("stamps sprintId on an accepted same-column reorder", () => {
    const onTaskReordered = jest.fn();
    const { container } = renderBoard(
      { onTaskReordered },
      [
        { id: "a1", title: "A1", status: "todo", sprintId: "s1" },
        { id: "a2", title: "A2", status: "todo", sprintId: "s1" },
      ]
    );
    const first = card(container, "a1");

    space(first);
    press(first, "ArrowDown");
    press(first, "Enter");

    expect(onTaskReordered).toHaveBeenCalledWith({
      task: { id: "a1", title: "A1", status: "todo", sprintId: "s1" },
      column: "todo",
      previousIndex: 0,
      currentIndex: 1,
      sprintId: "s1",
    });
  });

  it("stamps sprintId on selected and edit requests", () => {
    const onTaskSelected = jest.fn();
    const onTaskEditRequested = jest.fn();
    const { container } = renderBoard({
      onTaskSelected,
      onTaskEditRequested,
    });
    const first = card(container, "s1-a");

    fireEvent.click(first);
    expect(onTaskSelected).toHaveBeenCalledWith({
      task: MIXED[3],
      column: "todo",
      sprintId: "s1",
    });

    fireEvent.doubleClick(first);
    expect(onTaskEditRequested).toHaveBeenCalledWith({
      task: MIXED[3],
      column: "todo",
      sprintId: "s1",
    });
  });

  it("stamps sprintId on a rejected move", () => {
    const onTaskMoveRejected = jest.fn();
    const { container } = renderBoard({
      readOnly: true,
      onTaskMoveRejected,
    });

    space(card(container, "s1-a"));

    expect(onTaskMoveRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        task: MIXED[3],
        reason: "readonly",
        sprintId: "s1",
      })
    );
  });

  it("passes selectionCleared and retryRequested through without a sprint", () => {
    const onSelectionCleared = jest.fn();
    const { container, rerender } = renderBoard({ onSelectionCleared });

    press(card(container, "s1-a"), "Escape");
    expect(onSelectionCleared).toHaveBeenCalledTimes(1);

    const onRetryRequested = jest.fn();
    rerender(
      <SprintBoard<Task>
        items={MIXED}
        config={CONFIG}
        sprintId="s1"
        error="Unable to load the sprint."
        onRetryRequested={onRetryRequested}
      />
    );
    fireEvent.click(
      container.querySelector(".dcf-kanban__retry") as HTMLButtonElement
    );
    expect(onRetryRequested).toHaveBeenCalledTimes(1);
  });
});
