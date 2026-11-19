# `@decaf-ts/for-react/scrum`

Backlog and sprint views for task-management screens. The entry point **composes**
the [`/kanban`](../kanban/README.md) board instead of shipping a second drag/drop
engine: the sprint board renders Kanban status columns and the backlog renders a
single Kanban column, so ordering, cross-column movement, keyboard operation,
selection and filtering all come from one implementation.

## Install

```bash
npm install @decaf-ts/for-react
```

`/scrum` renders through `/kanban`, so it needs the same runtime pieces as that
entry point (`@dnd-kit/core` and `@dnd-kit/sortable`, both regular dependencies
of `@decaf-ts/for-react`). The `/scrum` entry point adds **no new runtime
dependency** of its own and imports nothing except `@decaf-ts/for-react` core,
`@decaf-ts/for-react/kanban`, `react` and its own files.

Import the stylesheet next to the components (consumer-wired, like every
for-react subpath):

```ts
import "@decaf-ts/for-react/kanban/styles.css";
import "@decaf-ts/for-react/scrum/styles.css";
```

### Compatibility

| Package               | Tested range                  |
| --------------------- | ----------------------------- |
| `react` / `react-dom` | `>=18.0.0`                    |
| `@dnd-kit/core`       | `6.3.1` (bundled dependency)  |
| `@dnd-kit/sortable`   | `10.0.0` (bundled dependency) |
| `@decaf-ts/for-react` | `0.0.x`                       |

## Controlled-view contract

The components are presentation only. They never mutate a task, call an API or
change sprint lifecycle state. The host owns:

- the task list, sprint list and selected sprint;
- the mapping from a task to its sprint (`ScrumConfig.sprint`) and status
  (`KanbanConfig.status`);
- what happens after a reorder, move or assignment request;
- sprint lifecycle policy (planned → active → completed).

`loading`, `error`, `readOnly` and `disabled` are host-controlled props and are
forwarded to the underlying Kanban board. When an interaction is refused the
component emits a typed rejection event; it never applies the change silently.

Sprint ids are host-owned. Only `null`, `undefined` and `''` are treated as
"backlog"; the components never trim or rewrite a host id.

### Host validation and untrusted payloads

`SprintSelector` forwards the raw select value through `onSprintSelected`
(`sprintId: value || null`) without allowlist-checking it against the `sprints`
prop — unlike the backlog assignment control, which refuses ids outside the
host's `sprints` list with an `unknown-sprint` rejection. Hosts must validate a
selected sprint id against their own sprint list before acting on it.

Rejection and selection event payloads carry the raw requested string (for
example `SprintAssignmentRejectedEvent.sprintId` and
`SprintSelectionEvent.sprintId`), which is client-controlled under DOM
tampering. Hosts must render these strings as untrusted text, never as HTML.

## Usage

```tsx
import { useState } from "react";
import {
  Backlog,
  SprintBoard,
  SprintSelector,
  type ScrumConfig,
  type ScrumSprint,
  type SprintAssignmentRequestedEvent,
  type SprintBoardMoveEvent,
  type BacklogReorderEvent,
} from "@decaf-ts/for-react/scrum";
import "@decaf-ts/for-react/kanban/styles.css";
import "@decaf-ts/for-react/scrum/styles.css";

interface Task {
  id: string;
  title: string;
  status: string;
  sprintId: string | null;
}

const STATUS_COLUMNS = [
  { id: "todo", title: "To do", wipLimit: 4 },
  { id: "doing", title: "In progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

export function ProjectBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const sprints: ScrumSprint[] = [
    { id: "sprint-1", title: "Sprint 1" },
    { id: "sprint-2", title: "Sprint 2" },
  ];
  const config: ScrumConfig<Task> = {
    id: (task) => task.id,
    title: (task) => task.title,
    status: (task) => task.status,
    sprint: (task) => task.sprintId,
    columns: STATUS_COLUMNS,
  };

  const reorder = (taskId: string, currentIndex: number) =>
    setTasks((current) => {
      const backlog = current.filter((task) => !task.sprintId);
      const index = backlog.findIndex((task) => task.id === taskId);
      if (index < 0) return current;
      const reordered = backlog.slice();
      const [task] = reordered.splice(index, 1);
      reordered.splice(
        Math.min(Math.max(currentIndex, 0), reordered.length),
        0,
        task
      );
      const next: Task[] = [];
      let backlogCursor = 0;
      for (const item of current) {
        next.push(!item.sprintId ? reordered[backlogCursor++] : item);
      }
      return next;
    });

  return (
    <>
      <SprintSelector
        sprints={sprints}
        selectedSprintId={selectedSprintId}
        onSprintSelected={(event) => setSelectedSprintId(event.sprintId)}
      />

      <Backlog
        items={tasks}
        config={config}
        sprints={sprints}
        selectedId={selectedTaskId}
        onBacklogReordered={(event: BacklogReorderEvent<Task>) =>
          reorder(event.task.id, event.currentIndex)
        }
        onSprintAssignmentRequested={(
          event: SprintAssignmentRequestedEvent<Task>
        ) =>
          setTasks((current) =>
            current.map((task) =>
              task.id === event.task.id
                ? { ...task, sprintId: event.sprintId }
                : task
            )
          )
        }
        onTaskSelected={(event) => setSelectedTaskId(event.task.id)}
      />

      {selectedSprintId ? (
        <SprintBoard
          items={tasks}
          config={config}
          sprintId={selectedSprintId}
          selectedId={selectedTaskId}
          onTaskSelected={(event) => setSelectedTaskId(event.task.id)}
          onTaskMoved={(event: SprintBoardMoveEvent<Task>) =>
            setTasks((current) =>
              current.map((task) =>
                task.id === event.task.id ? { ...task, status: event.toColumn } : task
              )
            )
          }
        />
      ) : null}
    </>
  );
}
```

