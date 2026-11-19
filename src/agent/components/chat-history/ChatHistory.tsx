/**
 * @file
 * @summary Conversation history panel or drawer backed by an {@link AgentChatHistorySource}.
 * @description Renders the `ChatHistory` agent chat component and its props contract.
 */
import React, { useEffect, useRef, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatHistoryEntry,
  AgentChatHistorySource,
} from "../../types.js";
import { ChatHistoryItem } from "../chat-history-item/ChatHistoryItem.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatHistory}.
 * @summary Declares every input the ChatHistory component understands.
 * @memberOf module:for-react.agent
 * @property {Array | string} [entries] - Entries rendered by the list.
 * @property {AgentChatHistorySource} [source] - Data source backing the component.
 * @property {string} [activeId] - Id of the currently active history entry.
 * @property {boolean} [loading] - Whether the list is loading.
 * @property {string} [variant] - Component presentation variant.
 * @property {boolean} [open] - Whether the surface is open.
 * @property {number} [pageSize] - Number of entries requested per page.
 * @property {number} [skeletonRows] - Number of skeleton rows rendered while loading.
 * @property {string} [title] - Title text.
 * @property {function} [onSelectChat] - Called when a chat entry is selected.
 * @property {function} [onDelete] - Called when an entry is deleted.
 * @property {function} [onNewChat] - Called when a new chat is requested.
 * @property {function} [onLoadMore] - Called when more entries are requested.
 * @property {function} [onOpenChange] - Called when the open state changes.
 */
export interface ChatHistoryProps {
  entries?: AgentChatHistoryEntry[] | null;
  source?: AgentChatHistorySource;
  activeId?: string | null;
  loading?: boolean;
  variant?: "panel" | "drawer";
  open?: boolean;
  pageSize?: number;
  skeletonRows?: number;
  title?: string | null;
  onSelectChat?: (entry: AgentChatHistoryEntry) => void;
  onDelete?: (entry: AgentChatHistoryEntry) => void;
  onNewChat?: () => void;
  onLoadMore?: () => void;
  onOpenChange?: (open: boolean) => void;
}

