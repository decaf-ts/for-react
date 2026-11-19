/**
 * @file
 * @summary File picker/drop/paste input with size and MIME validation.
 * @description Renders the `ChatAttachmentInput` agent chat component and its props contract.
 */
import React, { useEffect, useRef, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatAttachmentRejection } from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

const DEFAULT_ACCEPT = ["image/*", "text/*"];
const ERROR_KEY = "agent.chat.attachments.invalidType";

/**
 * @description Props accepted by {@link ChatAttachmentInput}.
 * @summary Declares every input the ChatAttachmentInput component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [accept] - Accepted MIME patterns for the file picker.
 * @property {boolean} [multiple] - Whether multiple files can be selected.
 * @property {boolean} [disabled] - Whether the control is disabled.
 * @property {boolean} [globalPaste] - Whether global paste captures files.
 * @property {number | string} [maxSize] - Maximum accepted file size in bytes.
 * @property {function} [onFilesSelected] - Called with the accepted files.
 * @property {function} [onRejected] - Called with the rejected files.
 * @property {function} [onError] - Called with the i18n key of the error.
 */
export interface ChatAttachmentInputProps {
  accept?: string[];
  multiple?: boolean;
  disabled?: boolean;
  globalPaste?: boolean;
  maxSize?: number | null;
  onFilesSelected?: (files: File[]) => void;
  onRejected?: (rejections: AgentChatAttachmentRejection[]) => void;
  onError?: (key: string) => void;
}

function mimeOf(file: File): string {
  return file.type || "application/octet-stream";
}

function matchesAccept(pattern: string, mime: string, name: string): boolean {
  const normalized = pattern.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === "*/*" || normalized === "*") return true;
  if (normalized.startsWith(".")) return name.toLowerCase().endsWith(normalized);
  const actual = mime.toLowerCase();
  if (normalized.endsWith("/*")) return actual.startsWith(normalized.slice(0, -1));
  return actual === normalized;
}

function hasFiles(event: DragEvent): boolean {
  if (!event?.dataTransfer) return false;
  const types = Array.from(event.dataTransfer.types ?? []);
  return types.includes("Files") || (event.dataTransfer.files?.length ?? 0) > 0;
}

/**
 * @description File picker/drop/paste input with size and MIME validation.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatAttachmentInput({
  accept = DEFAULT_ACCEPT,
  multiple = true,
  disabled = false,
  globalPaste = false,
  maxSize = null,
  onFilesSelected,
  onRejected,
  onError,
}: ChatAttachmentInputProps) {
  const t = useAgentTranslate();
  const hostRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [rejectedCount, setRejectedCount] = useState(0);

  const rejectReason = (
    file: File
  ): AgentChatAttachmentRejection["reason"] | null => {
    if (maxSize !== null && file.size > maxSize) return "size";
    const mime = mimeOf(file);
    if (!accept.some((pattern) => matchesAccept(pattern, mime, file.name))) {
      return "mime";
    }
    return null;
  };

  const processFiles = (files: FileList | File[] | null) => {
    if (disabled || !files) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    const selected = multiple ? list : list.slice(0, 1);
    const accepted: File[] = [];
    const rejected: AgentChatAttachmentRejection[] = [];
    for (const file of selected) {
      const reason = rejectReason(file);
      if (reason) {
        rejected.push({
          name: file.name,
          mime: mimeOf(file),
          size: file.size,
          reason,
        });
      } else {
        accepted.push(file);
      }
    }
    setRejectedCount(rejected.length);
    if (accepted.length > 0) onFilesSelected?.(accepted);
    if (rejected.length > 0) {
      onRejected?.(rejected);
      onError?.(ERROR_KEY);
    }
  };

  useEffect(() => {
    const onDragEnter = (event: DragEvent) => {
      if (disabled || !hasFiles(event)) return;
      dragDepth.current += 1;
      setDragging(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (disabled || !hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setDragging(true);
    };
    const onDragLeave = () => {
      if (disabled) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (hasFiles(event)) processFiles(event.dataTransfer?.files ?? null);
    };
    const onPaste = (event: ClipboardEvent) => {
      if (disabled) return;
      const target = event.target as Node | null;
      const insideHost = !!target && !!hostRef.current?.contains(target);
      if (!insideHost && !globalPaste) return;
      const files = event.clipboardData?.files ?? null;
      if (!files || files.length === 0) return;
      event.preventDefault();
      processFiles(files);
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    document.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      document.removeEventListener("paste", onPaste);
    };
  });

  const openPicker = (event: React.MouseEvent) => {
    event.preventDefault();
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="dcf-chat-attachment-input" ref={hostRef}>
      <button
        type="button"
        className="dcf-chat-attachment-input__trigger"
        data-action="attach"
        disabled={disabled}
        aria-label={t("agent.chat.attachments.add", "Attach")}
        title={t("agent.chat.attachments.add", "Attach")}
        onClick={openPicker}
      >
        <ChatIcon name="attachment" size={16} />
        <span>{t("agent.chat.attachments.add", "Attach")}</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        className="dcf-chat-attachment-input__file"
        data-role="file-input"
        aria-label={t("agent.chat.attachments.add", "Attach files")}
        accept={accept.join(",")}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          processFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <p className="dcf-chat-attachment-input__hint">
        {t("agent.chat.attachments.pasteHint", "Drop or paste files here")}
      </p>

      {rejectedCount > 0 ? (
        <p className="dcf-chat-attachment-input__error" role="alert">
          <ChatIcon name="info" size={14} />
          <span>
            {t(
              "agent.chat.attachments.invalidType",
              "Some files are not supported."
            )}
          </span>
        </p>
      ) : null}

      {dragging ? (
        <div
          className="dcf-chat-attachment-input__overlay"
          data-role="drop-overlay"
          aria-hidden="true"
        >
          <div className="dcf-chat-attachment-input__overlay-card">
            <ChatIcon name="upload" size={32} />
            <p className="dcf-chat-attachment-input__overlay-title">
              {t("agent.chat.attachments.dropTitle", "Drop files to attach")}
            </p>
            <p className="dcf-chat-attachment-input__overlay-hint">
              {t(
                "agent.chat.attachments.dropHint",
                "Images and text files only"
              )}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * @description Named alias of {@link ChatAttachmentInput} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatAttachmentInputComponent = ChatAttachmentInput;
