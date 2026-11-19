/**
 * @file
 * @summary Full chat surface: conversation, composer, header, side panels and slots.
 * @description Renders the `AgentChat` agent chat component and its props contract.
 */
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { graphAuthMetadataOf } from "@decaf-ts/as-graph/shared";
import {
  useAgentChatContext,
  useAgentChatDecafStore,
  useAgentTranslate,
} from "../../react/AgentChatProvider.js";
import { useAgentChat } from "../../react/useAgentChat.js";
import type {
  AgentChatApprovalDenial,
  AgentChatApprovalResume,
  AgentChatAttachment,
  AgentChatHistoryEntry,
  AgentChatKnowledgeBaseEntry,
  AgentChatKnowledgeSource,
  AgentChatMessageEdit,
  AgentChatMessageVoteChange,
  AgentChatModel,
  AgentChatSlashCommand,
  AgentChatStagedAttachment,
  AgentChatTranscriptDownload,
  AgentChatVisibility,
} from "../../types.js";
import { ChatApproval } from "../chat-approval/ChatApproval.js";
import { ChatHistory } from "../chat-history/ChatHistory.js";
import { ChatKnowledgeBaseSelector } from "../chat-knowledge-base-selector/ChatKnowledgeBaseSelector.js";
import { ChatStructuredObject } from "../chat-structured-object/ChatStructuredObject.js";
import { ChatTelemetry } from "../chat-telemetry/ChatTelemetry.js";
import { ChatAttachmentInput } from "../chat-attachment-input/ChatAttachmentInput.js";
import { ChatAttachmentPreview } from "../chat-attachment-preview/ChatAttachmentPreview.js";
import { ChatComposer, type ChatComposerHandle } from "../chat-composer/ChatComposer.js";
import { ChatConversation } from "../chat-conversation/ChatConversation.js";
import { ChatGreeting } from "../chat-greeting/ChatGreeting.js";
import { ChatHeader } from "../chat-header/ChatHeader.js";
import { ChatMessage } from "../chat-message/ChatMessage.js";
import { ChatMessageActions } from "../chat-message-actions/ChatMessageActions.js";
import { ChatMessageEditor } from "../chat-message-editor/ChatMessageEditor.js";
import { ChatModelSelector } from "../chat-model-selector/ChatModelSelector.js";
import { ChatNotification } from "../chat-notification/ChatNotification.js";
import { ChatSlashCommands } from "../chat-slash-commands/ChatSlashCommands.js";
import { ChatSuggestedActions } from "../chat-suggested-actions/ChatSuggestedActions.js";
import { ChatThinkingMessage } from "../chat-thinking-message/ChatThinkingMessage.js";
import { ChatVisibilitySelector } from "../chat-visibility-selector/ChatVisibilitySelector.js";

type AgentChatKnowledgeBaseSlot =
  | ReactNode
  | ((sources: AgentChatKnowledgeSource[]) => ReactNode);

let attachmentSequence = 0;

/**
 * @description Props accepted by {@link AgentChat}.
 * @summary Declares every input the AgentChat component understands.
 * @memberOf module:for-react.agent
 * @property {unknown} [workflow] - Inline workflow document.
 * @property {string} [workflowId] - Backend workflow id.
 * @property {string} [sessionId] - Active session id.
 * @property {string} [headerTitleKey] - Translation key for the header title.
 * @property {string} [headerTitleFallback] - English fallback for the header title.
 * @property {Array} [knowledgeSources] - Knowledge sources available to the chat.
 * @property {Array} [suggestions] - Suggested prompts rendered by the component.
 * @property {Array} [slashCommands] - Slash commands offered by the composer.
 * @property {Array} [models] - Models offered by the selector.
 * @property {AgentChatVisibility} [visibility] - Visibility scope.
 * @property {boolean} [showHistory] - Whether history affordances are shown.
 * @property {boolean} [showKnowledgeBase] - Whether knowledge-base affordances are shown.
 * @property {function} [onDownload] - Called with the transcript download payload.
 * @property {function} [onApprovalDecision] - Called with the approval resume/denial decision.
 * @property {ReactNode} [historySlot] - Custom history node.
 * @property {AgentChatKnowledgeBaseSlot} [knowledgeBaseSlot] - Custom knowledge-base node, optionally built from the sources.
 * @property {ReactNode} [telemetrySlot] - Custom telemetry node.
 * @property {ReactNode} [structuredObjectSlot] - Custom structured-object node.
 */
