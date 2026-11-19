import "./ai-sdk-mock";
import "./xyflow-mock";
import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { ChatMessage } from "../../../src/agent/components/chat-message/ChatMessage.js";
import { ChatMessageActions } from "../../../src/agent/components/chat-message-actions/ChatMessageActions.js";
import { ChatMessageEditor } from "../../../src/agent/components/chat-message-editor/ChatMessageEditor.js";
import { ChatCodeBlock } from "../../../src/agent/components/chat-code-block/ChatCodeBlock.js";
import { ChatConversation } from "../../../src/agent/components/chat-conversation/ChatConversation.js";
import type { AgentChatMessageView } from "../../../src/agent/types.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * RTL coverage for the transcript family: message rendering across roles and
 * part kinds, message actions/editor, code block and the conversation log.
 */

const ATTACHMENT = {
  id: "att-1",
  name: "photo.png",
  mime: "image/png",
  size: 12,
};

function installClipboard(): jest.Mock {
  const writeText = jest.fn(async () => undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

describe("ChatMessage", () => {
  it("renders plain content, role label, timestamp and the default avatar", () => {
    const { container } = renderInAgentProvider(
      <ChatMessage
        role="user"
        content="Hello there"
        createdAt="2026-11-19T10:00:00.000Z"
      />
    );

    const article = container.querySelector("article")!;
    expect(article).toHaveAttribute("data-role", "user");
    expect(article).toHaveClass("dcf-chat-message--user");
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.getByText("user")).toBeInTheDocument();
    expect(screen.getByText("2026-11-19T10:00:00.000Z")).toHaveAttribute(
      "dateTime",
      "2026-11-19T10:00:00.000Z"
    );
    expect(container.querySelector(".dcf-chat-message__avatar")).not.toBeNull();
  });

  it("maps the default avatar icon per role and supports overrides", () => {
    const { container, rerender } = renderInAgentProvider(
      <ChatMessage role="assistant" content="A" />
    );
    expect(
      container.querySelector(".dcf-chat-message__avatar svg")
    ).not.toBeNull();

    rerender(<ChatMessage role="system" content="S" />);
    expect(
      container.querySelector(".dcf-chat-message__avatar svg")
    ).not.toBeNull();

    rerender(<ChatMessage role="error" content="E" roleLabel="Failure" />);
    expect(screen.getByText("Failure")).toBeInTheDocument();

    rerender(<ChatMessage content="No avatar" avatar="none" />);
    expect(container.querySelector(".dcf-chat-message__avatar")).toBeNull();
  });

  it("shows streaming and pending affordances", () => {
    const { container } = renderInAgentProvider(
      <ChatMessage content="Partial" streaming pending />
    );
    const article = container.querySelector("article")!;
    expect(article).toHaveAttribute("aria-busy", "true");
    expect(article).toHaveClass("dcf-chat-message--streaming");
    expect(article).toHaveClass("dcf-chat-message--pending");
    expect(screen.getByText("Streaming…")).toBeInTheDocument();
    expect(container.querySelector(".dcf-chat-message__caret")).not.toBeNull();
  });

  it("renders text parts and replaces plain content when parts exist", () => {
    const { container } = renderInAgentProvider(
      <ChatMessage
        content="Ignored plain content"
        parts={[
          { id: "t1", kind: "text", text: "Part text", streaming: true },
          { id: "t2", kind: "text", text: "Second part" },
        ]}
      />
    );

    expect(screen.queryByText("Ignored plain content")).not.toBeInTheDocument();
    expect(screen.getByText("Part text")).toHaveClass(
      "dcf-chat-message__text--streaming"
    );
    expect(screen.getByText("Second part")).toBeInTheDocument();
    expect(container.querySelectorAll(".dcf-chat-message__text")).toHaveLength(2);
  });

  it("renders tool parts with status, error and JSON details", () => {
    const { container } = renderInAgentProvider(
      <ChatMessage
        parts={[
          {
            id: "tool-1",
            kind: "tool",
            name: "orders",
            status: "succeeded",
            input: { query: "lisbon" },
            output: { count: 3 },
          },
          {
            id: "tool-2",
            kind: "tool",
            name: "weather",
            status: "failed",
            error: "Service unavailable",
          },
        ]}
      />
    );

    const parts = container.querySelectorAll(".dcf-chat-message__part--tool");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toHaveAttribute("data-status", "succeeded");
    expect(screen.getByText("orders")).toBeInTheDocument();
    expect(screen.getByText("succeeded")).toBeInTheDocument();
    expect(screen.getByText(/query/)).toBeInTheDocument();
    expect(screen.getByText(/count/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Service unavailable");
    expect(within(parts[0] as HTMLElement).getByText("Tool details")).toBeInTheDocument();
  });

  it("renders reasoning, code and attachment parts", () => {
    const { container } = renderInAgentProvider(
      <ChatMessage
        parts={[
          {
            id: "r1",
            kind: "reasoning",
            content: "Planning",
            open: true,
            inline: true,
          },
          {
            id: "c1",
            kind: "code",
            code: "const a = 1;",
            language: "ts",
          },
          { id: "att", kind: "attachment", attachment: ATTACHMENT },
        ]}
      />
    );

    expect(screen.getByRole("region", { name: "Reasoning" })).toBeInTheDocument();
    expect(container.querySelector(".dcf-chat-code-block")).not.toBeNull();
    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(container.querySelector(".dcf-chat-message__attachment-meta")).toHaveTextContent(
      "image/png, 12B"
    );
  });

  it("renders an attachment list only when no attachment part exists", () => {
    const { container, rerender } = renderInAgentProvider(
      <ChatMessage content="With file" attachments={[ATTACHMENT]} />
    );
    expect(container.querySelector(".dcf-chat-message__attachments")).not.toBeNull();

    rerender(
      <ChatMessage
        content="With part"
        attachments={[ATTACHMENT]}
        parts={[{ id: "att", kind: "attachment", attachment: ATTACHMENT }]}
      />
    );
    expect(container.querySelector(".dcf-chat-message__attachments")).toBeNull();
  });

  it("renders action chips, slots and children", () => {
    const { container } = renderInAgentProvider(
      <ChatMessage
        actions={["retry", "download"]}
        avatarSlot={<span>Avatar slot</span>}
        contentSlot={<span>Content slot</span>}
      >
        <span>Child content</span>
      </ChatMessage>
    );

    expect(screen.getByText("Avatar slot")).toBeInTheDocument();
    expect(screen.getByText("Content slot")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
    const actions = container.querySelector(".dcf-chat-message__actions")!;
    expect(within(actions as HTMLElement).getByText("retry")).toBeInTheDocument();
    expect(within(actions as HTMLElement).getByText("download")).toBeInTheDocument();
  });
});

describe("ChatMessageActions", () => {
  it("offers copy, vote, edit and delete affordances by role", () => {
    renderInAgentProvider(<ChatMessageActions role="assistant" />);
    expect(screen.getByRole("button", { name: "Copy message" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Good response" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bad response" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit message" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete message" })).toBeInTheDocument();
  });

  it("copies the message text and reports it", async () => {
    const writeText = installClipboard();
    const onCopy = jest.fn();
    renderInAgentProvider(
      <ChatMessageActions copyText="Copy me" onCopy={onCopy} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith("Copy me"));
    expect(writeText).toHaveBeenCalledWith("Copy me");
  });

  it("toggles votes and allows clearing the active vote", () => {
    const onVoteChange = jest.fn();
    renderInAgentProvider(
      <ChatMessageActions messageId="m1" onVoteChange={onVoteChange} />
    );

    const up = screen.getByRole("button", { name: "Good response" });
    fireEvent.click(up);
    expect(up).toHaveAttribute("aria-pressed", "true");
    expect(onVoteChange).toHaveBeenLastCalledWith({ messageId: "m1", vote: "up" });

    fireEvent.click(up);
    expect(up).toHaveAttribute("aria-pressed", "false");
    expect(onVoteChange).toHaveBeenLastCalledWith({
      messageId: "m1",
      vote: null,
    });
  });

  it("reflects an externally controlled vote", () => {
    const { rerender } = renderInAgentProvider(
      <ChatMessageActions role="assistant" vote="down" />
    );
    expect(screen.getByRole("button", { name: "Bad response" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    rerender(<ChatMessageActions role="assistant" vote={null} />);
    expect(screen.getByRole("button", { name: "Bad response" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("emits edit and delete callbacks", () => {
    const onEdit = jest.fn();
    const onDeleteMessage = jest.fn();
    renderInAgentProvider(
      <ChatMessageActions
        messageId="m1"
        role="user"
        onEdit={onEdit}
        onDeleteMessage={onDeleteMessage}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit message" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete message" }));
    expect(onEdit).toHaveBeenCalledWith("m1");
    expect(onDeleteMessage).toHaveBeenCalledWith("m1");
  });

  it("disables every action while running and honors capability overrides", () => {
    const { rerender } = renderInAgentProvider(
      <ChatMessageActions role="assistant" running />
    );
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }

    rerender(
      <ChatMessageActions
        role="assistant"
        canCopy={false}
        canVote={false}
        canEdit
        canDelete={false}
        persistent
      />
    );
    expect(screen.queryByRole("button", { name: "Copy message" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Good response" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit message" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete message" })).not.toBeInTheDocument();
    expect(screen.getByRole("toolbar")).toHaveClass(
      "dcf-chat-message-actions--persistent"
    );
  });
});

describe("ChatMessageEditor", () => {
  it("prefills the message and saves a trimmed draft", async () => {
    const onSave = jest.fn(async () => undefined);
    renderInAgentProvider(
      <ChatMessageEditor
        message={{
          id: "m1",
          role: "user",
          content: "Original",
          attachments: [],
          knowledgeSourceIds: [],
          createdAt: "2026-11-19T10:00:00.000Z",
        }}
        onSave={onSave}
      />
    );

    const textarea = screen.getByLabelText("Edit message");
    expect(textarea).toHaveValue("Original");

    fireEvent.change(textarea, { target: { value: "  Updated  " } });
    expect(textarea).toHaveAttribute("data-dirty", "true");
    fireEvent.click(screen.getByRole("button", { name: /Save and resend/ }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ messageId: "m1", text: "Updated" })
    );
  });

  it("disables saving for an empty draft", () => {
    renderInAgentProvider(
      <ChatMessageEditor initialText="Hello" messageId="m1" />
    );
    const textarea = screen.getByLabelText("Edit message");
    fireEvent.change(textarea, { target: { value: "   " } });
    expect(screen.getByRole("button", { name: /Save and resend/ })).toBeDisabled();
  });

  it("saves with Ctrl+Enter and cancels with Escape", async () => {
    const onSave = jest.fn(async () => undefined);
    const onCancel = jest.fn();
    renderInAgentProvider(
      <ChatMessageEditor
        initialText="Hello"
        messageId="m1"
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    const textarea = screen.getByLabelText("Edit message");
    fireEvent.change(textarea, { target: { value: "Changed" } });
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      messageId: "m1",
      text: "Changed",
    }));

    fireEvent.change(textarea, { target: { value: "Discard" } });
    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledWith("m1");
    expect(textarea).toHaveValue("Hello");
  });

  it("shows a save error and stays dirty", async () => {
    const onSave = jest.fn(async () => {
      throw new Error("Cannot save");
    });
    renderInAgentProvider(
      <ChatMessageEditor initialText="Hello" messageId="m1" onSave={onSave} />
    );

    fireEvent.change(screen.getByLabelText("Edit message"), {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save and resend/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot save");
    expect(screen.getByLabelText("Edit message")).toHaveAttribute(
      "data-dirty",
      "true"
    );
  });

  it("resets the draft when the source message changes", () => {
    const message: AgentChatMessageView = {
      id: "m1",
      role: "user",
      content: "First",
      attachments: [],
      knowledgeSourceIds: [],
      createdAt: "2026-11-19T10:00:00.000Z",
    };
    const { rerender } = renderInAgentProvider(
      <ChatMessageEditor message={message} />
    );
    expect(screen.getByLabelText("Edit message")).toHaveValue("First");

    rerender(<ChatMessageEditor message={{ ...message, content: "Second" }} />);
    expect(screen.getByLabelText("Edit message")).toHaveValue("Second");
  });
});

describe("ChatCodeBlock", () => {
  it("renders highlighted tokens with a header title", () => {
    const { container } = renderInAgentProvider(
      <ChatCodeBlock
        code="const total = 42; // note"
        language="typescript"
        filename="sum.ts"
        title="Sum"
      />
    );

    expect(screen.getByText("Sum")).toBeInTheDocument();
    const figure = container.querySelector("figure")!;
    expect(figure).toHaveAttribute("data-language", "typescript");
    expect(
      container.querySelectorAll(".dcf-chat-code-block__token--keyword")
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".dcf-chat-code-block__token--number")
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".dcf-chat-code-block__token--comment")
    ).toHaveLength(1);
  });

  it("falls back through filename, language and the default label", () => {
    const { rerender } = renderInAgentProvider(
      <ChatCodeBlock code="x" language="ts" filename="file.ts" />
    );
    expect(screen.getByText("file.ts")).toBeInTheDocument();

    rerender(<ChatCodeBlock code="x" language="ts" />);
    expect(screen.getByText("ts")).toBeInTheDocument();

    rerender(<ChatCodeBlock code="x" />);
    expect(screen.getByText("Code")).toBeInTheDocument();
  });

  it("copies the code and reports the copy", async () => {
    const writeText = installClipboard();
    const onCopy = jest.fn();
    renderInAgentProvider(<ChatCodeBlock code="copy me" onCopy={onCopy} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith("copy me"));
    expect(writeText).toHaveBeenCalledWith("copy me");
  });

  it("supports disabling copy, the header and highlighting", () => {
    const { container, rerender } = renderInAgentProvider(
      <ChatCodeBlock code="const a = 1;" copyable={false} />
    );
    expect(screen.queryByRole("button", { name: "Copy code" })).not.toBeInTheDocument();

    rerender(<ChatCodeBlock code="const a = 1;" showHeader={false} />);
    expect(container.querySelector(".dcf-chat-code-block__header")).toBeNull();

    rerender(<ChatCodeBlock code="const a = 1;" highlight={false} />);
    const tokens = container.querySelectorAll(".dcf-chat-code-block__token");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toHaveClass("dcf-chat-code-block__token--plain");
  });

  it("makes the code area keyboard focusable", () => {
    renderInAgentProvider(<ChatCodeBlock code="x" />);
    expect(screen.getByText("x").closest("pre")).toHaveAttribute("tabIndex", "0");
  });
});

describe("ChatConversation", () => {
  it("renders the empty state message and optionally the caller's empty state", () => {
    const { rerender } = renderInAgentProvider(<ChatConversation />);
    expect(
      screen.getByText("Start the conversation by sending a message.")
    ).toBeInTheDocument();

    rerender(
      <ChatConversation emptyMessage="Nothing here" emptyState={<p>Custom</p>} />
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();

    rerender(<ChatConversation showEmptyMessage={false} />);
    expect(
      screen.queryByText("Start the conversation by sending a message.")
    ).not.toBeInTheDocument();
  });

  it("renders children in the live log", () => {
    renderInAgentProvider(
      <ChatConversation messages={[{} as never]}>
        <p>Message one</p>
      </ChatConversation>
    );
    const log = screen.getByRole("log");
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(within(log).getByText("Message one")).toBeInTheDocument();
  });

  it("marks the log busy while running", () => {
    renderInAgentProvider(<ChatConversation running />);
    expect(screen.getByRole("log")).toHaveAttribute("aria-busy", "true");
  });

  it("downloads the transcript with generated markdown", () => {
    const onDownload = jest.fn();
    renderInAgentProvider(
      <ChatConversation
        messages={[
          {
            id: "m1",
            role: "assistant",
            content: "Hello",
            attachments: [],
            knowledgeSourceIds: [],
            createdAt: "2026-11-19T10:00:00.000Z",
          },
        ]}
        downloadFilename="chat.md"
        downloadTitle="Chat"
        onDownload={onDownload}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Download transcript" }));
    expect(onDownload).toHaveBeenCalledWith({
      filename: "chat.md",
      markdown: "# Chat\n\n## Assistant\n_2026-11-19T10:00:00.000Z_\n\nHello\n",
    });
  });

  it("uses an explicit download text and can hide the toolbar", () => {
    const onDownload = jest.fn();
    const { rerender } = renderInAgentProvider(
      <ChatConversation downloadText="Custom" onDownload={onDownload} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Download transcript" }));
    expect(onDownload).toHaveBeenCalledWith({
      filename: "conversation.md",
      markdown: "Custom",
    });

    rerender(<ChatConversation downloadEnabled={false} />);
    expect(
      screen.queryByRole("button", { name: "Download transcript" })
    ).not.toBeInTheDocument();
  });

  it("keeps the transcript keyboard focusable with a download toolbar", () => {
    const { container } = renderInAgentProvider(
      <ChatConversation messages={[{} as never]} />
    );
    const transcript = container.querySelector(
      ".dcf-chat-conversation__transcript"
    ) as HTMLElement;
    expect(transcript).toHaveAttribute("tabIndex", "0");
    expect(
      container.querySelector(".dcf-chat-conversation__toolbar")
    ).not.toBeNull();
  });
});
