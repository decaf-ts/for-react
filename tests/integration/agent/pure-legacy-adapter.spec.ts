import "./xyflow-mock";
import type { UIMessageChunk } from "ai";
import { ReadableStream as NodeReadableStream } from "node:stream/web";
import { AgentChatLegacyChatTransportAdapter } from "../../../src/agent/services/AgentChatLegacyChatTransportAdapter.js";
import { AgentChatFakeTransport } from "../../../src/agent/services/AgentChatFakeTransport.js";
import type {
  AgentChatRunDescriptor,
  AgentChatSideChannelHandlers,
  AgentChatTransport,
  AgentChatTransportHandlers,
  AgentChatUIMessage,
} from "../../../src/agent/types.js";

/**
 * Legacy envelope-callback transport bridged onto the @ai-sdk `ChatTransport`
 * seam: streaming, replay, abort, failure and delegation.
 */

if (typeof globalThis.ReadableStream === "undefined") {
  Object.defineProperty(globalThis, "ReadableStream", {
    configurable: true,
    writable: true,
    value: NodeReadableStream,
  });
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function readAll(
  stream: ReadableStream<UIMessageChunk>
): Promise<UIMessageChunk[]> {
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return chunks;
    if (value) chunks.push(value);
  }
}

const MESSAGES = [
  {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text: "Show my recent orders" }],
    metadata: { sessionId: "session-1" },
  },
] as unknown as AgentChatUIMessage[];

function legacyStub(): jest.Mocked<AgentChatTransport> {
  return {
    send: jest.fn(
      async (): Promise<AgentChatRunDescriptor> => ({
        runId: "stub-1",
        eventsUrl: "/stub/events",
      })
    ),
    replay: jest.fn(async () => undefined),
    cancel: jest.fn(async () => undefined),
  };
}

