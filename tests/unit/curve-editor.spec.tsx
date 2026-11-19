import React, { useRef, useState } from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import {
  CurveEditor,
  type CurveEditorHandle,
  type CurveEditorProps,
} from "../../src/charts/components/CurveEditor";
import type { CurvePoint } from "../../src/charts/curve-interpolation";

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

interface CurveOption {
  series?: { type: string; data: number[][] }[];
  graphic?: unknown[];
}

const chart = (echarts as unknown as { __chart: MockChart }).__chart;

const POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0.6 },
  { x: 1, y: 1 },
];

function lastOption(): CurveOption {
  const calls = chart.setOption.mock.calls;
  return calls[calls.length - 1][0] as CurveOption;
}

function renderEditor(props: Partial<CurveEditorProps> = {}) {
  const ref = React.createRef<CurveEditorHandle>();
  const callbacks = {
    onPointsChange: jest.fn(),
    onFormulaChange: jest.fn(),
    onPointAdded: jest.fn(),
    onPointRemoved: jest.fn(),
    onPointMoved: jest.fn(),
    onCurveChanged: jest.fn(),
  };
  const view = render(
    <CurveEditor ref={ref} points={POINTS} {...callbacks} {...props} />
  );
  return { ...view, ref, ...callbacks };
}

