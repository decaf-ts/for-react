/**
 * @file
 * @summary One history entry row with open, delete and delete-confirmation states.
 * @description Renders the `ChatHistoryItem` agent chat component and its props contract.
 */
import React, { useEffect, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatHistoryEntry,
  AgentChatHistoryVisibility,
} from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatHistoryItem}.
 * @summary Declares every input the ChatHistoryItem component understands.
 * @memberOf module:for-react.agent
 * @property {AgentChatHistoryEntry} entry - History entry rendered by the item.
 * @property {boolean} [active] - Whether the item is the active selection.
 * @property {boolean} [confirmDelete] - Whether delete is awaiting confirmation.
 * @property {boolean} [deleting] - Whether a delete is in flight.
 * @property {function} [onOpen] - Called when an entry is opened.
 * @property {function} [onDelete] - Called when an entry is deleted.
 * @property {function} [onConfirmChange] - Called when the delete confirmation state changes.
 */
export interface ChatHistoryItemProps {
  entry: AgentChatHistoryEntry;
  active?: boolean;
  confirmDelete?: boolean;
  deleting?: boolean;
  onOpen?: (entry: AgentChatHistoryEntry) => void;
  onDelete?: (entry: AgentChatHistoryEntry) => void;
  onConfirmChange?: (confirming: boolean) => void;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * @description One history entry row with open, delete and delete-confirmation states.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatHistoryItem({
  entry,
  active = false,
  confirmDelete = true,
  deleting = false,
  onOpen,
  onDelete,
  onConfirmChange,
}: ChatHistoryItemProps) {
  const t = useAgentTranslate();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setConfirming(false);
  }, [entry.id]);

  const title = entry.title?.trim() || entry.preview?.trim() || "";
  const previewText = entry.preview?.trim() ?? "";
  const preview = previewText && previewText !== title ? previewText : "";
  const visibility: AgentChatHistoryVisibility = entry.visibility ?? "private";
  const visibilityFallback =
    visibility.charAt(0).toUpperCase() + visibility.slice(1);
  const sharedWith = entry.sharedWith ?? [];

  const setConfirmingValue = (value: boolean) => {
    if (confirming === value) return;
    setConfirming(value);
    onConfirmChange?.(value);
  };

  const handleOpen = () => {
    if (confirming) {
      setConfirmingValue(false);
      return;
    }
    onOpen?.(entry);
  };

  const handleDelete = () => {
    if (deleting) return;
    if (!confirmDelete) {
      onDelete?.(entry);
      return;
    }
    if (confirming) {
      setConfirmingValue(false);
      onDelete?.(entry);
      return;
    }
    setConfirmingValue(true);
  };

  const confirm = () => {
    if (deleting) return;
    setConfirmingValue(false);
    onDelete?.(entry);
  };

  const cancel = () => setConfirmingValue(false);

  return (
    <article
      className={`dcf-chat-history-item${active ? " dcf-chat-history-item--active" : ""}${confirming ? " dcf-chat-history-item--confirming" : ""}`}
      data-chat-id={entry.id}
    >
      <div className="dcf-chat-history-item__row">
        <button
          type="button"
          className="dcf-chat-history-item__main"
          aria-current={active ? "true" : undefined}
          onClick={handleOpen}
        >
          <span className="dcf-chat-history-item__icon" aria-hidden="true">
            <ChatIcon name="bot" size={16} />
          </span>

          <span className="dcf-chat-history-item__body">
            <span className="dcf-chat-history-item__title">
              {title || t("agent.chat.history.untitled", "Untitled chat")}
            </span>

            {preview ? (
              <span className="dcf-chat-history-item__preview">{preview}</span>
            ) : null}

            <span className="dcf-chat-history-item__meta">
              {entry.updatedAt ? (
                <time
                  className="dcf-chat-history-item__time"
                  dateTime={entry.updatedAt}
                >
                  {formatUpdatedAt(entry.updatedAt)}
                </time>
              ) : null}

              {entry.messageCount ? (
                <span className="dcf-chat-history-item__count">
                  {entry.messageCount}{" "}
                  {entry.messageCount === 1
                    ? t("agent.chat.history.item.message", "message")
                    : t("agent.chat.history.item.messages", "messages")}
                </span>
              ) : null}

              <span
                className="dcf-chat-history-item__visibility"
                data-visibility={visibility}
                title={sharedWith.length ? sharedWith.join(", ") : undefined}
              >
                <span
                  className="dcf-chat-history-item__visibility-dot"
                  aria-hidden="true"
                />
                {t(
                  `agent.chat.history.item.visibility.${visibility}`,
                  visibilityFallback
                )}
              </span>
            </span>
          </span>
        </button>

        <button
          type="button"
          className="dcf-chat-history-item__delete"
          disabled={deleting}
          aria-label={`${t("agent.chat.history.item.delete", "Delete chat")}: ${title}`}
          onClick={handleDelete}
        >
          {deleting ? (
            <ChatIcon name="loader" size={15} />
          ) : (
            <ChatIcon name="trash" size={15} />
          )}
        </button>
      </div>

      {confirming ? (
        <div
          className="dcf-chat-history-item__confirm"
          role="alertdialog"
          aria-label={t(
            "agent.chat.history.item.confirm",
            "Delete this chat?"
          )}
        >
          <p className="dcf-chat-history-item__confirm-text">
            {t("agent.chat.history.item.confirm", "Delete this chat?")}
          </p>
          <div className="dcf-chat-history-item__confirm-actions">
            <button
              type="button"
              className="dcf-chat-history-item__confirm-button dcf-chat-history-item__confirm-button--danger"
              onClick={confirm}
            >
              {t("agent.chat.history.item.confirmDelete", "Delete")}
            </button>
            <button
              type="button"
              className="dcf-chat-history-item__confirm-button"
              onClick={cancel}
            >
              {t("agent.chat.history.item.cancel", "Cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/**
 * @description Named alias of {@link ChatHistoryItem} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatHistoryItemComponent = ChatHistoryItem;
