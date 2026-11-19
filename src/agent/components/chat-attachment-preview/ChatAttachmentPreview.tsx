/**
 * @file
 * @summary Preview strip of attachments staged for the next send.
 * @description Renders the `ChatAttachmentPreview` agent chat component and its props contract.
 */
import React, { useEffect, useRef, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatStagedAttachment } from "../../types.js";
import { safeMediaUrl } from "../../utils/agentMediaUrl.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

const DEFAULT_TEXT_PREVIEW = 100;
const EMPTY_ATTACHMENTS: AgentChatStagedAttachment[] = [];

function isImageMime(mime: string): boolean {
  return /^image\//i.test(mime);
}

function isTextMime(mime: string): boolean {
  const normalized = (mime || "").toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized === "application/json" ||
    normalized === "application/xml" ||
    normalized === "application/javascript"
  );
}

function truncate(text: string, max: number): string {
  if (max <= 0) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function sameImageUrls(
  current: Record<string, string>,
  next: Record<string, string>
): boolean {
  const keys = Object.keys(next);
  if (keys.length !== Object.keys(current).length) return false;
  return keys.every((key) => current[key] === next[key]);
}

/**
 * @description Props accepted by {@link ChatAttachmentPreview}.
 * @summary Declares every input the ChatAttachmentPreview component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [attachments] - Attachments already staged for the next send.
 * @property {number} [maxTextPreview] - Maximum characters rendered in the text preview.
 * @property {function} [onRemove] - Called when an item is removed.
 */
export interface ChatAttachmentPreviewProps {
  attachments?: AgentChatStagedAttachment[];
  maxTextPreview?: number;
  onRemove?: (id: string) => void;
}

/**
 * @description Preview strip of attachments staged for the next send.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatAttachmentPreview({
  attachments = EMPTY_ATTACHMENTS,
  maxTextPreview = DEFAULT_TEXT_PREVIEW,
  onRemove,
}: ChatAttachmentPreviewProps) {
  const t = useAgentTranslate();
  const objectUrls = useRef<Map<string, string>>(new Map());
  const pendingReads = useRef<Set<string>>(new Set());
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [textPreviews, setTextPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const alive = new Set(attachments.map((attachment) => attachment.id));
    revokeStale(alive);
    const next: Record<string, string> = {};
    for (const attachment of attachments) {
      if (isImageMime(attachment.mime)) {
        const url = previewUrl(attachment);
        if (url) next[attachment.id] = url;
      }
      if (isTextMime(attachment.mime)) readTextPreview(attachment);
    }
    setImageUrls((current) => (sameImageUrls(current, next) ? current : next));
  }, [attachments]);

  useEffect(
    () => () => {
      revokeStale(new Set());
    },
    []
  );

  function previewUrl(attachment: AgentChatStagedAttachment): string | null {
    if (attachment.url) return attachment.url;
    const cached = objectUrls.current.get(attachment.id);
    if (cached) return cached;
    const file = attachment.file;
    if (!file) return null;
    const urlApi = URL as typeof URL & {
      createObjectURL?: (blob: Blob) => string;
    };
    if (typeof urlApi.createObjectURL !== "function") return null;
    const url = urlApi.createObjectURL(file);
    objectUrls.current.set(attachment.id, url);
    return url;
  }

  function revokeStale(alive: Set<string>): void {
    const urlApi = URL as typeof URL & {
      revokeObjectURL?: (url: string) => void;
    };
    for (const [id, url] of Array.from(objectUrls.current.entries())) {
      if (alive.has(id)) continue;
      urlApi.revokeObjectURL?.(url);
      objectUrls.current.delete(id);
    }
  }

  function readTextPreview(attachment: AgentChatStagedAttachment): void {
    if (attachment.textPreview) return;
    if (pendingReads.current.has(attachment.id)) return;
    const file = attachment.file;
    if (!file || typeof file.text !== "function") return;
    pendingReads.current.add(attachment.id);
    void file
      .text()
      .then((text) => {
        pendingReads.current.delete(attachment.id);
        setTextPreviews((current) => ({
          ...current,
          [attachment.id]: text,
        }));
      })
      .catch(() => {
        pendingReads.current.delete(attachment.id);
      });
  }

  const formatSize = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (attachments.length === 0) return null;

  return (
    <section
      className="dcf-chat-attachment-preview"
      aria-label={t("agent.chat.attachments.label", "Attachments")}
    >
      <ul className="dcf-chat-attachment-preview__list">
        {attachments.map((attachment) => {
          const image = isImageMime(attachment.mime);
          const text = isTextMime(attachment.mime);
          const url = safeMediaUrl(
            attachment.url ?? imageUrls[attachment.id]
          );
          const excerpt = truncate(
            attachment.textPreview ??
              textPreviews[attachment.id] ??
              "",
            maxTextPreview
          );
          return (
            <li
              className="dcf-chat-attachment-preview__item"
              data-kind={image ? "image" : text ? "text" : "file"}
              key={attachment.id}
            >
              {image ? (
                url ? (
                  <img
                    className="dcf-chat-attachment-preview__thumb"
                    src={url}
                    alt={attachment.name}
                    loading="lazy"
                  />
                ) : (
                  <span className="dcf-chat-attachment-preview__fallback-icon">
                    <ChatIcon name="image" size={18} />
                  </span>
                )
              ) : text ? (
                <div className="dcf-chat-attachment-preview__text">
                  <span className="dcf-chat-attachment-preview__name">
                    {attachment.name}
                  </span>
                  <p className="dcf-chat-attachment-preview__excerpt">
                    {excerpt}
                  </p>
                </div>
              ) : (
                <>
                  <span className="dcf-chat-attachment-preview__fallback-icon">
                    <ChatIcon name="file" size={18} />
                  </span>
                  <span className="dcf-chat-attachment-preview__name">
                    {attachment.name}
                  </span>
                </>
              )}

              <div className="dcf-chat-attachment-preview__meta">
                <span className="dcf-chat-attachment-preview__chip">
                  {formatSize(attachment.size)}
                </span>
                <span className="dcf-chat-attachment-preview__chip">
                  {attachment.mime}
                </span>
              </div>

              <button
                type="button"
                className="dcf-chat-attachment-preview__remove"
                data-action="remove"
                aria-label={t(
                  "agent.chat.attachments.remove",
                  "Remove attachment"
                )}
                title={t("agent.chat.attachments.remove", "Remove attachment")}
                onClick={() => onRemove?.(attachment.id)}
              >
                <ChatIcon name="x" size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * @description Named alias of {@link ChatAttachmentPreview} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatAttachmentPreviewComponent = ChatAttachmentPreview;
