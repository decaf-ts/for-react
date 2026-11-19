# `@decaf-ts/for-react/diagrams`

The graph/diagram editor surfaces of `@decaf-ts/for-react`, built on
[`@xyflow/react`](https://github.com/xyflow/xyflow) (React Flow) and the
`@decaf-ts/as-graph` document model. It is the React counterpart of the
`@decaf-ts/for-angular` graph editor, exposed as the `./diagrams` subpath
export so React Flow is not part of the root package bundle: hosts that never
import this subpath never download or evaluate it.

The architecture is canonical-document-first: a
`GraphWorkflowDocumentStore` holds the single source of truth, every canvas
gesture is translated into a document command, and the canvas is always
re-projected from the stored document — never the other way around.

## Install

```bash
npm install @decaf-ts/for-react @decaf-ts/as-graph
```

- `react`/`react-dom` `>= 18` are peer dependencies of the whole package.
- `@decaf-ts/as-graph@^0.11.5` is an **optional peer** of the package and is
  **required by this subpath**: every diagram document type
  (`GraphWorkflowDocument`, `GraphNodeManifest`, …) comes from
  `@decaf-ts/as-graph/shared`. Hosts that import `./diagrams` must install it.
- `@xyflow/react@^13.0.2` is a regular dependency: it is installed with the
  package and is only loaded and evaluated when this subpath is imported.

## Usage

```tsx
import {
  GraphRenderer,
  GraphWorkflowDocumentStore,
} from "@decaf-ts/for-react/diagrams";
import type { GraphNodeManifest, GraphWorkflowDocument } from "@decaf-ts/as-graph/shared";

const store = new GraphWorkflowDocumentStore();
const document: GraphWorkflowDocument = /* loaded from your backend */;
const manifests: GraphNodeManifest[] = /* served by `GET /graph/node-types` */;

export function WorkflowEditor() {
  return (
    <GraphRenderer
      document={document}
      store={store}
      manifests={manifests}
      onDocumentChange={(next) => saveWorkflow(next)}
      onMutation={(source) => scheduleAutosave(source)}
      onRun={(inputs) => startRun(inputs)}
    />
  );
}
```

`GraphRenderer` props:

| Prop | Purpose |
| --- | --- |
| `document` | Canonical document to open; replaces the store's document when it changes. |
| `store` | Explicit `GraphWorkflowDocumentStore`; a fresh one is created when omitted. |
| `catalogue` | Node catalogue reader (usually the `GraphNodeCatalogStore`). |
| `manifests` | Manifests used to build a default catalogue when `catalogue` is omitted. |
| `showSidePanels`, `readOnly`, `showLogs` | Palette/side panels, editing and run-log console toggles. |
| `className` | Extra class on the canvas root. |
| `onDocumentChange` | Notified whenever the document version changes. |
| `onRun` | Notified when the user submits the workflow input form. |
| `onMutation` | Notified after a node/edge mutation (`node-position`, `edge-connect`, `edge-disconnect`, `node-crud`) so hosts can autosave. |

## What the subpath exports

Grouped inventory of the public surface (all re-exported from
`public-api.ts`):

- **Canvas components** — `GraphRenderer` plus the node, boundary, ghost and
  edge templates, `GraphToolbar`, `GraphHeaderbar`, `GraphSidebarMenu`,
  `GraphHome`, `GraphChat`, node edit/switch modals, inspection panel,
  condition editor, inline editors, port field, IO viewer, run-log widget and
  `GraphCanvasContext`.
- **Document layer** — `GraphWorkflowDocumentStore`, `GraphDiagramAdapter`,
  `GraphDocumentCommands`/`applyGraphDocumentCommand`,
  `GraphDiagramMutationTranslator`, `GraphDocumentSelectors`,
  `GraphNodePaletteFactory`, `GraphNodeValueHydration`,
  `GraphWorkflowDocumentStore`, `GraphWorkflowLayoutLoader`,
  `GraphConnectionGuard` and `LoopChainRepair`.
- **Catalogue** — `GraphNodeCatalogStore`, `GraphNodeCatalogService`, reader
  and composite source, manifest snapshots, fixtures and resolution types.
- **Capabilities** — engine capability service, store, gates and API.
- **Execution and runs** — execution/state services and mappers,
  `GhostNodeStore`, `GraphInspectionStore`, `GraphRunLogStore`,
  `GraphSelectionStore`, `GraphRunClient`, `GraphRunEventClient`,
  `GraphRunPresentation`, `GraphRunStateStore`.
- **Host services** — autosave, history, keyboard shortcuts, mutation
  detector and save services.
- **Validation** — `GraphWorkflowValidateClient` and
  `GraphWorkflowValidityStore`.
- **Parameters** — parameter form builder, renderer registry/contract,
  validation mapper and visibility evaluator.
- **Support** — workflow input builders, port-zone readers, configuration
  tokens, `GraphTranslateService` (i18n) and the shared types/utils.

## Editing policy

- **Guards are UX only.** `GraphConnectionGuard` (`evaluateGraphConnection`)
  validates a drag while it is in progress and reports deterministic denial
  codes — missing endpoints, `unknown-port`, wrong port `direction`, port
  `port-category` mismatch, `duplicate`, self-connections and port occupancy
  (`source-occupied`/`target-occupied`).
- **The document translator is the authority.** Every accepted gesture is
  translated into a `GraphDocumentCommand` and dispatched to the store; the
  command layer revalidates against the stored document and invalid mutations
  throw a Decaf `ValidationError` before any optimistic change lands. The
  canvas is then re-projected from the stored document, never the reverse.
- **Mandatory edges.** Loop-body containment edges are marked `mandatory`
  (`metadata.mandatory`) and cannot be deleted or reconnected; their endpoint
  nodes are protected from deletion, as are ghost nodes and the
  `input-`/`output-` boundary nodes that project workflow ports.

## Styles and theme

Load the React Flow base stylesheet and the adapter stylesheet once in the
host application (for example in the app entry point):

```ts
import "@xyflow/react/dist/style.css";
import "@decaf-ts/for-react/diagrams/styles.css";
```

The subpath does not import CSS itself, so importing it in a server renderer
or a CSS-restricted framework cannot fail on a stylesheet import. The adapter
stylesheet lifts the editor palette into `--gx-*` custom properties: light
values sit on `:root`, and dark values apply under both
`html.dcf-palette-dark` (engine-driven toggle) and
`@media (prefers-color-scheme: dark)` (system preference). Global `--dcf-*`
tokens are untouched, so no surface outside the graph editor changes
appearance.

## SSR and client-only rendering

The renderer is only instantiated in the browser: when `window` is undefined,
`GraphRenderer` emits an empty, `aria-hidden` placeholder and no React Flow
provider or graph is initialized. Import-time code never touches `window` or
`document`.

## i18n

The subpath ships no locale files or fixed key tables. `GraphTranslateContract`
lets the host plug in its own translator and `GraphTranslateService.key(key,
fallback)` resolves editor strings through it, falling back to the supplied
default when the translator is absent or a key is not loaded.

## License

`@xyflow/react` is MIT-licensed. It is an external dependency and is not
vendored or relicensed by `@decaf-ts/for-react`. See the React Flow package
for its complete license and notices.
