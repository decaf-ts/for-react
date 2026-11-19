/**
 * @file
 * @summary Dialog offering to apply a suggested prompt.
 * @description Renders the `ChatSuggestionDialog` agent chat component and its props contract.
 */
import React, { useEffect, useId, useRef } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatSuggestionDialog}.
 * @summary Declares every input the ChatSuggestionDialog component understands.
 * @memberOf module:for-react.agent
 * @property {boolean} [open] - Whether the surface is open.
 * @property {string} [suggestion] - Suggestion text.
 * @property {string} [title] - Title text.
 * @property {string} [description] - Supporting description text.
 * @property {function} [onApply] - Called when the suggestion is applied.
 * @property {function} [onIgnore] - Called when the suggestion is ignored.
 */
export interface ChatSuggestionDialogProps {
  open?: boolean;
  suggestion?: string;
  title?: string | null;
  description?: string | null;
  onApply?: (suggestion: string) => void;
  onIgnore?: () => void;
}

/**
 * @description Dialog offering to apply a suggested prompt.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatSuggestionDialog({
  open = false,
  suggestion = "",
  title = null,
  description = null,
  onApply,
  onIgnore,
}: ChatSuggestionDialogProps) {
  const t = useAgentTranslate();
  const instance = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `agent-chat-suggestion-title-${instance}`;
  const descriptionId = `agent-chat-suggestion-description-${instance}`;
  const canApply = suggestion.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => dialogRef.current?.focus());
  }, [open]);

  const applySuggestion = () => {
    if (!open || !canApply) return;
    onApply?.(suggestion);
  };

  const ignoreSuggestion = () => {
    if (!open) return;
    onIgnore?.();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDocumentKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onIgnore?.();
        return;
      }
      if (event.key !== "Enter") return;
      const withModifier = event.ctrlKey || event.metaKey;
      const onDialog = event.target === dialogRef.current;
      if (!withModifier && !onDialog) return;
      event.preventDefault();
      onApply?.(suggestion);
    };
    document.addEventListener("keydown", onDocumentKeydown);
    return () => document.removeEventListener("keydown", onDocumentKeydown);
  }, [open, suggestion, onApply, onIgnore]);

  if (!open) return null;

  return (
    <div
      className="dcf-chat-suggestion-dialog"
      data-role="overlay"
      tabIndex={-1}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        ignoreSuggestion();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        ignoreSuggestion();
      }}
    >
      <div
        ref={dialogRef}
        className="dcf-chat-suggestion-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <header className="dcf-chat-suggestion-dialog__header">
          <h2 className="dcf-chat-suggestion-dialog__title" id={titleId}>
            {title ??
              t("agent.chat.suggestionDialog.title", "Suggested change")}
          </h2>
          <button
            type="button"
            className="dcf-chat-suggestion-dialog__close"
            data-action="close"
            aria-label={t("agent.chat.suggestionDialog.close", "Close")}
            title={t("agent.chat.suggestionDialog.close", "Close")}
            onClick={ignoreSuggestion}
          >
            <ChatIcon name="x" size={14} />
          </button>
        </header>

        <p
          className="dcf-chat-suggestion-dialog__description"
          id={descriptionId}
        >
          {description ??
            t(
              "agent.chat.suggestionDialog.description",
              "Review the AI-generated suggestion before applying it."
            )}
        </p>

        <blockquote className="dcf-chat-suggestion-dialog__suggestion">
          {suggestion}
        </blockquote>

        <footer className="dcf-chat-suggestion-dialog__actions">
          <button
            type="button"
            className="dcf-chat-suggestion-dialog__action dcf-chat-suggestion-dialog__action--secondary"
            data-action="ignore"
            onClick={ignoreSuggestion}
          >
            {t("agent.chat.suggestionDialog.ignore", "Ignore")}
          </button>
          <button
            type="button"
            className="dcf-chat-suggestion-dialog__action dcf-chat-suggestion-dialog__action--primary"
            data-action="apply"
            disabled={!canApply}
            onClick={applySuggestion}
          >
            {t("agent.chat.suggestionDialog.apply", "Apply")}
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * @description Named alias of {@link ChatSuggestionDialog} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatSuggestionDialogComponent = ChatSuggestionDialog;
