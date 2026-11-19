import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import {
  AGENT_CHAT_DEMO_WORKFLOW_ID,
  AgentChatFakeTransport,
} from "../../../src/agent/services/AgentChatFakeTransport.js";
import type {
  AgentChatDemoEvent,
  AgentChatSendRequest,
  AgentChatTransportHandlers,
} from "../../../src/agent/types.js";

/**
 * Deterministic scripted demo transport: run identity, the full conversation
 * timeline (text, reasoning, tools, workflow, approval, telemetry), the demo
 * side channel, cancellation and replay.
 */

function createHandlers(): {
  handlers: AgentChatTransportHandlers;
  events: GraphRunEventEnvelope[];
  terminal: GraphRunEventEnvelope[];
  errors: unknown[];
} {
  const events: GraphRunEventEnvelope[] = [];
  const terminal: GraphRunEventEnvelope[] = [];
  const errors: unknown[] = [];
  return {
    events,
    terminal,
    errors,
    handlers: {
      onEvent: (event) => events.push(event),
      onTerminal: (event) => terminal.push(event),
      onError: (error) => errors.push(error),
    },
  };
}

const REQUEST: AgentChatSendRequest = {
  message: "Show my recent orders",
  attachments: [],
  knowledgeSourceIds: [],
  sessionId: "session-1",
  userId: "user-1",
};

function numericSequences(events: GraphRunEventEnvelope[]): number[] {
  return events.map((event) => event.sequence);
}