describe("AgentChatLegacyChatTransportAdapter", () => {
  it("is a replaying SDK transport", () => {
    const adapter = new AgentChatLegacyChatTransportAdapter(legacyStub());
    expect(adapter.resumeStreamIsReplay).toBe(true);
  });

  it("bridges a scripted legacy transport into a chunk stream", async () => {
    const fake = new AgentChatFakeTransport();
    fake.configure({ speed: 100 });
    const adapter = new AgentChatLegacyChatTransportAdapter(fake);
    const sideChannel: AgentChatSideChannelHandlers = {
      onBackendAvailable: jest.fn(),
      onTelemetry: jest.fn(),
    };

    const stream = await adapter.sendMessages({
      messages: MESSAGES,
      body: { workflowId: "wf-demo" },
      metadata: { sideChannel },
    } as never);
    const chunks = await readAll(stream);

    const types = chunks.map((chunk) => chunk.type);
    expect(types[0]).toBe("start");
    expect(types).toContain("text-delta");
    expect(types).toContain("reasoning-delta");
    expect(types[types.length - 1]).toBe("finish");
    expect(sideChannel.onBackendAvailable).toHaveBeenCalledWith(true);
    expect(sideChannel.onTelemetry).toHaveBeenCalled();
  });

  it("passes the reconstructed request to the legacy transport", async () => {
    const legacy = legacyStub();
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy);

    const stream = await adapter.sendMessages({
      messages: MESSAGES,
      body: {
        workflowId: "wf-1",
        userId: "user-9",
        attachments: [],
        knowledgeSourceIds: ["kb-1"],
      },
    } as never);
    await flush();
    await stream.cancel();

    expect(legacy.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Show my recent orders",
        workflowId: "wf-1",
        userId: "user-9",
        sessionId: "session-1",
        knowledgeSourceIds: ["kb-1"],
      }),
      expect.objectContaining({
        onEvent: expect.any(Function),
        onTerminal: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it("returns null from reconnectToStream without a descriptor", async () => {
    const legacy = legacyStub();
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy);
    await expect(
      adapter.reconnectToStream({ body: {} } as never)
    ).resolves.toBeNull();
    expect(legacy.replay).not.toHaveBeenCalled();
  });

  it("replays a descriptor through the legacy transport", async () => {
    const fake = new AgentChatFakeTransport();
    fake.configure({ speed: 100 });
    const adapter = new AgentChatLegacyChatTransportAdapter(fake);
    const descriptor: AgentChatRunDescriptor = {
      runId: "recorded-1",
      eventsUrl: "/recorded/events",
    };

    const stream = await adapter.reconnectToStream({
      body: { descriptor },
    } as never);
    expect(stream).not.toBeNull();
    const chunks = await readAll(stream!);

    const types = chunks.map((chunk) => chunk.type);
    expect(types[0]).toBe("start");
    expect(types[types.length - 1]).toBe("finish");
  });

  it("turns a rejected legacy send into an error chunk stream", async () => {
    const legacy = legacyStub();
    legacy.send.mockRejectedValueOnce(new Error("Legacy exploded"));
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy);
    const sideChannel: AgentChatSideChannelHandlers = {
      onError: jest.fn(),
    };

    const stream = await adapter.sendMessages({
      messages: MESSAGES,
      body: {},
      metadata: { sideChannel },
    } as never);
    const chunks = await readAll(stream);

    expect(sideChannel.onError).toHaveBeenCalledWith(new Error("Legacy exploded"));
    expect(chunks).toContainEqual({
      type: "data-error",
      data: { name: "Error", message: "Legacy exploded" },
    });
    expect(chunks[chunks.length - 1]).toEqual({
      type: "finish",
      finishReason: "error",
    });
  });

  it("routes legacy stream errors to the side channel", async () => {
    const legacy = legacyStub();
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy);
    const onError = jest.fn();

    const stream = await adapter.sendMessages({
      messages: MESSAGES,
      body: {},
      metadata: { sideChannel: { onError } },
    } as never);
    await flush();

    const handlers = legacy.send.mock.calls[0][1] as AgentChatTransportHandlers;
    handlers.onError(new Error("transient"));
    expect(onError).toHaveBeenCalledWith(new Error("transient"));

    handlers.onTerminal({
      runId: "stub-1",
      workflowId: "wf",
      sequence: 2,
      type: "workflow.completed" as never,
      timestamp: "2026-11-19T10:00:00.000Z",
    });
    await readAll(stream);
  });

  it("cancels the legacy run and closes the stream on abort", async () => {
    const legacy = legacyStub();
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy);
    const controller = new AbortController();

    const stream = await adapter.sendMessages({
      messages: MESSAGES,
      body: {},
      abortSignal: controller.signal,
    } as never);
    await flush();
    controller.abort();
    const chunks = await readAll(stream);

    expect(legacy.cancel).toHaveBeenCalledWith("stub-1");
    expect(chunks[chunks.length - 1]).toEqual({
      type: "finish",
      finishReason: "other",
    });
  });

  it("forwards cancel and close to the legacy transport", async () => {
    const legacy = legacyStub();
    const close = jest.fn();
    (legacy as unknown as { close: () => void }).close = close;
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy);

    await adapter.cancel("r1");
    adapter.close();

    expect(legacy.cancel).toHaveBeenCalledWith("r1");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("tolerates a legacy transport without a close hook", () => {
    const adapter = new AgentChatLegacyChatTransportAdapter(legacyStub());
    expect(() => adapter.close()).not.toThrow();
  });

  it("ignores duplicate envelope sequences and closes on terminal", async () => {
    const legacy = legacyStub();
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy);

    const stream = await adapter.sendMessages({
      messages: MESSAGES,
      body: {},
    } as never);
    await flush();

    const handlers = legacy.send.mock.calls[0][1] as AgentChatTransportHandlers;
    const envelope = {
      runId: "stub-1",
      workflowId: "wf",
      sequence: 3,
      type: "node.output" as never,
      timestamp: "2026-11-19T10:00:00.000Z",
      payload: { response: "once" },
    };
    handlers.onEvent(envelope);
    handlers.onEvent({ ...envelope, payload: { response: "twice" } });
    handlers.onTerminal({
      ...envelope,
      sequence: 4,
      type: "workflow.completed" as never,
    });

    const chunks = await readAll(stream);
    const deltas = chunks.filter(
      (chunk) => chunk.type === "text-delta"
    ) as { delta: string }[];
    expect(deltas.map((chunk) => chunk.delta).join("")).toBe("once");
    expect(chunks[chunks.length - 1]).toEqual({
      type: "finish",
      finishReason: "stop",
    });
  });
});
