/**
 * @file
 * @summary Artifact tool selector rendered above the artifact body.
 * @description Renders the `ChatArtifactToolbar` agent chat component and its props contract.
 */
import React, { useEffect, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatArtifactKind,
  AgentChatArtifactTool,
} from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Default artifact tools offered by {@link ChatArtifactToolbar}.
 * @summary The canonical code/markdown/image/document tool list.
 * @memberOf module:for-react.agent
 */
export const DEFAULT_AGENT_CHAT_ARTIFACT_TOOLS: AgentChatArtifactTool[] = [
  { kind: "text", icon: "file" },
  { kind: "code", icon: "pencil" },
  { kind: "image", icon: "image" },
  { kind: "sheet", icon: "box" },
];

const KIND_ICONS: Record<AgentChatArtifactKind, string> = {
  text: "file",
  code: "pencil",
  image: "image",
  sheet: "box",
};

/**
 * @description Props accepted by {@link ChatArtifactToolbar}.
 * @summary Declares every input the ChatArtifactToolbar component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [tools] - Artifact tools rendered by the toolbar.
 * @property {AgentChatArtifactKind | string} [selected] - Currently selected artifact kind.
 * @property {boolean} [disabled] - Whether the control is disabled.
 * @property {function} [onToolSelected] - Called when an artifact tool is selected.
 */
export interface ChatArtifactToolbarProps {
  tools?: AgentChatArtifactTool[];
  selected?: AgentChatArtifactKind | null;
  disabled?: boolean;
  onToolSelected?: (kind: AgentChatArtifactKind) => void;
}

/**
 * @description Artifact tool selector rendered above the artifact body.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatArtifactToolbar({
  tools = DEFAULT_AGENT_CHAT_ARTIFACT_TOOLS,
  selected = null,
  disabled = false,
  onToolSelected,
}: ChatArtifactToolbarProps) {
  const t = useAgentTranslate();
  const [internalSelected, setInternalSelected] =
    useState<AgentChatArtifactKind | null>(null);

  useEffect(() => {
    setInternalSelected(null);
  }, [selected]);

  const active = selected ?? internalSelected;

  return (
    <div
      className="dcf-chat-artifact-toolbar"
      role="toolbar"
      aria-label={t("agent.chat.artifact.toolbar.label", "Artifact tools")}
      aria-disabled={disabled ? "true" : undefined}
    >
      {tools.map((tool) => (
        <button
          type="button"
          className={`dcf-chat-artifact-toolbar__tool${active === tool.kind ? " dcf-chat-artifact-toolbar__tool--active" : ""}`}
          aria-pressed={active === tool.kind}
          data-kind={tool.kind}
          disabled={disabled || tool.disabled}
          key={tool.kind}
          onClick={() => {
            if (disabled || tool.disabled) return;
            setInternalSelected(tool.kind);
            onToolSelected?.(tool.kind);
          }}
        >
          <ChatIcon name={tool.icon ?? KIND_ICONS[tool.kind]} size={14} />
          <span className="dcf-chat-artifact-toolbar__label">
            {t(
              tool.labelKey ?? `agent.chat.artifact.toolbar.${tool.kind}`,
              tool.kind
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * @description Named alias of {@link ChatArtifactToolbar} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatArtifactToolbarComponent = ChatArtifactToolbar;
