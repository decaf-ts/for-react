/**
 * @module for-react/cron-builder.spec
 * @summary SAA-1957 — unit coverage for the React `CronBuilder` port of the
 * Angular cron builder (SAA-1955 / DECAF-895).
 * @description Ports the Angular `CronBuilderComponent` spec:
 *
 * - five raw field controls (and a caller-supplied subset), direct edits and
 *   empty-value normalization;
 * - every-step (`*\/N`) toggles with the `0` fallback;
 * - every-minute/hour, daily-at, weekdays and monthly presets;
 * - `multiple` semicolon accumulation, duplicate suppression, reset and
 *   removal, keeping the current cron separate from the accumulated value;
 * - change emission through `onChange`/`onValueChange`/`changeEvent` and a
 *   bound `formControl`, plus disabled/read-only suppression;
 * - `hide*` preset visibility and `describeCron` in the active language.
 */
import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import {
  CronBuilder,
  CronBuilderComponent,
  type CronBuilderHandle,
} from "../../src/cron/CronBuilder";
import * as cronUtils from "../../src/cron/cron-utils";
import { RgxServicesProvider } from "../../src/lib/services/RgxContext";
import { RgxTranslateService } from "../../src/lib/services/RgxTranslateService";

function renderBuilder(
  ui: React.ReactElement,
  options: { lang?: string } = {}
) {
  const { lang } = options;
  const element =
    (ui.props as { describeCron?: boolean }).describeCron === undefined
      ? React.cloneElement(ui, { describeCron: false })
      : ui;
  if (!lang) return render(element);
  return render(
    <RgxServicesProvider translateService={new RgxTranslateService(lang)}>
      {element}
    </RgxServicesProvider>
  );
}

