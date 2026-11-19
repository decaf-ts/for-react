/**
 * SAA-1843 — React/Jest coverage for the `@decaf-ts/for-react/gantt` surface.
 *
 * Mirrors the Angular reference suites:
 * - `for-angular/tests/gantt/unit/gantt-mapping.spec.ts`
 * - `for-angular/tests/gantt/functional/gantt-functional.spec.ts`
 * - `for-angular/tests/gantt/functional/gantt-task-detail.spec.ts`
 *
 * The pure mapping layer runs without a fixture. Component tests mount the
 * real dhtmlx-gantt Community renderer under jsdom; the renderer measures its
 * container with `offsetHeight`/`clientHeight`, so this file stubs those (and
 * the bounding rect) to give it a layout. Vendor bar DOM is then queried
 * directly for decoration, focus and keyboard coverage.
 *
 * The Angular Playwright lane has no React counterpart; browser-level
 * interaction assertions are mapped onto jsdom component coverage and labelled
 * with the "deferred from Playwright" note in the relevant tests.
 *
 * The SSR assertion needs real `typeof window === "undefined"`, which a jsdom
 * test file cannot produce (jsdom installs non-configurable globals), so it
 * lives in `gantt-ssr.spec.tsx` under `@jest-environment node`.
 */
import React, { createRef } from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import {
  GANTT_DEPENDENCY_TYPES,
  GANTT_LINK_TYPES,
  GANTT_LOCALES,
  GANTT_VIEW_SCALES,
  Gantt,
  buildGanttMapping,
  ganttConfigFromFields,
  ganttDateOnly,
  ganttDependencyType,
  ganttLinkType,
  ganttScales,
  normalizeGanttDate,
  sameGanttInstant,
  toGanttDateRange,
  validateGanttModel,
  type GanttConfig,
  type GanttGridColumn,
  type GanttHandle,
  type GanttLocaleName,
  type GanttProps,
  type GanttTaskDateChangeEvent,
  type GanttTaskDateChangeRejectedEvent,
  type GanttTaskProgressChangeEvent,
  type GanttTaskProgressChangeRejectedEvent,
  type GanttTaskSelectionEvent,
} from "../../src/gantt";

interface Task {
  id: string;
  title: string;
  start: string;
  end: string;
  progress: number;
  parentId?: string;
  dependencies?: (string | { id: string; type?: "fs" | "ff" | "ss" | "sf" })[];
  milestone?: boolean;
  locked?: boolean;
  color?: string;
  tooltip?: string;
}

const CONFIG: GanttConfig<Task> = {
  id: (task) => task.id,
  title: (task) => task.title,
  start: (task) => task.start,
  end: (task) => task.end,
  progress: (task) => task.progress,
  parent: (task) => task.parentId,
  dependencies: (task) => task.dependencies,
  milestone: (task) => Boolean(task.milestone),
  color: (task) => task.color,
  editable: (task) => !task.locked,
  tooltip: (task) => task.tooltip,
};

const OPTIONS = { draggable: true };

function makeTasks(): Task[] {
  return [
    {
      id: "a",
      title: "Alpha",
      start: "2026-10-01",
      end: "2026-10-03",
      progress: 0.2,
      tooltip: "Alpha tooltip",
    },
    {
      id: "b",
      title: "Bravo",
      start: "2026-10-05",
      end: "2026-10-08",
      progress: 0.4,
      parentId: "a",
      dependencies: ["a"],
      tooltip: "Bravo tooltip",
    },
    {
      id: "m",
      title: "Milestone",
      start: "2026-10-10",
      end: "2026-10-10",
      progress: 0,
      milestone: true,
    },
  ];
}

function makeConfig(): GanttConfig<Task> {
  return { ...CONFIG };
}

interface GanttSpies {
  onTaskSelected: jest.Mock;
  onTaskEditRequested: jest.Mock;
  onTaskDateChanged: jest.Mock;
  onTaskDateChangeRejected: jest.Mock;
  onTaskProgressChanged: jest.Mock;
  onTaskProgressChangeRejected: jest.Mock;
  onModelIssuesChange: jest.Mock;
  onRetryRequested: jest.Mock;
  onViewTypeChange: jest.Mock;
}

function makeSpies(): GanttSpies {
  return {
    onTaskSelected: jest.fn(),
    onTaskEditRequested: jest.fn(),
    onTaskDateChanged: jest.fn(),
    onTaskDateChangeRejected: jest.fn(),
    onTaskProgressChanged: jest.fn(),
    onTaskProgressChangeRejected: jest.fn(),
    onModelIssuesChange: jest.fn(),
    onRetryRequested: jest.fn(),
    onViewTypeChange: jest.fn(),
  };
}

function mountGantt(
  overrides: Partial<GanttProps<Task>> = {},
  items: Task[] = makeTasks()
) {
  const ref = createRef<GanttHandle>();
  const spies = makeSpies();
  const view = render(
    <Gantt<Task>
      ref={ref}
      items={items}
      config={makeConfig()}
      {...spies}
      {...overrides}
    />
  );
  return { ref, items, spies, ...view };
}

function lastEvent<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0] as T;
}

function bar(container: HTMLElement, taskId: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    `.gantt_task_content[data-gantt-task-id="${taskId}"]`
  );
  if (!element) throw new Error(`Rendered bar "${taskId}" was not found`);
  return element;
}

function gridHeadLabels(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll(".gantt_grid_head_cell")
  ).map((cell) => cell.textContent ?? "");
}

async function readyBar(
  container: HTMLElement,
  taskId = "b"
): Promise<HTMLElement> {
  await waitFor(() => expect(bar(container, taskId)).toBeTruthy());
  return bar(container, taskId);
}

async function actCall<T>(callback: () => T): Promise<T> {
  let result!: T;
  await act(async () => {
    result = callback();
  });
  return result;
}

async function pressKey(
  container: HTMLElement,
  taskId: string,
  key: string,
  init: KeyboardEventInit = {}
): Promise<KeyboardEvent> {
  const target =
    container.querySelector<HTMLElement>(
      `.gantt_task_content[data-gantt-task-id="${taskId}"]`
    ) ??
    container.querySelector<HTMLElement>(
      `.gantt_task_line[data-task-id="${taskId}"]`
    );
  if (!target) throw new Error(`Rendered bar "${taskId}" was not found`);
  await act(async () => {
    fireEvent.keyDown(target, {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    });
  });
  return new KeyboardEvent("keydown", { key, ...init });
}

const originalOffsetHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "offsetHeight"
);
const originalClientHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientHeight"
);
const originalBoundingRect = HTMLElement.prototype.getBoundingClientRect;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 600,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 600,
  });
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 1400,
      bottom: 600,
      width: 1400,
      height: 600,
      toJSON: () => ({}),
    } as DOMRect;
  };
});

afterAll(() => {
  if (originalOffsetHeight) {
    Object.defineProperty(
      HTMLElement.prototype,
      "offsetHeight",
      originalOffsetHeight
    );
  }
  if (originalClientHeight) {
    Object.defineProperty(
      HTMLElement.prototype,
      "clientHeight",
      originalClientHeight
    );
  }
  HTMLElement.prototype.getBoundingClientRect = originalBoundingRect;
});

