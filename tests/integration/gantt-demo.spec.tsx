/**
 * SAA-1843 — end-to-end coverage of `demo/pages/GanttPage.tsx`.
 *
 * Reference: `for-angular/tests/gantt/playwright/gantt.spec.ts`. `for-react` has
 * no Playwright lane, so the browser interactions are exercised against the
 * real dhtmlx-gantt Community renderer under jsdom. The renderer measures its
 * container with `offsetHeight`/`clientHeight`; those are stubbed per file so
 * rows and bars are laid out. Assertions that need a live browser layout
 * (drag handles, pixel geometry, axe) are intentionally deferred.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GanttPage } from "../../demo/pages/GanttPage";

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

function taskBar(container: HTMLElement, taskId: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    `.gantt_task_content[data-gantt-task-id="${taskId}"]`
  );
  if (!element) throw new Error(`Rendered bar "${taskId}" was not found`);
  return element;
}

function taskLine(container: HTMLElement, taskId: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    `.gantt_task_line[data-task-id="${taskId}"]`
  );
}

async function readyDemo(container: HTMLElement): Promise<void> {
  await waitFor(() => expect(taskBar(container, "theme")).toBeTruthy());
}

function lastEvent(): string {
  return screen.getByTestId("gantt-last-event").textContent ?? "";
}

function gridHeadLabels(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll(".gantt_grid_head_cell")
  ).map((cell) => cell.textContent ?? "");
}

function scaleText(container: HTMLElement): string {
  return Array.from(container.querySelectorAll(".gantt_scale_cell"))
    .map((cell) => cell.textContent ?? "")
    .join(" ");
}

function pressBar(
  container: HTMLElement,
  taskId: string,
  key: string,
  init: KeyboardEventInit = {}
): void {
  fireEvent.keyDown(taskBar(container, taskId), {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
}

describe("Gantt demo page — timeline rendering", () => {
  it("renders every task bar, dependency links and the milestone", async () => {
    const { container } = render(<GanttPage />);
    await readyDemo(container);

    expect(lastEvent()).toBe("No Gantt event yet.");
    expect(container.querySelectorAll(".gantt_task_line")).toHaveLength(5);
    for (const id of ["discovery", "adapter", "mapping", "theme", "review"]) {
      expect(taskLine(container, id)).not.toBeNull();
    }

    const links = container.querySelectorAll(".gantt_task_link[data-link-id]");
    expect(links).toHaveLength(3);
    expect(
      container.querySelector('[data-link-id="discovery->adapter#0"]')
    ).not.toBeNull();

    const milestone = taskLine(container, "review");
    expect(milestone?.classList.contains("dcf-gantt__bar--milestone")).toBe(
      true
    );
    expect(milestone?.classList.contains("gantt_milestone")).toBe(true);
  });

  it("renders the group hierarchy and progress column", async () => {
    const { container } = render(<GanttPage />);
    await readyDemo(container);

    expect(container.querySelectorAll(".gantt_grid_data .gantt_row")).toHaveLength(
      5
    );
    expect(scaleText(container).length).toBeGreaterThan(0);
    expect(
      Array.from(container.querySelectorAll(".dcf-gantt__table-progress")).some(
        (cell) => cell.textContent === "65%"
      )
    ).toBe(true);
  });
});

describe("Gantt demo page — toolbar and locale", () => {
  it("switches the timeline scale and reports viewTypeChange", async () => {
    const { container } = render(<GanttPage />);
    await readyDemo(container);

    expect(
      container
        .querySelector('[data-gantt-view="week"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true");

    fireEvent.click(
      container.querySelector('[data-gantt-view="day"]') as HTMLElement
    );
    await waitFor(() => expect(lastEvent()).toBe("viewTypeChange: day"));
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

    fireEvent.click(
      container.querySelector('[data-gantt-view="month"]') as HTMLElement
    );
    await waitFor(() => expect(lastEvent()).toBe("viewTypeChange: month"));
  });

  it("localizes the grid and calendar labels from the locale selector", async () => {
    const { container } = render(<GanttPage />);
    await readyDemo(container);

    expect(gridHeadLabels(container)[0]).toBe("Task name");

    fireEvent.change(screen.getByTestId("gantt-locale"), {
      target: { value: "de" },
    });
    await waitFor(() => expect(gridHeadLabels(container)[0]).toBe("Vorgangsname"));

    fireEvent.change(screen.getByTestId("gantt-locale"), {
      target: { value: "jp" },
    });
    await waitFor(() => expect(gridHeadLabels(container)[0]).toBe("タスク名"));
    await waitFor(() => expect(scaleText(container)).toContain("9月"));

    fireEvent.change(screen.getByTestId("gantt-locale"), {
      target: { value: "ru" },
    });
    await waitFor(() => expect(gridHeadLabels(container)[0]).toBe("Задача"));

    fireEvent.change(screen.getByTestId("gantt-locale"), {
      target: { value: "cn" },
    });
    await waitFor(() => expect(gridHeadLabels(container)[0]).toBe("任务名称"));

    fireEvent.change(screen.getByTestId("gantt-locale"), {
      target: { value: "zh_tw" },
    });
    await waitFor(() => expect(gridHeadLabels(container)[0]).toBe("任務名稱"));
  });
});

describe("Gantt demo page — host states", () => {
  it("toggles read-only and rejects an edit with the readonly reason", async () => {
    const { container } = render(<GanttPage />);
    await readyDemo(container);

    fireEvent.click(screen.getByTestId("gantt-readonly"));
    await waitFor(() =>
      expect(container.querySelector(".dcf-gantt--readonly")).not.toBeNull()
    );
    await readyDemo(container);

    pressBar(container, "theme", "ArrowRight", { altKey: true });
    await waitFor(() =>
      expect(lastEvent()).toBe("taskDateChangeRejected: theme readonly")
    );
  });

  it("shows the loading state without the toolbar or renderer", async () => {
    const { container } = render(<GanttPage />);
    await readyDemo(container);

    fireEvent.click(screen.getByTestId("gantt-loading"));
    await waitFor(() =>
      expect(container.querySelector(".dcf-gantt__state--loading")).not.toBeNull()
    );
    expect(container.querySelector(".dcf-gantt__toolbar")).toBeNull();
    expect(container.querySelector(".gantt_grid")).toBeNull();

    fireEvent.click(screen.getByTestId("gantt-loading"));
    await readyDemo(container);
  });

  it("shows the error state and clears it through the retry button", async () => {
    const { container } = render(<GanttPage />);
    await readyDemo(container);

    fireEvent.click(screen.getByTestId("gantt-error"));
    await waitFor(() =>
      expect(container.querySelector(".dcf-gantt__state--error")).not.toBeNull()
    );
    expect(
      container.querySelector(".dcf-gantt__state--error")?.getAttribute("role")
    ).toBe("alert");
    expect(
      container.querySelector(".dcf-gantt__state--error")?.textContent
    ).toContain("The timeline could not be loaded");

    fireEvent.click(
      container.querySelector(".dcf-gantt__retry") as HTMLElement
    );
    await waitFor(() =>
      expect(container.querySelector(".dcf-gantt__state--error")).toBeNull()
    );
    expect(lastEvent()).toBe("retryRequested");
    await readyDemo(container);
  });

  it("resets scale, locale, read-only, and the last event", async () => {
    const { container } = render(<GanttPage />);
    await readyDemo(container);

    fireEvent.click(
      container.querySelector('[data-gantt-view="day"]') as HTMLElement
    );
    fireEvent.change(screen.getByTestId("gantt-locale"), {
      target: { value: "de" },
    });
    fireEvent.click(screen.getByTestId("gantt-readonly"));
    await waitFor(() =>
      expect(container.querySelector(".dcf-gantt--readonly")).not.toBeNull()
    );

    fireEvent.click(screen.getByTestId("gantt-reset"));

    await waitFor(() => expect(lastEvent()).toBe("Gantt demo reset."));
    expect(
      container
        .querySelector('[data-gantt-view="week"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true");
    expect(container.querySelector(".dcf-gantt--readonly")).toBeNull();
    expect((screen.getByTestId("gantt-locale") as HTMLSelectElement).value).toBe(
      "en"
    );
    await waitFor(() => expect(gridHeadLabels(container)[0]).toBe("Task name"));
    await readyDemo(container);
  });
});

describe("Gantt demo page — events and task detail", () => {
  it("reports selection, edit requests and the projected detail panel", async () => {
    const { container } = render(<GanttPage />);
    await readyDemo(container);

    pressBar(container, "theme", "Enter");
    await waitFor(() => expect(lastEvent()).toBe("taskSelected: theme"));

    pressBar(container, "theme", "e");
    await waitFor(() => expect(lastEvent()).toBe("taskEditRequested: theme"));

    const detail = container.querySelector(".dcf-gantt__detail");
    expect(detail).not.toBeNull();
    expect(detail?.getAttribute("role")).toBe("dialog");
    expect(detail?.getAttribute("aria-label")).toBe(
      "Theme adapter and stylesheet isolation"
    );
    expect(detail?.textContent).toContain("Theme adapter and stylesheet isolation");
    expect(detail?.textContent).toContain("Identifier");
    expect(detail?.textContent).toContain("theme");

    fireEvent.click(
      detail?.querySelector(".dcf-gantt__detail-close") as HTMLElement
    );
    expect(container.querySelector(".dcf-gantt__detail")).toBeNull();
  });

  it("reports accepted date and progress changes from the keyboard", async () => {
    const { container } = render(<GanttPage />);
    await readyDemo(container);

    pressBar(container, "theme", "ArrowRight", { altKey: true });
    await waitFor(() =>
      expect(lastEvent()).toBe(
        "taskDateChanged: theme 2026-10-22 -> 2026-10-28 (move)"
      )
    );
    await readyDemo(container);

    pressBar(container, "theme", "]");
    await waitFor(() => expect(lastEvent()).toBe("taskProgressChanged: theme 30%"));
  });

  it("reports a dependency violation from the keyboard", async () => {
    const { container } = render(<GanttPage />);
    await readyDemo(container);

    pressBar(container, "adapter", "ArrowLeft", { altKey: true });
    await waitFor(() =>
      expect(lastEvent()).toBe(
        "taskDateChangeRejected: adapter dependency-violation"
      )
    );
  });
});