describe("CronBuilder (React /cron port)", () => {
  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it("exports the same component through all public aliases", () => {
    expect(CronBuilderComponent).toBe(CronBuilder);
  });

  it("parses the default value into the five raw cron fields", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    expect(ref.current?.getFieldValue("minute")).toBe("0");
    expect(ref.current?.getFieldValue("hour")).toBe("9");
    expect(ref.current?.getFieldValue("day")).toBe("*");
    expect(ref.current?.getFieldValue("month")).toBe("*");
    expect(ref.current?.getFieldValue("weekday")).toBe("*");
    expect(ref.current?.getValue()).toBe("0 9 * * *");
  });

  it("renders all five field controls by default", () => {
    const { container } = renderBuilder(<CronBuilder />);

    expect(
      container.querySelectorAll(".dcf-cron-builder-field-input")
    ).toHaveLength(5);
    expect(container.querySelectorAll(".dcf-every")).toHaveLength(2);
  });

  it("renders only the requested field subset", () => {
    const { container } = renderBuilder(
      <CronBuilder fields={["minute", "hour"]} />
    );

    expect(
      container.querySelectorAll(".dcf-cron-builder-field-input")
    ).toHaveLength(2);
    expect(
      Array.from(
        container.querySelectorAll(".dcf-cron-builder-field-input")
      ).map((input) => input.getAttribute("id"))
    ).toEqual(["cron-builder-minute", "cron-builder-hour"]);
  });

  it("reacts to direct edits on the raw fields", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => {
      ref.current?.setFieldValue("minute", "15");
      ref.current?.setFieldValue("hour", "3");
    });

    expect(ref.current?.getValue()).toBe("15 3 * * *");
  });

  it("normalizes an empty raw field back to *", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => ref.current?.setFieldValue("day", ""));

    expect(ref.current?.getFieldValue("day")).toBe("*");
    expect(ref.current?.getValue()).toBe("0 9 * * *");
  });

  it("applies the every-minutes preset overwriting all fields", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => ref.current?.applyEveryMinutes(5));

    expect(ref.current?.getValue()).toBe("*/5 * * * *");
    expect(ref.current?.getEveryMinutesValue()).toBe(5);
  });

  it("accepts 0 for the every-minutes preset", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => ref.current?.applyEveryMinutes(0));

    expect(ref.current?.getValue()).toBe("*/0 * * * *");
    expect(ref.current?.getEveryMinutesValue()).toBe(0);
  });

  it("falls back to 0 for a non-numeric every-minutes value", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => ref.current?.applyEveryMinutes(Number.NaN));

    expect(ref.current?.getValue()).toBe("*/0 * * * *");
    expect(ref.current?.getEveryMinutesValue()).toBe(0);
  });

  it("toggles the every-hour step around the current hour value", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => ref.current?.setFieldValue("hour", "2"));
    act(() => ref.current?.toggleEvery("hour"));

    expect(ref.current?.getValue()).toBe("0 */2 * * *");
    expect(ref.current?.isEvery("hour")).toBe(true);

    act(() => ref.current?.toggleEvery("hour"));

    expect(ref.current?.getValue()).toBe("0 2 * * *");
    expect(ref.current?.isEvery("hour")).toBe(false);
  });

  it("does not enable the every-hour step when the current hour value is 0", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => {
      ref.current?.applyDailyAt(0);
      ref.current?.setFieldValue("hour", "0");
      ref.current?.toggleEvery("hour");
    });

    expect(ref.current?.isEvery("hour")).toBe(false);
    expect(ref.current?.getValue()).toBe("0 0 * * *");
  });

  it("defaults the preset inputs from the default cron", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    expect(ref.current?.getEveryMinutesValue()).toBe(0);
    expect(ref.current?.getDailyAtHourValue()).toBe(9);
  });

  it("applies the daily-at preset", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => ref.current?.applyDailyAt(14));

    expect(ref.current?.getValue()).toBe("0 14 * * *");
    expect(ref.current?.getDailyAtHourValue()).toBe(14);
  });

  it("toggles weekdays and applies the weekdays preset", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);
    const selector = { value: "" };

    act(() =>
      ref.current?.handleSelectionPreset(["1", "3"], "weekday", selector)
    );
    expect(ref.current?.getValue()).toBe("0 9 * * 1,3");

    act(() =>
      ref.current?.handleSelectionPreset(["3"], "weekday", selector)
    );
    expect(ref.current?.getValue()).toBe("0 9 * * 3");
  });

  it("treats all weekdays selected as * and clears the select value", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);
    const selector = { value: "0,1" };

    act(() =>
      ref.current?.handleSelectionPreset(["all"], "weekday", selector)
    );

    expect(ref.current?.getValue()).toBe("0 9 * * *");
    expect(selector.value).toBe("");
  });

  it("applies the monthly preset", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => ref.current?.applyMonthly());

    expect(ref.current?.getValue()).toBe("0 0 1 * *");
  });

  it("applies a weekday preset list and treats a full week as *", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => ref.current?.applyPresetWeekdays(["1", "5"]));
    expect(ref.current?.getValue()).toBe("0 9 * * 1,5");

    act(() =>
      ref.current?.applyPresetWeekdays([
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
      ])
    );
    expect(ref.current?.getValue()).toBe("0 9 * * *");
  });

  it("hides interval, daily and weekly presets independently", () => {
    const ref = React.createRef<CronBuilderHandle>();
    const { rerender } = renderBuilder(<CronBuilder ref={ref} />);

    rerender(
      <CronBuilder
        ref={ref}
        describeCron={false}
        hideInterval
        hideDaily
        hideWeekly
      />
    );

    expect(ref.current?.isPresetHidden("minutes")).toBe(true);
    expect(ref.current?.isPresetHidden("hour")).toBe(true);
    expect(ref.current?.isPresetHidden("daily")).toBe(true);
    expect(ref.current?.isPresetHidden("weekdays")).toBe(true);
    expect(ref.current?.isPresetHidden("monthly")).toBe(false);
  });

  it("does not change the value while disabled", () => {
    const ref = React.createRef<CronBuilderHandle>();
    const onChange = jest.fn();
    renderBuilder(<CronBuilder ref={ref} disabled onChange={onChange} />);

    act(() => {
      ref.current?.applyDailyAt(14);
      ref.current?.applyEveryMinutes(5);
    });

    expect(ref.current?.getValue()).toBe("0 9 * * *");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("propagates changes through formControl and every change callback", () => {
    const onChange = jest.fn();
    const onValueChange = jest.fn();
    const changeEvent = jest.fn();
    const formControl = { setValue: jest.fn() };
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(
      <CronBuilder
        ref={ref}
        onChange={onChange}
        onValueChange={onValueChange}
        changeEvent={changeEvent}
        formControl={formControl}
      />
    );

    act(() => ref.current?.applyEveryMinutes(10));

    expect(ref.current?.getValue()).toBe("*/10 * * * *");
    expect(onChange).toHaveBeenLastCalledWith("*/10 * * * *");
    expect(onValueChange).toHaveBeenLastCalledWith("*/10 * * * *");
    expect(changeEvent).toHaveBeenLastCalledWith("*/10 * * * *");
    expect(formControl.setValue).toHaveBeenLastCalledWith(
      "*/10 * * * *",
      { emitEvent: true }
    );
  });

  it("renders the read-only expression without interactive controls", () => {
    const { container } = renderBuilder(
      <CronBuilder value="0 8 * * *" isReadOnlyOperation />
    );

    expect(container.querySelector(".dcf-input-item.read")).not.toBeNull();
    expect(container.querySelector("code")?.textContent).toBe("0 8 * * *");
    expect(
      container.querySelector(".dcf-cron-builder-field-input")
    ).toBeNull();
    expect(container.querySelector(".dcf-every")).toBeNull();
  });

  it("keeps the every-step and increment controls as labelled native buttons", () => {
    const { container } = renderBuilder(<CronBuilder />);

    const every = container.querySelector(".dcf-every") as HTMLButtonElement;
    const inputs = Array.from(
      container.querySelectorAll(".dcf-cron-builder-preset-input")
    );
    const controls = Array.from(
      container.querySelectorAll(".dcf-input-controls button")
    );

    expect(every.tagName).toBe("BUTTON");
    expect(every.type).toBe("button");
    expect(every.getAttribute("aria-pressed")).toBe("false");
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((input) =>
      expect(input.getAttribute("aria-label")?.trim().length).toBeGreaterThan(0)
    );
    expect(controls).toHaveLength(inputs.length * 2);
    controls.forEach((button) =>
      expect(button.getAttribute("aria-label")?.trim().length).toBeGreaterThan(0)
    );
    expect(container.querySelector("[role='button']")).toBeNull();
  });

  it("renders a human readable schedule when describeCron is enabled", async () => {
    const ref = React.createRef<CronBuilderHandle>();
    const { container } = renderBuilder(
      <CronBuilder ref={ref} describeCron />
    );

    await waitFor(() =>
      expect(
        container.querySelector(".dcf-cron-builder-description")?.textContent
      ).toBe("At 09:00")
    );
    expect(ref.current?.getDisplayedSchedule()).toBe("At 09:00");
    await act(async () => {
      await Promise.resolve();
    });
  });

  it("hides the description when describeCron is disabled", () => {
    const ref = React.createRef<CronBuilderHandle>();
    const { container } = renderBuilder(
      <CronBuilder ref={ref} describeCron={false} />
    );

    expect(container.querySelector(".dcf-cron-builder-description")).toBeNull();
    expect(ref.current?.getDisplayedSchedule()).toBe("0 9 * * *");
  });

  it("describes the schedule in the active language", async () => {
    const ref = React.createRef<CronBuilderHandle>();
    const { container } = renderBuilder(
      <CronBuilder ref={ref} describeCron />,
      { lang: "pt-BR" }
    );

    await waitFor(() =>
      expect(
        container.querySelector(".dcf-cron-builder-description")?.textContent
      ).toBe("Às 09:00")
    );
    await act(async () => {
      await Promise.resolve();
    });
  });

  it("does not accumulate crons when multiple is disabled", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => {
      ref.current?.applyDailyAt(14);
      ref.current?.addAnother();
    });

    expect(ref.current?.getAccumulatedCrons()).toEqual([]);
    expect(ref.current?.getValue()).toBe("0 14 * * *");
  });

  it("accumulates the current cron and resets to the default state when multiple is enabled", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} multiple />);

    act(() => {
      ref.current?.applyDailyAt(14);
      ref.current?.addAnother();
    });

    expect(ref.current?.getAccumulatedCrons()).toEqual(["0 14 * * *"]);
    expect(ref.current?.getFieldValue("hour")).toBe("9");
    expect(ref.current?.getValue()).toBe("0 14 * * *;0 9 * * *");

    act(() => ref.current?.applyEveryMinutes(5));
    expect(ref.current?.getValue()).toBe("0 14 * * *;*/5 * * * *");

    act(() => ref.current?.addAnother());
    expect(ref.current?.getAccumulatedCrons()).toEqual([
      "0 14 * * *",
      "*/5 * * * *",
    ]);
    expect(ref.current?.getValue()).toBe(
      "0 14 * * *;*/5 * * * *;0 9 * * *"
    );
  });

  it("does not add a duplicate cron already in the accumulated list", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} multiple />);

    act(() => {
      ref.current?.applyDailyAt(14);
      ref.current?.addAnother();
    });
    expect(ref.current?.getAccumulatedCrons()).toEqual(["0 14 * * *"]);

    act(() => {
      ref.current?.applyDailyAt(14);
      ref.current?.addAnother();
    });

    expect(ref.current?.getAccumulatedCrons()).toEqual(["0 14 * * *"]);
    expect(ref.current?.getValue()).toBe("0 14 * * *");
  });

  it("keeps the current-cron display separate from the accumulated value", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} multiple />);

    act(() => {
      ref.current?.applyDailyAt(14);
      ref.current?.addAnother();
    });

    expect(ref.current?.currentCron()).toBe("0 9 * * *");
    expect(ref.current?.getValue()).toBe("0 14 * * *;0 9 * * *");

    act(() => ref.current?.applyEveryMinutes(5));

    expect(ref.current?.currentCron()).toBe("*/5 * * * *");
    expect(ref.current?.getValue()).toBe("0 14 * * *;*/5 * * * *");
  });

  it("describes each accumulated cron with a readable label", async () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} multiple />);

    act(() => {
      ref.current?.applyDailyAt(14);
      ref.current?.addAnother();
    });

    await waitFor(() =>
      expect(
        ref.current?.describeAccumulatedCron(
          ref.current?.getAccumulatedCrons()[0] as string
        )
      ).toBe("At 14:00")
    );
  });

  it("removes an accumulated cron by index", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} multiple />);

    act(() => {
      ref.current?.applyDailyAt(14);
      ref.current?.addAnother();
      ref.current?.applyEveryMinutes(5);
      ref.current?.addAnother();
    });
    expect(ref.current?.getAccumulatedCrons()).toEqual([
      "0 14 * * *",
      "*/5 * * * *",
    ]);

    act(() => ref.current?.removeAccumulated(0));

    expect(ref.current?.getAccumulatedCrons()).toEqual(["*/5 * * * *"]);
    expect(ref.current?.getValue()).toBe("*/5 * * * *;0 9 * * *");
  });

  it("parses a semicolon-separated value into accumulated crons on init when multiple is enabled", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(
      <CronBuilder ref={ref} multiple value="0 14 * * *;*/5 * * * *" />
    );

    expect(ref.current?.getAccumulatedCrons()).toEqual(["0 14 * * *"]);
    expect(ref.current?.getFieldValue("minute")).toBe("*/5");
    expect(ref.current?.getFieldValue("hour")).toBe("*");
  });

  it("toggles a single preset weekday on and back off through togglePresetWeekday", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => ref.current?.togglePresetWeekday(1));

    expect(ref.current?.isPresetWeekdaySelected("1")).toBe(true);
    expect(ref.current?.getFieldValue("weekday")).toBe("1");
    expect(ref.current?.getValue()).toBe("0 9 * * 1");

    act(() => ref.current?.togglePresetWeekday(1));

    expect(ref.current?.isPresetWeekdaySelected("1")).toBe(false);
    expect(ref.current?.getFieldValue("weekday")).toBe("*");
    expect(ref.current?.getValue()).toBe("0 9 * * *");
  });

  it("orders toggled preset weekdays and treats all seven as *", () => {
    const ref = React.createRef<CronBuilderHandle>();
    renderBuilder(<CronBuilder ref={ref} />);

    act(() => ref.current?.togglePresetWeekday(5));
    act(() => ref.current?.togglePresetWeekday(1));

    expect(ref.current?.getValue()).toBe("0 9 * * 1,5");

    for (const day of [0, 2, 3, 4, 6]) {
      act(() => ref.current?.togglePresetWeekday(day));
    }

    expect(ref.current?.isPresetWeekdaySelected("all")).toBe(true);
    expect(ref.current?.getFieldValue("weekday")).toBe("*");
    expect(ref.current?.getValue()).toBe("0 9 * * *");
  });

  it("adopts a changed external value prop and keeps editing from it", () => {
    const onChange = jest.fn();
    const ref = React.createRef<CronBuilderHandle>();
    const { rerender } = renderBuilder(
      <CronBuilder ref={ref} value="0 8 * * *" onChange={onChange} />
    );

    expect(ref.current?.getValue()).toBe("0 8 * * *");

    rerender(
      <CronBuilder
        ref={ref}
        value="15 3 1 6 1"
        describeCron={false}
        onChange={onChange}
      />
    );

    expect(ref.current?.getValue()).toBe("15 3 1 6 1");
    expect(ref.current?.getFieldValue("minute")).toBe("15");
    expect(ref.current?.getFieldValue("hour")).toBe("3");
    expect(ref.current?.getFieldValue("day")).toBe("1");
    expect(ref.current?.getFieldValue("month")).toBe("6");
    expect(ref.current?.getFieldValue("weekday")).toBe("1");
    expect(onChange).not.toHaveBeenCalled();

    act(() => ref.current?.setFieldValue("minute", "30"));

    expect(ref.current?.getValue()).toBe("30 3 1 6 1");
    expect(onChange).toHaveBeenLastCalledWith("30 3 1 6 1");
  });

  it("keeps the later description when an earlier request settles last", async () => {
    const resolvers: Array<(value: string) => void> = [];
    const spy = jest
      .spyOn(cronUtils, "describeCronValue")
      .mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolvers.push(resolve);
          })
      );

    try {
      const ref = React.createRef<CronBuilderHandle>();
      renderBuilder(<CronBuilder ref={ref} describeCron />);

      await waitFor(() => expect(resolvers.length).toBeGreaterThan(0));
      const firstRequest = resolvers[0];

      act(() => ref.current?.setFieldValue("minute", "30"));
      await waitFor(() => expect(resolvers.length).toBeGreaterThan(1));
      const secondRequest = resolvers[1];

      await act(async () => {
        secondRequest("SECOND");
      });
      expect(ref.current?.getDisplayedSchedule()).toBe("SECOND");

      await act(async () => {
        firstRequest("FIRST");
      });
      expect(ref.current?.getDisplayedSchedule()).toBe("SECOND");
    } finally {
      spy.mockRestore();
    }
  });
});
