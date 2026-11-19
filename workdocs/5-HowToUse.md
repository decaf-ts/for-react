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


