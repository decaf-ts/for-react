/**
 * @file
 * @summary Progress strip rendering run progress events.
 * @description Renders the `ChatProgress` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatProgressEvent } from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatProgress}.
 * @summary Declares every input the ChatProgress component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [events] - Progress events rendered by the strip.
 */
export interface ChatProgressProps {
  events?: AgentChatProgressEvent[];
}

/**
 * @description Progress strip rendering run progress events.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatProgress({ events = [] }: ChatProgressProps) {
  const t = useAgentTranslate();
  const current = events.length ? events[events.length - 1] : null;
  const percent =
    current && current.total && current.total > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(((current.value ?? 0) / current.total) * 100)
          )
        )
      : null;
  const isDone = current
    ? current.done === true || percent === 100
    : false;
  const labelKey = current?.labelKey ?? "agent.chat.progress.label";
  const labelFallback = current?.label ?? "Working…";

  return (
    <section
      className="dcf-chat-progress"
      role="status"
      aria-live="polite"
      data-done={isDone ? "true" : undefined}
      aria-label={t("agent.chat.progress.title", "Progress")}
    >
      {current ? (
        <>
          <div className="dcf-chat-progress__row">
            <span
              className={`dcf-chat-progress__icon${isDone ? " dcf-chat-progress__icon--done" : ""}`}
              aria-hidden="true"
            >
              <ChatIcon name={isDone ? "check" : "loader"} size={15} />
            </span>
            <span className="dcf-chat-progress__label">
              {t(labelKey, labelFallback)}
            </span>
            {percent !== null ? (
              <span className="dcf-chat-progress__percent">{percent}%</span>
            ) : null}
          </div>
          {percent !== null ? (
            <div
              className="dcf-chat-progress__track"
              role="progressbar"
              aria-label={t(labelKey, labelFallback)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <span
                className="dcf-chat-progress__fill"
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : null}
          {current.message ? (
            <p className="dcf-chat-progress__message">{current.message}</p>
          ) : null}
        </>
      ) : (
        <p className="dcf-chat-progress__empty">
          {t("agent.chat.progress.empty", "Waiting for progress…")}
        </p>
      )}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatProgress} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatProgressComponent = ChatProgress;