describe("gantt constants and pure mapping", () => {
  it("exposes every view scale and dependency type in stable order", () => {
    expect(GANTT_VIEW_SCALES).toEqual([
      "day",
      "week",
      "month",
      "quarter",
      "year",
    ]);
    expect(GANTT_DEPENDENCY_TYPES).toEqual(["fs", "ff", "ss", "sf"]);
    expect(GANTT_LINK_TYPES).toEqual({ fs: "0", ss: "1", ff: "2", sf: "3" });
    expect(ganttLinkType("fs")).toBe("0");
    expect(ganttLinkType("ss")).toBe("1");
    expect(ganttLinkType("ff")).toBe("2");
    expect(ganttLinkType("sf")).toBe("3");
  });

  it("maps each facade scale onto the dhtmlx scale configuration", () => {
    expect(ganttScales("day")).toEqual([
      { unit: "month", format: "%F %Y" },
      { unit: "day", step: 1, format: "%d" },
    ]);
    expect(ganttScales("week")).toEqual([
      { unit: "month", format: "%F %Y" },
      { unit: "week", format: "%d %M" },
    ]);
    expect(ganttScales("month")).toEqual([
      { unit: "year", format: "%Y" },
      { unit: "month", format: "%F" },
    ]);
    expect(ganttScales("year")).toEqual([{ unit: "year", format: "%Y" }]);

    const quarter = ganttScales("quarter");
    expect(quarter.map((scale) => scale.unit)).toEqual(["year", "quarter"]);
    const quarterLabel = quarter[1].format as (date: Date) => string;
    expect(quarterLabel(new Date(2026, 0, 15))).toBe("Q1");
    expect(quarterLabel(new Date(2026, 4, 15))).toBe("Q2");
    expect(quarterLabel(new Date(2026, 9, 15))).toBe("Q4");
  });
});

describe("ganttConfigFromFields", () => {
  it("maps every configured field and defaults editable to true", () => {
    const config = ganttConfigFromFields<Task>({
      id: "id",
      title: "title",
      start: "start",
      end: "end",
      progress: "progress",
      parent: "parentId",
      dependencies: "dependencies",
      milestone: "milestone",
      color: "color",
      editable: "locked",
      tooltip: "tooltip",
    });
    const task: Task = {
      id: "a",
      title: "Alpha",
      start: "2026-10-05",
      end: "2026-10-09",
      progress: 0.5,
      parentId: "root",
      dependencies: ["root"],
      milestone: true,
      color: "#123456",
      locked: false,
      tooltip: "tip",
    };

    expect(config.id(task)).toBe("a");
    expect(config.title(task)).toBe("Alpha");
    expect(config.start(task)).toBe("2026-10-05");
    expect(config.end(task)).toBe("2026-10-09");
    expect(config.progress?.(task)).toBe(0.5);
    expect(config.parent?.(task)).toBe("root");
    expect(config.dependencies?.(task)).toEqual(["root"]);
    expect(config.milestone?.(task)).toBe(true);
    expect(config.color?.(task)).toBe("#123456");
    expect(config.editable?.(task)).toBe(false);
    expect(config.tooltip?.(task)).toBe("tip");
  });

  it("reads absent optional fields without throwing", () => {
    const config = ganttConfigFromFields<Task>({
      id: "id",
      title: "title",
      start: "start",
      end: "end",
    });
    const task = {
      id: "b",
      title: "Beta",
      start: "2026-10-05",
      end: "2026-10-06",
    } as Task;

    expect(config.progress?.(task)).toBeUndefined();
    expect(config.parent?.(task)).toBeUndefined();
    expect(config.dependencies?.(task)).toBeUndefined();
    expect(config.milestone?.(task)).toBe(false);
    expect(config.editable?.(task)).toBe(true);
  });
});