export interface AgentChatProps {
  workflow?: unknown;
  workflowId?: string | null;
  sessionId?: string | null;
  headerTitleKey?: string;
  headerTitleFallback?: string;
  knowledgeSources?: AgentChatKnowledgeSource[];
  suggestions?: string[];
  slashCommands?: AgentChatSlashCommand[];
  models?: AgentChatModel[];
  visibility?: AgentChatVisibility;
  showHistory?: boolean;
  showKnowledgeBase?: boolean;
  onDownload?: (payload: AgentChatTranscriptDownload) => void;
  onApprovalDecision?: (
    decision: AgentChatApprovalResume | AgentChatApprovalDenial
  ) => void;
  historySlot?: ReactNode;
  knowledgeBaseSlot?: AgentChatKnowledgeBaseSlot;
  telemetrySlot?: ReactNode;
  structuredObjectSlot?: ReactNode;
}

function toAttachment(
  attachment: AgentChatStagedAttachment
): AgentChatAttachment {
  return {
    id: attachment.id,
    name: attachment.name,
    mime: attachment.mime,
    size: attachment.size,
    ...(attachment.url !== undefined ? { url: attachment.url } : {}),
    ...(attachment.textPreview !== undefined
      ? { textPreview: attachment.textPreview }
      : {}),
  };
}

