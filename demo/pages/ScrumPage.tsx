import React, { useCallback, useMemo, useState } from "react";
import {
  Backlog,
  SprintBoard,
  SprintSelector,
  type BacklogReorderEvent,
  type BacklogReorderRejectedEvent,
  type ScrumConfig,
  type ScrumSprint,
  type SprintAssignmentRejectedEvent,
  type SprintAssignmentRequestedEvent,
  type SprintBoardMoveEvent,
  type SprintBoardMoveRejectedEvent,
  type SprintBoardReorderEvent,
  type SprintSelectionEvent,
} from "../../src/scrum";
import type { KanbanSelectionEvent } from "../../src/kanban";
import { useTranslate } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";

interface DemoTask {
  id: string;
  titleKey: string;
  status: string;
  sprintId: string | null;
  assignee: string;
}

const INITIAL_TASKS: DemoTask[] = [
  {
    id: "task-1",
    titleKey: "scrum.tasks.t1",
    status: "todo",
    sprintId: null,
    assignee: "Ada",
  },
  {
    id: "task-2",
    titleKey: "scrum.tasks.t2",
    status: "todo",
    sprintId: null,
    assignee: "Grace",
  },
  {
    id: "task-3",
    titleKey: "scrum.tasks.t3",
    status: "todo",
    sprintId: null,
    assignee: "Linus",
  },
  {
    id: "task-4",
    titleKey: "scrum.tasks.t4",
    status: "todo",
    sprintId: null,
    assignee: "Ada",
  },
  {
    id: "task-5",
    titleKey: "scrum.tasks.t5",
    status: "done",
    sprintId: "sprint-1",
    assignee: "Ada",
  },
  {
    id: "task-6",
    titleKey: "scrum.tasks.t6",
    status: "doing",
    sprintId: "sprint-1",
    assignee: "Grace",
  },
  {
    id: "task-7",
    titleKey: "scrum.tasks.t7",
    status: "review",
    sprintId: "sprint-1",
    assignee: "Linus",
  },
  {
    id: "task-8",
    titleKey: "scrum.tasks.t8",
    status: "todo",
    sprintId: "sprint-1",
    assignee: "Ada",
  },
  {
    id: "task-9",
    titleKey: "scrum.tasks.t9",
    status: "todo",
    sprintId: "sprint-2",
    assignee: "Grace",
  },
  {
    id: "task-10",
    titleKey: "scrum.tasks.t10",
    status: "doing",
    sprintId: "sprint-2",
    assignee: "Linus",
  },
];

const SPRINT_KEYS = ["sprint-1", "sprint-2", "sprint-3"] as const;

