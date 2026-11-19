/**
 * @file
 * @summary React context provider wiring one agent chat instance: transport
 * (SDK seam or legacy bridge), history/knowledge sources, translation resolver
 * and the decaf side-channel Zustand store.
 * @description This is the React analog of the Angular `AGENT_CHAT_TRANSPORT`,
 * `AGENT_CHAT_HISTORY_SOURCE` and `AGENT_CHAT_KNOWLEDGE_BASE_SOURCE` injection
 * tokens. The provider resolves a legacy {@link AgentChatTransport} onto the
 * @ai-sdk `ChatTransport` seam once, and exposes the store to the component
 * families through context.
 */
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import {
  agentChatTranslate,
  type AgentChatTranslate,
} from "../i18n/agentTranslate.js";
import { AgentChatLegacyChatTransportAdapter } from "../services/AgentChatLegacyChatTransportAdapter.js";
import { GraphRunAgentChatTransport } from "../services/GraphRunAgentChatTransport.js";
import { InMemoryAgentChatHistorySource } from "../services/InMemoryAgentChatHistorySource.js";
import { InMemoryAgentKnowledgeBaseSource } from "../services/InMemoryAgentKnowledgeBaseSource.js";
import type {
  AgentChatHistorySource,
  AgentChatKnowledgeBaseSource,
  AgentChatSdkTransport,
  AgentChatTransport,
} from "../types.js";
import {
  createAgentChatDecafStore,
  type AgentChatDecafState,
  type AgentChatDecafStore,
} from "./agentChatStore.js";

/** Props accepted by {@link AgentChatProvider}.
 * @memberOf module:for-react.agent
 */
export interface AgentChatProviderProps {
  /** Chat subtree. */
  children: ReactNode;
  /**
   * Transport override: an SDK-seam transport is used as-is, a legacy
   * envelope-callback transport is bridged automatically. Defaults to the
   * graph-run backend transport.
   */
  transport?: AgentChatTransport | AgentChatSdkTransport;
  /** Conversation history source; defaults to an empty in-memory source. */
  historySource?: AgentChatHistorySource;
  /** Knowledge-base source; defaults to an empty in-memory source. */
  knowledgeBaseSource?: AgentChatKnowledgeBaseSource;
  /** Translation resolver (e.g. an i18next `t` proxy); defaults to the for-react i18n cache. */
  translate?: AgentChatTranslate;
  /** Pre-built store (tests/multiple isolated chats); defaults to a fresh store. */
  store?: AgentChatDecafStore;
}

/** Resolved context value shared by the agent chat hooks/components.
 * @memberOf module:for-react.agent
 */
export interface AgentChatContextValue {
  /** SDK-seam transport used by `useChat`. */
  transport: AgentChatSdkTransport;
  /** Transport as supplied by the host (SDK seam or legacy contract). */
  sourceTransport: AgentChatTransport | AgentChatSdkTransport;
  /** Conversation history source. */
  historySource: AgentChatHistorySource;
  /** Knowledge-base source. */
  knowledgeBaseSource: AgentChatKnowledgeBaseSource;
  /** Translation resolver, when the host supplied one. */
  translate?: AgentChatTranslate;
  /** Decaf side-channel store. */
  store: AgentChatDecafStore;
}

const AgentChatContext = createContext<AgentChatContextValue | null>(null);

/**
 * Detects a transport that already implements the @ai-sdk `ChatTransport` seam.
 *
 * @param transport - Legacy bridge or native SDK transport to inspect.
 * @returns `true` when the value exposes a `sendMessages` function, narrowing
 * it to {@link AgentChatSdkTransport}.
 * @memberOf module:for-react.agent
 */
export function isAgentChatSdkTransport(
  transport: AgentChatTransport | AgentChatSdkTransport
): transport is AgentChatSdkTransport {
  return typeof (transport as AgentChatSdkTransport).sendMessages === "function";
}

/**
 * Provides one agent chat instance to its subtree.
 *
 * @param props - Transport/source overrides, translation resolver and store.
 * @returns The context provider element.
 * @memberOf module:for-react.agent
 */
export function AgentChatProvider({
  children,
  transport,
  historySource,
  knowledgeBaseSource,
  translate,
  store,
}: AgentChatProviderProps) {
  const [defaultTransport] = useState<AgentChatTransport>(
    () => new GraphRunAgentChatTransport()
  );
  const sourceTransport = transport ?? defaultTransport;
  const [defaultHistory] = useState<AgentChatHistorySource>(
    () => new InMemoryAgentChatHistorySource()
  );
  const [defaultKnowledge] = useState<AgentChatKnowledgeBaseSource>(
    () => new InMemoryAgentKnowledgeBaseSource()
  );
  const [defaultStore] = useState<AgentChatDecafStore>(() =>
    createAgentChatDecafStore()
  );

  const resolvedTransport = useMemo<AgentChatSdkTransport>(
    () =>
      isAgentChatSdkTransport(sourceTransport)
        ? sourceTransport
        : new AgentChatLegacyChatTransportAdapter(sourceTransport),
    [sourceTransport]
  );

  const value = useMemo<AgentChatContextValue>(
    () => ({
      transport: resolvedTransport,
      sourceTransport,
      historySource: historySource ?? defaultHistory,
      knowledgeBaseSource: knowledgeBaseSource ?? defaultKnowledge,
      ...(translate ? { translate } : {}),
      store: store ?? defaultStore,
    }),
    [
      resolvedTransport,
      sourceTransport,
      historySource,
      defaultHistory,
      knowledgeBaseSource,
      defaultKnowledge,
      translate,
      store,
      defaultStore,
    ]
  );

  return React.createElement(AgentChatContext.Provider, { value }, children);
}

/**
 * Reads the agent chat context; throws when rendered outside a provider.
 *
 * @returns The resolved context value.
 * @memberOf module:for-react.agent
 */
export function useAgentChatContext(): AgentChatContextValue {
  const context = useContext(AgentChatContext);
  if (!context) {
    throw new Error(
      "AgentChatProvider is required for the @decaf-ts/for-react/agent surface"
    );
  }
  return context;
}

/**
 * Selects a slice of the decaf side-channel store with a stable subscription.
 *
 * @param selector - Store selector; defaults to the whole state.
 * @returns The selected state slice.
 * @memberOf module:for-react.agent
 */
export function useAgentChatDecafStore<T = AgentChatDecafState>(
  selector: (state: AgentChatDecafState) => T = (state) =>
    state as unknown as T
): T {
  const { store } = useAgentChatContext();
  return useStore(store, selector);
}

/**
 * Returns the translation resolver for the current chat (host resolver or the
 * shared for-react i18n default).
 *
 * @returns `(key, fallback) => string` resolver with English fallback semantics.
 * @memberOf module:for-react.agent
 */
export function useAgentTranslate(): (key: string, fallback: string) => string {
  const { translate } = useAgentChatContext();
  return (key: string, fallback: string) =>
    agentChatTranslate(translate, key, fallback);
}
