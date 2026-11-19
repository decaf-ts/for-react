import "./ai-sdk-mock";
import "./xyflow-mock";
import React from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { ChatSlashCommands } from "../../../src/agent/components/chat-slash-commands/ChatSlashCommands.js";
import { ChatModelSelector } from "../../../src/agent/components/chat-model-selector/ChatModelSelector.js";
import { ChatVisibilitySelector } from "../../../src/agent/components/chat-visibility-selector/ChatVisibilitySelector.js";
import { ChatSuggestionDialog } from "../../../src/agent/components/chat-suggestion-dialog/ChatSuggestionDialog.js";
import { ChatNotification } from "../../../src/agent/components/chat-notification/ChatNotification.js";
import type {
  AgentChatModel,
  AgentChatNotification,
  AgentChatSlashCommand,
} from "../../../src/agent/types.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * RTL coverage for the selector/overlay family: slash commands, model and
 * visibility selectors, the suggestion dialog and the notification stack.
 */

const COMMANDS: AgentChatSlashCommand[] = [
  { name: "summarize", description: "Summarize the conversation" },
  { name: "translate", description: "Translate the last message", aliases: ["tr"] },
];

const MODELS: AgentChatModel[] = [
  { id: "demo-agent", name: "Demo agent", provider: "decaf", description: "Scripted" },
  { id: "demo-fast", name: "Fast agent", provider: "decaf" },
];

