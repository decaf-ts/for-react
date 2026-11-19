/**
 * @file
 * @summary Transcript message rendering text, parts, attachments, reasoning and actions.
 * @description Renders the `ChatMessage` agent chat component and its props contract.
 */
import React, { type ReactNode } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatAttachment,
  AgentChatAttachmentPart,
  AgentChatCodePart,
  AgentChatMessagePart,
  AgentChatReasoningPart,
  AgentChatRole,
  AgentChatTextPart,
  AgentChatToolPart,
} from "../../types.js";
import { ChatCodeBlock } from "../chat-code-block/ChatCodeBlock.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";
import { ChatReasoning } from "../chat-reasoning/ChatReasoning.js";

/**
 * @description Props accepted by {@link ChatMessage}.
 * @summary Declares every input the ChatMessage component understands.
 * @memberOf module:for-react.agent
 * @property {AgentChatRole} [role] - Role the message plays.
 * @property {string} [content] - Content rendered by the artifact or message.
 * @property {string} [createdAt] - Creation timestamp rendered on the message.
 * @property {Array} [attachments] - Attachments already staged for the next send.
 * @property {Array} [parts] - Nested message parts rendered inside the message.
 * @property {Array} [actions] - Action labels rendered on the message, or a custom action node.
 * @property {boolean} [streaming] - Whether content is still streaming.
 * @property {boolean} [pending] - Whether the message is awaiting a response.
 * @property {string} [avatar] - Avatar rendering mode.
 * @property {string} [avatarIcon] - Icon name override for the avatar.
 * @property {string} [roleLabel] - Label override for the role.
 * @property {string} [sessionId] - Active session id.
 * @property {ReactNode} [avatarSlot] - Custom avatar node.
 * @property {ReactNode} [contentSlot] - Custom content node.
 * @property {ReactNode} [children] - Child content rendered by the component.
 */
export interface ChatMessageProps {
  role?: AgentChatRole;
  content?: string;
  createdAt?: string | null;
  attachments?: AgentChatAttachment[];
  parts?: AgentChatMessagePart[];
  actions?: string[];
  streaming?: boolean;
  pending?: boolean;
  avatar?: "default" | "none";
  avatarIcon?: string | null;
  roleLabel?: string | null;
  sessionId?: string;
  avatarSlot?: ReactNode;
  contentSlot?: ReactNode;
  children?: ReactNode;
}