export function ScrumPage() {
  const translate = useTranslate();
  const [tasks, setTasks] = useState<DemoTask[]>(INITIAL_TASKS);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(
    "sprint-1"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastEvent, setLastEvent] = useState(translate("scrum.no_event"));

  const columns = useMemo(
    () => [
      { id: "todo", title: translate("scrum.columns.todo"), wipLimit: 4 },
      { id: "doing", title: translate("scrum.columns.doing") },
      { id: "review", title: translate("scrum.columns.review") },
      { id: "done", title: translate("scrum.columns.done") },
    ],
    [translate]
  );

  const config = useMemo<ScrumConfig<DemoTask>>(
    () => ({
      id: (task) => task.id,
      title: (task) => translate(task.titleKey),
      status: (task) => task.status,
      sprint: (task) => task.sprintId,
      columns,
    }),
    [columns, translate]
  );

  const sprints = useMemo<readonly ScrumSprint[]>(
    () =>
      SPRINT_KEYS.map((id, index) => ({
        id,
        title: translate(`scrum.sprints.sprint_${index + 1}`),
      })),
    [translate]
  );

  const filter = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return null;
    }
    return (task: DemoTask) =>
      translate(task.titleKey).toLowerCase().includes(term) ||
      task.assignee.toLowerCase().includes(term);
  }, [search, translate]);

  const onSprintSelected = useCallback((event: SprintSelectionEvent) => {
    setSelectedSprintId(event.sprintId);
    setLastEvent(`sprintSelected: ${event.sprintId ?? "none"}`);
  }, []);

  const onBacklogReordered = useCallback(
    (event: BacklogReorderEvent<DemoTask>) => {
      setTasks((current) =>
        reorderWithin(
          current,
          event.task.id,
          (task) => !task.sprintId,
          event.currentIndex
        )
      );
      setLastEvent(`backlogReordered: ${event.task.id} @ ${event.currentIndex}`);
    },
    []
  );

  const onBacklogRejected = useCallback(
    (event: BacklogReorderRejectedEvent<DemoTask>) => {
      setLastEvent(`backlogReorderRejected: ${event.task.id} ${event.reason}`);
    },
    []
  );

  const onAssignmentRequested = useCallback(
    (event: SprintAssignmentRequestedEvent<DemoTask>) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === event.task.id
            ? { ...task, sprintId: event.sprintId }
            : task
        )
      );
      setLastEvent(
        `sprintAssignmentRequested: ${event.task.id} -> ${event.sprintId}`
      );
    },
    []
  );

  const onAssignmentRejected = useCallback(
    (event: SprintAssignmentRejectedEvent<DemoTask>) => {
      setLastEvent(
        `sprintAssignmentRejected: ${event.task.id} ${event.reason}`
      );
    },
    []
  );

  const onMoved = useCallback((event: SprintBoardMoveEvent<DemoTask>) => {
    setTasks((current) =>
      moveWithin(
        current,
        event.task.id,
        event.sprintId,
        event.toColumn,
        event.currentIndex
      )
    );
    setLastEvent(
      `taskMoved: ${event.task.id} -> ${event.toColumn} @ ${event.currentIndex}`
    );
  }, []);

  const onReordered = useCallback(
    (event: SprintBoardReorderEvent<DemoTask>) => {
      setTasks((current) =>
        reorderWithin(
          current,
          event.task.id,
          (task) =>
            task.sprintId === event.sprintId && task.status === event.column,
          event.currentIndex
        )
      );
      setLastEvent(`taskReordered: ${event.task.id} @ ${event.currentIndex}`);
    },
    []
  );

  const onSelected = useCallback(
    (event: KanbanSelectionEvent<DemoTask>) => {
      setSelectedId(event.task.id);
      setLastEvent(`taskSelected: ${event.task.id}`);
    },
    []
  );

  const onEditRequested = useCallback(
    (event: KanbanSelectionEvent<DemoTask>) => {
      setLastEvent(`taskEditRequested: ${event.task.id}`);
    },
    []
  );

  const onSelectionCleared = useCallback(() => {
    setSelectedId(null);
    setLastEvent("selectionCleared");
  }, []);

  const onBoardRejected = useCallback(
    (event: SprintBoardMoveRejectedEvent<DemoTask>) => {
      setLastEvent(`taskMoveRejected: ${event.task.id} ${event.reason}`);
    },
    []
  );

  const onRetry = useCallback(() => {
    setError(null);
    setLastEvent("retryRequested");
  }, []);

  const reset = useCallback(() => {
    setTasks(INITIAL_TASKS);
    setSelectedSprintId("sprint-1");
    setSelectedId(null);
    setSearch("");
    setReadOnly(false);
    setLoading(false);
    setError(null);
    setLastEvent("Scrum demo reset.");
  }, []);

  const toggleError = useCallback(() => {
    setError((value) =>
      value ? null : translate("scrum.error_message")
    );
  }, [translate]);

  const emptyBacklog = translate("scrum.empty_backlog");
  const loadingBacklog = translate("scrum.loading_backlog");
  const errorBacklog = translate("scrum.error_backlog");
  const emptySprint = translate("scrum.empty_sprint");
  const loadingSprint = translate("scrum.loading_sprint");
  const errorSprint = translate("scrum.error_sprint");
  const retryLabel = translate("scrum.retry");
  const assignmentLabel = translate("scrum.assign_to_sprint");
  const assignmentPlaceholder = translate("scrum.assign_placeholder");

  return (
    <section className="app-page scrum-page" aria-labelledby="scrum-title">
      <CardTitle title="scrum.title" subtitle="scrum.intro" />
      <h2 id="scrum-title" className="app-visually-hidden">
        {translate("scrum.title")}
      </h2>

      <section
        className="scrum-page__toolbar"
        aria-label={translate("scrum.demo_label")}
      >
        <button type="button" data-testid="scrum-reset" onClick={reset}>
          {translate("scrum.reset")}
        </button>
        <label className="scrum-page__search">
          <span>{translate("scrum.search")}</span>
          <input
            type="search"
            data-testid="scrum-search"
            placeholder={translate("scrum.search_placeholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="scrum-readonly"
            checked={readOnly}
            onChange={() => setReadOnly((value) => !value)}
          />
          {translate("scrum.read_only")}
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="scrum-loading"
            checked={loading}
            onChange={() => setLoading((value) => !value)}
          />
          {translate("scrum.loading")}
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="scrum-error"
            checked={!!error}
            onChange={toggleError}
          />
          {translate("scrum.error")}
        </label>
        <output
          data-testid="scrum-last-event"
          className="scrum-page__last-event"
          aria-live="polite"
        >
          {lastEvent}
        </output>
      </section>

      <section
        className="scrum-page__section"
        aria-label={translate("scrum.sprint_selection")}
        data-testid="scrum-sprint-selector"
      >
        <SprintSelector
          sprints={sprints}
          selectedSprintId={selectedSprintId}
          label={translate("scrum.sprint_label")}
          placeholder={translate("scrum.sprint_placeholder")}
          disabled={loading}
          loading={loading}
          onSprintSelected={onSprintSelected}
        />
      </section>

      <section
        className="scrum-page__section"
        aria-label={translate("scrum.backlog")}
        data-testid="scrum-backlog"
      >
        <h3 className="scrum-page__heading">{translate("scrum.backlog")}</h3>
        <Backlog
          items={tasks}
          config={config}
          sprints={sprints}
          selectedId={selectedId}
          readOnly={readOnly}
          loading={loading}
          error={error}
          filter={filter}
          label={translate("scrum.backlog_tasks")}
          columnTitle={translate("scrum.backlog")}
          emptyMessage={emptyBacklog}
          loadingMessage={loadingBacklog}
          errorMessage={errorBacklog}
          retryLabel={retryLabel}
          assignmentLabel={assignmentLabel}
          assignmentPlaceholder={assignmentPlaceholder}
          onBacklogReordered={onBacklogReordered}
          onBacklogReorderRejected={onBacklogRejected}
          onSprintAssignmentRequested={onAssignmentRequested}
          onSprintAssignmentRejected={onAssignmentRejected}
          onTaskSelected={onSelected}
          onTaskEditRequested={onEditRequested}
          onSelectionCleared={onSelectionCleared}
          onRetryRequested={onRetry}
        />
      </section>

      {selectedSprintId ? (
        <section
          className="scrum-page__section"
          aria-label={translate("scrum.sprint_board")}
          data-testid="scrum-sprint-board"
        >
          <h3 className="scrum-page__heading">
            {translate("scrum.sprint_board")}
          </h3>
          <SprintBoard
            items={tasks}
            config={config}
            sprintId={selectedSprintId}
            selectedId={selectedId}
            readOnly={readOnly}
            loading={loading}
            error={error}
            filter={filter}
            label={translate("scrum.sprint_board_tasks")}
            emptyMessage={emptySprint}
            loadingMessage={loadingSprint}
            errorMessage={errorSprint}
            retryLabel={retryLabel}
            onTaskMoved={onMoved}
            onTaskReordered={onReordered}
            onTaskSelected={onSelected}
            onTaskEditRequested={onEditRequested}
            onSelectionCleared={onSelectionCleared}
            onTaskMoveRejected={onBoardRejected}
            onRetryRequested={onRetry}
          />
        </section>
      ) : (
        <p className="scrum-page__hint" data-testid="scrum-no-sprint">
          {translate("scrum.select_sprint_hint")}
        </p>
      )}
    </section>
  );
}

function reorderWithin(
  tasks: DemoTask[],
  taskId: string,
  matches: (task: DemoTask) => boolean,
  currentIndex: number
): DemoTask[] {
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index < 0) {
    return tasks;
  }
  const next = tasks.slice();
  const [task] = next.splice(index, 1);
  const group = next.filter(matches);
  const insertAt = Math.min(Math.max(currentIndex, 0), group.length);
  const anchor = group[insertAt];
  const targetIndex = anchor
    ? next.findIndex((candidate) => candidate.id === anchor.id)
    : lastMatchingIndex(next, matches) + 1;
  next.splice(targetIndex < 0 ? next.length : targetIndex, 0, task);
  return next;
}

function lastMatchingIndex(
  tasks: DemoTask[],
  matches: (task: DemoTask) => boolean
): number {
  for (let index = tasks.length - 1; index >= 0; index -= 1) {
    if (matches(tasks[index])) {
      return index;
    }
  }
  return -1;
}

function moveWithin(
  tasks: DemoTask[],
  taskId: string,
  sprintId: string,
  status: string,
  currentIndex: number
): DemoTask[] {
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index < 0) {
    return tasks;
  }
  const next = tasks.slice();
  const [task] = next.splice(index, 1);
  const moved = { ...task, status };
  const group = next.filter(
    (candidate) => candidate.sprintId === sprintId && candidate.status === status
  );
  const insertAt = Math.min(Math.max(currentIndex, 0), group.length);
  const anchor = group[insertAt];
  const targetIndex = anchor
    ? next.findIndex((candidate) => candidate.id === anchor.id)
    : lastMatchingIndex(
        next,
        (candidate) =>
          candidate.sprintId === sprintId && candidate.status === status
      ) + 1;
  next.splice(targetIndex < 0 ? next.length : targetIndex, 0, moved);
  return next;
}
