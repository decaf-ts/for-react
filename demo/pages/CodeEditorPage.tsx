import React, { useMemo, useState } from "react";
import {
  CodeEditor,
  type CodeEditorMode,
} from "../../src/code-editor";
import { useTranslate } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";

interface EditorStatus {
  state: "empty" | "valid" | "invalid" | "formula";
  message?: string;
}

interface CodeSnippet {
  id: string;
  labelKey: string;
  mode: CodeEditorMode;
  code: string;
}

const SNIPPETS: CodeSnippet[] = [
  {
    id: "transform",
    labelKey: "code_editor.snippet_transform",
    mode: "code",
    code: "const value = Number($input.value ?? 0);\nreturn value * 2 + 1;",
  },
  {
    id: "filter",
    labelKey: "code_editor.snippet_filter",
    mode: "code",
    code: "const items = Array.isArray($input.items) ? $input.items : [];\nreturn items.filter((item) => item.active);",
  },
  {
    id: "formula",
    labelKey: "code_editor.snippet_formula",
    mode: "formula",
    code: "$input.value > 0 && $input.value < 100",
  },
];

const DEFAULT_CODE = SNIPPETS[0].code;

export function CodeEditorPage() {
  const translate = useTranslate();
  const [mode, setMode] = useState<CodeEditorMode>("code");
  const [code, setCode] = useState(DEFAULT_CODE);
  const [lastEmitted, setLastEmitted] = useState("");

  const lineCount = code.length ? code.split("\n").length : 0;
  const characterCount = code.length;
  const placeholderKey =
    mode === "formula"
      ? "code_editor.placeholder_formula"
      : "code_editor.placeholder_code";

  const status = useMemo<EditorStatus>(() => {
    if (mode === "formula") return { state: "formula" };
    const trimmed = code.trim();
    if (!trimmed) return { state: "empty" };
    try {
      new Function(trimmed);
      return { state: "valid" };
    } catch (error) {
      return { state: "invalid", message: (error as Error).message };
    }
  }, [mode, code]);

  const onModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setMode(event.target.value as CodeEditorMode);
  };

  const onCodeChange = (value: string) => {
    setCode(value);
    setLastEmitted(value);
  };

  const loadSnippet = (snippet: CodeSnippet) => {
    setMode(snippet.mode);
    setCode(snippet.code);
  };

  const reset = () => {
    setMode("code");
    setCode("");
    setLastEmitted("");
  };

  return (
    <section
      className="app-page code-editor-page"
      aria-labelledby="code-editor-title"
    >
      <CardTitle
        title="code_editor.title"
        subtitle="code_editor.intro"
      />
      <h2 id="code-editor-title" className="app-visually-hidden">
        {translate("code_editor.title")}
      </h2>

      <div className="code-editor-page__layout">
        <section className="code-editor-page__panel">
          <div className="code-editor-page__toolbar">
            <label className="code-editor-page__field">
              <span>{translate("code_editor.mode_label")}</span>
              <select
                data-testid="code-editor-mode"
                value={mode}
                onChange={onModeChange}
              >
                <option value="code">
                  {translate("code_editor.mode_code")}
                </option>
                <option value="formula">
                  {translate("code_editor.mode_formula")}
                </option>
              </select>
            </label>
            <button
              type="button"
              className="code-editor-page__reset"
              data-testid="code-editor-reset"
              onClick={reset}
            >
              {translate("code_editor.reset")}
            </button>
          </div>

          <div data-testid="code-editor-host">
            <CodeEditor
              mode={mode}
              code={code}
              placeholder={translate(placeholderKey)}
              ariaLabel={translate("code_editor.title")}
              onCodeChange={onCodeChange}
            />
          </div>

          <section className="code-editor-page__snippets">
            <h3>{translate("code_editor.snippets_label")}</h3>
            <div className="code-editor-page__snippet-list">
              {SNIPPETS.map((snippet) => (
                <button
                  key={snippet.id}
                  type="button"
                  className="code-editor-page__snippet"
                  data-testid={`code-editor-snippet-${snippet.id}`}
                  onClick={() => loadSnippet(snippet)}
                >
                  {translate(snippet.labelKey)}
                </button>
              ))}
            </div>
          </section>
        </section>

        <aside className="code-editor-page__panel code-editor-page__status">
          <h3>{translate("code_editor.status_title")}</h3>
          <dl className="code-editor-page__stats">
            <div>
              <dt>{translate("code_editor.lines_label")}</dt>
              <dd data-testid="code-editor-lines">{lineCount}</dd>
            </div>
            <div>
              <dt>{translate("code_editor.characters_label")}</dt>
              <dd data-testid="code-editor-characters">{characterCount}</dd>
            </div>
          </dl>

          <p
            className="code-editor-page__syntax"
            data-testid="code-editor-syntax"
            aria-live="polite"
          >
            {status.state === "valid" ? (
              <span className="code-editor-page__syntax--ok">
                {translate("code_editor.syntax_ok")}
              </span>
            ) : null}
            {status.state === "invalid" ? (
              <span className="code-editor-page__syntax--error">
                {translate("code_editor.syntax_error", {
                  message: status.message,
                })}
              </span>
            ) : null}
            {status.state === "formula"
              ? translate("code_editor.syntax_formula")
              : null}
            {status.state === "empty"
              ? translate("code_editor.syntax_empty")
              : null}
          </p>

          <h3>{translate("code_editor.emitted_title")}</h3>
          {lastEmitted ? (
            <pre
              className="code-editor-page__emitted"
              data-testid="code-editor-emitted"
            >
              {lastEmitted}
            </pre>
          ) : (
            <p className="code-editor-page__empty">
              {translate("code_editor.emitted_empty")}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
