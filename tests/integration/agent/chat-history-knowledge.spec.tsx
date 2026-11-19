import "./xyflow-mock";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { ChatHistory } from "../../../src/agent/components/chat-history/ChatHistory.js";
import { ChatHistoryItem } from "../../../src/agent/components/chat-history-item/ChatHistoryItem.js";
import { ChatKnowledgeBaseSelector } from "../../../src/agent/components/chat-knowledge-base-selector/ChatKnowledgeBaseSelector.js";
import { InMemoryAgentKnowledgeBaseSource } from "../../../src/agent/services/InMemoryAgentKnowledgeBaseSource.js";
import type {
  AgentChatHistoryEntry,
  AgentChatKnowledgeBaseEntry,
} from "../../../src/agent/types.js";
import { makeFile, renderInAgentProvider } from "./test-utils.js";

/**
 * SAA-2095 coverage requirement 10 — history list/item and knowledge-base
 * selector (selection, upload queue, delete via source, dismissal).
 */

/**
 * Stable empty selection: the selector resets its internal selection from the
 * `selectedIds` prop identity, so an inline `[]` literal would retrigger that
 * effect on every render. Production callers pass a state array; tests that do
 * not assert controlled selection share this constant.
 */
const NO_SELECTION: string[] = [];
const EMPTY_KNOWLEDGE: AgentChatKnowledgeBaseEntry[] = [];
const EMPTY_HISTORY: AgentChatHistoryEntry[] = [];

const HISTORY: AgentChatHistoryEntry[] = Array.from({ length: 8 }, (_, index) => ({
  id: `chat-${index + 1}`,
  title: `Conversation ${index + 1}`,
  preview: `Preview ${index + 1}`,
  messageCount: index + 1,
  visibility: index === 0 ? "shared" : "private",
  updatedAt: "2026-11-19T09:00:00.000Z",
}));

describe("ChatHistory", () => {
  it("renders seeded entries, the active entry, and the visibility badge", () => {
    const { container } = renderInAgentProvider(
      <ChatHistory entries={HISTORY} activeId="chat-2" />
    );

    expect(screen.getByText("Conversation 1")).toBeInTheDocument();
    expect(
      container.querySelector(
        '[data-chat-id="chat-2"] .dcf-chat-history-item__main'
      )
    ).toHaveAttribute("aria-current", "true");
    expect(
      container.querySelector('[data-visibility="shared"]')
    ).toHaveTextContent("Shared");
  });

  it("pages through entries with Load more", () => {
    const { container } = renderInAgentProvider(
      <ChatHistory entries={HISTORY} pageSize={3} />
    );

    const count = () =>
      container.querySelectorAll(".dcf-chat-history__entry").length;
    expect(count()).toBe(3);

    fireEvent.click(screen.getByRole("button", { name: /Load more/ }));
    expect(count()).toBe(6);

    fireEvent.click(screen.getByRole("button", { name: /Load more/ }));
    expect(count()).toBe(8);
    expect(screen.queryByRole("button", { name: /Load more/ })).not.toBeInTheDocument();
  });

  it("removes an entry after the delete confirmation", () => {
    const onDelete = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatHistory entries={HISTORY} onDelete={onDelete} />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Delete chat: Conversation 1" })
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0]).toMatchObject({ id: "chat-1" });
    expect(
      container.querySelector('[data-chat-id="chat-1"]')
    ).toBeNull();
  });

  it("renders loading skeletons and the empty state", () => {
    const loading = renderInAgentProvider(
      <ChatHistory entries={EMPTY_HISTORY} loading skeletonRows={3} />
    );
    expect(
      loading.container.querySelectorAll(".dcf-chat-history__skeleton-row")
    ).toHaveLength(3);
    expect(screen.getByText("Loading chats…")).toBeInTheDocument();
    loading.unmount();

    renderInAgentProvider(<ChatHistory entries={EMPTY_HISTORY} />);
    expect(screen.getByText("No chats found")).toBeInTheDocument();
  });
});

