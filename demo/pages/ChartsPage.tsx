/**
 * @file Demo page for the `@decaf-ts/for-react/charts` subpath.
 * @description Exercises {@link LineChart}, {@link BarChart}, {@link PieChart},
 * {@link ScatterChart} and {@link CurveEditor} with editable demo rows, a family
 * switcher, per-family configuration and page-level i18n (the chart components
 * only receive plain props).
 */
import React, { useCallback, useMemo, useState } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import {
  BarChart,
  CurveEditor,
  LineChart,
  PieChart,
  ScatterChart,
  type ChartConfig,
  type ChartProps,
  type ChartRow,
  type ChartType,
  type CurveInterpolation,
  type CurvePoint,
} from "../../src/charts";
import { useTranslate } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";

interface DemoChartRow {
  category: string;
  value: number;
  weight: number;
  series: string;
}

const INITIAL_ROWS: DemoChartRow[] = [
  { category: "Week 1", value: 18, weight: 4, series: "Revenue" },
  { category: "Week 2", value: 26, weight: 6, series: "Revenue" },
  { category: "Week 3", value: 21, weight: 5, series: "Revenue" },
  { category: "Week 4", value: 34, weight: 8, series: "Revenue" },
  { category: "Week 5", value: 30, weight: 7, series: "Revenue" },
];

const INITIAL_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.15 },
  { x: 0.5, y: 0.6 },
  { x: 0.75, y: 0.85 },
  { x: 1, y: 1 },
];

const FAMILIES: ChartType[] = ["line", "bar", "pie", "scatter"];