describe("date normalization", () => {
  it("treats date-only strings as local calendar dates", () => {
    const date = normalizeGanttDate("2026-10-05");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(5);
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(0);
    expect(date?.getSeconds()).toBe(0);
  });

  it("rejects impossible calendar dates instead of rolling them over", () => {
    expect(normalizeGanttDate("2026-02-30")).toBeNull();
    expect(normalizeGanttDate("2026-13-01")).toBeNull();
  });

  it("distinguishes seconds from milliseconds by magnitude", () => {
    const seconds = normalizeGanttDate(1_700_000_000);
    const millis = normalizeGanttDate(1_700_000_000_000);
    expect(seconds?.getTime()).toBe(1_700_000_000_000);
    expect(millis?.getTime()).toBe(1_700_000_000_000);
  });

  it("copies Date instances and rejects invalid values", () => {
    const source = new Date(2026, 9, 5, 12);
    const copy = normalizeGanttDate(source);
    expect(copy?.getTime()).toBe(source.getTime());
    expect(copy).not.toBe(source);

    expect(normalizeGanttDate(null)).toBeNull();
    expect(normalizeGanttDate(undefined)).toBeNull();
    expect(normalizeGanttDate("")).toBeNull();
    expect(normalizeGanttDate("   ")).toBeNull();
    expect(normalizeGanttDate("not-a-date")).toBeNull();
    expect(normalizeGanttDate(Number.NaN)).toBeNull();
    expect(normalizeGanttDate(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeGanttDate(new Date(Number.NaN))).toBeNull();
  });

  it("exposes stable date-only strings and instant comparison", () => {
    expect(ganttDateOnly(normalizeGanttDate("2026-10-05"))).toBe("2026-10-05");
    expect(ganttDateOnly(null)).toBeNull();
    expect(toGanttDateRange("2026-10-05", "2026-10-09")).toEqual({
      start: new Date(2026, 9, 5),
      end: new Date(2026, 9, 9),
      startDate: "2026-10-05",
      endDate: "2026-10-09",
    });
    expect(sameGanttInstant(new Date(2026, 9, 5), new Date(2026, 9, 5))).toBe(
      true
    );
    expect(sameGanttInstant(new Date(2026, 9, 5), new Date(2026, 9, 6))).toBe(
      false
    );
    expect(sameGanttInstant(null, null)).toBe(true);
    expect(sameGanttInstant(null, new Date(2026, 9, 5))).toBe(false);
  });

  it("normalizes dependency inputs with finish-to-start as the default", () => {
    expect(ganttDependencyType("a")).toEqual({ id: "a", type: "fs" });
    expect(ganttDependencyType("  a  ")).toEqual({ id: "a", type: "fs" });
    expect(ganttDependencyType({ id: "a" })).toEqual({ id: "a", type: "fs" });
    expect(ganttDependencyType({ id: "a", type: "ss" })).toEqual({
      id: "a",
      type: "ss",
    });
    expect(ganttDependencyType("")).toBeNull();
    expect(ganttDependencyType({ id: "  " })).toBeNull();
    expect(ganttDependencyType(null)).toBeNull();
  });
});

describe("buildGanttMapping", () => {
  it("builds parent/child hierarchy with project, task and milestone types", () => {
    const tasks: Task[] = [
      { id: "root", title: "Root", start: "2026-10-01", end: "2026-10-31", progress: 0.1 },
      {
        id: "child",
        title: "Child",
        start: "2026-10-05",
        end: "2026-10-09",
        progress: 0.2,
        parentId: "root",
      },
      {
        id: "grandchild",
        title: "Grandchild",
        start: "2026-10-06",
        end: "2026-10-07",
        progress: 0.3,
        parentId: "child",
      },
      { id: "leaf", title: "Leaf", start: "2026-10-02", end: "2026-10-03", progress: 0 },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    const root = mapping.byId.get("root");
    const child = mapping.byId.get("child");
    const grandchild = mapping.byId.get("grandchild");
    const leaf = mapping.byId.get("leaf");

    expect(root?.hasChildren).toBe(true);
    expect(root?.parentId).toBeNull();
    expect(root?.data).toMatchObject({ type: "project", open: true });
    expect(child?.hasChildren).toBe(true);
    expect(child?.data).toMatchObject({ type: "project", parent: "root" });
    expect(grandchild?.data).toMatchObject({ type: "task", parent: "child" });
    expect(leaf?.data).toMatchObject({ type: "task" });
    expect(leaf?.data.parent).toBeUndefined();
    expect(mapping.taskCount).toBe(4);
  });

  it("drops unknown and cyclic parents so those tasks stay as roots", () => {
    const tasks: Task[] = [
      {
        id: "a",
        title: "A",
        start: "2026-10-01",
        end: "2026-10-02",
        progress: 0,
        parentId: "missing",
      },
      {
        id: "b",
        title: "B",
        start: "2026-10-01",
        end: "2026-10-02",
        progress: 0,
        parentId: "c",
      },
      {
        id: "c",
        title: "C",
        start: "2026-10-01",
        end: "2026-10-02",
        progress: 0,
        parentId: "b",
      },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.tasks.map((task) => task.id).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(mapping.byId.get("a")?.parentId).toBeNull();
    expect(mapping.byId.get("b")?.parentId).toBeNull();
    expect(mapping.byId.get("c")?.parentId).toBeNull();
  });

  it("collapses milestones to a single-day instant", () => {
    const mapping = buildGanttMapping<Task>(
      [
        {
          id: "m",
          title: "Milestone",
          start: "2026-10-28",
          end: "2026-10-31",
          progress: 0,
          milestone: true,
        },
      ],
      CONFIG,
      OPTIONS
    );
    const mapped = mapping.byId.get("m");

    expect(mapped?.milestone).toBe(true);
    expect(mapped?.start?.getTime()).toBe(mapped?.end?.getTime());
    expect(mapped?.data.type).toBe("milestone");
    expect(mapped?.data.duration).toBe(0);
    expect(mapped?.data.start_date?.getTime()).toBe(
      mapped?.data.end_date?.getTime()
    );
  });

  it("emits predecessor -> successor links with the configured type", () => {
    const tasks: Task[] = [
      { id: "a", title: "A", start: "2026-10-01", end: "2026-10-03", progress: 0 },
      {
        id: "b",
        title: "B",
        start: "2026-10-05",
        end: "2026-10-08",
        progress: 0,
        dependencies: ["a"],
      },
      {
        id: "c",
        title: "C",
        start: "2026-10-06",
        end: "2026-10-09",
        progress: 0,
        dependencies: [{ id: "a", type: "ss" }],
      },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.links).toEqual([
      { id: "a->b#0", source: "a", target: "b", type: "fs" },
      { id: "a->c#0", source: "a", target: "c", type: "ss" },
    ]);
    expect(mapping.dependencies.get("b")).toEqual([{ id: "a", type: "fs" }]);
    expect(mapping.dependencies.get("c")).toEqual([{ id: "a", type: "ss" }]);
  });

  it("ignores duplicate ids, self links, and unknown dependencies", () => {
    const tasks: Task[] = [
      { id: "a", title: "First", start: "2026-10-01", end: "2026-10-03", progress: 0 },
      { id: "a", title: "Duplicate", start: "2026-10-10", end: "2026-10-12", progress: 0 },
      {
        id: "b",
        title: "B",
        start: "2026-10-05",
        end: "2026-10-08",
        progress: 0,
        dependencies: ["b", "missing", "a"],
      },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.taskCount).toBe(2);
    expect(mapping.byId.get("a")?.title).toBe("First");
    expect(mapping.dependencies.get("b")).toEqual([{ id: "a", type: "fs" }]);
    expect(mapping.links.map((link) => link.id)).toEqual(["a->b#0"]);
  });

  it("filters dependency cycles out of the renderer links", () => {
    const tasks: Task[] = [
      {
        id: "x",
        title: "X",
        start: "2026-10-01",
        end: "2026-10-02",
        progress: 0,
        dependencies: ["y"],
      },
      {
        id: "y",
        title: "Y",
        start: "2026-10-01",
        end: "2026-10-02",
        progress: 0,
        dependencies: ["x"],
      },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.links).toHaveLength(1);
    expect(mapping.links[0]).toMatchObject({ source: "y", target: "x" });
    expect(mapping.dependencies.get("y")).toEqual([]);
  });

  it("keeps invalid-date tasks in the table without a bar and reports them", () => {
    const tasks: Task[] = [
      { id: "ok", title: "OK", start: "2026-10-01", end: "2026-10-03", progress: 0 },
      { id: "bad", title: "Bad", start: "", end: "2026-10-03", progress: 0 },
      { id: "reverse", title: "Reverse", start: "2026-10-09", end: "2026-10-05", progress: 0 },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.byId.get("bad")?.start).toBeNull();
    expect(mapping.byId.get("bad")?.data.hide_bar).toBe(true);
    expect(mapping.byId.get("bad")?.data.start_date).toBeUndefined();
    expect(mapping.byId.get("reverse")?.end).toBeNull();
    expect(mapping.byId.get("reverse")?.data.hide_bar).toBe(true);
    expect(mapping.hasValidTasks).toBe(true);
    expect(validateGanttModel(tasks, CONFIG).map((issue) => issue.code)).toEqual(
      ["invalid-date", "invalid-date"]
    );
  });

  it("clamps unusable progress to null and reports the invalid value", () => {
    const tasks: Task[] = [
      { id: "a", title: "A", start: "2026-10-01", end: "2026-10-02", progress: 1.4 },
      { id: "b", title: "B", start: "2026-10-01", end: "2026-10-02", progress: -0.1 },
      { id: "c", title: "C", start: "2026-10-01", end: "2026-10-02", progress: 0.5 },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.byId.get("a")?.progress).toBeNull();
    expect(mapping.byId.get("a")?.data.progress).toBeUndefined();
    expect(mapping.byId.get("b")?.progress).toBeNull();
    expect(mapping.byId.get("c")?.progress).toBe(0.5);
    expect(mapping.byId.get("c")?.data.progress).toBe(0.5);
    expect(validateGanttModel(tasks, CONFIG).map((issue) => issue.code)).toEqual(
      ["invalid-progress", "invalid-progress"]
    );
  });

  it("derives a padded timeline from the valid task range", () => {
    const mapping = buildGanttMapping<Task>(
      [
        { id: "a", title: "A", start: "2026-10-05", end: "2026-10-09", progress: 0 },
        { id: "b", title: "B", start: "2026-10-12", end: "2026-10-20", progress: 0 },
      ],
      CONFIG,
      OPTIONS
    );
    expect(mapping.timelineStart).toEqual(new Date(2026, 9, 4));
    expect(mapping.timelineEnd).toEqual(new Date(2026, 9, 21));
  });

  it("maps color, tooltip and per-task editability", () => {
    const tasks: Task[] = [
      {
        id: "a",
        title: "A",
        start: "2026-10-01",
        end: "2026-10-02",
        progress: 0.5,
        color: "#123456",
        tooltip: "hint",
      },
      {
        id: "b",
        title: "B",
        start: "2026-10-01",
        end: "2026-10-02",
        progress: 0,
        locked: true,
      },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.byId.get("a")?.data.color).toBe("#123456");
    expect(mapping.byId.get("a")?.tooltip).toBe("hint");
    expect(mapping.byId.get("a")?.editable).toBe(true);
    expect(mapping.byId.get("b")?.editable).toBe(false);
    expect(mapping.byId.get("b")?.data.readonly).toBe(true);

    const readOnlyMapping = buildGanttMapping(tasks, CONFIG, {
      draggable: false,
    });
    expect(readOnlyMapping.byId.get("a")?.editable).toBe(false);
    expect(readOnlyMapping.byId.get("a")?.data.readonly).toBe(true);
  });

  it("returns an empty result when there are no usable tasks", () => {
    const mapping = buildGanttMapping<Task>([], CONFIG, OPTIONS);
    expect(mapping.tasks).toEqual([]);
    expect(mapping.links).toEqual([]);
    expect(mapping.taskCount).toBe(0);
    expect(mapping.hasValidTasks).toBe(false);
    expect(mapping.timelineStart).toBeNull();
    expect(mapping.timelineEnd).toBeNull();
  });
});

describe("validateGanttModel", () => {
  it("reports invalid, duplicate, unknown-parent, and parent-cycle inputs", () => {
    const tasks: Task[] = [
      { id: "", title: "Empty", start: "2026-10-01", end: "2026-10-02", progress: 0 },
      { id: "a", title: "A", start: "2026-10-01", end: "2026-10-02", progress: 0 },
      { id: "a", title: "A2", start: "2026-10-01", end: "2026-10-02", progress: 0 },
      {
        id: "b",
        title: "B",
        start: "2026-10-01",
        end: "2026-10-02",
        progress: 0,
        parentId: "missing",
      },
      {
        id: "c",
        title: "C",
        start: "2026-10-01",
        end: "2026-10-02",
        progress: 0,
        parentId: "c",
      },
    ];

    const codes = validateGanttModel(tasks, CONFIG).map((issue) => issue.code);
    expect(codes).toContain("invalid-id");
    expect(codes).toContain("duplicate-id");
    expect(codes).toContain("unknown-parent");
    expect(codes).toContain("parent-cycle");
  });

  it("reports unknown, self, invalid-type, cyclic, and violated dependencies", () => {
    const tasks: Task[] = [
      { id: "a", title: "A", start: "2026-10-01", end: "2026-10-09", progress: 0 },
      {
        id: "b",
        title: "B",
        start: "2026-10-05",
        end: "2026-10-12",
        progress: 0,
        dependencies: ["a"],
      },
      {
        id: "c",
        title: "C",
        start: "2026-10-01",
        end: "2026-10-02",
        progress: 0,
        dependencies: ["c", "missing", { id: "a", type: "xx" as "fs" }],
      },
    ];

    const codes = validateGanttModel(tasks, CONFIG).map((issue) => issue.code);
    expect(codes).toContain("self-dependency");
    expect(codes).toContain("unknown-dependency");
    expect(codes).toContain("invalid-dependency-type");
    expect(codes).toContain("dependency-violation");

    const cyclic = validateGanttModel<Task>(
      [
        {
          id: "x",
          title: "X",
          start: "2026-10-01",
          end: "2026-10-02",
          progress: 0,
          dependencies: ["y"],
        },
        {
          id: "y",
          title: "Y",
          start: "2026-10-01",
          end: "2026-10-02",
          progress: 0,
          dependencies: ["x"],
        },
      ],
      CONFIG
    );
    expect(cyclic.map((issue) => issue.code)).toContain("dependency-cycle");
  });
});

describe("Gantt — rendered states", () => {
  it("renders the empty state when there are no tasks", () => {
    const { container } = mountGantt({}, []);
    expect(container.querySelector(".dcf-gantt__state--empty")).not.toBeNull();
    expect(container.querySelector(".gantt_grid")).toBeNull();
  });

  it("renders a custom empty node when renderEmpty is supplied", () => {
    const { container } = mountGantt(
      { renderEmpty: () => <p className="custom-empty">Nothing scheduled</p> },
      []
    );
    expect(container.querySelector(".custom-empty")?.textContent).toBe(
      "Nothing scheduled"
    );
  });

  it("renders the loading state without the toolbar or renderer", () => {
    const { container } = mountGantt({ loading: true, loadingLabel: "Fetching" });
    const loading = container.querySelector(".dcf-gantt__state--loading");

    expect(loading).not.toBeNull();
    expect(loading?.getAttribute("role")).toBe("status");
    expect(loading?.textContent).toContain("Fetching");
    expect(container.querySelector(".dcf-gantt__toolbar")).toBeNull();
    expect(container.querySelector(".gantt_grid")).toBeNull();
    expect(container.querySelector(".dcf-gantt")?.getAttribute("aria-busy")).toBe(
      "true"
    );
  });

  it("renders the error state and emits onRetryRequested", async () => {
    const { container, spies } = mountGantt({ error: "Timeline failed" });
    const alert = container.querySelector(".dcf-gantt__state--error") as HTMLElement;

    expect(alert).not.toBeNull();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.textContent).toContain("Timeline failed");
    expect(container.querySelector(".dcf-gantt__toolbar")).toBeNull();
    await act(async () => {
      fireEvent.click(alert.querySelector(".dcf-gantt__retry") as HTMLElement);
    });
    expect(spies.onRetryRequested).toHaveBeenCalledTimes(1);
  });

  it("reflects readOnly and disabled on the host", () => {
    const readOnly = mountGantt({ readOnly: true });
    expect(readOnly.container.querySelector(".dcf-gantt--readonly")).not.toBeNull();
    readOnly.unmount();

    const disabled = mountGantt({ disabled: true });
    expect(disabled.container.querySelector(".dcf-gantt--disabled")).not.toBeNull();
  });

  it("accepts the lowercase readonly alias", () => {
    const { container } = mountGantt({ readonly: true } as Partial<GanttProps<Task>>);
    expect(container.querySelector(".dcf-gantt--readonly")).not.toBeNull();
  });

  it("emits model issues for invalid tasks and lists them inline", async () => {
    const items: Task[] = [
      { id: "a", title: "A", start: "2026-10-01", end: "2026-10-02", progress: 2 },
    ];
    const { container, spies } = mountGantt({}, items);

    await waitFor(() =>
      expect(spies.onModelIssuesChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ code: "invalid-progress", taskId: "a" }),
        ])
      )
    );
    expect(container.querySelectorAll(".dcf-gantt__issue").length).toBeGreaterThan(0);
  });
});

