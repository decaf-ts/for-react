# `@decaf-ts/for-react/gantt`

A typed, Decaf-owned Gantt timeline adapter over
[`dhtmlx-gantt`](https://github.com/DHTMLX/gantt) **Community edition**. It is
the React counterpart of `@decaf-ts/for-angular/gantt`, exposed as the
`./gantt` subpath export so the renderer is not part of the root package
bundle.

## Install

```bash
npm install @decaf-ts/for-react
```

`dhtmlx-gantt` is a regular dependency of `@decaf-ts/for-react` and is installed
with the package. Importing the root entry point does not load or evaluate the
renderer; only hosts that import `@decaf-ts/for-react/gantt` load it.

### Licensing boundary and the `>= 10` pin

`dhtmlx-gantt` **Community edition is MIT-licensed from v10 onward**. Versions
9 and below were distributed under the **GPL**, which is why this export pins
`dhtmlx-gantt@^10.0.0` and refuses to work with the GPL major:

- `package.json` declares `"dhtmlx-gantt": "^10.0.0"` (the lockfile resolves
  `10.x`).
- The renderer is an external dependency; its code is not vendored or
  relicensed here.
- Do not relax the range to `^9` or `*`. A resolved version below `10.0.0`
  changes the license of the delivered application.

dhtmlx-gantt PRO features (auto-scheduling, critical path, resource
management, multi-selection, markers, export/print) are outside the Community
edition and are not used by this facade. The facade provides its own
deterministic dependency validation and single-selection model.

## Usage

```tsx
import { useState } from "react";
import {
  Gantt,
  type GanttConfig,
  type GanttTaskDateChangeEvent,
} from "@decaf-ts/for-react/gantt";

interface Task {
  id: string;
  title: string;
  start: string;
  end: string;
  progress: number;
  parentId?: string;
  dependencies?: string[];
  milestone?: boolean;
}

const config: GanttConfig<Task> = {
  id: (task) => task.id,
  title: (task) => task.title,
  start: (task) => task.start,
  end: (task) => task.end,
  progress: (task) => task.progress,
  parent: (task) => task.parentId,
  dependencies: (task) => task.dependencies,
  milestone: (task) => Boolean(task.milestone),
  editable: () => true,
};

export function ProjectTimeline({ tasks }: { tasks: Task[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onDateChanged = (event: GanttTaskDateChangeEvent<Task>) => {
    // Persist the accepted range, then update `tasks`.
    console.log(event.taskId, event.current.startDate, event.current.endDate);
  };

  return (
    <Gantt<Task>
      items={tasks}
      config={config}
      selectedId={selectedId}
      onTaskSelected={(event) => setSelectedId(event.taskId)}
      onTaskDateChanged={onDateChanged}
      onTaskDateChangeRejected={(event) => console.warn(event.reason)}
    />
  );
}
```

`ganttConfigFromFields` derives the same config from property names:

```tsx
import { ganttConfigFromFields } from "@decaf-ts/for-react/gantt";

const config = ganttConfigFromFields<Task>({
  id: "id",
  title: "title",
  start: "start",
  end: "end",
  progress: "progress",
  parent: "parentId",
  dependencies: "dependencies",
  milestone: "milestone",
});
```

### Props

| Prop | Purpose |
| --- | --- |
| `items` | Task collection. |
| `config` | Accessor mapping from tasks to id, title, dates, progress, parent, dependencies, milestone, colour, editability and tooltip. |
| `selectedId` | Controlled selection (single selection). |
| `readOnly`, `disabled`, `loading`, `error` | Host-controlled states. |
| `viewType` | `day \| week \| month \| quarter \| year`; controlled or uncontrolled. |
| `start`, `end` | Optional explicit timeline range. |
| `showToolbar`, `draggable`, `selectable`, `showTodayLine` | Renderer behaviour. |
| `locale` | `en`, `de`, `jp`, `ru`, `cn` (zh-Hans), `zh_tw` (zh-Hant), or a custom locale object. |
| `label`, `emptyLabel`, `loadingLabel`, `retryLabel`, `taskColumnLabel`, `progressColumnLabel`, `toolbarLabel`, `keyboardHelp` | User-facing labels. |
| `viewTypeLabels` | Per-scale label overrides. |
| `columns` | Custom side-table columns (`readonly GanttGridColumn<T>[]`) with optional per-task templates; defaults to task and progress columns. |
| `instanceId`, `sideWidth` | Accessible id prefix and table width. |
| `renderBar` | Returns the bar text (a string; dhtmlx bars are string templates). |
| `renderTaskDetail` | React node for the task-detail panel, projected with `{ task, taskId, title }`. |
| `renderEmpty` | React node for the empty state. |
| `className`, `style` | Host styling. |

### Callbacks

- `onTaskSelected` / `onTaskEditRequested` — `{ task, taskId }`.
- `onTaskDateChanged` — `{ task, taskId, previous, current, reason, mode }`,
  where `reason` is `drag | keyboard | control` and `mode` is `move | resize`.
- `onTaskDateChangeRejected` — deterministic reasons: `disabled`, `readonly`,
  `invalid-date`, `milestone`, `dependency-violation`, `unknown-task` or
  `unchanged`.
- `onTaskProgressChanged` / `onTaskProgressChangeRejected`.
- `onModelIssuesChange`, `onViewTypeChange`, `onRetryRequested`.

The component is controlled: it never mutates consumer task objects. After an
accepted drag it re-derives the timeline from `items`, so persist the event and
update `items` to keep the new position; otherwise the bar snaps back.

### Imperative handle

A `ref` exposes:

```ts
{
  applyDateChange(taskId, start, end, mode?): boolean;
  setProgress(taskId, progress): boolean;
  requestTaskEdit(taskId): void;
  focusTask(taskId): void;
  getGantt(): GanttStatic | null;
}
```

`applyDateChange` and `setProgress` run the same accept/reject pipeline as
keyboard and drag changes and report acceptance through the callbacks.

## Dates, dependencies and safety

- **Date-only strings** (`YYYY-MM-DD`) are local calendar dates, not UTC
  instants, so `2026-10-05` renders as 5 October in every timezone.
- **Instants** can be `Date` objects or numbers. Numbers with fewer than 13
  digits are Unix **seconds**; 13 or more digits are milliseconds.
- Event ranges expose both `Date` values and stable `YYYY-MM-DD` strings
  (`startDate`, `endDate`).
- **Dependencies** accept `"task-id"` (finish-to-start by default) or
  `{ id: "task-id", type: "fs" | "ff" | "ss" | "sf" }`. All four types map to
  the renderer link codes; dependency semantics and violations stay Decaf's.
- Invalid dates, duplicate ids, unknown parents/dependencies, parent cycles,
  dependency cycles and invalid progress are reported through
  `onModelIssuesChange` and an inline warning list. Invalid tasks remain in the
  table without a bar.
- Date and progress edits are rejected deterministically when they are
  disabled, read-only, invalid, milestone-resized, or would violate a
  dependency. Rejected drags snap back.

## Parity notes

- **Link types** — `fs` maps onto dhtmlx link code `0`, `ss` onto `1`, `ff`
  onto `2` and `sf` onto `3`. dhtmlx auto-scheduling is disabled; acceptance
  and rejection remain deterministic and Decaf-owned.
- **Keyboard and accessibility** — dhtmlx keyboard navigation and WAI-ARIA
  attributes provide row/cell navigation. The facade keeps the polite
  `aria-live` announcer, the visible keyboard help text, and the bar-level
  `Enter`/`Space`, `E`, `Alt+Arrow`, `Alt+Shift+Arrow`, `[`/`]` shortcuts.
- **Locales** — the six required locales are the renderer's bundled locale
  objects. Custom locale objects can be passed to `locale`.
- **Scales** — `day`, `week`, `month`, `quarter` and `year` are rendered through
  dhtmlx scale configurations.
- **Task kinds** — `project`, `task` and `milestone` are mapped explicitly;
  parent/child grouping and tree expansion come from the renderer.
- **Per-task editability** — `config.editable` maps to the renderer's
  `editable`/`readonly` task properties.
- **Single selection** — the facade is single-select; renderer multi-select is
  not enabled.
- **Today line** — dhtmlx markers are a PRO feature. In the Community edition
  `showTodayLine` highlights today's timeline column instead.

## Styles and theme

Load the renderer stylesheet and the adapter stylesheet once in the host
application (for example in the app entry point):

```ts
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import "@decaf-ts/for-react/gantt/styles.css";
```

The subpath does not import CSS itself, so importing it in a server renderer or
a CSS-restricted framework cannot fail on a stylesheet import. The adapter
styles are scoped under `.dcf-gantt`.

Theme through Decaf tokens; the adapter translates them onto dhtmlx's
`--dhx-gantt-*` variables:

```css
.dcf-gantt {
  --dcf-color-primary: #0057b8;
  --dcf-color-text: #17202a;
  --dcf-color-text-secondary: #566573;
  --dcf-color-gray-1: #f8f9fa;
  --dcf-color-gray-4: #dee2e6;
}
```

Or override the renderer variables directly:

```css
.dcf-gantt {
  --dhx-gantt-base-colors-primary: #0057b8;
  --dhx-gantt-base-module: 8px;
}
```

## Accessibility and SSR

- Bars are keyboard reachable. `Enter`/`Space` selects, `E` requests edit,
  `Alt+Arrow` moves by one day, `Alt+Shift+Arrow` resizes, and `[` / `]` changes
  progress by 10%.
- A polite live region announces selections, accepted edits and rejections.
- Visible focus rings, forced-colors support and `prefers-reduced-motion`
  handling are included.
- The renderer is only instantiated in the browser. Server rendering emits a
  sized placeholder inside the canvas, and import-time code never touches
  `window` or `document`.
- The date layer is CSP-safe and the facade uses no `eval`. dhtmlx positions
  bars with inline `style` attributes, so a strict `style-src` policy must
  allow the renderer's inline styles (or nonce them at the bundler level).

## Testing boundary

`for-react` has no Playwright lane. The Angular `tests/gantt` unit and
functional coverage is ported to the package's Jest setup (`tests/unit` and
`tests/integration`, following the `code-editor` precedent); browser-level
interaction assertions from the Angular Playwright suite are mapped onto
jsdom integration coverage rather than a separate browser runner.

## License

`dhtmlx-gantt` Community is MIT-licensed (v10+). It is an external dependency
and is not vendored or relicensed by `@decaf-ts/for-react`. See the renderer
package for its complete license and notices.
