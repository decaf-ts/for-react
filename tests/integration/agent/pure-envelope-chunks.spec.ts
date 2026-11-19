import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import type { UIMessageChunk } from "ai";
import {
  AgentChatEnvelopeChunkProducer,
  type AgentChatChunkProducerOptions,
} from "../../../src/agent/services/agentEnvelopeChunks.js";
import type { AgentChatSideChannelHandlers } from "../../../src/agent/types.js";
import { envelope } from "./pure-helpers.js";

/**
 * Producer translation of graph envelopes into @ai-sdk `UIMessageChunk`s:
 * text streaming diffs, reasoning/tool/code/file parts, structured objects,
 * terminal failure/success chunks and the decaf side channel.
 */

function create(
  options: Partial<AgentChatChunkProducerOptions> = {}
): AgentChatEnvelopeChunkProducer {
  return new AgentChatEnvelopeChunkProducer({
    runId: "run-1",
    messageId: "assistant-1",
    now: () => "2026-11-19T10:00:00.000Z",
    ...options,
  });
}

function types(chunks: UIMessageChunk[]): string[] {
  return chunks.map((chunk) => chunk.type);
}

describe("agentEnvelopeChunks producer", () => {
  it("opens the message once with start, start-step and metadata", () => {
    const producer = create({ sessionId: "session-1" });
    const first = producer.start();
    expect(first).toEqual([
      {
        type: "start",
        messageId: "assistant-1",
        messageMetadata: {
          runId: "run-1",
          sessionId: "session-1",
          createdAt: "2026-11-19T10:00:00.000Z",
        },
      },
      { type: "start-step" },
    ]);
    expect(producer.start()).toEqual([]);
  });

  it("diffs cumulative streaming text into deltas and closes the part", () => {
    const producer = create();
    const first = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "Hel", streaming: true },
      })
    );
    expect(first).toEqual([
      { type: "text-start", id: "assistant-1:text" },
      { type: "text-delta", id: "assistant-1:text", delta: "Hel" },
    ]);

    const second = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "Hello", streaming: true },
      })
    );
    expect(second).toEqual([
      { type: "text-delta", id: "assistant-1:text", delta: "lo" },
    ]);

    const final = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "Hello" },
      })
    );
    expect(final).toEqual([{ type: "text-end", id: "assistant-1:text" }]);
  });

  it("starts a new text part when the cumulative text is not a prefix", () => {
    const producer = create();
    producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "abc", streaming: true },
      })
    );

    const chunks = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "xyz", streaming: true },
      })
    );

    expect(types(chunks)).toEqual([
      "text-end",
      "text-start",
      "text-delta",
    ]);
    expect(chunks[0]).toEqual({ type: "text-end", id: "assistant-1:text" });
    expect(chunks[2]).toEqual({
      type: "text-delta",
      id: "assistant-1:text:1",
      delta: "xyz",
    });
  });

  it("streams reasoning deltas and closes the reasoning part", () => {
    const producer = create();
    const first = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "answer",
          parts: [
            { id: "r1", kind: "reasoning", content: "Think", streaming: true },
          ],
        },
      })
    );
    expect(types(first)).toContain("reasoning-start");
    expect(first).toContainEqual({
      type: "reasoning-delta",
      id: "r1",
      delta: "Think",
    });

    const second = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "answer",
          parts: [{ id: "r1", kind: "reasoning", content: "Thinking more" }],
        },
      })
    );
    expect(second).toContainEqual({
      type: "reasoning-delta",
      id: "r1",
      delta: "ing more",
    });
    expect(second).toContainEqual({ type: "reasoning-end", id: "r1" });
  });

  it("emits tool lifecycle chunks for queued, running, succeeded and failed tools", () => {
    const producer = create();
    const queued = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "x",
          parts: [{ id: "tool-1", kind: "tool", name: "orders", status: "queued" }],
        },
      })
    );
    expect(queued).toContainEqual({
      type: "tool-input-start",
      toolCallId: "tool-1",
      toolName: "orders",
    });
    expect(types(queued)).not.toContain("tool-input-available");

    const running = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "x",
          parts: [
            {
              id: "tool-1",
              kind: "tool",
              name: "orders",
              status: "running",
              input: { query: "lisbon" },
            },
          ],
        },
      })
    );
    expect(running).toContainEqual({
      type: "tool-input-available",
      toolCallId: "tool-1",
      toolName: "orders",
      input: { query: "lisbon" },
    });

    const succeeded = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "x",
          parts: [
            {
              id: "tool-1",
              kind: "tool",
              name: "orders",
              status: "succeeded",
              output: { count: 3 },
            },
          ],
        },
      })
    );
    expect(succeeded).toContainEqual({
      type: "tool-output-available",
      toolCallId: "tool-1",
      output: { count: 3 },
    });

    const failed = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "x",
          parts: [
            {
              id: "tool-2",
              kind: "tool",
              name: "weather",
              status: "failed",
            },
          ],
        },
      })
    );
    expect(failed).toContainEqual({
      type: "tool-output-error",
      toolCallId: "tool-2",
      errorText: "Tool failed",
    });
  });

  it("emits one decaf.code custom chunk per distinct code payload", () => {
    const producer = create();
    const part = {
      id: "code-1",
      kind: "code",
      language: "typescript",
      filename: "sum.ts",
      code: "export const sum = (a, b) => a + b;",
    };

    const first = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "x", parts: [part] },
      })
    );
    expect(first).toContainEqual({
      type: "custom",
      kind: "decaf.code",
      providerMetadata: {
        decaf: {
          code: part.code,
          language: "typescript",
          filename: "sum.ts",
        },
      },
    });

    const duplicate = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "x", parts: [part] },
      })
    );
    expect(types(duplicate)).not.toContain("custom");
  });

  it("emits file chunks for attachment parts with a URL only", () => {
    const producer = create();
    const withUrl = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "x",
          parts: [
            {
              id: "att-1",
              kind: "attachment",
              attachment: {
                id: "att-1",
                name: "photo.png",
                mime: "image/png",
                size: 10,
                url: "https://example.test/photo.png",
              },
            },
          ],
        },
      })
    );
    expect(withUrl).toContainEqual({
      type: "file",
      url: "https://example.test/photo.png",
      mediaType: "image/png",
    });

    const withoutUrl = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "x",
          parts: [
            {
              id: "att-2",
              kind: "attachment",
              attachment: { id: "att-2", name: "a.txt", mime: "text/plain", size: 1 },
            },
          ],
        },
      })
    );
    expect(types(withoutUrl)).not.toContain("file");
  });

  it("emits structured-object data chunks and reports them on the side channel", () => {
    const onStructuredObject = jest.fn();
    const producer = create({ handlers: { onStructuredObject } });

    const chunks = producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "done",
          structuredOutput: { invoice: "INV-1" },
        },
      })
    );

    expect(chunks).toContainEqual({
      type: "data-structured-object",
      id: "run-1:structured",
      data: { invoice: "INV-1" },
    });
    expect(onStructuredObject).toHaveBeenCalledWith({
      runId: "run-1",
      value: { invoice: "INV-1" },
    });
  });

  it("uses a completed fallback answer and closes with finish", () => {
    const producer = create();
    const chunks = producer.push(
      envelope(GraphExecutionEventType.WORKFLOW_COMPLETED, {
        payload: { answer: "All done" },
      })
    );

    expect(chunks).toContainEqual({
      type: "text-delta",
      id: "assistant-1:text",
      delta: "All done",
    });
    expect(chunks).toContainEqual({ type: "finish", finishReason: "stop" });
  });

  it("emits data-error plus finish for failed and cancelled workflows", () => {
    const failed = create().push(
      envelope(GraphExecutionEventType.WORKFLOW_FAILED, {
        error: { name: "BackendError", message: "Boom" },
      })
    );
    expect(failed).toContainEqual({
      type: "data-error",
      data: { message: "Boom", name: "BackendError" },
    });
    expect(failed).toContainEqual({ type: "finish", finishReason: "error" });

    const cancelled = create().push(
      envelope(GraphExecutionEventType.WORKFLOW_CANCELLED)
    );
    expect(cancelled).toContainEqual({
      type: "data-error",
      data: { message: "agent.chat.status.cancelled" },
    });
    expect(cancelled).toContainEqual({ type: "finish", finishReason: "other" });
  });

  it("surfaces suspended and resumed workflows as approval side-channel events", () => {
    const onDemoEvent = jest.fn();
    const producer = create({ handlers: { onDemoEvent } });

    producer.push(
      envelope(GraphExecutionEventType.WORKFLOW_SUSPENDED, {
        payload: { suspend: { tool: "sendSummary" } },
      })
    );
    producer.push(
      envelope(GraphExecutionEventType.WORKFLOW_RESUMED, {
        payload: { suspend: { tool: "sendSummary" } },
      })
    );

    expect(onDemoEvent).toHaveBeenNthCalledWith(1, {
      kind: "approval",
      status: "pending",
      runId: "run-1",
      payload: { tool: "sendSummary" },
    });
    expect(onDemoEvent).toHaveBeenNthCalledWith(2, {
      kind: "approval",
      status: "approved",
      runId: "run-1",
      payload: { tool: "sendSummary" },
    });
  });

  it("reports telemetry on every push and terminal errors on the side channel", () => {
    const handlers: AgentChatSideChannelHandlers = {
      onTelemetry: jest.fn(),
      onError: jest.fn(),
    };
    const producer = create({ handlers });

    producer.push(
      envelope(GraphExecutionEventType.WORKFLOW_STARTED, {
        timestamp: "2026-11-19T10:00:01.000Z",
      })
    );
    expect(handlers.onTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "run-1", status: "running" })
    );
    expect(handlers.onError).not.toHaveBeenCalled();

    producer.push(
      envelope(GraphExecutionEventType.WORKFLOW_FAILED, {
        error: { message: "Exploded" },
      })
    );
    expect(handlers.onError).toHaveBeenCalledWith(new Error("Exploded"));
  });

  it("closes a pending text part and finishes exactly once", () => {
    const producer = create();
    producer.push(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "partial", streaming: true },
      })
    );

    expect(producer.finish("error")).toEqual([
      { type: "text-end", id: "assistant-1:text" },
      { type: "finish", finishReason: "error" },
    ]);
    expect(producer.finish()).toEqual([]);
  });
});
