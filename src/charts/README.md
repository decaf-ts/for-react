# `@decaf-ts/for-react/charts`

CRD-ready chart layout components, a virtual-dataset layer over the decaf core
query types, an interactive curve editor and interpolation helpers backed by
Apache ECharts and the Cortex compute engine. The entry point keeps both engines
out of the root bundle and exposes only plain data and option types — no ECharts
or compute-engine types leak through the public API.

## Install

```bash
npm install @decaf-ts/for-react echarts@^6.1.0 @cortex-js/compute-engine@^0.147.0
```

`echarts` and `@cortex-js/compute-engine` are **optional peer dependencies** of
`@decaf-ts/for-react`. Install them only in applications that import `/charts`.
The compute engine evaluates LaTeX formulas against the curve control points; the
editor still renders points when the formula is empty.

### Compatibility

| Package | Tested range |
| --- | --- |
| `react` / `react-dom` | `>= 18` |
| `echarts` | `^6.1.0` (optional peer) |
| `@cortex-js/compute-engine` | `^0.147.0` (optional peer) |

ECharts is Apache-2.0 and the compute engine is MIT. Both are external peers and
are not vendored; their notices remain with their own packages.

## Styles

The subpath never imports CSS itself:

```ts
import "@decaf-ts/for-react/charts/styles.css";
```

## Chart components

Four CRD wrappers render a chart from a query-backed dataset and, in
`CREATE`/`UPDATE` operation, render their decorated configuration model through
the standard React rendering engine:

| Component | React registry key | Family | Configuration model |
| --- | --- | --- | --- |
| `LineChart` | `ngx-decaf-line-chart` | line | `LineChartConfigModel` |
| `BarChart` | `ngx-decaf-bar-chart` | bar | `BarChartConfigModel` |
| `PieChart` | `ngx-decaf-pie-chart` | pie | `PieChartConfigModel` |
| `ScatterChart` | `ngx-decaf-scatter-chart` | scatter | `ScatterChartConfigModel` |

`BaseChart` (aliases `ChartComponent`/`RgxChart`) is registered as
`ngx-decaf-chart` and defaults to a line chart; each family wrapper also ships
`*ChartComponent`/`Rgx*Chart` aliases and `CurveEditor` ships
`CurveEditorComponent`/`RgxCurveEditor`. Importing the subpath calls
`registerChartComponents()` once (idempotent), which registers only the five
chart tags — `ngx-decaf-chart`, `ngx-decaf-line-chart`, `ngx-decaf-bar-chart`,
`ngx-decaf-pie-chart` and `ngx-decaf-scatter-chart` — with the component
registry. In `CREATE`/`UPDATE` operation the components render their decorated
configuration model through the standard React rendering engine, so hosts that
use the config form must also call `registerDefaultComponents()` from the root
`@decaf-ts/for-react` entry point (the demo app does); importing `./charts`
never registers those.

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `operation` | `CrudOperations` | `READ` | `READ` renders the chart; `CREATE`/`UPDATE` also render the configuration form. |
| `config` | `ChartConfig \| Model` | family defaults | Plain configuration or a decorated configuration model instance. |
| `dataset` | `ChartDatasetBinding` | – | Query source to sub-query or an already narrowed view. |
| `datasetQuery` | `VirtualDatasetQuery` | `{}` | Sub-query applied to a `VirtualDataset` source. |
| `data` | `readonly unknown[]` | – | Direct rows; takes precedence over `dataset`. |
| `height` | `number \| string` | `320` | Canvas height; numbers are pixels. |
| `ariaLabel` | `string` | title or `"<type> chart"` | Accessible label. |
| `className` | `string` | – | Extra class names applied to the wrapper div. |
| `onConfigChanged` | `(config) => void` | – | Effective configuration after a submitted form. |
| `onChartError` | `(error) => void` | – | Dataset loading or rendering failures. |
| `onSubmitEvent` | `(config, componentName) => void` | – | Mirrors the Angular `submitEvent` emitter. |
| `onListenEvent` | `(event) => void` | – | Mirrors the Angular `listenEvent` emitter. |

```tsx
<LineChart
  operation={OperationKeys.READ}
  data={rows}
  config={{
    title: "Sales",
    xField: "month",
    yField: "revenue",
    seriesField: "region",
  }}
  height={360}
  onChartError={(error) => console.error(error)}
/>
```

### Virtual datasets

`VirtualDataset` is a thin pavement over `@decaf-ts/core` query types. It does
not re-implement query execution: a sub-query is merged over the source's global
query (conditions are AND-combined, projections are intersected, limits take the
smaller bound, offsets add) and the source's loader owns execution. `QueryOptions`
allow flags are enforced with the core semantics (`QueryError` by default,
stripped when `throws` is `false`). `datasetQuery` is developer-trusted input:
build it from application code, never from unvalidated end-user input.

```ts
import { Condition } from "@decaf-ts/core";
import {
  VirtualDataset,
  type VirtualDatasetQuery,
} from "@decaf-ts/for-react/charts";

const dataset = new VirtualDataset<Sale>({
  model: Sale,
  query: { where: Condition.attribute<Sale>("active").eq(true) },
  options: { allowLimit: true, allowOffset: true },
  load: (query, options) => {
    let statement = repository.select();
    if (query.where) statement = statement.where(query.where);
    if (query.limit !== undefined) statement = statement.limit(query.limit);
    if (query.offset !== undefined) statement = statement.offset(query.offset);
    return statement.execute();
  },
});

const north: VirtualDatasetQuery = {
  where: Condition.attribute<Sale>("region").eq("north"),
  limit: 50,
};
```

