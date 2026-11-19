[![Banner](./workdocs/assets/Banner.png)](https://decaf-ts.github.io/ts-workspace/)
## Typescript Template

This repository is meant to provide an enterprise template for any standard Typescript project


![Licence](https://img.shields.io/github/license/decaf-ts/for-react.svg?style=plastic)
![GitHub language count](https://img.shields.io/github/languages/count/decaf-ts/for-react?style=plastic)
![GitHub top language](https://img.shields.io/github/languages/top/decaf-ts/for-react?style=plastic)

[![Build & Test](https://github.com/decaf-ts/for-react/actions/workflows/nodejs-build-prod.yaml/badge.svg)](https://github.com/decaf-ts/for-react/actions/workflows/nodejs-build-prod.yaml)
[![CodeQL](https://github.com/decaf-ts/for-react/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/decaf-ts/for-react/actions/workflows/codeql-analysis.yml)[![Snyk Analysis](https://github.com/decaf-ts/for-react/actions/workflows/snyk-analysis.yaml/badge.svg)](https://github.com/decaf-ts/for-react/actions/workflows/snyk-analysis.yaml)
[![Pages builder](https://github.com/decaf-ts/for-react/actions/workflows/pages.yaml/badge.svg)](https://github.com/decaf-ts/for-react/actions/workflows/pages.yaml)
[![.github/workflows/release-on-tag.yaml](https://github.com/decaf-ts/for-react/actions/workflows/release-on-tag.yaml/badge.svg?event=release)](https://github.com/decaf-ts/for-react/actions/workflows/release-on-tag.yaml)

![Open Issues](https://img.shields.io/github/issues/decaf-ts/for-react.svg)
![Closed Issues](https://img.shields.io/github/issues-closed/decaf-ts/for-react.svg)
![Pull Requests](https://img.shields.io/github/issues-pr-closed/decaf-ts/for-react.svg)
![Maintained](https://img.shields.io/badge/Maintained%3F-yes-green.svg)

![Forks](https://img.shields.io/github/forks/decaf-ts/for-react.svg)
![Stars](https://img.shields.io/github/stars/decaf-ts/for-react.svg)
![Watchers](https://img.shields.io/github/watchers/decaf-ts/for-react.svg)

![Node Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=Node&query=$.engines.node&colorB=blue)
![NPM Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=NPM&query=$.engines.npm&colorB=purple)

Documentation [here](https://decaf-ts.github.io/for-react/), Test results [here](https://decaf-ts.github.io/for-react/workdocs/reports/html/test-report.html) and Coverage [here](https://decaf-ts.github.io/for-react/workdocs/reports/coverage/lcov-report/index.html)



### Description

No one needs the hassle of setting up new repos every time.

Now you can create new repositories from this template and enjoy having everything set up for you.



### How to Use

- [Initial Setup](./workdocs/tutorials/For%20Developers.md#_initial-setup_)
- [Installation](./workdocs/tutorials/For%20Developers.md#installation)
- [Scripts](./workdocs/tutorials/For%20Developers.md#scripts)
- [Linting](./workdocs/tutorials/For%20Developers.md#testing)
- [CI/CD](./workdocs/tutorials/For%20Developers.md#continuous-integrationdeployment)
- [Publishing](./workdocs/tutorials/For%20Developers.md#publishing)
- [Structure](./workdocs/tutorials/For%20Developers.md#repository-structure)
- [IDE Integrations](./workdocs/tutorials/For%20Developers.md#ide-integrations)
  - [VSCode(ium)](./workdocs/tutorials/For%20Developers.md#visual-studio-code-vscode)
  - [WebStorm](./workdocs/tutorials/For%20Developers.md#webstorm)
- [Considerations](./workdocs/tutorials/For%20Developers.md#considerations)

### Subpath exports

- [`@decaf-ts/for-react/code-editor`](./src/code-editor/README.md) — CodeMirror 6
  code/formula editor built on `@uiw/react-codemirror`. Importing the subpath is
  the only thing that loads CodeMirror; the root package does not include it.
- [`@decaf-ts/for-react/gantt`](./src/gantt/README.md) — Typed Gantt timeline
  adapter over the dhtmlx-gantt Community renderer. Importing the subpath is
  the only thing that loads the renderer; the root package does not include it.
- [`@decaf-ts/for-react/diagrams`](./src/diagrams/README.md) — Graph/diagram
  editor surfaces over `@xyflow/react` (React Flow). Importing the subpath is
  the only thing that loads React Flow; the root package does not include it.
- [`@decaf-ts/for-react/barcode`](./src/barcode/README.md) — GS1 DataMatrix,
  DataMatrix and QR SVG rendering over `@bwip-js/browser`, plus a thin
  `<Barcode>` React component. Importing the subpath is the only thing that
  loads the encoder; the root package does not include it.
- [`@decaf-ts/for-react/math`](./src/math/README.md) — MathLive-powered
  controlled math input field. Importing the subpath is the only thing that
  loads MathLive; the root package does not include it.
- [`@decaf-ts/for-react/cron`](./src/cron/README.md) — Cron-expression
  authoring surfaces: the standalone `<CronSelector>`, the five-field
  `<CronBuilder>` and the `<CronSelectorField>` CRUD form adapter. Importing
  the subpath is the only thing that loads `cronstrue` and Ionic React; the
  root package does not include them.
- [`@decaf-ts/for-react/calendar`](./src/calendar/README.md) — Presentation-only
  controlled month-grid calendar over `react-day-picker` and `date-fns`.
  Importing the subpath is the only thing that loads either library; the root
  package does not include them.
- [`@decaf-ts/for-react/kanban`](./src/kanban/README.md) — Accessible
  controlled Kanban board over `@dnd-kit/core` and `@dnd-kit/sortable`.
  Importing the subpath is the only thing that loads dnd-kit; the root package
  does not include it.
- [`@decaf-ts/for-react/scrum`](./src/scrum/README.md) — Backlog and sprint
  views composed from the `/kanban` board. Importing the subpath adds no new
  dependency: it renders through the shared Kanban implementation.
- [`@decaf-ts/for-react/storyboard`](./src/storyboard/README.md) — Guided
  storyboard tutorial: the `StoryboardTutorial` host, the module-singleton
  store with `useSyncExternalStore` hooks, the framework-agnostic engine,
  completion/action detection and the focus/message strategies. Importing the
  subpath adds no new dependency.
- [`@decaf-ts/for-react/charts`](./src/charts/README.md) — CRD-ready line, bar,
  pie and scatter chart components plus the controlled curve editor, over the
  optional `echarts` and `@cortex-js/compute-engine` peers. Importing the
  subpath is the only thing that loads either engine; the root package does not
  include them.
- [`@decaf-ts/for-react/agent`](./src/agent/README.md) — Agent conversation UI
  over a graph workflow run: the `AgentChatProvider`/`useAgentChat` composition,
  the `AgentChat` component families, the transport seam (graph-run, legacy
  bridge and deterministic demo transports), the envelope fold and the Zustand
  side-channel store. The subpath is the only entry point that loads
  `@ai-sdk/react`, `ai` and `zustand`; the root package does not include them.

### Diagrams

The `./diagrams` subpath hosts the graph/diagram editor: a canonical workflow
document store (`GraphWorkflowDocumentStore`) projected onto a `@xyflow/react`
canvas by `GraphRenderer`, with node/edge templates, toolbar and side panels,
inline editors, catalogue/manifest readers, execution and run surfaces,
parameter builders and the connection guard around it. See
[`src/diagrams/README.md`](./src/diagrams/README.md) for the full component and
service inventory.

Install requirements:

- `react`/`react-dom` `>= 18` are peer dependencies of the whole package.
- `@decaf-ts/as-graph@^0.11.5` is an **optional peer** of the package and is
  **required by this subpath**: every diagram document type comes from
  `@decaf-ts/as-graph/shared`, so hosts importing `./diagrams` must install it.
- `@xyflow/react@^13.0.2` is a regular dependency: it is installed with the
  package and is only loaded and evaluated when this subpath is imported.

Stylesheets are consumer-wired — the subpath never imports CSS itself:

```ts
import "@xyflow/react/dist/style.css"; // React Flow base
import "@decaf-ts/for-react/diagrams/styles.css"; // editor theme on top
```

The editor renders client-only: on a server it emits an empty placeholder and
no graph is initialized without a browser `window`.

Editing policy: the React Flow connection guard gives instant optimistic
feedback (unknown port, wrong direction, category mismatch, port already
occupied, duplicate or self connections), but the document mutation translator
is the authority — every canvas gesture becomes a document command validated
against the stored document (invalid mutations throw a Decaf `ValidationError`
before any optimistic change), and the canvas is re-projected from the stored
document, never the reverse. Loop-body containment edges are marked
`mandatory` and cannot be deleted or reconnected; their endpoint nodes, ghost
nodes and the input/output boundary nodes are protected from deletion.

i18n: the subpath ships no locale files. `GraphTranslateContract` and
`GraphTranslateService` let the host resolve editor strings through its own
translator, falling back to the supplied default when the translator is absent
or a key is not loaded.

Dependency line: the package's `@decaf-ts/*` dependencies now track the
current line (`core ^0.37.0`, `db-decorators ^0.21.0`, `decoration ^0.20.2`,
`decorator-validation ^1.25.0`, `ui-decorators ^0.23.0`, …) and ship as regular
dependencies — installed with the package, one copy per app. The peer set is
unchanged (`react`, `react-dom` `>= 18` plus the optional `@decaf-ts/as-graph`):
consumers only need their application on the same current `@decaf-ts` line so
npm resolves a single copy of each module.

### Barcode

The `./barcode` subpath renders GS1 DataMatrix, DataMatrix and QR payloads to
validated SVG markup with `@bwip-js/browser` and exposes a thin `<Barcode>` React
component. See [`src/barcode/README.md`](./src/barcode/README.md) for the full
component, helper and validator contract.

Install requirements:

- `@bwip-js/browser@^4.11.4` is an **optional peer** of the package and is
  **required by this subpath**: install it only in applications that import
  `./barcode`; the root entry point never loads it.
- The subpath is **ESM-only**: `@bwip-js/browser@4.11.4` publishes only `types`
  and `import` export conditions, so `require('@decaf-ts/for-react/barcode')`
  throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. CommonJS hosts must use a dynamic
  `import()`.

Rendering is client-only: `renderBarcodeSvg` produces validated SVG markup and
`<Barcode>` binds it through `dangerouslySetInnerHTML`, so both require a browser
DOM. `validateBarcodeSvg` is a mandatory gate on every render path; it throws a
`ValidationError` instead of emitting unvalidated markup.

The demo app (`npm run dev`, `http://localhost:8111`) ships the barcode route:

| Route | What it exercises |
| --- | --- |
| `/barcode` | [`./barcode`](./src/barcode/README.md): `<Barcode>` and `renderBarcodeSvg` over an editable payload with symbology (`BarcodeTypes`) and scale selectors, the validated SVG output and the error/empty states |

### Math

The `./math` subpath renders a controlled math input field backed by MathLive
and exposes a thin `<MathInput>` React component (`MathInputComponent` and
`RgxMathInput` aliases). See [`src/math/README.md`](./src/math/README.md) for
the full component contract.

Install requirements:

- `mathlive@^0.111.1` is an **optional peer** of the package and is
  **required by this subpath**: install it only in applications that import
  `./math`; the root entry point never loads it.
- The subpath is **dual ESM + CJS**: `mathlive` publishes `require` conditions
  alongside `import`, so `require('@decaf-ts/for-react/math')` works in
  CommonJS hosts without a dynamic `import()`.

Loading is lazy and failure-tolerant: `import('mathlive')` is memoized and
issued only after mount, the import promise is released on unmount, and a
failed load leaves the field inert instead of throwing — so server rendering
emits the empty field markup and never evaluates MathLive. The component is
fully controlled (`value`, `placeholder`, `disabled`), emits both `onChange`
and `onValueChange` per edit, skips no-op writes to preserve the cursor and
selection, and pins `mathVirtualKeyboardPolicy: 'manual'` so hosts keep
keyboard control.

The demo app (`npm run dev`, `http://localhost:8111`) ships the math route:

| Route | What it exercises |
| --- | --- |
| `/math` | [`./math`](./src/math/README.md): `<MathInput>` over an editable formula with value/placeholder/disabled controls, both change callbacks, a read-only toggle and reset button, and the rendered preview |

### Cron

The `./cron` subpath hosts the cron-expression editing surfaces: the standalone
`<CronSelector>` (mode-based schedule editor over daily, hourly interval and
weekly modes), the five-field `<CronBuilder>` (per-field editing with
"every N" interval toggles, quick presets, copy-to-clipboard and `multiple`
accumulation) and the `<CronSelectorField>` CRUD adapter for the for-react
form-provider contract, plus `registerCronComponents()` to register the
components with the rendering engine for model-driven forms. See
[`src/cron/README.md`](./src/cron/README.md) for the full component, helper and
registration contract.

Install requirements:

- `cronstrue@^3` and `@ionic/react@^9` are **optional peers** of the package
  and are **required by this subpath**: install them only in applications that
  import `./cron`; the root entry point never loads them.
- The subpath is **dual ESM + CJS**: both `import` and `require` conditions are
  published, so `require('@decaf-ts/for-react/cron')` works in CommonJS hosts
  without a dynamic `import()`.

Styles are consumer-wired — the subpath never imports CSS itself:

```ts
import "@ionic/react/css/core.css"; // Ionic base styles required by the Ion components
import "@decaf-ts/for-react/cron/styles.css"; // cron theme on top
```

i18n: the `component.cron_selector`, `component.cron_builder`, `cron_selector`
and `date` dictionaries ship with the package's English and Portuguese
resources, so selector, builder and weekday/month labels — and the generated
cronstrue descriptions — re-render when the active language changes.

The demo app (`npm run dev`, `http://localhost:8111`) ships the cron route:

| Route | What it exercises |
| --- | --- |
| `/cron` | [`./cron`](./src/cron/README.md): `<CronSelector>` and `<CronBuilder>` side by side with describe/disabled and hide-daily/interval/weekly toggles, and the generated expression output |

### Calendar

The `./calendar` subpath hosts a presentation-only, controlled month-grid
calendar over `react-day-picker`, with `date-fns` for the localized month,
weekday and date labels. It renders a fixed six-week grid with a single date
selection, host-owned event markers and month navigation, and owns no state:
the host supplies the year, month, selection and events and applies the
emitted `onDateSelected`/`onMonthChange` requests back. See
[`src/calendar/README.md`](./src/calendar/README.md) for the full component,
props and helper contract.

Install requirements:

- `react-day-picker@10.0.2` and `date-fns@^4.1.0` are **optional peers** of
  the package and are **required by this subpath**: install them only in
  applications that import `./calendar`; the root entry point never loads
  them. `@date-fns/tz` is an optional peer too, but the calendar itself
  imports only `react-day-picker` and `date-fns`, so install it only when the
  host uses it directly.
- The subpath is **dual ESM + CJS**: both `import` and `require` conditions
  are published, so `require('@decaf-ts/for-react/calendar')` works in
  CommonJS hosts without a dynamic `import()`.

The calendar is **prop-driven** — i18n is wired by the host, never by the
component:

- `locale` is a plain prop defaulting to `en-GB`: a BCP 47 tag mapped to the
  bundled `date-fns` locale table, with unknown tags falling back to the base
  language and finally to `enGB`.
- Every label prop (`label`, `previousMonthLabel`, `nextMonthLabel`,
  `todayLabel`) is a plain string with an English default. The subpath ships
  no locale files and never touches a translation provider.
- Applications that follow the surrounding language resolve the tag and the
  translated labels themselves — at the page level — and pass the resolved
  values down, as the demo page does.

Styles are consumer-wired — the subpath never imports CSS itself:

```ts
import "@decaf-ts/for-react/calendar/styles.css"; // calendar theme
```

The demo app (`npm run dev`, `http://localhost:8111`) ships the calendar
route:

| Route | What it exercises |
| --- | --- |
| `/calendar` | [`./calendar`](./src/calendar/README.md): `<Calendar>` over host-owned year/month/selection state with event markers, a details panel for the selected day and the Today gesture — with the locale and label strings resolved by the demo page through its own i18n |

### Kanban

The `./kanban` subpath hosts an accessible, controlled Kanban board over
`@dnd-kit/core` and `@dnd-kit/sortable`, mirroring the Angular
`@decaf-ts/for-angular/kanban` entry point. The board is **controlled and
emit-only**: it owns no data and never mutates a task. The host supplies the
task array, the task-to-column mapping and the column order/WIP limits
(`KanbanConfig`), and applies the typed events the board emits
(`onTaskMoved`, `onTaskReordered`, `onTaskSelected`, `onTaskEditRequested`,
`onSelectionCleared`, `onTaskMoveRejected`, `onRetryRequested`) back to its
own state. A refused interaction is never applied silently: the board calls
`onTaskMoveRejected` with a deterministic `reason` (`cancelled`, `disabled`,
`invalid-index`, `readonly`, `unchanged`, `unknown-column`, `wip-limit`) and
leaves the task where it was. See
[`src/kanban/README.md`](./src/kanban/README.md) for the full props, callbacks,
render props and accessibility contract.

Install requirements:

- `@dnd-kit/core@6.3.1` and `@dnd-kit/sortable@10.0.0` are **regular
  dependencies** of the package (the same model as `@xyflow/react` for
  `./diagrams`): installed with the package and only loaded and evaluated when
  this subpath is imported. Applications that import `./kanban` install
  nothing extra, and a consumer such as `/scrum` composes the board with zero
  new dependencies.
- The subpath is **dual ESM + CJS**: both `import` and `require` conditions
  are published, so `require('@decaf-ts/for-react/kanban')` works in CommonJS
  hosts without a dynamic `import()`.

Styles are consumer-wired — the subpath never imports CSS itself:

```ts
import "@decaf-ts/for-react/kanban/styles.css"; // kanban theme
```

The board is **prop-driven** — i18n is wired by the host, never by the
component:

- Every label prop (`label`, `emptyMessage`, `loadingMessage`, `errorMessage`,
  `retryLabel`, `keyboardHelp`) is a plain string with an English default. The
  subpath ships no locale files and never touches a translation provider.
- Applications that follow the surrounding language resolve the translated
  labels themselves — at the page level — and pass the resolved values down,
  as the demo page does.
- The Angular template directives (card / column-header / empty) become
  `renderCard`, `renderColumnHeader` and `renderEmpty` render props with
  identical context objects.

The demo app (`npm run dev`, `http://localhost:8111`) ships the kanban route:

| Route | What it exercises |
| --- | --- |
| `/kanban` | [`./kanban`](./src/kanban/README.md): `<KanbanBoard>` over host-owned task/selection/read-only/disabled/loading/error/filter state with add-card, reset and clear controls, an event log of emitted events and WIP-limit rejection feedback — with the label strings resolved by the demo page through its own i18n |

### Scrum

The `./scrum` subpath hosts backlog and sprint views for task-management
screens, composed from the [`./kanban`](./src/kanban/README.md) board instead
of shipping a second drag/drop engine: the `<SprintBoard>` renders the Kanban
status columns scoped to one sprint, the `<Backlog>` renders a single backlog
column with a per-card sprint-assignment select, and the `<SprintSelector>`
picks the sprint whose board is shown. Both views are **controlled and
emit-only**: the host owns tasks, sprints, selection and assignment, and
applies the typed events the views emit (`onBacklogReordered`,
`onSprintAssignmentRequested`, `onTaskMoved`, `onTaskReordered`,
`onTaskSelected`, `onTaskEditRequested`, `onSelectionCleared`,
`onTaskMoveRejected`, `onRetryRequested`) back to its own state. A refused
interaction is never applied silently: backlog reorder refusals carry the
Kanban rejection `reason` (`cancelled`, `disabled`, `invalid-index`,
`readonly`, `unchanged`, `unknown-column`, `wip-limit`) and sprint-assignment
refusals carry a deterministic `ScrumAssignmentRejectionReason` (`disabled`,
`error`, `loading`, `readonly`, `unchanged`, `unknown-sprint`). Sprint ids are
host-owned — only `null`, `undefined` and `''` map a task to the backlog — and
every sprint-board event adds the board's `sprintId`. See
[`src/scrum/README.md`](./src/scrum/README.md) for the full props, callbacks,
rejection ladder and render-prop contract.

Install requirements:

- `@dnd-kit/core@6.3.1` and `@dnd-kit/sortable@10.0.0` are regular dependencies
  of the package already required by `./kanban`: `/scrum` composes the board
  with zero new dependencies, so applications that import `./scrum` install
  nothing extra, and the root FESM stays scrum-free.
- The subpath is **dual ESM + CJS**: both `import` and `require` conditions are
  published, so `require('@decaf-ts/for-react/scrum')` works in CommonJS hosts
  without a dynamic `import()`.

Styles are consumer-wired — the subpath never imports CSS itself:

```ts
import "@decaf-ts/for-react/kanban/styles.css"; // kanban theme
import "@decaf-ts/for-react/scrum/styles.css"; // scrum layout on top
```

The views are **prop-driven** — i18n is wired by the host, never by the
components:

- Every label prop (`label`, `columnTitle`, `emptyMessage`, `loadingMessage`,
  `errorMessage`, `retryLabel`, `assignmentLabel`, `assignmentPlaceholder`) is
  a plain string with an English default. The subpath ships no locale files and
  never touches a translation provider.
- Both views accept the same `filter` predicate as `/kanban`, so a host search
  box can feed selector, backlog and sprint board.
- The `readonly` prop name from the Angular entry point is also accepted as an
  alias for `readOnly`.

The demo app (`npm run dev`, `http://localhost:8111`) ships the scrum route:

| Route | What it exercises |
| --- | --- |
| `/scrum` | [`./scrum`](./src/scrum/README.md): `<SprintSelector>`, `<Backlog>` and `<SprintBoard>` over host-owned task/sprint/selection state with read-only, disabled, loading and error toggles, a search filter, reset and clear controls, an event log of emitted events and sprint-assignment feedback — with the label strings resolved by the demo page through its own i18n |

### Storyboard

The `./storyboard` subpath is the React port of the Angular
`@decaf-ts/for-angular/storyboard` tutorial entry point. It ships the
`<StoryboardTutorial>` host, a module-singleton `StoryboardTutorialStore` with
`useStoryboardTutorial*` hooks built on `useSyncExternalStore`, the
framework-agnostic `StoryboardTutorialEngine`, `resolveTutorialCompletion` and
the DOM-aware `StoryboardTutorialActionDetector`, plus the
`FadeFocusStrategy`/`HighlightFocusStrategy` and `BubbleMessageStrategy`
plug-ins.

- **Zero new runtime dependencies.** The port uses React 19's
  `useSyncExternalStore` and a module singleton instead of a third-party tour
  library; `react`, the package helpers and `@decaf-ts/db-decorators` are the
  only imports.
- The store is the Angular root service transliterated: it owns the engine,
  mirrors state/status, persists a serializable snapshot to `sessionStorage`
  (`dcf-storyboard-tutorial`) and survives host unmounts and route navigation.
  A new host instance re-binds and resumes the same step; an unmount never
  aborts the run.
- Props: `scenario`, `autoStart`, `persist`, `focusStrategy`,
  `messageStrategy`, `instanceId` and an optional isolated `store`; callbacks
  `onStarted`, `onStepped`, `onFinished`. Labels live on the scenario and have
  English defaults.
- Whichever step is active, the overlay blocks page pointer and keyboard
  interaction except the step's `whitelist` selectors (marked with
  `data-dcf-tutorial-whitelisted`, with clip-path holes over their bounds).
  Completion supports `timeout`, `minTime` and a `click`/`drag`/`input`/`keys`
  action, with per-step overrides and `completion: false`.
- **Trust and privacy:** step selectors are trusted app content (never derive
  them from user input), and with `persist` enabled (the default) the scenario
  `context` is serialized to `sessionStorage` — keep secrets and PII out of the
  tutorial context or run those scenarios with `persist: false`. See the
  security notes in [`src/storyboard/README.md`](./src/storyboard/README.md).

Styles are consumer-wired:

```ts
import "@decaf-ts/for-react/storyboard/styles.css";
```

See [`src/storyboard/README.md`](./src/storyboard/README.md) for the full props,
store, hooks and export surface.

The demo app (`npm run dev`, `http://localhost:8111`) ships the storyboard
route:

| Route | What it exercises |
| --- | --- |
| `/storyboard` | [`./storyboard`](./src/storyboard/README.md): the four-step translated feature tour over an interactive playground with a non-blocking soft-spotlight focus strategy, plus scenario switches for placements, timeout, click, input, keys and custom labels/panel message; start/next/previous/abort/end controls, live status/active-step/last-event projection |

### Charts

The `./charts` subpath is the React port of the Angular
`@decaf-ts/for-angular/charts` entry point: CRD-ready chart layout components
over Apache ECharts — the `<LineChart>`, `<BarChart>`, `<PieChart>` and
`<ScatterChart>` family wrappers, with `BaseChart` (aliases
`ChartComponent`/`RgxChart`) registered as `ngx-decaf-chart` and defaulting to
a line chart — plus the fully controlled `<CurveEditor>` with its imperative
`CurveEditorHandle` ref API, the `useECharts` hook and the `VirtualDataset`
query pavement. See [`src/charts/README.md`](./src/charts/README.md) for the
full props, callbacks, imperative API and helper contract.

Install requirements:

- `echarts@^6.1.0` and `@cortex-js/compute-engine@^0.147.0` are **optional
  peers** of the package and are **required by this subpath**: install them
  only in applications that import `./charts`; the root entry point never
  loads them. The compute engine evaluates the curve editor's LaTeX formulas
  against the control points; the editor still renders points when the formula
  is empty.
- The subpath is **dual ESM + CJS**: both `import` and `require` conditions are
  published, so `require('@decaf-ts/for-react/charts')` works in CommonJS
  hosts without a dynamic `import()`.

Styles are consumer-wired — the subpath never imports CSS itself:

```ts
import "@decaf-ts/for-react/charts/styles.css"; // chart theme
```

Registration: importing the subpath runs `registerChartComponents()` once
(idempotent), registering only the five chart tags — `ngx-decaf-chart`,
`ngx-decaf-line-chart`, `ngx-decaf-bar-chart`, `ngx-decaf-pie-chart` and
`ngx-decaf-scatter-chart` — with the component registry. In
`CREATE`/`UPDATE` operation the chart components render their decorated
configuration model through the standard React rendering engine, so hosts that
use the config form must also call `registerDefaultComponents()` from the root
entry point (as the demo app does); importing `./charts` never registers
those.

The demo app (`npm run dev`, `http://localhost:8111`) ships the charts route:

| Route | What it exercises |
| --- | --- |
| `/charts` | [`./charts`](./src/charts/README.md): the four chart families over an editable row grid (category/value/weight/series with add/remove row) with per-family option toggles (smoothing, area, stacking, legend, tooltip), plus the controlled `<CurveEditor>` with draggable control points, monotonic/linear interpolation and LaTeX formula sampling — with the label strings resolved by the demo page through its own i18n |

### Dashboard builder demo

The demo app served by `npm run dev` (`http://localhost:8111`) ships a
`/dashboard-builder` route (sidebar entry "Dashboard Builder") exercising
`RgxDashboard` over a 4×4 grid with localStorage persistence — no backend
needed.

| Mode | Behaviour |
| --- | --- |
| Create | Empty 4×4 canvas; palette buttons insert a component into the first free cell; Save persists and switches to Read |
| Read | Renders the saved composition with no editing affordances (empty message when nothing is stored) |
| Update | Edits the saved composition; Save persists and switches to Read |
| Delete | Exposes the Delete button; deleting clears the stored composition and returns to Create |

The composition is stored in `localStorage` under the key
`dashboard-builder:composition` as a `DashDocument` JSON
(`{ name, cols, rows, placements }`); Read/Update/Delete load it on entry and
fall back to an empty document when the key is missing. A "Dashboard saved."
confirmation is announced after each save.

Palette components (registered in `RgxComponentRegistry` by the demo page):

| Tag | Label | Default size | Default config |
| --- | --- | --- | --- |
| `demo-stats` | Stat | 2×1 | `{ title: "Revenue", value: "$12,480" }` |
| `demo-list` | List | 2×2 | `{ title: "Top items", items: ["Alpha", "Bravo", "Charlie"] }` |
| `demo-note` | Note | 1×1 | `{ note: "Remember to review the composition." }` |

Editing (Create/Update): drag a tile by its header to move it and use the
corner handle to resize — both gestures snap to the grid and are rejected on
collision or out-of-bounds; the × button removes a tile after an explicit
confirm. Keyboard: tiles are focusable in edit modes (`role="group"`,
`tabindex="0"`) with an accessible position label ("Column {col}, row {row},
{cols} by {rows} cells") and a screen-reader hint; the arrow keys move the
focused tile one cell and Shift+Arrow resizes it, with invalid moves ignored.
Read mode removes every editing affordance, including tile focus.

Persisted compositions are restored through the public util
`restorePlacements(placements, allowedTags)`, exported from the root
`@decaf-ts/for-react` package: placements whose `tag` is not in the current
palette whitelist are dropped on restore, and prototype-pollution keys
(`__proto__`, `constructor`, `prototype`) are stripped from both the placement
and its `config`, so a tampered stored document cannot instantiate unregistered
components.

This is not a subpath export: the dashboard lives in the root package
(`src/lib/components/dashboard/`), so no export README under `src/` is needed.

End-to-end coverage runs through the minimal Playwright harness:
`npm run playwright` (alias `test:e2e`) boots the Vite dev server (port `8111`,
override with `FOR_REACT_E2E_PORT`) and runs the specs under
`tests/playwright/`; the Jest `test:all` suite excludes that folder. The
behaviour is additionally covered by `tests/unit/dashboard-parity.spec.tsx` and
`tests/integration/dashboard-builder-demo.spec.tsx`.




### Related

[![Readme Card](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=ts-workspace)](https://github.com/decaf-ts/ts-workspace)

### Social

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/TiagoVenceslau/)




#### Languages

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![ShellScript](https://img.shields.io/badge/Shell_Script-121011?style=for-the-badge&logo=gnu-bash&logoColor=white)

## Getting help

If you have bug reports, questions or suggestions, please [create a new issue](https://github.com/decaf-ts/ts-workspace/issues/new/choose).

## Contributing

I am grateful for any contributions made to this project. Please read [this](./workdocs/98-Contributing.md) to get started.

## Supporting

The first and easiest way you can support it is by [Contributing](./workdocs/tutorials/Contributing.md). Even just finding a typo in the documentation is important.

Financial support is always welcome and helps keep both me and the project alive and healthy.

So if you can, if this project in any way. either by learning something or simply by helping you save precious time, please consider donating.

## License

This project is released under the [MIT License](./LICENSE.md).

By developers, for developers...