function numberOf(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * @description Interactive demo of the chart components and curve editor.
 * @summary Lets a visitor pick a chart family, edit the backing rows, toggle the
 * per-family options (smoothing, area, stacking, legend, tooltip), and drive the
 * controlled curve editor's points, formula and interpolation mode.
 * @returns {React.ReactElement} The charts demo page.
 */
export function ChartsPage() {
  const translate = useTranslate();
  const [family, setFamily] = useState<ChartType>("line");
  const [rows, setRows] = useState<DemoChartRow[]>(INITIAL_ROWS);
  const [smooth, setSmooth] = useState(true);
  const [area, setArea] = useState(false);
  const [stack, setStack] = useState(false);
  const [legend, setLegend] = useState(true);
  const [tooltip, setTooltip] = useState(true);
  const [points, setPoints] = useState<CurvePoint[]>(INITIAL_POINTS);
  const [formula, setFormula] = useState("");
  const [interpolation, setInterpolation] = useState<CurveInterpolation>("monotonic");
  const [lastPointEvent, setLastPointEvent] = useState("");

  const chartTitle = translate("charts.chart_title");

  const chartData = useMemo<ChartRow[]>(() => rows as unknown as ChartRow[], [rows]);

  const chartConfig = useMemo<ChartConfig>(() => {
    const common = {
      title: chartTitle,
      seriesField: "series",
      legend,
      tooltip,
    };
    switch (family) {
      case "bar":
        return {
          ...common,
          xField: "category",
          yField: "value",
          stack,
          horizontal: false,
        };
      case "pie":
        return {
          title: chartTitle,
          nameField: "category",
          valueField: "value",
          radius: "62%",
          legend,
          tooltip,
        };
      case "scatter":
        return {
          ...common,
          xField: "value",
          yField: "weight",
          symbolSize: 14,
        };
      case "line":
      default:
        return {
          ...common,
          xField: "category",
          yField: "value",
          smooth,
          area,
        };
    }
  }, [area, chartTitle, family, legend, smooth, stack, tooltip]);

  const patchRow = useCallback(
    (index: number, patch: Partial<DemoChartRow>) => {
      setRows((current) =>
        current.map((row, currentIndex) =>
          currentIndex === index ? { ...row, ...patch } : row
        )
      );
    },
    []
  );

  const addRow = useCallback(() => {
    setRows((current) => [
      ...current,
      {
        category: `Week ${current.length + 1}`,
        value: 0,
        weight: 0,
        series: "Revenue",
      },
    ]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const chartAria = translate("charts.chart_aria", {
    type: translate(`charts.type_${family}`),
  });

  const renderChart = () => {
    const props: ChartProps = {
      operation: OperationKeys.READ,
      config: chartConfig,
      data: chartData,
      height: 360,
      ariaLabel: chartAria,
    };
    switch (family) {
      case "bar":
        return <BarChart {...props} />;
      case "pie":
        return <PieChart {...props} />;
      case "scatter":
        return <ScatterChart {...props} />;
      case "line":
      default:
        return <LineChart {...props} />;
    }
  };

  return (
    <section className="app-page charts-page" aria-labelledby="charts-title">
      <CardTitle title="charts.title" subtitle="charts.intro" />
      <h2 id="charts-title" className="app-visually-hidden">
        {translate("charts.title")}
      </h2>

      <section className="charts-page__panel" aria-label={translate("charts.title")}>
        <div className="charts-page__toolbar">
          <label className="charts-page__field">
            <span>{translate("charts.type_label")}</span>
            <select
              data-testid="charts-family"
              value={family}
              onChange={(event) => setFamily(event.target.value as ChartType)}
            >
              {FAMILIES.map((item) => (
                <option key={item} value={item}>
                  {translate(`charts.type_${item}`)}
                </option>
              ))}
            </select>
          </label>

          {family === "line" ? (
            <>
              <label className="charts-page__checkbox">
                <input
                  type="checkbox"
                  data-testid="charts-smooth"
                  checked={smooth}
                  onChange={(event) => setSmooth(event.target.checked)}
                />
                <span>{translate("charts.smooth_label")}</span>
              </label>
              <label className="charts-page__checkbox">
                <input
                  type="checkbox"
                  data-testid="charts-area"
                  checked={area}
                  onChange={(event) => setArea(event.target.checked)}
                />
                <span>{translate("charts.area_label")}</span>
              </label>
            </>
          ) : null}

          {family === "bar" ? (
            <label className="charts-page__checkbox">
              <input
                type="checkbox"
                data-testid="charts-stack"
                checked={stack}
                onChange={(event) => setStack(event.target.checked)}
              />
              <span>{translate("charts.stack_label")}</span>
            </label>
          ) : null}

          <label className="charts-page__checkbox">
            <input
              type="checkbox"
              data-testid="charts-legend"
              checked={legend}
              onChange={(event) => setLegend(event.target.checked)}
            />
            <span>{translate("charts.legend_label")}</span>
          </label>
          <label className="charts-page__checkbox">
            <input
              type="checkbox"
              data-testid="charts-tooltip"
              checked={tooltip}
              onChange={(event) => setTooltip(event.target.checked)}
            />
            <span>{translate("charts.tooltip_label")}</span>
          </label>
        </div>

        <h3 className="charts-page__subtitle">{translate("charts.data_title")}</h3>
        <div className="charts-page__table-wrap">
          <table className="charts-page__table">
            <thead>
              <tr>
                <th scope="col">{translate("charts.column_category")}</th>
                <th scope="col">{translate("charts.column_value")}</th>
                <th scope="col">{translate("charts.column_weight")}</th>
                <th scope="col">{translate("charts.column_series")}</th>
                <th scope="col">
                  <span className="charts-page__visually-hidden">
                    {translate("charts.remove_row", { index: 0 })}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      aria-label={`${translate("charts.column_category")} ${index + 1}`}
                      value={row.category}
                      onChange={(event) => patchRow(index, { category: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      aria-label={`${translate("charts.column_value")} ${index + 1}`}
                      value={row.value}
                      onChange={(event) =>
                        patchRow(index, { value: numberOf(event.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      aria-label={`${translate("charts.column_weight")} ${index + 1}`}
                      value={row.weight}
                      onChange={(event) =>
                        patchRow(index, { weight: numberOf(event.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      aria-label={`${translate("charts.column_series")} ${index + 1}`}
                      value={row.series}
                      onChange={(event) => patchRow(index, { series: event.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="charts-page__remove"
                      aria-label={translate("charts.remove_row", { index: index + 1 })}
                      title={translate("charts.remove_row", { index: index + 1 })}
                      onClick={() => removeRow(index)}
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="charts-page__add"
          data-testid="charts-add-row"
          onClick={addRow}
        >
          {translate("charts.add_row")}
        </button>

        <h3 className="charts-page__subtitle">{translate("charts.chart_title")}</h3>
        <div className="charts-page__chart" data-testid="charts-chart">
          {renderChart()}
        </div>
      </section>

      <section
        className="charts-page__panel"
        aria-label={translate("charts.curve_title")}
      >
        <h3 className="charts-page__subtitle">{translate("charts.curve_title")}</h3>
        <p className="charts-page__hint">{translate("charts.curve_intro")}</p>

        <div className="charts-page__toolbar">
          <label className="charts-page__field">
            <span>{translate("charts.interpolation_label")}</span>
            <select
              data-testid="charts-interpolation"
              value={interpolation}
              onChange={(event) =>
                setInterpolation(event.target.value as CurveInterpolation)
              }
            >
              <option value="monotonic">
                {translate("charts.interpolation_monotonic")}
              </option>
              <option value="linear">{translate("charts.interpolation_linear")}</option>
            </select>
          </label>
          <label className="charts-page__field charts-page__field--grow">
            <span>{translate("charts.formula_label")}</span>
            <input
              type="text"
              data-testid="charts-formula"
              value={formula}
              placeholder={translate("charts.formula_placeholder")}
              onChange={(event) => setFormula(event.target.value)}
            />
          </label>
          <output className="charts-page__count" data-testid="charts-points-count">
            {translate("charts.points_count", { count: points.length })}
          </output>
        </div>

        <div data-testid="charts-curve-editor">
          <CurveEditor
            points={points}
            formula={formula}
            interpolation={interpolation}
            xRange={[0, 1]}
            yRange={[0, 1]}
            height={280}
            ariaLabel={translate("charts.curve_title")}
            onPointsChange={setPoints}
            onFormulaChange={setFormula}
            onPointAdded={() => setLastPointEvent("pointAdded")}
            onPointRemoved={() => setLastPointEvent("pointRemoved")}
            onPointMoved={() => setLastPointEvent("pointMoved")}
          />
        </div>
        <output className="charts-page__count" data-testid="charts-last-event">
          {lastPointEvent}
        </output>
      </section>
    </section>
  );
}
