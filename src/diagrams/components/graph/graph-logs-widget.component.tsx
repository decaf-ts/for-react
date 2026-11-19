/**
 * @module for-react/diagrams/components/graph-logs-widget
 * @summary Chrome-console-style run log drawer docked to the canvas bottom.
 * @description Renders the streamed `GRAPH_RUN_LOG` entries plus the
 * run-lifecycle lines (created/validated/validation issues) from the
 * {@link graphRunLog} singleton store as a collapsible, filterable console the
 * user opens on demand. Level filtering follows browser devtools semantics:
 * picking a level shows that level plus everything above it.
 */
import { useSignalValue } from '../../internal/reactive.js';

import type { GraphRunLogEntry } from '@decaf-ts/as-graph/shared';
import {
  GRAPH_LOG_FILTER_LABELS,
  GRAPH_LOG_LEVEL_SEVERITY,
  GRAPH_RUN_LOG_LIFECYCLE_LABELS,
  graphRunLog,
  type GraphLogFilterLevel,
  type GraphRunLogLifecycleEntry,
} from '../../execution/GraphRunLogStore.js';

function entryLevelClassFn(level: GraphRunLogEntry['level']): string {
  return GRAPH_LOG_LEVEL_SEVERITY[level] >= 6
    ? 'graph-logs__entry--error'
    : GRAPH_LOG_LEVEL_SEVERITY[level] >= 5
      ? 'graph-logs__entry--warn'
      : GRAPH_LOG_LEVEL_SEVERITY[level] >= 4
        ? 'graph-logs__entry--info'
        : 'graph-logs__entry--debug';
}

function entryLevelLabelFn(level: GraphRunLogEntry['level']): string {
  return typeof level === 'string' && level ? level.toUpperCase() : 'LOG';
}

function entryTimeFn(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatValueFn(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * CSS modifier class for a run-lifecycle line based on its kind.
 * @param kind Lifecycle transition the line reports.
 * @returns `graph-logs__lifecycle-entry--{created|validated|validation-issues}`.
 */
function lifecycleClassFn(kind: GraphRunLogLifecycleEntry['kind']): string {
  return `graph-logs__lifecycle-entry--${kind}`;
}

/**
 * Docked bottom-drawer run log console (DECAF-50 §4.22/D6). Renders the
 * streamed `GRAPH_RUN_LOG` entries and the run-lifecycle lines held by the
 * shared {@link graphRunLog} signal store, with a header bar of level presets, a
 * warnings/errors counter, and clear / collapse / dismiss actions. When closed it
 * renders an open affordance so the user can open it on demand regardless of
 * whether the run produced any entries; when open with nothing to show it renders
 * an empty state. Purely presentational: it never writes to the store beyond the
 * user actions it exposes, so the store remains the single source of truth.
 */
/**
 * @description Docked bottom-drawer run log console. Renders the streamed `GRAPH_RUN_LOG` entries and run-lifecycle lines held by the shared {@link graphRunLog} store, with level presets, counters, clear/collapse/dismiss actions, and an on-demand open affordance.
 * @summary Docked bottom-drawer run log console.
 * @memberOf module:for-react.diagrams
 */
export function GraphLogsWidgetComponent() {
  const open = useSignalValue(graphRunLog.open);
  const collapsed = useSignalValue(graphRunLog.collapsed);
  const filter = useSignalValue(graphRunLog.filter);
  const entries = useSignalValue(graphRunLog.entries);
  const lifecycle = useSignalValue(graphRunLog.lifecycle);
  const visibleEntries = useSignalValue(graphRunLog.visibleEntries);
  const counts = useSignalValue(graphRunLog.counts);
  const isEmpty = useSignalValue(graphRunLog.isEmpty);
  const raised = open && !collapsed;
  const levelOptions: GraphLogFilterLevel[] = ['verbose', 'info', 'warn', 'error'];

  return (
    <section className={`graph-logs-dock${raised ? ' graph-logs-dock--open' : ''}`}>
      <header className="graph-logs__header">
        <button
          type="button"
          className="graph-logs__toggle"
          aria-expanded={raised}
          aria-controls="graph-logs-body"
          aria-label={raised ? 'Collapse run log' : 'Open run log'}
          title={raised ? 'Collapse run log' : 'Open run log'}
          onClick={() => {
            if (open && collapsed) graphRunLog.setCollapsed(false);
            else graphRunLog.setOpen(!open);
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            {raised ? <path d="M2 6 L8 6 L5 3 Z" fill="currentColor" /> : <path d="M2 3 L8 3 L5 6 Z" fill="currentColor" />}
          </svg>
        </button>
        <span className="graph-logs__title">Run console</span>
        <span className="graph-logs__count">
          {counts.warnings} W · {counts.errors} E
        </span>
        {open ? (
          <>
            <nav className="graph-logs__filters">
              {levelOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`graph-logs__filter${filter === option ? ' graph-logs__filter--active' : ''}`}
                  onClick={() => graphRunLog.setFilter(option)}
                >
                  {GRAPH_LOG_FILTER_LABELS[option]}
                </button>
              ))}
            </nav>
            <button type="button" className="graph-logs__icon-btn" title="Clear log" onClick={() => graphRunLog.clear()}>
              Clear
            </button>
            <button type="button" className="graph-logs__icon-btn" title="Dismiss console" onClick={() => graphRunLog.setOpen(false)}>
              ×
            </button>
          </>
        ) : (
          <button type="button" className="graph-logs__handle" title="Open run log" aria-label="Open run log" onClick={() => graphRunLog.setOpen(true)}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 3 L8 3 L5 6 Z" fill="currentColor" />
            </svg>
            <span className="graph-logs__handle-label">Run log</span>
          </button>
        )}
      </header>
      <div
        id="graph-logs-body"
        className={`graph-logs-dock__drawer${open ? ' graph-logs' : ''}`}
        aria-hidden={raised ? undefined : true}
      >
        <div className="graph-logs__body">
          {lifecycle.length ? (
            <ol className="graph-logs__lifecycle">
              {lifecycle.map((line, index) => (
                <li key={`${line.kind}-${line.timestamp}-${line.message}-${index}`} className={`graph-logs__lifecycle-entry ${lifecycleClassFn(line.kind)}`}>
                  <span className="graph-logs__level graph-logs__level-badge">{GRAPH_RUN_LOG_LIFECYCLE_LABELS[line.kind]}</span>
                  <span className="graph-logs__time">{entryTimeFn(line.timestamp)}</span>
                  <span className="graph-logs__message">{line.message}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {visibleEntries.length ? (
            <ol className="graph-logs__list">
              {visibleEntries.map((entry, index) => (
                <li key={`${index}-${entry.runId}-${entry.timestamp}-${entry.message}`} className={`graph-logs__entry ${entryLevelClassFn(entry.level)}`}>
                  <span className="graph-logs__level graph-logs__level-badge">{entryLevelLabelFn(entry.level)}</span>
                  <span className="graph-logs__time">{entryTimeFn(entry.timestamp)}</span>
                  {entry.nodeId ? <span className="graph-logs__node" title={`nodeId: ${entry.nodeId}`}>{entry.nodeId}</span> : null}
                  <span className="graph-logs__message">{entry.message}</span>
                  {entry.payload !== null && entry.payload !== undefined ? (
                    <code className="graph-logs__payload">{formatValueFn(entry.payload)}</code>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : entries.length ? (
            <p className="graph-logs__empty">No messages match the selected filter.</p>
          ) : isEmpty ? (
            <p className="graph-logs__empty">No run messages yet.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default GraphLogsWidgetComponent;
