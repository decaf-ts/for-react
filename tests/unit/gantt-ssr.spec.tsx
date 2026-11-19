/**
 * @jest-environment node
 *
 * SAA-1843 — server-render coverage for the `/gantt` subpath.
 *
 * `Gantt` selects its SSR branch from `typeof window`/`typeof document` at
 * render time. A jsdom file cannot force those globals to be undefined (jsdom
 * installs them as non-configurable accessors), so this suite runs under the
 * `node` environment and stringifies the component with `react-dom/server`.
 *
 * Reference: `for-angular/tests/gantt/functional/gantt-functional.spec.ts`
 * ("renders a sized placeholder and no vendor DOM during SSR").
 */
import React from "react";
import { renderToString } from "react-dom/server";
import { Gantt, type GanttConfig } from "../../src/gantt";

interface Task {
  id: string;
  title: string;
  start: string;
  end: string;
  progress: number;
}

const CONFIG: GanttConfig<Task> = {
  id: (task) => task.id,
  title: (task) => task.title,
  start: (task) => task.start,
  end: (task) => task.end,
  progress: (task) => task.progress,
};

const ITEMS: Task[] = [
  {
    id: "a",
    title: "Alpha",
    start: "2026-10-01",
    end: "2026-10-03",
    progress: 0.2,
  },
  {
    id: "b",
    title: "Bravo",
    start: "2026-10-05",
    end: "2026-10-08",
    progress: 0.4,
  },
];

describe("Gantt — SSR", () => {
  it("renders a placeholder and never evaluates the vendor renderer", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");

    const html = renderToString(<Gantt<Task> items={ITEMS} config={CONFIG} />);

    expect(html).toContain("dcf-gantt__ssr-placeholder");
    expect(html).toContain("dcf-gantt__toolbar");
    expect(html).not.toContain("gantt_grid");
    expect(html).not.toContain("gantt_task_line");
    expect(html).not.toContain("gantt_task_content");
  });

  it("renders the empty state instead of a renderer during SSR", () => {
    const html = renderToString(<Gantt<Task> items={[]} config={CONFIG} />);

    expect(html).toContain("dcf-gantt__state--empty");
    expect(html).not.toContain("dcf-gantt__ssr-placeholder");
    expect(html).not.toContain("gantt_grid");
  });
});
