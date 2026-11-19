import { Model } from "@decaf-ts/decorator-validation";
import { DashDocument, DashPlacement, GridRange } from "./dashboard.types";

/**
 * @description Constrains a number to an inclusive range.
 * @summary Returns `min` when `n` is below it, `max` when above it, and `n`
 * otherwise.
 * @param {number} n - Value to constrain.
 * @param {number} min - Lower bound of the range.
 * @param {number} max - Upper bound of the range.
 * @returns {number} The clamped value.
 * @memberOf module:for-react
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * @description Enumerates every cell covered by a grid range.
 * @summary Iterates the range's rows then columns and returns the one-based
 * coordinate of each cell.
 * @param {GridRange} p - Range whose cells should be listed.
 * @returns {Object[]} Coordinates of all covered cells, each shaped as
 * `{ col, row }`.
 * @memberOf module:for-react
 */
export function cellsOf(p: GridRange): { col: number; row: number }[] {
  const cells: { col: number; row: number }[] = [];
  for (let row = p.row; row < p.row + p.rows; row++) {
    for (let col = p.col; col < p.col + p.cols; col++) {
      cells.push({ col, row });
    }
  }
  return cells;
}

/**
 * @description Tests whether two grid ranges intersect.
 * @summary Compares their column and row extents using the standard
 * axis-aligned overlap test; touching edges without shared cells do not count.
 * @param {GridRange} a - First range.
 * @param {GridRange} b - Second range.
 * @returns {boolean} `true` when the ranges share at least one cell.
 * @memberOf module:for-react
 */
export function rangesOverlap(a: GridRange, b: GridRange): boolean {
  return (
    a.col < b.col + b.cols &&
    a.col + a.cols > b.col &&
    a.row < b.row + b.rows &&
    a.row + a.rows > b.row
  );
}

/**
 * @description Builds a grid range from a placement's span and an origin.
 * @summary Takes only the `cols`/`rows` footprint from the placement and pairs
 * it with the supplied column and row.
 * @param {Pick<DashPlacement, "cols" | "rows">} p - Source of the footprint dimensions.
 * @param {number} col - One-based origin column.
 * @param {number} row - One-based origin row.
 * @returns {GridRange} The resulting range.
 * @memberOf module:for-react
 */
export function rangeFor(
  p: Pick<DashPlacement, "cols" | "rows">,
  col: number,
  row: number
): GridRange {
  return { col, row, cols: p.cols, rows: p.rows };
}

/**
 * @description Checks whether a placement may occupy a given origin cell.
 * @summary Rejects origins below 1 or footprints that exceed `gridCols`/
 * `gridRows`, then rejects the position when the proposed range overlaps any
 * placement other than the moving one (matched by `id`).
 * @param {Pick<DashPlacement, "id" | "cols" | "rows">} p - Placement being positioned.
 * @param {number} col - Proposed one-based origin column.
 * @param {number} row - Proposed one-based origin row.
 * @param {DashPlacement[]} placements - Existing placements to test against.
 * @param {number} gridCols - Total number of grid columns.
 * @param {number} gridRows - Total number of grid rows.
 * @returns {boolean} `true` when the placement fits within bounds and is unobstructed.
 * @memberOf module:for-react
 */
export function canPlace(
  p: Pick<DashPlacement, "id" | "cols" | "rows">,
  col: number,
  row: number,
  placements: DashPlacement[],
  gridCols: number,
  gridRows: number
): boolean {
  if (col < 1 || row < 1) return false;
  if (col + p.cols - 1 > gridCols || row + p.rows - 1 > gridRows) return false;
  const proposed = rangeFor(p, col, row);
  return !placements.some(
    (other) => other.id !== p.id && rangesOverlap(proposed, other)
  );
}

/**
 * @description Computes a snapped drag target for a placement.
 * @summary Rounds the pointer coordinates, clamps the origin so the footprint
 * stays inside the grid, and returns the resulting range only when
 * {@link canPlace} accepts it.
 * @param {Pick<DashPlacement, "id" | "cols" | "rows">} p - Placement being dragged.
 * @param {number} pointerCol - Pointer column in grid units.
 * @param {number} pointerRow - Pointer row in grid units.
 * @param {DashPlacement[]} placements - Existing placements to avoid.
 * @param {number} gridCols - Total number of grid columns.
 * @param {number} gridRows - Total number of grid rows.
 * @returns {GridRange | null} The snapped target, or `null` when it is invalid.
 * @memberOf module:for-react
 */
