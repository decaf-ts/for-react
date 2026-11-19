import "./ai-sdk-mock";
import "./xyflow-mock";
import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { AgentChat } from "../../../src/agent/components/agent-chat/AgentChat.js";
import { createAgentChatDecafStore } from "../../../src/agent/react/agentChatStore.js";
import type { AgentChatModel } from "../../../src/agent/types.js";
import { renderInAgentProvider } from "./test-utils.js";
import { getUseChatMock } from "./ai-sdk-mock.js";

/**
 * AgentChat host-action coverage. The SDK `useChat` hook is the mock seam
 * (streaming itself is owned by the SDK and covered by the demo Playwright
 * spec); here we prove AgentChat composes the composer, attachments, slash
 * commands, selectors, messages and error banner into the hook contract.
 */

const MODELS: AgentChatModel[] = [
  { id: "demo-agent", name: "Demo agent", provider: "decaf" },
  { id: "demo-fast", name: "Fast agent", provider: "decaf" },
];

const SUGGESTIONS = ["Show my recent orders", "Where is my shipment?"];

const SLASH_COMMANDS = [
  { name: "summarize", description: "Summarize the conversation" },
  { name: "translate", description: "Translate the last message" },
];

function assistantMessage(text: string) {
  return {
    id: "assistant-1",
    role: "assistant",
    parts: [{ type: "text", text, state: "done" }],
    metadata: {
      createdAt: "2026-11-19T10:00:00.000Z",
      runId: "run-1",
      actions: ["retry"],
    },
  };
}

