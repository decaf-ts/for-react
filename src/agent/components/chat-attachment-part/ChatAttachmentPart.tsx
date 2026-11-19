/**
 * @file
 * @summary Attachment chip rendered inside a chat message.
 * @description Renders the `ChatAttachmentPart` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatAttachment } from "../../types.js";
import { safeMediaUrl } from "../../utils/agentMediaUrl.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

function isTextMime(mime: string): boolean {
  const normalized = (mime || "").toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized === "application/json" ||
    normalized === "application/xml" ||
    normalized === "application/javascript"
  );
}

/**
 * @description Props accepted by {@link ChatAttachmentPart}.
 * @summary Declares every input the ChatAttachmentPart component understands.
 * @memberOf module:for-react.agent
 * @property {AgentChatAttachment | string} [attachment] - Attachment rendered by the part.
 * @property {string} [text] - Text content.
 * @property {number} [maxTextLength] - Maximum text length before truncation.
 */
export interface ChatAttachmentPartProps {
  attachment?: AgentChatAttachment | null;
  text?: string | null;
  maxTextLength?: number;
}

/**
 * @description Attachment chip rendered inside a chat message.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatAttachmentPart({
  attachment = null,
  text = null,
  maxTextLength = 0,
}: ChatAttachmentPartProps) {
  const t = useAgentTranslate();
  if (!attachment) return null;

  const image = /^image\//i.test(attachment.mime ?? "");
  const isText = isTextMime(attachment.mime ?? "");
  const imageUrl = safeMediaUrl(attachment.url);
  const rawText = text ?? attachment.textPreview ?? "";
  const content =
    maxTextLength > 0 && rawText.length > maxTextLength
      ? `${rawText.slice(0, maxTextLength)}…`
      : rawText;
  const hasText = content.trim().length > 0;

  return (
    <figure
      className="dcf-chat-attachment-part"
      data-kind={image ? "image" : isText ? "text" : "file"}
      aria-label={t("agent.chat.attachmentPart.label", "Attachment")}
    >
      {image ? (
        imageUrl ? (
          <img
            className="dcf-chat-attachment-part__image"
            src={imageUrl}
            alt={attachment.name}
            loading="lazy"
          />
        ) : (
          <div className="dcf-chat-attachment-part__fallback">
            <ChatIcon name="image" size={18} />
            <span>{attachment.name}</span>
          </div>
        )
      ) : isText ? (
        <div className="dcf-chat-attachment-part__text">
          <figcaption className="dcf-chat-attachment-part__caption">
            <ChatIcon name="file" size={14} />
            <span>{attachment.name}</span>
          </figcaption>
          {hasText ? (
            <pre className="dcf-chat-attachment-part__content">{content}</pre>
          ) : (
            <p className="dcf-chat-attachment-part__empty">
              {t(
                "agent.chat.attachmentPart.empty",
                "No text preview available."
              )}
            </p>
          )}
        </div>
      ) : (
        <div className="dcf-chat-attachment-part__fallback">
          <ChatIcon name="file" size={18} />
          <span className="dcf-chat-attachment-part__name">
            {attachment.name}
          </span>
          <span className="dcf-chat-attachment-part__chip">
            {attachment.mime}
          </span>
        </div>
      )}

      {image ? (
        <figcaption className="dcf-chat-attachment-part__caption">
          <span>{attachment.name}</span>
          <span className="dcf-chat-attachment-part__chip">
            {attachment.mime}
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * @description Named alias of {@link ChatAttachmentPart} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatAttachmentPartComponent = ChatAttachmentPart;
