import { format, type Locale } from "date-fns";
import type {
  CalendarEvent,
  CalendarMonthGridOptions,
  CalendarWeek,
  CalendarWeekday,
  CalendarWeekdayLabel,
} from "./calendar.types.js";
import { resolveDateFnsLocale } from "./calendar.locales.js";

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const REFERENCE_SUNDAY = new Date(2021, 7, 1);
const DAYS_PER_WEEK = 7;
const WEEKS_PER_GRID = 6;

/**
 * @description Maximum number of event markers rendered inside a day button.
 * @summary {@link eventMarkers} keeps the first `MAX_EVENT_MARKERS` events in
 * host order and reports the remainder as an overflow count, which the calendar
 * renders as a `+N` badge. The full event list is still reflected in the
 * accessible day label, so the cap is visual only.
 * @constant
 * @type {number}
 * @memberOf module:for-react.calendar
 */
export const MAX_EVENT_MARKERS = 3;

function asLocale(locale: Locale | string): Locale {
  return typeof locale === "string" ? resolveDateFnsLocale(locale) : locale;
}

/**
 * @description Formats a `Date` as a local calendar date key (`YYYY-MM-DD`).
 * @summary Reads the local fields deliberately: `toISOString()` would shift the
 * date for hosts east or west of UTC, so a late-evening or early-morning local
 * time still maps to the same calendar day.
 * @param {Date} date - Date to format.
 * @returns {string} The local calendar date in `YYYY-MM-DD` form.
 * @function toDateKey
 * @memberOf module:for-react.calendar
 */
export function toDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * @description Parses a local calendar date key (`YYYY-MM-DD`) without UTC
 * conversion.
 * @summary Accepts only the strict zero-padded form, trims surrounding
 * whitespace, and rejects empty input, malformed keys, and impossible dates
 * such as `2023-02-29` or `2024-04-31`. The returned date is local midnight.
 * @param {string|null|undefined} value - Candidate `YYYY-MM-DD` value.
 * @returns {Date|null} A local `Date` at midnight, or `null` when the value is
 * not a real date.
 * @function parseDateKey
 * @memberOf module:for-react.calendar
 */
export function parseDateKey(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const match = DATE_KEY_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * @description Normalizes a `Date` or date key to a local `YYYY-MM-DD` key.
 * @summary Valid `Date` instances use their local fields, invalid `Date`
 * instances (for example `new Date("not a date")`) and invalid keys return
 * `null`. Empty input returns `null`.
 * @param {Date|string|null|undefined} value - Date, date key, or empty value.
 * @returns {string|null} The normalized key, or `null` for empty or invalid
 * input.
 * @function normalizeDateKey
 * @memberOf module:for-react.calendar
 */
export function normalizeDateKey(
  value: Date | string | null | undefined
): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toDateKey(value);
  }
  const parsed = parseDateKey(value);
  return parsed ? toDateKey(parsed) : null;
}

/**
 * @description Rolls a year/month pair into the valid 1-based month range.
 * @summary Months outside `1..12` roll into adjacent years in both directions,
 * so `month: 0` becomes December of the prior year and `month: 13` becomes
 * January of the next year. Fractional values are truncated; non-finite values
 * fall back to `1`, independently for each argument.
 * @param {number} year - Calendar year, which may be any integer.
 * @param {number} month - Calendar month, `1`-based; values outside `1..12`
 * roll into adjacent years.
 * @returns {{year: number, month: number}} The normalized year and 1-based
 * month.
 * @function normalizeYearMonth
 * @memberOf module:for-react.calendar
 */
export function normalizeYearMonth(
  year: number,
  month: number
): { year: number; month: number } {
  const safeMonth = Number.isFinite(month) ? Math.trunc(month) : 1;
  const safeYear = Number.isFinite(year) ? Math.trunc(year) : 1;
  const totalMonths = safeYear * 12 + (safeMonth - 1);
  const normalizedYear = Math.floor(totalMonths / 12);
  const normalizedMonth = (((totalMonths % 12) + 12) % 12) + 1;
  return { year: normalizedYear, month: normalizedMonth };
}

/**
 * @description Adds a number of days to a local date key.
 * @summary Uses local date arithmetic, so the result crosses month and year
 * boundaries correctly (including leap days) without UTC drift. Negative
 * `days` moves backwards.
 * @param {string} key - Starting `YYYY-MM-DD` key.
 * @param {number} days - Number of days to add; negative values move backwards.
 * @returns {string|null} The resulting local date key, or `null` when `key` is
 * invalid.
 * @function addDaysToDateKey
 * @memberOf module:for-react.calendar
 */
