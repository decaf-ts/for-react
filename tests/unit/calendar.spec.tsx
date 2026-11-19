/**
 * @module for-react/calendar.spec
 * @summary SAA-1993 — component contract for the React `/calendar` port
 * (SAA-1986 / DECAF-895), mirroring the Angular `calendar.component.spec.ts`.
 * @description Proves the month-grid rendering, controlled selection and
 * month-change emission, event markers, roving tabindex/keyboard navigation,
 * the today shortcut and the locale/label contract of `Calendar`: `locale` is
 * a plain prop defaulting to `en-GB`, an explicit `locale` selects the
 * date-fns locale, a surrounding `RgxServicesProvider` does not change either
 * the locale or the English label defaults, and explicit label props render
 * verbatim.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type {
  CalendarMonthChangeEvent,
  CalendarProps,
  CalendarSelectionEvent,
} from "../../src/calendar/calendar.types";
import { Calendar } from "../../src/calendar/Calendar";
import { RgxServicesProvider } from "../../src/lib/services/RgxContext";
import { RgxTranslateService } from "../../src/lib/services/RgxTranslateService";

const DEFAULTS: CalendarProps = {
  year: 2024,
  month: 3,
  selectedDate: null,
  events: [],
  today: "2024-03-15",
  locale: "en-GB",
  firstDayOfWeek: 1,
};

function renderCalendar(
  props: CalendarProps = {}
): ReturnType<typeof render> {
  return render(<Calendar {...DEFAULTS} {...props} />);
}

function dayButton(container: HTMLElement, key: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(
    `button[data-calendar-date="${key}"]`
  );
  if (!button) {
    throw new Error(`No day button rendered for ${key}`);
  }
  return button;
}

function dayCell(container: HTMLElement, key: string): HTMLTableCellElement {
  const cell = container.querySelector<HTMLTableCellElement>(
    `td[role="gridcell"][data-calendar-date="${key}"]`
  );
  if (!cell) {
    throw new Error(`No day cell rendered for ${key}`);
  }
  return cell;
}

function tabStop(container: HTMLElement): HTMLButtonElement {
  const stops = container.querySelectorAll<HTMLButtonElement>(
    'button[tabindex="0"]'
  );
  expect(stops).toHaveLength(1);
  return stops[0];
}

function press(container: HTMLElement, key: string): string | null {
  const stop = tabStop(container);
  fireEvent.focus(stop);
  fireEvent.keyDown(stop, { key, bubbles: true, cancelable: true });
  return tabStop(container).getAttribute("data-calendar-date");
}

describe("Calendar — month grid (SAA-1988)", () => {
  it("renders seven weekday headers and a fixed forty-two-cell grid", () => {
    const { container } = renderCalendar();

    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(container.querySelectorAll('[role="gridcell"]')).toHaveLength(42);
    expect(container.querySelectorAll(".dcf-calendar__week")).toHaveLength(6);
    expect(container.querySelector(".dcf-calendar__title")?.textContent).toBe(
      "March 2024"
    );
    expect(
      container.querySelector(".dcf-calendar__title")?.getAttribute("aria-live")
    ).toBe("polite");
    expect(container.querySelector('[role="grid"]')).not.toBeNull();
  });

  it("marks the selected cell with aria-selected", () => {
    const { container } = renderCalendar({ selectedDate: "2024-03-01" });

    expect(dayCell(container, "2024-03-01").getAttribute("aria-selected")).toBe(
      "true"
    );
    expect(
      container.querySelectorAll('[role="gridcell"][aria-selected="true"]')
    ).toHaveLength(1);
  });

  it("emits the selection with the previous date without moving the controlled view", () => {
    const onDateSelected = jest.fn<void, [CalendarSelectionEvent]>();
    const { container } = renderCalendar({
      selectedDate: "2024-03-01",
      onDateSelected,
    });

    fireEvent.click(dayButton(container, "2024-03-05"));

    expect(onDateSelected).toHaveBeenCalledTimes(1);
    expect(onDateSelected.mock.calls[0][0]).toEqual({
      date: "2024-03-05",
      previousDate: "2024-03-01",
      year: 2024,
      month: 3,
      day: 5,
    });

    // Controlled: the host owns the month/selection state.
    expect(container.querySelector(".dcf-calendar__title")?.textContent).toBe(
      "March 2024"
    );
    expect(
      container.querySelector<HTMLElement>(
        'td[role="gridcell"] .dcf-calendar__day-number'
      )?.textContent
    ).toBe("26");
    expect(
      container.querySelector<HTMLElement>('td[role="gridcell"]')
        ?.getAttribute("data-calendar-date")
    ).toBe("2024-02-26");
  });

  it("emits the selection with a null previous date when nothing was selected", () => {
    const onDateSelected = jest.fn<void, [CalendarSelectionEvent]>();
    const { container } = renderCalendar({ onDateSelected });

    fireEvent.click(dayButton(container, "2024-03-05"));

    expect(onDateSelected.mock.calls[0][0]).toEqual({
      date: "2024-03-05",
      previousDate: null,
      year: 2024,
      month: 3,
      day: 5,
    });
  });

  it("emits normalized month changes without changing the controlled view", () => {
    const onMonthChange = jest.fn<void, [CalendarMonthChangeEvent]>();
    const { container } = renderCalendar({
      year: 2024,
      month: 1,
      today: "2024-01-10",
      onMonthChange,
    });
    const firstCell = () =>
      container
        .querySelector('[role="gridcell"]')
        ?.getAttribute("data-calendar-date");

    expect(firstCell()).toBe("2024-01-01");

    fireEvent.click(
      container.querySelector<HTMLButtonElement>(
        '[data-calendar-nav="previous"]'
      ) as HTMLButtonElement
    );

    expect(onMonthChange).toHaveBeenLastCalledWith({
      year: 2023,
      month: 12,
      previousYear: 2024,
      previousMonth: 1,
      direction: "previous",
    });
    expect(container.querySelector(".dcf-calendar__title")?.textContent).toBe(
      "January 2024"
    );
    expect(firstCell()).toBe("2024-01-01");

    fireEvent.click(
      container.querySelector<HTMLButtonElement>(
        '[data-calendar-nav="next"]'
      ) as HTMLButtonElement
    );

    expect(onMonthChange).toHaveBeenLastCalledWith({
      year: 2024,
      month: 2,
      previousYear: 2024,
      previousMonth: 1,
      direction: "next",
    });
    expect(container.querySelector(".dcf-calendar__title")?.textContent).toBe(
      "January 2024"
    );
  });

  it("today requests the today month and selects the today date", () => {
    const onMonthChange = jest.fn<void, [CalendarMonthChangeEvent]>();
    const onDateSelected = jest.fn<void, [CalendarSelectionEvent]>();
    const { container } = renderCalendar({
      year: 2024,
      month: 1,
      today: "2024-03-15",
      onMonthChange,
      onDateSelected,
    });

    fireEvent.click(
      container.querySelector<HTMLButtonElement>(
        '[data-calendar-nav="today"]'
      ) as HTMLButtonElement
    );

    expect(onMonthChange).toHaveBeenLastCalledWith({
      year: 2024,
      month: 3,
      previousYear: 2024,
      previousMonth: 1,
      direction: "today",
    });
    expect(onDateSelected).toHaveBeenLastCalledWith({
      date: "2024-03-15",
      previousDate: null,
      year: 2024,
      month: 3,
      day: 15,
    });
    expect(container.querySelector(".dcf-calendar__title")?.textContent).toBe(
      "January 2024"
    );
  });

  it("marks exactly one grid cell with aria-current for today", () => {
    const { container } = renderCalendar({ today: "2024-03-15" });
    const current = Array.from(
      container.querySelectorAll('[role="gridcell"]')
    ).filter(
      (cell) =>
        cell.getAttribute("aria-current") === "date" ||
        cell.querySelector('[aria-current="date"]') !== null
    );

    expect(current).toHaveLength(1);
    expect(current[0].getAttribute("data-calendar-date")).toBe("2024-03-15");
  });

  it("renders at most three event markers plus an overflow count and full aria label", () => {
    const events = [
      { id: "one", date: "2024-03-10", title: "One" },
      { id: "two", date: "2024-03-10", title: "Two" },
      { id: "three", date: "2024-03-10", title: "Three" },
      { id: "four", date: "2024-03-10", title: "Four" },
      { id: "invalid", date: "2024-02-30", title: "Invalid" },
    ];
    const { container } = renderCalendar({ events });
    const cell = dayButton(container, "2024-03-10");

    expect(cell.querySelectorAll(".dcf-calendar__marker")).toHaveLength(3);
    expect(
      cell.querySelector(".dcf-calendar__marker-more")?.textContent
    ).toContain("+1");
    expect(cell.getAttribute("aria-label")).toContain(
      "One, Two, Three, Four"
    );
    expect(cell.getAttribute("aria-label")).not.toContain("Invalid");
    expect(
      container.querySelectorAll(".dcf-calendar__marker")
    ).toHaveLength(3);
  });

  it("keeps exactly one day in the tab order, preferring the selection over today", () => {
    const { container } = renderCalendar({
      selectedDate: "2024-03-12",
      today: "2024-03-15",
    });

    const stops = container.querySelectorAll('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect(stops[0].getAttribute("data-calendar-date")).toBe("2024-03-12");
    expect(
      container.querySelectorAll('button[tabindex="-1"]')
    ).toHaveLength(41);
    expect(
      dayButton(container, "2024-03-15").getAttribute("tabindex")
    ).toBe("-1");
  });

  it("moves the roving tab stop with arrow, Home and End keys", () => {
    const { container } = renderCalendar({ selectedDate: "2024-03-13" });

    expect(press(container, "ArrowRight")).toBe("2024-03-14");
    expect(press(container, "ArrowDown")).toBe("2024-03-21");
    expect(press(container, "Home")).toBe("2024-03-18");
    expect(press(container, "End")).toBe("2024-03-24");
    expect(press(container, "ArrowUp")).toBe("2024-03-17");
    expect(press(container, "ArrowLeft")).toBe("2024-03-16");
  });

  it("requests the adjacent month when keyboard navigation crosses a boundary", () => {
    const onMonthChange = jest.fn<void, [CalendarMonthChangeEvent]>();
    const next = renderCalendar({
      selectedDate: "2024-03-31",
      onMonthChange,
    });

    expect(press(next.container, "ArrowRight")).toBeDefined();
    expect(onMonthChange).toHaveBeenLastCalledWith({
      year: 2024,
      month: 4,
      previousYear: 2024,
      previousMonth: 3,
      direction: "next",
    });
    next.unmount();

    const previousChange = jest.fn<void, [CalendarMonthChangeEvent]>();
    const previous = renderCalendar({
      selectedDate: "2024-03-01",
      onMonthChange: previousChange,
    });

    press(previous.container, "ArrowLeft");
    expect(previousChange).toHaveBeenLastCalledWith({
      year: 2024,
      month: 2,
      previousYear: 2024,
      previousMonth: 3,
      direction: "previous",
    });
  });

  it("defaults the locale to en-GB when no locale prop is supplied", () => {
    const { container } = renderCalendar({ locale: undefined });

    expect(container.querySelector(".dcf-calendar__title")?.textContent).toBe(
      "March 2024"
    );
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent)
    ).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(dayButton(container, "2024-03-10").getAttribute("aria-label")).toContain(
      "10 March 2024"
    );
    expect(
      container.querySelector('[data-calendar-nav="previous"]')
        ?.getAttribute("aria-label")
    ).toBe("Previous month");
    expect(
      container.querySelector('[data-calendar-nav="next"]')?.getAttribute(
        "aria-label"
      )
    ).toBe("Next month");
    expect(
      container.querySelector('[data-calendar-nav="today"]')?.textContent?.trim()
    ).toBe("Today");
  });

  it("selects the date-fns locale from an explicit locale prop", () => {
    const { container } = renderCalendar({ locale: "pt" });

    expect(container.querySelector(".dcf-calendar__title")?.textContent).toBe(
      "março 2024"
    );
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent)
    ).toEqual(["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]);
    expect(dayButton(container, "2024-03-10").getAttribute("aria-label")).toContain(
      "domingo, 10 de março de 2024"
    );
    // Label props are plain strings with English defaults; an explicit
    // date-fns locale does not translate them.
    expect(
      container.querySelector('[data-calendar-nav="previous"]')
        ?.getAttribute("aria-label")
    ).toBe("Previous month");
    expect(
      container.querySelector('[data-calendar-nav="next"]')?.getAttribute(
        "aria-label"
      )
    ).toBe("Next month");
    expect(
      container.querySelector('[data-calendar-nav="today"]')?.textContent?.trim()
    ).toBe("Today");
  });

  it("does not derive the locale or label defaults from the services provider", () => {
    const { container } = render(
      <RgxServicesProvider translateService={new RgxTranslateService("pt")}>
        <Calendar year={2024} month={3} />
      </RgxServicesProvider>
    );

    expect(container.querySelector(".dcf-calendar__title")?.textContent).toBe(
      "March 2024"
    );
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent)
    ).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(dayButton(container, "2024-03-10").getAttribute("aria-label")).toContain(
      "10 March 2024"
    );
    expect(
      container.querySelector('[data-calendar-nav="previous"]')
        ?.getAttribute("aria-label")
    ).toBe("Previous month");
    expect(
      container.querySelector('[data-calendar-nav="next"]')?.getAttribute(
        "aria-label"
      )
    ).toBe("Next month");
    expect(
      container.querySelector('[data-calendar-nav="today"]')?.textContent?.trim()
    ).toBe("Today");
  });

  it("renders host-supplied label props verbatim", () => {
    const { container } = renderCalendar({
      locale: "pt",
      label: "Agenda",
      previousMonthLabel: "Mês anterior",
      nextMonthLabel: "Mês seguinte",
      todayLabel: "Hoje",
    });

    expect(
      container.querySelector("section.dcf-calendar")?.getAttribute("aria-label")
    ).toBe("Agenda");
    expect(
      container.querySelector('[data-calendar-nav="previous"]')
        ?.getAttribute("aria-label")
    ).toBe("Mês anterior");
    expect(
      container.querySelector('[data-calendar-nav="next"]')?.getAttribute(
        "aria-label"
      )
    ).toBe("Mês seguinte");
    expect(
      container.querySelector('[data-calendar-nav="today"]')?.textContent?.trim()
    ).toBe("Hoje");
    expect(container.querySelector(".dcf-calendar__title")?.textContent).toBe(
      "março 2024"
    );
  });
});
