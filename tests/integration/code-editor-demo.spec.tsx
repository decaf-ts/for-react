import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { CodeEditorPage } from "../../demo/pages/CodeEditorPage";
import { I18nLoader } from "../../src/lib/i18n/Loader";

const CODE_EDITOR_TRANSLATIONS = {
  title: "Code editor",
  intro:
    "Code and formula editing surface backed by CodeMirror 6. Switch modes, load a snippet, and watch the emitted document update.",
  mode_label: "Mode",
  mode_code: "Code",
  mode_formula: "Formula",
  reset: "Reset",
  snippets_label: "Snippets",
  snippet_transform: "Transform",
  snippet_filter: "Filter",
  snippet_formula: "Formula",
  status_title: "Status",
  lines_label: "Lines",
  characters_label: "Characters",
  syntax_ok: "Syntax looks valid",
  syntax_error: "Syntax error: {message}",
  syntax_formula: "Formula mode (no JavaScript check)",
  syntax_empty: "Start typing to see validation",
  emitted_title: "Last emission",
  emitted_empty: "No edits emitted yet",
  placeholder_code: "return value * 2;",
  placeholder_formula: "$input.value > 0",
};

beforeAll(() => {
  I18nLoader.cache["en"] = {
    ...(I18nLoader.cache["en"] || {}),
    code_editor: CODE_EDITOR_TRANSLATIONS,
  };
});

function host(): HTMLElement {
  return document.querySelector(".code-editor-host") as HTMLElement;
}

function view(): EditorView {
  const cm = host().querySelector(".cm-editor") as HTMLElement;
  const found = EditorView.findFromDOM(cm);
  if (!found) throw new Error("CodeMirror view was not mounted");
  return found;
}

function replaceDocument(value: string): void {
  const editor = view();
  act(() => {
    editor.dispatch({
      changes: {
        from: 0,
        to: editor.state.doc.length,
        insert: value,
      },
    });
  });
}

function stats(): { lines: string; characters: string } {
  return {
    lines: screen.getByTestId("code-editor-lines").textContent || "",
    characters: screen.getByTestId("code-editor-characters").textContent || "",
  };
}

describe("CodeEditor demo page — end to end", () => {
  it("renders the seeded transform snippet in code mode", () => {
    render(<CodeEditorPage />);

    expect(host().classList.contains("code-editor-host--code")).toBe(true);
    expect(document.querySelector(".cm-content")?.textContent).toContain(
      "const value = Number($input.value ?? 0);"
    );
    expect(screen.getByText("Syntax looks valid")).toBeInTheDocument();
    expect(stats()).toEqual({ lines: "2", characters: "62" });
    expect(screen.getByText("No edits emitted yet")).toBeInTheDocument();
  });

  it("updates the counters and last-emission panel after an edit", () => {
    render(<CodeEditorPage />);

    replaceDocument("// note\nconst value = Number($input.value ?? 0);");

    expect(stats()).toEqual({ lines: "2", characters: "48" });
    expect(screen.getByTestId("code-editor-emitted").textContent).toBe(
      "// note\nconst value = Number($input.value ?? 0);"
    );
    expect(screen.getByText("Syntax looks valid")).toBeInTheDocument();
  });

  it("switches to formula mode from the mode selector", () => {
    render(<CodeEditorPage />);

    fireEvent.change(screen.getByTestId("code-editor-mode"), {
      target: { value: "formula" },
    });

    expect(host().classList.contains("code-editor-host--formula")).toBe(true);
    expect(
      screen.getByText("Formula mode (no JavaScript check)")
    ).toBeInTheDocument();
  });

  it("loads the Formula snippet and switches mode and code", () => {
    render(<CodeEditorPage />);

    fireEvent.click(screen.getByTestId("code-editor-snippet-formula"));

    expect(host().classList.contains("code-editor-host--formula")).toBe(true);
    expect(
      (screen.getByTestId("code-editor-mode") as HTMLSelectElement).value
    ).toBe("formula");
    expect(document.querySelector(".cm-content")?.textContent).toContain(
      "$input.value > 0 && $input.value < 100"
    );
    expect(
      screen.getByText("Formula mode (no JavaScript check)")
    ).toBeInTheDocument();
  });

  it("loads the Filter snippet in code mode with a valid status", () => {
    render(<CodeEditorPage />);

    fireEvent.click(screen.getByTestId("code-editor-snippet-filter"));

    expect(host().classList.contains("code-editor-host--code")).toBe(true);
    expect(document.querySelector(".cm-content")?.textContent).toContain(
      "return items.filter((item) => item.active);"
    );
    expect(screen.getByText("Syntax looks valid")).toBeInTheDocument();
    expect(document.querySelector(".cm-lineNumbers")).not.toBeNull();
  });

  it("reports a syntax error for malformed code without throwing", () => {
    render(<CodeEditorPage />);

    expect(() => replaceDocument("const = ;")).not.toThrow();

    expect(screen.getByTestId("code-editor-syntax").textContent).toContain(
      "Syntax error:"
    );
  });

  it("resets mode, document, counters, and last emission", async () => {
    render(<CodeEditorPage />);
    replaceDocument("const a = 1;");

    fireEvent.click(screen.getByTestId("code-editor-reset"));

    await waitFor(() => expect(view().state.doc.toString()).toBe(""));
    expect(
      (screen.getByTestId("code-editor-mode") as HTMLSelectElement).value
    ).toBe("code");
    expect(host().classList.contains("code-editor-host--code")).toBe(true);
    expect(stats()).toEqual({ lines: "0", characters: "0" });
    expect(screen.getByText("No edits emitted yet")).toBeInTheDocument();
    expect(
      screen.getByText("Start typing to see validation")
    ).toBeInTheDocument();
  });
});
