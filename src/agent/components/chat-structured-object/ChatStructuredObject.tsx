/**
 * @file
 * @summary Structured-object viewer with flattened rows, raw mode and history.
 * @description Renders the `ChatStructuredObject` agent chat component and its props contract.
 */
import React, { useEffect, useRef, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatStructuredObjectEntry } from "../../types.js";
import { GraphIoViewerComponent } from "../../../diagrams/components/graph/graph-io-viewer.component.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Kind of value a flattened structured-object row holds.
 * @memberOf module:for-react.agent
 */
export type AgentChatStructuredRowKind = "primitive" | "object" | "array";

/**
 * @description One flattened row of a structured object.
 * @summary Carries the JSON path, display label, nesting depth, value kind,
 * raw value and pre-formatted display text.
 * @memberOf module:for-react.agent
 */
export interface AgentChatStructuredRow {
  /** JSON path of the row. */
  readonly path: string;
  /** Display label. */
  readonly label: string;
  /** Nesting depth. */
  readonly depth: number;
  /** Value kind. */
  readonly kind: AgentChatStructuredRowKind;
  /** Raw value. */
  readonly value: unknown;
  /** Pre-formatted display text. */
  readonly display: string;
}

const MAX_STRUCTURED_DEPTH = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function displayPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function flatten(
  /** Raw value. */
  value: unknown,
  rows: AgentChatStructuredRow[],
  /** JSON path of the row. */
  path: string,
  /** Display label. */
  label: string,
  /** Nesting depth. */
  depth: number
): void {
  if (depth > MAX_STRUCTURED_DEPTH) return;
  if (Array.isArray(value)) {
    if (value.length === 0) {
      rows.push({ path, label, depth, kind: "array", value, display: "[]" });
      return;
    }
    rows.push({
      path,
      label,
      depth,
      kind: "array",
      value,
      display: `[${value.length}]`,
    });
    value.forEach((entry, index) => {
      flatten(entry, rows, `${path}[${index}]`, `[${index}]`, depth + 1);
    });
    return;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      rows.push({ path, label, depth, kind: "object", value, display: "{}" });
      return;
    }
    rows.push({
      path,
      label,
      depth,
      kind: "object",
      value,
      display: `{${keys.length}}`,
    });
    keys.forEach((key) => {
      flatten(value[key], rows, `${path}.${key}`, key, depth + 1);
    });
    return;
  }
  rows.push({
    path,
    label,
    depth,
    kind: "primitive",
    value,
    display: displayPrimitive(value),
  });
}

/**
 * @description Flattens a structured object into display rows.
 * @summary Walks objects and arrays up to the internal depth cap, producing a
 * row per primitive or container with its dotted/bracketed path.
 * @param {*} value - Structured value to flatten.
 * @returns {Array} Rows in traversal order.
 * @memberOf module:for-react.agent
 */
export function flattenAgentChatStructuredObject(
  value: unknown
): AgentChatStructuredRow[] {
  if (value === null || value === undefined) return [];
  const rows: AgentChatStructuredRow[] = [];
  flatten(value, rows, "$", "$", 0);
  return rows;
}

/**
 * @description Renders one structured value as a short display string.
 * @param {*} value - Value to summarize.
 * @param {number} [limit] - Maximum characters before truncation (defaults to 120).
 * @returns {string} Display text, ellipsized when over the limit.
 * @memberOf module:for-react.agent
 */