describe("Gantt — toolbar scale control", () => {
  it("renders every scale button, with week active by default", () => {
    const { container } = mountGantt();
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-gantt-view]")
    );

    expect(buttons.map((button) => button.dataset.ganttView)).toEqual([
      "day",
      "week",
      "month",
      "quarter",
      "year",
    ]);
    expect(
      container
        .querySelector('[data-gantt-view="week"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("switches the uncontrolled scale and reports onViewTypeChange", async () => {
    const { container, spies } = mountGantt();

    await act(async () => {
      fireEvent.click(
        container.querySelector('[data-gantt-view="day"]') as HTMLElement
      );
    });

    expect(spies.onViewTypeChange).toHaveBeenCalledWith("day");
    expect(
      container
        .querySelector('[data-gantt-view="day"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      container
        .querySelector('[data-gantt-view="week"]')
        ?.getAttribute("aria-pressed")
    ).toBe("false");
  });

  it("keeps a controlled scale until the host updates viewType", async () => {
    const { container, spies, rerender } = mountGantt({ viewType: "month" });

    await act(async () => {
      fireEvent.click(
        container.querySelector('[data-gantt-view="year"]') as HTMLElement
      );
    });

    expect(spies.onViewTypeChange).toHaveBeenCalledWith("year");
    expect(
      container
        .querySelector('[data-gantt-view="month"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true");

    rerender(
      <Gantt<Task>
        items={makeTasks()}
        config={makeConfig()}
        {...spies}
        viewType="year"
      />
    );
    expect(
      container
        .querySelector('[data-gantt-view="year"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("honours custom scale labels and disables the toolbar while busy", () => {
    const custom = mountGantt({
      viewTypeLabels: { day: "Daily", week: "Weekly" },
    });
    expect(
      custom.container.querySelector('[data-gantt-view="day"]')?.textContent
    ).toBe("Daily");
    custom.unmount();

    const disabled = mountGantt({ disabled: true });
    const buttons = Array.from(
      disabled.container.querySelectorAll<HTMLButtonElement>("[data-gantt-view]")
    );
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });
});

describe("Gantt — bar decoration and accessibility", () => {
  it("decorates rendered bars with role, tabindex, state and shortcuts", async () => {
    const { container } = mountGantt({ selectedId: "b" });
    const selected = await readyBar(container, "b");
    const other = bar(container, "a");

    expect(selected.getAttribute("role")).toBe("button");
    expect(selected.getAttribute("tabindex")).toBe("0");
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(other.getAttribute("aria-pressed")).toBe("false");
    expect(selected.hasAttribute("aria-selected")).toBe(false);
    expect(selected.getAttribute("aria-keyshortcuts")).toContain(
      "Alt+ArrowLeft"
    );
    expect(selected.getAttribute("aria-keyshortcuts")).toContain(
      '[ ]'
    );
    expect(selected.getAttribute("aria-label")).toContain("Bravo");
    expect(selected.getAttribute("aria-label")).toContain(
      "2026-10-05 to 2026-10-08"
    );
    expect(selected.getAttribute("aria-label")).toContain("40 percent complete");

    expect(
      container
        .querySelector('.gantt_task_line[data-task-id="b"]')
        ?.classList.contains("dcf-gantt__bar--selected")
    ).toBe(true);
    expect(
      container
        .querySelector('.gantt_task_line[data-task-id="a"]')
        ?.classList.contains("dcf-gantt__bar--selected")
    ).toBe(false);
  });

  it("marks bars aria-disabled from an explicit disabled prop", async () => {
    const enabled = mountGantt({ disabled: false });
    expect((await readyBar(enabled.container)).getAttribute("aria-disabled")).toBe(
      "false"
    );
    enabled.unmount();

    const disabled = mountGantt({ disabled: true });
    expect((await readyBar(disabled.container)).getAttribute("aria-disabled")).toBe(
      "true"
    );
  });

  it("defaults aria-disabled to false when disabled is omitted", async () => {
    const { container } = mountGantt();
    const barElement = await readyBar(container);
    expect(barElement.getAttribute("aria-disabled")).toBe("false");
  });

  it("marks milestone bars and per-task non-editable bars", async () => {
    const { container } = mountGantt();
    await readyBar(container, "m");
    const milestoneLine = container.querySelector(
      '.gantt_task_line[data-task-id="m"]'
    );
    expect(milestoneLine?.classList.contains("dcf-gantt__bar--milestone")).toBe(
      true
    );

    const lockedItems = makeTasks();
    lockedItems[1].locked = true;
    const locked = mountGantt({}, lockedItems);
    await readyBar(locked.container, "b");
    expect(
      locked.container
        .querySelector('.gantt_task_line[data-task-id="b"]')
        ?.classList.contains("dcf-gantt__bar--readonly")
    ).toBe(true);
  });

  it("marks every bar read-only when the host is read-only", async () => {
    const { container } = mountGantt({ readOnly: true });
    await readyBar(container, "a");
    expect(
      container
        .querySelector('.gantt_task_line[data-task-id="a"]')
        ?.classList.contains("dcf-gantt__bar--readonly")
    ).toBe(true);
  });
});

describe("Gantt — keyboard interaction", () => {
  it("selects a bar with Enter and with Space", async () => {
    const { container, spies } = mountGantt();
    await readyBar(container, "a");
    await readyBar(container, "b");

    await pressKey(container, "b", "Enter");
    await pressKey(container, "a", " ");

    const selected = spies.onTaskSelected.mock.calls.map(
      (call) => (call[0] as GanttTaskSelectionEvent<Task>).taskId
    );
    expect(selected).toEqual(["b", "a"]);
  });

  it("requests an edit with E and does not open a panel without renderTaskDetail", async () => {
    const { container, spies } = mountGantt();
    await readyBar(container);

    await pressKey(container, "b", "e");

    expect(spies.onTaskEditRequested).toHaveBeenCalledTimes(1);
    expect(
      (lastEvent<GanttTaskSelectionEvent<Task>>(spies.onTaskEditRequested)).taskId
    ).toBe("b");
    expect(container.querySelector(".dcf-gantt__detail")).toBeNull();
  });

  it("moves one day with Alt+Arrow and resizes with Alt+Shift+Arrow", async () => {
    const { container, spies } = mountGantt();
    await readyBar(container);

    await pressKey(container, "b", "ArrowRight", { altKey: true });
    const moved = lastEvent<GanttTaskDateChangeEvent<Task>>(
      spies.onTaskDateChanged
    );
    expect(moved.reason).toBe("keyboard");
    expect(moved.mode).toBe("move");
    expect(moved.current.startDate).toBe("2026-10-06");
    expect(moved.current.endDate).toBe("2026-10-09");

    await pressKey(container, "b", "ArrowRight", { altKey: true, shiftKey: true });
    const resized = lastEvent<GanttTaskDateChangeEvent<Task>>(
      spies.onTaskDateChanged
    );
    expect(resized.reason).toBe("keyboard");
    expect(resized.mode).toBe("resize");
    expect(resized.current.startDate).toBe("2026-10-05");
    expect(resized.current.endDate).toBe("2026-10-09");
  });

  it("steps progress by ten percent with ] and [", async () => {
    const { container, spies } = mountGantt();
    await readyBar(container);

    await pressKey(container, "b", "]");
    expect(
      lastEvent<GanttTaskProgressChangeEvent<Task>>(spies.onTaskProgressChanged)
    ).toMatchObject({ taskId: "b", previous: 0.4, current: 0.5 });

    await pressKey(container, "b", "[");
    expect(
      lastEvent<GanttTaskProgressChangeEvent<Task>>(spies.onTaskProgressChanged)
    ).toMatchObject({ taskId: "b", previous: 0.4, current: 0.3 });
  });

  it("rejects keyboard edits in read-only and disabled modes", async () => {
    const readOnly = mountGantt({ readOnly: true });
    await readyBar(readOnly.container);
    await pressKey(readOnly.container, "b", "ArrowRight", { altKey: true });
    expect(
      lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
        readOnly.spies.onTaskDateChangeRejected
      ).reason
    ).toBe("readonly");

    const disabled = mountGantt({ disabled: true });
    await readyBar(disabled.container);
    await pressKey(disabled.container, "b", "ArrowRight", { altKey: true });
    expect(
      lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
        disabled.spies.onTaskDateChangeRejected
      ).reason
    ).toBe("disabled");
  });

  it("reports an unknown bar as an unknown-task rejection", async () => {
    const { container, spies } = mountGantt();
    await readyBar(container);
    const ghost = document.createElement("span");
    ghost.className = "gantt_task_content";
    ghost.setAttribute("data-gantt-task-id", "ghost");
    container.querySelector(".dcf-gantt")?.appendChild(ghost);

    const event = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    ghost.dispatchEvent(event);

    const rejection = lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
      spies.onTaskDateChangeRejected
    );
    expect(rejection.reason).toBe("unknown-task");
    expect(rejection.taskId).toBe("ghost");
    expect(rejection.task).toBeNull();
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("Gantt — imperative handle and date changes", () => {
  it("emits accepted control events with Date values and stable strings", async () => {
    const items = makeTasks();
    const { ref, spies } = mountGantt({}, items);
    await waitFor(() => expect(ref.current).toBeTruthy());

    expect(
      await actCall(() =>
        ref.current!.applyDateChange("b", "2026-10-06", "2026-10-09")
      )
    ).toBe(true);

    const event = lastEvent<GanttTaskDateChangeEvent<Task>>(
      spies.onTaskDateChanged
    );
    expect(event.taskId).toBe("b");
    expect(event.task).toBe(items[1]);
    expect(event.reason).toBe("control");
    expect(event.mode).toBe("move");
    expect(event.previous.start).toEqual(new Date(2026, 9, 5));
    expect(event.previous.startDate).toBe("2026-10-05");
    expect(event.previous.endDate).toBe("2026-10-08");
    expect(event.current.start).toEqual(new Date(2026, 9, 6));
    expect(event.current.end).toEqual(new Date(2026, 9, 9));
    expect(event.current.startDate).toBe("2026-10-06");
    expect(event.current.endDate).toBe("2026-10-09");
  });

  it("supports resize mode through applyDateChange", async () => {
    const { ref, spies } = mountGantt();
    await waitFor(() => expect(ref.current).toBeTruthy());

    expect(
      await actCall(() =>
        ref.current!.applyDateChange(
          "b",
          "2026-10-05",
          "2026-10-10",
          "resize"
        )
      )
    ).toBe(true);
    const event = lastEvent<GanttTaskDateChangeEvent<Task>>(
      spies.onTaskDateChanged
    );
    expect(event.mode).toBe("resize");
    expect(event.current.endDate).toBe("2026-10-10");
  });

  it("does not mutate the controlled task objects", async () => {
    const items = makeTasks();
    const { ref } = mountGantt({}, items);
    await waitFor(() => expect(ref.current).toBeTruthy());

    await actCall(() => {
      ref.current!.applyDateChange("b", "2026-10-06", "2026-10-09");
      ref.current!.setProgress("b", 0.9);
    });

    expect(items[1].start).toBe("2026-10-05");
    expect(items[1].end).toBe("2026-10-08");
    expect(items[1].progress).toBe(0.4);
  });

  it("rejects read-only, disabled, locked and unknown-task edits", async () => {
    const readOnly = mountGantt({ readOnly: true });
    await waitFor(() => expect(readOnly.ref.current).toBeTruthy());
    expect(
      await actCall(() =>
        readOnly.ref.current!.applyDateChange("b", "2026-10-06", "2026-10-09")
      )
    ).toBe(false);
    expect(
      lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
        readOnly.spies.onTaskDateChangeRejected
      ).reason
    ).toBe("readonly");

    const disabled = mountGantt({ disabled: true });
    await waitFor(() => expect(disabled.ref.current).toBeTruthy());
    expect(
      await actCall(() =>
        disabled.ref.current!.applyDateChange("b", "2026-10-06", "2026-10-09")
      )
    ).toBe(false);
    expect(
      lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
        disabled.spies.onTaskDateChangeRejected
      ).reason
    ).toBe("disabled");

    const lockedItems = makeTasks();
    lockedItems[1].locked = true;
    const locked = mountGantt({}, lockedItems);
    await waitFor(() => expect(locked.ref.current).toBeTruthy());
    expect(
      await actCall(() =>
        locked.ref.current!.applyDateChange("b", "2026-10-06", "2026-10-09")
      )
    ).toBe(false);
    expect(
      lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
        locked.spies.onTaskDateChangeRejected
      ).reason
    ).toBe("disabled");

    const unknown = mountGantt();
    await waitFor(() => expect(unknown.ref.current).toBeTruthy());
    expect(
      await actCall(() =>
        unknown.ref.current!.applyDateChange("nope", "2026-10-06", "2026-10-09")
      )
    ).toBe(false);
    const rejection = lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
      unknown.spies.onTaskDateChangeRejected
    );
    expect(rejection.reason).toBe("unknown-task");
    expect(rejection.task).toBeNull();
  });

  it("rejects inverted and unreadable dates, and unchanged ranges", async () => {
    const { ref, spies } = mountGantt();
    await waitFor(() => expect(ref.current).toBeTruthy());

    expect(
      await actCall(() =>
        ref.current!.applyDateChange("b", "2026-10-09", "2026-10-08")
      )
    ).toBe(false);
    expect(
      lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
        spies.onTaskDateChangeRejected
      ).reason
    ).toBe("invalid-date");

    expect(
      await actCall(() =>
        ref.current!.applyDateChange("b", "2026-02-30", "2026-03-02")
      )
    ).toBe(false);
    expect(
      lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
        spies.onTaskDateChangeRejected
      ).reason
    ).toBe("invalid-date");

    expect(
      await actCall(() =>
        ref.current!.applyDateChange("b", "2026-10-05", "2026-10-08")
      )
    ).toBe(false);
    expect(spies.onTaskDateChanged).toHaveBeenCalledTimes(0);
    expect(
      lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
        spies.onTaskDateChangeRejected
      ).reason
    ).toBe("unchanged");
  });

  it("rejects resizing a milestone but allows moving it", async () => {
    const { ref, spies } = mountGantt();
    await waitFor(() => expect(ref.current).toBeTruthy());

    expect(
      await actCall(() =>
        ref.current!.applyDateChange("m", "2026-10-10", "2026-10-12", "resize")
      )
    ).toBe(false);
    expect(
      lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
        spies.onTaskDateChangeRejected
      ).reason
    ).toBe("milestone");

    expect(
      await actCall(() =>
        ref.current!.applyDateChange("m", "2026-10-11", "2026-10-14", "move")
      )
    ).toBe(true);
    const event = lastEvent<GanttTaskDateChangeEvent<Task>>(
      spies.onTaskDateChanged
    );
    expect(event.current.startDate).toBe("2026-10-11");
    expect(event.current.endDate).toBe("2026-10-11");
  });

  it("rejects dependency violations in both directions", async () => {
    const { ref, spies } = mountGantt();
    await waitFor(() => expect(ref.current).toBeTruthy());

    expect(
      await actCall(() =>
        ref.current!.applyDateChange("b", "2026-10-02", "2026-10-05")
      )
    ).toBe(false);
    const forward = lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
      spies.onTaskDateChangeRejected
    );
    expect(forward.reason).toBe("dependency-violation");
    expect(forward.dependencyId).toBe("a");
    expect(spies.onTaskDateChanged).toHaveBeenCalledTimes(0);

    expect(
      await actCall(() =>
        ref.current!.applyDateChange("a", "2026-10-06", "2026-10-08")
      )
    ).toBe(false);
    const reverse = lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
      spies.onTaskDateChangeRejected
    );
    expect(reverse.reason).toBe("dependency-violation");
    expect(reverse.dependencyId).toBe("b");
  });

  it("emits accepted progress changes and rejects invalid/unknown/unchanged values", async () => {
    const { ref, spies } = mountGantt();
    await waitFor(() => expect(ref.current).toBeTruthy());

    expect(
      await actCall(() => ref.current!.setProgress("b", 0.6))
    ).toBe(true);
    expect(
      lastEvent<GanttTaskProgressChangeEvent<Task>>(spies.onTaskProgressChanged)
    ).toMatchObject({
      taskId: "b",
      previous: 0.4,
      current: 0.6,
      reason: "control",
    });

    expect(
      await actCall(() => ref.current!.setProgress("b", 1.5))
    ).toBe(false);
    expect(
      lastEvent<GanttTaskProgressChangeRejectedEvent<Task>>(
        spies.onTaskProgressChangeRejected
      ).reason
    ).toBe("invalid-progress");

    expect(
      await actCall(() => ref.current!.setProgress("b", -0.1))
    ).toBe(false);
    expect(
      lastEvent<GanttTaskProgressChangeRejectedEvent<Task>>(
        spies.onTaskProgressChangeRejected
      ).reason
    ).toBe("invalid-progress");

    expect(
      await actCall(() => ref.current!.setProgress("nope", 0.5))
    ).toBe(false);
    const unknown = lastEvent<GanttTaskProgressChangeRejectedEvent<Task>>(
      spies.onTaskProgressChangeRejected
    );
    expect(unknown.reason).toBe("unknown-task");
    expect(unknown.task).toBeNull();

    expect(
      await actCall(() => ref.current!.setProgress("b", 0.4))
    ).toBe(false);
    expect(
      lastEvent<GanttTaskProgressChangeRejectedEvent<Task>>(
        spies.onTaskProgressChangeRejected
      ).reason
    ).toBe("unchanged");
  });

  it("rejects progress changes in read-only, disabled and locked modes", async () => {
    const readOnly = mountGantt({ readOnly: true });
    await waitFor(() => expect(readOnly.ref.current).toBeTruthy());
    expect(
      await actCall(() => readOnly.ref.current!.setProgress("b", 0.6))
    ).toBe(false);
    expect(
      lastEvent<GanttTaskProgressChangeRejectedEvent<Task>>(
        readOnly.spies.onTaskProgressChangeRejected
      ).reason
    ).toBe("readonly");

    const disabled = mountGantt({ disabled: true });
    await waitFor(() => expect(disabled.ref.current).toBeTruthy());
    expect(
      await actCall(() => disabled.ref.current!.setProgress("b", 0.6))
    ).toBe(false);
    expect(
      lastEvent<GanttTaskProgressChangeRejectedEvent<Task>>(
        disabled.spies.onTaskProgressChangeRejected
      ).reason
    ).toBe("disabled");

    const lockedItems = makeTasks();
    lockedItems[1].locked = true;
    const locked = mountGantt({}, lockedItems);
    await waitFor(() => expect(locked.ref.current).toBeTruthy());
    expect(
      await actCall(() => locked.ref.current!.setProgress("b", 0.6))
    ).toBe(false);
    expect(
      lastEvent<GanttTaskProgressChangeRejectedEvent<Task>>(
        locked.spies.onTaskProgressChangeRejected
      ).reason
    ).toBe("disabled");
  });
});

