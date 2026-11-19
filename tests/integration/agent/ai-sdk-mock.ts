/**
 * `@ai-sdk/react` ships ESM-only, which this CJS ts-jest runtime cannot
 * `require`. The agent surface tests that import `useAgentChat`/`AgentChat`
 * only need the SDK chat object's shape (status/messages/action callbacks);
 * streaming behaviour is exercised against the transport seam and the demo
 * Playwright spec, not the SDK itself.
 *
 * Import this module before any module that reaches `useAgentChat`. Tests that
 * need to observe or drive the hook read the mutable handle published on
 * `globalThis.__agentChatUseChatMock` (the mock factory cannot close over
 * module-scope bindings).
 */
jest.mock("@ai-sdk/react", () => {
  const state = {
    messages: [] as unknown[],
    status: "ready" as "ready" | "submitted" | "streaming" | "error",
    error: null as Error | null,
  };
  const noopAsync = async () => undefined;
  const sendMessage = jest.fn(noopAsync);
  const resumeStream = jest.fn(noopAsync);
  const stop = jest.fn(noopAsync);
  const setMessages = jest.fn();
  const clearError = jest.fn();

  const chat = {
    get messages() {
      return state.messages;
    },
    get status() {
      return state.status;
    },
    get error() {
      return state.error;
    },
    sendMessage,
    resumeStream,
    stop,
    setMessages,
    clearError,
  };

  (globalThis as Record<string, unknown>)["__agentChatUseChatMock"] = {
    state,
    chat,
    sendMessage,
    resumeStream,
    stop,
    setMessages,
    clearError,
    restore() {
      state.messages = [];
      state.status = "ready";
      state.error = null;
      sendMessage.mockClear();
      resumeStream.mockClear();
      stop.mockClear();
      setMessages.mockClear();
      clearError.mockClear();
    },
  };

  return {
    useChat: () => chat,
  };
});

/** Mutable handle published by the `@ai-sdk/react` mock. */
export interface AgentChatUseChatMock {
  state: {
    messages: unknown[];
    status: "ready" | "submitted" | "streaming" | "error";
    error: Error | null;
  };
  chat: Record<string, unknown>;
  sendMessage: jest.Mock;
  resumeStream: jest.Mock;
  stop: jest.Mock;
  setMessages: jest.Mock;
  clearError: jest.Mock;
  restore(): void;
}

/** Returns the mock handle installed by this module. */
export function getUseChatMock(): AgentChatUseChatMock {
  return (globalThis as Record<string, unknown>)[
    "__agentChatUseChatMock"
  ] as AgentChatUseChatMock;
}

export {};
