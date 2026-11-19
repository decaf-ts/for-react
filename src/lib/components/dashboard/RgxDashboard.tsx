import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { RgxComponentRenderer } from "../component-renderer/RgxComponentRenderer.js";
import { translateKey } from "../../services/RgxTranslateService.js";
import { DashDocument, DashPaletteEntry, DashPlacement } from "./dashboard.types";
import {
  canPlace,
  restorePlacements,
  serializeDocument,
  snapDrag,
  snapResize,
} from "./dashboard.utils";

/**
 * @description Public props accepted by {@link RgxDashboard}.
 * @summary Supplies the grid dimensions, optional persisted document, current
 * operation, palette entries for adding widgets, localization namespace and
 * the save/delete/change/render callbacks.
 * @memberOf module:for-react
 */
export interface RgxDashboardProps {
  cols?: number;
  rows?: number;
  document?: DashDocument;
  operation?: OperationKeys;
  palette?: DashPaletteEntry[];
  className?: string;
  locale?: string;
  onSave?: (document: DashDocument) => void;
  onDeleted?: () => void;
  onChange?: (document: DashDocument) => void;
  renderPlacement?: (placement: DashPlacement) => React.ReactNode;
}

interface DragState {
  id: string;
  mode: "drag" | "resize";
  target?: { col: number; row: number; cols: number; rows: number } | null;
}

function tilePositionLabel(box: {
  col: number;
  row: number;
  cols: number;
  rows: number;
}): string {
  const key = "component.dashboard.tile_position";
  const translated = translateKey(key, box);
  return translated && translated !== key
    ? translated
    : `Column ${box.col}, row ${box.row}, ${box.cols} by ${box.rows} cells`;
}

function tileKeyboardHint(): string {
  const key = "component.dashboard.tile_keyboard_hint";
  const translated = translateKey(key);
  return translated && translated !== key
    ? translated
    : "Use the arrow keys to move; hold Shift with the arrow keys to resize";
}

/**
 * @description Editable grid dashboard for arranging components on a layout.
 * @summary Maintains grid dimensions and placements from the supplied
 * `document` (falling back to `cols`/`rows`), restoring persisted placements
 * through {@link restorePlacements} so unknown tags and unsafe keys are dropped,
 * and renders each placement through `renderPlacement` or
 * {@link RgxComponentRenderer}. For `CREATE`/`UPDATE` it shows a palette that
 * inserts entries into the first free cell, supports pointer drag and resize
 * gestures snapped and validated by {@link snapDrag}/{@link snapResize},
 * supports arrow-key movement (Shift plus an arrow resizes) with a per-tile
 * position label announced to assistive technology, and confirms removal of a
 * placement. Every placement mutation recomputes a serialized document and
 * reports it via `onChange`; the save button sends the serialized document to
 * `onSave`.
 * `READ` renders an empty message when there are no placements and `DELETE`
 * exposes a delete button that calls `onDeleted`. Button labels and messages
 * are translated using the `locale` namespace.
 * @param {RgxDashboardProps} props - Dashboard layout, operation and callbacks.
 * @returns {React.ReactElement} The rendered dashboard.
 * @memberOf module:for-react
 * @example
 * <RgxDashboard
 *   cols={4}
 *   rows={4}
 *   operation={OperationKeys.UPDATE}
 *   palette={palette}
 *   onChange={setDocument}
 *   onSave={persist}
 * />
 */
