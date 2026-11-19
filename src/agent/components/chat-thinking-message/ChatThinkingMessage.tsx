/**
 * @file
 * @summary Animated placeholder message shown while the agent is thinking.
 * @description Renders the `ChatThinkingMessage` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatThinkingMessage}.
 * @summary Declares every input the ChatThinkingMessage component understands.
 * @memberOf module:for-react.agent
 * @property {string} [label] - Label text.
 * @property {number} [lines] - Number of skeleton lines.
 * @property {boolean} [animated] - Whether the entrance animation runs.
 * @property {boolean} [showAvatar] - Whether the avatar is shown.
 * @property {string} [avatarIcon] - Icon name override for the avatar.
 */
export interface ChatThinkingMessageProps {
  label?: string | null;
  lines?: number;
  animated?: boolean;
  showAvatar?: boolean;
  avatarIcon?: string;
}

/**
 * @description Animated placeholder message shown while the agent is thinking.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatThinkingMessage({
  label = null,
  lines = 2,
  animated = true,
  showAvatar = true,
  avatarIcon = "bot",
}: ChatThinkingMessageProps) {
  const t = useAgentTranslate();
  const lineIndexes = Array.from(
    { length: Math.max(1, Math.floor(lines)) },
    (_, index) => index
  );
  const lineWidth = (index: number) => Math.max(35, 100 - index * 20);
  return (
    <div
      className={`dcf-chat-thinking-message${animated ? " dcf-chat-thinking-message--animated" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label ?? t("agent.chat.thinking.label", "Agent is thinking")}
    >
      {showAvatar ? (
        <span className="dcf-chat-thinking-message__avatar" aria-hidden="true">
          <ChatIcon name={avatarIcon} size={18} />
        </span>
      ) : null}
      <div className="dcf-chat-thinking-message__body">
        <span className="dcf-chat-thinking-message__label">
          {label ?? t("agent.chat.thinking.label", "Thinking…")}
        </span>
        <div className="dcf-chat-thinking-message__lines" aria-hidden="true">
          {lineIndexes.map((index) => (
            <span
              className="dcf-chat-thinking-message__line"
              key={index}
              style={{ width: `${lineWidth(index)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * @description Named alias of {@link ChatThinkingMessage} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatThinkingMessageComponent = ChatThinkingMessage;