describe("ChatSlashCommands", () => {
  it("renders nothing when closed", () => {
    const { container } = renderInAgentProvider(
      <ChatSlashCommands commands={COMMANDS} open={false} />
    );
    expect(container.querySelector(".dcf-chat-slash-commands")).toBeNull();
  });

  it("lists commands and filters by name or alias", () => {
    const { rerender } = renderInAgentProvider(
      <ChatSlashCommands commands={COMMANDS} />
    );
    expect(screen.getAllByRole("option")).toHaveLength(2);

    rerender(<ChatSlashCommands commands={COMMANDS} query="sum" />);
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByText("/summarize")).toBeInTheDocument();

    rerender(<ChatSlashCommands commands={COMMANDS} query="/tr" />);
    expect(screen.getByText("/translate")).toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", () => {
    renderInAgentProvider(<ChatSlashCommands commands={COMMANDS} query="zzz" />);
    expect(screen.getByRole("status")).toHaveTextContent("No matching commands");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("selects a command by click and closes", () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    renderInAgentProvider(
      <ChatSlashCommands
        commands={COMMANDS}
        onSelect={onSelect}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("option", { name: /summarize/ }));
    expect(onSelect).toHaveBeenCalledWith(COMMANDS[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("navigates with the keyboard and selects the active option", () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    renderInAgentProvider(
      <ChatSlashCommands
        commands={COMMANDS}
        onSelect={onSelect}
        onClose={onClose}
      />
    );
    const listbox = screen.getByRole("listbox");

    expect(listbox).toHaveAttribute(
      "aria-activedescendant",
      screen.getAllByRole("option")[0].id
    );

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute(
      "aria-selected",
      "true"
    );
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute(
      "aria-selected",
      "true"
    );
    fireEvent.keyDown(listbox, { key: "End" });
    fireEvent.keyDown(listbox, { key: "Home" });
    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(COMMANDS[0]);

    fireEvent.keyDown(listbox, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("ChatModelSelector", () => {
  it("shows the placeholder without a selection", () => {
    const { container } = renderInAgentProvider(
      <ChatModelSelector models={MODELS} />
    );
    expect(container.querySelector('[data-action="trigger"]')).toHaveTextContent(
      "Model"
    );
    expect(screen.getByText("Select model")).toBeInTheDocument();
  });

  it("resolves a selection by object and by id", () => {
    const { rerender } = renderInAgentProvider(
      <ChatModelSelector models={MODELS} model={MODELS[1]} />
    );
    expect(screen.getByText("Fast agent")).toBeInTheDocument();

    rerender(<ChatModelSelector models={MODELS} model="demo-agent" />);
    expect(screen.getByText("Demo agent")).toBeInTheDocument();
    expect(screen.getByText("decaf")).toBeInTheDocument();
  });

  it("opens, filters and selects a model", () => {
    const onModelChange = jest.fn();
    const onOpenChange = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatModelSelector
        models={MODELS}
        onModelChange={onModelChange}
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.click(container.querySelector('[data-action="trigger"]')!);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    const search = screen.getByRole("searchbox", { name: "Search models…" });

    fireEvent.change(search, { target: { value: "fast" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.click(screen.getByRole("option", { name: /Fast agent/ }));

    expect(onModelChange).toHaveBeenCalledWith(MODELS[1]);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports keyboard selection and Escape", () => {
    const onModelChange = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatModelSelector models={MODELS} onModelChange={onModelChange} />
    );

    fireEvent.click(container.querySelector('[data-action="trigger"]')!);
    const search = screen.getByRole("searchbox");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "ArrowUp" });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onModelChange).toHaveBeenCalledWith(MODELS[1]);

    fireEvent.click(container.querySelector('[data-action="trigger"]')!);
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows an empty result state and ignores a disabled trigger", () => {
    const { container, rerender } = renderInAgentProvider(
      <ChatModelSelector models={MODELS} />
    );
    fireEvent.click(container.querySelector('[data-action="trigger"]')!);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "missing" },
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "No models match your search."
    );

    fireEvent.click(document.body);
    rerender(<ChatModelSelector models={MODELS} disabled />);
    expect(container.querySelector('[data-action="trigger"]')).toBeDisabled();
  });
});

describe("ChatVisibilitySelector", () => {
  it("shows and changes the current visibility optimistically", () => {
    const onVisibilityChange = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatVisibilitySelector onVisibilityChange={onVisibilityChange} />
    );
    expect(screen.getByText("Private")).toBeInTheDocument();

    fireEvent.click(container.querySelector('[data-action="trigger"]')!);
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("Shared")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: /Shared/ }));
    expect(onVisibilityChange).toHaveBeenCalledWith("shared");
    expect(screen.getByText("Shared")).toBeInTheDocument();
  });

  it("does not update locally when optimistic is false", () => {
    const onVisibilityChange = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatVisibilitySelector
        optimistic={false}
        onVisibilityChange={onVisibilityChange}
      />
    );

    fireEvent.click(container.querySelector('[data-action="trigger"]')!);
    fireEvent.click(screen.getByRole("option", { name: /Shared/ }));
    expect(onVisibilityChange).toHaveBeenCalledWith("shared");
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("ignores re-selecting the current value and disabled triggers", () => {
    const onVisibilityChange = jest.fn();
    const { container, rerender } = renderInAgentProvider(
      <ChatVisibilitySelector onVisibilityChange={onVisibilityChange} />
    );
    fireEvent.click(container.querySelector('[data-action="trigger"]')!);
    fireEvent.click(screen.getByRole("option", { name: /Private/ }));
    expect(onVisibilityChange).not.toHaveBeenCalled();

    rerender(
      <ChatVisibilitySelector disabled onVisibilityChange={onVisibilityChange} />
    );
    expect(container.querySelector('[data-action="trigger"]')).toBeDisabled();
  });
});

describe("ChatSuggestionDialog", () => {
  it("renders nothing when closed", () => {
    const { container } = renderInAgentProvider(
      <ChatSuggestionDialog suggestion="Do it" />
    );
    expect(container.querySelector(".dcf-chat-suggestion-dialog")).toBeNull();
  });

  it("renders the suggestion with dialog semantics and applies it", async () => {
    const onApply = jest.fn();
    renderInAgentProvider(
      <ChatSuggestionDialog
        open
        suggestion="Rewrite the intro"
        title="Suggestion"
        description="Review before applying"
        onApply={onApply}
      />
    );

    const dialog = screen.getByRole("dialog", { name: "Suggestion" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText("Review before applying")).toBeInTheDocument();
    expect(within(dialog).getByText("Rewrite the intro")).toBeInTheDocument();
    await waitFor(() => expect(dialog).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith("Rewrite the intro");
  });

  it("ignores empty suggestions and supports ignore paths", () => {
    const onApply = jest.fn();
    const onIgnore = jest.fn();
    const { container, rerender } = renderInAgentProvider(
      <ChatSuggestionDialog open suggestion="   " onApply={onApply} onIgnore={onIgnore} />
    );
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Ignore" }));
    expect(onIgnore).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onIgnore).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onIgnore).toHaveBeenCalledTimes(3);

    fireEvent.click(container.querySelector('[data-role="overlay"]')!);
    expect(onIgnore).toHaveBeenCalledTimes(4);

    rerender(
      <ChatSuggestionDialog open suggestion="Apply me" onApply={onApply} onIgnore={onIgnore} />
    );
    fireEvent.keyDown(document, { key: "Enter", ctrlKey: true });
    expect(onApply).toHaveBeenCalledWith("Apply me");
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("applies with Enter when the dialog itself has focus", () => {
    const onApply = jest.fn();
    renderInAgentProvider(
      <ChatSuggestionDialog open suggestion="Focus apply" onApply={onApply} />
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Enter" });
    expect(onApply).toHaveBeenCalledWith("Focus apply");
  });
});

describe("ChatNotification", () => {
  const notifications: AgentChatNotification[] = [
    { id: "n1", title: "Done", message: "Roundtrip complete", severity: "success" },
    { id: "n2", message: "Connection lost", severity: "error", actionLabel: "Retry" },
    { id: "n3", message: "Defaults to info" },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders every notification with its severity", () => {
    const { container } = renderInAgentProvider(
      <ChatNotification notifications={notifications} />
    );
    const articles = container.querySelectorAll(".dcf-chat-notification");
    expect(articles).toHaveLength(3);
    expect(articles[0]).toHaveAttribute("data-severity", "success");
    expect(articles[1]).toHaveAttribute("data-severity", "error");
    expect(articles[2]).toHaveAttribute("data-severity", "info");
    expect(screen.getByText("Roundtrip complete")).toBeInTheDocument();
    expect(screen.getByText("Connection lost")).toBeInTheDocument();
  });

  it("dismisses a notification and calls back", () => {
    const onDismissed = jest.fn();
    renderInAgentProvider(
      <ChatNotification
        notifications={notifications}
        autoDismissMs={0}
        onDismissed={onDismissed}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss notification" })[0]);
    expect(onDismissed).toHaveBeenCalledWith("n1");
    expect(screen.queryByText("Roundtrip complete")).not.toBeInTheDocument();
  });

  it("auto-dismisses after the configured delay", () => {
    const onDismissed = jest.fn();
    renderInAgentProvider(
      <ChatNotification
        notifications={[notifications[2]]}
        autoDismissMs={1000}
        onDismissed={onDismissed}
      />
    );

    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(onDismissed).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onDismissed).toHaveBeenCalledWith("n3");
    expect(screen.queryByText("Defaults to info")).not.toBeInTheDocument();
  });

  it("honors a per-notification delay and zero to keep it sticky", () => {
    const onDismissed = jest.fn();
    const items: AgentChatNotification[] = [
      { id: "sticky", message: "Sticky", autoDismissMs: 0 },
      { id: "fast", message: "Fast", autoDismissMs: 50 },
    ];
    renderInAgentProvider(
      <ChatNotification
        notifications={items}
        autoDismissMs={1000}
        onDismissed={onDismissed}
      />
    );

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(onDismissed).toHaveBeenCalledWith("fast");
    expect(screen.getByText("Sticky")).toBeInTheDocument();
  });

  it("invokes the custom action and hides the close control when not dismissible", () => {
    const onAction = jest.fn();
    renderInAgentProvider(
      <ChatNotification
        notifications={[notifications[1]]}
        autoDismissMs={0}
        dismissible={false}
        onAction={onAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onAction).toHaveBeenCalledWith("n2");
    expect(
      screen.queryByRole("button", { name: "Dismiss notification" })
    ).not.toBeInTheDocument();
  });
});
