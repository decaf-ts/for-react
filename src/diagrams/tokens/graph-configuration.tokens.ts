/**
 * @module for-react/diagrams/tokens/graph-configuration.tokens
 * @summary Runtime defaults for the graph editor, retained as plain constants.
 * @description The legacy package exposed these values as root-provided injection tokens.
 * React hosts pass the same values as props; these constants are the defaults.
 */
import type { GraphIoPanelLimit } from '../internal/config.js';

export {
  GRAPH_HISTORY_LIMIT_DEFAULT as GRAPH_HISTORY_LIMIT,
  GRAPH_AUTOSAVE_DEBOUNCE_MS_DEFAULT as GRAPH_AUTOSAVE_DEBOUNCE_MS,
  GRAPH_IO_PANEL_LIMIT_DEFAULT as GRAPH_IO_PANEL_LIMIT,
} from '../internal/config.js';

export type { GraphIoPanelLimit };

/**
 * @description Developer-mode flag for the graph demo chrome; defaults to `false`.
 * @summary Developer-mode flag for the graph demo chrome; defaults to `false`.
 * @memberOf module:for-react.diagrams
 */
export const GRAPH_DEV_MODE = false;
