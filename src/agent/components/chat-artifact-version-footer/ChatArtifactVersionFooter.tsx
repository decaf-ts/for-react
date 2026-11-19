/**
 * @file
 * @summary Version pager rendered below an artifact.
 * @description Renders the `ChatArtifactVersionFooter` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatArtifactVersionEntry } from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatArtifactVersionFooter}.
 * @summary Declares every input the ChatArtifactVersionFooter component understands.
 * @memberOf module:for-react.agent
 * @property {number} [currentVersion] - Version currently selected.
 * @property {number} [totalVersions] - Total number of versions.
 * @property {Array} [versions] - Artifact version entries.
 * @property {function} [onVersionChange] - Called when the selected version changes.
 */
export interface ChatArtifactVersionFooterProps {
  currentVersion?: number;
  totalVersions?: number;
  versions?: AgentChatArtifactVersionEntry[];
  onVersionChange?: (version: number) => void;
}

/**
 * @description Version pager rendered below an artifact.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatArtifactVersionFooter({
  currentVersion = 1,
  totalVersions = 1,
  versions = [],
  onVersionChange,
}: ChatArtifactVersionFooterProps) {
  const t = useAgentTranslate();
  const total = Math.max(1, versions.length || totalVersions);
  const current = Math.min(Math.max(1, Math.floor(currentVersion)), total);
  const canGoOlder = current > 1;
  const canGoNewer = current < total;
  const activeLabel = versions.length
    ? versions[current - 1]?.label ?? null
    : null;

  const goOlder = () => {
    if (!canGoOlder) return;
    onVersionChange?.(current - 1);
  };

  const goNewer = () => {
    if (!canGoNewer) return;
    onVersionChange?.(current + 1);
  };

  const currentLabel = t("agent.chat.artifact.version.current", "Version");
  const ofLabel = t("agent.chat.artifact.version.of", "of");

  return (
    <footer
      className="dcf-chat-artifact-version-footer"
      role="navigation"
      aria-label={t("agent.chat.artifact.version.label", "Artifact versions")}
    >
      <button
        type="button"
        className="dcf-chat-artifact-version-footer__button"
        disabled={!canGoOlder}
        onClick={goOlder}
        aria-label={t("agent.chat.artifact.version.older", "Older version")}
      >
        <ChatIcon name="chevron-up" size={14} />
        <span className="dcf-chat-artifact-version-footer__button-label">
          {t("agent.chat.artifact.version.older", "Older")}
        </span>
      </button>

      <div className="dcf-chat-artifact-version-footer__status">
        <span
          className="dcf-chat-artifact-version-footer__count"
          aria-label={`${currentLabel} ${current} ${ofLabel} ${total}`}
        >
          {currentLabel} {current} {ofLabel} {total}
        </span>
        {activeLabel ? (
          <span className="dcf-chat-artifact-version-footer__label">
            {activeLabel}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        className="dcf-chat-artifact-version-footer__button"
        disabled={!canGoNewer}
        onClick={goNewer}
        aria-label={t("agent.chat.artifact.version.newer", "Newer version")}
      >
        <span className="dcf-chat-artifact-version-footer__button-label">
          {t("agent.chat.artifact.version.newer", "Newer")}
        </span>
        <ChatIcon name="chevron-down" size={14} />
      </button>
    </footer>
  );
}

/**
 * @description Named alias of {@link ChatArtifactVersionFooter} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatArtifactVersionFooterComponent = ChatArtifactVersionFooter;
