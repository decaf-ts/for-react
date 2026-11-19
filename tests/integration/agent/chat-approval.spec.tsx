import "./xyflow-mock";
import { ReadableStream as NodeReadableStream } from "node:stream/web";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import type { UIMessageChunk } from "ai";
import { ChatApproval } from "../../../src/agent/components/chat-approval/ChatApproval.js";
import { AgentChatEnvelopeChunkProducer } from "../../../src/agent/services/agentEnvelopeChunks.js";
import { AgentChatLegacyChatTransportAdapter } from "../../../src/agent/services/AgentChatLegacyChatTransportAdapter.js";
import { AgentChatFakeTransport } from "../../../src/agent/services/AgentChatFakeTransport.js";
import type { AgentChatSideChannelHandlers } from "../../../src/agent/types.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * SAA-2095 coverage requirement 8 — approval decisions are decaf side-channel
 * state, never tool-call-scoped `tool-approval-*` protocol chunks.
 */

// jsdom does not expose the Web Streams API; the legacy adapter builds one.
(globalThis as { ReadableStream?: unknown }).ReadableStream = NodeReadableStream;

function envelope(
  sequence: number,
  type: GraphExecutionEventType,
  payload?: Record<string, unknown>
): GraphRunEventEnvelope {
  return {
    runId: "run-1",
    workflowId: "wf-1",
    sequence,
    type,
    timestamp: "2026-11-19T10:00:00.000Z",
    ...(payload ? { payload: payload as never } : {}),
  } as GraphRunEventEnvelope;
}

async function collectChunks(stream: ReadableStream<UIMessageChunk>) {
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return chunks;
}

describe("ChatApproval", () => {
  it("emits a resume decision carrying runId and the suspended payload", () => {
    const onApprove = jest.fn();
    const payload = { to: "customer@example.test" };
    renderInAgentProvider(
      <ChatApproval runId="run-1" payload={payload} onApprove={onApprove} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Approve/ }));

    expect(onApprove).toHaveBeenCalledWith({
      type: "resume",
      runId: "run-1",
      resumeData: payload,
    });
  });

  it("prefers explicit resumeData over the payload", () => {
    const onApprove = jest.fn();
    renderInAgentProvider(
      <ChatApproval
        runId="run-1"
        payload={{ original: true }}
        resumeData={{ explicit: true }}
        onApprove={onApprove}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Approve/ }));
    expect(onApprove.mock.calls[0][0].resumeData).toEqual({ explicit: true });
  });

  it("emits a deny decision with and without a reason", () => {
    const withReason = jest.fn();
    const first = renderInAgentProvider(
      <ChatApproval
        runId="run-1"
        rejectReason="not allowed"
        onReject={withReason}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Reject/ }));
    expect(withReason).toHaveBeenCalledWith({
      type: "deny",
      runId: "run-1",
      reason: "not allowed",
    });
    first.unmount();

    const withoutReason = jest.fn();
    renderInAgentProvider(
      <ChatApproval runId="run-2" onReject={withoutReason} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Reject/ }));
    const decision = withoutReason.mock.calls[0][0];
    expect(decision).toEqual({ type: "deny", runId: "run-2" });
    expect("reason" in decision).toBe(false);
  });

  it("disables both buttons once decided", () => {
    for (const status of ["approved", "rejected"] as const) {
      const onApprove = jest.fn();
      const onReject = jest.fn();
      const view = renderInAgentProvider(
        <ChatApproval
          runId="run-1"
          status={status}
          onApprove={onApprove}
          onReject={onReject}
        />
      );

      const approve = screen.getByRole("button", { name: /Approve/ });
      const reject = screen.getByRole("button", { name: /Reject/ });
      expect(approve).toBeDisabled();
      expect(reject).toBeDisabled();
      fireEvent.click(approve);
      fireEvent.click(reject);
      expect(onApprove).not.toHaveBeenCalled();
      expect(onReject).not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it("disables both buttons while disabled", () => {
    const onApprove = jest.fn();
    renderInAgentProvider(
      <ChatApproval runId="run-1" disabled onApprove={onApprove} />
    );

    const approve = screen.getByRole("button", { name: /Approve/ });
    expect(approve).toBeDisabled();
    fireEvent.click(approve);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("renders the payload JSON and status chip", () => {
    const { container } = renderInAgentProvider(
      <ChatApproval runId="run-1" payload={{ tool: "sendEmail" }} status="pending" />
    );

    expect(
      container.querySelector(".dcf-chat-approval__json")?.textContent
    ).toContain('"tool": "sendEmail"');
    expect(screen.getByText("Awaiting approval")).toBeInTheDocument();
    expect(screen.getByText("run-1")).toBeInTheDocument();
  });
});

describe("approval side channel never produces tool-approval chunks", () => {
  it("surfaces suspended/resumed as demo events with no protocol chunks", () => {
    const events: Array<Record<string, unknown>> = [];
    const handlers: AgentChatSideChannelHandlers = {
      onDemoEvent: (event) => events.push(event as unknown as Record<string, unknown>),
    };
    const producer = new AgentChatEnvelopeChunkProducer({
      runId: "run-1",
      handlers,
    });

    const suspended = producer.push(
      envelope(1, GraphExecutionEventType.WORKFLOW_SUSPENDED, {
        suspend: { approve: "sendEmail" },
      })
    );
    const resumed = producer.push(
      envelope(2, GraphExecutionEventType.WORKFLOW_RESUMED, {})
    );

    expect(suspended).toEqual([]);
    expect(resumed).toEqual([]);
    expect(events[0]).toMatchObject({
      kind: "approval",
      status: "pending",
      runId: "run-1",
      payload: { approve: "sendEmail" },
    });
    expect(events[1]).toMatchObject({
      kind: "approval",
      status: "approved",
      runId: "run-1",
    });
  });

  it("produces no tool-approval chunk across a full scripted demo run", async () => {
    const transport = new AgentChatFakeTransport();
    transport.configure({ speed: 100 });
    const adapter = new AgentChatLegacyChatTransportAdapter(transport);

    const stream = await adapter.sendMessages({
      messages: [
        {
          id: "user-1",
          role: "user",
          parts: [{ type: "text", text: "where is my order?" }],
        },
      ],
      body: {},
      metadata: {},
    } as never);
    const chunks = await collectChunks(stream);

    expect(chunks.length).toBeGreaterThan(0);
    const approvalChunks = chunks.filter((chunk) =>
      String((chunk as { type?: unknown }).type).startsWith("tool-approval")
    );
    expect(approvalChunks).toEqual([]);
  });
});
