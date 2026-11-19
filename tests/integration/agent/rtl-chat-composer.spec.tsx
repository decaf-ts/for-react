import "./ai-sdk-mock";
import "./xyflow-mock";
import React from "react";
import { act, fireEvent, screen } from "@testing-library/react";
import {
  ChatComposer,
  type ChatComposerHandle,
} from "../../../src/agent/components/chat-composer/ChatComposer.js";
import { ChatAttachmentInput } from "../../../src/agent/components/chat-attachment-input/ChatAttachmentInput.js";
import { ChatAttachmentPreview } from "../../../src/agent/components/chat-attachment-preview/ChatAttachmentPreview.js";
import { ChatAttachmentPart } from "../../../src/agent/components/chat-attachment-part/ChatAttachmentPart.js";
import type { AgentChatStagedAttachment } from "../../../src/agent/types.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * RTL coverage for the composer family: text sending (button, Enter, stop),
 * slash/at-file affordances, attachment input/rejection, previews and parts.
 */

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function makeFile(name: string, size = 4, type = "text/plain"): File {
  return new File(["x".repeat(Math.min(size, 64))], name, { type });
}

/** Stable empty array: an inline default would restart the preview effect. */
const EMPTY_ATTACHMENTS: AgentChatStagedAttachment[] = [];

