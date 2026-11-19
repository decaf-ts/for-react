import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { VirtualDataset } from "../../src/charts/virtual-dataset";
import {
  BarChart,
  BaseChart,
  LineChart,
  PieChart,
  ScatterChart,
} from "../../src/charts/components/BaseChart";
import { registerDefaultComponents } from "../../src/lib/components/register-defaults";
import { getRgxRenderingEngine } from "../../src/lib/engine/RgxRenderingEngine";

jest.mock("echarts", () => {
  const chart = {
    setOption: jest.fn(),
    resize: jest.fn(),
    dispose: jest.fn(),
    convertToPixel: jest.fn((_finder: unknown, point: [number, number]) => point),
    convertFromPixel: jest.fn((_finder: unknown, pixel: [number, number]) => pixel),
  };
  return { init: jest.fn(() => chart), __chart: chart };
});

import * as echarts from "echarts";

interface MockChart {
  setOption: jest.Mock;
  resize: jest.Mock;
  dispose: jest.Mock;
  convertToPixel: jest.Mock;
  convertFromPixel: jest.Mock;
}

interface ChartOption {
  xAxis?: { data?: unknown[]; type?: string };
  yAxis?: { data?: unknown[]; type?: string };
  series?: { type: string; name?: string; data: unknown[] }[];
}

const chart = (echarts as unknown as { __chart: MockChart }).__chart;

function lastOption(): ChartOption {
  const calls = chart.setOption.mock.calls;
  return calls[calls.length - 1][0] as ChartOption;
}

async function waitForSeriesData(data: unknown[]): Promise<void> {
  await waitFor(() => {
    expect(lastOption()?.series?.[0]?.data).toEqual(data);
  });
}

const FAMILIES = [
  {
    name: "BaseChart",
    Component: BaseChart,
    config: { xField: "x", yField: "y" },
    data: [
      { x: "jan", y: 10 },
      { x: "feb", y: 20 },
    ],
    seriesType: "line",
    expected: [10, 20],
  },
  {
    name: "LineChart",
    Component: LineChart,
    config: { xField: "x", yField: "y" },
    data: [
      { x: "jan", y: 10 },
      { x: "feb", y: 20 },
    ],
    seriesType: "line",
    expected: [10, 20],
  },
  {
    name: "BarChart",
    Component: BarChart,
    config: { xField: "x", yField: "y" },
    data: [
      { x: "jan", y: 4 },
      { x: "feb", y: 6 },
    ],
    seriesType: "bar",
    expected: [4, 6],
  },
  {
    name: "PieChart",
    Component: PieChart,
    config: { nameField: "name", valueField: "value" },
    data: [
      { name: "a", value: 1 },
      { name: "b", value: 2 },
    ],
    seriesType: "pie",
    expected: [
      { name: "a", value: 1 },
      { name: "b", value: 2 },
    ],
  },
  {
    name: "ScatterChart",
    Component: ScatterChart,
    config: { xField: "x", yField: "y" },
    data: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
    seriesType: "scatter",
    expected: [
      [1, 2],
      [3, 4],
    ],
  },
];

