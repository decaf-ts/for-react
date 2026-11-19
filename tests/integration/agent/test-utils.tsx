import React, { type ReactElement } from "react";
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import {
  AgentChatProvider,
  type AgentChatProviderProps,
} from "../../../src/agent/react/AgentChatProvider.js";
import {
  createAgentChatDecafStore,
  type AgentChatDecafStore,
} from "../../../src/agent/react/agentChatStore.js";
import { InMemoryAgentChatHistorySource } from "../../../src/agent/services/InMemoryAgentChatHistorySource.js";
import { InMemoryAgentKnowledgeBaseSource } from "../../../src/agent/services/InMemoryAgentKnowledgeBaseSource.js";
import type {
  AgentChatSdkTransport,
  AgentChatSideChannelHandlers,
} from "../../../src/agent/types.js";

function emptyChunkStream(): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.close();
    },
  });
}

/** Minimal SDK-seam transport: opens an empty stream and supports replay/cancel. */
export function createStubSdkTransport(): AgentChatSdkTransport {
  let sideChannel: AgentChatSideChannelHandlers | undefined;
  return {
    sendMessages: async () => emptyChunkStream() as never,
    reconnectToStream: async () => null,
    async cancel() {
      /* no-op */
    },
    setSideChannelHandlers(handlers) {
      sideChannel = handlers;
    },
    ...({
      get sideChannel() {
        return sideChannel;
      },
    } as object),
  } as AgentChatSdkTransport;
}

/** Provider props accepted by {@link renderInAgentProvider}. */
export interface AgentProviderOptions {
  store?: AgentChatDecafStore;
  historySource?: InMemoryAgentChatHistorySource;
  knowledgeBaseSource?: InMemoryAgentKnowledgeBaseSource;
  transport?: AgentChatSdkTransport;
  translate?: AgentChatProviderProps["translate"];
}

/** Render result plus the resolved provider seams, for store assertions. */
export interface AgentRenderResult extends RenderResult {
  store: AgentChatDecafStore;
  historySource: InMemoryAgentChatHistorySource;
  knowledgeBaseSource: InMemoryAgentKnowledgeBaseSource;
}

/**
 * Renders `ui` inside a fresh AgentChatProvider with in-memory sources and an
 * SDK-seam stub transport (no network). Returns the seams for store assertions.
 */
export function renderInAgentProvider(
  ui: ReactElement,
  options: AgentProviderOptions & Omit<RenderOptions, "wrapper"> = {}
): AgentRenderResult {
  const {
    store = createAgentChatDecafStore(),
    historySource = new InMemoryAgentChatHistorySource(),
    knowledgeBaseSource = new InMemoryAgentKnowledgeBaseSource(),
    transport = createStubSdkTransport(),
    translate,
    ...renderOptions
  } = options;

  const wrap = (child: ReactElement) => (
    <AgentChatProvider
      store={store}
      historySource={historySource}
      knowledgeBaseSource={knowledgeBaseSource}
      transport={transport}
      {...(translate ? { translate } : {})}
    >
      {child}
    </AgentChatProvider>
  );

  const result = render(wrap(ui), renderOptions);

  return {
    ...result,
    rerender: (next: ReactElement) => result.rerender(wrap(next)),
    store,
    historySource,
    knowledgeBaseSource,
  };
}

/** A `File` usable in jsdom without reading from disk. */
export function makeFile(
  name: string,
  size = 12,
  type = "text/plain"
): File {
  const content = "x".repeat(Math.max(0, Math.min(size, 64)));
  return new File([content], name, { type });
}