function avatarNameOf(role: AgentChatRole, override: string | null): string {
  if (override) return override;
  switch (role) {
    case "user":
      return "user";
    case "assistant":
      return "bot";
    case "system":
      return "info";
    default:
      return "x";
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
 * @description Transcript message rendering text, parts, attachments, reasoning and actions.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatMessage({
  role = "assistant",
  content = "",
  createdAt = null,
  attachments = [],
  parts = [],
  actions = [],
  streaming = false,
  pending = false,
  avatar = "default",
  avatarIcon = null,
  roleLabel = null,
  avatarSlot,
  contentSlot,
  children,
}: ChatMessageProps) {
  const t = useAgentTranslate();
  const hasParts = parts.length > 0;
  const showsAttachmentList =
    attachments.length > 0 && !parts.some((part) => part.kind === "attachment");
  const avatarName = avatarNameOf(role, avatarIcon);

  const renderPart = (part: AgentChatMessagePart) => {
    switch (part.kind) {
      case "text": {
        const text = part as AgentChatTextPart;
        return (
          <p
            className={`dcf-chat-message__text${text.streaming ? " dcf-chat-message__text--streaming" : ""}`}
            key={part.id}
          >
            {text.text}
          </p>
        );
      }
      case "attachment": {
        const attachmentPart = part as AgentChatAttachmentPart;
        return (
          <span className="dcf-chat-message__attachment" key={part.id}>
            <ChatIcon name="attachment" size={14} />
            {attachmentPart.attachment.name}
            <span className="dcf-chat-message__attachment-meta">
              {attachmentPart.attachment.mime},{" "}
              {attachmentPart.attachment.size}B
            </span>
          </span>
        );
      }
      case "tool": {
        const tool = part as AgentChatToolPart;
        return (
          <div
            className="dcf-chat-message__part dcf-chat-message__part--tool"
            data-status={tool.status}
            key={part.id}
          >
            <div className="dcf-chat-message__tool-header">
              <ChatIcon name="box" size={14} />
              <span className="dcf-chat-message__tool-name">{tool.name}</span>
              <span className="dcf-chat-message__tool-status">
                {t(`agent.chat.tool.status.${tool.status}`, tool.status)}
              </span>
            </div>
            {tool.error ? (
              <p className="dcf-chat-message__tool-error" role="alert">
                {tool.error}
              </p>
            ) : null}
            {tool.input !== undefined || tool.output !== undefined ? (
              <details className="dcf-chat-message__tool-details">
                <summary>
                  {t("agent.chat.message.toolDetails", "Tool details")}
                </summary>
                {tool.input !== undefined ? (
                  <pre className="dcf-chat-message__tool-json">
                    {stringify(tool.input)}
                  </pre>
                ) : null}
                {tool.output !== undefined ? (
                  <pre className="dcf-chat-message__tool-json">
                    {stringify(tool.output)}
                  </pre>
                ) : null}
              </details>
            ) : null}
          </div>
        );
      }
      case "reasoning": {
        const reasoning = part as AgentChatReasoningPart;
        return (
          <ChatReasoning
            key={part.id}
            title={reasoning.title ?? null}
            content={reasoning.content}
            streaming={reasoning.streaming ?? false}
            open={reasoning.open ?? false}
            inline
          />
        );
      }
      case "code": {
        const code = part as AgentChatCodePart;
        return (
          <ChatCodeBlock
            key={part.id}
            code={code.code}
            language={code.language ?? null}
            filename={code.filename ?? null}
            title={code.title ?? null}
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <article
      className={[
        "dcf-chat-message",
        `dcf-chat-message--${role}`,
        streaming ? "dcf-chat-message--streaming" : "",
        pending ? "dcf-chat-message--pending" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-role={role}
      aria-busy={pending || streaming ? "true" : undefined}
    >
      {avatar === "default" ? (
        <div className="dcf-chat-message__avatar" aria-hidden="true">
          {avatarSlot}
          <ChatIcon name={avatarName} size={18} />
        </div>
      ) : (
        avatarSlot
      )}

      <div className="dcf-chat-message__body">
        <header className="dcf-chat-message__meta">
          <span className="dcf-chat-message__role">
            {roleLabel ?? t(`agent.chat.role.${role}`, role)}
          </span>
          {createdAt ? (
            <time className="dcf-chat-message__time" dateTime={createdAt}>
              {createdAt}
            </time>
          ) : null}
          {streaming ? (
            <span className="dcf-chat-message__streaming">
              {t("agent.chat.message.streaming", "Streaming…")}
            </span>
          ) : null}
        </header>

        <div className="dcf-chat-message__content">
          {contentSlot}
          {!hasParts && content ? (
            <p className="dcf-chat-message__text">{content}</p>
          ) : null}
          {parts.map(renderPart)}
          {streaming ? (
            <span className="dcf-chat-message__caret" aria-hidden="true" />
          ) : null}
          {children}
        </div>

        {showsAttachmentList ? (
          <ul className="dcf-chat-message__attachments">
            {attachments.map((attachment) => (
              <li className="dcf-chat-message__attachment" key={attachment.id}>
                <ChatIcon name="attachment" size={14} />
                {attachment.name}
                <span className="dcf-chat-message__attachment-meta">
                  {attachment.mime}, {attachment.size}B
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {actions.length ? (
          <ul
            className="dcf-chat-message__actions"
            aria-label={t("agent.chat.actions.label", "Agent actions")}
          >
            {actions.map((action) => (
              <li className="dcf-chat-message__action-chip" key={action}>
                {action}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

/**
 * @description Named alias of {@link ChatMessage} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatMessageComponent = ChatMessage;