describe("AgentChat host actions", () => {
  let mock: ReturnType<typeof getUseChatMock>;

  beforeEach(() => {
    mock = getUseChatMock();
    mock.restore();
  });

  it("sends a suggestion through the SDK chat with the request body", async () => {
    renderInAgentProvider(
      <AgentChat suggestions={SUGGESTIONS} sessionId="session-1" />
    );

    fireEvent.click(screen.getByRole("button", { name: "Show my recent orders" }));

    await waitFor(() => expect(mock.sendMessage).toHaveBeenCalledTimes(1));
    const [message, options] = mock.sendMessage.mock.calls[0];
    expect(message.text).toBe("Show my recent orders");
    expect(message.metadata).toEqual(
      expect.objectContaining({
        sessionId: "session-1",
        attachments: [],
        knowledgeSourceIds: [],
      })
    );
    expect(options.body).toEqual(
      expect.objectContaining({ sessionId: "session-1", userId: null })
    );
    expect(options.metadata.sideChannel).toEqual(
      expect.objectContaining({
        onTelemetry: expect.any(Function),
        onDemoEvent: expect.any(Function),
      })
    );
  });

  it("sends composer text and clears the draft", async () => {
    renderInAgentProvider(<AgentChat />);
    const textarea = screen.getByLabelText("Type a message…");

    fireEvent.change(textarea, { target: { value: "Hello agent" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mock.sendMessage).toHaveBeenCalledTimes(1));
    expect(mock.sendMessage.mock.calls[0][0].text).toBe("Hello agent");
    expect(textarea).toHaveValue("");
  });

  it("shows slash commands while typing a command and inserts the selection", () => {
    const { container } = renderInAgentProvider(
      <AgentChat slashCommands={SLASH_COMMANDS} />
    );
    const textarea = screen.getByLabelText("Type a message…");

    fireEvent.change(textarea, { target: { value: "/" } });
    expect(
      container.querySelector(".dcf-chat-slash-commands")
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("option", { name: /summarize/ }));
    expect(textarea).toHaveValue("/summarize ");
    expect(container.querySelector(".dcf-chat-slash-commands")).toBeNull();
  });

  it("stages attachments in the preview and sends their metadata", async () => {
    const { container } = renderInAgentProvider(<AgentChat />);
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });

    fireEvent.change(container.querySelector("input[type=file]")!, {
      target: { files: [file] },
    });
    expect(screen.getByText("notes.txt")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Type a message…"), {
      target: { value: "With a file" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mock.sendMessage).toHaveBeenCalledTimes(1));
    const [message, options] = mock.sendMessage.mock.calls[0];
    expect(message.metadata.attachments).toEqual([
      expect.objectContaining({
        name: "notes.txt",
        mime: "text/plain",
        size: 5,
      }),
    ]);
    expect(options.body.attachments).toEqual(message.metadata.attachments);
    await waitFor(() =>
      expect(screen.queryByText("notes.txt")).not.toBeInTheDocument()
    );
  });

  it("selects a model and a visibility value", () => {
    const { container } = renderInAgentProvider(
      <AgentChat models={MODELS} />
    );

    const modelTrigger = container.querySelector(
      ".dcf-chat-model-selector [data-action=trigger]"
    )!;
    fireEvent.click(modelTrigger);
    fireEvent.click(screen.getByRole("option", { name: /Fast agent/ }));
    expect(modelTrigger).toHaveTextContent("Fast agent");

    const visibilityTrigger = container.querySelector(
      ".dcf-chat-visibility-selector [data-action=trigger]"
    )!;
    expect(visibilityTrigger).toHaveTextContent("Private");
    fireEvent.click(visibilityTrigger);
    fireEvent.click(screen.getByRole("option", { name: /Shared/ }));
    expect(visibilityTrigger).toHaveTextContent("Shared");
  });

  it("shows the thinking placeholder and stops the active run", async () => {
    mock.state.status = "streaming";
    renderInAgentProvider(<AgentChat />);

    expect(screen.getByRole("status", { name: "Agent is thinking" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop response" }));
    await waitFor(() => expect(mock.stop).toHaveBeenCalledTimes(1));
  });

  it("renders SDK messages, actions and error parts", () => {
    mock.state.messages = [
      assistantMessage("Projected answer"),
      {
        id: "error-1",
        role: "assistant",
        parts: [
          {
            type: "data-error",
            data: { message: "Backend exploded", name: "Error" },
          },
        ],
        metadata: { createdAt: "2026-11-19T10:00:01.000Z" },
      },
    ];
    const { container } = renderInAgentProvider(<AgentChat />);

    expect(screen.getByText("Projected answer")).toBeInTheDocument();
    expect(screen.getByText("retry")).toBeInTheDocument();
    expect(
      container.querySelector(".dcf-agent-chat__message--error")
    ).not.toBeNull();
    expect(screen.getByText("Backend exploded")).toBeInTheDocument();
  });

  it("surfaces an SDK chat error as a banner", () => {
    mock.state.error = new Error("Chat failed");
    const { container } = renderInAgentProvider(<AgentChat />);
    const banner = container.querySelector(".dcf-agent-chat__banner--error");
    expect(banner).toHaveAttribute("role", "alert");
    expect(banner).toHaveTextContent("Chat failed");
  });

  it("surfaces backend unavailability from the decaf store", () => {
    const store = createAgentChatDecafStore();
    store.setState({ backendAvailable: false });
    renderInAgentProvider(<AgentChat />, { store });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Agent backend is not reachable. Reconnect and try again."
    );
  });

  it("downloads the visible transcript", () => {
    mock.state.messages = [assistantMessage("Download me")];
    const onDownload = jest.fn();
    const { container } = renderInAgentProvider(
      <AgentChat onDownload={onDownload} />
    );

    fireEvent.click(
      within(container.querySelector(".dcf-agent-chat")!).getByRole("button", {
        name: "Download transcript",
      })
    );
    expect(onDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "conversation.md",
        markdown: expect.stringContaining("Download me"),
      })
    );
  });

  it("edits a user message through the inline editor", async () => {
    mock.state.messages = [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Original", state: "done" }],
        metadata: { sessionId: "s", attachments: [], knowledgeSourceIds: [] },
      },
    ];
    mock.setMessages.mockImplementation((messages) => {
      mock.state.messages = messages;
    });
    renderInAgentProvider(<AgentChat />);

    fireEvent.click(screen.getByRole("button", { name: "Edit message" }));
    const editor = screen.getByLabelText("Edit message");
    fireEvent.change(editor, { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: /Save and resend/ }));

    await waitFor(() => expect(mock.setMessages).toHaveBeenCalled());
    await waitFor(() => expect(mock.sendMessage).toHaveBeenCalledTimes(1));
    expect(mock.sendMessage.mock.calls[0][0].text).toBe("Changed");
  });

  it("applies a vote and removes a message", () => {
    mock.state.messages = [assistantMessage("Vote me")];
    mock.setMessages.mockImplementation((messages) => {
      mock.state.messages = messages;
    });
    renderInAgentProvider(<AgentChat />);

    fireEvent.click(screen.getByRole("button", { name: "Good response" }));
    const voted = mock.setMessages.mock.calls.at(-1)![0];
    expect(voted[0].metadata.vote).toBe("up");

    fireEvent.click(screen.getByRole("button", { name: "Delete message" }));
    const removed = mock.setMessages.mock.calls.at(-1)![0];
    expect(removed).toEqual([]);
  });
});

