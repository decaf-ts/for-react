/**
 * @file
 * @summary Chat header with title, namespace chips and side-panel toggles.
 * @description Renders the `ChatHeader` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";

/**
 * @description Props accepted by {@link ChatHeader}.
 * @summary Declares every input the ChatHeader component understands.
 * @memberOf module:for-react.agent
 * @property {string} [titleKey] - Translation key for the title.
 * @property {string} [titleFallback] - English fallback for the title.
 * @property {Array} [namespaces] - Required namespaces shown in the header.
 * @property {boolean} [showHistory] - Whether history affordances are shown.
 * @property {boolean} [showKnowledgeBase] - Whether knowledge-base affordances are shown.
 * @property {boolean} [historyOpen] - Whether the history panel is open.
 * @property {boolean} [knowledgeOpen] - Whether the knowledge-base panel is open.
 * @property {boolean} [telemetryOpen] - Whether the telemetry panel is open.
 * @property {number} [selectedKnowledgeCount] - Number of selected knowledge sources.
 * @property {function} [onHistoryToggle] - Called when the history panel is toggled.
 * @property {function} [onKnowledgeBaseOpen] - Called when the knowledge-base panel is opened.
 * @property {function} [onTelemetryToggle] - Called when the telemetry panel is toggled.
 */
export interface ChatHeaderProps {
  titleKey?: string;
  titleFallback?: string;
  namespaces?: string[];
  showHistory?: boolean;
  showKnowledgeBase?: boolean;
  historyOpen?: boolean;
  knowledgeOpen?: boolean;
  telemetryOpen?: boolean;
  selectedKnowledgeCount?: number;
  onHistoryToggle?: () => void;
  onKnowledgeBaseOpen?: () => void;
  onTelemetryToggle?: () => void;
}

/**
 * @description Chat header with title, namespace chips and side-panel toggles.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatHeader({
  titleKey = "agent.chat.title",
  titleFallback = "Agent chat",
  namespaces = [],
  showHistory = true,
  showKnowledgeBase = true,
  historyOpen = false,
  knowledgeOpen = false,
  telemetryOpen = false,
  selectedKnowledgeCount = 0,
  onHistoryToggle,
  onKnowledgeBaseOpen,
  onTelemetryToggle,
}: ChatHeaderProps) {
  const t = useAgentTranslate();
  return (
    <header className="dcf-chat-header">
      <div className="dcf-chat-header__heading">
        <h2 className="dcf-chat-header__title">{t(titleKey, titleFallback)}</h2>
        {namespaces.length ? (
          <div
            className="dcf-chat-header__namespaces"
            role="note"
            aria-label={t("agent.chat.namespaces.label", "Required namespaces")}
          >
            <span className="dcf-chat-header__namespaces-label">
              {t("agent.chat.namespaces.label", "Namespaces")}
            </span>
            {namespaces.map((namespace) => (
              <span className="dcf-chat-header__namespace-chip" key={namespace}>
                {namespace}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="dcf-chat-header__actions">
        {showHistory ? (
          <button
            type="button"
            className="dcf-chat-header__action"
            onClick={() => onHistoryToggle?.()}
            aria-expanded={historyOpen}
            aria-pressed={historyOpen}
          >
            {t("agent.chat.history.title", "Chat history")}
          </button>
        ) : null}
        {showKnowledgeBase ? (
          <button
            type="button"
            className="dcf-chat-header__action"
            onClick={() => onKnowledgeBaseOpen?.()}
            aria-expanded={knowledgeOpen}
          >
            {t("agent.chat.knowledge.label", "Knowledge base")}
            {selectedKnowledgeCount ? (
              <span className="dcf-chat-header__badge">
                {selectedKnowledgeCount}
              </span>
            ) : null}
          </button>
        ) : null}
        <button
          type="button"
          className="dcf-chat-header__action"
          onClick={() => onTelemetryToggle?.()}
          aria-expanded={telemetryOpen}
          aria-pressed={telemetryOpen}
        >
          {t(
            telemetryOpen ? "agent.chat.telemetry.hide" : "agent.chat.telemetry.show",
            "Telemetry"
          )}
        </button>
      </div>
    </header>
  );
}

/**
 * @description Named alias of {@link ChatHeader} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatHeaderComponent = ChatHeader;