describe("Gantt — drag path (deferred from Playwright)", () => {
  it("rejects a drag that violates a dependency and emits no accepted change", async () => {
    const { ref, container, spies } = mountGantt();
    await readyBar(container);
    const gantt = ref.current!.getGantt()!;
    const task = gantt.getTask("b");

    let accepted: boolean | undefined;
    await act(async () => {
      gantt.callEvent("onBeforeTaskDrag", ["b"]);
      accepted = gantt.callEvent("onBeforeTaskChanged", [
        "b",
        "move",
        {
          ...task,
          start_date: new Date(2026, 9, 2),
          end_date: new Date(2026, 9, 5),
        },
      ]);
      gantt.callEvent("onAfterTaskDrag", ["b", "move", task]);
    });

    expect(accepted).toBe(false);
    expect(spies.onTaskDateChanged).toHaveBeenCalledTimes(0);
    expect(
      lastEvent<GanttTaskDateChangeRejectedEvent<Task>>(
        spies.onTaskDateChangeRejected
      ).reason
    ).toBe("dependency-violation");
  });

  it("emits an accepted drag move with Date ranges", async () => {
    const { ref, container, spies } = mountGantt();
    await readyBar(container);
    const gantt = ref.current!.getGantt()!;
    const task = gantt.getTask("b");

    let accepted: boolean | undefined;
    await act(async () => {
      gantt.callEvent("onBeforeTaskDrag", ["b"]);
      accepted = gantt.callEvent("onBeforeTaskChanged", [
        "b",
        "move",
        {
          ...task,
          start_date: new Date(2026, 9, 6),
          end_date: new Date(2026, 9, 9),
        },
      ]);
      gantt.callEvent("onAfterTaskDrag", ["b", "move", task]);
    });

    expect(accepted).toBe(true);
    const event = lastEvent<GanttTaskDateChangeEvent<Task>>(
      spies.onTaskDateChanged
    );
    expect(event.taskId).toBe("b");
    expect(event.reason).toBe("drag");
    expect(event.mode).toBe("move");
    expect(event.current.startDate).toBe("2026-10-06");
    expect(event.current.endDate).toBe("2026-10-09");
  });
});