/**
 * @description Full chat surface: conversation, composer, header, side panels and slots.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function AgentChat({
  workflow,
  workflowId = null,
  sessionId = null,
  headerTitleKey = "agent.chat.title",
  headerTitleFallback = "Agent chat",
  knowledgeSources = [],
  suggestions = [],
  slashCommands = [],
  models = [],
  visibility = "private",
  showHistory = true,
  showKnowledgeBase = true,
  onDownload,
  onApprovalDecision,
  historySlot,
  knowledgeBaseSlot,
  telemetrySlot,
  structuredObjectSlot,
}: AgentChatProps) {
  const t = useAgentTranslate();
  const chat = useAgentChat({
    ...(workflow !== undefined ? { workflow } : {}),
    ...(workflowId !== null ? { workflowId } : {}),
    ...(sessionId !== null ? { sessionId } : {}),
  });
  const notifications = useAgentChatDecafStore((state) => state.demo.notifications);
  const dismissNotification = useAgentChatDecafStore(
    (state) => state.dismissNotification
  );
  const { store, historySource, knowledgeBaseSource } = useAgentChatContext();

  const composerRef = useRef<ChatComposerHandle>(null);

  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<AgentChatStagedAttachment[]>([]);
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>([]);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<AgentChatHistoryEntry[]>([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<
    AgentChatKnowledgeBaseEntry[]
  >([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    historySource
      .list({ page: 1, pageSize: 20 })
      .then((entries) => {
        if (!cancelled) setHistoryEntries(entries ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [historySource]);

  useEffect(() => {
    let cancelled = false;
    knowledgeBaseSource
      .list()
      .then((entries) => {
        if (!cancelled) setKnowledgeEntries(entries ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [knowledgeBaseSource]);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AgentChatModel | string | null>(null);
  const [currentVisibility, setCurrentVisibility] = useState<AgentChatVisibility>(visibility);

  const running = chat.running;
  const messages = chat.messages;
  const title = t(headerTitleKey, headerTitleFallback);

  const requiredNamespaces = useMemo<string[]>(() => {
    if (!workflow) return [];
    const document = workflow as {
      metadata?: Record<string, unknown> | null;
    };
    const auth = graphAuthMetadataOf(document.metadata ?? null);
    return auth?.namespaces ?? [];
  }, [workflow]);

  const showThinking = running && !messages.some((message) => message.streaming === true);
  const showSuggestions = messages.length === 0 && suggestions.length > 0;
  const showSlashCommands = slashQuery !== null && slashCommands.length > 0;
  const selectedKnowledgeCount = selectedKnowledgeIds.length;
  const effectiveKnowledgeEntries = knowledgeEntries.length
    ? knowledgeEntries
    : knowledgeSources.map((source) => ({ ...source }));
  const structuredObject = chat.structuredObject;
  const structuredPartial = !!structuredObject && running;

  const editingMessage = editingMessageId
    ? messages.find((message) => message.id === editingMessageId) ?? null
    : null;

  const send = async (message: string = draft) => {
    const text = message.trim();
    if (!text || running) return;
    const attachmentMetadata = attachments.map(toAttachment);
    const knowledgeIds = selectedKnowledgeIds;
    setDraft("");
    setAttachments([]);
    setSelectedKnowledgeIds([]);
    setSlashQuery(null);
    await chat.send(text, attachmentMetadata, knowledgeIds);
  };

  const sendSuggestion = async (suggestion: string) => {
    if (running) return;
    setDraft(suggestion);
    await send(suggestion);
  };

  const onFilesSelected = (files: File[]) => {
    const added = files.map<AgentChatStagedAttachment>((file) => ({
      id: `attachment:${++attachmentSequence}`,
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      file,
    }));
    setAttachments((current) => [...current, ...added]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((entry) => entry.id !== id));
  };

  const onSlashCommand = (command: AgentChatSlashCommand) => {
    composerRef.current?.acceptSlashCommand(command.name);
    setSlashQuery(null);
  };

  const saveEdit = async (edit: AgentChatMessageEdit) => {
    setEditingMessageId(null);
    await chat.editMessage(edit.messageId, edit.text);
  };

  const onVoteChange = (change: AgentChatMessageVoteChange) => {
    chat.setVote(change.messageId, change.vote);
  };

  const onDeleteMessage = (messageId: string) => {
    if (editingMessageId === messageId) setEditingMessageId(null);
    chat.removeMessage(messageId);
  };

  const selectHistory = (entry: AgentChatHistoryEntry) => {
    if (running) return;
    setActiveHistoryId(entry.id);
    setEditingMessageId(null);
    chat.reset();
  };

  const startNewChat = () => {
    if (running) return;
    setActiveHistoryId(null);
    setEditingMessageId(null);
    chat.reset();
  };

  const deleteHistory = async (entry: AgentChatHistoryEntry) => {
    try {
      await historySource.delete?.(entry.id);
    } catch {
      undefined;
    }
    setHistoryEntries((current) =>
      current.filter((candidate) => candidate.id !== entry.id)
    );
    if (activeHistoryId === entry.id) setActiveHistoryId(null);
  };

  const decideApproval = (
    decision: AgentChatApprovalResume | AgentChatApprovalDenial
  ) => {
    const approval = chat.approval;
    if (!approval) return;
    store.getState().setApproval({
      ...approval,
      status: decision.type === "resume" ? "approved" : "rejected",
    });
    onApprovalDecision?.(decision);
  };

  const hasHistoryRail = showHistory && historyOpen;

  return (
    <section className="dcf-agent-chat" aria-label={title}>
      <ChatHeader
        titleKey={headerTitleKey}
        titleFallback={headerTitleFallback}
        namespaces={requiredNamespaces}
        showHistory={showHistory}
        showKnowledgeBase={showKnowledgeBase}
        historyOpen={historyOpen}
        knowledgeOpen={knowledgeOpen}
        telemetryOpen={telemetryOpen}
        selectedKnowledgeCount={selectedKnowledgeCount}
        onHistoryToggle={() => setHistoryOpen((open) => !open)}
        onKnowledgeBaseOpen={() => setKnowledgeOpen(true)}
        onTelemetryToggle={() => setTelemetryOpen((open) => !open)}
      />

      <ChatNotification
        notifications={notifications}
        onDismissed={dismissNotification}
      />

      {chat.error ? (
        <div
          className="dcf-agent-chat__banner dcf-agent-chat__banner--error"
          role="alert"
        >
          {chat.error}
        </div>
      ) : chat.backendAvailable === false ? (
        <div
          className="dcf-agent-chat__banner dcf-agent-chat__banner--error"
          role="alert"
        >
          {t(
            "agent.chat.error.backendUnavailable",
            "Agent backend is not reachable. Reconnect and try again."
          )}
        </div>
      ) : null}

      <div
        className={`dcf-agent-chat__body${hasHistoryRail ? " dcf-agent-chat__body--with-history" : ""}`}
      >
        {hasHistoryRail ? (
          <aside className="dcf-agent-chat__history">
            {historySlot ?? (
              <ChatHistory
                entries={historyEntries}
                activeId={activeHistoryId}
                onSelectChat={selectHistory}
                onDelete={deleteHistory}
                onNewChat={startNewChat}
              />
            )}
          </aside>
        ) : null}

        <div className="dcf-agent-chat__main">
          <div className="dcf-agent-chat__conversation">
            <ChatConversation
              messages={messages}
              running={running}
              showEmptyMessage={false}
              onDownload={(payload) => onDownload?.(payload)}
              emptyState={
                <ChatGreeting
                  className="dcf-agent-chat__empty"
                  title={t("agent.chat.greeting.title", "How can I help?")}
                  message={t(
                    "agent.chat.greeting.message",
                    "Ask a question, attach a file, or pick a suggestion to get started."
                  )}
                />
              }
            >
              {messages.map((message) => (
                <div
                  className={`dcf-agent-chat__message dcf-agent-chat__message--${message.role}`}
                  key={message.id}
                >
                  {editingMessageId === message.id ? (
                    <ChatMessageEditor
                      message={editingMessage}
                      messageId={message.id}
                      initialText={message.content}
                      running={running}
                      onSave={saveEdit}
                      onCancel={() => setEditingMessageId(null)}
                    />
                  ) : (
                    <>
                      <div className="dcf-agent-chat__message-content">
                        <ChatMessage
                          role={message.role}
                          content={message.content}
                          createdAt={message.createdAt}
                          attachments={message.attachments}
                          parts={message.parts ?? []}
                          actions={message.actions ?? []}
                          streaming={message.streaming ?? false}
                          pending={message.pending ?? false}
                        />
                      </div>
                      <ChatMessageActions
                        messageId={message.id}
                        role={message.role}
                        copyText={message.content}
                        running={running}
                        vote={message.vote ?? null}
                        onVoteChange={onVoteChange}
                        onEdit={setEditingMessageId}
                        onDeleteMessage={onDeleteMessage}
                      />
                    </>
                  )}
                </div>
              ))}

              {showThinking ? (
                <div className="dcf-agent-chat__typing">
                  <ChatThinkingMessage />
                </div>
              ) : null}
            </ChatConversation>
          </div>

          {chat.approval ? (
            <div className="dcf-agent-chat__approval">
              <ChatApproval
                runId={chat.approval.runId}
                status={chat.approval.status}
                payload={chat.approval.payload}
                toolName={chat.approval.toolName ?? null}
                disabled={running}
                onApprove={decideApproval}
                onReject={decideApproval}
              />
            </div>
          ) : null}

          <div className="dcf-agent-chat__telemetry">
            {telemetrySlot ?? (
              <ChatTelemetry
                roundtrips={chat.roundtrips}
                open={telemetryOpen}
                onToggle={setTelemetryOpen}
              />
            )}
          </div>

          {structuredObjectSlot !== undefined || structuredObject ? (
            <section className="dcf-agent-chat__structured">
              {structuredObjectSlot ?? (
                <ChatStructuredObject
                  value={structuredObject?.value}
                  runId={structuredObject?.runId ?? ""}
                  partial={structuredPartial}
                  streaming={running}
                  history={chat.structuredObjectHistory}
                />
              )}
            </section>
          ) : null}
        </div>
      </div>

      <footer className="dcf-agent-chat__composer">
        {showSuggestions ? (
          <ChatSuggestedActions
            suggestions={suggestions}
            disabled={running}
            onSelect={sendSuggestion}
          />
        ) : null}

        {showSlashCommands ? (
          <ChatSlashCommands
            commands={slashCommands}
            query={slashQuery ?? ""}
            open
            onSelect={onSlashCommand}
            onClose={() => setSlashQuery(null)}
          />
        ) : null}

        <ChatAttachmentPreview
          attachments={attachments}
          onRemove={removeAttachment}
        />

        <div className="dcf-agent-chat__composer-toolbar">
          <ChatAttachmentInput
            disabled={running}
            onFilesSelected={onFilesSelected}
          />

          <ChatComposer
            ref={composerRef}
            value={draft}
            running={running}
            onValueChange={setDraft}
            onSend={send}
            onStop={() => void chat.cancel()}
            onSlashQuery={setSlashQuery}
          />

          <div className="dcf-agent-chat__composer-selectors">
            {models.length ? (
              <ChatModelSelector
                models={models}
                model={selectedModel}
                disabled={running}
                onModelChange={setSelectedModel}
              />
            ) : null}
            <ChatVisibilitySelector
              visibility={currentVisibility}
              disabled={running}
              onVisibilityChange={setCurrentVisibility}
            />
          </div>
        </div>
      </footer>

      {showKnowledgeBase ? (
        knowledgeBaseSlot !== undefined ? (
          <div className="dcf-agent-chat__knowledge-base">
            {typeof knowledgeBaseSlot === "function"
              ? knowledgeBaseSlot(knowledgeSources)
              : knowledgeBaseSlot}
          </div>
        ) : (
          <ChatKnowledgeBaseSelector
            open={knowledgeOpen}
            entries={effectiveKnowledgeEntries}
            selectedIds={selectedKnowledgeIds}
            onSelectionChange={setSelectedKnowledgeIds}
            onEntriesChange={setKnowledgeEntries}
            onOpenChange={setKnowledgeOpen}
          />
        )
      ) : null}
    </section>
  );
}

/**
 * @description Named alias of {@link AgentChat} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const AgentChatComponent = AgentChat;
