/**
 * @file
 * @summary Shipment tracker tool result card with progress.
 * @description Renders the `ChatToolTracker` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatTrackerStatus } from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatToolTracker}.
 * @summary Declares every input the ChatToolTracker component understands.
 * @memberOf module:for-react.agent
 * @property {AgentChatTrackerStatus} [status] - Component-specific status value.
 * @property {number | string} [progress] - Completion percentage.
 * @property {string} [label] - Label text.
 * @property {string} [description] - Supporting description text.
 */
export interface ChatToolTrackerProps {
  status?: AgentChatTrackerStatus;
  progress?: number | null;
  label?: string | null;
  description?: string | null;
}

interface TrackerStepView {
  readonly id: "box" | "gps" | "home";
  readonly icon: string;
  readonly threshold: number;
  readonly labelFallback: string;
}

const TRACKER_STEPS: TrackerStepView[] = [
  { id: "box", icon: "box", threshold: 34, labelFallback: "Order packed" },
  { id: "gps", icon: "gps", threshold: 71, labelFallback: "In transit" },
  { id: "home", icon: "home", threshold: 100, labelFallback: "Delivered" },
];

const TRACKER_PROGRESS: Record<AgentChatTrackerStatus, number> = {
  ordered: 34,
  shipped: 71,
  delivered: 100,
  cancelled: 0,
};

function statusIndex(status: AgentChatTrackerStatus): number {
  switch (status) {
    case "ordered":
      return 0;
    case "shipped":
      return 1;
    case "delivered":
      return 2;
    default:
      return -1;
  }
}

function statusFallbackOf(status: AgentChatTrackerStatus): string {
  switch (status) {
    case "ordered":
      return "Order confirmed";
    case "shipped":
      return "On the way";
    case "delivered":
      return "Delivered";
    default:
      return "Cancelled";
  }
}

function descriptionFallbackOf(status: AgentChatTrackerStatus): string {
  switch (status) {
    case "ordered":
      return "Your parcel has been packed and is waiting for the courier.";
    case "shipped":
      return "The courier picked up your parcel and it is heading your way.";
    case "delivered":
      return "Your parcel was delivered. Thanks for shopping with us.";
    default:
      return "This delivery was cancelled.";
  }
}

/**
 * @description Shipment tracker tool result card with progress.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatToolTracker({
  status = "ordered",
  progress = null,
  label = null,
  description = null,
}: ChatToolTrackerProps) {
  const t = useAgentTranslate();
  const progressValue =
    progress !== null
      ? Math.min(100, Math.max(0, progress))
      : TRACKER_PROGRESS[status];
  const index = statusIndex(status);
  const statusFallback = statusFallbackOf(status);
  const descriptionFallback = descriptionFallbackOf(status);
  const title = t("agent.chat.tool.tracker.title", "Shipment tracking");

  const stepState = (stepIndex: number): string => {
    if (status === "cancelled") return "cancelled";
    const step = TRACKER_STEPS[stepIndex];
    if (progressValue >= step.threshold) return "complete";
    if (index + 1 === stepIndex) return "active";
    return "pending";
  };

  return (
    <section
      className="dcf-chat-tool-tracker"
      data-status={status}
      aria-label={label || title}
    >
      <header className="dcf-chat-tool-tracker__header">
        <ChatIcon name="gps" size={16} />
        <h3 className="dcf-chat-tool-tracker__title">{title}</h3>
        <span className="dcf-chat-tool-tracker__status">
          {t(`agent.chat.tool.tracker.status.${status}`, statusFallback)}
        </span>
      </header>

      <div className="dcf-chat-tool-tracker__timeline">
        {TRACKER_STEPS.map((step, stepIndex) => (
          <React.Fragment key={step.id}>
            <div
              className="dcf-chat-tool-tracker__step"
              data-step={step.id}
              data-state={stepState(stepIndex)}
            >
              <span className="dcf-chat-tool-tracker__node" aria-hidden="true">
                <ChatIcon name={step.icon} size={18} />
              </span>
              <span className="dcf-chat-tool-tracker__step-label">
                {t(
                  `agent.chat.tool.tracker.step.${step.id}`,
                  step.labelFallback
                )}
              </span>
            </div>
            {stepIndex < TRACKER_STEPS.length - 1 ? (
              <div
                className="dcf-chat-tool-tracker__connector"
                aria-hidden="true"
              >
                <span
                  className="dcf-chat-tool-tracker__connector-fill"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
            ) : null}
          </React.Fragment>
        ))}
      </div>

      <div
        className="dcf-chat-tool-tracker__progress"
        role="progressbar"
        aria-label={t(
          "agent.chat.tool.tracker.progress",
          "Shipment progress"
        )}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressValue}
        aria-valuetext={`${progressValue}%`}
      >
        <span
          className="dcf-chat-tool-tracker__progress-fill"
          style={{ width: `${progressValue}%` }}
        />
      </div>

      <footer className="dcf-chat-tool-tracker__footer">
        <span className="dcf-chat-tool-tracker__progress-label">
          {label
            ? label
            : `${progressValue}% · ${t(
                `agent.chat.tool.tracker.status.${status}`,
                statusFallback
              )}`}
        </span>
        <p className="dcf-chat-tool-tracker__description">
          {description ||
            t(
              `agent.chat.tool.tracker.description.${status}`,
              descriptionFallback
            )}
        </p>
      </footer>
    </section>
  );
}

/**
 * @description Named alias of {@link ChatToolTracker} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatToolTrackerComponent = ChatToolTracker;
