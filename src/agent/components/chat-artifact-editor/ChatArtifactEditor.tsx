/**
 * @file
 * @summary Editable artifact surface for code, markdown, images and generic content.
 * @description Renders the `ChatArtifactEditor` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatArtifactKind } from "../../types.js";
import { safeMediaUrl } from "../../utils/agentMediaUrl.js";
import { CodeEditor } from "../../../code-editor/public-api.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

const KIND_ICONS: Record<AgentChatArtifactKind, string> = {
  text: "file",
  code: "pencil",
  image: "image",
  sheet: "box",
};

/**
 * @description Props accepted by {@link ChatArtifactEditor}.
 * @summary Declares every input the ChatArtifactEditor component understands.
 * @memberOf module:for-react.agent
 * @property {AgentChatArtifactKind} [kind] - Artifact kind rendered by the component.
 * @property {string} [content] - Content rendered by the artifact or message.
 * @property {string} [language] - Language identifier for highlighting.
 * @property {boolean} [editable] - Whether the artifact content can be edited.
 * @property {string} [src] - Image source URL.
 * @property {string} [imageAlt] - Alternative text for the rendered image.
 * @property {string} [placeholder] - Placeholder text.
 * @property {string} [ariaLabel] - Accessible label override.
 * @property {function} [onContentChange] - Called when the edited content changes.
 */
export interface ChatArtifactEditorProps {
  kind?: AgentChatArtifactKind;
  content?: string;
  language?: string | null;
  editable?: boolean;
  src?: string | null;
  imageAlt?: string | null;
  placeholder?: string | null;
  ariaLabel?: string | null;
  onContentChange?: (value: string) => void;
}

/**
 * @description Editable artifact surface for code, markdown, images and generic content.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatArtifactEditor({
  kind = "text",
  content = "",
  language = null,
  editable = true,
  src = null,
  imageAlt = null,
  placeholder = null,
  ariaLabel = null,
  onContentChange,
}: ChatArtifactEditorProps) {
  const t = useAgentTranslate();
  const editorMode = kind === "code" ? "code" : "formula";
  const imageSrc =
    kind === "image" ? safeMediaUrl(src ?? content) : null;
  const resolvedAriaLabel =
    ariaLabel ?? t("agent.chat.artifact.editor.label", "Artifact editor");
  const resolvedPlaceholder =
    placeholder ?? t("agent.chat.artifact.editor.placeholder", "Start writing…");

  return (
    <section
      className="dcf-chat-artifact-editor"
      data-kind={kind}
      aria-label={ariaLabel || resolvedAriaLabel}
    >
      <header className="dcf-chat-artifact-editor__header">
        <span className="dcf-chat-artifact-editor__kind">
          <ChatIcon name={KIND_ICONS[kind]} size={13} />
          {t(`agent.chat.artifact.editor.kind.${kind}`, kind)}
        </span>
        {language ? (
          <span className="dcf-chat-artifact-editor__language">{language}</span>
        ) : null}
        <span className="dcf-chat-artifact-editor__mode">
          {editable
            ? t("agent.chat.artifact.editor.editable", "Editable")
            : t("agent.chat.artifact.editor.readOnly", "Read only")}
        </span>
      </header>

      {kind === "image" ? (
        imageSrc ? (
          <figure className="dcf-chat-artifact-editor__image">
            <img
              src={imageSrc}
              alt={
                imageAlt ||
                t("agent.chat.artifact.editor.imageAlt", "Artifact image")
              }
            />
          </figure>
        ) : (
          <div className="dcf-chat-artifact-editor__empty">
            <ChatIcon name="image" size={20} />
            <span>
              {t(
                "agent.chat.artifact.editor.emptyImage",
                "No image preview available."
              )}
            </span>
          </div>
        )
      ) : editable ? (
        <CodeEditor
          className="dcf-chat-artifact-editor__code"
          mode={editorMode}
          code={content}
          placeholder={resolvedPlaceholder}
          ariaLabel={resolvedAriaLabel}
          onCodeChange={(value) => onContentChange?.(value)}
        />
      ) : (
        <pre className="dcf-chat-artifact-editor__static" tabIndex={0}>
          {content}
        </pre>
      )}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatArtifactEditor} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatArtifactEditorComponent = ChatArtifactEditor;
