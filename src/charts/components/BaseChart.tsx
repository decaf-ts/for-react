/**
 * @module module:for-react.charts.components.BaseChart
 * @description CRD-aware ECharts host shared by every chart family.
 * @summary `READ` renders the ECharts canvas from the resolved dataset rows.
 * `CREATE`/`UPDATE` additionally render the family's decorated configuration
 * model through the React rendering engine; submitting that form applies the
 * configuration and re-renders the chart. Each family is a thin wrapper that
 * only pins the chart type and the `ngx-decaf-<type>-chart` registry key.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OperationKeys, type CrudOperations } from "@decaf-ts/db-decorators";
import type { Model } from "@decaf-ts/decorator-validation";
import type { IBaseCustomEvent, ICrudFormEvent } from "../../lib/engine/interfaces.js";
import { RgxModelRenderer } from "../../lib/components/model-renderer/RgxModelRenderer.js";
import {
  buildChartConfigModel,
  toPlainChartConfig,
} from "../chart-config.models.js";
import { buildChartOption, normalizeChartConfig } from "../chart-options.js";
import type { ChartConfig, ChartConfigInput, ChartRow, ChartType } from "../chart.types.js";
import { useECharts } from "../hooks/useECharts.js";
import {
  isChartDatasetSource,
  toChartRows,
  type ChartDatasetBinding,
  type VirtualDatasetQuery,
} from "../virtual-dataset.js";

/**
 * @description Props accepted by the chart components.
 * @summary Every prop is optional: the component falls back to the family
 * defaults, an empty dataset and `READ` operation. Dataset loading and option
 * building are memoised, and `data` takes precedence over `dataset`.
 * @interface BaseChartProps
 * @property {Array.<unknown>} [data] - Direct rows; takes precedence over `dataset`.
 * @memberOf module:for-react.charts.components.BaseChart
 */
export interface BaseChartProps {
  /** CRD operation. `READ` renders the chart; `CREATE`/`UPDATE` add the config form. */
  operation?: CrudOperations;
  /** Plain chart configuration or a decorated configuration model instance. */
  config?: ChartConfigInput;
  /** Query source to sub-query from, or an already narrowed dataset view. */
  dataset?: ChartDatasetBinding;
  /** Sub-query applied when `dataset` exposes `subQuery`. */
  datasetQuery?: VirtualDatasetQuery;
  data?: readonly unknown[];
  /** Canvas height in pixels (number) or any CSS height (string). */
  height?: number | string;
  /** Accessible label override for the rendered chart. */
  ariaLabel?: string;
  /** Component name reported through submit events. */
  componentName?: string;
  /** Extra class names applied to the wrapper. */
  className?: string;
  /** Effective configuration after a submitted create/update form. */
  onConfigChanged?: (config: ChartConfig) => void;
  /** Dataset loading or rendering failures. */
  onChartError?: (error: unknown) => void;
  /** Mirrors the Angular `submitEvent` emitter. */
  onSubmitEvent?: (config: ChartConfig, componentName: string) => void;
  /** Mirrors the Angular `listenEvent` emitter for non-submit child events. */
  onListenEvent?: (event: IBaseCustomEvent | ICrudFormEvent) => void;
}

function componentNameFor(type: ChartType): string {
  return `ngx-decaf-${type}-chart`;
}

function isEditingOperation(operation: CrudOperations): boolean {
  return operation === OperationKeys.CREATE || operation === OperationKeys.UPDATE;
}

function coerceConfig(type: ChartType, data: unknown): ChartConfig {
  const plain = toPlainChartConfig(data as ChartConfigInput);
  if (type === "scatter" && plain && typeof plain === "object") {
    const symbolSize = (plain as Record<string, unknown>).symbolSize;
    if (typeof symbolSize === "string" && symbolSize.trim() !== "") {
      const parsed = Number(symbolSize);
      if (Number.isFinite(parsed)) {
        (plain as Record<string, unknown>).symbolSize = parsed;
      }
    }
  }
  return plain;
}

/**
 * @description Public props of the exposed chart components.
 * @summary {@link BaseChartProps} without `componentName`, which the factory
 * derives from the chart family so each component reports its own registry key.
 * @typedef ChartProps
 * @memberOf module:for-react.charts.components.BaseChart
 */
export type ChartProps = Omit<BaseChartProps, "componentName">;