export const RgxDashboard: React.FC<RgxDashboardProps> = ({
  cols = 4,
  rows = 4,
  document,
  operation = OperationKeys.CREATE,
  palette = [],
  className = "",
  locale = "dashboard",
  onSave,
  onDeleted,
  onChange,
  renderPlacement,
}) => {
  const paletteTagKey = palette.map((entry) => entry.tag).join("\n");
  const [gridCols, setGridCols] = useState(document?.cols || cols);
  const [gridRows, setGridRows] = useState(document?.rows || rows);
  const [placements, setPlacements] = useState<DashPlacement[]>(() =>
    restorePlacements(
      document?.placements,
      paletteTagKey ? paletteTagKey.split("\n") : []
    )
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document?.placements) {
      setPlacements(
        restorePlacements(
          document.placements,
          paletteTagKey ? paletteTagKey.split("\n") : []
        )
      );
      setGridCols(document.cols || cols);
      setGridRows(document.rows || rows);
    }
  }, [document, cols, rows, paletteTagKey]);

  const editable =
    operation === OperationKeys.CREATE || operation === OperationKeys.UPDATE;
  const readOnly = operation === OperationKeys.READ;
  const deleting = operation === OperationKeys.DELETE;

  const notify = useCallback(
    (next: DashPlacement[]) => {
      setPlacements(next);
      if (onChange)
        onChange(serializeDocument("Dashboard", gridCols, gridRows, next));
    },
    [gridCols, gridRows, onChange]
  );

  const addPlacement = (entry: DashPaletteEntry) => {
    const footprint = entry.defaultSize || { cols: 1, rows: 1 };
    for (let row = 1; row <= gridRows; row++) {
      for (let col = 1; col <= gridCols; col++) {
        const candidate: DashPlacement = {
          id: `${entry.tag}-${Date.now()}-${placements.length}`,
          tag: entry.tag,
          labelKey: entry.labelKey,
          col,
          row,
          cols: footprint.cols,
          rows: footprint.rows,
          config: entry.config || {},
        };
        if (canPlace(candidate, col, row, placements, gridCols, gridRows)) {
          notify([...placements, candidate]);
          return;
        }
      }
    }
  };

  const pointerToGrid = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { col: 1, row: 1 };
    return {
      col: ((clientX - rect.left) / rect.width) * gridCols + 1,
      row: ((clientY - rect.top) / rect.height) * gridRows + 1,
    };
  };

  const beginGesture = (
    event: React.PointerEvent,
    placement: DashPlacement,
    mode: "drag" | "resize"
  ) => {
    if (!editable) return;
    event.preventDefault();
    event.stopPropagation();
    setDrag({ id: placement.id, mode, target: null });
  };

  useEffect(() => {
    if (!drag) return;
    const placement = placements.find((item) => item.id === drag.id);
    if (!placement) return;
    const handleMove = (event: PointerEvent) => {
      const { col, row } = pointerToGrid(event.clientX, event.clientY);
      const target =
        drag.mode === "drag"
          ? snapDrag(placement, col, row, placements, gridCols, gridRows)
          : snapResize(
              placement,
              col - placement.col,
              row - placement.row,
              placements,
              gridCols,
              gridRows
            );
      setDrag((current) => (current ? { ...current, target } : current));
    };
    const handleUp = () => {
      setDrag((current) => {
        if (current?.target) {
          notify(
            placements.map((item) =>
              item.id === current.id
                ? {
                    ...item,
                    col: current.target!.col,
                    row: current.target!.row,
                    cols: current.target!.cols,
                    rows: current.target!.rows,
                  }
                : item
            )
          );
        }
        return null;
      });
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [drag, placements, gridCols, gridRows, notify]);

  const removePlacement = (id: string) => {
    setPendingDelete(null);
    notify(placements.filter((item) => item.id !== id));
  };

  const movePlacement = (
    placement: DashPlacement,
    dCol: number,
    dRow: number
  ) => {
    const col = Math.min(
      Math.max(placement.col + dCol, 1),
      gridCols - placement.cols + 1
    );
    const row = Math.min(
      Math.max(placement.row + dRow, 1),
      gridRows - placement.rows + 1
    );
    if (col === placement.col && row === placement.row) return;
    if (!canPlace(placement, col, row, placements, gridCols, gridRows)) return;
    notify(
      placements.map((item) =>
        item.id === placement.id ? { ...item, col, row } : item
      )
    );
  };

  const resizePlacement = (
    placement: DashPlacement,
    dCol: number,
    dRow: number
  ) => {
    const nextCols = Math.min(
      Math.max(placement.cols + dCol, 1),
      gridCols - placement.col + 1
    );
    const nextRows = Math.min(
      Math.max(placement.rows + dRow, 1),
      gridRows - placement.row + 1
    );
    if (nextCols === placement.cols && nextRows === placement.rows) return;
    const candidate = { ...placement, cols: nextCols, rows: nextRows };
    if (
      !canPlace(
        candidate,
        placement.col,
        placement.row,
        placements,
        gridCols,
        gridRows
      )
    )
      return;
    notify(
      placements.map((item) =>
        item.id === placement.id
          ? { ...item, cols: nextCols, rows: nextRows }
          : item
      )
    );
  };

  const onTileKeydown = (
    placement: DashPlacement,
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (!editable) return;
    if (event.target !== event.currentTarget) return;
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    if (event.shiftKey) resizePlacement(placement, delta[0], delta[1]);
    else movePlacement(placement, delta[0], delta[1]);
  };

  const handleSave = () => {
    onSave?.(serializeDocument("Dashboard", gridCols, gridRows, placements));
  };

  const handleDelete = () => {
    onDeleted?.();
  };

  const gridStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
    }),
    [gridCols, gridRows]
  );

  return (
    <div className={["dcf-dashboard", className].filter(Boolean).join(" ")}>
      {editable && (
        <div className="dcf-dashboard-palette">
          <h4 className="dcf-dashboard-palette-title">
            {translateKey(`${locale}.palette`) || "Components"}
          </h4>
          {palette.length ? (
            palette.map((entry) => (
              <button
                key={entry.tag}
                type="button"
                className="dcf-button clear"
                onClick={() => addPlacement(entry)}
              >
                {translateKey(entry.labelKey || entry.label || entry.tag) ||
                  entry.label ||
                  entry.tag}
              </button>
            ))
          ) : (
            <p className="dcf-dashboard-empty">
              {translateKey(`${locale}.emptyPalette`) ||
                "No dashboard components registered."}
            </p>
          )}
        </div>
      )}

      <div
        ref={canvasRef}
        className="dcf-dashboard-canvas"
        style={gridStyle}
        data-cols={gridCols}
        data-rows={gridRows}
      >
        {placements.map((placement) => {
          const isDragging = drag?.id === placement.id;
          const target = isDragging ? drag?.target : undefined;
          const box = target || placement;
          return (
            <div
              key={placement.id}
              className={[
                "dcf-dashboard-placement",
                isDragging ? "dcf-dragging" : "",
                target ? "dcf-valid" : isDragging ? "dcf-invalid" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                gridColumn: `${box.col} / span ${box.cols}`,
                gridRow: `${box.row} / span ${box.rows}`,
              }}
              role="group"
              tabIndex={editable ? 0 : undefined}
              aria-label={tilePositionLabel(box)}
              onKeyDown={(event) => onTileKeydown(placement, event)}
            >
              {editable && (
                <span className="dcf-sr-only">{tileKeyboardHint()}</span>
              )}
              <div
                className="dcf-dashboard-placement-header"
                onPointerDown={(event) => beginGesture(event, placement, "drag")}
              >
                <span>
                  {translateKey(placement.labelKey || placement.tag) ||
                    placement.labelKey ||
                    placement.tag}
                </span>
                {editable && (
                  <button
                    type="button"
                    aria-label={translateKey(`${locale}.remove`) || "Remove"}
                    onClick={() => setPendingDelete(placement.id)}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="dcf-dashboard-placement-body">
                {renderPlacement ? (
                  renderPlacement(placement)
                ) : (
                  <RgxComponentRenderer
                    tag={placement.tag}
                    globals={placement.config}
                  />
                )}
              </div>
              {editable && (
                <span
                  className="dcf-dashboard-resize"
                  role="presentation"
                  onPointerDown={(event) => beginGesture(event, placement, "resize")}
                />
              )}
            </div>
          );
        })}
      </div>

      {pendingDelete && (
        <div className="dcf-dashboard-confirm" role="alertdialog">
          <p>{translateKey(`${locale}.confirm_remove`) || "Remove this component?"}</p>
          <button type="button" onClick={() => removePlacement(pendingDelete)}>
            {translateKey(`${locale}.confirm`) || "Confirm"}
          </button>
          <button type="button" onClick={() => setPendingDelete(null)}>
            {translateKey(`${locale}.cancel`) || "Cancel"}
          </button>
        </div>
      )}

      {(editable || deleting) && (
        <div className="dcf-dashboard-footer">
          {editable && (
            <button type="button" className="dcf-button primary" onClick={handleSave}>
              {translateKey(`${locale}.save`) || "Save"}
            </button>
          )}
          {deleting && (
            <button type="button" className="dcf-button danger" onClick={handleDelete}>
              {translateKey(`${locale}.delete`) || "Delete"}
            </button>
          )}
        </div>
      )}

      {readOnly && !placements.length && (
        <div className="dcf-dashboard-empty">
          {translateKey(`${locale}.empty`) || "Empty dashboard"}
        </div>
      )}
    </div>
  );
};
