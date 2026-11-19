/**
 * @module for-react/diagrams/internal/config
 * @summary Runtime configuration defaults for the React graph diagrams port.
 * @description The legacy package exposed providers/InjectionTokens for the graph
 * backend origin and editor limits. React hosts pass the same values as component
 * props; these constants are the defaults when a host omits them.
 */

/** Development default for the graph backend origin. */
export const DEFAULT_GRAPH_BACKEND_URL = "http://localhost:3000";

let warnedDefaultGraphBackendUrl = false;

/**
 * Resolves the default graph backend origin, warning once when it is used in a
 * production build. Hosts should pass their deployed backend origin instead.
 */
export function defaultGraphBackendUrl(): string {
  const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV;
  if (nodeEnv === "production" && !warnedDefaultGraphBackendUrl) {
    warnedDefaultGraphBackendUrl = true;
    console.warn(
      `[for-react/diagrams] Using the development graph backend default ` +
        `"${DEFAULT_GRAPH_BACKEND_URL}". Pass the production graph backend origin to the host instead.`
    );
  }
  return DEFAULT_GRAPH_BACKEND_URL;
}

/**
 * @description Default undo history length.
 * @summary Default undo history length.
 * @memberOf module:for-react.diagrams
 */
export const GRAPH_HISTORY_LIMIT_DEFAULT = 10;

/**
 * @description Default autosave debounce window in milliseconds.
 * @summary Default autosave debounce window in milliseconds.
 * @memberOf module:for-react.diagrams
 */
export const GRAPH_AUTOSAVE_DEBOUNCE_MS_DEFAULT = 500;

/**
 * @description Byte/line rendering cap for a node I/O panel.
 * @summary Byte/line rendering cap for a node I/O panel.
 * @memberOf module:for-react.diagrams
 */
export interface GraphIoPanelLimit {
  /** Maximum rendered payload size in UTF-8 bytes. */
  bytes: number;
  /** Maximum rendered payload line count. */
  lines: number;
}

/**
 * @description Default node I/O rendering cap: 256 KB or 2000 lines.
 * @summary Default node I/O rendering cap: 256 KB or 2000 lines.
 * @memberOf module:for-react.diagrams
 */
export const GRAPH_IO_PANEL_LIMIT_DEFAULT: GraphIoPanelLimit = {
  bytes: 256 * 1024,
  lines: 2000,
};
