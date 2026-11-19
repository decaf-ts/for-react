import "./ai-sdk-mock";
import "./xyflow-mock";
import React, { useEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import {
  AgentChatProvider,
  isAgentChatSdkTransport,
  useAgentChatContext,
  useAgentChatDecafStore,
  useAgentTranslate,
} from "../../../src/agent/react/AgentChatProvider.js";
import {
  agentChatMessagesFromUI,
  errorTextOf,
  projectParts,
  projectToolPart,
  useAgentChat,
  type AgentChatController,
} from "../../../src/agent/react/useAgentChat.js";
import { AgentChatLegacyChatTransportAdapter } from "../../../src/agent/services/AgentChatLegacyChatTransportAdapter.js";
import { AgentChatFakeTransport } from "../../../src/agent/services/AgentChatFakeTransport.js";
import { GraphRunAgentChatTransport } from "../../../src/agent/services/GraphRunAgentChatTransport.js";
import { InMemoryAgentChatHistorySource } from "../../../src/agent/services/InMemoryAgentChatHistorySource.js";
import { InMemoryAgentKnowledgeBaseSource } from "../../../src/agent/services/InMemoryAgentKnowledgeBaseSource.js";
import { createAgentChatDecafStore } from "../../../src/agent/react/agentChatStore.js";
import { GraphBackendUnavailableError } from "../../../src/diagrams/public-api.js";
import type {
  AgentChatUIMessage,
} from "../../../src/agent/types.js";
import { createStubSdkTransport, renderInAgentProvider } from "./test-utils.js";
import { getUseChatMock } from "./ai-sdk-mock.js";

/**
 * Remaining public-export coverage: provider context, decaf store selector,
 * translate resolver, `useAgentChat` host actions, and the SDK message/part
 * projection helpers.
 */

function sdkMessage(
  overrides: Partial<AgentChatUIMessage> = {}
): AgentChatUIMessage {
  return {
    id: "m1",
    role: "assistant",
    parts: [],
    metadata: {},
    ...overrides,
  } as unknown as AgentChatUIMessage;
}

describe("msg projections", () => {
  it("projects user, assistant, system and error messages", () => {
    const views = agentChatMessagesFromUI([
      sdkMessage({
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Hello ", state: "done" } as never, {
          type: "text",
          text: "world",
          state: "done",
        } as never],
        metadata: {
          attachments: [
            { id: "a", name: "f.txt", mime: "text/plain", size: 1 },
          ],
          knowledgeSourceIds: ["kb-1"],
          createdAt: "2026-11-19T10:00:00.000Z",
          vote: "up",
          editedAt: "2026-11-19T10:01:00.000Z",
        } as never,
      }),
      sdkMessage({
        id: "a1",
        parts: [
          { type: "text", text: "Answer", state: "streaming" } as never,
        ],
        metadata: {
          runId: "run-1",
          actions: ["retry"],
          createdAt: "2026-11-19T10:00:01.000Z",
        } as never,
      }),
      sdkMessage({ id: "s1", role: "system" }),
      sdkMessage({
        id: "e1",
        parts: [
          { type: "data-error", data: { message: "Boom", name: "E" } } as never,
        ],
      }),
    ]);

    expect(views[0]).toEqual(
      expect.objectContaining({
        id: "u1",
        role: "user",
        content: "Hello world",
        knowledgeSourceIds: ["kb-1"],
        vote: "up",
        editedAt: "2026-11-19T10:01:00.000Z",
      })
    );
    expect(views[0].parts).toBeUndefined();
    expect(views[1]).toEqual(
      expect.objectContaining({
        role: "assistant",
        content: "Answer",
        streaming: true,
        runId: "run-1",
        actions: ["retry"],
      })
    );
    expect(views[1].parts).toEqual([
      { id: "text:0", kind: "text", text: "Answer", streaming: true },
    ]);
    expect(views[2].role).toBe("system");
    expect(views[3]).toEqual(
      expect.objectContaining({ role: "error", content: "Boom" })
    );
  });

  it("projects every SDK part kind", () => {
    const parts = projectParts([
      { type: "text", text: "Body", state: "done" } as never,
      { type: "reasoning", id: "r", text: "Because", state: "streaming" } as never,
      {
        type: "custom",
        kind: "decaf.code",
        providerMetadata: {
          decaf: {
            code: "const a = 1;",
            language: "ts",
            filename: "a.ts",
            title: "A",
          },
        },
      } as never,
      {
        type: "custom",
        kind: "other",
      } as never,
      {
        type: "file",
        url: "https://example.test/photo.png",
        mediaType: "image/png",
      } as never,
      { type: "file", url: "" } as never,
      {
        type: "tool-orders",
        toolCallId: "call-1",
        state: "output-available",
        input: { q: 1 },
        output: { count: 2 },
      } as never,
    ]);

    expect(parts).toEqual([
      { id: "text:0", kind: "text", text: "Body" },
      { id: "r", kind: "reasoning", content: "Because", streaming: true },
      {
        id: "code:2",
        kind: "code",
        code: "const a = 1;",
        language: "ts",
        filename: "a.ts",
        title: "A",
      },
      {
        id: "file:4",
        kind: "attachment",
        attachment: {
          id: "file:4",
          name: "photo.png",
          mime: "image/png",
          size: 0,
          url: "https://example.test/photo.png",
        },
      },
      {
        id: "call-1",
        kind: "tool",
        name: "orders",
        status: "succeeded",
        input: { q: 1 },
        output: { count: 2 },
      },
    ]);
  });

  it.each([
    ["input-streaming", "queued"],
    ["input-available", "running"],
    ["output-available", "succeeded"],
    ["output-error", "failed"],
    ["output-denied", "failed"],
    ["unknown", "running"],
  ])("maps tool state %s to status %s", (state, status) => {
    const part = projectToolPart(
      {
        type: "tool-weather",
        toolCallId: "id-1",
        state,
        errorText: "Failed",
      },
      3
    );
    expect(part).toEqual({
      id: "id-1",
      kind: "tool",
      name: "weather",
      status,
      error: "Failed",
    });
  });

  it("falls back to the part index and type name for tool ids", () => {
    expect(projectToolPart({ type: "tool-orders" }, 2)).toEqual({
      id: "tool:2",
      kind: "tool",
      name: "orders",
      status: "running",
    });
    expect(
      projectToolPart({ type: "tool-custom", toolName: "explicit" }, 0)
    ).toEqual(
      expect.objectContaining({ id: "tool:0", name: "explicit" })
    );
  });
});

