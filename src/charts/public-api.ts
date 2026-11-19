/**
 * Public surface of the `@decaf-ts/for-react/charts` subpath.
 *
 * Chart and curve-editing surfaces backed by ECharts and the Cortex compute
 * engine. Install `echarts` and `@cortex-js/compute-engine` in the consumer
 * before importing this entry point.
 */
export {
  BarChart,
  BarChartComponent,
  BaseChart,
  ChartComponent,
  LineChart,
  LineChartComponent,
  PieChart,
  PieChartComponent,
  RgxBarChart,
  RgxChart,
  RgxLineChart,
  RgxPieChart,
  RgxScatterChart,
  ScatterChart,
  ScatterChartComponent,
} from "./components/BaseChart.js";
export type { BaseChartProps, ChartProps } from "./components/BaseChart.js";
export {
  CurveEditor,
  CurveEditorComponent,
  RgxCurveEditor,
} from "./components/CurveEditor.js";
export type {
  CurveEditorHandle,
  CurveEditorPointEvent,
  CurveEditorProps,
} from "./components/CurveEditor.js";
export { useECharts } from "./hooks/useECharts.js";
export type { UseEChartsOptions, UseEChartsResult } from "./hooks/useECharts.js";
export {
  curveToLatex,
  dataToPixel,
  evaluateCurve,
  formatLatexNumber,
  computeMonotoneTangents,
  pixelToData,
  polynomialLatex,
  sampleCurve,
  sortCurvePoints,
} from "./curve-interpolation.js";
export type {
  CurveInterpolation,
  CurvePixelPoint,
  CurvePlotRect,
  CurvePoint,
} from "./curve-interpolation.js";
export {
  BarChartConfigModel,
  CHART_CONFIG_DEFAULTS,
  CHART_CONFIG_MODELS,
  LineChartConfigModel,
  PieChartConfigModel,
  ScatterChartConfigModel,
  buildChartConfigModel,
  chartConfigModelFor,
  toPlainChartConfig,
} from "./chart-config.models.js";
export type { ChartConfigModelConstructor } from "./chart-config.models.js";
export {
  buildChartOption,
  chartCategories,
  chartRowValue,
  groupChartRows,
  normalizeChartConfig,
  seriesValues,
} from "./chart-options.js";
export { CHART_TYPES } from "./chart.types.js";
export type {
  BarChartConfig,
  CartesianChartConfig,
  ChartConfig,
  ChartConfigInput,
  ChartDatasetSource,
  ChartRow,
  ChartType,
  LineChartConfig,
  PieChartConfig,
  ScatterChartConfig,
} from "./chart.types.js";
export {
  VirtualDataset,
  VirtualDatasetView,
  applyVirtualDatasetQueryOptions,
  combineVirtualDatasetConditions,
  intersectVirtualDatasetProjection,
  isChartDatasetSource,
  isChartDatasetView,
  mergeVirtualDatasetQuery,
  normalizeVirtualDatasetQuery,
  toChartDatasetSource,
  toChartRows,
} from "./virtual-dataset.js";
export type {
  ChartDatasetBinding,
  ChartDatasetSourceProvider,
  ChartDatasetView,
  VirtualDatasetDescriptor,
  VirtualDatasetLoader,
  VirtualDatasetQuery,
} from "./virtual-dataset.js";
export { registerChartComponents } from "./register-charts.js";