`mergeVirtualDatasetQuery`, `applyVirtualDatasetQueryOptions`, `toChartRows`,
`toChartDatasetSource` and `buildChartOption` are exported for hosts that need the
same composition or option mapping outside the components. The dataset layer
also exports `VirtualDatasetView`, `combineVirtualDatasetConditions`,
`intersectVirtualDatasetProjection`, `normalizeVirtualDatasetQuery`,
`isChartDatasetSource` and `isChartDatasetView`; the option layer exports
`normalizeChartConfig`, `chartCategories`, `chartRowValue`, `groupChartRows`
and `seriesValues`; and the config-model layer exports `buildChartConfigModel`,
`chartConfigModelFor`, `toPlainChartConfig`, `CHART_CONFIG_DEFAULTS`,
`CHART_CONFIG_MODELS` and the `CHART_TYPES` catalogue.

## ECharts hook

`useECharts` is the small binding the components above are built on, exported
for hosts that render ECharts directly:

```ts
const { hostRef, chartRef, resize } = useECharts({
  option,      // EChartsOption | null — applied (fully replaced) on every change
  initOptions, // optional EChartsInitOpts (renderer, locale, ...)
  onInit,      // optional (chart) => void, called once the instance exists
  onError,     // optional (error) => void when init fails (e.g. without a canvas)
  enabled,     // defaults to true; false skips instance creation
  chartRef,    // optional shared ref the instance is written into
});
```

It creates one instance per mounted host, keeps it fitted with a
`ResizeObserver`, and disposes it on unmount. `option: null` skips the update;
options are applied with `setOption(option, true)` — a complete replacement,
never a merge.

## Curve editor

`CurveEditor` is fully controlled: the host owns `points` and `formula`, the
component reports what the user did.

- Writing `points` re-renders and regenerates the formula.
- Writing `formula` samples it over `xRange` and replaces the points.
- Every interaction calls a typed callback (`onPointAdded`, `onPointRemoved`,
  `onPointMoved`, `onCurveChanged`, `onFormulaChange`). Apply the event to your
  own state and feed `points`/`formula` back in.
- Points are always sorted by ascending `x` before emission. Locked endpoints
  (`lockEndpoints`) keep the first/last `x` pinned to `xRange` and cannot be
  removed.
- Values are clamped to `xRange`/`yRange`; nothing is silently extrapolated.

```tsx
import { useState } from "react";
import {
  CurveEditor,
  type CurvePoint,
} from "@decaf-ts/for-react/charts";

export function CurveDemo() {
  const [points, setPoints] = useState<CurvePoint[]>([
    { x: 0, y: 0 },
    { x: 0.5, y: 0.6 },
    { x: 1, y: 1 },
  ]);
  const [formula, setFormula] = useState("");

  return (
    <CurveEditor
      points={points}
      formula={formula}
      interpolation="monotonic"
      xRange={[0, 1]}
      yRange={[0, 1]}
      height={360}
      onPointsChange={setPoints}
      onFormulaChange={setFormula}
      onCurveChanged={(sampled) => console.debug(sampled)}
    />
  );
}
```

### Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `points` | `CurvePoint[]` | `[]` | Control points, sorted by `x`. |
| `formula` | `string` | `''` | LaTeX description of the curve. |
| `interpolation` | `'monotonic' \| 'linear'` | `'monotonic'` | Fritsch–Carlson monotone cubic (no overshoot) or straight segments. |
| `xRange` | `[number, number]` | `[0, 1]` | Inclusive abscissa domain; bounds dragging and sampling. |
| `yRange` | `[number, number]` | `[0, 1]` | Inclusive ordinate domain; clamps points. |
| `lockEndpoints` | `boolean` | `false` | Pin first/last point `x` to the range bounds. |
| `height` | `number` | `320` | Rendered chart height in pixels. |
| `ariaLabel` | `string` | `"Curve editor chart"` | Accessible label for the canvas. |

### Callbacks

| Callback | Payload | When |
| --- | --- | --- |
| `onPointsChange` | `CurvePoint[]` | The component changes the points (dependency-free controlled setter). |
| `onFormulaChange` | `string` | The formula changes from either direction. |
| `onPointAdded` | `CurvePoint` | A point is added. |
| `onPointRemoved` | `CurvePoint` | A point is removed (never a locked endpoint). |
| `onPointMoved` | `{ index, point, previous }` | A point is dragged. |
| `onCurveChanged` | `CurvePoint[]` | The sampled curve is re-rendered (121 samples). |

### Imperative API

A ref to `CurveEditor` exposes `setPoints(points, { regenerateFormula? })`,
`addPoint(x, y)`, `removePoint(index)`, `movePoint(index, x, y)`,
`applyFormula(latex, { emit? })`, `formulaToPoints(latex)`, `generateFormula()`
and `resize()`. Use them only when a host control must drive the editor; normal
interaction flows through props and callbacks.

### Pure helpers

`CurvePoint`, `CurveInterpolation`, `sortCurvePoints`, `computeMonotoneTangents`,
`evaluateCurve`, `sampleCurve`, `curveToLatex`, `polynomialLatex`,
`formatLatexNumber`, `dataToPixel` and `pixelToData` are exported for hosts that
need the same math or coordinate mapping outside the component.

## Accessibility and SSR

- The ECharts hosts are labelled (`role="img"`); control points are moved by
  dragging their handles, and points are added or removed through the
  imperative handle (`addPoint`/`removePoint`) or by writing a formula. The
  formula input is a normal keyboard-editable field.
- A `ResizeObserver` refits the chart; the instance is disposed on unmount.
- The chart is only instantiated after mount. Import-time code does not touch
  `window` or `document`.

## License

ECharts is Apache-2.0 and `@cortex-js/compute-engine` is MIT. Both are external
peers and are not vendored.
