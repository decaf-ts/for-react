/**
 * @namespace charts
 * @description Named `./charts` subpath export of `@decaf-ts/for-react`.
 * @summary CRD-ready chart layout components, a virtual-dataset layer over the
 * decaf core query types, and an interactive curve editor backed by Apache
 * ECharts and the Cortex compute engine. Importing this subpath is the only way
 * to load either engine; hosts that stay on the root entrypoint never evaluate
 * them. Importing it also registers the chart components via
 * {@link registerChartComponents}. The public surface is re-exported from
 * `public-api.ts`.
 * @memberOf module:for-react
 */
import { registerChartComponents } from "./register-charts.js";

registerChartComponents();

export * from "./public-api.js";
