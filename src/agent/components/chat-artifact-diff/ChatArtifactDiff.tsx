/**
 * @file
 * @summary Text diff between two artifact revisions with side-by-side and inline modes.
 * @description Renders the `ChatArtifactDiff` agent chat component and its props contract.
 */
import React, { useEffect, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatDiffLine,
  AgentChatDiffRow,
} from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Presentation mode of the artifact diff.
 * @summary Either a two-column side-by-side diff or a single inline diff.
 * @memberOf module:for-react.agent
 */
export type ChatArtifactDiffMode = "side-by-side" | "inline";

interface DiffOperation {
  kind: "equal" | "removed" | "added";
  previous?: AgentChatDiffLine;
  current?: AgentChatDiffLine;
}

const MAX_DP_CELLS = 250_000;

function toLines(text: string): string[] {
  return text.length === 0 ? [] : text.split("\n");
}

function buildOperations(
  previous: string[],
  current: string[]
): DiffOperation[] {
  if (previous.length * current.length > MAX_DP_CELLS) {
    return [
      ...previous.map<DiffOperation>((text, index) => ({
        kind: "removed",
        previous: { number: index + 1, text },
      })),
      ...current.map<DiffOperation>((text, index) => ({
        kind: "added",
        current: { number: index + 1, text },
      })),
    ];
  }
  const rows = previous.length;
  const columns = current.length;
  const table: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(columns + 1).fill(0)
  );
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = columns - 1; j >= 0; j -= 1) {
      table[i][j] =
        previous[i] === current[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const operations: DiffOperation[] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < columns) {
    if (previous[i] === current[j]) {
      operations.push({
        kind: "equal",
        previous: { number: i + 1, text: previous[i] },
        current: { number: j + 1, text: current[j] },
      });
      i += 1;
      j += 1;
      continue;
    }
    if (table[i + 1][j] >= table[i][j + 1]) {
      operations.push({
        kind: "removed",
        previous: { number: i + 1, text: previous[i] },
      });
      i += 1;
    } else {
      operations.push({
        kind: "added",
        current: { number: j + 1, text: current[j] },
      });
      j += 1;
    }
  }
  while (i < rows) {
    operations.push({
      kind: "removed",
      previous: { number: i + 1, text: previous[i] },
    });
    i += 1;
  }
  while (j < columns) {
    operations.push({
      kind: "added",
      current: { number: j + 1, text: current[j] },
    });
    j += 1;
  }
  return operations;
}

/**
 * @description Computes line-based diff rows between two artifact revisions.
 * @summary Pairs removed and added lines into `changed` rows and keeps equal
 * lines aligned; falls back to a flat remove/add listing when the LCS table
 * would exceed the internal cell budget.
 * @param {string} previousText - Previous artifact content.
 * @param {string} currentText - Current artifact content.
 * @returns {Array} Diff rows in display order.
 * @memberOf module:for-react.agent
 */
export function diffAgentChatArtifactText(
  previousText: string,
  currentText: string
): AgentChatDiffRow[] {
  const operations = buildOperations(
    toLines(previousText),
    toLines(currentText)
  );
  const rows: AgentChatDiffRow[] = [];
  let index = 0;
  while (index < operations.length) {
    const operation = operations[index];
    if (operation.kind === "equal") {
      rows.push({
        kind: "equal",
        previous: operation.previous,
        current: operation.current,
      });
      index += 1;
      continue;
    }
    const removed: AgentChatDiffLine[] = [];
    const added: AgentChatDiffLine[] = [];
    while (index < operations.length && operations[index].kind !== "equal") {
      if (operations[index].kind === "removed" && operations[index].previous) {
        removed.push(operations[index].previous as AgentChatDiffLine);
      }
      if (operations[index].kind === "added" && operations[index].current) {
        added.push(operations[index].current as AgentChatDiffLine);
      }
      index += 1;
    }
    const length = Math.max(removed.length, added.length);
    for (let offset = 0; offset < length; offset += 1) {
      const previousLine = removed[offset];
      const currentLine = added[offset];
      if (previousLine && currentLine) {
        rows.push({
          kind: "changed",
          previous: previousLine,
          current: currentLine,
        });
      } else if (previousLine) {
        rows.push({ kind: "removed", previous: previousLine });
      } else if (currentLine) {
        rows.push({ kind: "added", current: currentLine });
      }
    }
  }
  return rows;
}

/**
 * @description Reports whether any diff row differs from the previous revision.
 * @param {Array} rows - Diff rows produced by {@link diffAgentChatArtifactText}.
 * @returns {boolean} `true` when at least one row is not `equal`.
 * @memberOf module:for-react.agent
 */
