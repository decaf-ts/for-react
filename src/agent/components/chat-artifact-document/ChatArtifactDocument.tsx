/**
 * @file
 * @summary Artifact document viewer with load/fail/reload states.
 * @description Renders the `ChatArtifactDocument` agent chat component and its props contract.
 */
import React, { useEffect, useRef, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatArtifactDocument,
  AgentChatArtifactDocumentStatus,
} from "../../types.js";
import { safeMediaUrl } from "../../utils/agentMediaUrl.js";
import { ChatArtifactSkeleton } from "../chat-artifact-skeleton/ChatArtifactSkeleton.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Loader contract used by {@link ChatArtifactDocument} when the
 * host supplies a document id instead of the document itself.
 * @summary Resolves an artifact document by id; rejections surface through the
 * component's failed state.
 * @memberOf module:for-react.agent
 */
export type ChatArtifactDocumentLoader = (
  id: string
) => Promise<AgentChatArtifactDocument>;

/**
 * @description Props accepted by {@link ChatArtifactDocument}.
 * @summary Declares every input the ChatArtifactDocument component understands.
 * @memberOf module:for-react.agent
 * @property {AgentChatArtifactDocumentStatus} [status] - Component-specific status value.
 * @property {string} [documentId] - Identifier of the artifact document.
 * @property {AgentChatArtifactDocument | string} [document] - Artifact document rendered by the component.
 * @property {ChatArtifactDocumentLoader | string} [loader] - Loader used to fetch the document when no document is supplied.
 * @property {string} [error] - Error text rendered by the component.
 * @property {string} [toolName] - Tool name associated with the call.
 * @property {function} [onLoaded] - Called with the loaded document.
 * @property {function} [onFailed] - Called with the failure message.
 * @property {function} [onReloadRequested] - Called when a reload is requested for the document.
 */
export interface ChatArtifactDocumentProps {
  status?: AgentChatArtifactDocumentStatus;
  documentId?: string | null;
  document?: AgentChatArtifactDocument | null;
  loader?: ChatArtifactDocumentLoader | null;
  error?: string | null;
  toolName?: string | null;
  onLoaded?: (document: AgentChatArtifactDocument) => void;
  onFailed?: (message: string) => void;
  onReloadRequested?: (documentId: string) => void;
}

