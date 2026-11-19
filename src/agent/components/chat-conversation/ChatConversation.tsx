/**
 * @file
 * @summary Scrollable transcript with autoscroll, empty state and transcript download.
 * @description Renders the `ChatConversation` agent chat component and its props contract.
 */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import { agentChatTranscriptMarkdown } from "../../services/agentTranscriptMarkdown.js";
import type {
  AgentChatMessageView,
  AgentChatTranscriptDownload,
} from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatConversation}.
 * @summary Declares every input the ChatConversation component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [messages] - Transcript messages rendered by the conversation.
 * @property {boolean} [running] - Whether a send or replay is in flight.
 * @property {boolean} [autoscroll] - Whether the conversation follows new messages.
 * @property {string} [downloadFilename] - Filename for the downloaded transcript.
 * @property {string} [downloadTitle] - Title for the downloaded transcript.
 * @property {string} [downloadText] - Pre-rendered transcript text to download.
 * @property {boolean} [downloadEnabled] - Whether the transcript download action is shown.
 * @property {string} [emptyMessage] - Message rendered when the transcript is empty.
 * @property {ReactNode} [emptyState] - Custom empty-state node.
 * @property {boolean} [showEmptyMessage] - Whether the empty message is shown.
 * @property {number} [scrollThreshold] - Distance from the bottom that still counts as pinned.
 * @property {function} [onDownload] - Called with the transcript download payload.
 * @property {ReactNode} [children] - Child content rendered by the component.
 */
export interface ChatConversationProps {
  messages?: AgentChatMessageView[];
  running?: boolean;
  autoscroll?: boolean;
  downloadFilename?: string;
  downloadTitle?: string | null;
  downloadText?: string | null;
  downloadEnabled?: boolean;
  emptyMessage?: string | null;
  emptyState?: ReactNode;
  showEmptyMessage?: boolean;
  scrollThreshold?: number;
  onDownload?: (payload: AgentChatTranscriptDownload) => void;
  children?: ReactNode;
}

/**
 * @description Scrollable transcript with autoscroll, empty state and transcript download.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatConversation({
  messages = [],
  running = false,
  autoscroll = true,
  downloadFilename = "conversation.md",
  downloadTitle = null,
  downloadText = null,
  downloadEnabled = true,
  emptyMessage = null,
  emptyState,
  showEmptyMessage = true,
  scrollThreshold = 48,
  onDownload,
  children,
}: ChatConversationProps) {
  const t = useAgentTranslate();
  const transcriptRef = useRef<HTMLDivElement>(null);
  const scrollPending = useRef(false);
  const [scrolledUp, setScrolledUp] = useState(false);

  const isEmpty = messages.length === 0 && !running;

  useEffect(() => {
    if (autoscroll) scrollPending.current = true;
  }, [messages, running, autoscroll]);

  const scrollToBottom = useCallback(() => {
    const element = transcriptRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    setScrolledUp(false);
  }, []);

  useLayoutEffect(() => {
    if (!scrollPending.current) return;
    scrollPending.current = false;
    scrollToBottom();
  });

  const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    setScrolledUp(distance > scrollThreshold);
  };

  const saveToFile = (filename: string, markdown: string) => {
    if (typeof document === "undefined") return;
    const urlApi = URL as typeof URL & {
      createObjectURL?: (blob: Blob) => string;
      revokeObjectURL?: (url: string) => void;
    };
    if (typeof urlApi.createObjectURL !== "function") return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = urlApi.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    urlApi.revokeObjectURL?.(url);
  };

  const downloadTranscript = () => {
    const filename = downloadFilename;
    const markdown =
      downloadText ??
      agentChatTranscriptMarkdown(messages, {
        ...(downloadTitle ? { title: downloadTitle } : {}),
      });
    onDownload?.({ filename, markdown });
    saveToFile(filename, markdown);
  };

  return (
    <section
      className="dcf-chat-conversation"
      aria-label={t("agent.chat.conversation.aria", "Conversation")}
    >
      <div
        ref={transcriptRef}
        className="dcf-chat-conversation__transcript"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        aria-busy={running}
        onScroll={onScroll}
      >
        {isEmpty ? (
          <div className="dcf-chat-conversation__empty">
            {emptyState}
            {showEmptyMessage ? (
              <p className="dcf-chat-conversation__empty-message">
                {emptyMessage ??
                  t(
                    "agent.chat.conversation.empty",
                    "Start the conversation by sending a message."
                  )}
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>

      {scrolledUp ? (
        <button
          type="button"
          className="dcf-chat-conversation__scroll"
          onClick={scrollToBottom}
          aria-label={t(
            "agent.chat.conversation.scrollToBottom",
            "Scroll to the newest message"
          )}
        >
          <ChatIcon name="chevron-down" size={18} />
        </button>
      ) : null}

      {downloadEnabled ? (
        <footer className="dcf-chat-conversation__toolbar">
          <button
            type="button"
            className="dcf-chat-conversation__download"
            onClick={downloadTranscript}
            aria-label={t(
              "agent.chat.conversation.download",
              "Download transcript"
            )}
          >
            <ChatIcon name="download" size={16} />
            <span>
              {t("agent.chat.conversation.download", "Download transcript")}
            </span>
          </button>
        </footer>
      ) : null}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatConversation} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatConversationComponent = ChatConversation;
