/**
 * @file
 * @summary Nested-agent snapshot card with depth, ancestry and tool errors.
 * @description Renders the `ChatNestedAgent` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatNestedAgentToolError,
  AgentChatWorkflowStepStatus,
} from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatNestedAgent}.
 * @summary Declares every input the ChatNestedAgent component understands.
 * @memberOf module:for-react.agent
 * @property {string} [name] - Display name.
 * @property {string} [runId] - Run identifier.
 * @property {number} [depth] - Nested agent depth.
 * @property {Array} [ancestry] - Parent agent ids from the root to this agent.
 * @property {string} [text] - Text content.
 * @property {boolean} [streaming] - Whether content is still streaming.
 * @property {AgentChatWorkflowStepStatus} [status] - Component-specific status value.
 * @property {Array} [toolErrors] - Tool errors collected by the nested agent.
 */
export interface ChatNestedAgentProps {
  name?: string;
  runId?: string | null;
  depth?: number;
  ancestry?: string[];
  text?: string;
  streaming?: boolean;
  status?: AgentChatWorkflowStepStatus;
  toolErrors?: AgentChatNestedAgentToolError[];
}

function statusFallbackOf(status: AgentChatWorkflowStepStatus): string {
  switch (status) {
    case "running":
      return "Running";
    case "success":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "suspended":
      return "Suspended";
    default:
      return "Waiting";
  }
}

/**
 * @description Nested-agent snapshot card with depth, ancestry and tool errors.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatNestedAgent({
  name = "",
  runId = null,
  depth = 0,
  ancestry = [],
  text = "",
  streaming = false,
  status = "running",
  toolErrors = [],
}: ChatNestedAgentProps) {
  const t = useAgentTranslate();
  const indent = Math.min(8, Math.max(0, depth)) * 16;
  const ancestryLabel = ancestry.join(" › ");
  const title = t("agent.chat.nestedAgent.title", "Nested agent");

  return (
    <section
      className="dcf-chat-nested-agent"
      data-tool-agent="true"
      data-tool-agent-step="true"
      role="group"
      data-status={status}
      aria-label={`${title}${name ? ` — ${name}` : ""}`}
      style={{ paddingLeft: `${indent}px` }}
    >
      <header className="dcf-chat-nested-agent__header">
        <span className="dcf-chat-nested-agent__icon" aria-hidden="true">
          <ChatIcon name="bot" size={15} />
        </span>
        <div className="dcf-chat-nested-agent__heading">
          <span className="dcf-chat-nested-agent__name">
            {name || title}
          </span>
          {runId ? (
            <span className="dcf-chat-nested-agent__run">{runId}</span>
          ) : null}
        </div>
        {ancestry.length ? (
          <span
            className="dcf-chat-nested-agent__ancestry"
            title={ancestryLabel}
          >
            {ancestryLabel}
          </span>
        ) : null}
        <span className="dcf-chat-nested-agent__chip">
          {t(
            `agent.chat.workflow.status.${status}`,
            statusFallbackOf(status)
          )}
        </span>
      </header>

      {text ? (
        <p
          className={`dcf-chat-nested-agent__text${streaming ? " dcf-chat-nested-agent__text--streaming" : ""}`}
        >
          {text}
          {streaming ? (
            <span className="dcf-chat-nested-agent__caret" aria-hidden="true" />
          ) : null}
        </p>
      ) : null}

      {toolErrors.length ? (
        <div
          className="dcf-chat-nested-agent__errors"
          role="group"
          aria-label={t("agent.chat.nestedAgent.errors", "Tool errors")}
        >
          {toolErrors.map((toolError) => (
            <div
              className="dcf-chat-nested-agent__error"
              role="alert"
              key={toolError.id || toolError.toolName}
            >
              <ChatIcon name="x" size={13} />
              <span className="dcf-chat-nested-agent__error-tool">
                {toolError.toolName}
              </span>
              <span className="dcf-chat-nested-agent__error-message">
                {toolError.message}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatNestedAgent} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatNestedAgentComponent = ChatNestedAgent;
