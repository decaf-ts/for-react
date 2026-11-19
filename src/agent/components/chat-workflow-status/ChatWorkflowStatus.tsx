/**
 * @file
 * @summary Workflow status strip rendering step rows.
 * @description Renders the `ChatWorkflowStatus` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatWorkflowStep,
  AgentChatWorkflowStepStatus,
} from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatWorkflowStatus}.
 * @summary Declares every input the ChatWorkflowStatus component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [steps] - Workflow steps rendered by the component.
 * @property {string} [title] - Title text.
 */
export interface ChatWorkflowStatusProps {
  steps?: AgentChatWorkflowStep[];
  title?: string | null;
}

function statusIconOf(status: AgentChatWorkflowStepStatus): string {
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

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * @description Workflow status strip rendering step rows.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatWorkflowStatus({
  steps = [],
  title = null,
}: ChatWorkflowStatusProps) {
  const t = useAgentTranslate();
  const heading = title || t("agent.chat.workflow.title", "Workflow status");

  return (
    <section
      className="dcf-chat-workflow-status"
      data-workflow="true"
      aria-label={heading}
    >
      <header className="dcf-chat-workflow-status__header">
        <ChatIcon name="sparkles" size={16} />
        <h3 className="dcf-chat-workflow-status__title">{heading}</h3>
        <span className="dcf-chat-workflow-status__count">{steps.length}</span>
      </header>

      {steps.length ? (
        <ol className="dcf-chat-workflow-status__list">
          {steps.map((step) => (
            <li
              className="dcf-chat-workflow-status__step"
              data-workflow-step="true"
              data-status={step.status}
              key={step.id}
            >
              <div className="dcf-chat-workflow-status__row">
                <span
                  className="dcf-chat-workflow-status__icon"
                  aria-hidden="true"
                >
                  <ChatIcon name={statusIconOf(step.status)} size={14} />
                </span>
                <span className="dcf-chat-workflow-status__name">
                  {step.name}
                </span>
                <span className="dcf-chat-workflow-status__chip">
                  {t(
                    `agent.chat.workflow.status.${step.status}`,
                    statusFallbackOf(step.status)
                  )}
                </span>
              </div>
              {step.error ? (
                <p className="dcf-chat-workflow-status__error" role="alert">
                  {step.error}
                </p>
              ) : null}
              {step.output !== undefined ? (
                <details className="dcf-chat-workflow-status__output">
                  <summary>
                    {t("agent.chat.workflow.output", "Output")}
                  </summary>
                  <pre className="dcf-chat-workflow-status__json">
                    {stringify(step.output)}
                  </pre>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="dcf-chat-workflow-status__empty">
          {t("agent.chat.workflow.empty", "No workflow steps yet.")}
        </p>
      )}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatWorkflowStatus} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatWorkflowStatusComponent = ChatWorkflowStatus;
