/**
 * @module module:for-react.charts.components.CurveEditor
 * @description Interactive curve editor backed by Apache ECharts and the Cortex
 * compute engine.
 * @summary The component is fully controlled: `points` and `formula` are
 * host-owned and every interaction is reported through typed callbacks. Points
 * are the source of truth for the curve; writing the formula samples it over
 * `xRange` and replaces the points. ECharts work lives in {@link useECharts},
 * the two-way loop is broken with source refs (the React equivalent of the
 * Angular `pointsSource`/`formulaSource` guards), and no ECharts or
 * compute-engine type leaks through the public API.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ComputeEngine } from "@cortex-js/compute-engine";
import type { ECharts, EChartsOption } from "echarts";
import {
  curveToLatex,
  dataToPixel,
  pixelToData,
  sampleCurve,
  sortCurvePoints,
  type CurveInterpolation,
  type CurvePixelPoint,
  type CurvePlotRect,
  type CurvePoint,
} from "../curve-interpolation.js";
import { useECharts } from "../hooks/useECharts.js";

/**
 * @description Payload of the point-moved callback.
 * @summary Reports the moved point together with its index and previous
 * position, so a host can implement undo or history without diffing arrays.
 * @interface CurveEditorPointEvent
 * @memberOf module:for-react.charts.components.CurveEditor
 */
export interface CurveEditorPointEvent {
  /** Zero-based index of the moved point. */
  index: number;
  /** The point's new data-space position. */
  point: CurvePoint;
  /** The point's position before the move. */
  previous: CurvePoint;
}

/**
 * @description Props accepted by {@link CurveEditor}.
 * @summary Every prop is optional; the editor defaults to the unit square,
 * monotonic interpolation and an empty formula, and reports every interaction
 * through the typed callbacks instead of owning state.
 * @interface CurveEditorProps
 * @property {Array.<number>} [xRange] - Inclusive x limits of the editor's data space. Defaults to `[0, 1]`.
 * @property {Array.<number>} [yRange] - Inclusive y limits of the editor's data space. Defaults to `[0, 1]`.
 * @memberOf module:for-react.charts.components.CurveEditor
 */
export interface CurveEditorProps {
  /** Control points in data space; source of truth for the rendered curve. */
  points?: CurvePoint[];
  /** LaTeX formula; when set it is sampled over `xRange` to drive the points. */
  formula?: string;
  /** Interpolation strategy used for sampling. Defaults to `monotonic`. */
  interpolation?: CurveInterpolation;
  xRange?: [number, number];
  yRange?: [number, number];
  /** Prevent dragging or removing the first and last points. */
  lockEndpoints?: boolean;
  /** Canvas height in pixels. Defaults to `320`. */
  height?: number;
  /** Accessible label for the rendered chart. */
  ariaLabel?: string;
  /** Called with the whole point list after any point edit. */
  onPointsChange?: (points: CurvePoint[]) => void;
  /** Called with the regenerated LaTeX after a point edit. */
  onFormulaChange?: (latex: string) => void;
  /** Called when a point is added. */
  onPointAdded?: (point: CurvePoint) => void;
  /** Called when a point is removed. */
  onPointRemoved?: (point: CurvePoint) => void;
  /** Called when a point is moved. */
  onPointMoved?: (event: CurveEditorPointEvent) => void;
  /** Called with the sampled curve whenever the rendered curve changes. */
  onCurveChanged?: (sampled: CurvePoint[]) => void;
}

/**
 * @description Imperative handle exposed by {@link CurveEditor}.
 * @summary Mirrors the Angular component's public methods so a host can drive
 * the editor through a ref while keeping state ownership outside the component.
 * @interface CurveEditorHandle
 * @memberOf module:for-react.charts.components.CurveEditor
 */
export interface CurveEditorHandle {
  /** Replaces the control points, optionally regenerating the formula. */
  setPoints(points: readonly CurvePoint[], options?: { regenerateFormula?: boolean }): void;
  /** Appends a point at the given data-space position. */
  addPoint(x: number, y: number): void;
  /** Removes the point at `index`. */
  removePoint(index: number): void;
  /** Moves the point at `index` to the given data-space position. */
  movePoint(index: number, x: number, y: number): void;
  /** Samples a LaTeX formula into control points. */
  applyFormula(latex: string, options?: { emit?: boolean }): void;
  /** Samples a LaTeX formula without mutating the editor. */
  formulaToPoints(latex: string): CurvePoint[];
  /** Returns the LaTeX formula for the current points. */
  generateFormula(): string;
  /** Refits the ECharts instance to its host. */
  resize(): void;
}