export function summarizeAgentChatStructuredValue(
  value: unknown,
  limit = 120
): string {
  const text = displayPrimitive(value);
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

/**
 * @description Props accepted by {@link ChatStructuredObject}.
 * @summary Declares every input the ChatStructuredObject component understands.
 * @memberOf module:for-react.agent
 * @property {unknown} [value] - Current value.
 * @property {boolean} [partial] - Whether the structured object is still partial.
 * @property {boolean} [streaming] - Whether content is still streaming.
 * @property {string} [runId] - Run identifier.
 * @property {Array} [history] - Committed structured-object history.
 * @property {boolean} [rawMode] - Whether to render the raw structured value.
 * @property {string} [title] - Title text.
 * @property {boolean} [showHistory] - Whether history affordances are shown.
 * @property {boolean} [emptyVariant] - Whether to render the structured object's empty variant.
 * @property {function} [onCommitted] - Called when a structured-object snapshot is committed.
 * @property {function} [onHistorySelected] - Called when a history entry is selected.
 */
export interface ChatStructuredObjectProps {
  value?: unknown;
  partial?: boolean;
  streaming?: boolean;
  runId?: string;
  history?: AgentChatStructuredObjectEntry[];
  rawMode?: boolean;
  title?: string | null;
  showHistory?: boolean;
  emptyVariant?: boolean;
  onCommitted?: (entry: AgentChatStructuredObjectEntry) => void;
  onHistorySelected?: (entry: AgentChatStructuredObjectEntry) => void;
}

/**
 * @description Structured-object viewer with flattened rows, raw mode and history.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatStructuredObject({
  value = null,
  partial = false,
  streaming = false,
  runId = "",
  history = [],
  rawMode = false,
  title = null,
  showHistory = true,
  emptyVariant = true,
  onCommitted,
  onHistorySelected,
}: ChatStructuredObjectProps) {
  const t = useAgentTranslate();
  const [committedEntries, setCommittedEntries] = useState<
    AgentChatStructuredObjectEntry[]
  >([]);
  const wasStreaming = useRef(streaming || partial);
  const initialized = useRef(false);

  const ghost = streaming || partial;
  const hasValue = value !== null && value !== undefined;
  const rows = flattenAgentChatStructuredObject(value);
  const entries = [...committedEntries, ...history];
  const heading =
    title || t("agent.chat.structuredObject.title", "Structured object");

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      wasStreaming.current = ghost;
      return;
    }
    if (wasStreaming.current && !ghost && value !== null && value !== undefined) {
      const entry: AgentChatStructuredObjectEntry = {
        runId,
        value,
        committedAt: new Date().toISOString(),
      };
      setCommittedEntries((current) => [entry, ...current]);
      onCommitted?.(entry);
    }
    wasStreaming.current = ghost;
  }, [ghost, value, runId, onCommitted]);

  return (
    <section
      className={`dcf-chat-structured-object${ghost ? " dcf-chat-structured-object--ghost" : ""}`}
      aria-label={heading}
      aria-busy={ghost ? "true" : undefined}
    >
      <header className="dcf-chat-structured-object__header">
        <h3 className="dcf-chat-structured-object__title">{heading}</h3>
        <span
          className={`dcf-chat-structured-object__state${ghost ? " dcf-chat-structured-object__state--ghost" : ""}`}
          data-state={ghost ? "ghost" : "committed"}
        >
          <ChatIcon name={ghost ? "loader" : "check"} size={12} />
          {ghost
            ? t("agent.chat.structuredObject.ghost", "Streaming preview")
            : t("agent.chat.structuredObject.committed", "Committed")}
        </span>
      </header>

      {!hasValue ? (
        emptyVariant ? (
          <div className="dcf-chat-structured-object__empty" role="note">
            <span
              className="dcf-chat-structured-object__empty-icon"
              aria-hidden="true"
            >
              <ChatIcon name="info" size={20} />
            </span>
            <div>
              <p className="dcf-chat-structured-object__empty-title">
                {t(
                  "agent.chat.structuredObject.empty.title",
                  "No structured data yet"
                )}
              </p>
              <p className="dcf-chat-structured-object__empty-message">
                {t(
                  "agent.chat.structuredObject.empty.message",
                  "Stream a structured response to see its fields appear here."
                )}
              </p>
            </div>
          </div>
        ) : (
          <p className="dcf-chat-structured-object__empty-line">
            {t("agent.chat.structuredObject.empty.line", "No structured data.")}
          </p>
        )
      ) : rawMode ? (
        <div className="dcf-chat-structured-object__raw">
          <GraphIoViewerComponent
            title={
              title ||
              t("agent.chat.structuredObject.raw", "Raw JSON")
            }
            value={value}
          />
        </div>
      ) : (
        <>
          <ul
            className={`dcf-chat-structured-object__rows${ghost ? " dcf-chat-structured-object__rows--ghost" : ""}`}
            role="list"
            aria-label={t(
              "agent.chat.structuredObject.fields",
              "Streamed fields"
            )}
          >
            {rows.map((row) => (
              <li
                className={`dcf-chat-structured-object__row${row.kind !== "primitive" ? " dcf-chat-structured-object__row--container" : ""}`}
                data-depth={row.depth}
                data-kind={row.kind}
                key={row.path}
              >
                <span
                  className="dcf-chat-structured-object__key"
                  style={{ paddingInlineStart: `${row.depth * 12}px` }}
                >
                  {row.label}
                </span>
                <span className="dcf-chat-structured-object__value">
                  {row.display}
                </span>
              </li>
            ))}
          </ul>
          {ghost ? (
            <p
              className="dcf-chat-structured-object__waiting"
              aria-live="polite"
            >
              {t(
                "agent.chat.structuredObject.waiting",
                "Waiting for the next field…"
              )}
            </p>
          ) : null}
        </>
      )}

      {showHistory && entries.length ? (
        <div className="dcf-chat-structured-object__history">
          <h4 className="dcf-chat-structured-object__history-title">
            {t("agent.chat.structuredObject.history", "History")}
          </h4>
          <ol className="dcf-chat-structured-object__history-list">
            {entries.map((entry, index) => (
              <li
                className="dcf-chat-structured-object__history-item"
                key={`${entry.runId}:${entry.committedAt ?? index}`}
              >
                <button
                  type="button"
                  className="dcf-chat-structured-object__history-button"
                  onClick={() => onHistorySelected?.(entry)}
                >
                  <span className="dcf-chat-structured-object__history-run">
                    {entry.runId ||
                      t(
                        "agent.chat.structuredObject.historyUntitled",
                        "Untitled run"
                      )}
                  </span>
                  <span className="dcf-chat-structured-object__history-summary">
                    {summarizeAgentChatStructuredValue(entry.value)}
                  </span>
                  {entry.committedAt ? (
                    <time
                      className="dcf-chat-structured-object__history-time"
                      dateTime={entry.committedAt}
                    >
                      {entry.committedAt}
                    </time>
                  ) : null}
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatStructuredObject} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatStructuredObjectComponent = ChatStructuredObject;
