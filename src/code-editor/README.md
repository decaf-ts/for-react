# `@decaf-ts/for-react/code-editor`

Code and formula editing surface backed by the CodeMirror 6 family, exposed as
the `./code-editor` subpath export of `@decaf-ts/for-react`. The React binding
uses [`@uiw/react-codemirror`](https://github.com/uiwjs/react-codemirror); the
CM6 engine, language packages and theme are reused unchanged from the Angular
implementation.

## Install

```bash
npm install @decaf-ts/for-react \
  @uiw/react-codemirror@^4.25.12 \
  @codemirror/state@^6.7.6 @codemirror/view@^6.43.14 \
  @codemirror/commands@^6.11.1 @codemirror/language@^6.13.1 \
  @codemirror/autocomplete@^6.20.3 @codemirror/lint@^6.9.7 \
  @codemirror/lang-javascript@^6.2.5 @codemirror/theme-one-dark@^6.1.3
```

The CodeMirror packages and `@uiw/react-codemirror` are regular dependencies of
`@decaf-ts/for-react`; importing the root package does not pull them in. The
`./code-editor` subpath is the only entry point that loads the editor, so the
main bundle stays free of CodeMirror.

### Compatibility

| Package | Tested range |
| --- | --- |
| `react` / `react-dom` | `>=18.0.0` |
| `@uiw/react-codemirror` | `^4.25.12` |
| CodeMirror packages | versions listed above |

All CodeMirror packages are MIT-licensed; see the package `NOTICE`.

## Fallback decision

The Angular entry point lazy-loads CodeMirror and renders an Ionic textarea when
the dynamic import fails. The React entry point intentionally does **not** keep
that fallback:

- `@uiw/react-codemirror` is a static dependency, so a failed import is a
  manifest/install error rather than a recoverable runtime condition.
- The `./code-editor` subpath is already the isolation boundary: applications
  that never import it never download or evaluate CodeMirror.
- Rendering a second editable control with different semantics would mask a
  broken install and split the controlled-value contract across two widgets.

The React component therefore always renders a real CodeMirror editor.

## Controlled-view contract

The editor never persists code and never runs it.

- `code` is the source of truth. The editor mirrors it; changing the input
  replaces the document. An external value equal to the current document is a
  no-op, and an echo of the value the editor just emitted is suppressed so the
  cursor and selection are not reset.
- `onCodeChange` emits the full document after each change. Persist it and feed
  it back through `code`; the component skips echo updates.
- `mode="code"` enables line numbers, folding, lint diagnostics and a JavaScript
  syntax check. `mode="formula"` renders a single-line, compact field for
  expressions. Neither mode executes the content while editing.
- There is no `readOnly` prop: render a non-editing view when a read-only
  surface is required.

### Syntax linter and CSP

`mode="code"` parses the document with `new Function(doc)` **compile-only**: the
compiled function is never invoked, and only thrown parse errors become
`Syntax:` lint diagnostics. This requires a CSP that allows
`script-src 'unsafe-eval'`; hosts running a strict nonce-based CSP must drop the
linter (the rest of the editor is unaffected).

## Usage

```tsx
import React, { useState } from "react";
import { CodeEditor } from "@decaf-ts/for-react/code-editor";

export function ExpressionEditor() {
  const [source, setSource] = useState("return value * 2;");

  return (
    <CodeEditor
      mode="code"
      code={source}
      placeholder="return value * 2;"
      ariaLabel="Transform expression"
      onCodeChange={setSource}
    />
  );
}
```

### API

| Member | Type | Purpose |
| --- | --- | --- |
| `mode` | `'code' \| 'formula'` | Full editor or compact expression field. Defaults to `'code'`. |
| `code` | `string` | Document content. Defaults to `''`. |
| `placeholder` | `string` | Placeholder when empty. Defaults to `''`. |
| `ariaLabel` | `string` | Accessible name for the CodeMirror content element. Defaults to `'Code editor'`. |
| `onCodeChange` | `(value: string) => void` | Full document after each change. |
| `className` / `style` | `string` / `CSSProperties` | Applied to the outer editor host. |

`CodeEditorComponent` and `RgxCodeEditor` are exported as aliases of
`CodeEditor` for callers porting Angular component names or following the
`Rgx*` naming convention of the main package.

A `ref` exposes `{ view, state, editor, focus() }` for host integrations and
tests that need the underlying CodeMirror `EditorView`.

## Styling

The component carries its own styling:

- CodeMirror's `oneDark` theme plus a contrast-safe remapped highlight style
  (`#c678dd` → `#d99bec`, `#e06c75` → `#ff8a93`, `#7d8799` → `#9aa4b1`).
- Monospace stack (`Fira Code`, `JetBrains Mono`, `Menlo`, `Consolas`) at 13px.
- Focus outline `2px solid rgba(59, 130, 246, 0.5)`.
- Code mode host is 160px tall and vertically resizable; formula mode is a
  28px–120px single-line surface with horizontal scrolling.

No stylesheet import is required.

## Accessibility and SSR

- The CodeMirror content element receives the `ariaLabel` accessible name via
  `EditorView.contentAttributes` (`aria-label`).
- Keyboard editing, history, folding, completion and lint gutter use
  CodeMirror's standard keymaps.
- The focus ring is visible and follows the consumer's theme.
- Importing the subpath is safe in server rendering; the editor is created in an
  effect on the client.

## License

The CodeMirror packages are MIT-licensed. They are external dependencies and are
not vendored.
