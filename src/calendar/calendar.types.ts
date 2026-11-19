/**
 * @description Day of the week used as the first column of the month grid.
 * @summary Matches `Date.prototype.getDay()`: `0` is Sunday and `1` is Monday,
 * so the numeric value can be passed straight to the grid helpers.
 * @typedef {number} CalendarWeekday
 * @memberOf module:for-react.calendar
 */
export type CalendarWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * @description Direction of a requested month change.
 * @summary Reported on {@link CalendarMonthChangeEvent} so hosts can tell a
 * previous/next navigation apart from the today shortcut when they decide
 * whether to accept the request.
 * @typedef {string} CalendarMonthDirection
 * @memberOf module:for-react.calendar
 */
export type CalendarMonthDirection = "previous" | "next" | "today";

/**
 * @description Host-owned event or marker projected onto a calendar date.
 * @summary The calendar is presentation only: it renders the supplied events
 * and never creates, edits, persists, or schedules them. Events with an invalid
 * `date` key are ignored by the grid builders, and the host array order is kept
 * within a date.
 * @template T The host payload type carried in {@link CalendarEvent.data}.
 * @interface CalendarEvent
 * @property {string} id - Stable unique identifier of the event within the host
 * list, also used as the React key of its marker.
 * @property {string} date - Local calendar date in `YYYY-MM-DD` form.
 * @property {string} title - Human-readable title used for markers and merged
 * into the accessible day label.
 * @property {string} [color] - Optional CSS color applied to the day marker.
 * @property {T} [data] - Optional host payload carried through untouched.
 * @memberOf module:for-react.calendar
 */
export interface CalendarEvent<T = unknown> {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly color?: string;
  readonly data?: T;
}

/**
 * @description One rendered cell of the month grid.
 * @summary Produced by {@link buildMonthGrid}; a fixed six-week grid always
 * yields forty-two cells, including leading and trailing days from adjacent
 * months, so month navigation never changes the rendered height.
 * @interface CalendarDay
 * @property {string} date - Local calendar date in `YYYY-MM-DD` form.
 * @property {number} year - Calendar year of the cell.
 * @property {number} month - Calendar month of the cell, `1`-based.
 * @property {number} day - Day of the month of the cell.
 * @property {boolean} inMonth - Whether the cell belongs to the rendered month
 * rather than a leading or trailing adjacent-month day.
 * @property {boolean} isToday - Whether the cell matches the resolved today.
 * @property {boolean} isSelected - Whether the cell matches the controlled
 * selected date.
 * @property {CalendarEvent[]} events - Events projected onto the cell,
 * in host order.
 * @memberOf module:for-react.calendar
 */
export interface CalendarDay {
  readonly date: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly inMonth: boolean;
  readonly isToday: boolean;
  readonly isSelected: boolean;
  readonly events: readonly CalendarEvent[];
}

/**
 * @description One row of the month grid.
 * @summary Always seven cells; six rows make up the fixed {@link CalendarDay}
 * grid returned by {@link buildMonthGrid}.
 * @interface CalendarWeek
 * @property {string} key - Stable key for list rendering: the `YYYY-MM-DD` key
 * of the row's first cell.
 * @property {CalendarDay[]} days - The seven cells of the row, in grid
 * column order.
 * @memberOf module:for-react.calendar
 */
export interface CalendarWeek {
  readonly key: string;
  readonly days: readonly CalendarDay[];
}

/**
 * @description Payload emitted when a date cell is activated.
 * @summary Reported through `onDateSelected`; the calendar does not change the
 * selection itself. The host applies the new date by updating `selectedDate`,
 * mirroring the controlled Angular contract.
 * @interface CalendarSelectionEvent
 * @property {string} date - Newly selected local date in `YYYY-MM-DD` form.
 * @property {string|null} previousDate - Previously selected date, or `null`
 * when nothing was selected before.
 * @property {number} year - Calendar year of the selected date.
 * @property {number} month - Calendar month of the selected date, `1`-based.
 * @property {number} day - Day of the month of the selected date.
 * @memberOf module:for-react.calendar
 */
