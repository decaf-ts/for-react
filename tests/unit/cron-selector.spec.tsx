/**
 * @module for-react/cron-selector.spec
 * @summary SAA-1957 — unit coverage for the React `CronSelector` port of the
 * Angular cron selector (SAA-1955 / DECAF-895).
 * @description Ports the Angular `CronSelectorComponent` spec and adds the
 * picker regression the Angular baseline was missing:
 *
 * - default `0 9 * * *`, daily/hourly/weekly serialization and `describeCron`;
 * - `hideDaily`/`hideInterval`/`hideWeekly` filter the mode segment;
 * - `disabled` never publishes a new value;
 * - initial `value` seeds the control and `onChange`/`onValueChange` both fire;
 * - every daily/weekly time slot renders an `IonDatetimeButton` wired to a
 *   real `IonDatetime` (the latent Angular gap) and editing the datetime
 *   updates the cron expression;
 * - the stale request guard keeps the later description when an earlier
 *   request settles last.
 */
import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import {
  CronSelector,
  CronSelectorComponent,
  type CronSelectorHandle,
} from "../../src/cron/CronSelector";
import * as cronUtils from "../../src/cron/cron-utils";
import { RgxServicesProvider } from "../../src/lib/services/RgxContext";
import { RgxTranslateService } from "../../src/lib/services/RgxTranslateService";

function renderSelector(
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

function segmentValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("ion-segment-button")).map(
    (button) => {
      const prop = (button as unknown as { value?: unknown }).value;
      return typeof prop === "string"
        ? prop
        : button.getAttribute("value") ?? "";
    }
  );
}

function datetimeSlots(): Array<{ button: Element; datetime: Element }> {
  return Array.from(document.querySelectorAll("ion-datetime-button")).map(
    (button) => {
      const id = String(
        readProp(button, "datetime") ?? button.getAttribute("datetime") ?? ""
      );
      const datetime = document.querySelector(`ion-datetime[id="${id}"]`);
      expect(datetime).not.toBeNull();
      return { button, datetime: datetime as Element };
    }
  );
}

function emitIonChange(element: Element, detail: unknown): void {
  fireEvent(
    element,
    new CustomEvent("ionChange", { detail, bubbles: true, cancelable: true })
  );
}

function readProp(element: Element, name: string): unknown {
  return (element as unknown as Record<string, unknown>)[name];
}