export function snapDrag(
  p: Pick<DashPlacement, "id" | "cols" | "rows">,
  pointerCol: number,
  pointerRow: number,
  placements: DashPlacement[],
  gridCols: number,
  gridRows: number
): GridRange | null {
  const col = clamp(Math.round(pointerCol), 1, gridCols - p.cols + 1);
  const row = clamp(Math.round(pointerRow), 1, gridRows - p.rows + 1);
  if (!canPlace(p, col, row, placements, gridCols, gridRows)) return null;
  return rangeFor(p, col, row);
}

/**
 * @description Computes a snapped resize target for a placement.
 * @summary Treats the pointer arguments as the desired column and row span,
 * rounds and clamps them to the grid bounds, and returns the resized range only
 * when it does not overlap any other placement.
 * @param {Pick<DashPlacement, "id" | "col" | "row">} p - Placement being resized.
 * @param {number} pointerCol - Desired column span in grid units.
 * @param {number} pointerRow - Desired row span in grid units.
 * @param {DashPlacement[]} placements - Existing placements to avoid.
 * @param {number} gridCols - Total number of grid columns.
 * @param {number} gridRows - Total number of grid rows.
 * @returns {GridRange | null} The snapped range, or `null` when it is invalid.
 * @memberOf module:for-react
 */
export function snapResize(
  p: Pick<DashPlacement, "id" | "col" | "row">,
  pointerCol: number,
  pointerRow: number,
  placements: DashPlacement[],
  gridCols: number,
  gridRows: number
): GridRange | null {
  const cols = clamp(Math.round(pointerCol), 1, gridCols - p.col + 1);
  const rows = clamp(Math.round(pointerRow), 1, gridRows - p.row + 1);
  const proposed: GridRange = { col: p.col, row: p.row, cols, rows };
  const invalid = placements.some(
    (other) => other.id !== p.id && rangesOverlap(proposed, other)
  );
  if (invalid) return null;
  return proposed;
}

/**
 * @description Builds a decaf model instance carrying dashboard layout data.
 * @summary Creates an anonymous subclass of `Model`, names it via a
 * non-enumerable `name` property, and assigns `cols`, `rows` and `placements`
 * onto the instance so the layout can flow through decorator-driven APIs.
 * @param {string} name - Model name assigned to the anonymous class.
 * @param {number} cols - Grid column count.
 * @param {number} rows - Grid row count.
 * @param {DashPlacement[]} placements - Placements to attach.
 * @returns {Model} The populated model instance.
 * @memberOf module:for-react
 */
export function buildDashboardModel(
  name: string,
  cols: number,
  rows: number,
  placements: DashPlacement[]
): Model {
  const ViewModel = class extends Model {} as unknown as { new (): Model };
  Object.defineProperty(ViewModel, "name", { value: name });
  const instance = new ViewModel();
  Object.assign(instance, { cols, rows, placements });
  return instance;
}

/**
 * @description Produces a plain serializable dashboard document.
 * @summary Copies the placement fields into new objects, cloning each
 * `config` so the returned {@link DashDocument} is detached from the live
 * component state.
 * @param {string} name - Document name.
 * @param {number} cols - Grid column count.
 * @param {number} rows - Grid row count.
 * @param {DashPlacement[]} placements - Placements to serialize.
 * @returns {DashDocument} A detached document snapshot.
 * @memberOf module:for-react
 * @example
 * const doc = serializeDocument("Dashboard", 4, 4, placements);
 */
export function serializeDocument(
  name: string,
  cols: number,
  rows: number,
  placements: DashPlacement[]
): DashDocument {
  return {
    name,
    cols,
    rows,
    placements: placements.map((p) => ({
      id: p.id,
      tag: p.tag,
      labelKey: p.labelKey,
      col: p.col,
      row: p.row,
      cols: p.cols,
      rows: p.rows,
      config: { ...p.config },
    })),
  };
}
