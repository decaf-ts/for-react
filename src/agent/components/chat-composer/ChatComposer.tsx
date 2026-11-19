/**
 * @file
 * @summary Message composer with slash-command and `@` file popovers and stop control.
 * @description Renders the `ChatComposer` agent chat component and its props contract.
 */
import React, {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Imperative handle exposed by {@link ChatComposer}.
 * @summary Lets hosts drive slash commands, `@` file references, drafts and
 * focus without controlling the internal textarea state.
 * @memberOf module:for-react.agent
 */
export interface ChatComposerHandle {
  /** Applies a slash command to the draft. */
  acceptSlashCommand(command: string): void;
  /** Applies an `@` file/directory reference to the draft. */
  acceptAtFileReference(relative: string, kind: "file" | "dir"): void;
  /** Replaces the composer text. */
  setDraft(text: string): void;
  /** Inserts text at the current selection. */
  insertAtCursor(text: string): void;
  /** Removes an `@` file token between the given offsets. */
  removeAtFileToken(start: number, end: number): void;
  /** Clears any active `@` query. */
  clearAtQuery(): void;
  /** Focuses the textarea. */
  focus(): void;
  /** Recomputes the textarea height. */
  autoGrow(): void;
}

/**
 * @description Props accepted by {@link ChatComposer}.
 * @summary Declares every input the ChatComposer component understands.
 * @memberOf module:for-react.agent
 * @property {string} [value] - Current value.
 * @property {boolean} [running] - Whether a send or replay is in flight.
 * @property {boolean} [disabled] - Whether the control is disabled.
 * @property {boolean} [disabledWhileRunning] - Whether the control is disabled while a run is active.
 * @property {boolean} [clearOnSend] - Whether the composer clears after sending.
 * @property {boolean} [refocusOnSend] - Whether the composer refocuses after sending.
 * @property {string} [placeholder] - Placeholder text.
 * @property {number} [minRows] - Minimum composer rows.
 * @property {number} [maxRows] - Maximum composer rows before scrolling.
 * @property {boolean} [atFileEnabled] - Whether the `@` file mention popover is enabled.
 * @property {function} [onSend] - Called with the text to send.
 * @property {function} [onStop] - Called when a running send is stopped.
 * @property {function} [onValueChange] - Called when the value changes.
 * @property {function} [onSlashQuery] - Called when the slash query changes.
 * @property {function} [onAtQuery] - Called when the `@` query changes.
 * @property {function} [onAtNavigate] - Called when the highlighted `@` suggestion moves by `direction`.
 * @property {function} [onAtPick] - Called when the highlighted `@` suggestion is picked.
 * @property {function} [onAtDismiss] - Called when the `@` popover is dismissed.
 * @property {ReactNode} [children] - Child content rendered by the component.
 */
export interface ChatComposerProps {
  value?: string;
  running?: boolean;
  disabled?: boolean;
  disabledWhileRunning?: boolean;
  clearOnSend?: boolean;
  refocusOnSend?: boolean;
  placeholder?: string | null;
  minRows?: number;
  maxRows?: number;
  atFileEnabled?: boolean;
  onSend?: (text: string) => void;
  onStop?: () => void;
  onValueChange?: (value: string) => void;
  onSlashQuery?: (query: string | null) => void;
  onAtQuery?: (query: string | null) => void;
  onAtNavigate?: (direction: number) => void;
  onAtPick?: () => void;
  onAtDismiss?: () => void;
  children?: ReactNode;
}

function extractSlashQuery(text: string): string | null {
  if (!text.startsWith("/")) return null;
  if (/\s/.test(text)) return null;
  return text.slice(1);
}

function activeAtPathQuery(
  text: string,
  caret: number
): { query: string; start: number; end: number } | null {
  if (caret <= 0) return null;
  const before = text.slice(0, caret);
  const start = before.lastIndexOf("@");
  if (start < 0) return null;
  const token = before.slice(start + 1);
  if (token.length > 0 && /[\s@]/u.test(token)) return null;
  if (token.includes("\u2060")) return null;
  const suffix = /^\S*/u.exec(text.slice(caret))?.[0] ?? "";
  if (suffix.includes("@") || suffix.includes("\u2060")) return null;
  return { query: token + suffix, start, end: caret + suffix.length };
}

/**
 * @description Message composer with slash-command and `@` file popovers and stop control.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer(
    {
      value = "",
      running = false,
      disabled = false,
      disabledWhileRunning = true,
      clearOnSend = true,
      refocusOnSend = true,
      placeholder = null,
      minRows = 1,
      maxRows = 6,
      atFileEnabled = false,
      onSend,
      onStop,
      onValueChange,
      onSlashQuery,
      onAtQuery,
      onAtNavigate,
      onAtPick,
      onAtDismiss,
      children,
    },
    ref
  ) {
    const t = useAgentTranslate();
    const textareaId = useId();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const atToken = useRef<{ start: number; end: number } | null>(null);
    const [draft, setDraftState] = useState(value);

    useEffect(() => {
      setDraftState(value);
    }, [value]);

    useLayoutEffect(() => {
      autoGrow();
    });

    const inputDisabled = disabled || (running && disabledWhileRunning);
    const canSend = !disabled && !running && draft.trim().length > 0;
    const canStop = running && !disabled;
    const hintKey = running
      ? "agent.chat.composer.runningHint"
      : "agent.chat.composer.hint";
    const hintFallback = running
      ? "Agent is responding…"
      : "Enter to send, Shift+Enter for a new line";

    const emitSlashQuery = (text: string) => {
      onSlashQuery?.(extractSlashQuery(text));
    };

    const emitAtQuery = (text: string, caret: number) => {
      if (!atFileEnabled) {
        if (atToken.current) clearAtQuery();
        return;
      }
      const query = activeAtPathQuery(text, caret);
      atToken.current = query ? { start: query.start, end: query.end } : null;
      onAtQuery?.(query ? query.query : null);
    };

    const clearAtQuery = () => {
      atToken.current = null;
      onAtQuery?.(null);
    };

    const focus = () => {
      textareaRef.current?.focus();
    };

    const autoGrow = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const maxHeight = maxRows * 22;
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      if (!scrollHeight) return;
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    };

    const setDraft = (text: string) => {
      if (disabled) return;
      setDraftState(text);
      onValueChange?.(text);
      emitSlashQuery(text);
      emitAtQuery(text, text.length);
    };

    const submit = () => {
      if (disabled) return;
      if (running) {
        if (canStop) onStop?.();
        return;
      }
      if (!canSend) return;
      const text = draft.trim();
      onSend?.(text);
      if (!clearOnSend) return;
      setDraftState("");
      onValueChange?.("");
      emitSlashQuery("");
      clearAtQuery();
      if (refocusOnSend) queueMicrotask(focus);
    };

    const acceptSlashCommand = (command: string) => {
      if (disabled) return;
      const next = `/${command.replace(/^\//, "")} `;
      setDraft(next);
      queueMicrotask(focus);
    };

    const acceptAtFileReference = (relative: string, kind: "file" | "dir") => {
      if (disabled) return;
      const token = `@${relative}${kind === "dir" ? "/" : ""} `;
      const span = atToken.current ?? {
        start: draft.length,
        end: draft.length,
      };
      setDraft(draft.slice(0, span.start) + token + draft.slice(span.end));
      queueMicrotask(focus);
    };

    const removeAtFileToken = (start: number, end: number) => {
      if (disabled) return;
      setDraft(draft.slice(0, start) + draft.slice(end));
    };

    const insertAtCursor = (text: string) => {
      if (disabled) return;
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? draft.length;
      const end = textarea?.selectionEnd ?? start;
      const next = draft.slice(0, start) + text + draft.slice(end);
      setDraftState(next);
      onValueChange?.(next);
      emitSlashQuery(next);
      const caret = start + text.length;
      emitAtQuery(next, caret);
      queueMicrotask(() => {
        const element = textareaRef.current;
        if (!element) return;
        element.focus();
        element.setSelectionRange(caret, caret);
      });
    };

    useImperativeHandle(ref, () => ({
      acceptSlashCommand,
      acceptAtFileReference,
      setDraft,
      insertAtCursor,
      removeAtFileToken,
      clearAtQuery,
      focus,
      autoGrow,
    }));

    const onInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = event.target;
      setDraftState(textarea.value);
      onValueChange?.(textarea.value);
      emitSlashQuery(textarea.value);
      emitAtQuery(textarea.value, textarea.selectionStart);
    };

    const onKeydown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (atFileEnabled && atToken.current && !event.nativeEvent.isComposing) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          onAtNavigate?.(1);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          onAtNavigate?.(-1);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          clearAtQuery();
          onAtDismiss?.();
          return;
        }
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onAtPick?.();
          return;
        }
      }
      if (event.key !== "Enter" || event.shiftKey) return;
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      submit();
    };

    const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submit();
    };

    return (
      <form
        className={`dcf-chat-composer${running ? " dcf-chat-composer--running" : ""}${disabled ? " dcf-chat-composer--disabled" : ""}`}
        aria-busy={running}
        onSubmit={onFormSubmit}
      >
        <label className="dcf-chat-composer__label" htmlFor={textareaId}>
          {t("agent.chat.composer.message.label", "Message")}
        </label>
        <textarea
          ref={textareaRef}
          className="dcf-chat-composer__input"
          id={textareaId}
          value={draft}
          rows={minRows}
          placeholder={
            placeholder ??
            t("agent.chat.composer.message.placeholder", "Type a message…")
          }
          aria-label={t(
            "agent.chat.composer.message.placeholder",
            "Type a message…"
          )}
          disabled={inputDisabled}
          onChange={onInput}
          onKeyDown={onKeydown}
        />

        <div className="dcf-chat-composer__actions">
          <span className="dcf-chat-composer__hint" aria-live="polite">
            {t(hintKey, hintFallback)}
          </span>

          {running ? (
            <button
              type="button"
              className="dcf-chat-composer__action dcf-chat-composer__action--stop"
              data-action="stop"
              disabled={!canStop}
              aria-label={t("agent.chat.composer.stop", "Stop response")}
              title={t("agent.chat.composer.stop", "Stop response")}
              onClick={submit}
            >
              <ChatIcon name="stop" size={16} />
              <span>{t("agent.chat.composer.stop", "Stop response")}</span>
            </button>
          ) : (
            <button
              type="button"
              className="dcf-chat-composer__action dcf-chat-composer__action--send"
              data-action="send"
              disabled={!canSend}
              aria-label={t("agent.chat.composer.send", "Send")}
              title={t("agent.chat.composer.send", "Send")}
              onClick={submit}
            >
              <ChatIcon name="send" size={16} />
              <span>{t("agent.chat.composer.send", "Send")}</span>
            </button>
          )}
        </div>

        {children}
      </form>
    );
  }
);

/**
 * @description Named alias of {@link ChatComposer} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatComposerComponent = ChatComposer;