describe("ChatComposer", () => {
  it("disables send for an empty draft and sends trimmed text", async () => {
    const onSend = jest.fn();
    const onValueChange = jest.fn();
    renderInAgentProvider(
      <ChatComposer onSend={onSend} onValueChange={onValueChange} />
    );

    const send = screen.getByRole("button", { name: "Send" });
    expect(send).toBeDisabled();

    const textarea = screen.getByLabelText("Type a message…");
    fireEvent.change(textarea, { target: { value: "  Hello world  " } });
    expect(onValueChange).toHaveBeenLastCalledWith("  Hello world  ");
    expect(send).toBeEnabled();

    fireEvent.click(send);
    expect(onSend).toHaveBeenCalledWith("Hello world");
    expect(textarea).toHaveValue("");
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("sends with Enter but inserts a newline with Shift+Enter", () => {
    const onSend = jest.fn();
    renderInAgentProvider(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByLabelText("Type a message…");

    fireEvent.change(textarea, { target: { value: "Line" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("Line");
  });

  it("does not send while composing with an IME", () => {
    const onSend = jest.fn();
    renderInAgentProvider(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByLabelText("Type a message…");
    fireEvent.change(textarea, { target: { value: "日本" } });
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("keeps the draft when clearOnSend is false", () => {
    renderInAgentProvider(<ChatComposer onSend={jest.fn()} clearOnSend={false} />);
    const textarea = screen.getByLabelText("Type a message…");
    fireEvent.change(textarea, { target: { value: "Keep" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(textarea).toHaveValue("Keep");
  });

  it("turns into a stop control while running", () => {
    const onStop = jest.fn();
    renderInAgentProvider(<ChatComposer running onStop={onStop} />);

    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
    expect(screen.getByText("Agent is responding…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop response" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("disables the textarea when disabled or disabled while running", () => {
    const { rerender } = renderInAgentProvider(<ChatComposer disabled />);
    expect(screen.getByLabelText("Type a message…")).toBeDisabled();

    rerender(<ChatComposer running />);
    expect(screen.getByLabelText("Type a message…")).toBeDisabled();

    rerender(<ChatComposer running disabledWhileRunning={false} />);
    expect(screen.getByLabelText("Type a message…")).toBeEnabled();
  });

  it("emits slash queries only for a bare command token", () => {
    const onSlashQuery = jest.fn();
    renderInAgentProvider(<ChatComposer onSlashQuery={onSlashQuery} />);
    const textarea = screen.getByLabelText("Type a message…");

    fireEvent.change(textarea, { target: { value: "/" } });
    expect(onSlashQuery).toHaveBeenLastCalledWith("");
    fireEvent.change(textarea, { target: { value: "/sum" } });
    expect(onSlashQuery).toHaveBeenLastCalledWith("sum");
    fireEvent.change(textarea, { target: { value: "/sum now" } });
    expect(onSlashQuery).toHaveBeenLastCalledWith(null);
    fireEvent.change(textarea, { target: { value: "plain" } });
    expect(onSlashQuery).toHaveBeenLastCalledWith(null);
  });

  it("emits at-file queries and keyboard navigation when enabled", () => {
    const onAtQuery = jest.fn();
    const onAtNavigate = jest.fn();
    const onAtPick = jest.fn();
    const onAtDismiss = jest.fn();
    renderInAgentProvider(
      <ChatComposer
        atFileEnabled
        onAtQuery={onAtQuery}
        onAtNavigate={onAtNavigate}
        onAtPick={onAtPick}
        onAtDismiss={onAtDismiss}
      />
    );
    const textarea = screen.getByLabelText("Type a message…") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "open @src" } });
    textarea.setSelectionRange(9, 9);
    fireEvent.change(textarea, { target: { value: "open @src" } });
    expect(onAtQuery).toHaveBeenLastCalledWith("src");

    fireEvent.keyDown(textarea, { key: "ArrowDown" });
    expect(onAtNavigate).toHaveBeenCalledWith(1);
    fireEvent.keyDown(textarea, { key: "ArrowUp" });
    expect(onAtNavigate).toHaveBeenCalledWith(-1);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onAtPick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(onAtDismiss).toHaveBeenCalledTimes(1);
    expect(onAtQuery).toHaveBeenLastCalledWith(null);
  });

  it("exposes the imperative handle for command/file insertion", async () => {
    const ref = React.createRef<ChatComposerHandle>();
    const onValueChange = jest.fn();
    renderInAgentProvider(
      <ChatComposer ref={ref} onValueChange={onValueChange} />
    );
    const textarea = screen.getByLabelText("Type a message…") as HTMLTextAreaElement;

    act(() => ref.current!.acceptSlashCommand("/summarize"));
    expect(textarea).toHaveValue("/summarize ");
    await flushMicrotasks();
    expect(document.activeElement).toBe(textarea);

    act(() => ref.current!.setDraft("hello"));
    expect(textarea).toHaveValue("hello");

    textarea.setSelectionRange(5, 5);
    act(() => ref.current!.insertAtCursor(" world"));
    expect(textarea).toHaveValue("hello world");
    await flushMicrotasks();
    expect(textarea.selectionStart).toBe(11);

    act(() => ref.current!.acceptAtFileReference("src/index.ts", "file"));
    expect(textarea.value).toContain("@src/index.ts ");
    act(() => ref.current!.acceptAtFileReference("src", "dir"));
    expect(textarea.value).toContain("@src/ ");

    act(() => ref.current!.insertAtCursor("|"));
    const value = textarea.value;
    const start = value.indexOf("|");
    act(() => ref.current!.removeAtFileToken(start, start + 1));
    expect(textarea.value).not.toContain("|");

    act(() => ref.current!.clearAtQuery());
    act(() => ref.current!.focus());
    expect(document.activeElement).toBe(textarea);
    act(() => ref.current!.autoGrow());
  });

  it("auto-grows the textarea up to the max height", () => {
    const ref = React.createRef<ChatComposerHandle>();
    renderInAgentProvider(<ChatComposer ref={ref} maxRows={2} />);
    const textarea = screen.getByLabelText("Type a message…") as HTMLTextAreaElement;
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 200,
    });

    act(() => ref.current!.autoGrow());
    expect(textarea.style.height).toBe("44px");
    expect(textarea.style.overflowY).toBe("auto");
  });

  it("renders extra children below the composer", () => {
    renderInAgentProvider(
      <ChatComposer>
        <p>Attachment row</p>
      </ChatComposer>
    );
    expect(screen.getByText("Attachment row")).toBeInTheDocument();
  });
});

describe("ChatAttachmentInput", () => {
  it("opens the hidden file picker from the attach button", () => {
    const click = jest
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);
    renderInAgentProvider(<ChatAttachmentInput />);

    fireEvent.click(screen.getByRole("button", { name: "Attach" }));
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it("passes accepted files to onFilesSelected", () => {
    const onFilesSelected = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatAttachmentInput onFilesSelected={onFilesSelected} />
    );
    const input = container.querySelector(
      "input[type=file]"
    ) as HTMLInputElement;
    const file = makeFile("notes.txt");

    fireEvent.change(input, { target: { files: [file] } });
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("limits selection to one file when multiple is false", () => {
    const onFilesSelected = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatAttachmentInput multiple={false} onFilesSelected={onFilesSelected} />
    );
    const input = container.querySelector(
      "input[type=file]"
    ) as HTMLInputElement;
    const first = makeFile("one.txt");
    const second = makeFile("two.txt");

    fireEvent.change(input, { target: { files: [first, second] } });
    expect(onFilesSelected).toHaveBeenCalledWith([first]);
  });

  it("rejects files by MIME type and reports the i18n key", () => {
    const onFilesSelected = jest.fn();
    const onRejected = jest.fn();
    const onError = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatAttachmentInput
        accept={["image/*"]}
        onFilesSelected={onFilesSelected}
        onRejected={onRejected}
        onError={onError}
      />
    );
    const input = container.querySelector(
      "input[type=file]"
    ) as HTMLInputElement;
    const file = makeFile("notes.txt", 4, "text/plain");

    fireEvent.change(input, { target: { files: [file] } });
    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalledWith([
      { name: "notes.txt", mime: "text/plain", size: 4, reason: "mime" },
    ]);
    expect(onError).toHaveBeenCalledWith("agent.chat.attachments.invalidType");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Some files are not supported."
    );
  });

  it("rejects files above maxSize and supports extension patterns", () => {
    const onRejected = jest.fn();
    const { container, rerender } = renderInAgentProvider(
      <ChatAttachmentInput maxSize={2} onRejected={onRejected} />
    );
    const input = container.querySelector(
      "input[type=file]"
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("big.txt", 10)] } });
    expect(onRejected).toHaveBeenLastCalledWith([
      { name: "big.txt", mime: "text/plain", size: 10, reason: "size" },
    ]);

    rerender(
      <ChatAttachmentInput accept={[".md", "*/*"]} onRejected={onRejected} />
    );
    const md = makeFile("readme.md", 2, "text/markdown");
    fireEvent.change(container.querySelector("input[type=file]")!, {
      target: { files: [md] },
    });
    expect(onRejected).toHaveBeenCalledTimes(1);
  });

  it("ignores selection while disabled", () => {
    const onFilesSelected = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatAttachmentInput disabled onFilesSelected={onFilesSelected} />
    );
    expect(container.querySelector("input[type=file]")).toBeDisabled();
    fireEvent.change(container.querySelector("input[type=file]")!, {
      target: { files: [makeFile("a.txt")] },
    });
    expect(onFilesSelected).not.toHaveBeenCalled();
  });

  it("accepts dropped files and shows the drag overlay", () => {
    const onFilesSelected = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatAttachmentInput onFilesSelected={onFilesSelected} />
    );
    const file = makeFile("drop.txt");
    const dataTransfer = { files: [file], types: ["Files"] };

    fireEvent.dragEnter(window, { dataTransfer });
    expect(
      container.querySelector("[data-role=drop-overlay]")
    ).not.toBeNull();

    fireEvent.drop(window, { dataTransfer });
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(container.querySelector("[data-role=drop-overlay]")).toBeNull();
  });

  it("accepts pasted files when globalPaste is set", () => {
    const onFilesSelected = jest.fn();
    renderInAgentProvider(
      <ChatAttachmentInput globalPaste onFilesSelected={onFilesSelected} />
    );
    const file = makeFile("pasted.txt");

    fireEvent.paste(document, { clipboardData: { files: [file] } });
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("ignores pasted files outside the host without globalPaste", () => {
    const onFilesSelected = jest.fn();
    renderInAgentProvider(
      <ChatAttachmentInput onFilesSelected={onFilesSelected} />
    );

    fireEvent.paste(document, { clipboardData: { files: [makeFile("a.txt")] } });
    expect(onFilesSelected).not.toHaveBeenCalled();
  });

  it("renders the paste hint and joinable accept attribute", () => {
    const { container } = renderInAgentProvider(
      <ChatAttachmentInput accept={["image/*", "text/*"]} />
    );
    expect(screen.getByText("Drop or paste files here")).toBeInTheDocument();
    expect(container.querySelector("input[type=file]")).toHaveAttribute(
      "accept",
      "image/*,text/*"
    );
  });
});

describe("ChatAttachmentPreview", () => {
  const image: AgentChatStagedAttachment = {
    id: "img",
    name: "photo.png",
    mime: "image/png",
    size: 2048,
    url: "https://example.test/photo.png",
  };
  const text: AgentChatStagedAttachment = {
    id: "txt",
    name: "notes.txt",
    mime: "text/plain",
    size: 512,
    textPreview: "abcdefghij",
  };
  const file: AgentChatStagedAttachment = {
    id: "bin",
    name: "archive.zip",
    mime: "application/zip",
    size: 2 * 1024 * 1024,
  };

  it("renders nothing for a stable empty list", () => {
    const { container } = renderInAgentProvider(
      <ChatAttachmentPreview attachments={EMPTY_ATTACHMENTS} />
    );
    expect(container.querySelector(".dcf-chat-attachment-preview")).toBeNull();
  });

  /**
   * Regression guard for the identity-loop defect: the omitted `attachments`
   * prop now falls back to a module-level stable `EMPTY_ATTACHMENTS` array, so
   * the effect keyed on it no longer re-runs on every render.
   */
  it("does not loop when no attachments prop is supplied", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { container } = renderInAgentProvider(<ChatAttachmentPreview />);
      expect(
        container.querySelector(".dcf-chat-attachment-preview")
      ).toBeNull();
      expect(
        errorSpy.mock.calls.some((args) =>
          args.some(
            (arg) =>
              typeof arg === "string" &&
              arg.includes("Maximum update depth exceeded")
          )
        )
      ).toBe(false);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("renders image, text and generic file items with formatted sizes", () => {
    const { container } = renderInAgentProvider(
      <ChatAttachmentPreview
        attachments={[image, text, file]}
        maxTextPreview={5}
      />
    );

    const items = container.querySelectorAll(".dcf-chat-attachment-preview__item");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute("data-kind", "image");
    expect(screen.getByRole("img", { name: "photo.png" })).toHaveAttribute(
      "src",
      "https://example.test/photo.png"
    );
    expect(items[1]).toHaveAttribute("data-kind", "text");
    expect(screen.getByText("abcde…")).toBeInTheDocument();
    expect(items[2]).toHaveAttribute("data-kind", "file");
    expect(screen.getByText("2.0 MB")).toBeInTheDocument();
    expect(screen.getByText("512 B")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  });

  it("rejects unsafe image URLs and shows the fallback icon", () => {
    const { container } = renderInAgentProvider(
      <ChatAttachmentPreview
        attachments={[{ ...image, url: "javascript:alert(1)" }]}
      />
    );
    expect(container.querySelector(".dcf-chat-attachment-preview__thumb")).toBeNull();
    expect(
      container.querySelector(".dcf-chat-attachment-preview__fallback-icon")
    ).not.toBeNull();
  });

  it("removes an attachment by id", () => {
    const onRemove = jest.fn();
    renderInAgentProvider(
      <ChatAttachmentPreview attachments={[image]} onRemove={onRemove} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
    expect(onRemove).toHaveBeenCalledWith("img");
  });

  it("reads a text preview from the staged file", async () => {
    const stagedFile = {
      name: "read.txt",
      type: "text/plain",
      size: 9,
      text: async () => "file body",
    } as unknown as File;
    renderInAgentProvider(
      <ChatAttachmentPreview
        attachments={[
          { id: "read", name: "read.txt", mime: "text/plain", size: 9, file: stagedFile },
        ]}
      />
    );
    expect(await screen.findByText("file body")).toBeInTheDocument();
  });

  it("creates and revokes object URLs for image files without a URL", () => {
    const createObjectURL = jest.fn(() => "blob:preview");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    const staged: AgentChatStagedAttachment = {
      id: "staged",
      name: "local.png",
      mime: "image/png",
      size: 10,
      file: new File(["x"], "local.png", { type: "image/png" }),
    };
    const { rerender } = renderInAgentProvider(
      <ChatAttachmentPreview attachments={[staged]} />
    );
    expect(createObjectURL).toHaveBeenCalledWith(staged.file);
    expect(screen.getByRole("img", { name: "local.png" })).toHaveAttribute(
      "src",
      "blob:preview"
    );

    rerender(<ChatAttachmentPreview attachments={EMPTY_ATTACHMENTS} />);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });
});

describe("ChatAttachmentPart", () => {
  it("renders nothing without an attachment", () => {
    const { container } = renderInAgentProvider(<ChatAttachmentPart />);
    expect(container.querySelector(".dcf-chat-attachment-part")).toBeNull();
  });

  it("renders a safe image attachment", () => {
    const { container } = renderInAgentProvider(
      <ChatAttachmentPart
        attachment={{
          id: "img",
          name: "photo.png",
          mime: "image/png",
          size: 1,
          url: "data:image/png;base64,AAAA",
        }}
      />
    );
    expect(container.querySelector("figure")).toHaveAttribute("data-kind", "image");
    expect(screen.getByRole("img", { name: "photo.png" })).toHaveAttribute(
      "src",
      "data:image/png;base64,AAAA"
    );
    expect(screen.getByText("image/png")).toBeInTheDocument();
  });

  it("falls back for an unsafe image URL", () => {
    const { container } = renderInAgentProvider(
      <ChatAttachmentPart
        attachment={{
          id: "img",
          name: "photo.png",
          mime: "image/png",
          size: 1,
          url: "javascript:alert(1)",
        }}
      />
    );
    expect(container.querySelector(".dcf-chat-attachment-part__image")).toBeNull();
    expect(
      container.querySelector(".dcf-chat-attachment-part__fallback")
    ).toBeInTheDocument();
  });

  it("renders truncated text with a caption", () => {
    const { container } = renderInAgentProvider(
      <ChatAttachmentPart
        attachment={{ id: "t", name: "notes.txt", mime: "text/plain", size: 9 }}
        text="1234567890"
        maxTextLength={4}
      />
    );
    expect(container.querySelector("figure")).toHaveAttribute("data-kind", "text");
    expect(screen.getByText("1234…")).toBeInTheDocument();
  });

  it("shows the empty preview message for text without content", () => {
    renderInAgentProvider(
      <ChatAttachmentPart
        attachment={{ id: "t", name: "empty.txt", mime: "text/plain", size: 0 }}
      />
    );
    expect(screen.getByText("No text preview available.")).toBeInTheDocument();
  });

  it("renders a generic file fallback with its MIME chip", () => {
    const { container } = renderInAgentProvider(
      <ChatAttachmentPart
        attachment={{ id: "b", name: "archive.zip", mime: "application/zip", size: 1 }}
      />
    );
    expect(container.querySelector("figure")).toHaveAttribute("data-kind", "file");
    expect(container.querySelector("figure")).toHaveAccessibleName("Attachment");
    expect(screen.getByText("archive.zip")).toBeInTheDocument();
    expect(screen.getByText("application/zip")).toBeInTheDocument();
  });
});