/**
 * @description Artifact document viewer with load/fail/reload states.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatArtifactDocument({
  status = "pending",
  documentId = null,
  document = null,
  loader = null,
  error = null,
  toolName = null,
  onLoaded,
  onFailed,
  onReloadRequested,
}: ChatArtifactDocumentProps) {
  const t = useAgentTranslate();
  const [internalDocument, setInternalDocument] =
    useState<AgentChatArtifactDocument | null>(null);
  const [internalStatus, setInternalStatus] =
    useState<AgentChatArtifactDocumentStatus | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const requestedId = useRef<string | null>(null);

  const effectiveDocument = document ?? internalDocument;
  const effectiveStatus: AgentChatArtifactDocumentStatus = document
    ? "succeeded"
    : status !== "pending"
      ? status
      : internalStatus ?? "pending";

  const imageUrl =
    effectiveDocument && effectiveDocument.kind === "image"
      ? safeMediaUrl(effectiveDocument.url ?? effectiveDocument.content)
      : null;

  const errorMessage =
    internalError ??
    error ??
    t("agent.chat.artifact.document.error", "The document could not be loaded.");

  const load = async (
    id: string,
    loadDocument: ChatArtifactDocumentLoader
  ): Promise<void> => {
    setInternalStatus("loading");
    setInternalError(null);
    try {
      const loaded = await loadDocument(id);
      setInternalDocument(loaded);
      setInternalStatus("succeeded");
      onLoaded?.(loaded);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : String(loadError ?? "");
      setInternalStatus("failed");
      setInternalError(message || null);
      onFailed?.(message);
    }
  };

  useEffect(() => {
    if (document || !documentId || !loader) return;
    if (requestedId.current === documentId) return;
    if (internalDocument?.id === documentId) return;
    requestedId.current = documentId;
    void load(documentId, loader);
  }, [document, documentId, loader, internalDocument?.id]);

  const reload = async () => {
    if (!documentId || !loader) return;
    requestedId.current = documentId;
    onReloadRequested?.(documentId);
    await load(documentId, loader);
  };

  const previewOf = (entry: AgentChatArtifactDocument): string => {
    const content = entry.content ?? entry.url ?? "";
    return content.length > 240 ? `${content.slice(0, 240)}…` : content;
  };

  return (
    <section
      className="dcf-chat-artifact-document"
      data-status={effectiveStatus}
      aria-busy={effectiveStatus === "loading" ? "true" : undefined}
      aria-label={t(
        "agent.chat.artifact.document.label",
        "Document artifact"
      )}
    >
      <header className="dcf-chat-artifact-document__header">
        <span className="dcf-chat-artifact-document__tool">
          <ChatIcon name="file" size={13} />
          {t("agent.chat.artifact.document.toolCall", "Tool call")}
          {toolName ? (
            <code className="dcf-chat-artifact-document__tool-name">
              {toolName}
            </code>
          ) : null}
        </span>
        <span className="dcf-chat-artifact-document__status">
          {t(
            `agent.chat.artifact.document.status.${effectiveStatus}`,
            effectiveStatus
          )}
        </span>
      </header>

      {effectiveStatus === "loading" ? (
        <ChatArtifactSkeleton
          variant="full"
          lines={3}
          label={t(
            "agent.chat.artifact.document.loading",
            "Fetching document…"
          )}
        />
      ) : effectiveStatus === "failed" ? (
        <div className="dcf-chat-artifact-document__error" role="alert">
          <span
            className="dcf-chat-artifact-document__error-icon"
            aria-hidden="true"
          >
            <ChatIcon name="x" size={16} />
          </span>
          <p className="dcf-chat-artifact-document__error-message">
            {errorMessage}
          </p>
          {documentId && loader ? (
            <button
              type="button"
              className="dcf-chat-artifact-document__retry"
              onClick={() => void reload()}
            >
              {t("agent.chat.artifact.document.retry", "Retry")}
            </button>
          ) : null}
        </div>
      ) : effectiveStatus === "succeeded" ? (
        effectiveDocument ? (
          <article className="dcf-chat-artifact-document__preview">
            <header className="dcf-chat-artifact-document__preview-header">
              <span
                className="dcf-chat-artifact-document__kind"
                data-kind={effectiveDocument.kind}
              >
                {t(
                  `agent.chat.artifact.kind.${effectiveDocument.kind}`,
                  effectiveDocument.kind
                )}
              </span>
              <h4 className="dcf-chat-artifact-document__title">
                {effectiveDocument.title}
              </h4>
              {effectiveDocument.version ? (
                <span className="dcf-chat-artifact-document__version">
                  v{effectiveDocument.version}
                </span>
              ) : null}
            </header>
            {effectiveDocument.kind === "image" &&
            (effectiveDocument.url || effectiveDocument.content) ? (
              imageUrl ? (
                <img
                  className="dcf-chat-artifact-document__image"
                  src={imageUrl}
                  alt={effectiveDocument.title}
                />
              ) : (
                <p className="dcf-chat-artifact-document__empty">
                  {t(
                    "agent.chat.artifact.document.empty",
                    "The document is empty."
                  )}
                </p>
              )
            ) : effectiveDocument.content ? (
              <pre className="dcf-chat-artifact-document__content">
                {previewOf(effectiveDocument)}
              </pre>
            ) : (
              <p className="dcf-chat-artifact-document__empty">
                {t(
                  "agent.chat.artifact.document.empty",
                  "The document is empty."
                )}
              </p>
            )}
          </article>
        ) : (
          <p className="dcf-chat-artifact-document__empty">
            {t(
              "agent.chat.artifact.document.empty",
              "The document is empty."
            )}
          </p>
        )
      ) : (
        <div className="dcf-chat-artifact-document__placeholder">
          <ChatIcon name="loader" size={16} />
          <span>
            {t(
              "agent.chat.artifact.document.pending",
              "Waiting for the tool result…"
            )}
          </span>
        </div>
      )}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatArtifactDocument} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatArtifactDocumentComponent = ChatArtifactDocument;
