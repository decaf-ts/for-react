/**
 * @file
 * @summary Loading skeleton for artifact content.
 * @description Renders the `ChatArtifactSkeleton` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";

/**
 * @description Skeleton size variant: `full` fills the artifact body, `inline`
 * renders a compact row.
 * @memberOf module:for-react.agent
 */
export type ChatArtifactSkeletonVariant = "full" | "inline";

/**
 * @description Props accepted by {@link ChatArtifactSkeleton}.
 * @summary Declares every input the ChatArtifactSkeleton component understands.
 * @memberOf module:for-react.agent
 * @property {ChatArtifactSkeletonVariant} [variant] - Component presentation variant.
 * @property {number} [lines] - Number of skeleton lines.
 * @property {string} [label] - Label text.
 */
export interface ChatArtifactSkeletonProps {
  variant?: ChatArtifactSkeletonVariant;
  lines?: number;
  label?: string | null;
}

/**
 * @description Loading skeleton for artifact content.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatArtifactSkeleton({
  variant = "full",
  lines = 4,
  label = null,
}: ChatArtifactSkeletonProps) {
  const t = useAgentTranslate();
  const count = Math.max(1, Math.floor(lines));
  const lineRange = Array.from({ length: count }, (_, index) => index);

  if (variant === "inline") {
    const inlineLabel = label || t("agent.chat.artifact.skeleton.inline", "Loading artifact…");
    return (
      <div
        className="dcf-chat-artifact-skeleton dcf-chat-artifact-skeleton--inline"
        role="status"
        aria-busy="true"
        aria-label={inlineLabel}
      >
        <span
          className="dcf-chat-artifact-skeleton__bar dcf-chat-artifact-skeleton__bar--inline"
          aria-hidden="true"
        />
        <span className="dcf-chat-artifact-skeleton__label">{inlineLabel}</span>
      </div>
    );
  }

  const fullLabel =
    label || t("agent.chat.artifact.skeleton.full", "Loading artifact panel…");

  return (
    <div
      className="dcf-chat-artifact-skeleton dcf-chat-artifact-skeleton--full"
      role="status"
      aria-busy="true"
      aria-label={fullLabel}
    >
      <div className="dcf-chat-artifact-skeleton__header" aria-hidden="true">
        <span className="dcf-chat-artifact-skeleton__bar dcf-chat-artifact-skeleton__bar--badge" />
        <span className="dcf-chat-artifact-skeleton__bar dcf-chat-artifact-skeleton__bar--title" />
        <span className="dcf-chat-artifact-skeleton__bar dcf-chat-artifact-skeleton__bar--action" />
      </div>
      <div className="dcf-chat-artifact-skeleton__body" aria-hidden="true">
        {lineRange.map((line) => (
          <span
            className="dcf-chat-artifact-skeleton__bar dcf-chat-artifact-skeleton__bar--line"
            style={{
              width: `${line % 3 === 0 ? 62 : line % 2 === 0 ? 88 : 100}%`,
            }}
            key={line}
          />
        ))}
      </div>
      <span className="dcf-chat-artifact-skeleton__label">{fullLabel}</span>
    </div>
  );
}

/**
 * @description Named alias of {@link ChatArtifactSkeleton} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatArtifactSkeletonComponent = ChatArtifactSkeleton;
