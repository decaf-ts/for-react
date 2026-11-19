import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import {
  HighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  oneDarkHighlightStyle,
  oneDarkTheme,
} from "@codemirror/theme-one-dark";
import { linter, lintGutter } from "@codemirror/lint";

/**
 * @description Presentation mode of {@link CodeEditor}.
 * @summary `"code"` renders the full editor with line numbers, folding, lint
 * diagnostics and a JavaScript syntax check. `"formula"` renders a compact,
 * single-line expression field without gutters or linting. Neither mode
 * executes the document while editing.
 * @typedef {("code"|"formula")} CodeEditorMode
 * @memberOf module:for-react.code-editor
 */
export type CodeEditorMode = "formula" | "code";

/**
 * @description Props accepted by {@link CodeEditor}.
 * @summary Controls the editing mode, the controlled document value, the
 * accessible name, change notifications, and host-level styling. The component
 * is controlled: `code` is the source of truth and `onCodeChange` reports the
 * full document after each edit.
 * @interface CodeEditorProps
 * @property {CodeEditorMode} [mode="code"] - Editing surface to render.
 * @property {string} [code=""] - Controlled document content mirrored by the
 * editor. A changed value replaces the document; an emitted echo is ignored.
 * @property {string} [placeholder=""] - Text shown while the document is empty.
 * @property {string} [ariaLabel="Code editor"] - Accessible name applied to the
 * CodeMirror content element.
 * @property {function(string): void} [onCodeChange] - Called with the full
 * document after each edit; echoed values are suppressed on the way back.
 * @property {string} [className] - Extra CSS classes appended to the host.
 * @property {React.CSSProperties} [style] - Inline styles merged onto the host.
 * @memberOf module:for-react.code-editor
 */
export interface CodeEditorProps {
  /**
   * @description Editing surface to render. Defaults to `"code"`.
   */
  mode?: CodeEditorMode;
  /**
   * @description Controlled document content mirrored by the editor. Defaults
   * to `""`. A changed value replaces the document; an echo of the value the
   * editor just emitted is ignored so the cursor and selection are preserved.
   */
  code?: string;
  /**
   * @description Text shown while the document is empty. Defaults to `""`.
   */
  placeholder?: string;
  /**
   * @description Accessible name applied to the CodeMirror content element via
   * `aria-label`. Defaults to `"Code editor"`.
   */
  ariaLabel?: string;
  /**
   * @description Called with the full document after each edit. Persist the
   * value and feed it back through `code`; echoed values are suppressed.
   * @param {string} value - The complete document after the change.
   * @returns {void}
   */
  onCodeChange?: (value: string) => void;
  /**
   * @description Extra CSS classes appended to the outer editor host.
   */
  className?: string;
  /**
   * @description Inline styles merged onto the outer editor host after the
   * mode-specific defaults.
   */
  style?: React.CSSProperties;
}

/**
 * @description Imperative handle exposed through a React `ref` on
 * {@link CodeEditor}.
 * @summary Gives host integrations and tests access to the underlying CodeMirror
 * `EditorView`, its `EditorState` and editor element, plus a programmatic
 * `focus()`. The view-backed members are `undefined` before the editor mounts
 * and after it unmounts.
 * @interface CodeEditorHandle
 * @property {HTMLDivElement|null} [editor] - The CodeMirror editor DOM element
 * when the editor is mounted.
 * @property {EditorState} [state] - The current CodeMirror editor state.
 * @property {EditorView} [view] - The current CodeMirror view, usable for
 * dispatching changes or assertions.
 * @property {function(): void} focus - Moves focus into the editor; a no-op
 * before the view mounts.
 * @memberOf module:for-react.code-editor
 */
export interface CodeEditorHandle {
  /**
   * @description The CodeMirror editor DOM element when the editor is mounted.
   */
  readonly editor?: HTMLDivElement | null;
  /**
   * @description The current CodeMirror editor state.
   */
  readonly state?: EditorState;
  /**
   * @description The current CodeMirror view, usable for dispatching changes or
   * assertions in host integrations and tests.
   */
  readonly view?: EditorView;
  /**
   * @description Moves focus into the editor. A no-op before the view mounts.
   * @returns {void}
   */
  focus(): void;
}