describe("Gantt — task detail panel", () => {
  function detailPanel(container: HTMLElement): HTMLElement | null {
    return container.querySelector<HTMLElement>(".dcf-gantt__detail");
  }

  it("opens from requestTaskEdit and projects renderTaskDetail", async () => {
    const { ref, container, spies } = mountGantt({
      renderTaskDetail: (context) => (
        <span className="projected-detail">
          {context.taskId}:{context.title}
        </span>
      ),
    });
    await waitFor(() => expect(ref.current).toBeTruthy());

    await actCall(() => ref.current!.requestTaskEdit("b"));

    await waitFor(() => expect(detailPanel(container)).not.toBeNull());
    const panel = detailPanel(container)!;
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("false");
    expect(panel.getAttribute("aria-label")).toBe("Bravo");
    expect(
      panel.querySelector(".dcf-gantt__detail-title")?.textContent?.trim()
    ).toBe("Bravo");
    expect(panel.querySelector(".projected-detail")?.textContent?.trim()).toBe(
      "b:Bravo"
    );
    expect(
      (lastEvent<GanttTaskSelectionEvent<Task>>(spies.onTaskEditRequested)).taskId
    ).toBe("b");
  });

  it("opens with E and closes from the close button", async () => {
    const { container } = mountGantt({
      renderTaskDetail: (context) => <span>{context.title}</span>,
    });
    await readyBar(container);

    await pressKey(container, "b", "e");
    await waitFor(() => expect(detailPanel(container)).not.toBeNull());

    fireEvent.click(
      detailPanel(container)!.querySelector(
        ".dcf-gantt__detail-close"
      ) as HTMLElement
    );
    expect(detailPanel(container)).toBeNull();
  });

  it("closes with Escape while a bar is focused", async () => {
    const { container } = mountGantt({
      renderTaskDetail: (context) => <span>{context.title}</span>,
    });
    await readyBar(container);

    await pressKey(container, "b", "e");
    await waitFor(() => expect(detailPanel(container)).not.toBeNull());

    await pressKey(container, "b", "Escape");
    await waitFor(() => expect(detailPanel(container)).toBeNull());
  });

  it("does not render a panel for an unknown task id", async () => {
    const { ref, container, spies } = mountGantt({
      renderTaskDetail: (context) => <span>{context.title}</span>,
    });
    await waitFor(() => expect(ref.current).toBeTruthy());

    await actCall(() => ref.current!.requestTaskEdit("nope"));

    expect(detailPanel(container)).toBeNull();
    expect(spies.onTaskEditRequested).toHaveBeenCalledTimes(0);
  });
});