describe("CurveEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the controlled points, labelled host and 121-point curve", async () => {
    const { container } = renderEditor();

    const host = container.querySelector('.dcf-curve-editor__chart');
    expect(host).toHaveAttribute("role", "img");
    expect(host).toHaveAttribute("aria-label", "Curve editor chart");

    await waitFor(() => {
      expect(lastOption()?.series?.[0]?.data).toHaveLength(121);
      expect(lastOption()?.graphic).toHaveLength(POINTS.length);
    });
  });

  it("emits sorted points and a regenerated piecewise formula", async () => {
    const { ref, onPointsChange, onFormulaChange } = renderEditor();

    act(() => {
      ref.current?.setPoints([
        { x: 1, y: 1 },
        { x: 0, y: 0 },
        { x: 0.5, y: 0.6 },
      ]);
    });

    await waitFor(() => expect(onPointsChange).toHaveBeenCalledTimes(1));
    expect(onPointsChange.mock.calls[0][0]).toEqual(POINTS);
    expect(onFormulaChange).toHaveBeenCalledTimes(1);
    expect(onFormulaChange.mock.calls[0][0]).toContain("\\begin{cases}");
  });

  it("samples a formula into exactly 21 points over the x range", async () => {
    const { ref, onFormulaChange, onPointsChange } = renderEditor();

    act(() => {
      ref.current?.applyFormula("x^2");
    });

    await waitFor(() => expect(onPointsChange).toHaveBeenCalledTimes(1));
    expect(onFormulaChange).toHaveBeenCalledWith("x^2");
    const sampled = onPointsChange.mock.calls[0][0] as CurvePoint[];
    expect(sampled).toHaveLength(21);
    expect(sampled[0]).toEqual({ x: 0, y: 0 });
    expect(sampled[sampled.length - 1]).toEqual({ x: 1, y: 1 });
  });

  it("leaves the points unchanged for an invalid formula", async () => {
    const { ref, onPointsChange, onFormulaChange } = renderEditor();

    act(() => {
      ref.current?.setPoints([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]);
    });
    await waitFor(() => expect(onPointsChange).toHaveBeenCalledTimes(1));
    onPointsChange.mockClear();
    onFormulaChange.mockClear();

    expect(ref.current?.formulaToPoints("\\frac{")).toEqual([]);
    act(() => {
      ref.current?.applyFormula("\\frac{");
    });

    expect(onPointsChange).not.toHaveBeenCalled();
    expect(ref.current?.generateFormula()).toContain("\\begin{cases}");
  });

  it("clamps a moved point to the ranges", async () => {
    const { ref, onPointMoved, onPointsChange } = renderEditor();

    act(() => {
      ref.current?.movePoint(1, 0.75, 2);
    });

    await waitFor(() => expect(onPointMoved).toHaveBeenCalledTimes(1));
    expect(onPointMoved.mock.calls[0][0]).toMatchObject({
      index: 1,
      point: { x: 0.75, y: 1 },
      previous: { x: 0.5, y: 0.6 },
    });
    expect(onPointsChange.mock.calls[0][0][1]).toEqual({ x: 0.75, y: 1 });
  });

  it("keeps control points ordered when moving across a neighbour", async () => {
    const { ref, onPointsChange } = renderEditor();

    act(() => {
      ref.current?.movePoint(1, -1, 0.5);
    });

    await waitFor(() => expect(onPointsChange).toHaveBeenCalledTimes(1));
    expect(onPointsChange.mock.calls[0][0][1].x).toBe(0);
  });

  it("pins and protects the endpoints when lockEndpoints is set", async () => {
    const { ref, onPointsChange, onPointRemoved } = renderEditor({
      lockEndpoints: true,
    });

    act(() => {
      ref.current?.setPoints([
        { x: 0.2, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 0.8, y: 1 },
      ]);
    });

    await waitFor(() => expect(onPointsChange).toHaveBeenCalledTimes(1));
    const locked = onPointsChange.mock.calls[0][0] as CurvePoint[];
    expect(locked[0].x).toBe(0);
    expect(locked[locked.length - 1].x).toBe(1);

    act(() => {
      ref.current?.removePoint(0);
    });
    expect(onPointRemoved).not.toHaveBeenCalled();
    expect(ref.current?.generateFormula()).toContain("\\begin{cases}");

    act(() => {
      ref.current?.movePoint(0, 0.7, 0.25);
    });
    await waitFor(() => expect(onPointsChange).toHaveBeenCalledTimes(2));
    expect((onPointsChange.mock.calls[1][0] as CurvePoint[])[0]).toEqual({
      x: 0,
      y: 0.25,
    });
  });

  it("reports added, removed and moved points", async () => {
    const {
      ref,
      onPointAdded,
      onPointRemoved,
      onPointMoved,
      onPointsChange,
    } = renderEditor();

    act(() => {
      ref.current?.addPoint(0.75, 0.9);
    });
    await waitFor(() => expect(onPointAdded).toHaveBeenCalledTimes(1));
    expect(onPointAdded).toHaveBeenCalledWith({ x: 0.75, y: 0.9 });
    expect(onPointsChange.mock.calls[0][0]).toEqual([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.6 },
      { x: 0.75, y: 0.9 },
      { x: 1, y: 1 },
    ]);

    act(() => {
      ref.current?.removePoint(2);
    });
    await waitFor(() => expect(onPointRemoved).toHaveBeenCalledTimes(1));
    expect(onPointRemoved).toHaveBeenCalledWith({ x: 0.75, y: 0.9 });

    act(() => {
      ref.current?.movePoint(1, 0.4, 0.3);
    });
    await waitFor(() => expect(onPointMoved).toHaveBeenCalledTimes(1));
    expect(onPointMoved.mock.calls[0][0]).toMatchObject({
      index: 1,
      point: { x: 0.4, y: 0.3 },
    });
  });

  it("ignores points outside the current range", async () => {
    const { ref, onPointMoved, onPointRemoved, onPointsChange } = renderEditor();

    act(() => {
      ref.current?.movePoint(9, 0.5, 0.5);
      ref.current?.removePoint(9);
    });

    expect(onPointMoved).not.toHaveBeenCalled();
    expect(onPointRemoved).not.toHaveBeenCalled();
    expect(onPointsChange).not.toHaveBeenCalled();
  });

  it("handles empty and single-point lists", async () => {
    const { ref, onCurveChanged } = renderEditor();

    act(() => {
      ref.current?.setPoints([]);
    });
    await waitFor(() => expect(onCurveChanged).toHaveBeenCalled());
    expect(onCurveChanged.mock.calls[onCurveChanged.mock.calls.length - 1][0]).toEqual([]);

    act(() => {
      ref.current?.setPoints([{ x: 0.3, y: 0.4 }]);
    });
    await waitFor(() => {
      const curve = onCurveChanged.mock.calls[onCurveChanged.mock.calls.length - 1][0] as CurvePoint[];
      expect(curve).toEqual([{ x: 0.3, y: 0.4 }]);
    });
  });

  it("does not loop when the host echoes the same array and string back", async () => {
    const onPointsChange = jest.fn();
    const onFormulaChange = jest.fn();
    const initial: CurvePoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];

    function Host() {
      const [points, setPoints] = useState<CurvePoint[]>(initial);
      const [formula, setFormula] = useState("");
      const ref = useRef<CurveEditorHandle>(null);
      return (
        <div>
          <button
            type="button"
            onClick={() =>
              ref.current?.setPoints([
                { x: 0, y: 0 },
                { x: 0.5, y: 0.2 },
                { x: 1, y: 1 },
              ])
            }
          >
            set
          </button>
          <CurveEditor
            ref={ref}
            points={points}
            formula={formula}
            onPointsChange={(next) => {
              onPointsChange(next);
              setPoints(next);
            }}
            onFormulaChange={(next) => {
              onFormulaChange(next);
              setFormula(next);
            }}
          />
        </div>
      );
    }

    const { getByRole } = render(<Host />);
    fireEvent.click(getByRole("button", { name: "set" }));

    await waitFor(() => expect(onPointsChange).toHaveBeenCalledTimes(1));
    expect(onFormulaChange).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(onPointsChange).toHaveBeenCalledTimes(1);
    expect(onFormulaChange).toHaveBeenCalledTimes(1);
  });

  it("does not re-emit when the host passes identical references back", async () => {
    const onPointsChange = jest.fn();
    const onFormulaChange = jest.fn();
    const points: CurvePoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const { rerender } = render(
      <CurveEditor
        points={points}
        formula="x^2"
        onPointsChange={onPointsChange}
        onFormulaChange={onFormulaChange}
      />
    );

    rerender(
      <CurveEditor
        points={points}
        formula="x^2"
        onPointsChange={onPointsChange}
        onFormulaChange={onFormulaChange}
      />
    );

    expect(onPointsChange).not.toHaveBeenCalled();
    expect(onFormulaChange).not.toHaveBeenCalled();
  });

  it("resizes and disposes the chart", async () => {
    const { ref, unmount } = renderEditor();

    act(() => {
      ref.current?.resize();
    });
    expect(chart.resize).toHaveBeenCalled();

    unmount();
    expect(chart.dispose).toHaveBeenCalled();
  });
});
