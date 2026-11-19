import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import {
  agentChatFoldEnvelope,
  emptyAgentChatFoldState,
  type AgentChatFoldState,
} from "../../../src/agent/services/agentEnvelopeFold.js";
import { envelope, message } from "./pure-helpers.js";

/**
 * Pure fold of graph run envelopes into the decaf conversation state:
 * streaming replacement, pending placeholders, terminal statuses, telemetry
 * counters, structured objects, part normalization and immutability.
 */

function fold(
  envelopes: ReturnType<typeof envelope>[],
  initial: AgentChatFoldState = emptyAgentChatFoldState(),
  opts: { replay?: boolean } = {}
): AgentChatFoldState {
  return envelopes.reduce(
    (state, current) => agentChatFoldEnvelope(state, current, opts),
    initial
  );
}

describe("agentEnvelopeFold", () => {
  it("creates the empty conversation state", () => {
    expect(emptyAgentChatFoldState()).toEqual({
      messages: [],
      roundtrips: [],
      structuredObject: null,
    });
  });

  it("folds node output into an assistant message and marks the roundtrip running", () => {
    const state = fold([
      envelope(GraphExecutionEventType.WORKFLOW_STARTED, {
        timestamp: "2026-11-19T10:00:01.000Z",
      }),
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { messageId: "assistant-1", response: "Hello there" },
      }),
    ]);

    expect(state.roundtrips).toEqual([
      expect.objectContaining({
        runId: "run-1",
        status: "running",
        startedAt: "2026-11-19T10:00:01.000Z",
      }),
    ]);
    expect(state.messages).toEqual([
      expect.objectContaining({
        id: "assistant-1",
        role: "assistant",
        content: "Hello there",
        runId: "run-1",
      }),
    ]);
  });

  it("replaces a streaming message in place across cumulative updates", () => {
    const head = envelope(GraphExecutionEventType.NODE_OUTPUT, {
      payload: { messageId: "live", response: "Hel", streaming: true },
    });
    const middle = envelope(GraphExecutionEventType.NODE_OUTPUT, {
      payload: { messageId: "live", response: "Hello", streaming: true },
    });
    const last = envelope(GraphExecutionEventType.NODE_OUTPUT, {
      payload: { messageId: "live", response: "Hello world" },
    });

    const state = fold([head, middle, last]);

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toEqual(
      expect.objectContaining({ id: "live", content: "Hello world" })
    );
    expect(state.messages[0].streaming).toBeUndefined();
  });

  it("replaces the run's pending placeholder instead of appending", () => {
    const pending = message({
      id: "pending-1",
      role: "user",
      content: "Question",
      pending: true,
      runId: "run-1",
    });

    const state = fold(
      [
        envelope(GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "Answer" },
        }),
      ],
      { messages: [pending], roundtrips: [], structuredObject: null }
    );

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toEqual(
      expect.objectContaining({
        role: "assistant",
        content: "Answer",
        runId: "run-1",
      })
    );
    expect(state.messages[0].pending).toBeUndefined();
  });

  it("replaces the newest streaming assistant for the run when no ids are present", () => {
    const streaming = message({
      id: "streaming-1",
      content: "partial",
      runId: "run-1",
      streaming: true,
    });

    const state = fold(
      [
        envelope(GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "partial answer" },
        }),
      ],
      { messages: [streaming], roundtrips: [], structuredObject: null }
    );

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].content).toBe("partial answer");
  });

  it("adds the WORKFLOW_COMPLETED fallback answer only when no assistant responded", () => {
    const withFallback = fold([
      envelope(GraphExecutionEventType.WORKFLOW_COMPLETED, {
        payload: { answer: "Final answer" },
      }),
    ]);
    expect(withFallback.messages).toEqual([
      expect.objectContaining({ role: "assistant", content: "Final answer" }),
    ]);
    expect(withFallback.roundtrips[0]).toEqual(
      expect.objectContaining({ status: "succeeded" })
    );

    const withAssistant = fold([
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "Streamed answer" },
      }),
      envelope(GraphExecutionEventType.WORKFLOW_COMPLETED, {
        payload: { answer: "Duplicate answer" },
      }),
    ]);
    expect(withAssistant.messages).toHaveLength(1);
    expect(withAssistant.messages[0].content).toBe("Streamed answer");
  });

  it("falls back through answer, response and result members", () => {
    const response = fold([
      envelope(GraphExecutionEventType.WORKFLOW_COMPLETED, {
        payload: { response: "From response" },
      }),
    ]);
    const result = fold([
      envelope(GraphExecutionEventType.WORKFLOW_COMPLETED, {
        payload: { result: "From result" },
      }),
    ]);
    expect(response.messages[0].content).toBe("From response");
    expect(result.messages[0].content).toBe("From result");
  });

  it("records node failures on telemetry and converts the pending placeholder to an error", () => {
    const pending = message({
      id: "pending",
      role: "user",
      pending: true,
      runId: "run-1",
    });

    const state = fold(
      [
        envelope(GraphExecutionEventType.NODE_FAILED, {
          error: { name: "TimeoutError", message: "Node timed out" },
        }),
      ],
      { messages: [pending], roundtrips: [], structuredObject: null }
    );

    expect(state.roundtrips[0].error).toEqual({
      name: "TimeoutError",
      message: "Node timed out",
    });
    expect(state.messages[0]).toEqual(
      expect.objectContaining({ role: "error", content: "Node timed out" })
    );
  });

  it("ignores node failures without a message", () => {
    const state = fold([
      envelope(GraphExecutionEventType.NODE_FAILED, { error: { name: "X" } }),
    ]);
    expect(state.roundtrips[0].error).toBeUndefined();
    expect(state.messages).toEqual([]);
  });

  it("marks cancelled and failed workflows with their error text", () => {
    const cancelled = fold([
      envelope(GraphExecutionEventType.WORKFLOW_CANCELLED, {
        error: { message: "Stopped" },
      }),
    ]);
    expect(cancelled.roundtrips[0]).toEqual(
      expect.objectContaining({ status: "cancelled" })
    );
    expect(cancelled.roundtrips[0].finishedAt).toBeTruthy();

    const failed = fold([
      envelope(GraphExecutionEventType.WORKFLOW_FAILED, {
        error: { name: "BackendError", message: "Boom" },
      }),
    ]);
    expect(failed.roundtrips[0]).toEqual(
      expect.objectContaining({
        status: "failed",
        error: { name: "BackendError", message: "Boom" },
      })
    );
    expect(failed.roundtrips[0].finishedAt).toBeTruthy();
  });

  it("uses the i18n fallback keys when a terminal failure has no message", () => {
    const pending = message({ id: "p", pending: true, runId: "run-1" });
    const initial = {
      messages: [pending],
      roundtrips: [],
      structuredObject: null,
    };

    const cancelled = fold(
      [envelope(GraphExecutionEventType.WORKFLOW_CANCELLED)],
      initial
    );
    expect(cancelled.messages[0].content).toBe("agent.chat.status.cancelled");

    const failed = fold(
      [envelope(GraphExecutionEventType.WORKFLOW_FAILED)],
      initial
    );
    expect(failed.messages[0].content).toBe("agent.chat.status.failed");
  });

  it("counts queued nodes, completed nodes and run log lines", () => {
    const state = fold([
      envelope(GraphExecutionEventType.NODE_QUEUED),
      envelope(GraphExecutionEventType.NODE_QUEUED),
      envelope(GraphExecutionEventType.NODE_COMPLETED),
      envelope(GraphExecutionEventType.GRAPH_RUN_LOG, {
        payload: { message: "line" },
      }),
      envelope(GraphExecutionEventType.GRAPH_RUN_LOG, {
        payload: { message: "line" },
      }),
    ]);

    expect(state.roundtrips[0]).toEqual(
      expect.objectContaining({
        nodeCount: 2,
        completedNodeCount: 1,
        logLines: 2,
      })
    );
  });

  it("captures structured output with structuredOutput taking precedence over object", () => {
    const structured = fold([
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "done",
          structuredOutput: { invoice: 1 },
          object: { invoice: 2 },
        },
      }),
    ]);
    expect(structured.structuredObject).toEqual({
      runId: "run-1",
      value: { invoice: 1 },
    });

    const objectOnly = fold([
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { object: { invoice: 3 } },
      }),
    ]);
    expect(objectOnly.structuredObject?.value).toEqual({ invoice: 3 });

    const nullValue = fold([
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "x", structuredOutput: null },
      }),
    ]);
    expect(nullValue.structuredObject).toBeNull();
  });

  it("normalizes message parts, dropping unknown kinds and generating ids", () => {
    const state = fold([
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          messageId: "with-parts",
          response: "Body",
          parts: [
            { kind: "text", text: "Body" },
            { id: "known", kind: "reasoning", content: "why" },
            { kind: "bogus", content: "drop me" },
            { kind: "code", code: "const a = 1;" },
          ],
        },
      }),
    ]);

    expect(state.messages[0].parts).toEqual([
      { kind: "text", text: "Body", id: "text-0" },
      { id: "known", kind: "reasoning", content: "why" },
      { kind: "code", code: "const a = 1;", id: "code-3" },
    ]);
  });

  it("normalizes action names from strings and objects", () => {
    const state = fold([
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "Done",
          actions: ["retry", { name: "download" }, { name: "" }, 42],
        },
      }),
    ]);
    expect(state.messages[0].actions).toEqual(["retry", "download"]);
  });

  it("flags replayed roundtrips and ignores unknown event types", () => {
    const state = fold(
      [
        envelope(GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "Replay" },
        }),
        envelope("unsupported.event" as GraphExecutionEventType),
      ],
      emptyAgentChatFoldState(),
      { replay: true }
    );

    expect(state.roundtrips[0].replayed).toBe(true);
    expect(state.messages).toHaveLength(1);
  });

  it("does not mutate the incoming message array", () => {
    const initial: AgentChatFoldState = {
      messages: [message({ id: "existing" })],
      roundtrips: [{ runId: "run-1", status: "queued" }],
      structuredObject: null,
    };

    const next = agentChatFoldEnvelope(
      initial,
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "Next" },
      })
    );

    expect(initial.messages).toHaveLength(1);
    expect(next.messages).not.toBe(initial.messages);
    expect(next.messages).toHaveLength(2);
  });

  /**
   * Regression guard for the immutability contract: the fold copies the
   * `roundtrips` array and clones an existing roundtrip row before mutating
   * it, so the previous state never observes the new status.
   */
  test("does not mutate an existing roundtrip row", () => {
    const initial: AgentChatFoldState = {
      messages: [],
      roundtrips: [{ runId: "run-1", status: "queued" }],
      structuredObject: null,
    };

    agentChatFoldEnvelope(
      initial,
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "Next" },
      })
    );

    expect(initial.roundtrips[0].status).toBe("queued");
  });
});