/**
 * @description Conversation history panel or drawer backed by an {@link AgentChatHistorySource}.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatHistory({
  entries = null,
  source,
  activeId = null,
  loading = false,
  variant = "panel",
  open = true,
  pageSize = 6,
  skeletonRows = 4,
  title = null,
  onSelectChat,
  onDelete,
  onNewChat,
  onLoadMore,
  onOpenChange,
}: ChatHistoryProps) {
  const t = useAgentTranslate();
  const [stored, setStored] = useState<AgentChatHistoryEntry[]>(entries ?? []);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [sourceHasMore, setSourceHasMore] = useState(false);

  const usesSource = entries === null && !!source;
  const isDrawer = variant === "drawer";
  const isLoading = loading || internalLoading;
  const isEmpty = !isLoading && stored.length === 0;
  const hasMore = stored.length > page * pageSize;
  const canLoadMore = hasMore || sourceHasMore;
  const visibleEntries = stored.slice(0, page * pageSize);
  const skeletonRowList = Array.from({
    length: Math.max(0, skeletonRows),
  });

  const entriesSignature = JSON.stringify(entries);
  const entriesSignatureRef = useRef(entriesSignature);

  useEffect(() => {
    if (entries === null) return;
    if (entriesSignatureRef.current === entriesSignature) return;
    entriesSignatureRef.current = entriesSignature;
    setStored(entries);
  }, [entries, entriesSignature]);

  useEffect(() => {
    if (entries !== null) return;
    if (!source) return;
    let cancelled = false;
    setInternalLoading(true);
    source
      .list({ page: 1, pageSize })
      .then((list) => {
        if (cancelled) return;
        setStored(list ?? []);
        setPage(1);
        setSourceHasMore(false);
        setInternalLoading(false);
      })
      .catch(() => {
        if (!cancelled) setInternalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entries, source, pageSize]);

  const requestClose = () => {
    if (!open) return;
    onOpenChange?.(false);
  };

  const loadSourcePage = (targetPage: number, append: boolean) => {
    if (!source) return;
    setInternalLoading(!append);
    setLoadingMore(append);
    source
      .list({ page: targetPage, pageSize })
      .then((list) => {
        const rows = list ?? [];
        setStored((current) => (append ? [...current, ...rows] : rows));
        if (rows.length > 0) setPage(targetPage);
        setSourceHasMore(rows.length >= pageSize);
        setInternalLoading(false);
        setLoadingMore(false);
      })
      .catch(() => {
        setInternalLoading(false);
        setLoadingMore(false);
      });
  };

  const handleOpen = (entry: AgentChatHistoryEntry) => {
    onSelectChat?.(entry);
    if (isDrawer) requestClose();
  };

  const handleDelete = (entry: AgentChatHistoryEntry) => {
    setStored((current) => current.filter((row) => row.id !== entry.id));
    onDelete?.(entry);
    if (usesSource && source?.delete) {
      void source.delete(entry.id).catch(() => undefined);
    }
  };

  const handleNewChat = () => {
    onNewChat?.();
    if (isDrawer) requestClose();
  };

  const requestMore = () => {
    onLoadMore?.();
    if (hasMore) {
      setPage((current) => current + 1);
      return;
    }
    if (!usesSource || !source) return;
    loadSourcePage(page + 1, true);
  };

  const heading = title || t("agent.chat.history.title", "Chat history");

  return (
    <>
      <nav
        className={`dcf-chat-history${isDrawer ? " dcf-chat-history--drawer" : ""}${open ? " dcf-chat-history--open" : ""}`}
        aria-hidden={isDrawer && !open ? "true" : undefined}
        aria-label={title || t("agent.chat.history.aria", "Chat history")}
      >
        <header className="dcf-chat-history__header">
          <h2 className="dcf-chat-history__title">{heading}</h2>

          <div className="dcf-chat-history__header-actions">
            <button
              type="button"
              className="dcf-chat-history__new"
              aria-label={t("agent.chat.history.newChat", "New chat")}
              onClick={handleNewChat}
            >
              <ChatIcon name="sparkles" size={15} />
              <span>{t("agent.chat.history.newChat", "New chat")}</span>
            </button>

            {isDrawer ? (
              <button
                type="button"
                className="dcf-chat-history__close"
                aria-label={t(
                  "agent.chat.history.close",
                  "Close chat history"
                )}
                onClick={requestClose}
              >
                <ChatIcon name="x" size={16} />
              </button>
            ) : null}
          </div>
        </header>

        <ul
          className="dcf-chat-history__list"
          aria-busy={isLoading ? "true" : "false"}
        >
          {isLoading ? (
            <>
              {skeletonRowList.map((_, index) => (
                <li
                  className="dcf-chat-history__skeleton-row"
                  aria-hidden="true"
                  key={index}
                >
                  <span className="dcf-chat-history__skeleton-avatar" />
                  <span className="dcf-chat-history__skeleton-lines">
                    <span className="dcf-chat-history__skeleton-line" />
                    <span className="dcf-chat-history__skeleton-line dcf-chat-history__skeleton-line--short" />
                  </span>
                </li>
              ))}
              <li className="dcf-chat-history__status">
                {t("agent.chat.history.loading", "Loading chats…")}
              </li>
            </>
          ) : isEmpty ? (
            <li className="dcf-chat-history__empty">
              <ChatIcon name="bot" size={22} />
              <p className="dcf-chat-history__empty-text">
                {t("agent.chat.history.empty", "No chats found")}
              </p>
              <button
                type="button"
                className="dcf-chat-history__empty-action"
                onClick={handleNewChat}
              >
                {t("agent.chat.history.newChat", "New chat")}
              </button>
            </li>
          ) : (
            <>
              {visibleEntries.map((entry) => (
                <li className="dcf-chat-history__entry" key={entry.id}>
                  <ChatHistoryItem
                    entry={entry}
                    active={entry.id === activeId}
                    onOpen={handleOpen}
                    onDelete={handleDelete}
                  />
                </li>
              ))}

              {canLoadMore ? (
                <li className="dcf-chat-history__more">
                  <button
                    type="button"
                    className="dcf-chat-history__load-more"
                    disabled={loadingMore}
                    onClick={requestMore}
                  >
                    {loadingMore ? <ChatIcon name="loader" size={14} /> : null}
                    {t("agent.chat.history.loadMore", "Load more")}
                  </button>
                </li>
              ) : null}
            </>
          )}
        </ul>
      </nav>

      {isDrawer && open ? (
        <div
          className="dcf-chat-history__backdrop"
          aria-hidden="true"
          onClick={requestClose}
        />
      ) : null}
    </>
  );
}

/**
 * @description Named alias of {@link ChatHistory} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatHistoryComponent = ChatHistory;