`onBacklogReordered` indices are relative to the **backlog population** the
component rendered — the tasks without a sprint, before any `filter` narrowing —
not to the full host `items` array. The `reorder` helper above therefore applies
the requested index inside that subset and splices the reordered subset back
into the full task list; applying `event.currentIndex` directly to `tasks`
inserts at the wrong position once any task is assigned to a sprint.

### Custom cards

Both views accept a `renderCard` render prop forwarded to the Kanban board, so
existing Decaf summary/model renderers can be reused:

```tsx
<SprintBoard
  items={tasks}
  config={config}
  sprintId={sprintId}
  renderCard={({ task, column }) => (
    <>
      <strong>{task.title}</strong>
      <span>{column.title}</span>
    </>
  )}
/>
```

The backlog card render prop only replaces the task summary; the sprint-assignment
control is always rendered by `Backlog` beneath the render prop.

## API summary

| Component        | Props                                                                                                                                                                                                                                    | Events                                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SprintSelector` | `sprints`, `selectedSprintId`, `label`, `placeholder`, `disabled`, `loading`, `instanceId`                                                                                                                                                | `onSprintSelected`                                                                                                                                                                                |
| `Backlog`        | `items`, `config`, `sprints`, `selectedId`, `readOnly`, `disabled`, `loading`, `error`, `filter`, `label`, `columnTitle`, messages, `assignmentLabel`, `assignmentPlaceholder`, `showDragHandles`, `instanceId`, `renderCard`                | `onBacklogReordered`, `onBacklogReorderRejected`, `onSprintAssignmentRequested`, `onSprintAssignmentRejected`, `onTaskSelected`, `onTaskEditRequested`, `onSelectionCleared`, `onRetryRequested` |
| `SprintBoard`    | `items`, `config`, `sprintId`, `selectedId`, `readOnly`, `disabled`, `loading`, `error`, `filter`, `label`, messages, `showDragHandles`, `instanceId`, `renderCard`                                                                        | `onTaskMoved`, `onTaskReordered`, `onTaskSelected`, `onTaskEditRequested`, `onSelectionCleared`, `onTaskMoveRejected`, `onRetryRequested`                                                         |

Both `Backlog` and `SprintBoard` accept the same `filter` predicate as `/kanban`,
so a host search box can feed both views. Selection events identify the task and
the column; sprint-board events also carry `sprintId`.

The `readonly` prop name from the Angular entry point is also accepted as an
alias for `readOnly`.

## Bundle composition

`/scrum` imports the Kanban board, the Kanban column/card components and their
published types. It contains no duplicate drop-list setup, no duplicate card
renderer and no second drag/drop state machine. A consumer importing `/scrum`
therefore loads one shared `/kanban` chunk; it does not embed a copy of the
Kanban implementation.

Adding `/scrum` does not pull `/gantt`, `/diagrams`, `/code-editor`, `/math`,
`/barcode`, `/cron` or any other feature entry point, and the root FESM stays
scrum-free.

## Licensing

`/scrum` introduces **no new runtime dependency, stylesheet, font or asset**. Its
license surface is exactly the license surface of `@decaf-ts/for-react` plus the
`@dnd-kit/*` packages (MIT) already captured for `/kanban`. There is no
additional SPDX entry to add for this entry point.
