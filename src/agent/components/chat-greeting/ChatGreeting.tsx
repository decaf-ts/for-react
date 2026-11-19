/**
 * @file
 * @summary Greeting or informational empty-state card.
 * @description Renders the `ChatGreeting` agent chat component and its props contract.
 */
import React, { type MouseEvent, type ReactNode } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";
import { safeHref } from "../../../lib/pipes/safe-html.js";

/**
 * @description Props accepted by {@link ChatGreeting}.
 * @summary Declares every input the ChatGreeting component understands.
 * @memberOf module:for-react.agent
 * @property {string} [variant] - Component presentation variant.
 * @property {string} [title] - Title text.
 * @property {string} [message] - Message content or view rendered by the component.
 * @property {string} [icon] - Icon name.
 * @property {number} [iconSize] - Icon size in pixels.
 * @property {string} [linkHref] - Link target, validated with `safeHref`; a rejected scheme renders no link.
 * @property {string} [linkLabel] - Link label.
 * @property {boolean} [animated] - Whether the entrance animation runs.
 * @property {string} [className] - Extra CSS class name.
 * @property {function} [onLinkClick] - Called when the link is clicked.
 * @property {ReactNode} [children] - Child content rendered by the component.
 */
export interface ChatGreetingProps {
  variant?: "greeting" | "info";
  title?: string | null;
  message?: string | null;
  icon?: string;
  iconSize?: number;
  linkHref?: string | null;
  linkLabel?: string | null;
  animated?: boolean;
  className?: string;
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children?: ReactNode;
}

/**
 * @description Greeting or informational empty-state card.
 * @summary React component for the agent chat surface. `linkHref` is validated
 * with `safeHref`; when the URL is rejected (for example a `javascript:` or
 * `data:` scheme, or a value containing control characters) no link is
 * rendered and no navigation is possible.
 * @memberOf module:for-react.agent
 */
export function ChatGreeting({
  variant = "greeting",
  title = null,
  message = null,
  icon = "sparkles",
  iconSize = 28,
  linkHref = null,
  linkLabel = null,
  animated = true,
  className,
  onLinkClick,
  children,
}: ChatGreetingProps) {
  const t = useAgentTranslate();
  const href = safeHref(linkHref);
  const variantClass =
    variant === "info"
      ? " dcf-chat-greeting--info"
      : animated
        ? " dcf-chat-greeting--animated"
        : "";
  return (
    <section
      className={`dcf-chat-greeting${variantClass}${className ? ` ${className}` : ""}`}
      role="note"
      aria-label={title ?? t("agent.chat.greeting.title", "How can I help?")}
    >
      {variant === "info" ? (
        <span className="dcf-chat-greeting__icon" aria-hidden="true">
          <ChatIcon name={icon} size={iconSize} />
        </span>
      ) : null}

      <h2 className="dcf-chat-greeting__title">
        {title ?? t("agent.chat.greeting.title", "How can I help?")}
      </h2>
      <p className="dcf-chat-greeting__message">
        {message ??
          t(
            "agent.chat.greeting.message",
            "Ask a question, attach a file, or pick a suggestion to get started."
          )}
      </p>

      {children}

      {href ? (
        <a
          className="dcf-chat-greeting__link"
          href={href}
          onClick={(event) => onLinkClick?.(event)}
        >
          <span>{linkLabel ?? t("agent.chat.greeting.link", "Learn more")}</span>
          <ChatIcon name="chevron-down" size={14} />
        </a>
      ) : null}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatGreeting} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatGreetingComponent = ChatGreeting;
