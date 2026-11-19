/**
 * @file
 * @summary Artifact frame with title, visibility, actions and close affordance.
 * @description Renders the `ChatArtifact` agent chat component and its props contract.
 */
import React, { type ReactNode } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatArtifactKind,
  AgentChatArtifactVisibility,
} from "../../types.js";
import { safeMediaUrl } from "../../utils/agentMediaUrl.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

const KIND_ICONS: Record<AgentChatArtifactKind, string> = {
  text: "file",
  code: "pencil",
  image: "image",
  sheet: "box",
};

const VISIBILITY_ICONS: Record<AgentChatArtifactVisibility, string> = {
  private: "user",
  shared: "file",
  public: "bot",
};

/**
 * @description Props accepted by {@link ChatArtifact}.
 * @summary Declares every input the ChatArtifact component understands.
 * @memberOf module:for-react.agent
 * @property {string} [title] - Title text.
 * @property {AgentChatArtifactKind} [kind] - Artifact kind rendered by the component.
 * @property {AgentChatArtifactVisibility} [visibility] - Visibility scope.
 * @property {boolean} [streaming] - Whether content is still streaming.
 * @property {string} [content] - Content rendered by the artifact or message.
 * @property {string} [imageAlt] - Alternative text for the rendered image.
 * @property {boolean} [closable] - Whether the close affordance is shown.
 * @property {ReactNode} [actions] - Action labels rendered on the message, or a custom action node.
 * @property {ReactNode} [children] - Child content rendered by the component.
 * @property {function} [onClose] - Called when the component requests to close.
 */
export interface ChatArtifactProps {
  title?: string;
  kind?: AgentChatArtifactKind;
  visibility?: AgentChatArtifactVisibility;
  streaming?: boolean;
  content?: string | null;
  imageAlt?: string | null;
  closable?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
  onClose?: () => void;
}

/**
 * @description Artifact frame with title, visibility, actions and close affordance.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatArtifact({
  title = "",
  kind = "text",
  visibility = "private",
  streaming = false,
  content = null,
  imageAlt = null,
  closable = true,
  actions,
  children,
  onClose,
}: ChatArtifactProps) {
  const t = useAgentTranslate();
  const heading = title || t("agent.chat.artifact.untitled", "Untitled artifact");
  const imageUrl = kind === "image" ? safeMediaUrl(content) : null;
  const hasMedia = kind === "image" && Boolean(content);

  return (
    <aside
      className={`dcf-chat-artifact${streaming ? " dcf-chat-artifact--streaming" : ""}`}
      aria-busy={streaming ? "true" : undefined}
      aria-label={heading}
    >
      <header className="dcf-chat-artifact__header">
        <span className="dcf-chat-artifact__kind" data-kind={kind}>
          <ChatIcon name={KIND_ICONS[kind]} size={14} />
          {t(`agent.chat.artifact.kind.${kind}`, kind)}
        </span>
        <h3 className="dcf-chat-artifact__title">{heading}</h3>
        <div className="dcf-chat-artifact__actions">
          {actions}
          <span className="dcf-chat-artifact__visibility" data-visibility={visibility}>
            <ChatIcon name={VISIBILITY_ICONS[visibility]} size={12} />
            {t(`agent.chat.artifact.visibility.${visibility}`, visibility)}
          </span>
          {closable ? (
            <button
              type="button"
              className="dcf-chat-artifact__close"
              aria-label={t("agent.chat.artifact.close", "Close artifact")}
              onClick={() => onClose?.()}
            >
              <ChatIcon name="x" size={15} />
            </button>
          ) : null}
        </div>
      </header>

      <div className="dcf-chat-artifact__body">
        {hasMedia ? (
          imageUrl ? (
            <img
              className="dcf-chat-artifact__image"
              src={imageUrl}
              alt={
                imageAlt ||
                title ||
                t("agent.chat.artifact.imageAlt", "Artifact preview")
              }
            />
          ) : (
            <p className="dcf-chat-artifact__content" role="status">
              {t(
                "agent.chat.artifact.imageUnavailable",
                "Image preview unavailable."
              )}
            </p>
          )
        ) : content !== null && content !== "" ? (
          <pre className="dcf-chat-artifact__content" tabIndex={0}>
            {content}
          </pre>
        ) : (
          children
        )}
      </div>

      {streaming ? (
        <footer className="dcf-chat-artifact__footer" aria-live="polite">
          <ChatIcon name="loader" size={13} />
          {t("agent.chat.artifact.streaming", "Streaming content…")}
        </footer>
      ) : null}
    </aside>
  );
}

/**
 * @description Named alias of {@link ChatArtifact} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatArtifactComponent = ChatArtifact;
