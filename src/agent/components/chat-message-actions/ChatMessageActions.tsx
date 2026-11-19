/**
 * @file
 * @summary Message action bar: copy, vote, edit and delete.
 * @description Renders the `ChatMessageActions` agent chat component and its props contract.
 */
import React, { useEffect, useRef, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatMessageVoteChange,
  AgentChatRole,
  AgentChatVote,
} from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatMessageActions}.
 * @summary Declares every input the ChatMessageActions component understands.
 * @memberOf module:for-react.agent
 * @property {string} [messageId] - Identifier of the message.
 * @property {AgentChatRole} [role] - Role the message plays.
 * @property {string} [copyText] - Text copied by the copy action.
 * @property {boolean} [running] - Whether a send or replay is in flight.
 * @property {AgentChatVote | string} [vote] - Current vote.
 * @property {boolean | string} [canCopy] - Override for copy availability.
 * @property {boolean | string} [canVote] - Override for vote availability.
 * @property {boolean | string} [canEdit] - Override for edit availability.
 * @property {boolean | string} [canDelete] - Override for delete availability.
 * @property {boolean} [persistent] - Whether the action bar stays visible.
 * @property {function} [onCopy] - Called with the text to copy.
 * @property {function} [onVoteChange] - Called with the vote change.
 * @property {function} [onEdit] - Called when a message enters edit mode.
 * @property {function} [onDeleteMessage] - Called when a message is deleted.
 */
export interface ChatMessageActionsProps {
  messageId?: string;
  role?: AgentChatRole;
  copyText?: string;
  running?: boolean;
  vote?: AgentChatVote | null;
  canCopy?: boolean | null;
  canVote?: boolean | null;
  canEdit?: boolean | null;
  canDelete?: boolean | null;
  persistent?: boolean;
  onCopy?: (text: string) => void;
  onVoteChange?: (change: AgentChatMessageVoteChange) => void;
  onEdit?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

/**
 * @description Message action bar: copy, vote, edit and delete.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatMessageActions({
  messageId = "",
  role = "assistant",
  copyText = "",
  running = false,
  vote = null,
  canCopy = null,
  canVote = null,
  canEdit = null,
  canDelete = null,
  persistent = false,
  onCopy,
  onVoteChange,
  onEdit,
  onDeleteMessage,
}: ChatMessageActionsProps) {
  const t = useAgentTranslate();
  const [copied, setCopied] = useState(false);
  const [activeVote, setActiveVote] = useState<AgentChatVote | null>(vote);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActiveVote(vote);
  }, [vote]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const canCopyNow = canCopy ?? (role === "user" || role === "assistant");
  const canVoteNow = canVote ?? role === "assistant";
  const canEditNow = canEdit ?? role === "user";
  const canDeleteNow = canDelete ?? true;

  const copyMessage = async () => {
    if (running) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(copyText);
      } catch {
        setCopied(false);
      }
    }
    setCopied(true);
    onCopy?.(copyText);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  const toggleVote = (direction: AgentChatVote) => {
    if (running) return;
    const next = activeVote === direction ? null : direction;
    setActiveVote(next);
    onVoteChange?.({ messageId, vote: next });
  };

  return (
    <div
      className={`dcf-chat-message-actions${persistent ? " dcf-chat-message-actions--persistent" : ""}`}
      role="toolbar"
      aria-label={t("agent.chat.messageActions.label", "Message actions")}
    >
      {canCopyNow ? (
        <button
          type="button"
          className={`dcf-chat-message-actions__action${copied ? " dcf-chat-message-actions__action--active" : ""}`}
          data-action="copy"
          disabled={running}
          aria-label={t("agent.chat.messageActions.copy", "Copy message")}
          title={t("agent.chat.messageActions.copy", "Copy message")}
          onClick={copyMessage}
        >
          <ChatIcon name={copied ? "check" : "copy"} size={15} />
        </button>
      ) : null}

      {canVoteNow ? (
        <>
          <button
            type="button"
            className={`dcf-chat-message-actions__action${activeVote === "up" ? " dcf-chat-message-actions__action--active" : ""}`}
            data-action="vote-up"
            aria-pressed={activeVote === "up"}
            disabled={running}
            aria-label={t("agent.chat.messageActions.voteUp", "Good response")}
            title={t("agent.chat.messageActions.voteUp", "Good response")}
            onClick={() => toggleVote("up")}
          >
            <ChatIcon name="vote-up" size={15} />
          </button>
          <button
            type="button"
            className={`dcf-chat-message-actions__action${activeVote === "down" ? " dcf-chat-message-actions__action--active" : ""}`}
            data-action="vote-down"
            aria-pressed={activeVote === "down"}
            disabled={running}
            aria-label={t("agent.chat.messageActions.voteDown", "Bad response")}
            title={t("agent.chat.messageActions.voteDown", "Bad response")}
            onClick={() => toggleVote("down")}
          >
            <ChatIcon name="vote-down" size={15} />
          </button>
        </>
      ) : null}

      {canEditNow ? (
        <button
          type="button"
          className="dcf-chat-message-actions__action"
          data-action="edit"
          disabled={running}
          aria-label={t("agent.chat.messageActions.edit", "Edit message")}
          title={t("agent.chat.messageActions.edit", "Edit message")}
          onClick={() => {
            if (running) return;
            onEdit?.(messageId);
          }}
        >
          <ChatIcon name="pencil" size={15} />
        </button>
      ) : null}

      {canDeleteNow ? (
        <button
          type="button"
          className="dcf-chat-message-actions__action dcf-chat-message-actions__action--danger"
          data-action="delete"
          disabled={running}
          aria-label={t("agent.chat.messageActions.delete", "Delete message")}
          title={t("agent.chat.messageActions.delete", "Delete message")}
          onClick={() => {
            if (running) return;
            onDeleteMessage?.(messageId);
          }}
        >
          <ChatIcon name="trash" size={15} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * @description Named alias of {@link ChatMessageActions} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatMessageActionsComponent = ChatMessageActions;