describe("ChatHistoryItem", () => {
  const entry: AgentChatHistoryEntry = {
    id: "chat-1",
    title: "Trip planning",
    preview: "Let's go to Lisbon",
    messageCount: 2,
    visibility: "private",
    updatedAt: "2026-11-19T09:00:00.000Z",
  };

  it("deletes immediately when confirmation is disabled", () => {
    const onDelete = jest.fn();
    renderInAgentProvider(
      <ChatHistoryItem entry={entry} confirmDelete={false} onDelete={onDelete} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Delete chat/ }));
    expect(onDelete).toHaveBeenCalledWith(entry);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("cancels a pending confirmation without deleting", () => {
    const onDelete = jest.fn();
    const onConfirmChange = jest.fn();
    renderInAgentProvider(
      <ChatHistoryItem
        entry={entry}
        onDelete={onDelete}
        onConfirmChange={onConfirmChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Delete chat/ }));
    expect(onConfirmChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(onConfirmChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows the preview and closes the confirmation when opening the item", () => {
    const onOpen = jest.fn();
    renderInAgentProvider(<ChatHistoryItem entry={entry} onOpen={onOpen} />);

    expect(screen.getByText("Let's go to Lisbon")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Delete chat/ }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Trip planning"));
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

describe("ChatKnowledgeBaseSelector", () => {
  const entries: AgentChatKnowledgeBaseEntry[] = [
    { id: "kb-1", label: "Pricing policy", size: 2048 },
    { id: "kb-2", label: "Support guide", fileCount: 3 },
  ];
  const DELETE_ENTRIES: AgentChatKnowledgeBaseEntry[] = [
    { id: "kb-1", label: "Pricing policy" },
  ];

  it("selects, reports counts, and clears the selection", () => {
    const onSelectionChange = jest.fn();
    const onCountChange = jest.fn();
    renderInAgentProvider(
      <ChatKnowledgeBaseSelector
        selectedIds={NO_SELECTION}
        entries={entries}
        onSelectionChange={onSelectionChange}
        onCountChange={onCountChange}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select: Pricing policy" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["kb-1"]);
    expect(onCountChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByLabelText("Selected: 1")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: /Clear selection/ }));
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(onCountChange).toHaveBeenLastCalledWith(0);
  });

  it("selects all entries and unchecks them again", () => {
    const onSelectionChange = jest.fn();
    renderInAgentProvider(
      <ChatKnowledgeBaseSelector
        selectedIds={NO_SELECTION}
        entries={entries}
        onSelectionChange={onSelectionChange}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["kb-1", "kb-2"]);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("queues uploads through the source and adds the uploaded entry", async () => {
    const source = new InMemoryAgentKnowledgeBaseSource();
    const onUpload = jest.fn();
    const onEntriesChange = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatKnowledgeBaseSelector
        selectedIds={NO_SELECTION}
        source={source}
        onUpload={onUpload}
        onEntriesChange={onEntriesChange}
      />
    );

    await waitFor(() => expect(screen.getByText("No documents yet")).toBeInTheDocument());

    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeFile("brief.txt", 32)] },
    });

    await waitFor(() =>
      expect(
        container.querySelector('.dcf-chat-knowledge-base__queue-row[data-status="done"]')
      ).not.toBeNull()
    );
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    expect(
      container.querySelector(".dcf-chat-knowledge-base__entry-name")
        ?.textContent
    ).toBe("brief.txt");
    expect(onUpload).toHaveBeenCalled();
    expect(onEntriesChange).toHaveBeenCalled();
    expect(source.all().map((entry) => entry.label)).toContain("brief.txt");
  });

  it("deletes an entry via the source", async () => {
    const source = new InMemoryAgentKnowledgeBaseSource([
      { id: "kb-1", label: "Pricing policy" },
    ]);
    const onRemove = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatKnowledgeBaseSelector
        selectedIds={NO_SELECTION}
        entries={DELETE_ENTRIES}
        source={source}
        onRemove={onRemove}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Delete file: Pricing policy" })
    );

    await waitFor(() =>
      expect(container.querySelector(".dcf-chat-knowledge-base__row")).toBeNull()
    );
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(source.all()).toEqual([]);
  });

  it("closes on an outside click and on Escape", () => {
    const onOpenChange = jest.fn();
    const view = renderInAgentProvider(
      <ChatKnowledgeBaseSelector
        selectedIds={NO_SELECTION} entries={entries} onOpenChange={onOpenChange} />
    );

    fireEvent.click(document.body);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    onOpenChange.mockClear();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    view.unmount();
  });

  it("returns nothing while closed and shows loading skeletons while loading", () => {
    const closed = renderInAgentProvider(
      <ChatKnowledgeBaseSelector
        selectedIds={NO_SELECTION} entries={entries} open={false} />
    );
    expect(closed.container.querySelector(".dcf-chat-knowledge-base")).toBeNull();
    closed.unmount();

    const loading = renderInAgentProvider(
      <ChatKnowledgeBaseSelector
        selectedIds={NO_SELECTION} entries={EMPTY_KNOWLEDGE} loading skeletonRows={2} />
    );
    expect(
      loading.container.querySelectorAll(
        ".dcf-chat-knowledge-base__skeleton-row"
      )
    ).toHaveLength(2);
    expect(screen.getByText("Loading documents…")).toBeInTheDocument();
  });
});