describe("CronSelector (React /cron port)", () => {
  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it("exports the same component through all public aliases", () => {
    expect(CronSelectorComponent).toBe(CronSelector);
  });

  it("defaults to a daily 0 9 * * * schedule", () => {
    const ref = React.createRef<CronSelectorHandle>();
    const { container } = renderSelector(<CronSelector ref={ref} />);

    expect(ref.current?.getValue()).toBe("0 9 * * *");
    expect(ref.current?.getControlValue("mode")).toBe("daily");
    expect(ref.current?.getControlValue("times")).toEqual(["09:00"]);
    expect(segmentValues(container)).toEqual(["daily", "hourly", "weekly"]);
  });

  it("serializes daily times with a shared minute into one expression", () => {
    const ref = React.createRef<CronSelectorHandle>();
    renderSelector(<CronSelector ref={ref} />);

    act(() => ref.current?.setControlValue("times", ["09:00", "21:00"]));

    expect(ref.current?.getValue()).toBe("0 9,21 * * *");
  });

  it("serializes daily times with different minutes into multiple expressions", () => {
    const ref = React.createRef<CronSelectorHandle>();
    renderSelector(<CronSelector ref={ref} />);

    act(() => ref.current?.setControlValue("times", ["08:00", "20:30"]));

    expect(ref.current?.getValue()).toBe("0 8 * * *;30 20 * * *");
  });

  it("serializes hourly schedules through the interval control", () => {
    const ref = React.createRef<CronSelectorHandle>();
    const { container } = renderSelector(<CronSelector ref={ref} />);

    emitIonChange(container.querySelector("ion-segment") as Element, {
      value: "hourly",
    });
    act(() => ref.current?.setControlValue("everyHours", 6));

    expect(ref.current?.getValue()).toBe("0 */6 * * *");
  });

  it("serializes hourly schedules when set directly on the control", () => {
    const ref = React.createRef<CronSelectorHandle>();
    renderSelector(<CronSelector ref={ref} />);

    act(() => {
      ref.current?.setControlValue("mode", "hourly");
      ref.current?.setControlValue("everyHours", 12);
    });

    expect(ref.current?.getValue()).toBe("0 */12 * * *");
  });

  it("serializes weekly schedules with selected weekdays", () => {
    const ref = React.createRef<CronSelectorHandle>();
    renderSelector(<CronSelector ref={ref} />);

    act(() => {
      ref.current?.setControlValue("mode", "weekly");
      ref.current?.setControlValue("times", ["08:30"]);
      ref.current?.setControlValue("weekdays", [1, 3, 5]);
    });

    expect(ref.current?.getValue()).toBe("30 8 * * 1,3,5");
  });

  it("toggles weekdays on and off and keeps them sorted", () => {
    const ref = React.createRef<CronSelectorHandle>();
    renderSelector(<CronSelector ref={ref} />);

    act(() => {
      ref.current?.setControlValue("mode", "weekly");
      ref.current?.toggleWeekday(6, true);
    });

    expect(ref.current?.isWeekdaySelected(6)).toBe(true);
    expect(ref.current?.getControlValue("weekdays")).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);

    act(() => ref.current?.toggleWeekday(1, false));

    expect(ref.current?.isWeekdaySelected(1)).toBe(false);
    expect(ref.current?.getControlValue("weekdays")).toEqual([2, 3, 4, 5, 6]);
  });

  it("hides configured schedule modes", () => {
    const { container } = renderSelector(
      <CronSelector hideDaily hideWeekly />
    );

    expect(segmentValues(container)).toEqual(["hourly"]);
  });

  it("hides each mode independently", () => {
    const { container, rerender } = renderSelector(
      <CronSelector hideInterval hideWeekly />
    );
    expect(segmentValues(container)).toEqual(["daily"]);

    rerender(<CronSelector hideDaily hideInterval describeCron={false} />);
    expect(segmentValues(container)).toEqual(["weekly"]);
  });

  it("never publishes a new value while disabled", () => {
    const onChange = jest.fn();
    const onValueChange = jest.fn();
    const formControl = { setValue: jest.fn() };
    const ref = React.createRef<CronSelectorHandle>();
    renderSelector(
      <CronSelector
        ref={ref}
        disabled
        onChange={onChange}
        onValueChange={onValueChange}
        formControl={formControl}
      />
    );

    act(() => {
      ref.current?.addTime();
      ref.current?.setControlValue("mode", "hourly");
    });

    expect(ref.current?.getValue()).toBe("0 9 * * *");
    expect(onChange).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(formControl.setValue).not.toHaveBeenCalled();
  });

  it("seeds from the initial value and publishes through every channel on change", () => {
    const onChange = jest.fn();
    const onValueChange = jest.fn();
    const formControl = { setValue: jest.fn() };
    const ref = React.createRef<CronSelectorHandle>();
    renderSelector(
      <CronSelector
        ref={ref}
        value="0 8 * * *"
        onChange={onChange}
        onValueChange={onValueChange}
        formControl={formControl}
      />
    );

    expect(ref.current?.getValue()).toBe("0 8 * * *");

    act(() => {
      ref.current?.setControlValue("mode", "hourly");
      ref.current?.setControlValue("everyHours", 4);
    });

    expect(onChange).toHaveBeenLastCalledWith("0 */4 * * *");
    expect(onValueChange).toHaveBeenLastCalledWith("0 */4 * * *");
    expect(formControl.setValue).toHaveBeenLastCalledWith("0 */4 * * *", {
      emitEvent: true,
    });
  });

  it("adds and removes time slots, never removing the last one", () => {
    const ref = React.createRef<CronSelectorHandle>();
    renderSelector(<CronSelector ref={ref} />);

    act(() => ref.current?.addTime());
    expect(ref.current?.getControlValue("times")).toEqual(["09:00", "12:00"]);

    act(() => ref.current?.removeTime(1));
    expect(ref.current?.getControlValue("times")).toEqual(["09:00"]);

    act(() => ref.current?.removeTime(0));
    expect(ref.current?.getControlValue("times")).toEqual(["09:00"]);
  });

  it("updates a time slot from a datetime value and rejects invalid input", () => {
    const ref = React.createRef<CronSelectorHandle>();
    renderSelector(<CronSelector ref={ref} />);

    act(() => ref.current?.updateTime(0, "18:45"));
    expect(ref.current?.getValue()).toBe("45 18 * * *");

    act(() => {
      expect(() => ref.current?.updateTime(0, "nope")).toThrow();
    });
    expect(ref.current?.getValue()).toBe("45 18 * * *");
  });

  it("renders a human readable schedule when describeCron is enabled", async () => {
    const ref = React.createRef<CronSelectorHandle>();
    const { container } = renderSelector(
      <CronSelector ref={ref} describeCron />
    );

    await waitFor(() =>
      expect(
        container.querySelector(".dcf-current-cron code")?.textContent
      ).toBe("At 09:00")
    );
    expect(ref.current?.getDisplayedSchedule()).toBe("At 09:00");
    await act(async () => {
      await Promise.resolve();
    });
  });

  it("shows the raw cron expression when describeCron is disabled", () => {
    const ref = React.createRef<CronSelectorHandle>();
    const { container } = renderSelector(
      <CronSelector ref={ref} describeCron={false} />
    );

    expect(
      container.querySelector(".dcf-current-cron code")?.textContent
    ).toBe("0 9 * * *");
    expect(ref.current?.getDisplayedSchedule()).toBe("0 9 * * *");
  });

  it("describes the schedule in the active language", async () => {
    const ref = React.createRef<CronSelectorHandle>();
    const { container } = renderSelector(
      <CronSelector ref={ref} describeCron />,
      { lang: "pt-BR" }
    );

    await waitFor(() =>
      expect(
        container.querySelector(".dcf-current-cron code")?.textContent
      ).toBe("Às 09:00")
    );
    await act(async () => {
      await Promise.resolve();
    });
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
      const ref = React.createRef<CronSelectorHandle>();
      renderSelector(<CronSelector ref={ref} describeCron />);

      await waitFor(() => expect(resolvers.length).toBeGreaterThan(0));
      const firstRequest = resolvers[0];

      act(() => ref.current?.setControlValue("mode", "hourly"));
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

  it("opens a real IonDatetime per daily time slot through IonDatetimeButton", () => {
    renderSelector(<CronSelector />);

    const slots = datetimeSlots();
    expect(slots).toHaveLength(1);
    expect(readProp(slots[0].button, "datetime")).toBe("daily-time-0");
    expect(readProp(slots[0].datetime, "presentation")).toBe("time");
    expect(readProp(slots[0].datetime, "value")).toBe("09:00");
  });

  it("wires each weekly time slot to its own IonDatetime", () => {
    const ref = React.createRef<CronSelectorHandle>();
    renderSelector(<CronSelector ref={ref} />);

    act(() => {
      ref.current?.setControlValue("mode", "weekly");
      ref.current?.addTime();
    });

    const slots = datetimeSlots();
    expect(slots).toHaveLength(2);
    expect(slots.map((slot) => readProp(slot.button, "datetime"))).toEqual([
      "daily-time-0",
      "daily-time-1",
    ]);
    expect(
      slots.map((slot) => readProp(slot.datetime, "presentation"))
    ).toEqual(["time", "time"]);
  });

  it("updates the cron when the real IonDatetime emits ionChange", () => {
    const ref = React.createRef<CronSelectorHandle>();
    renderSelector(<CronSelector ref={ref} />);

    const [slot] = datetimeSlots();
    emitIonChange(slot.datetime, { value: "17:30" });

    expect(ref.current?.getValue()).toBe("30 17 * * *");
    expect(ref.current?.getControlValue("times")).toEqual(["17:30"]);
  });

  it("re-syncs the generated value and description when the external value changes", async () => {
    const ref = React.createRef<CronSelectorHandle>();
    const { container, rerender } = renderSelector(
      <CronSelector ref={ref} value="0 8 * * *" describeCron />
    );

    await waitFor(() =>
      expect(
        container.querySelector(".dcf-current-cron code")?.textContent
      ).toBe("At 08:00")
    );

    rerender(<CronSelector ref={ref} value="30 17 * * *" describeCron />);

    expect(ref.current?.getValue()).toBe("30 17 * * *");
    await waitFor(() =>
      expect(
        container.querySelector(".dcf-current-cron code")?.textContent
      ).toBe("At 17:30")
    );
    await act(async () => {
      await Promise.resolve();
    });
  });

  it("re-syncs only the published expression, leaving the editable schedule untouched", () => {
    const ref = React.createRef<CronSelectorHandle>();
    const { container, rerender } = renderSelector(
      <CronSelector ref={ref} value="0 8 * * *" />
    );

    rerender(
      <CronSelector ref={ref} value="0 */4 * * *" describeCron={false} />
    );

    expect(ref.current?.getValue()).toBe("0 */4 * * *");
    expect(
      container.querySelector(".dcf-current-cron code")?.textContent
    ).toBe("0 */4 * * *");

    expect(ref.current?.getControlValue("mode")).toBe("daily");
    expect(ref.current?.getControlValue("times")).toEqual(["09:00"]);
    expect(ref.current?.createCron()).toBe("0 9 * * *");
  });

  it("does not let the unchanged controlled value overwrite an edit made after a re-sync", () => {
    const onChange = jest.fn();
    const ref = React.createRef<CronSelectorHandle>();
    const { rerender } = renderSelector(
      <CronSelector ref={ref} value="0 8 * * *" onChange={onChange} />
    );

    rerender(
      <CronSelector
        ref={ref}
        value="0 */4 * * *"
        describeCron={false}
        onChange={onChange}
      />
    );
    expect(ref.current?.getValue()).toBe("0 */4 * * *");

    act(() => ref.current?.updateTime(0, "17:30"));

    expect(ref.current?.getValue()).toBe("30 17 * * *");
    expect(onChange).toHaveBeenLastCalledWith("30 17 * * *");

    rerender(
      <CronSelector
        ref={ref}
        value="0 */4 * * *"
        describeCron={false}
        onChange={onChange}
      />
    );

    expect(ref.current?.getValue()).toBe("30 17 * * *");
  });
});
