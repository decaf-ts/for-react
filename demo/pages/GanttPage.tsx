import React, { useMemo, useState } from "react";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import "../../src/gantt/components/gantt/gantt.css";
import {
  Gantt,
  type GanttBarTemplateContext,
  type GanttConfig,
  type GanttLocaleName,
  type GanttTaskDateChangeEvent,
  type GanttTaskSelectionEvent,
  type GanttViewScale,
} from "../../src/gantt";
import { CardTitle } from "../components/CardTitle";

interface DemoTask {
  id: string;
  title: string;
  start: string;
  end: string;
  progress: number;
  parentId?: string;
  dependencies?: string[];
  milestone?: boolean;
}

const INITIAL_TASKS: DemoTask[] = [
  {
    id: "discovery",
    title: "Discovery and compatibility gate",
    start: "2026-10-05",
    end: "2026-10-09",
    progress: 1,
  },
  {
    id: "adapter",
    title: "Typed Gantt adapter",
    start: "2026-10-12",
    end: "2026-10-20",
    progress: 0.65,
    parentId: "discovery",
    dependencies: ["discovery"],
  },
  {
    id: "mapping",
    title: "Task and dependency mapping",
    start: "2026-10-14",
    end: "2026-10-23",
    progress: 0.4,
    parentId: "discovery",
    dependencies: ["adapter"],
  },
  {
    id: "theme",
    title: "Theme adapter and stylesheet isolation",
    start: "2026-10-21",
    end: "2026-10-27",
    progress: 0.2,
    dependencies: ["adapter"],
  },
  {
    id: "review",
    title: "Compatibility review",
    start: "2026-10-28",
    end: "2026-10-28",
    progress: 0,
    milestone: true,
    dependencies: ["mapping", "theme"],
  },
];

const LOCALES: readonly { value: GanttLocaleName; label: string }[] = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "jp", label: "日本語" },
  { value: "ru", label: "Русский" },
  { value: "cn", label: "简体中文" },
  { value: "zh_tw", label: "繁體中文" },
];

export function GanttPage() {
  const [tasks, setTasks] = useState<DemoTask[]>(INITIAL_TASKS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<GanttViewScale>("week");
  const [locale, setLocale] = useState<GanttLocaleName>("en");
  const [lastEvent, setLastEvent] = useState("No Gantt event yet.");

  const config = useMemo<GanttConfig<DemoTask>>(
    () => ({
      id: (task) => task.id,
      title: (task) => task.title,
      start: (task) => task.start,
      end: (task) => task.end,
      progress: (task) => task.progress,
      parent: (task) => task.parentId,
      dependencies: (task) => task.dependencies,
      milestone: (task) => Boolean(task.milestone),
      editable: () => true,
      tooltip: (task) => task.title,
    }),
    []
  );

  const onSelected = (event: GanttTaskSelectionEvent<DemoTask>) => {
    setSelectedId(event.taskId);
    setLastEvent(`taskSelected: ${event.taskId}`);
  };

  const onEditRequested = (event: GanttTaskSelectionEvent<DemoTask>) => {
    setLastEvent(`taskEditRequested: ${event.taskId}`);
  };

  const onDateChanged = (event: GanttTaskDateChangeEvent<DemoTask>) => {
    if (!event.current.startDate || !event.current.endDate) return;
    setTasks((current) =>
      current.map((task) =>
        task.id === event.taskId
          ? {
              ...task,
              start: event.current.startDate as string,
              end: event.current.endDate as string,
            }
          : task
      )
    );
    setLastEvent(
      `taskDateChanged: ${event.taskId} ${event.current.startDate} -> ${event.current.endDate} (${event.mode})`
    );
  };

  const reset = () => {
    setTasks(INITIAL_TASKS);
    setSelectedId(null);
    setReadOnly(false);
    setLoading(false);
    setError(null);
    setViewType("week");
    setLocale("en");
    setLastEvent("Gantt demo reset.");
  };

  const renderBar = (context: GanttBarTemplateContext<DemoTask>) =>
    `${context.title} · ${context.progressPercent}%${
      context.milestone ? " · milestone" : ""
    }`;

  return (
    <section className="app-page gantt-page" aria-labelledby="gantt-title">
      <CardTitle title="Gantt" subtitle="Typed timeline over the dhtmlx-gantt Community renderer." />
      <h2 id="gantt-title" className="app-visually-hidden">
        Gantt
      </h2>

      <div
        className="gantt-page__toolbar"
        role="toolbar"
        aria-label="Gantt demo controls"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}
      >
        <button type="button" data-testid="gantt-reset" onClick={reset}>
          Reset
        </button>
        <label>
          <input
            type="checkbox"
            data-testid="gantt-readonly"
            checked={readOnly}
            onChange={() => setReadOnly((value) => !value)}
          />{" "}
          Read only
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="gantt-loading"
            checked={loading}
            onChange={() => setLoading((value) => !value)}
          />{" "}
          Loading
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="gantt-error"
            checked={Boolean(error)}
            onChange={() =>
              setError((value) =>
                value ? null : "The timeline could not be loaded. Try again."
              )
            }
          />{" "}
          Error
        </label>
        <label>
          Locale{" "}
          <select
            data-testid="gantt-locale"
            value={locale}
            onChange={(event) => setLocale(event.target.value as GanttLocaleName)}
          >
            {LOCALES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <output data-testid="gantt-last-event" aria-live="polite">
          {lastEvent}
        </output>
      </div>

      <div data-testid="gantt-timeline">
        <Gantt<DemoTask>
          items={tasks}
          config={config}
          selectedId={selectedId}
          readOnly={readOnly}
          loading={loading}
          error={error}
          viewType={viewType}
          locale={locale}
          label="Delivery timeline"
          renderBar={renderBar}
          onViewTypeChange={(next) => {
            setViewType(next);
            setLastEvent(`viewTypeChange: ${next}`);
          }}
          onTaskSelected={onSelected}
          onTaskEditRequested={onEditRequested}
          onTaskDateChanged={onDateChanged}
          onTaskDateChangeRejected={(event) =>
            setLastEvent(
              `taskDateChangeRejected: ${event.taskId} ${event.reason}`
            )
          }
          onTaskProgressChanged={(event) =>
            setLastEvent(
              `taskProgressChanged: ${event.taskId} ${Math.round(
                event.current * 100
              )}%`
            )
          }
          onTaskProgressChangeRejected={(event) =>
            setLastEvent(
              `taskProgressChangeRejected: ${event.taskId} ${event.reason}`
            )
          }
          onRetryRequested={() => {
            setError(null);
            setLastEvent("retryRequested");
          }}
          renderTaskDetail={(context) => (
            <dl className="gantt-page__detail">
              <dt>Task</dt>
              <dd>{context.title}</dd>
              <dt>Identifier</dt>
              <dd>{context.taskId}</dd>
            </dl>
          )}
        />
      </div>
    </section>
  );
}