const FONT_STACK =
  "'Fira Code', 'JetBrains Mono', 'Menlo', 'Consolas', monospace";

const CONTRAST_SAFE_TOKENS: Record<string, string> = {
  "#c678dd": "#d99bec",
  "#e06c75": "#ff8a93",
  "#7d8799": "#9aa4b1",
};

const contrastSafeOneDarkHighlightStyle = HighlightStyle.define(
  oneDarkHighlightStyle.specs.map((spec) => ({
    ...spec,
    color: spec.color
      ? CONTRAST_SAFE_TOKENS[spec.color] ?? spec.color
      : spec.color,
  }))
);

const editorTheme = EditorView.theme({
  "&": {
    fontFamily: FONT_STACK,
    fontSize: "13px",
  },
  "&.cm-focused": {
    outline: "2px solid rgba(59, 130, 246, 0.5)",
  },
  ".cm-scroller": {
    fontFamily: FONT_STACK,
    fontSize: "13px",
  },
});

const formulaTheme = EditorView.theme({
  ".cm-scroller": {
    whiteSpace: "nowrap",
    overflowX: "auto",
  },
});

// Compile-only check: `new Function(doc)` parses the document but is never
// invoked; any thrown error becomes a lint diagnostic and nothing runs.
const syntaxLinter = linter((view) => {
  const doc = view.state.doc.toString();
  if (!doc.trim()) return [];
  try {
    new Function(doc);
    return [];
  } catch (error) {
    return [
      {
        from: 0,
        to: doc.length,
        severity: "error" as const,
        message: `Syntax: ${(error as Error).message}`,
      },
    ];
  }
});

function buildExtensions(mode: CodeEditorMode, ariaLabel: string): Extension[] {
  const extensions: Extension[] = [
    history(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    highlightActiveLine(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...completionKeymap,
    ]),
    javascript({ typescript: false }),
    oneDarkTheme,
    syntaxHighlighting(contrastSafeOneDarkHighlightStyle),
    editorTheme,
    EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
  ];

  if (mode === "formula") {
    extensions.push(formulaTheme);
    return extensions;
  }

  extensions.unshift(
    lineNumbers(),
    foldGutter(),
    keymap.of(foldKeymap)
  );
  extensions.push(syntaxLinter, lintGutter());
  return extensions;
}

/**
 * @description Controlled CodeMirror 6 editor for code and formula input.
 * @summary Renders a real CodeMirror editor with history, bracket matching,
 * completion and accessible naming. In `"code"` mode it adds line numbers,
 * folding, a lint gutter and a JavaScript syntax check; in `"formula"` mode it
 * renders a compact single-line field. The editor never persists or executes
 * the document: `code` is the source of truth, `onCodeChange` emits the full
 * document after every edit, and echo updates are suppressed so the cursor and
 * selection survive a parent round-trip. The component exposes
 * {@link CodeEditorHandle} through a React `ref` and relies on CodeMirror's
 * standard keymaps for editing, history, folding and completion.
 * @param {CodeEditorProps} props - Mode, controlled document, accessible name,
 * change callback, and host styling.
 * @param {React.Ref<CodeEditorHandle>} ref - Optional ref that receives the
 * underlying view, state, editor element and `focus()` helper.
 * @returns {React.ReactElement} The editor host containing the CodeMirror view.
 * @function CodeEditor
 * @example
 * ```tsx
 * import { useRef, useState } from "react";
 * import {
 *   CodeEditor,
 *   type CodeEditorHandle,
 * } from "@decaf-ts/for-react/code-editor";
 *
 * export function ExpressionEditor() {
 *   const editorRef = useRef<CodeEditorHandle>(null);
 *   const [source, setSource] = useState("return value * 2;");
 *
 *   return (
 *     <CodeEditor
 *       ref={editorRef}
 *       mode="code"
 *       code={source}
 *       ariaLabel="Transform expression"
 *       onCodeChange={setSource}
 *     />
 *   );
 * }
 * ```
 * @mermaid
 * %%{init: {"theme": "base", "themeVariables": {"actorBkg": "#E8F1FB", "actorBorder": "#5B8DEF", "signalColor": "#34507A"}}}%%
 * sequenceDiagram
 *   autonumber
 *   participant Host as Parent component
 *   participant Editor as CodeEditor
 *   participant CM as CodeMirror
 *   Host->>Editor: render with mode, code and ariaLabel
 *   activate Editor
 *   Editor->>CM: mount view with built extensions
 *   activate CM
 *   CM-->>Editor: view ready
 *   deactivate CM
 *   Editor-->>Host: mounted editor host
 *   deactivate Editor
 *   CM->>Editor: user edits the document
 *   activate Editor
 *   Editor->>Host: onCodeChange(full document)
 *   deactivate Editor
 *   Host->>Editor: re-render with the emitted code
 *   activate Editor
 *   Editor->>Editor: detect echo, preserve selection
 *   Editor-->>Host: no document reset
 *   deactivate Editor
 * @memberOf module:for-react.code-editor
 */
