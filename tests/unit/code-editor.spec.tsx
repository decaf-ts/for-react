import React, { createRef } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { highlightingFor } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import { tags, type Tag } from "@lezer/highlight";
import {
  diagnosticCount,
  forEachDiagnostic,
  forceLinting,
} from "@codemirror/lint";
import {
  CodeEditor,
  CodeEditorComponent,
  RgxCodeEditor,
  type CodeEditorHandle,
} from "../../src/code-editor";

function renderEditor(
  props: React.ComponentProps<typeof CodeEditor> = {}
): {
  ref: React.RefObject<CodeEditorHandle | null>;
  container: HTMLElement;
  rerender: (next: React.ComponentProps<typeof CodeEditor>) => void;
  unmount: () => void;
} {
  const ref = createRef<CodeEditorHandle>();
  const view = render(<CodeEditor ref={ref} {...props} />);
  return {
    ref,
    container: view.container,
    rerender: (next) => view.rerender(<CodeEditor ref={ref} {...next} />),
    unmount: view.unmount,
  };
}

function viewOf(ref: React.RefObject<CodeEditorHandle | null>) {
  const view = ref.current?.view;
  if (!view) throw new Error("CodeMirror view was not mounted");
  return view;
}

describe("CodeEditor — IDE-like code input", () => {
  it("defaults to code mode with an empty document and does not throw", () => {
    const { ref, container } = renderEditor();
    const host = container.querySelector(".code-editor-host") as HTMLElement;

    expect(host).not.toBeNull();
    expect(host.dataset.mode).toBe("code");
    expect(host.classList.contains("code-editor-host--code")).toBe(true);
    expect(viewOf(ref).state.doc.toString()).toBe("");
  });

  it("exports the CodeEditorComponent and RgxCodeEditor aliases", () => {
    expect(CodeEditorComponent).toBe(CodeEditor);
    expect(RgxCodeEditor).toBe(CodeEditor);
  });

  it("mounts a real CodeMirror editor and no textarea fallback", () => {
    const { container, unmount } = renderEditor({ code: "const a = 1;" });
    const host = container.querySelector(".code-editor-host") as HTMLElement;

    expect(host.querySelector(".cm-editor")).not.toBeNull();
    expect(host.querySelector("textarea")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    unmount();
  });

  it("seeds the editor with the initial code value", () => {
    const { container } = renderEditor({ code: "const a = 1;" });
    const content = container.querySelector(".cm-content") as HTMLElement;

    expect(content.textContent).toContain("const a = 1;");
  });

  it("marks formula mode on the host and keeps code mode unmarked", () => {
    const formula = renderEditor({ mode: "formula" });
    const formulaHost = formula.container.querySelector(
      ".code-editor-host"
    ) as HTMLElement;
    expect(formulaHost.classList.contains("code-editor-host--formula")).toBe(
      true
    );
    expect(formulaHost.classList.contains("code-editor-host--code")).toBe(
      false
    );
    formula.unmount();

    const code = renderEditor({ mode: "code" });
    const codeHost = code.container.querySelector(
      ".code-editor-host"
    ) as HTMLElement;
    expect(codeHost.classList.contains("code-editor-host--formula")).toBe(
      false
    );
    expect(codeHost.classList.contains("code-editor-host--code")).toBe(true);
  });

  it("adds line numbers and the lint gutter in code mode", () => {
    const { container } = renderEditor({ mode: "code", code: "const a = 1;" });

    expect(container.querySelector(".cm-lineNumbers")).not.toBeNull();
    expect(container.querySelector(".cm-gutter-lint")).not.toBeNull();
  });

  it("skips line numbers and the lint gutter in formula mode", () => {
    const { container } = renderEditor({ mode: "formula", code: "a + b" });

    expect(container.querySelector(".cm-lineNumbers")).toBeNull();
    expect(container.querySelector(".cm-gutter-lint")).toBeNull();
  });

  it("emits onCodeChange with the full document on a document change", () => {
    const onCodeChange = jest.fn();
    const { ref } = renderEditor({
      mode: "code",
      code: "const a = 1;",
      onCodeChange,
    });
    const view = viewOf(ref);

    act(() => {
      view.dispatch({ changes: { from: 0, insert: "// edited\n" } });
    });

    expect(onCodeChange).toHaveBeenCalledWith("// edited\nconst a = 1;");
  });

  it("syncs a changed external code prop into the existing view", () => {
    const { ref, rerender } = renderEditor({ code: "const a = 1;" });
    const view = viewOf(ref);

    rerender({ code: "const b = 2;" });

    expect(view.state.doc.toString()).toBe("const b = 2;");
  });

  it("suppresses echo resets and preserves selection after emitting", () => {
    const onCodeChange = jest.fn();
    const { ref, rerender } = renderEditor({
      code: "const a = 1;",
      onCodeChange,
    });
    const view = viewOf(ref);

    act(() => {
      view.dispatch({ changes: { from: 0, insert: "// edited\n" } });
    });
    const emitted = view.state.doc.toString();
    expect(onCodeChange).toHaveBeenLastCalledWith(emitted);

    act(() => {
      view.dispatch({ selection: { anchor: 2 } });
    });
    expect(view.state.selection.main.head).toBe(2);

    const dispatch = jest.spyOn(view, "dispatch");
    rerender({ code: emitted, onCodeChange });

    expect(dispatch).not.toHaveBeenCalled();
    expect(view.state.selection.main.head).toBe(2);
    expect(view.state.doc.toString()).toBe(emitted);
  });

  it("does not dispatch a reset when re-rendered with the current document", () => {
    const { ref, rerender } = renderEditor({ code: "const a = 1;" });
    const view = viewOf(ref);
    const dispatch = jest.spyOn(view, "dispatch");

    rerender({ code: "const a = 1;" });

    expect(dispatch).not.toHaveBeenCalled();
    expect(view.state.doc.toString()).toBe("const a = 1;");
  });

  it("names the CodeMirror content element from ariaLabel", () => {
    const { container, unmount } = renderEditor({
      ariaLabel: "Code editor",
      code: "const a = 1;",
    });
    const content = container.querySelector(".cm-content") as HTMLElement;

    expect(screen.getByRole("textbox", { name: "Code editor" })).toBe(content);
    expect(content.getAttribute("aria-label")).toBe("Code editor");
    unmount();

    const custom = renderEditor({
      ariaLabel: "Formula field",
      mode: "formula",
      code: "a + b",
    });
    const customContent = custom.container.querySelector(
      ".cm-content"
    ) as HTMLElement;

    expect(screen.getByRole("textbox", { name: "Formula field" })).toBe(
      customContent
    );
    expect(customContent.getAttribute("aria-label")).toBe("Formula field");
  });

  it("renders the supplied placeholder when the document is empty", () => {
    const { container } = renderEditor({ placeholder: "return value * 2;" });
    const placeholder = container.querySelector(".cm-placeholder") as HTMLElement;

    expect(placeholder).not.toBeNull();
    expect(placeholder.textContent).toContain("return value * 2;");
  });

  it("preserves the document and swaps the gutter surface on mode switch", () => {
    const code = "const a = 1;\nconst b = 2;";
    const { ref, container, rerender } = renderEditor({ mode: "code", code });
    const view = viewOf(ref);
    expect(container.querySelector(".cm-lineNumbers")).not.toBeNull();

    rerender({ mode: "formula", code });

    expect(view.state.doc.toString()).toBe(code);
    expect(container.querySelector(".cm-lineNumbers")).toBeNull();
    expect(container.querySelector(".cm-gutter-lint")).toBeNull();
    expect(container.querySelector(".code-editor-host--formula")).not.toBeNull();
  });

  it("unmounts without throwing", () => {
    const { unmount } = renderEditor({ code: "const a = 1;" });

    expect(() => unmount()).not.toThrow();
    expect(document.querySelector(".cm-editor")).toBeNull();
  });
});

const REMAPPED_RGB: Record<string, string> = {
  "#c678dd": "rgb(217, 155, 236)",
  "#e06c75": "rgb(255, 138, 147)",
  "#7d8799": "rgb(154, 164, 177)",
};

const STOCK_RGB: Record<string, string> = {
  "#c678dd": "rgb(198, 120, 221)",
  "#e06c75": "rgb(224, 108, 117)",
  "#7d8799": "rgb(125, 135, 153)",
};

function lintMessages(ref: React.RefObject<CodeEditorHandle | null>): string[] {
  const messages: string[] = [];
  forEachDiagnostic(viewOf(ref).state, (diagnostic) =>
    messages.push(diagnostic.message)
  );
  return messages;
}

function appliedTagColor(state: EditorState, tag: Tag): string {
  const classes = highlightingFor(state, [tag]);
  if (!classes) throw new Error("No highlighter class was assigned to the tag");
  const probe = document.createElement("span");
  probe.className = classes;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

describe("CodeEditor — contrast-safe syntax highlighting", () => {
  it("applies the remapped colors instead of the stock oneDark colors", () => {
    const { ref } = renderEditor({ code: "const answer = 42; // note" });
    const state = viewOf(ref).state;

    expect(appliedTagColor(state, tags.keyword)).toBe(REMAPPED_RGB["#c678dd"]);
    expect(appliedTagColor(state, tags.name)).toBe(REMAPPED_RGB["#e06c75"]);
    expect(appliedTagColor(state, tags.comment)).toBe(REMAPPED_RGB["#7d8799"]);
  });

  it("pins each documented contrast pair individually", () => {
    const { ref } = renderEditor({ code: "const answer = 42; // note" });
    const state = viewOf(ref).state;

    const keyword = appliedTagColor(state, tags.keyword);
    const name = appliedTagColor(state, tags.name);
    const comment = appliedTagColor(state, tags.comment);

    expect(keyword).toBe(REMAPPED_RGB["#c678dd"]);
    expect(name).toBe(REMAPPED_RGB["#e06c75"]);
    expect(comment).toBe(REMAPPED_RGB["#7d8799"]);

    expect(keyword).not.toBe(STOCK_RGB["#c678dd"]);
    expect(name).not.toBe(STOCK_RGB["#e06c75"]);
    expect(comment).not.toBe(STOCK_RGB["#7d8799"]);
  });
});

describe("CodeEditor — component syntax linter", () => {
  it("reports a Syntax: diagnostic from the component linter for invalid JS", async () => {
    const { ref } = renderEditor({ mode: "code", code: "const = ;" });
    const view = viewOf(ref);

    forceLinting(view);
    await waitFor(() => expect(diagnosticCount(view.state)).toBe(1));

    const messages = lintMessages(ref);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/^Syntax: /);
  });

  it("clears the linter for a blank/whitespace document ([] path)", async () => {
    const { ref } = renderEditor({ mode: "code", code: "const = ;" });
    const view = viewOf(ref);

    forceLinting(view);
    await waitFor(() => expect(diagnosticCount(view.state)).toBe(1));

    act(() => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: "   \n\t " },
      });
    });

    forceLinting(view);
    await waitFor(() => expect(diagnosticCount(view.state)).toBe(0));
    expect(lintMessages(ref)).toEqual([]);
  });

  it("omits the component linter in formula mode", async () => {
    const { ref, container } = renderEditor({
      mode: "formula",
      code: "const = ;",
    });
    const view = viewOf(ref);

    forceLinting(view);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    expect(container.querySelector(".cm-gutter-lint")).toBeNull();
    expect(container.querySelector(".cm-lintRange")).toBeNull();
    expect(diagnosticCount(view.state)).toBe(0);
  });
});

describe("CodeEditor — host geometry", () => {
  it("sizes the code host to 160px, min 160px, and allows vertical resize", () => {
    const { container } = renderEditor({ mode: "code", code: "const a = 1;" });
    const host = container.querySelector(".code-editor-host") as HTMLElement;

    expect(host.style.height).toBe("160px");
    expect(host.style.minHeight).toBe("160px");
    expect(host.style.resize).toBe("vertical");
  });

  it("sizes the formula host to 28–120px with a nowrap horizontal scroller", () => {
    const { container } = renderEditor({ mode: "formula", code: "a + b" });
    const host = container.querySelector(".code-editor-host") as HTMLElement;
    const scroller = container.querySelector(".cm-scroller") as HTMLElement;
    const scrollerStyle = getComputedStyle(scroller);

    expect(host.style.minHeight).toBe("28px");
    expect(host.style.maxHeight).toBe("120px");
    expect(scrollerStyle.whiteSpace).toBe("nowrap");
    expect(scrollerStyle.overflowX).toBe("auto");
  });
});
