import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { RgxComponentRenderer } from "../component-renderer/RgxComponentRenderer.js";
import { translateKey } from "../../services/RgxTranslateService.js";
import { DashDocument, DashPaletteEntry, DashPlacement } from "./dashboard.types";
import {
  canPlace,
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

/**
 * @description Editable grid dashboard for arranging components on a layout.
 * @summary Maintains grid dimensions and placements from the supplied
 * `document` (falling back to `cols`/`rows`) and renders each placement through
 * `renderPlacement` or {@link RgxComponentRenderer}. For `CREATE`/`UPDATE` it
 * shows a palette that inserts entries into the first free cell, supports
 * pointer drag and resize gestures snapped and validated by
 * {@link snapDrag}/{@link snapResize}, and confirms removal of a placement.
 * Every placement mutation recomputes a serialized document and reports it via
 * `onChange`; the save button sends the serialized document to `onSave`.
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
  const [gridCols, setGridCols] = useState(document?.cols || cols);
  const [gridRows, setGridRows] = useState(document?.rows || rows);
  const [placements, setPlacements] = useState<DashPlacement[]>(
    document?.placements || []
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document?.placements) {
      setPlacements(document.placements);
      setGridCols(document.cols || cols);
      setGridRows(document.rows || rows);
    }
  }, [document, cols, rows]);

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
      {editable && palette.length > 0 && (
        <div className="dcf-dashboard-palette">
          {palette.map((entry) => (
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
          ))}
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
            >
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