describe("AgentChatFakeTransport", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("configures the scenario and exposes the active one", () => {
    const transport = new AgentChatFakeTransport();
    expect(transport.activeScenario).toBe("conversation");

    transport.configure({ scenario: "structured-object", speed: 5 });
    expect(transport.activeScenario).toBe("structured-object");

    transport.configure({});
    expect(transport.activeScenario).toBe("structured-object");
  });

  it("creates a deterministic run descriptor", async () => {
    const transport = new AgentChatFakeTransport();
    const { handlers } = createHandlers();

    const first = await transport.send(REQUEST, handlers);
    const second = await transport.send(REQUEST, handlers);

    expect(first).toEqual({
      runId: "demo-run-1",
      eventsUrl: "/demo/agent-chat/runs/demo-run-1/events",
    });
    expect(second.runId).toBe("demo-run-2");
  });

  it("streams a full conversation timeline under one workflow id", async () => {
    const transport = new AgentChatFakeTransport();
    transport.configure({ speed: 100 });
    const { handlers, events, terminal, errors } = createHandlers();

    await transport.send(REQUEST, handlers);
    jest.runAllTimers();

    expect(events[0]).toEqual(
      expect.objectContaining({
        type: GraphExecutionEventType.WORKFLOW_STARTED,
        workflowId: AGENT_CHAT_DEMO_WORKFLOW_ID,
        runId: "demo-run-1",
        sequence: 1,
      })
    );
    expect(events[events.length - 1].type).toBe(
      GraphExecutionEventType.WORKFLOW_COMPLETED
    );
    expect(terminal).toHaveLength(1);
    expect(terminal[0].type).toBe(GraphExecutionEventType.WORKFLOW_COMPLETED);
    expect(errors).toEqual([]);

    const sequences = numericSequences(events);
    expect(sequences).toEqual(
      Array.from({ length: events.length }, (_, index) => index + 1)
    );

    const outputs = events.filter(
      (event) => event.type === GraphExecutionEventType.NODE_OUTPUT
    );
    expect(outputs.length).toBeGreaterThan(10);
    const responses = outputs
      .map(
        (event) =>
          (event.payload as { response?: string } | undefined)?.response ?? ""
      )
      .join("\n");
    expect(responses).toContain('You asked: "Show my recent orders".');
    expect(responses).toContain("Lisbon is 24°C and sunny");
    const structured = outputs
      .map(
        (event) =>
          (event.payload as { structuredOutput?: unknown } | undefined)
            ?.structuredOutput
      )
      .filter(Boolean);
    expect(structured[structured.length - 1]).toEqual(
      expect.objectContaining({ orders: 3, inTransit: 1 })
    );
  });

  it("emits reasoning, code, tool, structured object and approval payloads", async () => {
    const transport = new AgentChatFakeTransport();
    transport.configure({ speed: 100 });
    const { handlers, events } = createHandlers();

    await transport.send(REQUEST, handlers);
    jest.runAllTimers();

    const parts = events.flatMap((event) => {
      const payload = event.payload as
        | { parts?: { kind: string; status?: string }[] }
        | undefined;
      return payload?.parts ?? [];
    });
    expect(parts.some((part) => part.kind === "reasoning")).toBe(true);
    expect(parts.some((part) => part.kind === "code")).toBe(true);
    expect(
      parts.some((part) => part.kind === "tool" && part.status === "succeeded")
    ).toBe(true);

    const types = events.map((event) => event.type);
    expect(types).toContain(GraphExecutionEventType.WORKFLOW_SUSPENDED);
  });

  it("publishes the non-transcript demo events on the side channel", async () => {
    const transport = new AgentChatFakeTransport();
    transport.configure({ speed: 100 });
    const { handlers } = createHandlers();
    const demo: AgentChatDemoEvent[] = [];
    const unsubscribe = transport.subscribeDemoEvents((event) => demo.push(event));

    await transport.send(REQUEST, handlers);
    jest.runAllTimers();

    const kinds = demo.map((event) => event.kind);
    expect(kinds[0]).toBe("reset");
    for (const kind of [
      "workflow-steps",
      "progress",
      "orders",
      "tracker",
      "weather",
      "agent-step",
      "nested-agent",
      "approval",
      "notification",
    ]) {
      expect(kinds).toContain(kind);
    }
    const approval = demo.find((event) => event.kind === "approval");
    expect(approval).toEqual(
      expect.objectContaining({
        kind: "approval",
        status: "pending",
        toolName: "sendSummary",
      })
    );

    unsubscribe();
    demo.length = 0;
    await transport.send(REQUEST, handlers);
    jest.runAllTimers();
    expect(demo).toEqual([]);
  });

  it("replays the selected scenario under the recorded run id", async () => {
    const transport = new AgentChatFakeTransport();
    transport.configure({ speed: 100 });
    const first = createHandlers();
    const descriptor = await transport.send(REQUEST, first.handlers);
    jest.runAllTimers();

    const replay = createHandlers();
    const demo: AgentChatDemoEvent[] = [];
    transport.subscribeDemoEvents((event) => demo.push(event));
    await transport.replay(descriptor, replay.handlers);
    jest.runAllTimers();

    expect(replay.events[0]).toEqual(
      expect.objectContaining({
        runId: descriptor.runId,
        type: GraphExecutionEventType.WORKFLOW_STARTED,
      })
    );
    expect(replay.terminal).toHaveLength(1);
    expect(demo[0]).toEqual({ kind: "reset" });
  });

  it("streams the structured-object scenario field by field", async () => {
    const transport = new AgentChatFakeTransport();
    transport.configure({ scenario: "structured-object", speed: 100 });
    const { handlers, events, terminal } = createHandlers();

    await transport.send(REQUEST, handlers);
    jest.runAllTimers();

    const structured = events
      .map(
        (event) =>
          (event.payload as { structuredOutput?: Record<string, unknown> } | undefined)
            ?.structuredOutput
      )
      .filter(Boolean) as Record<string, unknown>[];
    expect(structured.length).toBeGreaterThan(4);
    expect(structured[0]).toEqual({ invoiceNumber: "INV-2026-0142" });
    expect(structured[structured.length - 1]).toEqual(
      expect.objectContaining({
        vendor: "Northwind Supply",
        total: 1480,
        currency: "EUR",
      })
    );
    expect(terminal).toHaveLength(1);
  });

  it("cancels a live run once and reports it through telemetry and a notification", async () => {
    const transport = new AgentChatFakeTransport();
    transport.configure({ speed: 1 });
    const { handlers, events, terminal } = createHandlers();
    const demo: AgentChatDemoEvent[] = [];
    transport.subscribeDemoEvents((event) => demo.push(event));

    const descriptor = await transport.send(REQUEST, handlers);
    jest.advanceTimersByTime(200);
    expect(transport.isRunning(descriptor.runId)).toBe(true);

    await transport.cancel(descriptor.runId);
    expect(transport.isRunning(descriptor.runId)).toBe(false);
    expect(terminal).toHaveLength(1);
    expect(terminal[0].type).toBe(GraphExecutionEventType.WORKFLOW_CANCELLED);

    const cancelledCount = events.filter(
      (event) => event.type === GraphExecutionEventType.WORKFLOW_CANCELLED
    ).length;
    expect(cancelledCount).toBe(1);
    expect(
      demo.filter(
        (event) =>
          event.kind === "notification" &&
          event.notification.id === `${descriptor.runId}-cancelled`
      )
    ).toHaveLength(1);

    await transport.cancel(descriptor.runId);
    expect(terminal).toHaveLength(1);
    expect(
      events.filter(
        (event) => event.type === GraphExecutionEventType.WORKFLOW_CANCELLED
      )
    ).toHaveLength(1);
  });

  it("drops pending steps after cancellation", async () => {
    const transport = new AgentChatFakeTransport();
    transport.configure({ speed: 1 });
    const { handlers, events } = createHandlers();

    const descriptor = await transport.send(REQUEST, handlers);
    jest.advanceTimersByTime(120);
    const countAtCancel = events.length;
    await transport.cancel(descriptor.runId);
    jest.runAllTimers();

    expect(events).toHaveLength(countAtCancel + 1);
  });

  it("is a no-op when cancelling an unknown run", async () => {
    const transport = new AgentChatFakeTransport();
    await expect(transport.cancel("missing")).resolves.toBeUndefined();
    expect(transport.isRunning("missing")).toBe(false);
  });
});
