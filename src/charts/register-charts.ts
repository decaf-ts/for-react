/**
 * @module module:for-react.charts.register-charts
 * @description Self-registration of the chart components in the React registry.
 * @summary Registers the family components under their `ngx-decaf-*-chart`
 * keys, matching the names the decorated configuration models and the Angular
 * exports use. Importing the `./charts` subpath runs this once.
 */

import { RgxComponentRegistry } from "../lib/engine/ComponentRegistry.js";
import {
  BarChart,
  BaseChart,
  LineChart,
  PieChart,
  ScatterChart,
} from "./components/BaseChart.js";

let registered = false;

/**
 * @description Registers the chart components under their registry keys.
 * @summary Idempotent: repeated calls are no-ops, so importing the subpath more
 * than once never double-registers a component. Tags are the shared
 * `ngx-decaf-*` names used by the configuration models' `@uimodel` metadata.
 * @memberOf module:for-react.charts.register-charts
 */
export function registerChartComponents(): void {
  if (registered) return;
  RgxComponentRegistry.register("ngx-decaf-chart", BaseChart);
  RgxComponentRegistry.register("ngx-decaf-line-chart", LineChart);
  RgxComponentRegistry.register("ngx-decaf-bar-chart", BarChart);
  RgxComponentRegistry.register("ngx-decaf-pie-chart", PieChart);
  RgxComponentRegistry.register("ngx-decaf-scatter-chart", ScatterChart);
  registered = true;
}