const DEFAULT_FORMULA_SAMPLE_COUNT = 21;
const CURVE_SAMPLE_COUNT = 121;
const DEFAULT_PLOT_RECT: CurvePlotRect = { x: 44, y: 20, width: 420, height: 260 };
const CURVE_COLOUR = "#3880ff";

/**
 * @description Controlled curve editor component.
 * @summary Forwards a {@link CurveEditorHandle} ref; charts are rendered by
 * {@link useECharts} from the interpolation helpers and the compute engine only
 * evaluates the formula the host supplies.
 * @memberOf module:for-react.charts.components.CurveEditor
 */
export const CurveEditor = forwardRef<CurveEditorHandle, CurveEditorProps>(
  function CurveEditor(
    {
      points: pointsProp = [],
      formula: formulaProp = "",
      interpolation = "monotonic",
      xRange = [0, 1],
      yRange = [0, 1],
      lockEndpoints = false,
      height = 320,
      ariaLabel = "Curve editor chart",
      onPointsChange,
      onFormulaChange,
      onPointAdded,
      onPointRemoved,
      onPointMoved,
      onCurveChanged,
    },
    ref
  ) {
    const [currentPoints, setCurrentPoints] = useState<CurvePoint[]>(() =>
      sortCurvePoints(pointsProp)
    );
    const [chartReady, setChartReady] = useState(0);

    const pointsSource = useRef<CurvePoint[]>(pointsProp);
    const formulaSource = useRef<string>(formulaProp);
    const engineRef = useRef<ComputeEngine | null>(null);
    const chartRef = useRef<ECharts | null>(null);

    const xRangeRef = useRef(xRange);
    const yRangeRef = useRef(yRange);
    const lockRef = useRef(lockEndpoints);
    const interpolationRef = useRef(interpolation);
    const pointsChangeRef = useRef(onPointsChange);
    const formulaChangeRef = useRef(onFormulaChange);
    const curveChangedRef = useRef(onCurveChanged);

    useEffect(() => {
      xRangeRef.current = xRange;
      yRangeRef.current = yRange;
      lockRef.current = lockEndpoints;
      interpolationRef.current = interpolation;
      pointsChangeRef.current = onPointsChange;
      formulaChangeRef.current = onFormulaChange;
      curveChangedRef.current = onCurveChanged;
    }, [
      xRange,
      yRange,
      lockEndpoints,
      interpolation,
      onPointsChange,
      onFormulaChange,
      onCurveChanged,
    ]);

    const clampY = useCallback((value: number): number => {
      const [min, max] = yRangeRef.current;
      return Math.min(Math.max(value, min), max);
    }, []);

    const normalizePoints = useCallback((input: readonly CurvePoint[]): CurvePoint[] => {
      const sorted = sortCurvePoints(input);
      if (!lockRef.current || sorted.length < 2) return sorted;
      const [min, max] = xRangeRef.current;
      return sorted.map((point, index) => {
        if (index === 0) return { x: min, y: point.y };
        if (index === sorted.length - 1) return { x: max, y: point.y };
        return point;
      });
    }, []);

    const clampPoint = useCallback(
      (point: CurvePoint, index: number, current: readonly CurvePoint[]): CurvePoint => {
        const [min, max] = xRangeRef.current;
        let x = Math.min(Math.max(point.x, min), max);
        const y = clampY(point.y);

        if (lockRef.current && index === 0) return { x: min, y };
        if (lockRef.current && index === current.length - 1 && index > 0) {
          return { x: max, y };
        }
        if (index > 0) x = Math.max(x, current[index - 1].x);
        if (index >= 0 && index < current.length - 1) {
          x = Math.min(x, current[index + 1].x);
        }
        return { x, y };
      },
      [clampY]
    );

    const regenerateFormula = useCallback((points: readonly CurvePoint[]) => {
      const latex = curveToLatex(points, interpolationRef.current);
      formulaSource.current = latex;
      formulaChangeRef.current?.(latex);
    }, []);

    const commitPoints = useCallback(
      (
        points: readonly CurvePoint[],
        options: { emit?: boolean; regenerateFormula?: boolean } = {}
      ): CurvePoint[] => {
        const normalized = normalizePoints(points);
        pointsSource.current = normalized;
        setCurrentPoints(normalized);
        if (options.emit !== false) pointsChangeRef.current?.(normalized);
        if (options.regenerateFormula !== false) regenerateFormula(normalized);
        return normalized;
      },
      [normalizePoints, regenerateFormula]
    );

    const getEngine = useCallback((): ComputeEngine => {
      if (!engineRef.current) engineRef.current = new ComputeEngine();
      return engineRef.current;
    }, []);

    const formulaToPoints = useCallback(
      (latex: string): CurvePoint[] => {
        const trimmed = latex?.trim() ?? "";
        if (!trimmed) return [];
        const [min, max] = xRangeRef.current;
        const sampled: CurvePoint[] = [];
        try {
          const expression = getEngine().parse(trimmed);
          for (let index = 0; index < DEFAULT_FORMULA_SAMPLE_COUNT; index += 1) {
            const x = min + ((max - min) * index) / (DEFAULT_FORMULA_SAMPLE_COUNT - 1);
            const value = expression.subs({ x }).N().valueOf();
            if (typeof value === "number" && Number.isFinite(value)) {
              sampled.push({ x, y: clampY(value) });
            }
          }
        } catch {
          return [];
        }
        return sampled;
      },
      [clampY, getEngine]
    );

    const applyFormula = useCallback(
      (latex: string, options: { emit?: boolean } = {}): void => {
        const emit = options.emit !== false;
        const sampled = formulaToPoints(latex);
        formulaSource.current = latex;
        if (emit) formulaChangeRef.current?.(latex);
        if (!sampled.length) return;
        commitPoints(sampled, { emit: true, regenerateFormula: false });
      },
      [commitPoints, formulaToPoints]
    );

    const setPoints = useCallback(
      (points: readonly CurvePoint[], options: { regenerateFormula?: boolean } = {}): void => {
        commitPoints(points, { emit: true, regenerateFormula: options.regenerateFormula });
      },
      [commitPoints]
    );

    const addPoint = useCallback(
      (x: number, y: number): void => {
        const current = sortCurvePoints(pointsSource.current);
        const point = clampPoint({ x, y }, -1, current);
        const updated = sortCurvePoints([...current, point]);
        commitPoints(updated, { emit: true, regenerateFormula: true });
        onPointAdded?.(point);
      },
      [clampPoint, commitPoints, onPointAdded]
    );

    const removePoint = useCallback(
      (index: number): void => {
        const current = sortCurvePoints(pointsSource.current);
        if (index < 0 || index >= current.length) return;
        if (lockRef.current && (index === 0 || index === current.length - 1)) return;
        const [removed] = current.splice(index, 1);
        commitPoints(current, { emit: true, regenerateFormula: true });
        onPointRemoved?.(removed);
      },
      [commitPoints, onPointRemoved]
    );

    const movePoint = useCallback(
      (index: number, x: number, y: number): void => {
        const current = sortCurvePoints(pointsSource.current);
        if (index < 0 || index >= current.length) return;
        const previous = current[index];
        const point = clampPoint({ x, y }, index, current);
        const updated = current.map((item, itemIndex) =>
          itemIndex === index ? point : { ...item }
        );
        commitPoints(updated, { emit: true, regenerateFormula: true });
        onPointMoved?.({ index, point, previous });
      },
      [clampPoint, commitPoints, onPointMoved]
    );

    const pixelToDataPoint = useCallback(
      (pixelX: number, pixelY: number): CurvePoint => {
        const chart = chartRef.current;
        if (chart) {
          try {
            const data = chart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
              pixelX,
              pixelY,
            ]);
            if (Array.isArray(data) && data.length === 2) {
              const [x, y] = data;
              if (typeof x === "number" && typeof y === "number") return { x, y };
            }
          } catch {
            // Fall back to the pure mapping.
          }
        }
        return pixelToData(pixelX, pixelY, xRangeRef.current, yRangeRef.current, DEFAULT_PLOT_RECT);
      },
      [chartRef]
    );

    const dataToPixelPoint = useCallback(
      (point: CurvePoint): CurvePixelPoint => {
        const chart = chartRef.current;
        if (chart) {
          try {
            const pixel = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
              point.x,
              point.y,
            ]);
            if (Array.isArray(pixel) && pixel.length === 2) {
              const [x, y] = pixel;
              if (typeof x === "number" && typeof y === "number") return { x, y };
            }
          } catch {
            // Fall back to the pure mapping.
          }
        }
        return dataToPixel(point, xRangeRef.current, yRangeRef.current, DEFAULT_PLOT_RECT);
      },
      [chartRef]
    );

    const onPointDragEnd = useCallback(
      (index: number, pixelX: number, pixelY: number): void => {
        const current = sortCurvePoints(pointsSource.current);
        if (index < 0 || index >= current.length) return;
        const point = pixelToDataPoint(pixelX, pixelY);
        movePoint(index, point.x, point.y);
      },
      [movePoint, pixelToDataPoint]
    );

    const buildHandle = useCallback(
      (index: number, point: CurvePoint): Record<string, unknown> => {
        const pixel = dataToPixelPoint(point);
        return {
          id: `curve-point-${index}`,
          type: "circle",
          draggable: true,
          z: 100,
          position: [pixel.x, pixel.y],
          shape: { cx: 0, cy: 0, r: 7 },
          style: { fill: "#ffffff", stroke: CURVE_COLOUR, lineWidth: 2 },
          ondragend: (event: { target?: { x?: number; y?: number } }): void => {
            const target = event.target;
            if (target && typeof target.x === "number" && typeof target.y === "number") {
              onPointDragEnd(index, target.x, target.y);
            }
          },
        };
      },
      [dataToPixelPoint, onPointDragEnd]
    );

    const sampled = useMemo(
      () => sampleCurve(currentPoints, xRange, interpolation, CURVE_SAMPLE_COUNT),
      [currentPoints, interpolation, xRange]
    );

    const option = useMemo<EChartsOption>(() => {
      void chartReady;
      const sorted = sortCurvePoints(currentPoints);
      const [xMin, xMax] = xRange;
      const [yMin, yMax] = yRange;
      return {
        animation: false,
        grid: { left: 44, right: 20, top: 20, bottom: 32 },
        tooltip: { trigger: "axis" },
        xAxis: { type: "value", min: xMin, max: xMax, name: "x" },
        yAxis: { type: "value", min: yMin, max: yMax, name: "y" },
        series: [
          {
            type: "line",
            name: "curve",
            showSymbol: false,
            smooth: false,
            data: sampled.map((point) => [point.x, point.y]),
            lineStyle: { width: 2, color: CURVE_COLOUR },
            itemStyle: { color: CURVE_COLOUR },
          },
        ],
        graphic: sorted.map((point, index) => buildHandle(index, point)),
      } as unknown as EChartsOption;
    }, [buildHandle, chartReady, currentPoints, sampled, xRange, yRange]);

    const { hostRef, resize } = useECharts({
      option,
      chartRef,
      onInit: () => setChartReady((version) => version + 1),
    });

    useEffect(() => {
      curveChangedRef.current?.(sampled);
    }, [sampled]);

    useEffect(() => {
      if (pointsProp === pointsSource.current) return;
      commitPoints(pointsProp, { emit: false, regenerateFormula: true });
    }, [commitPoints, pointsProp]);

    useEffect(() => {
      if (formulaProp === formulaSource.current) return;
      applyFormula(formulaProp, { emit: false });
    }, [applyFormula, formulaProp]);

    useImperativeHandle(
      ref,
      () => ({
        setPoints,
        addPoint,
        removePoint,
        movePoint,
        applyFormula,
        formulaToPoints,
        generateFormula: () => curveToLatex(pointsSource.current, interpolationRef.current),
        resize,
      }),
      [addPoint, applyFormula, formulaToPoints, movePoint, removePoint, resize, setPoints]
    );

    return (
      <div className="dcf-curve-editor" style={{ height: `${height}px` }}>
        <div
          className="dcf-curve-editor__chart"
          role="img"
          aria-label={ariaLabel}
          ref={hostRef}
        />
      </div>
    );
  }
);

CurveEditor.displayName = "CurveEditor";

/** Alias of {@link CurveEditor} kept for the Angular `CurveEditorComponent` name. */
export const CurveEditorComponent = CurveEditor;
/** Alias of {@link CurveEditor} kept for the registry-facing `RgxCurveEditor` name. */
export const RgxCurveEditor = CurveEditor;
