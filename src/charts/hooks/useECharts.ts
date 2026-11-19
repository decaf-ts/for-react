/**
 * @module module:for-react.charts.hooks.useECharts
 * @description Small React binding over Apache ECharts.
 * @summary The hook creates one ECharts instance per mounted host, keeps it
 * fitted with a `ResizeObserver`, applies a completely replaced option whenever
 * the caller hands a new one, and disposes the instance on unmount. It
 * intentionally does less than `echarts-for-react`: the chart components in
 * this entry point own their option graph and only need lifecycle plus
 * `setOption`.
 */

import { useCallback, useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { ECharts, EChartsInitOpts, EChartsOption } from "echarts";

/**
 * @description Options accepted by {@link useECharts}.
 * @summary `option` drives every re-render; the remaining fields are lifecycle
 * hooks and the optional shared instance ref.
 * @interface UseEChartsOptions
 * @memberOf module:for-react.charts.hooks.useECharts
 */
export interface UseEChartsOptions {
  /** Option applied whenever this reference changes. `null` skips the update. */
  option: EChartsOption | null;
  /** Extra ECharts init options (renderer, width, height, locale...). */
  initOptions?: EChartsInitOpts;
  /** Called once the instance exists, e.g. to re-render pixel-dependent graphics. */
  onInit?: (chart: ECharts) => void;
  /** Called when ECharts cannot initialize (for example without a canvas). */
  onError?: (error: unknown) => void;
  /** Whether the hook should create an instance. Defaults to `true`. */
  enabled?: boolean;
  /** Optional ref the hook writes the instance into (shared with the caller). */
  chartRef?: React.RefObject<ECharts | null>;
}

/**
 * @description Values returned by {@link useECharts}.
 * @summary `hostRef` is attached to the element ECharts renders into,
 * `chartRef` reads the current instance and `resize` refits it manually.
 * @interface UseEChartsResult
 * @memberOf module:for-react.charts.hooks.useECharts
 */
export interface UseEChartsResult {
  /** Attach to the element ECharts should render into. */
  hostRef: React.RefObject<HTMLDivElement | null>;
  /** Current instance, or `null` before init/after dispose. */
  chartRef: React.RefObject<ECharts | null>;
  /** Refits the instance to its host. */
  resize: () => void;
}

/**
 * @description Creates and maintains one ECharts instance for the calling host.
 * @summary The instance is created on mount (unless `enabled` is false), the
 * supplied `option` is applied on every identity change, and the instance is
 * disposed on unmount. Failures are reported through `onError` instead of
 * throwing, so a chart can degrade without taking down the host page.
 * @param options the hook options.
 * @returns the host ref, the instance ref and a manual resize helper.
 * @memberOf module:for-react.charts.hooks.useECharts
 */
export function useECharts({
  option,
  initOptions,
  onInit,
  onError,
  enabled = true,
  chartRef: sharedChartRef,
}: UseEChartsOptions): UseEChartsResult {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const internalChartRef = useRef<ECharts | null>(null);
  const chartRef = sharedChartRef ?? internalChartRef;
  const onInitRef = useRef(onInit);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onInitRef.current = onInit;
    onErrorRef.current = onError;
  }, [onInit, onError]);

  useEffect(() => {
    if (!enabled) return;
    const host = hostRef.current;
    if (!host) return;

    let chart: ECharts | null = null;
    try {
      chart = echarts.init(host, undefined, initOptions);
      chartRef.current = chart;
      onInitRef.current?.(chart);
    } catch (error) {
      chartRef.current = null;
      onErrorRef.current?.(error);
    }

    let observer: ResizeObserver | undefined;
    if (chart && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => chart?.resize());
      observer.observe(host);
    }

    return () => {
      observer?.disconnect();
      chart?.dispose();
      chartRef.current = null;
    };
    // The instance is created once per mount; option changes are handled below.
  }, [enabled]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !option) return;
    chart.setOption(option, true);
    chart.resize();
  }, [option]);

  const resize = useCallback(() => {
    chartRef.current?.resize();
  }, []);

  return { hostRef, chartRef, resize };
}