export interface CalendarSelectionEvent {
  readonly date: string;
  readonly previousDate: string | null;
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/**
 * @description Payload emitted when the user requests a different month.
 * @summary Reported through `onMonthChange`; the component is controlled and
 * keeps rendering the incoming `year`/`month` until the host accepts the
 * request. Targets are already normalized, so a previous-month request from
 * January reports December of the prior year.
 * @interface CalendarMonthChangeEvent
 * @property {number} year - Requested calendar year.
 * @property {number} month - Requested calendar month, `1`-based.
 * @property {number} previousYear - Calendar year rendered before the request.
 * @property {number} previousMonth - Calendar month rendered before the
 * request, `1`-based.
 * @property {CalendarMonthDirection} direction - How the request was
 * triggered.
 * @memberOf module:for-react.calendar
 */
export interface CalendarMonthChangeEvent {
  readonly year: number;
  readonly month: number;
  readonly previousYear: number;
  readonly previousMonth: number;
  readonly direction: CalendarMonthDirection;
}

/**
 * @description Options accepted by {@link buildMonthGrid}.
 * @summary Carries the month to render plus the already-normalized projection
 * inputs, so the helper stays free of controlled state and locale concerns.
 * @interface CalendarMonthGridOptions
 * @property {number} year - Calendar year to render.
 * @property {number} month - Calendar month to render, `1`-based.
 * @property {CalendarWeekday} firstDayOfWeek - First column of the grid.
 * @property {string} today - Local date treated as today, in `YYYY-MM-DD` form.
 * @property {string|null} selected - Selected local date in `YYYY-MM-DD` form,
 * or `null` when nothing is selected.
 * @property {CalendarEvent[]} events - Host events projected onto the
 * grid.
 * @memberOf module:for-react.calendar
 */
export interface CalendarMonthGridOptions {
  readonly year: number;
  readonly month: number;
  readonly firstDayOfWeek: CalendarWeekday;
  readonly today: string;
  readonly selected: string | null;
  readonly events: readonly CalendarEvent[];
}

/**
 * @description Short and full label pair of one weekday column.
 * @summary Returned by {@link weekdayLabels} in grid order, already formatted
 * with the resolved date-fns locale.
 * @interface CalendarWeekdayLabel
 * @property {string} short - Abbreviated label rendered in the column header.
 * @property {string} long - Full label available as the column header
 * accessible name.
 * @memberOf module:for-react.calendar
 */
export interface CalendarWeekdayLabel {
  readonly short: string;
  readonly long: string;
}

/**
 * @description Props accepted by {@link Calendar}.
 * @summary Configures the controlled month and selection, the host-owned events
 * and today marker, locale and label overrides, and the change callbacks. Both
 * the month and the selected date are controlled: the component never mutates
 * them internally and only reports requests through `onMonthChange` and
 * `onDateSelected`. Absent `year`/`month` fall back to the current month, an
 * absent `today` falls back to the current date, and `firstDayOfWeek` defaults
 * to Monday (`1`). An omitted `locale` defaults to `en-GB`.
 * @template T The host payload type carried by each {@link CalendarEvent}.
 * @interface CalendarProps
 * @property {number} [year] - Controlled calendar year to render.
 * @property {number} [month] - Controlled 1-based calendar month to render.
 * @property {string|null} [selectedDate] - Controlled selected date in
 * `YYYY-MM-DD` form, or `null` for no selection.
 * @property {CalendarEvent[]} [events=[]] - Host events projected
 * onto the day cells; invalid dates are ignored.
 * @property {string|null} [today] - Local date treated as today in
 * `YYYY-MM-DD` form; defaults to the current date.
 * @property {string} [locale] - BCP 47 locale tag used for month, weekday and
 * day labels; defaults to `en-GB`.
 * @property {CalendarWeekday} [firstDayOfWeek=1] - First column of the month
 * grid.
 * @property {string} [label="Calendar"] - Accessible name of the calendar
 * region.
 * @property {string} [previousMonthLabel] - Accessible label of the previous
 * month button.
 * @property {string} [nextMonthLabel] - Accessible label of the next month
 * button.
 * @property {string} [todayLabel] - Visible and accessible label of the today
 * button.
 * @property {string} [instanceId] - Optional DOM id applied to the root
 * `<section>`.
 * @property {string} [className] - Extra class name appended to the root
 * element.
 * @property {function(CalendarSelectionEvent): void} [onDateSelected] - Called
 * with the requested date; the host must update `selectedDate` to apply it.
 * @property {function(CalendarMonthChangeEvent): void} [onMonthChange] - Called
 * with the normalized requested month; the host must update `year`/`month` to
 * apply it.
 * @memberOf module:for-react.calendar
 * @example
 * ```tsx
 * import { useState } from "react";
 * import { Calendar, type CalendarEvent } from "@decaf-ts/for-react/calendar";
 *
 * export function MonthView({ events }: { events: CalendarEvent[] }) {
 *   const [year, setYear] = useState(2024);
 *   const [month, setMonth] = useState(3);
 *   const [selected, setSelected] = useState<string | null>(null);
 *
 *   return (
 *     <Calendar
 *       year={year}
 *       month={month}
 *       selectedDate={selected}
 *       events={events}
 *       locale="en-GB"
 *       onDateSelected={(event) => setSelected(event.date)}
 *       onMonthChange={(event) => {
 *         setYear(event.year);
 *         setMonth(event.month);
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export interface CalendarProps<T = unknown> {
  year?: number;
  month?: number;
  selectedDate?: string | null;
  events?: readonly CalendarEvent<T>[];
  today?: string | null;
  locale?: string;
  firstDayOfWeek?: CalendarWeekday;
  label?: string;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
  todayLabel?: string;
  instanceId?: string;
  className?: string;
  onDateSelected?: (event: CalendarSelectionEvent) => void;
  onMonthChange?: (event: CalendarMonthChangeEvent) => void;
}
