/**
 * @module for-react/calendar-markers.spec
 * @summary SAA-1995 — event marker color projection into the rendered day button.
 * @description Pins the host-facing marker contract of `Calendar`: an event
 * carrying a `color` paints its marker with that inline background, while an
 * event without a color keeps the stylesheet default (no inline background).
 * The selected-state contrast rule that keeps those markers legible lives in
 * `calendar-css-parity.spec.ts`.
 */
import React from "react";
import { render } from "@testing-library/react";
import type { CalendarEvent } from "../../src/calendar/calendar.types";
import { Calendar } from "../../src/calendar/Calendar";

function renderCalendar(events: CalendarEvent[]): HTMLElement {
  const { container } = render(
    <Calendar
      year={2024}
      month={3}
      selectedDate={null}
      today="2024-03-15"
      events={events}
    />
  );
  return container;
}

function markers(container: HTMLElement, date: string): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      `button[data-calendar-date="${date}"] .dcf-calendar__marker`
    )
  );
}

function backgroundOf(marker: HTMLElement): string {
  return (marker.style.background || marker.style.backgroundColor || "")
    .replace(/\s/g, "")
    .toLowerCase();
}

describe("Calendar — event marker color (SAA-1995)", () => {
  it("applies an event color as the marker inline background", () => {
    const container = renderCalendar([
      { id: "colored", date: "2024-03-10", title: "Colored", color: "#e11d48" },
    ]);

    const rendered = markers(container, "2024-03-10");
    expect(rendered).toHaveLength(1);
    expect(["#e11d48", "rgb(225,29,72)"]).toContain(backgroundOf(rendered[0]));
  });

  it("keeps the stylesheet default for an event without a color", () => {
    const container = renderCalendar([
      { id: "plain", date: "2024-03-10", title: "Plain" },
    ]);

    const rendered = markers(container, "2024-03-10");
    expect(rendered).toHaveLength(1);
    expect(backgroundOf(rendered[0])).toBe("");
  });

  it("projects each event color independently within one day", () => {
    const container = renderCalendar([
      { id: "red", date: "2024-03-10", title: "Red", color: "#e11d48" },
      { id: "green", date: "2024-03-10", title: "Green", color: "#16a34a" },
    ]);

    const rendered = markers(container, "2024-03-10");
    expect(rendered).toHaveLength(2);
    expect(backgroundOf(rendered[0])).toMatch(/^(#e11d48|rgb\(225,29,72\))$/);
    expect(backgroundOf(rendered[1])).toMatch(/^(#16a34a|rgb\(22,163,74\))$/);
  });
});