describe("Gantt — bar templates", () => {
  it("renders the default title for bars and custom text from renderBar", async () => {
    const defaultView = mountGantt();
    await readyBar(defaultView.container, "a");
    expect(
      defaultView.container.querySelector(
        '.dcf-gantt__bar-label[data-gantt-task-id="a"]'
      )?.textContent
    ).toBe("Alpha");
    defaultView.unmount();

    const custom = mountGantt({
      renderBar: (context) =>
        `${context.title} · ${context.progressPercent}%${
          context.milestone ? " · milestone" : ""
        }`,
    });
    await readyBar(custom.container, "a");
    expect(
      custom.container.querySelector(
        '.dcf-gantt__bar-label[data-gantt-task-id="a"]'
      )?.textContent
    ).toBe("Alpha · 20%");
  });

  it("renders no bar text for milestones", async () => {
    const { container } = mountGantt();
    await readyBar(container, "m");
    expect(
      container.querySelector(
        '.dcf-gantt__bar-label[data-gantt-task-id="m"]'
      )
    ).toBeNull();
  });
});

describe("Gantt — renderer configuration", () => {
  it("pins CSP, disables auto-scheduling and disables multiselect", async () => {
    const { ref, container } = mountGantt();
    await readyBar(container);
    const gantt = ref.current!.getGantt()!;

    expect(gantt.config.csp).toBe(true);
    expect(gantt.config.auto_scheduling).toBe(false);
    expect(gantt.config.multiselect).toBe(false);
  });

  it("keeps a single active selection when multiselect is off", async () => {
    const { ref, container } = mountGantt();
    await readyBar(container);
    const gantt = ref.current!.getGantt()!;

    await act(async () => {
      gantt.selectTask("a");
    });
    expect(gantt.getSelectedId()).toBe("a");

    await act(async () => {
      gantt.selectTask("b");
    });
    expect(gantt.getSelectedId()).toBe("b");
    expect(gantt.isSelectedTask("a")).toBe(false);
    expect(gantt.isSelectedTask("b")).toBe(true);
  });
});

describe("Gantt — locales", () => {
  it("exposes the six bundled locale keys in a stable order", () => {
    expect(GANTT_LOCALES).toEqual(["en", "de", "jp", "ru", "cn", "zh_tw"]);
  });

  const localizedColumns: [GanttLocaleName, string][] = [
    ["ru", "Задача"],
    ["cn", "任务名称"],
    ["zh_tw", "任務名稱"],
  ];

  it.each(localizedColumns)(
    "localizes the default task column for %s",
    async (locale, expected) => {
      const { container } = mountGantt({ locale });
      await waitFor(() =>
        expect(gridHeadLabels(container)[0]).toBe(expected)
      );
    }
  );
});