export function hasAgentChatArtifactChanges(
  rows: AgentChatDiffRow[]
): boolean {
  return rows.some((row) => row.kind !== "equal");
}

/**
 * @description Props accepted by {@link ChatArtifactDiff}.
 * @summary Declares every input the ChatArtifactDiff component understands.
 * @memberOf module:for-react.agent
 * @property {string} [previous] - Previous side of the diff.
 * @property {string} [current] - Current side of the diff.
 * @property {ChatArtifactDiffMode | string} [mode] - Diff presentation mode.
 * @property {boolean} [showToggle] - Whether the diff mode toggle is shown.
 * @property {function} [onModeChange] - Called when the diff mode changes.
 */
export interface ChatArtifactDiffProps {
  previous?: string;
  current?: string;
  mode?: ChatArtifactDiffMode | null;
  showToggle?: boolean;
  onModeChange?: (mode: ChatArtifactDiffMode) => void;
}

/**
 * @description Text diff between two artifact revisions with side-by-side and inline modes.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatArtifactDiff({
  previous = "",
  current = "",
  mode = null,
  showToggle = true,
  onModeChange,
}: ChatArtifactDiffProps) {
  const t = useAgentTranslate();
  const [internalMode, setInternalMode] =
    useState<ChatArtifactDiffMode | null>(null);

  useEffect(() => {
    setInternalMode(null);
  }, [mode]);

  const activeMode: ChatArtifactDiffMode =
    mode ?? internalMode ?? "side-by-side";
  const rows = diffAgentChatArtifactText(previous, current);
  const changed = hasAgentChatArtifactChanges(rows);

  let added = 0;
  let removed = 0;
  for (const row of rows) {
    if (row.kind === "added") added += 1;
    else if (row.kind === "removed") removed += 1;
    else if (row.kind === "changed") {
      added += 1;
      removed += 1;
    }
  }

  const setMode = (next: ChatArtifactDiffMode) => {
    setInternalMode(next);
    onModeChange?.(next);
  };

  return (
    <section
      className="dcf-chat-artifact-diff"
      data-mode={activeMode}
      aria-label={t("agent.chat.artifact.diff.label", "Artifact changes")}
    >
      <header className="dcf-chat-artifact-diff__header">
        <span className="dcf-chat-artifact-diff__caption">
          {t("agent.chat.artifact.diff.caption", "Previous vs current")}
        </span>
        <span className="dcf-chat-artifact-diff__stats">
          <span
            className="dcf-chat-artifact-diff__stat dcf-chat-artifact-diff__stat--added"
            aria-label={`${t("agent.chat.artifact.diff.added", "Added lines")}: ${added}`}
          >
            <ChatIcon name="chevron-up" size={11} />
            {added}
          </span>
          <span
            className="dcf-chat-artifact-diff__stat dcf-chat-artifact-diff__stat--removed"
            aria-label={`${t("agent.chat.artifact.diff.removed", "Removed lines")}: ${removed}`}
          >
            <ChatIcon name="chevron-down" size={11} />
            {removed}
          </span>
        </span>
        {showToggle ? (
          <div
            className="dcf-chat-artifact-diff__modes"
            role="group"
            aria-label={t("agent.chat.artifact.diff.mode", "Diff display mode")}
          >
            <button
              type="button"
              className={`dcf-chat-artifact-diff__mode${activeMode === "side-by-side" ? " dcf-chat-artifact-diff__mode--active" : ""}`}
              aria-pressed={activeMode === "side-by-side"}
              onClick={() => setMode("side-by-side")}
            >
              {t("agent.chat.artifact.diff.sideBySide", "Side-by-side")}
            </button>
            <button
              type="button"
              className={`dcf-chat-artifact-diff__mode${activeMode === "inline" ? " dcf-chat-artifact-diff__mode--active" : ""}`}
              aria-pressed={activeMode === "inline"}
              onClick={() => setMode("inline")}
            >
              {t("agent.chat.artifact.diff.inline", "Inline")}
            </button>
          </div>
        ) : null}
      </header>

      {!changed ? (
        <p className="dcf-chat-artifact-diff__empty">
          <ChatIcon name="check" size={14} />
          {t("agent.chat.artifact.diff.noChanges", "No changes")}
        </p>
      ) : activeMode === "inline" ? (
        <div className="dcf-chat-artifact-diff__inline" role="list">
          {rows.map((row, index) => {
            if (row.kind === "equal") {
              return (
                <div
                  className="dcf-chat-artifact-diff__line dcf-chat-artifact-diff__line--equal"
                  role="listitem"
                  key={index}
                >
                  <span className="dcf-chat-artifact-diff__number">
                    {row.previous?.number}
                  </span>
                  <span
                    className="dcf-chat-artifact-diff__sign"
                    aria-hidden="true"
                  >
                    {" "}
                  </span>
                  <span className="dcf-chat-artifact-diff__text">
                    {row.previous?.text}
                  </span>
                </div>
              );
            }
            if (row.kind === "added") {
              return (
                <div
                  className="dcf-chat-artifact-diff__line dcf-chat-artifact-diff__line--added"
                  role="listitem"
                  key={index}
                >
                  <span className="dcf-chat-artifact-diff__number">
                    {row.current?.number}
                  </span>
                  <span
                    className="dcf-chat-artifact-diff__sign"
                    aria-hidden="true"
                  >
                    +
                  </span>
                  <span className="dcf-chat-artifact-diff__text">
                    {row.current?.text}
                  </span>
                  <span className="dcf-chat-artifact-diff__sr">
                    {t("agent.chat.artifact.diff.added", "Added line")}
                  </span>
                </div>
              );
            }
            if (row.kind === "removed") {
              return (
                <div
                  className="dcf-chat-artifact-diff__line dcf-chat-artifact-diff__line--removed"
                  role="listitem"
                  key={index}
                >
                  <span className="dcf-chat-artifact-diff__number">
                    {row.previous?.number}
                  </span>
                  <span
                    className="dcf-chat-artifact-diff__sign"
                    aria-hidden="true"
                  >
                    −
                  </span>
                  <span className="dcf-chat-artifact-diff__text">
                    {row.previous?.text}
                  </span>
                  <span className="dcf-chat-artifact-diff__sr">
                    {t("agent.chat.artifact.diff.removed", "Removed line")}
                  </span>
                </div>
              );
            }
            return (
              <React.Fragment key={index}>
                <div
                  className="dcf-chat-artifact-diff__line dcf-chat-artifact-diff__line--removed"
                  role="listitem"
                >
                  <span className="dcf-chat-artifact-diff__number">
                    {row.previous?.number}
                  </span>
                  <span
                    className="dcf-chat-artifact-diff__sign"
                    aria-hidden="true"
                  >
                    −
                  </span>
                  <span className="dcf-chat-artifact-diff__text">
                    {row.previous?.text}
                  </span>
                  <span className="dcf-chat-artifact-diff__sr">
                    {t("agent.chat.artifact.diff.removed", "Removed line")}
                  </span>
                </div>
                <div
                  className="dcf-chat-artifact-diff__line dcf-chat-artifact-diff__line--added"
                  role="listitem"
                >
                  <span className="dcf-chat-artifact-diff__number">
                    {row.current?.number}
                  </span>
                  <span
                    className="dcf-chat-artifact-diff__sign"
                    aria-hidden="true"
                  >
                    +
                  </span>
                  <span className="dcf-chat-artifact-diff__text">
                    {row.current?.text}
                  </span>
                  <span className="dcf-chat-artifact-diff__sr">
                    {t("agent.chat.artifact.diff.added", "Added line")}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <div className="dcf-chat-artifact-diff__side">
          <div className="dcf-chat-artifact-diff__side-header" aria-hidden="true">
            <span>{t("agent.chat.artifact.diff.previous", "Previous")}</span>
            <span>{t("agent.chat.artifact.diff.current", "Current")}</span>
          </div>
          {rows.map((row, index) => (
            <div
              className="dcf-chat-artifact-diff__side-row"
              data-kind={row.kind}
              key={index}
            >
              <div
                className={`dcf-chat-artifact-diff__side-cell dcf-chat-artifact-diff__side-cell--previous${row.previous ? "" : " dcf-chat-artifact-diff__side-cell--empty"}`}
              >
                <span className="dcf-chat-artifact-diff__number">
                  {row.previous?.number}
                </span>
                <span className="dcf-chat-artifact-diff__text">
                  {row.previous?.text}
                </span>
              </div>
              <div
                className={`dcf-chat-artifact-diff__side-cell dcf-chat-artifact-diff__side-cell--current${row.current ? "" : " dcf-chat-artifact-diff__side-cell--empty"}`}
              >
                <span className="dcf-chat-artifact-diff__number">
                  {row.current?.number}
                </span>
                <span className="dcf-chat-artifact-diff__text">
                  {row.current?.text}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatArtifactDiff} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatArtifactDiffComponent = ChatArtifactDiff;
