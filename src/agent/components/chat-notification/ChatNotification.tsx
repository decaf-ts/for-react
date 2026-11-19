/**
 * @file
 * @summary Toast stack for agent notifications with auto-dismiss and actions.
 * @description Renders the `ChatNotification` agent chat component and its props contract.
 */
import React, { useEffect, useRef, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatNotification,
  AgentChatNotificationSeverity,
} from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

const DEFAULT_AUTO_DISMISS_MS = 6000;

const SEVERITY_ICONS: Record<AgentChatNotificationSeverity, string> = {
  info: "info",
  success: "check",
  warning: "info",
  error: "x",
};

function severityOf(
  notification: AgentChatNotification
): AgentChatNotificationSeverity {
  return notification.severity ?? "info";
}

function iconOf(notification: AgentChatNotification): string {
  return SEVERITY_ICONS[severityOf(notification)];
}

/**
 * @description Props accepted by {@link ChatNotification}.
 * @summary Declares every input the ChatNotification component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [notifications] - Toast notifications rendered by the stack.
 * @property {number} [autoDismissMs] - Auto-dismiss delay in milliseconds.
 * @property {boolean} [dismissible] - Whether notifications can be dismissed.
 * @property {function} [onDismissed] - Called when a notification is dismissed.
 * @property {function} [onAction] - Called when a notification action is triggered.
 */
export interface ChatNotificationProps {
  notifications?: AgentChatNotification[];
  autoDismissMs?: number;
  dismissible?: boolean;
  onDismissed?: (id: string) => void;
  onAction?: (id: string) => void;
}

/**
 * @description Toast stack for agent notifications with auto-dismiss and actions.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatNotification({
  notifications = [],
  autoDismissMs = DEFAULT_AUTO_DISMISS_MS,
  dismissible = true,
  onDismissed,
  onAction,
}: ChatNotificationProps) {
  const t = useAgentTranslate();
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = (id: string) => {
    setDismissedIds((ids) => {
      if (ids.has(id)) return ids;
      return new Set([...ids, id]);
    });
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    onDismissed?.(id);
  };

  useEffect(() => {
    const activeIds = new Set(notifications.map((entry) => entry.id));
    for (const [id, timer] of timers.current) {
      if (!activeIds.has(id) || dismissedIds.has(id)) {
        clearTimeout(timer);
        timers.current.delete(id);
      }
    }
    for (const notification of notifications) {
      if (dismissedIds.has(notification.id) || timers.current.has(notification.id)) {
        continue;
      }
      const delay = notification.autoDismissMs ?? autoDismissMs;
      if (delay <= 0) continue;
      const timer = setTimeout(() => {
        timers.current.delete(notification.id);
        dismiss(notification.id);
      }, delay);
      timers.current.set(notification.id, timer);
    }
  }, [notifications, dismissedIds, autoDismissMs]);

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    []
  );

  const visible = notifications.filter(
    (notification) => !dismissedIds.has(notification.id)
  );

  return (
    <section
      className="dcf-chat-notifications"
      role="status"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions"
      aria-label={t("agent.chat.notification.label", "Notifications")}
    >
      {visible.map((notification) => {
        const severity = severityOf(notification);
        return (
          <article
            className={`dcf-chat-notification dcf-chat-notification--${severity}`}
            data-severity={severity}
            key={notification.id}
          >
            <span className="dcf-chat-notification__icon" aria-hidden="true">
              <ChatIcon name={iconOf(notification)} size={16} />
            </span>
            <div className="dcf-chat-notification__body">
              {notification.title ? (
                <p className="dcf-chat-notification__title">
                  {notification.title}
                </p>
              ) : null}
              <p className="dcf-chat-notification__message">
                {notification.message}
              </p>
            </div>
            {notification.actionLabel ? (
              <button
                type="button"
                className="dcf-chat-notification__action"
                onClick={() => onAction?.(notification.id)}
              >
                {notification.actionLabel}
              </button>
            ) : null}
            {dismissible ? (
              <button
                type="button"
                className="dcf-chat-notification__close"
                onClick={() => dismiss(notification.id)}
                aria-label={t(
                  "agent.chat.notification.dismiss",
                  "Dismiss notification"
                )}
              >
                <ChatIcon name="x" size={14} />
              </button>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatNotification} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatNotificationComponent = ChatNotification;
