import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  KanbanBoard,
  type KanbanCardTemplateContext,
  type KanbanConfig,
  type KanbanSelectionEvent,
  type TaskMoveEvent,
  type TaskMoveRejectedEvent,
  type TaskReorderEvent,
} from "../../src/kanban";
import { useTranslate } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";

interface DemoTask {
  id: string;
  title: string;
  status: string;
  assignee: string;
}

const INITIAL_TASKS: DemoTask[] = [
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

/**
 * @description Interactive demo of the controlled Kanban board.
 * @summary Resolves labels through the application translator at the page level
 * and passes them to {@link KanbanBoard} as plain strings. The page owns all
 * state — tasks, selection, read-only/disabled/loading/error flags and the
 * optional assignee filter — and applies every emitted move, reorder, selection,
 * edit, clear-selection, rejection and retry request to that state, keeping the
 * board purely controlled and emit-only.
 * @returns {React.ReactElement} The kanban demo page.
 */
export function KanbanPage() {
  const translate = useTranslate();
  const nextTaskNumber = useRef(INITIAL_TASKS.length + 1);
  const [tasks, setTasks] = useState<DemoTask[]>(INITIAL_TASKS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterAda, setFilterAda] = useState(false);
  const [lastEvent, setLastEvent] = useState(translate("kanban.no_event"));

  const columns = useMemo(
    () => [
      { id: "todo", title: translate("kanban.columns.todo"), wipLimit: 4 },
      { id: "doing", title: translate("kanban.columns.doing"), wipLimit: 2 },
      { id: "review", title: translate("kanban.columns.review") },
      { id: "done", title: translate("kanban.columns.done") },
    ],
    [translate]
  );

  const config = useMemo<KanbanConfig<DemoTask>>(
    () => ({
      id: (task) => task.id,
      title: (task) => task.title,
      status: (task) => task.status,
      columns,
    }),
    [columns]
  );

  const onMoved = useCallback((event: TaskMoveEvent<DemoTask>) => {
    setTasks((current) => {
      const next = current.filter((task) => task.id !== event.task.id);
      const target = next.filter((task) => task.status === event.toColumn);
      const insertAt =
        event.currentIndex >= 0 && event.currentIndex <= target.length
          ? event.currentIndex
          : target.length;
      const moved = { ...event.task, status: event.toColumn };
      const targetIndex = next.findIndex(
        (task) => task.status === event.toColumn
      );
      const before =
        targetIndex < 0
          ? next.length
          : targetIndex + Math.min(insertAt, target.length);
      next.splice(before, 0, moved);
      return next;
    });
    setLastEvent(
      `taskMoved: ${event.task.id} -> ${event.toColumn} @ ${event.currentIndex}`
    );
  }, []);

  const onReordered = useCallback((event: TaskReorderEvent<DemoTask>) => {
    setTasks((current) => {
      const columnTasks = current.filter(
        (task) => task.status === event.column
      );
      const others = current.filter((task) => task.status !== event.column);
      const from = columnTasks.findIndex((task) => task.id === event.task.id);
      if (from < 0) {
        return current;
      }
      const reordered = columnTasks.slice();
      const [moved] = reordered.splice(from, 1);
      reordered.splice(
        Math.min(Math.max(event.currentIndex, 0), reordered.length),
        0,
        moved
      );
      return [...others, ...reordered];
    });
    setLastEvent(`taskReordered: ${event.task.id} @ ${event.currentIndex}`);
  }, []);

  const onSelected = useCallback((event: KanbanSelectionEvent<DemoTask>) => {
    setSelectedId(event.task.id);
    setLastEvent(`taskSelected: ${event.task.id}`);
  }, []);

  const onEditRequested = useCallback(
    (event: KanbanSelectionEvent<DemoTask>) => {
      setLastEvent(`taskEditRequested: ${event.task.id}`);
    },
    []
  );

  const onRejected = useCallback((event: TaskMoveRejectedEvent<DemoTask>) => {
    setLastEvent(`taskMoveRejected: ${event.task.id} ${event.reason}`);
  }, []);

  const onRetry = useCallback(() => {
    setError(null);
    setLastEvent("retryRequested");
  }, []);

  const onSelectionCleared = useCallback(() => {
    setSelectedId(null);
    setLastEvent("selectionCleared");
  }, []);

  const addTask = useCallback(() => {
    const number = nextTaskNumber.current;
    nextTaskNumber.current += 1;
    const id = `task-${number}`;
    setTasks((current) => [
      ...current,
      {
        id,
        title: `New task ${number}`,
        status: "todo",
        assignee: "You",
      },
    ]);
    setLastEvent(`taskAdded: ${id}`);
  }, []);

  const clear = useCallback(() => {
    setTasks([]);
    setLastEvent("All tasks cleared.");
  }, []);

  const reset = useCallback(() => {
    setTasks(INITIAL_TASKS);
    setSelectedId(null);
    setReadOnly(false);
    setDisabled(false);
    setLoading(false);
    setError(null);
    setFilterAda(false);
    setLastEvent("Board reset.");
  }, []);

  const renderCard = useCallback(
    (context: KanbanCardTemplateContext<DemoTask>) => (
      <>
        <strong className="kanban-page__card-title">
          {context.task.title}
        </strong>
        <span className="kanban-page__card-meta">
          {context.task.assignee} · {context.column.title} · #
          {context.index + 1}
        </span>
      </>
    ),
    []
  );

  return (
    <section className="app-page kanban-page" aria-labelledby="kanban-title">
      <CardTitle title="kanban.title" subtitle="kanban.intro" />
      <h2 id="kanban-title" className="app-visually-hidden">
        {translate("kanban.title")}
      </h2>

      <div
        className="kanban-page__toolbar"
        role="toolbar"
        aria-label={translate("kanban.demo_label")}
      >
        <button type="button" data-testid="kanban-add" onClick={addTask}>
          {translate("kanban.add_card")}
        </button>
        <button type="button" data-testid="kanban-reset" onClick={reset}>
          {translate("kanban.reset")}
        </button>
        <button type="button" data-testid="kanban-clear" onClick={clear}>
          {translate("kanban.clear")}
        </button>
        <label>
          <input
            type="checkbox"
            data-testid="kanban-readonly"
            checked={readOnly}
            onChange={() => setReadOnly((value) => !value)}
          />
          {translate("kanban.read_only")}
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="kanban-disabled"
            checked={disabled}
            onChange={() => setDisabled((value) => !value)}
          />
          {translate("kanban.disabled")}
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="kanban-loading"
            checked={loading}
            onChange={() => setLoading((value) => !value)}
          />
          {translate("kanban.loading")}
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="kanban-error"
            checked={!!error}
            onChange={() =>
              setError((value) =>
                value ? null : translate("kanban.error_message")
              )
            }
          />
          {translate("kanban.error")}
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="kanban-filter"
            checked={filterAda}
            onChange={() => setFilterAda((value) => !value)}
          />
          {translate("kanban.filter")}
        </label>
        <output
          data-testid="kanban-last-event"
          className="kanban-page__last-event"
          aria-live="polite"
        >
          {lastEvent}
        </output>
      </div>

      <div className="kanban-page__board" data-testid="kanban-board">
        <KanbanBoard
          items={tasks}
          config={config}
          selectedId={selectedId}
          readOnly={readOnly}
          disabled={disabled}
          loading={loading}
          error={error}
          filter={filterAda ? (task) => task.assignee === "Ada" : null}
          label={translate("kanban.label")}
          emptyMessage={translate("kanban.empty")}
          loadingMessage={translate("kanban.loading_message")}
          errorMessage={translate("kanban.error_message")}
          retryLabel={translate("kanban.retry")}
          keyboardHelp={translate("kanban.keyboard_help")}
          renderCard={renderCard}
          onTaskMoved={onMoved}
          onTaskReordered={onReordered}
          onTaskSelected={onSelected}
          onTaskEditRequested={onEditRequested}
          onSelectionCleared={onSelectionCleared}
          onTaskMoveRejected={onRejected}
          onRetryRequested={onRetry}
        />
      </div>
    </section>
  );
}