export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    {
      mode = "code",
      code = "",
      placeholder = "",
      ariaLabel = "Code editor",
      onCodeChange,
      className,
      style,
    },
    ref
  ) {
    const cmRef = useRef<ReactCodeMirrorRef | null>(null);
    const lastEmitted = useRef("");
    const callbackRef = useRef(onCodeChange);

    useEffect(() => {
      callbackRef.current = onCodeChange;
    }, [onCodeChange]);

    useImperativeHandle(
      ref,
      () => ({
        get editor() {
          return cmRef.current?.editor;
        },
        get state() {
          return cmRef.current?.state;
        },
        get view() {
          return cmRef.current?.view;
        },
        focus() {
          cmRef.current?.view?.focus();
        },
      }),
      []
    );

    const handleChange = useCallback((value: string) => {
      lastEmitted.current = value;
      callbackRef.current?.(value);
    }, []);

    const extensions = useMemo(
      () => buildExtensions(mode, ariaLabel),
      [mode, ariaLabel]
    );

    const isFormula = mode === "formula";
    const currentDoc = cmRef.current?.view?.state.doc.toString();
    const value =
      currentDoc !== undefined && code === lastEmitted.current
        ? currentDoc
        : code;

    const hostClasses = [
      "code-editor-host",
      "dcf-code-editor-host",
      isFormula ? "code-editor-host--formula" : "code-editor-host--code",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const hostStyle: React.CSSProperties = isFormula
      ? {
          width: "100%",
          minHeight: 28,
          maxHeight: 120,
          overflow: "hidden",
          borderRadius: 6,
        }
      : {
          width: "100%",
          height: 160,
          minHeight: 160,
          resize: "vertical",
          overflow: "hidden",
          borderRadius: 6,
        };

    return (
      <div
        className={hostClasses}
        style={{ ...hostStyle, ...style }}
        data-mode={mode}
      >
        <CodeMirror
          ref={cmRef}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          theme="none"
          basicSetup={false}
          extensions={extensions}
          height={isFormula ? undefined : "100%"}
          minHeight={isFormula ? "28px" : undefined}
          maxHeight={isFormula ? "120px" : undefined}
          style={isFormula ? { height: "auto" } : { height: "100%" }}
        />
      </div>
    );
  }
);

/**
 * @description Alias of {@link CodeEditor} kept for callers porting Angular
 * component names to the React package.
 * @summary Behaves exactly like {@link CodeEditor}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {React.ForwardRefExoticComponent}
 * @memberOf module:for-react.code-editor
 */
export const CodeEditorComponent = CodeEditor;
/**
 * @description Alias of {@link CodeEditor} following the `Rgx*` naming
 * convention of the main for-react UI kit.
 * @summary Behaves exactly like {@link CodeEditor}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {React.ForwardRefExoticComponent}
 * @memberOf module:for-react.code-editor
 */
export const RgxCodeEditor = CodeEditor;
