/**
 * @file
 * @summary Generic tool-call card with input/output, state and error rendering.
 * @description Renders the `ChatTool` agent chat component and its props contract.
 */
import React, { useEffect, useId, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatToolCallState } from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatTool}.
 * @summary Declares every input the ChatTool component understands.
 * @memberOf module:for-react.agent
 * @property {string} [name] - Display name.
 * @property {string} [title] - Title text.
 * @property {AgentChatToolCallState} [state] - Tool call or weather render state.
 * @property {unknown} [toolInput] - Tool input payload.
 * @property {unknown} [toolOutput] - Tool output payload.
 * @property {string} [error] - Error text rendered by the component.
 * @property {boolean} [open] - Whether the surface is open.
 * @property {function} [onToggle] - Called when the expanded state changes.
 */
export interface ChatToolProps {
  name?: string;
  title?: string | null;
  state?: AgentChatToolCallState;
  toolInput?: unknown;
  toolOutput?: unknown;
  error?: string | null;
  open?: boolean;
  onToggle?: (expanded: boolean) => void;
}

function toneOf(state: AgentChatToolCallState): string {
  switch (state) {
    case "output-available":
      return "success";
    case "output-error":
      return "error";
    case "output-denied":
      return "denied";
    default:
      return "pending";
  }
}

function statusIconOf(state: AgentChatToolCallState): string {
  switch (state) {
    case "output-available":
      return "check";
    case "output-error":
    case "output-denied":
      return "x";
    default:
      return "loader";
  }
}

function stateFallbackOf(state: AgentChatToolCallState): string {
  switch (state) {
    case "input-streaming":
      return "Preparing input…";
    case "input-available":
      return "Input ready";
    case "output-available":
      return "Completed";
    case "output-error":
      return "Failed";
    default:
      return "Denied";
  }
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * @description Generic tool-call card with input/output, state and error rendering.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatTool({
  name = "",
  title = null,
  state = "input-available",
  toolInput = undefined,
  toolOutput = undefined,
  error = null,
  open = false,
  onToggle,
}: ChatToolProps) {
  const t = useAgentTranslate();
  const contentId = useId();
  const [expanded, setExpanded] = useState(open);

  useEffect(() => {
    setExpanded(open);
  }, [open]);

  const hasInput = toolInput !== undefined;
  const hasOutput = toolOutput !== undefined;
  const busy = state === "input-streaming";
  const tone = toneOf(state);
  const statusIcon = statusIconOf(state);
  const stateFallback = stateFallbackOf(state);

  const setExpandedAndEmit = (next: boolean) => {
    setExpanded(next);
    onToggle?.(next);
  };

  return (
    <section className="dcf-chat-tool" data-state={state} data-tone={tone}>
      <header className="dcf-chat-tool__header">
        <span className="dcf-chat-tool__icon" aria-hidden="true">
          <ChatIcon name="box" size={16} />
        </span>
        <div className="dcf-chat-tool__heading">
          <span className="dcf-chat-tool__name">{title || name}</span>
          {title && name ? (
            <span className="dcf-chat-tool__tool-name">{name}</span>
          ) : null}
        </div>
        <span
          className={`dcf-chat-tool__status${busy ? " dcf-chat-tool__status--busy" : ""}`}
        >
          <ChatIcon name={statusIcon} size={13} />
          {t(`agent.chat.tool.state.${state}`, stateFallback)}
        </span>
        {hasInput || hasOutput || error ? (
          <button
            type="button"
            className="dcf-chat-tool__trigger"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setExpandedAndEmit(!expanded)}
          >
            <ChatIcon name={expanded ? "chevron-up" : "chevron-down"} size={15} />
            <span className="dcf-chat-tool__trigger-label">
              {expanded
                ? t("agent.chat.tool.hideDetails", "Hide details")
                : t("agent.chat.tool.showDetails", "Show details")}
            </span>
          </button>
        ) : null}
      </header>

      {error ? (
        <p className="dcf-chat-tool__error" role="alert">
          {error}
        </p>
      ) : null}

      {expanded ? (
        <div className="dcf-chat-tool__content" id={contentId}>
          {hasInput ? (
            <div className="dcf-chat-tool__pane">
              <h4 className="dcf-chat-tool__pane-title">
                {t("agent.chat.tool.input", "Input")}
              </h4>
              <pre className="dcf-chat-tool__json" data-pane="input">
                {stringify(toolInput)}
              </pre>
            </div>
          ) : null}
          {hasOutput ? (
            <div className="dcf-chat-tool__pane">
              <h4 className="dcf-chat-tool__pane-title">
                {t("agent.chat.tool.output", "Output")}
              </h4>
              <pre className="dcf-chat-tool__json" data-pane="output">
                {stringify(toolOutput)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatTool} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatToolComponent = ChatTool;
