/**
 * @file
 * @summary Resizable console panel rendering artifact console rows.
 * @description Renders the `ChatArtifactConsole` agent chat component and its props contract.
 */
import React, { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatConsoleRow } from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

const MIN_CONSOLE_HEIGHT = 120;
const MAX_CONSOLE_HEIGHT = 560;
const KEYBOARD_STEP = 16;

/**
 * @description Props accepted by {@link ChatArtifactConsole}.
 * @summary Declares every input the ChatArtifactConsole component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [rows] - Console rows rendered by the component.
 * @property {string} [title] - Title text.
 * @property {number} [initialHeight] - Initial console height in pixels.
 * @property {number} [minHeight] - Minimum height in pixels.
 * @property {number} [maxHeight] - Maximum height in pixels.
 * @property {boolean} [resizable] - Whether the console can be resized.
 * @property {boolean} [showClear] - Whether the clear action is shown.
 * @property {function} [onHeightChange] - Called with the new height.
 * @property {function} [onCleared] - Called when the console is cleared.
 */
export interface ChatArtifactConsoleProps {
  rows?: AgentChatConsoleRow[];
  title?: string | null;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  resizable?: boolean;
  showClear?: boolean;
  onHeightChange?: (height: number) => void;
  onCleared?: () => void;
}

/**
 * @description Resizable console panel rendering artifact console rows.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatArtifactConsole({
  rows = [],
  title = null,
  initialHeight = 200,
  minHeight = MIN_CONSOLE_HEIGHT,
  maxHeight = MAX_CONSOLE_HEIGHT,
  resizable = true,
  showClear = true,
  onHeightChange,
  onCleared,
}: ChatArtifactConsoleProps) {
  const t = useAgentTranslate();
  const [internalHeight, setInternalHeight] = useState<number | null>(null);
  const drag = useRef({ dragging: false, startY: 0, startHeight: 0 });

  const lowerBound = Math.max(48, Math.min(minHeight, maxHeight));
  const upperBound = Math.max(lowerBound, maxHeight);
  const height = Math.min(
    upperBound,
    Math.max(lowerBound, Math.round(internalHeight ?? initialHeight))
  );

  const applyHeight = (next: number) => {
    const clamped = Math.min(
      upperBound,
      Math.max(lowerBound, Math.round(next))
    );
    if (clamped === height) return;
    setInternalHeight(clamped);
    onHeightChange?.(clamped);
  };

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizable) return;
    event.preventDefault();
    drag.current = {
      dragging: true,
      startY: event.clientY,
      startHeight: height,
    };
    if (event.pointerId !== undefined) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  };

  const onResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.dragging) return;
    const delta = drag.current.startY - event.clientY;
    applyHeight(drag.current.startHeight + delta);
  };

  const endResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.dragging) return;
    drag.current.dragging = false;
    if (event.pointerId !== undefined) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const onHandleKeydown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!resizable) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      applyHeight(height + KEYBOARD_STEP);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      applyHeight(height - KEYBOARD_STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      applyHeight(lowerBound);
    } else if (event.key === "End") {
      event.preventDefault();
      applyHeight(upperBound);
    }
  };

  const levelOf = (row: AgentChatConsoleRow): string => row.level ?? "log";
  const rowCount = rows.length;

  return (
    <section
      className={`dcf-chat-artifact-console${resizable ? " dcf-chat-artifact-console--resizable" : ""}`}
      style={{ height: `${height}px` }}
      aria-label={title || t("agent.chat.artifact.console.title", "Output")}
    >
      {resizable ? (
        <div
          className="dcf-chat-artifact-console__handle"
          role="separator"
          aria-orientation="horizontal"
          tabIndex={0}
          aria-label={t(
            "agent.chat.artifact.console.resize",
            "Resize output console"
          )}
          aria-valuenow={height}
          aria-valuemin={lowerBound}
          aria-valuemax={upperBound}
          onPointerDown={startResize}
          onPointerMove={onResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onKeyDown={onHandleKeydown}
        >
          <span
            className="dcf-chat-artifact-console__grip"
            aria-hidden="true"
          />
        </div>
      ) : null}

      <header className="dcf-chat-artifact-console__header">
        <span className="dcf-chat-artifact-console__title">
          {title || t("agent.chat.artifact.console.title", "Output")}
        </span>
        <span className="dcf-chat-artifact-console__count">
          {rowCount}{" "}
          {rowCount === 1
            ? t("agent.chat.artifact.console.line", "line")
            : t("agent.chat.artifact.console.lines", "lines")}
        </span>
        {showClear ? (
          <button
            type="button"
            className="dcf-chat-artifact-console__clear"
            aria-label={t(
              "agent.chat.artifact.console.clear",
              "Clear output"
            )}
            onClick={() => onCleared?.()}
          >
            <ChatIcon name="trash" size={13} />
            {t("agent.chat.artifact.console.clearLabel", "Clear")}
          </button>
        ) : null}
      </header>

      <div
        className="dcf-chat-artifact-console__body"
        role="log"
        aria-live="polite"
        aria-label={t("agent.chat.artifact.console.aria", "Console output")}
      >
        {rows.length ? (
          rows.map((row, index) => (
            <div
              className="dcf-chat-artifact-console__row"
              data-level={levelOf(row)}
              key={row.id ?? `${index}:${row.text}`}
            >
              <span className="dcf-chat-artifact-console__level">
                {levelOf(row)}
              </span>
              {row.timestamp ? (
                <time
                  className="dcf-chat-artifact-console__time"
                  dateTime={row.timestamp}
                >
                  {row.timestamp}
                </time>
              ) : null}
              <span className="dcf-chat-artifact-console__text">
                {row.text}
              </span>
            </div>
          ))
        ) : (
          <p className="dcf-chat-artifact-console__empty">
            {t("agent.chat.artifact.console.empty", "No output yet.")}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * @description Named alias of {@link ChatArtifactConsole} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatArtifactConsoleComponent = ChatArtifactConsole;
