import "./xyflow-mock";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import type { UIMessageChunk } from "ai";
import { ReadableStream as NodeReadableStream } from "node:stream/web";
import {
  GraphRunAgentChatTransport,
  requestFromMessages,
  type AgentChatTransportBody,
} from "../../../src/agent/services/GraphRunAgentChatTransport.js";
import { GraphBackendUnavailableError } from "../../../src/diagrams/public-api.js";
import type {
  AgentChatAttachment,
  AgentChatRunDescriptor,
  AgentChatSideChannelHandlers,
  AgentChatTransportHandlers,
  AgentChatUIMessage,
} from "../../../src/agent/types.js";
import { envelope } from "./pure-helpers.js";

/**
 * Default graph-run transport: SDK `ChatTransport` seam, legacy envelope
 * callbacks, replay/resume, abort and backend-unavailable handling.
 */

if (typeof globalThis.ReadableStream === "undefined") {
  // jsdom does not implement Web Streams; the transport creates real streams.
  Object.defineProperty(globalThis, "ReadableStream", {
    configurable: true,
    writable: true,
    value: NodeReadableStream,
  });
}

interface FakeRunClient {
  createRun: jest.Mock;
  cancelRun: jest.Mock;
}

interface FakeEventClient {
  connect: jest.Mock;
  disconnect: jest.Mock;
}

function createClients(options: {
  createRun?: () => Promise<AgentChatRunDescriptor>;
} = {}): { runClient: FakeRunClient; eventClient: FakeEventClient } {
  const runClient: FakeRunClient = {
    createRun: jest.fn(
      options.createRun ??
        (async () => ({
          runId: "run-1",
          eventsUrl: "/graph/runs/run-1/events",
        }))
    ),
    cancelRun: jest.fn(async () => undefined),
  };
  const eventClient: FakeEventClient = {
    connect: jest.fn(),
    disconnect: jest.fn(),
  };
  return { runClient, eventClient };
}