export function addDaysToDateKey(key: string, days: number): string | null {
  const date = parseDateKey(key);
  if (!date) {
    return null;
  }
  return toDateKey(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
  );
}

/**
 * @description Position of a date inside its week for the configured first
 * column.
 * @summary Returns the zero-based column the date occupies when the grid starts
 * on `firstDayOfWeek`, which is what {@link buildMonthGrid} uses to offset the
 * first of the month.
 * @param {string} key - Local date key.
 * @param {CalendarWeekday} firstDayOfWeek - First column of the grid (`0`
 * Sunday, `1` Monday).
 * @returns {number} Index in the range `0..6`, or `-1` when the key is invalid.
 * @function weekdayIndexOf
 * @memberOf module:for-react.calendar
 */
export function weekdayIndexOf(
  key: string,
  firstDayOfWeek: CalendarWeekday
): number {
  const date = parseDateKey(key);
  if (!date) {
    return -1;
  }
  return (date.getDay() - firstDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK;
}

/**
 * @description Groups host events by their local date key, preserving host
 * order.
 * @summary Each event date is normalized with {@link normalizeDateKey}; events
 * whose date is empty or invalid are skipped rather than failing the whole
 * grouping. Within a date, events keep the order they had in the host array.
 * @param {CalendarEvent[]} events - Events to group.
 * @returns {Map<string, CalendarEvent[]>} A map keyed by `YYYY-MM-DD` whose
 * values are the events for that date, in host order.
 * @function groupEventsByDate
 * @memberOf module:for-react.calendar
 */
export function groupEventsByDate(
  events: readonly CalendarEvent[]
): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = normalizeDateKey(event.date);
    if (!key) {
      continue;
    }
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(event);
    } else {
      grouped.set(key, [event]);
    }
  }
  return grouped;
}

/**
 * @description Builds the fixed six-week month grid.
 * @summary Always returns six rows of seven cells (forty-two in total) so month
 * navigation does not change the rendered height. Leading and trailing cells
 * come from adjacent months and carry `inMonth: false`. Each cell is marked for
 * today, the controlled selection, and its grouped events; invalid event dates
 * are ignored.
 * @param {CalendarMonthGridOptions} options - Month, first weekday, selection,
 * today, and host events to project.
 * @returns {CalendarWeek[]} Six rows of seven {@link CalendarDay} cells, each
 * row keyed by the `YYYY-MM-DD` of its first cell.
 * @function buildMonthGrid
 * @memberOf module:for-react.calendar
 */
