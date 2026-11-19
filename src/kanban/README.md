# `@decaf-ts/for-react/kanban`

Accessible, controlled Kanban board for embedding in Decaf React screens. The
entry point owns no data: it renders columns from a host-supplied mapping,
emits typed move/reorder/selection events and never mutates a task.

Drag and drop is implemented once here with
[`@dnd-kit/core`](https://docs.dndkit.com/) and
[`@dnd-kit/sortable`](https://docs.dndkit.com/presets/sortable), mirroring the
Angular `@decaf-ts/for-angular/kanban` entry point. The JavaScript and CSS
contracts (types, rejection reasons, class names, design tokens and keyboard
semantics) match the Angular board.

## Install

```bash
npm install @decaf-ts/for-react
```

`@dnd-kit/core` and `@dnd-kit/sortable` are **regular dependencies** of
`@decaf-ts/for-react` (the same model as `@xyflow/react` for `/diagrams`).
Applications that import `/kanban` do not install anything extra, and a
consumer such as `/scrum` can compose this export with zero new dependencies.
The root entry point never loads dnd-kit; only importing this subpath does.

Import the stylesheet next to the component (consumer-wired, like every
for-react subpath):

```ts
import "@decaf-ts/for-react/kanban/styles.css";
```

### Compatibility

| Package               | Tested range                  |
| --------------------- | ----------------------------- |
| `react` / `react-dom` | `>=18.0.0`                    |
| `@dnd-kit/core`       | `6.3.1` (bundled dependency)  |
| `@dnd-kit/sortable`   | `10.0.0` (bundled dependency) |
| `@decaf-ts/for-react` | `0.0.x`                       |

## Controlled-view contract

The board is presentation only. It never mutates a task, calls an API or moves a
card on its own. The host owns:

- the task array and the task-to-column mapping (`KanbanConfig.status`);
- column order and WIP limits (`KanbanConfig.columns`);
- what happens after a move, reorder or selection;
- `selectedId`, `readOnly`, `disabled`, `loading` and `error` state.

When an interaction is refused the board calls `onTaskMoveRejected` with a
deterministic `reason` and leaves the task where it was. Rejection reasons are
`cancelled`, `disabled`, `invalid-index`, `readonly`, `unchanged`,
`unknown-column` and `wip-limit`. A rejected move is never applied silently.

## Usage

```tsx
import { useState } from "react";
import {
  KanbanBoard,
  type KanbanConfig,
  type KanbanCardTemplateContext,
  type KanbanSelectionEvent,
  type TaskMoveEvent,
  type TaskMoveRejectedEvent,
  type TaskReorderEvent,
} from "@decaf-ts/for-react/kanban";

interface Task {
  id: string;
  title: string;
  status: string;
}

const COLUMNS = [
  { id: "todo", title: "To do", wipLimit: 4 },
  { id: "doing", title: "In progress", wipLimit: 2 },
  { id: "done", title: "Done" },
];

const CONFIG: KanbanConfig<Task> = {
  id: (task) => task.id,
  title: (task) => task.title,
  status: (task) => task.status,
  columns: COLUMNS,
};

export function SprintBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onMoved = (event: TaskMoveEvent<Task>) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === event.task.id ? { ...task, status: event.toColumn } : task
      )
    );
  };

  const onReordered = (event: TaskReorderEvent<Task>) => {
    // Apply event.currentIndex inside event.column, then update tasks.
  };

  const onSelected = (event: KanbanSelectionEvent<Task>) => {
    setSelectedId(event.task.id);
  };

  const onRejected = (event: TaskMoveRejectedEvent<Task>) => {
    // Surface event.reason; the board already snapped the card back.
  };

  const renderCard = (context: KanbanCardTemplateContext<Task>) => (
    <>
      <strong>{context.task.title}</strong>
      <span>
        {context.column.title} · #{context.index + 1}
        {context.selected ? " · selected" : ""}
      </span>
    </>
  );

  return (
    <KanbanBoard
      items={tasks}
      config={CONFIG}
      selectedId={selectedId}
      readOnly={readOnly}
      loading={loading}
      error={error}
      label="Sprint board"
      renderCard={renderCard}
      onTaskMoved={onMoved}
      onTaskReordered={onReordered}
      onTaskSelected={onSelected}
      onSelectionCleared={() => setSelectedId(null)}
      onTaskMoveRejected={onRejected}
      onRetryRequested={() => setError(null)}
    />
  );
}
```

The board re-derives every column from `items` after each interaction. Persist
the accepted event and update `items` to keep the new position; do not mutate
the task objects in place.

### `onSelectionCleared`

`onSelectionCleared` (no payload) is called when the user presses `Escape` on a
focused card and the board had a keyboard-selected card. Clear the host's
`selectedId` in that handler. It is separate from `onTaskSelected` so a host can
distinguish "selection moved" from "selection dismissed" and keep DOM/ARIA
state aligned. Pressing `Escape` also cancels an in-progress keyboard move.

## Props

| Prop                 | Type                             | Default                      | Purpose                                                    |
| -------------------- | -------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| `items`              | `readonly T[]`                   | `[]`                         | Task collection.                                           |
| `config`             | `KanbanConfig<T>` (required)     | —                            | id/title/status accessors, columns, optional swimlane.     |
| `selectedId`         | `string \| null`                 | `null`                       | Controlled selection.                                      |
| `readOnly`           | `boolean`                        | `false`                      | View-only board; selection still emits.                    |
| `disabled`           | `boolean`                        | `false`                      | Suppresses selection, edit and drag.                       |
| `loading`            | `boolean`                        | `false`                      | Renders the loading state and suspends dragging.           |
| `error`              | `string \| null`                 | `null`                       | Renders the error state plus retry action.                 |
| `filter`             | `((task: T) => boolean) \| null` | `null`                       | Host search/filter predicate.                              |
| `label`              | `string`                         | `Kanban board`               | Accessible name of the board region.                       |
| `emptyMessage`       | `string`                         | `No tasks`                   | Empty column/board copy.                                   |
| `loadingMessage`     | `string`                         | `Loading tasks...`           | Loading copy.                                              |
| `errorMessage`       | `string`                         | `Unable to load tasks.`      | Fallback error copy.                                       |
| `retryLabel`         | `string`                         | `Retry`                      | Retry button label.                                        |
| `keyboardHelp`       | `string`                         | full keyboard sentence       | Keyboard help text referenced by `aria-describedby`.       |
| `showDragHandles`    | `boolean`                        | `true`                       | Show per-card drag handles.                                |
| `instanceId`         | `string`                         | generated `decaf-kanban-<n>` | Stable id prefix for accessible and dnd-kit relationships. |
| `className`          | `string`                         | —                            | Extra classes on the board host element.                   |
| `renderCard`         | `(context) => ReactNode`         | —                            | Card render prop.                                          |
| `renderColumnHeader` | `(context) => ReactNode`         | —                            | Column header render prop.                                 |
| `renderEmpty`        | `(context) => ReactNode`         | —                            | Empty-state render prop.                                   |

Every label prop is a plain string with an English default, so the application
resolves translations at the page level and passes the resolved strings down.
The board never injects a translation service or locale provider.

### Callbacks

| Callback              | Payload                                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| `onTaskMoved`         | `{ task, fromColumn, toColumn, previousIndex, currentIndex }`                    |
| `onTaskReordered`     | `{ task, column, previousIndex, currentIndex }`                                  |
| `onTaskSelected`      | `{ task, column }`                                                               |
| `onTaskEditRequested` | `{ task, column }`                                                               |
| `onSelectionCleared`  | none                                                                             |
| `onTaskMoveRejected`  | `{ task, fromColumn, toColumn, previousIndex, currentIndex, reason, wipLimit? }` |
| `onRetryRequested`    | none                                                                             |

`onTaskSelected` is suppressed when `disabled`; `onTaskEditRequested` is
suppressed when `disabled` or `readOnly`, matching the Angular card contract.

The component is exported as `KanbanBoard`, with `KanbanBoardComponent` and
`RgxKanban` as aliases matching the naming of the other for-react components.
`KanbanColumn` and `KanbanCard` are exported for hosts that compose custom
layouts.

## Render props

The three Angular template directives become render props with identical
context objects:

| Render prop          | Context                                                        |
| -------------------- | -------------------------------------------------------------- |
| `renderCard`         | `{ $implicit: task, task, column, index, selected, readOnly }` |
| `renderColumnHeader` | `{ $implicit: column, column, count, wipLimit?, readOnly }`    |
| `renderEmpty`        | `{ $implicit: column \| null, column, count, board }`          |

`renderEmpty` is called per empty column and once for a board with no columns,
with `board: true`, `$implicit: null` and `count: 0` for the board-level case.
`$implicit` is kept for direct parity with the Angular `let-task` /
`let-column` template contexts.

## Types and helpers

`KanbanConfig<T>`, `KanbanColumnConfig`, `KanbanMoveRejectionReason`,
`TaskMoveEvent<T>`, `TaskReorderEvent<T>`, `KanbanSelectionEvent<T>`,
`TaskMoveRejectedEvent<T>`, `KanbanCardTemplateContext<T>`,
`KanbanColumnHeaderTemplateContext`, `KanbanEmptyTemplateContext`,
`KanbanCardKeyboardEvent<T>`, `KanbanColumnDropEvent<T>`, `KanbanRetryHandler`,
`KanbanFilter<T>`, `KanbanFieldMap<T>` and `kanbanConfigFromFields()`.

The framework-free board helpers are exported as well: `groupByStatus`,
`applyFilter`, `applyPreview`, `resolveMoveIndices`, `clamp`, plus the
droppable-id helpers `kanbanColumnDroppableId`,
`kanbanColumnIdFromDroppableId` and `kanbanCardDndId`.

`swimlane` is accepted on `KanbanConfig` (and in `kanbanConfigFromFields`) for
configuration parity with the Angular entry point. The Angular baseline does
not render swimlane rows, so the React port does not either.

## dnd-kit mapping

| Angular CDK              | React / dnd-kit                                                             |
| ------------------------ | --------------------------------------------------------------------------- |
| `cdkDropListGroup`       | one `DndContext` per board                                                  |
| `cdkDropList` per column | `useDroppable` per column                                                   |
| `cdkDrag` per card       | `useSortable` per card                                                      |
| `cdkDragHandle`          | pointer listeners from `useSortable` on the handle                          |
| `cdkDragPreviewClass`    | `DragOverlay` wrapper with `.dcf-kanban-drag-preview`                       |
| `cdkDropListDropped`     | `onDragEnd` / `onDragCancel` + `resolveMoveIndices`                         |
| manual live region       | `DndContext` `accessibility.announcements` + the board's polite live region |
| multi-column board       | documented multi-container pattern with `closestCorners`                    |

Column identity stays recoverable from droppable ids: columns are
`${instanceId}-<columnId>-drop` (parsed by `kanbanColumnIdFromDroppableId`) and
cards are `${instanceId}-<taskId>-card`. The rejection path can therefore always
map a gesture back to a column even when the dragged data is unavailable.

The keyboard interaction is the Angular board's own state machine rather than
`KeyboardSensor`: `Enter` selects (and a second `Enter` requests edit) when no
card is grabbed, which `KeyboardSensor` cannot express. Pointer dragging,
sortable transforms and the drag overlay use dnd-kit.

## Accessibility and keyboard

- Cards are `role="listitem"` with accessible names; columns are labelled lists.
  Columns and cards expose stable ids so hosts can attach descriptions.
- Keyboard: `Tab` moves focus, `Space` picks up/commits a card, arrow keys move
  it (including across columns), `Enter` selects (second `Enter` requests edit),
  `E`/`F2` requests edit, `Escape` cancels a move or clears selection.
- A polite live region announces picks, drops, accepted moves, rejections and
  empty-column navigation. Focus rings and `prefers-reduced-motion` are handled
  in the shipped styles; `forced-colors` keeps selected/grabbed cards visible.
- WIP limits are enforced by rejection, not by hiding or silently dropping a
  card, so assistive technology sees the same outcome as pointer users.
- Drag/drop is only wired in the browser. The component does not touch
  `window` or `document` at import time, so server rendering emits the static
  column/card structure.

## Demo and test coverage

`@decaf-ts/for-react` ships no Storybook: the Angular baseline's Storybook
states are substituted by the demo app's `/kanban` page (add-card, reset and
clear controls, read-only, disabled, loading, error, filter and an event log
of emitted events) and by the Playwright specs under `tests/playwright/`
(`kanban-board`, `kanban-keyboard`, `kanban-a11y`). Unit and integration
coverage lives in `tests/unit/kanban*.spec.*` and
`tests/integration/kanban-packaging.spec.ts`.

## Packaging and licensing

The subpath is dual ESM + CJS: both `import` and `require` conditions are
published, so `require('@decaf-ts/for-react/kanban')` works in CommonJS hosts
without a dynamic `import()`. The stylesheet is bundled to
`@decaf-ts/for-react/kanban/styles.css` and is the only extra asset.
`@dnd-kit/core` and `@dnd-kit/sortable` are MIT-licensed regular dependencies
and are not vendored.
