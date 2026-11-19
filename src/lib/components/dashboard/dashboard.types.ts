/**
 * @description A single component placed on a dashboard grid.
 * @summary Carries the placement identity, the renderer tag, an optional label
 * key, the one-based grid coordinates and span, and the configuration passed to
 * the rendered component.
 * @memberOf module:for-react
 */
export interface DashPlacement {
  id: string;
  tag: string;
  labelKey?: string;
  col: number;
  row: number;
  cols: number;
  rows: number;
  config: Record<string, unknown>;
}

/**
 * @description Entry offered by a dashboard palette for adding a component.
 * @summary Describes the tag to render, its display label, the default grid
 * footprint, and an optional constructor/config used when a widget is dropped
 * onto the grid.
 * @memberOf module:for-react
 */
export interface DashPaletteEntry {
  tag: string;
  labelKey?: string;
  label?: string;
  defaultSize?: { cols: number; rows: number };
  ctor?: unknown;
  config?: Record<string, unknown>;
}

/**
 * @description Rectangular area on the dashboard grid.
 * @summary Pairs a one-based origin cell with a column and row span, used by
 * the dashboard geometry helpers for overlap and bounds checks.
 * @memberOf module:for-react
 */
export interface GridRange {
  col: number;
  row: number;
  cols: number;
  rows: number;
}

/**
 * @description Serializable dashboard layout.
 * @summary Stores the document name, grid dimensions and the list of
 * placements, forming the shape produced by `serializeDocument` and consumed by
 * {@link RgxDashboard}.
 * @memberOf module:for-react
 */
export interface DashDocument {
  name: string;
  cols: number;
  rows: number;
  placements: DashPlacement[];
}
