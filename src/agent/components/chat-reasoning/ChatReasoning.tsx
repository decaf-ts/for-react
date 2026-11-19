/**
 * @file
 * @summary Collapsible reasoning/thinking block with streaming state.
 * @description Renders the `ChatReasoning` agent chat component and its props contract.
 */
import React, { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatReasoning}.
 * @summary Declares every input the ChatReasoning component understands.
 * @memberOf module:for-react.agent
 * @property {string} [title] - Title text.
 * @property {string} [content] - Content rendered by the artifact or message.
 * @property {boolean} [open] - Whether the surface is open.
 * @property {boolean} [streaming] - Whether content is still streaming.
 * @property {boolean} [inline] - Whether the reasoning block renders inline.
 * @property {string} [meta] - Supporting metadata line.
 * @property {function} [onToggle] - Called when the expanded state changes.
 * @property {ReactNode} [children] - Child content rendered by the component.
 */
export interface ChatReasoningProps {
  title?: string | null;
  content?: string;
  open?: boolean;
  streaming?: boolean;
  inline?: boolean;
  meta?: string | null;
  onToggle?: (open: boolean) => void;
  children?: ReactNode;
}

/**
 * @description Collapsible reasoning/thinking block with streaming state.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatReasoning({
  title = null,
  content = "",
  open = false,
  streaming = false,
  inline = false,
  meta = null,
  onToggle,
  children,
}: ChatReasoningProps) {
  const t = useAgentTranslate();
  const contentId = useId();
  const [isOpen, setIsOpen] = useState(open);
  const previousOpen = useRef(open);

  useEffect(() => {
    if (previousOpen.current !== open) {
      previousOpen.current = open;
      setIsOpen(open);
    }
  }, [open]);

  const setOpen = (next: boolean) => {
    previousOpen.current = next;
    setIsOpen(next);
    onToggle?.(next);
  };

  const resolvedTitle = title ?? t("agent.chat.reasoning.title", "Reasoning");

  return (
    <section
      className={`dcf-chat-reasoning${inline ? " dcf-chat-reasoning--inline" : " dcf-chat-reasoning--standalone"}${isOpen ? " dcf-chat-reasoning--open" : ""}`}
    >
      <button
        type="button"
        className="dcf-chat-reasoning__trigger"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setOpen(!isOpen)}
      >
        <ChatIcon name="sparkles" size={16} />
        <span className="dcf-chat-reasoning__title">{resolvedTitle}</span>
        {meta ? <span className="dcf-chat-reasoning__meta">{meta}</span> : null}
        {streaming ? (
          <span className="dcf-chat-reasoning__streaming">
            {t("agent.chat.reasoning.streaming", "Thinking…")}
          </span>
        ) : null}
        <ChatIcon
          className="dcf-chat-reasoning__chevron"
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
        />
      </button>

      {isOpen ? (
        <div
          className="dcf-chat-reasoning__content"
          id={contentId}
          role="region"
          aria-label={resolvedTitle}
        >
          {children}
          {content ? <p className="dcf-chat-reasoning__text">{content}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatReasoning} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatReasoningComponent = ChatReasoning;
