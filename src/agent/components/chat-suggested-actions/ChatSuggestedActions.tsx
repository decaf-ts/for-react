/**
 * @file
 * @summary Suggested-prompt chips rendered after a response.
 * @description Renders the `ChatSuggestedActions` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";

/**
 * @description Props accepted by {@link ChatSuggestedActions}.
 * @summary Declares every input the ChatSuggestedActions component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [suggestions] - Suggested prompts rendered by the component.
 * @property {boolean} [empty] - Whether to render the empty state.
 * @property {string} [title] - Title text.
 * @property {boolean} [disabled] - Whether the control is disabled.
 * @property {function} [onSelect] - Called when an item is selected.
 */
export interface ChatSuggestedActionsProps {
  suggestions?: string[];
  empty?: boolean;
  title?: string | null;
  disabled?: boolean;
  onSelect?: (suggestion: string) => void;
}

/**
 * @description Suggested-prompt chips rendered after a response.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatSuggestedActions({
  suggestions = [],
  empty = true,
  title = null,
  disabled = false,
  onSelect,
}: ChatSuggestedActionsProps) {
  const t = useAgentTranslate();
  const visible = empty && !disabled && suggestions.length > 0;
  if (!visible) return null;
  return (
    <section
      className="dcf-chat-suggested-actions"
      aria-label={t("agent.chat.suggestedActions.label", "Suggested prompts")}
    >
      <h3 className="dcf-chat-suggested-actions__title">
        {title ?? t("agent.chat.suggestedActions.title", "Try asking")}
      </h3>
      <ul className="dcf-chat-suggested-actions__grid">
        {suggestions.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              className="dcf-chat-suggested-actions__item"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onSelect?.(suggestion);
              }}
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * @description Named alias of {@link ChatSuggestedActions} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatSuggestedActionsComponent = ChatSuggestedActions;
