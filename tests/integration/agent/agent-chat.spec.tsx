import "./ai-sdk-mock";
import "./xyflow-mock";
import React from "react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { AgentChat } from "../../../src/agent/components/agent-chat/AgentChat.js";
import { InMemoryAgentChatHistorySource } from "../../../src/agent/services/InMemoryAgentChatHistorySource.js";
import { InMemoryAgentKnowledgeBaseSource } from "../../../src/agent/services/InMemoryAgentKnowledgeBaseSource.js";
import { createAgentChatDecafStore } from "../../../src/agent/react/agentChatStore.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * SAA-2095 coverage requirement 11 — AgentChat composition: provider-sourced
 * history/knowledge, approval decisions projected into the decaf store,
 * telemetry/structured slots, and no raw i18n keys.
 */

function createStore() {
  return createAgentChatDecafStore();
}

/** Lets the provider's history/knowledge source promises settle inside act. */
async function settleProviderSources() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("AgentChat composition", () => {
  it("loads history and knowledge entries from the provider sources", async () => {
    const historySource = new InMemoryAgentChatHistorySource([
      { id: "chat-1", title: "Quarterly planning", preview: "Q4 goals" },
    ]);
    const knowledgeBaseSource = new InMemoryAgentKnowledgeBaseSource([
      { id: "kb-1", label: "Pricing policy" },
    ]);
    const { container } = renderInAgentProvider(
      <AgentChat />,
      { historySource, knowledgeBaseSource }
    );
    await settleProviderSources();

    expect(await screen.findByText("Quarterly planning")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Knowledge base/ }));
    expect(await screen.findByText("Pricing policy")).toBeInTheDocument();

    expect(container.textContent ?? "").not.toMatch(/agent\.chat\./);
  });

  it("renders a pending approval and projects the decision into the decaf store", async () => {
    const store = createStore();
    store.setState({
      approval: {
        runId: "run-approval",
        status: "pending",
        toolName: "sendEmail",
        payload: { to: "customer@example.test" },
      },
    });
    const onApprovalDecision = jest.fn();
    renderInAgentProvider(
      <AgentChat onApprovalDecision={onApprovalDecision} />,
      { store }
    );
    await settleProviderSources();

    expect(screen.getByText("Approval required")).toBeInTheDocument();
    expect(screen.getByText("sendEmail")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Approve/ }));

    await waitFor(() => expect(store.getState().approval?.status).toBe("approved"));
    expect(onApprovalDecision).toHaveBeenCalledWith({
      type: "resume",
      runId: "run-approval",
      resumeData: { to: "customer@example.test" },
    });
  });

  it("marks a rejected approval in the store", async () => {
    const store = createStore();
    store.setState({
      approval: { runId: "run-deny", status: "pending" },
    });
    renderInAgentProvider(<AgentChat />, { store });
    await settleProviderSources();

    fireEvent.click(screen.getByRole("button", { name: /Reject/ }));

    await waitFor(() => expect(store.getState().approval?.status).toBe("rejected"));
  });

  it("renders telemetry rows from the decaf store and toggles them open", async () => {
    const store = createStore();
    store.setState({
      roundtrips: [
        { runId: "run-telemetry", status: "succeeded", durationMs: 250 },
      ],
    });
    renderInAgentProvider(<AgentChat />, { store });
    await settleProviderSources();

    fireEvent.click(screen.getByRole("button", { name: "Telemetry" }));
    expect(await screen.findByText("run-telemetry")).toBeInTheDocument();
    expect(
      document.querySelector(".dcf-chat-telemetry__content")
    ).toHaveAttribute("role", "region");
  });

  it("renders a structured object from the decaf store", async () => {
    const store = createStore();
    store.setState({
      structuredObject: { runId: "run-structured", value: { total: 42 } },
    });
    const { container } = renderInAgentProvider(<AgentChat />, { store });
    await settleProviderSources();

    expect(
      container.querySelector(".dcf-agent-chat__structured")
    ).not.toBeNull();
    expect(screen.getByText("Structured object")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders custom telemetry and structured-object slots", async () => {
    renderInAgentProvider(
      <AgentChat
        telemetrySlot={<div>Custom telemetry slot</div>}
        structuredObjectSlot={<div>Custom structured slot</div>}
      />
    );
    await settleProviderSources();

    expect(screen.getByText("Custom telemetry slot")).toBeInTheDocument();
    expect(screen.getByText("Custom structured slot")).toBeInTheDocument();
  });
});
