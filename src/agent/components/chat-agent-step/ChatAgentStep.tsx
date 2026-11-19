/**
 * @file
 * @summary Agent-network step card showing the agent name, status and input/output payloads.
 * @description Renders the `ChatAgentStep` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatAgentStepStatus } from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatAgentStep}.
 * @summary Declares every input the ChatAgentStep component understands.
 * @memberOf module:for-react.agent
 * @property {string} [name] - Display name.
 * @property {string} [agentId] - Identifier of the nested agent.
 * @property {AgentChatAgentStepStatus} [status] - Component-specific status value.
 * @property {unknown} [stepInput] - Input payload of the agent step.
 * @property {unknown} [stepOutput] - Output payload of the agent step.
 * @property {string} [error] - Error text rendered by the component.
 */
export interface ChatAgentStepProps {
  name?: string;
  agentId?: string | null;
  status?: AgentChatAgentStepStatus;
  stepInput?: unknown;
  stepOutput?: unknown;
  error?: string | null;
}

function statusIconOf(status: AgentChatAgentStepStatus): string {
  switch (status) {
    case "success":
      return "check";
    case "failed":
      return "x";
    case "suspended":
      return "info";
    default:
      return "loader";
  }
}

function statusFallbackOf(status: AgentChatAgentStepStatus): string {
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

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * @description Agent-network step card showing the agent name, status and input/output payloads.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatAgentStep({
  name = "",
  agentId = null,
  status = "waiting",
  stepInput = undefined,
  stepOutput = undefined,
  error = null,
}: ChatAgentStepProps) {
  const t = useAgentTranslate();
  const hasInput = stepInput !== undefined;
  const hasOutput = stepOutput !== undefined;
  const busy = status === "running" || status === "waiting";
  const title = t("agent.chat.agentStep.title", "Agent step");

  return (
    <section
      className="dcf-chat-agent-step"
      data-network="true"
      data-status={status}
      aria-label={`${title}${name ? ` — ${name}` : ""}`}
    >
      <header className="dcf-chat-agent-step__header">
        <span
          className={`dcf-chat-agent-step__icon${busy ? " dcf-chat-agent-step__icon--busy" : ""}`}
          aria-hidden="true"
        >
          <ChatIcon name={statusIconOf(status)} size={15} />
        </span>
        <div className="dcf-chat-agent-step__heading">
          <span className="dcf-chat-agent-step__name">{name}</span>
          {agentId ? (
            <span className="dcf-chat-agent-step__id">{agentId}</span>
          ) : null}
        </div>
        <span className="dcf-chat-agent-step__chip">
          {t(
            `agent.chat.workflow.status.${status}`,
            statusFallbackOf(status)
          )}
        </span>
      </header>

      {error ? (
        <p className="dcf-chat-agent-step__error" role="alert">
          {error}
        </p>
      ) : null}

      {hasInput || hasOutput ? (
        <div className="dcf-chat-agent-step__panes">
          {hasInput ? (
            <details className="dcf-chat-agent-step__pane">
              <summary>{t("agent.chat.agentStep.input", "Input")}</summary>
              <pre className="dcf-chat-agent-step__json">
                {stringify(stepInput)}
              </pre>
            </details>
          ) : null}
          {hasOutput ? (
            <details className="dcf-chat-agent-step__pane">
              <summary>{t("agent.chat.agentStep.output", "Output")}</summary>
              <pre className="dcf-chat-agent-step__json">
                {stringify(stepOutput)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatAgentStep} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatAgentStepComponent = ChatAgentStep;