describe("chart wrappers", () => {
  beforeAll(async () => {
    registerDefaultComponents();
    await getRgxRenderingEngine().initialize();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(FAMILIES)("renders the $name family option graph", async (family) => {
    const { unmount } = render(
      <family.Component operation={OperationKeys.READ} config={family.config as never} data={family.data} />
    );

    await waitForSeriesData(family.expected);
    expect(lastOption().series?.[0]?.type).toBe(family.seriesType);

    unmount();
  });

  it("prefers the data prop over a dataset binding", async () => {
    const execute = jest.fn(async () => [{ x: "dataset", y: 99 }]);
    const dataset = { execute };

    render(
      <LineChart
        operation={OperationKeys.READ}
        config={{ xField: "x", yField: "y" }}
        data={[{ x: "data", y: 1 }]}
        dataset={dataset}
      />
    );

    await waitForSeriesData([1]);
    expect(execute).not.toHaveBeenCalled();
  });

  it("sub-queries a VirtualDataset source with datasetQuery", async () => {
    const load = jest.fn(() => [
      { x: "jan", y: 10 },
      { x: "feb", y: 20 },
    ]);
    const dataset = new VirtualDataset({
      model: "Sale",
      query: { limit: 100, offset: 2 },
      load: load as never,
    });
    const datasetQuery = { limit: 5, offset: 3 };

    render(
      <LineChart
        operation={OperationKeys.READ}
        config={{ xField: "x", yField: "y" }}
        dataset={dataset}
        datasetQuery={datasetQuery}
      />
    );

    await waitForSeriesData([10, 20]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toMatchObject({ action: "find", limit: 5, offset: 5 });
  });

  it("executes an already narrowed view without applying datasetQuery", async () => {
    const load = jest.fn(() => [{ x: "jan", y: 3 }]);
    const dataset = new VirtualDataset({
      model: "Sale",
      query: { limit: 100 },
      load: load as never,
    });
    const view = dataset.subQuery({ limit: 2 });

    render(
      <LineChart
        operation={OperationKeys.READ}
        config={{ xField: "x", yField: "y" }}
        dataset={view}
        datasetQuery={{ limit: 9, offset: 4 }}
      />
    );

    await waitForSeriesData([3]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toMatchObject({ action: "find", limit: 2 });
    expect(load.mock.calls[0][0]).not.toMatchObject({ limit: 9, offset: 4 });
  });

  it("reports dataset rejections through onChartError", async () => {
    const error = new Error("dataset failed");
    const view = { execute: jest.fn(() => Promise.reject(error)) };
    const onChartError = jest.fn();

    render(
      <LineChart
        operation={OperationKeys.READ}
        config={{ xField: "x", yField: "y" }}
        dataset={view}
        onChartError={onChartError}
      />
    );

    await waitFor(() => expect(onChartError).toHaveBeenCalledWith(error));
  });

  it("renders the config form for CREATE and reports the merged submit", async () => {
    const onConfigChanged = jest.fn();
    const onSubmitEvent = jest.fn();

    render(
      <LineChart
        operation={OperationKeys.CREATE}
        config={{ title: "Sales" }}
        onConfigChanged={onConfigChanged}
        onSubmitEvent={onSubmitEvent}
      />
    );

    const submit = await screen.findByRole("button", { name: /Submit/ });
    fireEvent.click(submit);

    await waitFor(() => expect(onConfigChanged).toHaveBeenCalledTimes(1));
    expect(onConfigChanged.mock.calls[0][0]).toMatchObject({
      title: "Sales",
      xField: "x",
      yField: "y",
      legend: true,
    });
    expect(onSubmitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sales", xField: "x", yField: "y" }),
      "ngx-decaf-line-chart"
    );
  });

  it("coerces the scatter symbol size to a number on submit", async () => {
    const onConfigChanged = jest.fn();

    render(
      <ScatterChart
        operation={OperationKeys.CREATE}
        config={{ xField: "x", yField: "y" }}
        onConfigChanged={onConfigChanged}
      />
    );

    const symbolSize = await screen.findByLabelText(/Symbol size/i);
    fireEvent.change(symbolSize, { target: { value: "24" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));

    await waitFor(() => expect(onConfigChanged).toHaveBeenCalledTimes(1));
    expect(onConfigChanged.mock.calls[0][0]).toMatchObject({ symbolSize: 24 });
  });

  it("disposes the ECharts instance on unmount", async () => {
    const { unmount } = render(
      <LineChart
        operation={OperationKeys.READ}
        config={{ xField: "x", yField: "y" }}
        data={[{ x: "a", y: 1 }]}
      />
    );

    await waitForSeriesData([1]);
    unmount();

    expect(chart.dispose).toHaveBeenCalled();
  });
});
