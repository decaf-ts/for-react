/**
 * @file
 * @summary Inline editor for an already-sent user message.
 * @description Renders the `ChatMessageEditor` agent chat component and its props contract.
 */
import React, {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatMessageEdit,
  AgentChatMessageView,
} from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatMessageEditor}.
 * @summary Declares every input the ChatMessageEditor component understands.
 * @memberOf module:for-react.agent
 * @property {AgentChatMessageView | string} [message] - Message content or view rendered by the component.
 * @property {string} [messageId] - Identifier of the message.
 * @property {string} [initialText] - Initial editor text.
 * @property {boolean} [running] - Whether a send or replay is in flight.
 * @property {boolean} [autoFocus] - Whether the editor takes focus on mount.
 * @property {function} [onSave] - Called when the edit is saved.
 * @property {function} [onCancel] - Called when the edit is cancelled.
 */
export interface ChatMessageEditorProps {
  message?: AgentChatMessageView | null;
  messageId?: string;
  initialText?: string;
  running?: boolean;
  autoFocus?: boolean;
  onSave?: (edit: AgentChatMessageEdit) => void | Promise<void>;
  onCancel?: (messageId: string) => void;
}

/**
 * @description Inline editor for an already-sent user message.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatMessageEditor({
  message = null,
  messageId = "",
  initialText = "",
  running = false,
  autoFocus = true,
  onSave,
  onCancel,
}: ChatMessageEditorProps) {
  const t = useAgentTranslate();
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const original = message?.content ?? initialText;
  const targetId = message?.id ?? messageId;
  const [draft, setDraft] = useState(original);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(original);
    setDirty(false);
  }, [original]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const canSave = !running && !saving && draft.trim().length > 0;

  const saveEdit = async () => {
    if (!canSave) return;
    const text = draft.trim();
    setError(null);
    setSaving(true);
    try {
      await onSave?.({ messageId: targetId, text });
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (saving) return;
    setDraft(original);
    setDirty(false);
    setError(null);
    onCancel?.(targetId);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveEdit();
  };

  const onKeydown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void saveEdit();
    }
  };

  return (
    <form className="dcf-chat-message-editor" onSubmit={onSubmit}>
      <label className="dcf-chat-message-editor__label" htmlFor={textareaId}>
        {t("agent.chat.messageEditor.label", "Edit message")}
      </label>
      <textarea
        ref={textareaRef}
        className="dcf-chat-message-editor__input"
        id={textareaId}
        rows={3}
        value={draft}
        disabled={running || saving}
        placeholder={t(
          "agent.chat.messageEditor.placeholder",
          "Update your message…"
        )}
        data-dirty={dirty}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          setDirty(value !== original);
        }}
        onKeyDown={onKeydown}
      />

      {error ? (
        <p className="dcf-chat-message-editor__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="dcf-chat-message-editor__actions">
        <button
          type="submit"
          className="dcf-chat-message-editor__button dcf-chat-message-editor__button--save"
          disabled={!canSave}
        >
          <ChatIcon name="check" size={15} />
          <span>{t("agent.chat.messageEditor.save", "Save and resend")}</span>
        </button>
        <button
          type="button"
          className="dcf-chat-message-editor__button"
          disabled={saving}
          onClick={cancelEdit}
        >
          <ChatIcon name="x" size={15} />
          <span>{t("agent.chat.messageEditor.cancel", "Cancel")}</span>
        </button>
      </div>
    </form>
  );
}

/**
 * @description Named alias of {@link ChatMessageEditor} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatMessageEditorComponent = ChatMessageEditor;