describe("isAgentChatSdkTransport and errorTextOf", () => {
  it("detects the SDK seam by sendMessages", () => {
    expect(isAgentChatSdkTransport(createStubSdkTransport())).toBe(true);
    expect(
      isAgentChatSdkTransport(new AgentChatFakeTransport())
    ).toBe(false);
  });

  it("extracts displayable error text", () => {
    expect(errorTextOf(new GraphBackendUnavailableError())).toBe(
      new GraphBackendUnavailableError().message
    );
    expect(errorTextOf(new Error("plain"))).toBe("plain");
    expect(errorTextOf("string error")).toBe("string error");
    expect(errorTextOf({ code: 1 })).toBe("[object Object]");
  });
});

describe("AgentChatProvider context", () => {
  function ContextProbe({
    onContext,
  }: {
    onContext: (context: ReturnType<typeof useAgentChatContext>) => void;
  }) {
    const context = useAgentChatContext();
    const roundtripCount = useAgentChatDecafStore(
      (state) => state.roundtrips.length
    );
    const translated = useAgentTranslate()("missing.key", "Fallback");
    useEffect(() => {
      onContext(context);
    }, [context, onContext]);
    return <p>{`roundtrips:${roundtripCount} ${translated}`}</p>;
  }

  it("throws outside a provider", () => {
    function Outside() {
      useAgentChatContext();
      return null;
    }
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Outside />)).toThrow(
      "AgentChatProvider is required for the @decaf-ts/for-react/agent surface"
    );
    spy.mockRestore();
  });

  it("resolves default seams and exposes the store selector", () => {
    const store = createAgentChatDecafStore();
    let context: ReturnType<typeof useAgentChatContext> | undefined;
    render(
      <AgentChatProvider store={store}>
        <ContextProbe onContext={(next) => (context = next)} />
      </AgentChatProvider>
    );

    expect(context?.transport).toBeInstanceOf(GraphRunAgentChatTransport);
    expect(context?.sourceTransport).toBe(context?.transport);
    expect(context?.historySource).toBeInstanceOf(
      InMemoryAgentChatHistorySource
    );
    expect(context?.knowledgeBaseSource).toBeInstanceOf(
      InMemoryAgentKnowledgeBaseSource
    );
    expect(context?.store).toBe(store);
    expect(screen.getByText("roundtrips:0 Fallback")).toBeInTheDocument();

    act(() => {
      store.setState({ roundtrips: [{ runId: "r", status: "running" }] });
    });
    expect(screen.getByText("roundtrips:1 Fallback")).toBeInTheDocument();
  });

  it("passes an SDK transport through and adapts a legacy transport", () => {
    const sdk = createStubSdkTransport();
    const contexts: ReturnType<typeof useAgentChatContext>[] = [];
    const { rerender } = render(
      <AgentChatProvider transport={sdk}>
        <ContextProbe onContext={(next) => contexts.push(next)} />
      </AgentChatProvider>
    );
    expect(contexts.at(-1)?.transport).toBe(sdk);
    expect(contexts.at(-1)?.sourceTransport).toBe(sdk);

    const legacy = new AgentChatFakeTransport();
    rerender(
      <AgentChatProvider transport={legacy}>
        <ContextProbe onContext={(next) => contexts.push(next)} />
      </AgentChatProvider>
    );
    expect(contexts.at(-1)?.transport).toBeInstanceOf(
      AgentChatLegacyChatTransportAdapter
    );
    expect(contexts.at(-1)?.sourceTransport).toBe(legacy);
  });

  it("uses a host translation resolver", () => {
    const translate = (key: string, fallback: string) =>
      key === "missing.key" ? "Host" : fallback;
    render(
      <AgentChatProvider translate={translate}>
        <ContextProbe onContext={() => undefined} />
      </AgentChatProvider>
    );
    expect(screen.getByText("roundtrips:0 Host")).toBeInTheDocument();
  });
});

