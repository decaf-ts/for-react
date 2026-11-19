/**
 * @file
 * @summary Per-run telemetry table with expand/collapse control.
 * @description Renders the `ChatTelemetry` agent chat component and its props contract.
 */
import React, { useEffect, useId, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatRoundtripTelemetry } from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatTelemetry}.
 * @summary Declares every input the ChatTelemetry component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [roundtrips] - Per-run telemetry rows.
 * @property {boolean} [open] - Whether the surface is open.
 * @property {string} [title] - Title text.
 * @property {function} [onToggle] - Called when the expanded state changes.
 */
export interface ChatTelemetryProps {
  roundtrips?: AgentChatRoundtripTelemetry[];
  open?: boolean;
  title?: string | null;
  onToggle?: (expanded: boolean) => void;
}

interface DurationView {
  value: string;
  unitKey: string;
  unitFallback: string;
}

function formatDuration(durationMs: number): DurationView {
  if (durationMs < 1000) {
    return {
      value: `${Math.round(durationMs)}`,
      unitKey: "agent.chat.telemetry.millisecondsShort",
      unitFallback: "ms",
    };
  }
  return {
    value: `${(durationMs / 1000).toFixed(1)}`,
    unitKey: "agent.chat.telemetry.secondsShort",
    unitFallback: "s",
  };
}

function durationOf(row: AgentChatRoundtripTelemetry): DurationView | null {
  if (typeof row.durationMs === "number") return formatDuration(row.durationMs);
  if (!row.startedAt || !row.finishedAt) return null;
  const started = Date.parse(row.startedAt);
  const finished = Date.parse(row.finishedAt);
  if (Number.isNaN(started) || Number.isNaN(finished)) return null;
  return formatDuration(Math.max(0, finished - started));
}

function hasMetadata(row: AgentChatRoundtripTelemetry): boolean {
  return (
    !!row.functionId ||
    !!row.traceId ||
    row.runtimeContext !== undefined ||
    row.promptTokens !== undefined ||
    row.completionTokens !== undefined ||
    row.totalTokens !== undefined
  );
}

function contextText(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * @description Per-run telemetry table with expand/collapse control.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatTelemetry({
  roundtrips = [],
  open = false,
  title = null,
  onToggle,
}: ChatTelemetryProps) {
  const t = useAgentTranslate();
  const contentId = useId();
  const [expanded, setExpanded] = useState(open);

  useEffect(() => {
    setExpanded(open);
  }, [open]);

  const heading = title || t("agent.chat.telemetry.title", "Run telemetry");

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    onToggle?.(next);
  };

  return (
    <section className="dcf-chat-telemetry" aria-label={heading}>
      <button
        type="button"
        className="dcf-chat-telemetry__trigger"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={toggle}
      >
        <ChatIcon name="info" size={15} />
        <span className="dcf-chat-telemetry__title">{heading}</span>
        <span className="dcf-chat-telemetry__count">{roundtrips.length}</span>
        <ChatIcon
          className="dcf-chat-telemetry__chevron"
          name={expanded ? "chevron-up" : "chevron-down"}
          size={15}
        />
      </button>

      {expanded ? (
        <div
          className="dcf-chat-telemetry__content"
          id={contentId}
          role="region"
          aria-label={t("agent.chat.telemetry.title", "Run telemetry")}
        >
          {roundtrips.length ? (
            <ul className="dcf-chat-telemetry__rows">
              {roundtrips.map((row) => {
                const duration = durationOf(row);
                return (
                  <li
                    className="dcf-chat-telemetry__row"
                    data-status={row.status}
                    data-replayed={row.replayed ? "true" : undefined}
                    key={row.runId}
                  >
                    <div className="dcf-chat-telemetry__summary">
                      <span className="dcf-chat-telemetry__run">
                        {row.runId}
                      </span>
                      {duration ? (
                        <span className="dcf-chat-telemetry__duration">
                          {duration.value}{" "}
                          {t(duration.unitKey, duration.unitFallback)}
                        </span>
                      ) : null}
                      <span className="dcf-chat-telemetry__status">
                        {t(`agent.chat.status.${row.status}`, row.status)}
                      </span>
                      {row.replayed ? (
                        <span className="dcf-chat-telemetry__replayed">
                          {t("agent.chat.telemetry.replayed", "Replayed")}
                        </span>
                      ) : null}
                      <span className="dcf-chat-telemetry__nodes">
                        {row.completedNodeCount ?? 0}/{row.nodeCount ?? 0}
                      </span>
                      {row.totalTokens !== undefined ? (
                        <span className="dcf-chat-telemetry__tokens">
                          {row.totalTokens}{" "}
                          {t("agent.chat.telemetry.tokensShort", "tokens")}
                        </span>
                      ) : null}
                    </div>

                    {row.error?.message ? (
                      <p className="dcf-chat-telemetry__error" role="alert">
                        {row.error.message}
                      </p>
                    ) : null}

                    {hasMetadata(row) ? (
                      <>
                        <dl className="dcf-chat-telemetry__metadata">
                          {row.functionId ? (
                            <div className="dcf-chat-telemetry__meta">
                              <dt>
                                {t(
                                  "agent.chat.telemetry.functionId",
                                  "Function"
                                )}
                              </dt>
                              <dd>{row.functionId}</dd>
                            </div>
                          ) : null}
                          {row.traceId ? (
                            <div className="dcf-chat-telemetry__meta">
                              <dt>
                                {t("agent.chat.telemetry.traceId", "Trace")}
                              </dt>
                              <dd className="dcf-chat-telemetry__mono">
                                {row.traceId}
                              </dd>
                            </div>
                          ) : null}
                          {row.promptTokens !== undefined ? (
                            <div className="dcf-chat-telemetry__meta">
                              <dt>
                                {t(
                                  "agent.chat.telemetry.promptTokens",
                                  "Prompt tokens"
                                )}
                              </dt>
                              <dd>{row.promptTokens}</dd>
                            </div>
                          ) : null}
                          {row.completionTokens !== undefined ? (
                            <div className="dcf-chat-telemetry__meta">
                              <dt>
                                {t(
                                  "agent.chat.telemetry.completionTokens",
                                  "Completion tokens"
                                )}
                              </dt>
                              <dd>{row.completionTokens}</dd>
                            </div>
                          ) : null}
                          {row.totalTokens !== undefined ? (
                            <div className="dcf-chat-telemetry__meta">
                              <dt>
                                {t(
                                  "agent.chat.telemetry.totalTokens",
                                  "Total tokens"
                                )}
                              </dt>
                              <dd>{row.totalTokens}</dd>
                            </div>
                          ) : null}
                        </dl>
                        {row.runtimeContext !== undefined ? (
                          <div className="dcf-chat-telemetry__context">
                            <span className="dcf-chat-telemetry__context-title">
                              {t(
                                "agent.chat.telemetry.runtimeContext",
                                "Runtime context"
                              )}
                            </span>
                            <pre className="dcf-chat-telemetry__json">
                              {contextText(row.runtimeContext)}
                            </pre>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="dcf-chat-telemetry__empty">
              {t("agent.chat.roundtrip.empty", "No roundtrips yet.")}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatTelemetry} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatTelemetryComponent = ChatTelemetry;