describe("Gantt — live announcements", () => {
  function liveRegion(container: HTMLElement): HTMLElement {
    const element = container.querySelector<HTMLElement>(".dcf-gantt__sr-only");
    if (!element) throw new Error("Live region was not rendered");
    return element;
  }

  it("renders a polite atomic live region", () => {
    const { container } = mountGantt();
    const live = liveRegion(container);

    expect(live.getAttribute("role")).toBe("status");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.getAttribute("aria-atomic")).toBe("true");
  });

  it("announces selection, edit requests, moves and resizes", async () => {
    const { container } = mountGantt();
    await readyBar(container);
    const live = liveRegion(container);

    await pressKey(container, "b", "Enter");
    await waitFor(() => expect(live.textContent).toBe("Bravo selected"));

    await pressKey(container, "b", "e");
    await waitFor(() =>
      expect(live.textContent).toBe("Edit requested for Bravo")
    );

    await pressKey(container, "b", "ArrowRight", { altKey: true });
    await waitFor(() =>
      expect(live.textContent).toBe(
        "Bravo moved to 2026-10-06 through 2026-10-09"
      )
    );

    await pressKey(container, "b", "ArrowRight", {
      altKey: true,
      shiftKey: true,
    });
    await waitFor(() =>
      expect(live.textContent).toBe(
        "Bravo resized to 2026-10-05 through 2026-10-09"
      )
    );
  });

  it("announces progress changes and rejected changes", async () => {
    const accepted = mountGantt();
    await readyBar(accepted.container);
    const live = liveRegion(accepted.container);

    await pressKey(accepted.container, "b", "]");
    await waitFor(() =>
      expect(live.textContent).toBe("Bravo progress 50 percent")
    );
    accepted.unmount();

    const readOnly = mountGantt({ readOnly: true });
    await readyBar(readOnly.container);
    const rejectedLive = liveRegion(readOnly.container);

    await pressKey(readOnly.container, "b", "]");
    await waitFor(() =>
      expect(rejectedLive.textContent).toBe(
        "Bravo progress change rejected: readonly"
      )
    );
  });
});

describe("Gantt — help text", () => {
  it("links the region to the rendered keyboard help paragraph", () => {
    const { container } = mountGantt();
    const host = container.querySelector<HTMLElement>(".dcf-gantt")!;
    const help = container.querySelector<HTMLElement>(".dcf-gantt__help");

    expect(help).not.toBeNull();
    expect(host.getAttribute("aria-describedby")).toBeTruthy();
    expect(help?.id).toBe(host.getAttribute("aria-describedby"));
    expect(help?.textContent).toContain("Enter or Space to select");
    expect(help?.textContent).toContain("Alt+Shift+Arrow to resize");
    expect(help?.textContent).toContain("[ and ] to change progress");
  });

  it("renders a custom keyboardHelp and keeps it described", () => {
    const { container } = mountGantt({ keyboardHelp: "Custom timeline help" });
    const host = container.querySelector<HTMLElement>(".dcf-gantt")!;
    const help = container.querySelector<HTMLElement>(".dcf-gantt__help");

    expect(help?.textContent).toBe("Custom timeline help");
    expect(host.getAttribute("aria-describedby")).toBe(help?.id);
  });
});

describe("Gantt — tooltip template", () => {
  it("uses the mapped tooltip and escapes tooltip and default content", async () => {
    const items: Task[] = [
      {
        id: "a",
        title: "Alpha",
        start: "2026-10-01",
        end: "2026-10-03",
        progress: 0.2,
        tooltip: "<b>tip</b>",
      },
      {
        id: "b",
        title: "Tom & Jerry",
        start: "2026-10-05",
        end: "2026-10-08",
        progress: 0.4,
      },
    ];
    const { ref, container } = mountGantt({}, items);
    await readyBar(container, "a");
    await readyBar(container, "b");
    const gantt = ref.current!.getGantt()!;
    const tooltip = gantt.templates.tooltip_text!;
    const alpha = gantt.getTask("a");
    const bravo = gantt.getTask("b");

    expect(tooltip(alpha.start_date!, alpha.end_date!, alpha)).toBe(
      "&lt;b&gt;tip&lt;/b&gt;"
    );

    const fallback = tooltip(bravo.start_date!, bravo.end_date!, bravo);
    expect(fallback).toContain("Tom &amp; Jerry");
    expect(fallback).toContain("Start date: 2026-10-05");
    expect(fallback).toContain("End date: 2026-10-08");
  });
});

describe("Gantt — custom grid columns", () => {
  it("renders the columns prop and feeds host tasks to templates", async () => {
    const columns: GanttGridColumn<Task>[] = [
      { name: "text", label: "Work item", tree: true, width: 160 },
      {
        name: "owner",
        label: "Owner",
        width: 120,
        align: "center",
        template: (task) => task.title.toUpperCase(),
      },
    ];
    const { container } = mountGantt({ columns });
    await readyBar(container, "a");

    expect(gridHeadLabels(container)).toEqual(["Work item", "Owner"]);
    const gridData = container.querySelector(".gantt_grid_data");
    expect(gridData?.textContent).toContain("ALPHA");
    expect(gridData?.textContent).toContain("BRAVO");
    expect(gridData?.textContent).not.toContain("Progress");
  });
});

describe("buildGanttMapping — ff and sf dependencies", () => {
  it("emits finish-to-finish and start-to-finish links", () => {
    const tasks: Task[] = [
      { id: "a", title: "A", start: "2026-10-01", end: "2026-10-03", progress: 0 },
      {
        id: "b",
        title: "B",
        start: "2026-10-05",
        end: "2026-10-08",
        progress: 0,
        dependencies: [{ id: "a", type: "ff" }],
      },
      {
        id: "c",
        title: "C",
        start: "2026-10-06",
        end: "2026-10-09",
        progress: 0,
        dependencies: [{ id: "a", type: "sf" }],
      },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);

    expect(mapping.links).toEqual([
      { id: "a->b#0", source: "a", target: "b", type: "ff" },
      { id: "a->c#0", source: "a", target: "c", type: "sf" },
    ]);
    expect(mapping.dependencies.get("b")).toEqual([{ id: "a", type: "ff" }]);
    expect(mapping.dependencies.get("c")).toEqual([{ id: "a", type: "sf" }]);
  });

  it("parses ff and sf links into the renderer with the vendor link codes", async () => {
    const items: Task[] = [
      { id: "a", title: "A", start: "2026-10-01", end: "2026-10-03", progress: 0 },
      {
        id: "b",
        title: "B",
        start: "2026-10-05",
        end: "2026-10-08",
        progress: 0,
        dependencies: [{ id: "a", type: "ff" }],
      },
      {
        id: "c",
        title: "C",
        start: "2026-10-06",
        end: "2026-10-09",
        progress: 0,
        dependencies: [{ id: "a", type: "sf" }],
      },
    ];
    const { ref, container } = mountGantt({}, items);
    await waitFor(() => expect(bar(container, "c")).toBeTruthy());
    const gantt = ref.current!.getGantt()!;

    const links = gantt
      .getLinks()
      .map((link) => ({ id: String(link.id), type: String(link.type) }))
      .sort((left, right) => left.id.localeCompare(right.id));

    expect(links).toEqual([
      { id: "a->b#0", type: "2" },
      { id: "a->c#0", type: "3" },
    ]);
    expect(
      container.querySelectorAll(".gantt_task_link[data-link-id]")
    ).toHaveLength(2);
  });
});

describe("Gantt — drag path resize", () => {
  it("emits an accepted drag resize with Date ranges", async () => {
    const { ref, container, spies } = mountGantt();
    await readyBar(container);
    const gantt = ref.current!.getGantt()!;
    const task = gantt.getTask("b");

    let accepted: boolean | undefined;
    await act(async () => {
      gantt.callEvent("onBeforeTaskDrag", ["b"]);
      accepted = gantt.callEvent("onBeforeTaskChanged", [
        "b",
        "resize",
        {
          ...task,
          start_date: new Date(2026, 9, 5),
          end_date: new Date(2026, 9, 10),
        },
      ]);
      gantt.callEvent("onAfterTaskDrag", ["b", "resize", task]);
    });

    expect(accepted).toBe(true);
    const event = lastEvent<GanttTaskDateChangeEvent<Task>>(
      spies.onTaskDateChanged
    );
    expect(event.taskId).toBe("b");
    expect(event.reason).toBe("drag");
    expect(event.mode).toBe("resize");
    expect(event.current.startDate).toBe("2026-10-05");
    expect(event.current.endDate).toBe("2026-10-10");
  });
});