describe("useAgentChat host actions", () => {
  let mock: ReturnType<typeof getUseChatMock>;

  beforeEach(() => {
    mock = getUseChatMock();
    mock.restore();
  });

  function Harness({
    options = {},
    onController,
  }: {
    options?: Parameters<typeof useAgentChat>[0];
    onController: (controller: AgentChatController) => void;
  }) {
    const controller = useAgentChat(options);
    useEffect(() => {
      onController(controller);
    });
    return <p>{controller.messages.map((message) => message.content).join("|")}</p>;
  }

  function setup(options: Parameters<typeof useAgentChat>[0] = {}) {
    let controller: AgentChatController | undefined;
    const store = createAgentChatDecafStore();
    const transport = createStubSdkTransport();
    const result = renderInAgentProvider(
      <Harness options={options} onController={(next) => (controller = next)} />,
      { store, transport }
    );
    return {
      ...result,
      store,
      transport,
      controller: () => controller!,
    };
  }

  it("generates a session id and honors an explicit one", () => {
    const generated = setup();
    expect(generated.controller().sessionId).toMatch(/^agent-chat-/);

    const explicit = setup({ sessionId: "session-9" });
    expect(explicit.controller().sessionId).toBe("session-9");
  });

  it("resolves userId from options, the window or null", () => {
    const withOption = setup({ userId: "user-1" });
    expect(withOption.controller().userId()).toBe("user-1");

    const logged = setup();
    (window as unknown as { loggedUser?: string }).loggedUser = "window-user";
    expect(logged.controller().userId()).toBe("window-user");
    delete (window as unknown as { loggedUser?: string }).loggedUser;
    expect(logged.controller().userId()).toBeNull();
  });

  it("sends trimmed messages with the decaf body and the side channel", async () => {
    const { controller, transport } = setup({
      sessionId: "s1",
      userId: "u1",
      workflowId: "wf-1",
    });
    const sendSpy = jest.spyOn(transport, "sendMessages");

    await act(async () => {
      await controller().send("  Hello  ", [
        { id: "a", name: "f.txt", mime: "text/plain", size: 1 },
      ], ["kb-1"]);
    });

    expect(mock.sendMessage).toHaveBeenCalledTimes(1);
    const [message, options] = mock.sendMessage.mock.calls[0];
    expect(message.text).toBe("Hello");
    expect(message.metadata).toEqual(
      expect.objectContaining({
        sessionId: "s1",
        attachments: [{ id: "a", name: "f.txt", mime: "text/plain", size: 1 }],
        knowledgeSourceIds: ["kb-1"],
      })
    );
    expect(options.body).toEqual(
      expect.objectContaining({
        workflowId: "wf-1",
        sessionId: "s1",
        userId: "u1",
        knowledgeSourceIds: ["kb-1"],
      })
    );
    expect(options.metadata.sideChannel).toBeDefined();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("ignores empty messages and sends while running", async () => {
    const { controller } = setup();
    await act(async () => {
      await controller().send("   ");
    });
    expect(mock.sendMessage).not.toHaveBeenCalled();

    mock.state.status = "streaming";
    const running = setup();
    await act(async () => {
      await running.controller().send("Hello");
    });
    expect(mock.sendMessage).not.toHaveBeenCalled();
  });

  it("replays a descriptor through resumeStream", async () => {
    const { controller } = setup({ sessionId: "s1" });
    const descriptor = { runId: "r1", eventsUrl: "/events" };

    await act(async () => {
      await controller().replay(descriptor);
    });

    expect(mock.resumeStream).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ sessionId: "s1", descriptor }),
        metadata: { sideChannel: expect.any(Object) },
      })
    );
  });

  it("stops and resets the conversation", async () => {
    const { controller } = setup();

    await act(async () => {
      await controller().cancel();
    });
    expect(mock.stop).toHaveBeenCalledTimes(1);

    act(() => controller().reset());
    expect(mock.setMessages).toHaveBeenCalledWith([]);
    expect(mock.clearError).toHaveBeenCalled();
  });

  it("removes messages, records votes and edits user messages", async () => {
    mock.state.messages = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Original", state: "done" }],
        metadata: { sessionId: "s1", attachments: [], knowledgeSourceIds: [] },
      },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "Answer", state: "done" }],
        metadata: {},
      },
    ];
    mock.setMessages.mockImplementation((messages) => {
      mock.state.messages = messages as unknown[];
    });
    const { controller } = setup({ sessionId: "s1" });

    act(() => controller().setVote("a1", "down"));
    expect(mock.setMessages.mock.calls.at(-1)![0][1].metadata.vote).toBe("down");
    act(() => controller().setVote("missing", "up"));
    expect(mock.setMessages).toHaveBeenCalledTimes(1);

    act(() => controller().removeMessage("missing"));
    expect(mock.setMessages).toHaveBeenCalledTimes(1);
    act(() => controller().removeMessage("a1"));
    expect(mock.setMessages.mock.calls.at(-1)![0]).toHaveLength(1);

    mock.state.messages = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Original", state: "done" }],
        metadata: { sessionId: "s1", attachments: [], knowledgeSourceIds: [] },
      },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "Answer", state: "done" }],
        metadata: {},
      },
    ];
    await act(async () => controller().editMessage("a1", "No"));
    expect(mock.setMessages).toHaveBeenCalledTimes(2);
    await act(async () => controller().editMessage("u1", "   "));
    await act(async () => controller().editMessage("missing", "No"));
    expect(mock.sendMessage).not.toHaveBeenCalled();

    await act(async () => controller().editMessage("u1", "  Edited  "));
    expect(mock.setMessages.mock.calls.at(-1)![0]).toHaveLength(0);
    expect(mock.sendMessage).toHaveBeenCalledTimes(1);
    expect(mock.sendMessage.mock.calls[0][0].text).toBe("Edited");
  });

  it("surfaces chat and store errors", () => {
    mock.state.error = new Error("chat error");
    const { controller } = setup();
    expect(controller().error).toBe("chat error");

    mock.state.error = null;
    const store = createAgentChatDecafStore({ error: "store error" });
    let stored: AgentChatController | undefined;
    renderInAgentProvider(
      <Harness onController={(next) => (stored = next)} />,
      { store }
    );
    expect(stored!.error).toBe("store error");
  });

  it("projects the SDK transcript for the host", () => {
    mock.state.messages = [
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "Visible", state: "done" }],
        metadata: {},
      },
    ];
    const { controller } = setup();
    expect(controller().messages).toEqual([
      expect.objectContaining({ id: "a1", content: "Visible" }),
    ]);
  });

  it("wires telemetry, structured object, approval and demo side channels into the store", () => {
    const { controller, store } = setup();

    act(() => {
      store.getState().mergeTelemetry({ runId: "r", status: "running" });
      store.getState().setStructuredObject({ runId: "r", value: { a: 1 } });
      store.getState().setApproval({ runId: "r", status: "pending" });
      store.getState().applyDemoEvent({
        kind: "orders",
        orders: [
          { id: "o", name: "Order", date: "2026-11-19", status: "Shipped" },
        ],
      });
    });
    expect(controller().roundtrips).toHaveLength(1);
    expect(controller().structuredObject?.value).toEqual({ a: 1 });
    expect(controller().approval?.status).toBe("pending");
    expect(controller().demo.orders).toHaveLength(1);
  });
});
