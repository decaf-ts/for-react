/**
 * @file
 * @summary Run approval prompt with approve/reject actions and suspended-payload preview.
 * @description Renders the `ChatApproval` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatApprovalDenial,
  AgentChatApprovalResume,
  AgentChatApprovalStatus,
} from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatApproval}.
 * @summary Declares every input the ChatApproval component understands.
 * @memberOf module:for-react.agent
 * @property {string} [runId] - Run identifier.
 * @property {string} [toolName] - Tool name associated with the call.
 * @property {unknown} [payload] - Suspended payload preview.
 * @property {unknown} [resumeData] - Optional data forwarded with an approval resume.
 * @property {string} [rejectReason] - Reason supplied with a rejection.
 * @property {AgentChatApprovalStatus} [status] - Component-specific status value.
 * @property {boolean} [disabled] - Whether the control is disabled.
 * @property {function} [onApprove] - Called when the run is approved.
 * @property {function} [onReject] - Called when the run is rejected.
 */
export interface ChatApprovalProps {
  runId?: string;
  toolName?: string | null;
  payload?: unknown;
  resumeData?: unknown;
  rejectReason?: string | null;
  status?: AgentChatApprovalStatus;
  disabled?: boolean;
  onApprove?: (resume: AgentChatApprovalResume) => void;
  onReject?: (denial: AgentChatApprovalDenial) => void;
}

function statusFallbackOf(status: AgentChatApprovalStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Awaiting approval";
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
 * @description Run approval prompt with approve/reject actions and suspended-payload preview.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatApproval({
  runId = "",
  toolName = null,
  payload = undefined,
  resumeData = undefined,
  rejectReason = null,
  status = "pending",
  disabled = false,
  onApprove,
  onReject,
}: ChatApprovalProps) {
  const t = useAgentTranslate();
  const decided = status !== "pending";
  const canDecide = !decided && !disabled;
  const hasPayload = payload !== undefined;
  const resolvedResumeData = resumeData === undefined ? payload : resumeData;

  const approve = () => {
    if (!canDecide) return;
    onApprove?.({
      type: "resume",
      runId,
      resumeData: resolvedResumeData,
    });
  };

  const reject = () => {
    if (!canDecide) return;
    onReject?.({
      type: "deny",
      runId,
      ...(rejectReason ? { reason: rejectReason } : {}),
    });
  };

  return (
    <section
      className="dcf-chat-approval"
      data-tool-call-suspended="true"
      data-status={status}
      aria-label={t("agent.chat.approval.title", "Approval required")}
    >
      <header className="dcf-chat-approval__header">
        <span className="dcf-chat-approval__icon" aria-hidden="true">
          <ChatIcon name="info" size={16} />
        </span>
        <div className="dcf-chat-approval__heading">
          <h3 className="dcf-chat-approval__title">
            {t("agent.chat.approval.title", "Approval required")}
          </h3>
          {toolName ? (
            <span className="dcf-chat-approval__tool">{toolName}</span>
          ) : null}
        </div>
        <span className="dcf-chat-approval__chip">
          {t(
            `agent.chat.approval.status.${status}`,
            statusFallbackOf(status)
          )}
        </span>
      </header>

      <p className="dcf-chat-approval__run">
        <span className="dcf-chat-approval__run-label">
          {t("agent.chat.approval.run", "Run")}
        </span>
        <span className="dcf-chat-approval__run-id">{runId}</span>
      </p>

      <div className="dcf-chat-approval__payload">
        <h4 className="dcf-chat-approval__payload-title">
          {t("agent.chat.approval.payload", "Suspended payload")}
        </h4>
        {hasPayload ? (
          <pre
            className="dcf-chat-approval__json"
            tabIndex={0}
            aria-label={t(
              "agent.chat.approval.payload",
              "Suspended payload"
            )}
          >
            {stringify(payload)}
          </pre>
        ) : (
          <p className="dcf-chat-approval__empty-payload">
            {t(
              "agent.chat.approval.emptyPayload",
              "No payload was provided."
            )}
          </p>
        )}
      </div>

      <div
        className="dcf-chat-approval__actions"
        role="group"
        aria-label={t("agent.chat.approval.actions", "Approval actions")}
      >
        <button
          type="button"
          className="dcf-chat-approval__button dcf-chat-approval__button--approve"
          disabled={!canDecide}
          onClick={approve}
        >
          <ChatIcon name="check" size={14} />
          {t("agent.chat.approval.approve", "Approve")}
        </button>
        <button
          type="button"
          className="dcf-chat-approval__button dcf-chat-approval__button--reject"
          disabled={!canDecide}
          onClick={reject}
        >
          <ChatIcon name="x" size={14} />
          {t("agent.chat.approval.reject", "Reject")}
        </button>
      </div>
    </section>
  );
}

/**
 * @description Named alias of {@link ChatApproval} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatApprovalComponent = ChatApproval;
