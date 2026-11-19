/**
 * @file
 * @summary Conversation visibility selector.
 * @description Renders the `ChatVisibilitySelector` agent chat component and its props contract.
 */
import React, { useEffect, useRef, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatVisibility } from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

const VISIBILITIES: AgentChatVisibility[] = ["private", "shared"];

function fallbackFor(visibility: AgentChatVisibility): string {
  return visibility === "shared" ? "Shared" : "Private";
}

/**
 * @description Props accepted by {@link ChatVisibilitySelector}.
 * @summary Declares every input the ChatVisibilitySelector component understands.
 * @memberOf module:for-react.agent
 * @property {AgentChatVisibility} [visibility] - Visibility scope.
 * @property {boolean} [disabled] - Whether the control is disabled.
 * @property {boolean} [optimistic] - Whether to change the visibility optimistically.
 * @property {function} [onVisibilityChange] - Called when the visibility changes.
 */
export interface ChatVisibilitySelectorProps {
  visibility?: AgentChatVisibility;
  disabled?: boolean;
  optimistic?: boolean;
  onVisibilityChange?: (visibility: AgentChatVisibility) => void;
}

/**
 * @description Conversation visibility selector.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatVisibilitySelector({
  visibility = "private",
  disabled = false,
  optimistic = true,
  onVisibilityChange,
}: ChatVisibilitySelectorProps) {
  const t = useAgentTranslate();
  const hostRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<AgentChatVisibility>(visibility);

  useEffect(() => {
    setCurrent(visibility);
  }, [visibility]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && hostRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  });

  const select = (next: AgentChatVisibility) => {
    if (disabled) return;
    setIsOpen(false);
    if (next === current) return;
    if (optimistic) setCurrent(next);
    onVisibilityChange?.(next);
  };

  return (
    <div className="dcf-chat-visibility-selector" ref={hostRef}>
      <button
        type="button"
        className="dcf-chat-visibility-selector__trigger"
        data-action="trigger"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => {
          if (disabled) return;
          setIsOpen((open) => !open);
        }}
      >
        <span className="dcf-chat-visibility-selector__label">
          {t("agent.chat.visibility.label", "Conversation visibility")}:
        </span>
        <span className="dcf-chat-visibility-selector__value">
          {t(`agent.chat.visibility.${current}`, fallbackFor(current))}
        </span>
        <ChatIcon name="chevron-down" size={14} />
      </button>

      {isOpen ? (
        <div
          className="dcf-chat-visibility-selector__panel"
          role="listbox"
          aria-label={t("agent.chat.visibility.label", "Conversation visibility")}
        >
          {VISIBILITIES.map((option) => (
            <button
              type="button"
              className={`dcf-chat-visibility-selector__option${current === option ? " dcf-chat-visibility-selector__option--active" : ""}`}
              role="option"
              aria-selected={current === option}
              data-visibility={option}
              key={option}
              onClick={() => select(option)}
            >
              <span className="dcf-chat-visibility-selector__name">
                {t(`agent.chat.visibility.${option}`, fallbackFor(option))}
              </span>
              <span className="dcf-chat-visibility-selector__hint">
                {option === "shared"
                  ? t(
                      "agent.chat.visibility.sharedHint",
                      "Anyone with the link can see this conversation."
                    )
                  : t(
                      "agent.chat.visibility.privateHint",
                      "Only you can see this conversation."
                    )}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @description Named alias of {@link ChatVisibilitySelector} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatVisibilitySelectorComponent = ChatVisibilitySelector;