export function buildMonthGrid(
  options: CalendarMonthGridOptions
): CalendarWeek[] {
  const { year, month, firstDayOfWeek, today, selected, events } = options;
  const firstOfMonth = new Date(year, month - 1, 1);
  const offset =
    (firstOfMonth.getDay() - firstDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const eventsByDate = groupEventsByDate(events);
  const weeks: CalendarWeek[] = [];

  for (let week = 0; week < WEEKS_PER_GRID; week += 1) {
    const days = [];
    for (let column = 0; column < DAYS_PER_WEEK; column += 1) {
      const dayOffset = week * DAYS_PER_WEEK + column - offset;
      const date = new Date(year, month - 1, 1 + dayOffset);
      const key = toDateKey(date);
      days.push({
        date: key,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        inMonth: date.getFullYear() === year && date.getMonth() === month - 1,
        isToday: key === today,
        isSelected: key === selected,
        events: eventsByDate.get(key) ?? [],
      });
    }
    weeks.push({ key: days[0].date, days });
  }

  return weeks;
}

/**
 * @description Formats a month heading in the requested locale.
 * @summary Accepts either a date-fns `Locale` object or a BCP 47 tag; a tag is
 * resolved through {@link resolveDateFnsLocale}, including underscore forms and
 * its fallback locale. If date-fns cannot format the value the helper falls
 * back to a `YYYY-MM` string instead of throwing.
 * @param {number} year - Calendar year.
 * @param {number} month - Calendar month, `1`-based.
 * @param {Locale|string} locale - date-fns `Locale` object or BCP 47 tag used
 * for the month name.
 * @returns {string} The localized month and year heading, or `YYYY-MM` on a
 * formatting failure.
 * @function formatMonthTitle
 * @memberOf module:for-react.calendar
 */
export function formatMonthTitle(
  year: number,
  month: number,
  locale: Locale | string
): string {
  try {
    return format(new Date(year, month - 1, 1), "LLLL yyyy", {
      locale: asLocale(locale),
    });
  } catch {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
}

/**
 * @description Formats a date key as a full localized date for accessible
 * labels.
 * @summary Accepts either a date-fns `Locale` object or a BCP 47 tag resolved
 * through {@link resolveDateFnsLocale}. Returns the raw key unchanged when it
 * cannot be parsed or when date-fns cannot format it, so callers never receive
 * an empty accessible label.
 * @param {string} key - Local date key in `YYYY-MM-DD` form.
 * @param {Locale|string} locale - date-fns `Locale` object or BCP 47 tag used
 * for the labels.
 * @returns {string} The localized full date, or the raw key when it cannot be
 * parsed or formatted.
 * @function formatDayLabel
 * @memberOf module:for-react.calendar
 */
export function formatDayLabel(
  key: string,
  locale: Locale | string
): string {
  const date = parseDateKey(key);
  if (!date) {
    return key;
  }
  try {
    return format(date, "PPPP", { locale: asLocale(locale) });
  } catch {
    return key;
  }
}

/**
 * @description Resolves the seven weekday labels for the configured first
 * column.
 * @summary Pairs the short and long date-fns labels in grid order, starting at
 * `firstDayOfWeek`, so index `0` always matches the first rendered column. The
 * tag form is resolved through {@link resolveDateFnsLocale}; a `Locale` object
 * is used directly.
 * @param {CalendarWeekday} firstDayOfWeek - First column of the grid (`0`
 * Sunday, `1` Monday).
 * @param {Locale|string} locale - date-fns `Locale` object or BCP 47 tag used
 * for the labels.
 * @returns {CalendarWeekdayLabel[]} Seven short and long label pairs in grid
 * order.
 * @function weekdayLabels
 * @memberOf module:for-react.calendar
 */
export function weekdayLabels(
  firstDayOfWeek: CalendarWeekday,
  locale: Locale | string
): CalendarWeekdayLabel[] {
  const resolved = asLocale(locale);
  const labels: CalendarWeekdayLabel[] = [];
  for (let index = 0; index < DAYS_PER_WEEK; index += 1) {
    const date = new Date(
      REFERENCE_SUNDAY.getFullYear(),
      REFERENCE_SUNDAY.getMonth(),
      REFERENCE_SUNDAY.getDate() +
        ((firstDayOfWeek + index) % DAYS_PER_WEEK)
    );
    labels.push({
      short: format(date, "EEE", { locale: resolved }),
      long: format(date, "EEEE", { locale: resolved }),
    });
  }
  return labels;
}

/**
 * @description Builds the accessible label of a day cell.
 * @summary Combines the localized full date from {@link formatDayLabel} with the
 * titles of the day's events, so screen-reader users hear the scheduled items.
 * Blank titles are filtered out, and when no title remains the label is just
 * the date.
 * @param {string} key - Local date key in `YYYY-MM-DD` form.
 * @param {CalendarEvent[]} events - Events projected onto the day.
 * @param {Locale|string} locale - date-fns `Locale` object or BCP 47 tag used
 * for the label.
 * @returns {string} The date label, followed by `: ` and the comma-separated
 * event titles when any are present.
 * @function dayAriaLabel
 * @memberOf module:for-react.calendar
 */
export function dayAriaLabel(
  key: string,
  events: readonly CalendarEvent[],
  locale: Locale | string
): string {
  const label = formatDayLabel(key, locale);
  const titles = events
    .map((event) => event.title)
    .filter((title) => Boolean(title));
  return titles.length ? `${label}: ${titles.join(", ")}` : label;
}

/**
 * @description Splits a day's events into the visible markers and an overflow
 * count.
 * @summary Keeps at most {@link MAX_EVENT_MARKERS} events in host order and
 * reports how many were hidden, which the calendar renders as a `+N` badge. An
 * empty list yields no visible markers and a zero overflow.
 * @param {CalendarEvent[]} events - Events projected onto the day.
 * @returns {{visible: CalendarEvent[], overflow: number}} The markers to render
 * and the number of remaining events.
 * @function eventMarkers
 * @memberOf module:for-react.calendar
 */
export function eventMarkers(events: readonly CalendarEvent[]): {
  visible: readonly CalendarEvent[];
  overflow: number;
} {
  const visible = events.slice(0, MAX_EVENT_MARKERS);
  return { visible, overflow: Math.max(0, events.length - visible.length) };
}