function createChartComponent(type: ChartType) {
  const Chart: React.FC<ChartProps> = ({
    operation = OperationKeys.READ,
    config,
    dataset,
    datasetQuery,
    data,
    height = 320,
    ariaLabel,
    className,
    onConfigChanged,
    onChartError,
    onSubmitEvent,
    onListenEvent,
  }) => {
    const componentName = componentNameFor(type);
    const [rows, setRows] = useState<ChartRow[]>([]);
    const [formConfig, setFormConfig] = useState<ChartConfig | null>(null);
    const loadToken = useRef(0);
    const previousConfig = useRef(config);

    useEffect(() => {
      if (previousConfig.current === config) return;
      previousConfig.current = config;
      setFormConfig(null);
    }, [config]);

    const effectiveConfig = formConfig ?? config;

    const resolvedConfig = useMemo(
      () => normalizeChartConfig(type, effectiveConfig),
      [effectiveConfig]
    );

    useEffect(() => {
      const token = ++loadToken.current;
      let cancelled = false;

      const resolveRows = async (): Promise<readonly unknown[]> => {
        if (data !== undefined) return data;
        if (!dataset) return [];
        if (isChartDatasetSource(dataset)) {
          return await dataset.subQuery(datasetQuery).execute();
        }
        return await dataset.execute();
      };

      resolveRows()
        .then((next) => {
          if (cancelled || token !== loadToken.current) return;
          setRows(toChartRows(next));
        })
        .catch((error: unknown) => {
          if (cancelled || token !== loadToken.current) return;
          onChartError?.(error);
        });

      return () => {
        cancelled = true;
      };
    }, [data, dataset, datasetQuery, onChartError]);

    const option = useMemo(
      () => buildChartOption(type, effectiveConfig, rows),
      [type, effectiveConfig, rows]
    );

    const { hostRef } = useECharts({ option, onError: onChartError });

    const configModel = useMemo<Model>(
      () => buildChartConfigModel(type, effectiveConfig),
      [effectiveConfig]
    ) as Model;

    const applyConfig = useCallback(
      (submitted: unknown) => {
        const next = {
          ...resolvedConfig,
          ...coerceConfig(type, submitted),
        } as ChartConfig;
        setFormConfig(next);
        onConfigChanged?.(next);
        onSubmitEvent?.(next, componentName);
      },
      [componentName, onConfigChanged, onSubmitEvent, resolvedConfig]
    );

    const formGlobals = useMemo(
      () => ({
        operation,
        onSubmit: applyConfig,
        onCancel: () => onListenEvent?.({ name: "cancel", component: componentName }),
      }),
      [applyConfig, componentName, onListenEvent, operation]
    );

    const editing = isEditingOperation(operation);
    const label =
      ariaLabel || (resolvedConfig as ChartConfig & { title?: string }).title || `${type} chart`;
    const heightStyle = typeof height === "number" ? `${height}px` : height;

    return (
      <div className={`dcf-chart ${className || ""}`.trim()} style={{ height: heightStyle }}>
        {editing ? (
          <RgxModelRenderer
            className="dcf-chart__form"
            model={configModel}
            globals={formGlobals}
          />
        ) : null}
        <div
          ref={hostRef}
          className="dcf-chart__canvas"
          role="img"
          aria-label={label}
        />
      </div>
    );
  };

  Chart.displayName = `${type[0].toUpperCase()}${type.slice(1)}Chart`;
  return Chart;
}

/**
 * @description Base chart; defaults to a line chart.
 * @summary Registered as `ngx-decaf-chart` and useful when the family is chosen
 * at runtime or when a host wants the default line rendering.
 * @memberOf module:for-react.charts.components.BaseChart
 */
export const BaseChart = createChartComponent("line");
/** Alias of {@link BaseChart} kept for the Angular `ChartComponent` name. */
export const ChartComponent = BaseChart;
/** Alias of {@link BaseChart} kept for the registry-facing `RgxChart` name. */
export const RgxChart = BaseChart;

/**
 * @description Line chart component.
 * @summary Registered as `ngx-decaf-line-chart`; renders its
 * `LineChartConfigModel` in create/update mode.
 * @memberOf module:for-react.charts.components.BaseChart
 */
export const LineChart = createChartComponent("line");
/**
 * @description Bar chart component.
 * @summary Registered as `ngx-decaf-bar-chart`; renders its
 * `BarChartConfigModel` in create/update mode.
 * @memberOf module:for-react.charts.components.BaseChart
 */
export const BarChart = createChartComponent("bar");
/**
 * @description Pie chart component.
 * @summary Registered as `ngx-decaf-pie-chart`; renders its
 * `PieChartConfigModel` in create/update mode.
 * @memberOf module:for-react.charts.components.BaseChart
 */
export const PieChart = createChartComponent("pie");
/**
 * @description Scatter chart component.
 * @summary Registered as `ngx-decaf-scatter-chart`; renders its
 * `ScatterChartConfigModel` in create/update mode.
 * @memberOf module:for-react.charts.components.BaseChart
 */
export const ScatterChart = createChartComponent("scatter");

/** Alias of {@link LineChart} kept for the Angular `LineChartComponent` name. */
export const LineChartComponent = LineChart;
/** Alias of {@link BarChart} kept for the Angular `BarChartComponent` name. */
export const BarChartComponent = BarChart;
/** Alias of {@link PieChart} kept for the Angular `PieChartComponent` name. */
export const PieChartComponent = PieChart;
/** Alias of {@link ScatterChart} kept for the Angular `ScatterChartComponent` name. */
export const ScatterChartComponent = ScatterChart;

/** Alias of {@link LineChart} kept for the registry-facing `RgxLineChart` name. */
export const RgxLineChart = LineChart;
/** Alias of {@link BarChart} kept for the registry-facing `RgxBarChart` name. */
export const RgxBarChart = BarChart;
/** Alias of {@link PieChart} kept for the registry-facing `RgxPieChart` name. */
export const RgxPieChart = PieChart;
/** Alias of {@link ScatterChart} kept for the registry-facing `RgxScatterChart` name. */
export const RgxScatterChart = ScatterChart;