function createTransport(
  clients: ReturnType<typeof createClients>
): GraphRunAgentChatTransport {
  return new GraphRunAgentChatTransport({
    runClient: clients.runClient as never,
    eventClient: clients.eventClient as never,
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

function userMessage(
  text = "Hello",
  metadata: Record<string, unknown> = {}
): AgentChatUIMessage {
  return {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text }],
    metadata,
  } as unknown as AgentChatUIMessage;
}

const ATTACHMENT: AgentChatAttachment = {
  id: "a1",
  name: "photo.png",
  mime: "image/png",
  size: 10,
};

describe("requestFromMessages", () => {
  it("pulls the prompt from the last user message and metadata fallbacks", () => {
    const request = requestFromMessages(
      [
        userMessage("first", { sessionId: "old" }),
        { id: "assistant", role: "assistant", parts: [] } as never,
        userMessage("second", {
          sessionId: "session-meta",
          attachments: [ATTACHMENT],
          knowledgeSourceIds: ["kb-1"],
        }),
      ],
      {}
    );

    expect(request).toEqual({
      workflow: undefined,
      workflowId: undefined,
      message: "second",
      attachments: [ATTACHMENT],
      knowledgeSourceIds: ["kb-1"],
      sessionId: "session-meta",
      userId: null,
    });
  });

  it("prefers request body overrides and falls back to the message id as session", () => {
    const body: AgentChatTransportBody = {
      workflow: { id: "inline" },
      workflowId: "wf-1",
      sessionId: "body-session",
      userId: "user-9",
      attachments: [],
      knowledgeSourceIds: [],
    };

    const request = requestFromMessages([userMessage("hi")], body);
    expect(request.workflow).toEqual({ id: "inline" });
    expect(request.workflowId).toBe("wf-1");
    expect(request.sessionId).toBe("body-session");
    expect(request.userId).toBe("user-9");

    expect(requestFromMessages([userMessage("hi")], {}).sessionId).toBe(
      "user-1"
    );
  });

  it("joins every text part of the last user message", () => {
    const request = requestFromMessages(
      [
        {
          id: "u",
          role: "user",
          parts: [
            { type: "text", text: "Hello " },
            { type: "file", url: "https://x/y.png", mediaType: "image/png" },
            { type: "text", text: "world" },
          ],
        } as never,
      ],
      {}
    );
    expect(request.message).toBe("Hello world");
  });
});

describe("GraphRunAgentChatTransport", () => {
  it("is a replaying SDK transport", () => {
    expect(createTransport(createClients()).resumeStreamIsReplay).toBe(true);
  });

  it("creates a run from the SDK request and streams chunk output", async () => {
    const clients = createClients();
    const transport = createTransport(clients);
    const sideChannel: AgentChatSideChannelHandlers = {
      onTelemetry: jest.fn(),
      onBackendAvailable: jest.fn(),
    };

    const stream = await transport.sendMessages({
      messages: [userMessage("Hello", { attachments: [ATTACHMENT] })],
      body: {
        workflowId: "wf-1",
        sessionId: "session-1",
        userId: "user-1",
        attachments: [ATTACHMENT],
        knowledgeSourceIds: ["kb-1"],
      } as never,
      metadata: { sideChannel },
    } as never);

    await flush();

    expect(clients.runClient.createRun).toHaveBeenCalledWith({
      workflowId: "wf-1",
      inputs: {
        message: "Hello",
        sessionId: "session-1",
        userId: "user-1",
        attachments: [ATTACHMENT],
        knowledgeBaseIds: ["kb-1"],
      },
    });
    expect(sideChannel.onBackendAvailable).toHaveBeenCalledWith(true);

    const subscriber = clients.eventClient.connect.mock.calls[0][1];
    expect(clients.eventClient.connect).toHaveBeenCalledWith(
      { runId: "run-1", eventsUrl: "/graph/runs/run-1/events", afterSequence: 0 },
      subscriber
    );

    subscriber.onEvent(
      envelope(GraphExecutionEventType.WORKFLOW_STARTED, { runId: "run-1" })
    );
    subscriber.onEvent(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        runId: "run-1",
        payload: { response: "Hi there" },
      })
    );
    subscriber.onTerminal(
      envelope(GraphExecutionEventType.WORKFLOW_COMPLETED, { runId: "run-1" })
    );

    const chunks = await readAll(stream);
    const types = chunks.map((chunk) => chunk.type);
    expect(types[0]).toBe("start");
    expect(types[1]).toBe("start-step");
    expect(types).toContain("text-delta");
    expect(types[types.length - 1]).toBe("finish");
    expect(sideChannel.onTelemetry).toHaveBeenCalled();
  });

  it("falls back to the transport-level side channel", async () => {
    const clients = createClients();
    const transport = createTransport(clients);
    const sideChannel: AgentChatSideChannelHandlers = {
      onBackendAvailable: jest.fn(),
    };
    transport.setSideChannelHandlers(sideChannel);

    const stream = await transport.sendMessages({
      messages: [userMessage()],
      body: {},
    } as never);
    await flush();
    clients.eventClient.connect.mock.calls[0][1].onTerminal(
      envelope(GraphExecutionEventType.WORKFLOW_COMPLETED)
    );
    await readAll(stream);

    expect(sideChannel.onBackendAvailable).toHaveBeenCalledWith(true);
  });

  it("returns null from reconnectToStream without a descriptor", async () => {
    const clients = createClients();
    const transport = createTransport(clients);

    await expect(
      transport.reconnectToStream({ body: {} } as never)
    ).resolves.toBeNull();
    expect(clients.runClient.createRun).not.toHaveBeenCalled();
  });

  it("replays a recorded run without creating a new one", async () => {
    const clients = createClients();
    const transport = createTransport(clients);
    const onTelemetry = jest.fn();

    const descriptor: AgentChatRunDescriptor = {
      runId: "recorded-1",
      eventsUrl: "/graph/runs/recorded-1/events",
    };
    const stream = await transport.reconnectToStream({
      body: { descriptor, sessionId: "s1" } as never,
      metadata: { sideChannel: { onTelemetry } },
    } as never);
    await flush();

    expect(stream).not.toBeNull();
    expect(clients.runClient.createRun).not.toHaveBeenCalled();
    const subscriber = clients.eventClient.connect.mock.calls[0][1];
    subscriber.onEvent(
      envelope(GraphExecutionEventType.WORKFLOW_STARTED, {
        runId: "recorded-1",
      })
    );
    expect(onTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "recorded-1", replayed: true })
    );

    subscriber.onTerminal(
      envelope(GraphExecutionEventType.WORKFLOW_COMPLETED, {
        runId: "recorded-1",
      })
    );
    const chunks = await readAll(stream!);
    expect(chunks[chunks.length - 1]).toEqual({
      type: "finish",
      finishReason: "stop",
    });
  });

  it("sends with the legacy contract and forwards envelope callbacks", async () => {
    const clients = createClients();
    const transport = createTransport(clients);
    const handlers: AgentChatTransportHandlers = {
      onEvent: jest.fn(),
      onTerminal: jest.fn(),
      onError: jest.fn(),
    };

    const descriptor = await transport.send(
      {
        message: "Hello",
        attachments: [],
        knowledgeSourceIds: [],
        sessionId: "s",
        userId: "u",
      },
      handlers
    );

    expect(descriptor).toEqual({
      runId: "run-1",
      eventsUrl: "/graph/runs/run-1/events",
    });
    const subscriber = clients.eventClient.connect.mock.calls[0][1];
    const event = envelope(GraphExecutionEventType.NODE_OUTPUT);
    subscriber.onEvent(event);
    expect(handlers.onEvent).toHaveBeenCalledWith(event);

    const terminal = envelope(GraphExecutionEventType.WORKFLOW_COMPLETED);
    subscriber.onTerminal(terminal);
    expect(handlers.onTerminal).toHaveBeenCalledWith(terminal);
    expect(clients.eventClient.disconnect).toHaveBeenCalledWith("run-1");
  });

  it("replays a descriptor with the legacy contract", async () => {
    const clients = createClients();
    const transport = createTransport(clients);
    const handlers: AgentChatTransportHandlers = {
      onEvent: jest.fn(),
      onTerminal: jest.fn(),
      onError: jest.fn(),
    };

    await transport.replay(
      { runId: "r", eventsUrl: "/events" },
      handlers
    );

    expect(clients.runClient.createRun).not.toHaveBeenCalled();
    expect(clients.eventClient.connect).toHaveBeenCalledWith(
      { runId: "r", eventsUrl: "/events", afterSequence: 0 },
      expect.any(Object)
    );
  });

  it("delegates cancellation idempotently to the run client", async () => {
    const clients = createClients();
    const transport = createTransport(clients);

    await transport.cancel("run-1");
    await transport.cancel("run-1");

    expect(clients.runClient.cancelRun).toHaveBeenCalledTimes(2);
    expect(clients.runClient.cancelRun).toHaveBeenCalledWith("run-1");
  });

  it("disconnects every active run on close", async () => {
    const clients = createClients();
    const transport = createTransport(clients);

    const stream = await transport.sendMessages({
      messages: [userMessage()],
      body: {},
    } as never);
    await flush();
    transport.close();

    expect(clients.eventClient.disconnect).toHaveBeenCalledWith("run-1");
    clients.eventClient.connect.mock.calls[0][1].onTerminal(
      envelope(GraphExecutionEventType.WORKFLOW_COMPLETED)
    );
    await readAll(stream);
  });

  it("cancels the run and closes the stream on abort", async () => {
    const clients = createClients();
    const transport = createTransport(clients);
    const controller = new AbortController();

    const stream = await transport.sendMessages({
      messages: [userMessage()],
      body: {},
      abortSignal: controller.signal,
    } as never);
    await flush();

    controller.abort();
    const chunks = await readAll(stream);

    expect(clients.runClient.cancelRun).toHaveBeenCalledWith("run-1");
    expect(clients.eventClient.disconnect).toHaveBeenCalledWith("run-1");
    expect(chunks[chunks.length - 1]).toEqual({
      type: "finish",
      finishReason: "other",
    });
  });

  it("emits a synthetic error stream when run creation fails", async () => {
    const clients = createClients({
      createRun: async () => {
        throw new Error("Backend exploded");
      },
    });
    const transport = createTransport(clients);
    const sideChannel: AgentChatSideChannelHandlers = {
      onError: jest.fn(),
      onBackendAvailable: jest.fn(),
    };

    const stream = await transport.sendMessages({
      messages: [userMessage()],
      body: {},
      metadata: { sideChannel },
    } as never);
    const chunks = await readAll(stream);

    expect(sideChannel.onError).toHaveBeenCalledWith(new Error("Backend exploded"));
    expect(sideChannel.onBackendAvailable).toHaveBeenCalledWith(true);
    expect(chunks).toContainEqual({
      type: "data-error",
      data: { message: "Backend exploded", name: "Error" },
    });
    expect(chunks[chunks.length - 1]).toEqual({
      type: "finish",
      finishReason: "error",
    });
  });

  it("marks the backend unavailable when the graph backend is unreachable", async () => {
    const clients = createClients({
      createRun: async () => {
        throw new GraphBackendUnavailableError();
      },
    });
    const transport = createTransport(clients);
    const sideChannel: AgentChatSideChannelHandlers = {
      onBackendAvailable: jest.fn(),
    };

    const stream = await transport.sendMessages({
      messages: [userMessage()],
      body: {},
      metadata: { sideChannel },
    } as never);
    const chunks = await readAll(stream);

    expect(sideChannel.onBackendAvailable).toHaveBeenCalledWith(false);
    expect(chunks[chunks.length - 1]).toEqual({
      type: "finish",
      finishReason: "error",
    });
  });

  /**
   * Regression guard for pre-descriptor abort: when the abort signal fires
   * before the run descriptor resolves, `finish()` still closes the stream
   * controller even though no chunk producer exists yet, so the SDK's reader
   * unblocks instead of waiting forever.
   */
  test("closes the stream when aborted before the descriptor resolves", async () => {
    const clients = createClients();
    const transport = createTransport(clients);
    const controller = new AbortController();
    controller.abort();

    const stream = await transport.sendMessages({
      messages: [userMessage()],
      body: {},
      abortSignal: controller.signal,
    } as never);
    await flush();

    const outcome = await Promise.race([
      readAll(stream).then(() => "closed"),
      new Promise<string>((resolve) => setTimeout(() => resolve("open"), 100)),
    ]);

    expect(outcome).toBe("closed");
  });
});

describe("GraphRunEventEnvelope ordering", () => {
  it("ignores envelopes whose sequence was already consumed", async () => {
    const clients = createClients();
    const transport = createTransport(clients);
    const stream = await transport.sendMessages({
      messages: [userMessage()],
      body: {},
    } as never);
    await flush();

    const subscriber = clients.eventClient.connect.mock.calls[0][1];
    subscriber.onEvent(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        sequence: 5,
        payload: { response: "once" },
      })
    );
    subscriber.onEvent(
      envelope(GraphExecutionEventType.NODE_OUTPUT, {
        sequence: 5,
        payload: { response: "duplicate" },
      })
    );
    subscriber.onTerminal(
      envelope(GraphExecutionEventType.WORKFLOW_COMPLETED, { sequence: 6 })
    );

    const chunks = await readAll(stream);
    const deltas = chunks.filter(
      (chunk) => chunk.type === "text-delta"
    ) as { delta: string }[];
    expect(deltas.map((chunk) => chunk.delta).join("")).toBe("once");
  });
});
