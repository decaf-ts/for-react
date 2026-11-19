/**
 * @description Public surface of the `@decaf-ts/for-react/calendar` subpath.
 * @summary Re-exports the controlled {@link Calendar} component and its
 * `CalendarComponent`/`RgxCalendar` aliases, the public prop and event types,
 * the pure month-grid and label helpers, and the locale resolution helpers
 * documented under the `calendar` namespace.
 */
export { Calendar, CalendarComponent, RgxCalendar } from "./Calendar.js";
export type {
  CalendarDay,
  CalendarEvent,
  CalendarMonthChangeEvent,
  CalendarMonthDirection,
  CalendarMonthGridOptions,
  CalendarProps,
  CalendarSelectionEvent,
  CalendarWeek,
  CalendarWeekday,
  CalendarWeekdayLabel,
} from "./calendar.types.js";
export {
  MAX_EVENT_MARKERS,
  addDaysToDateKey,
  buildMonthGrid,
  dayAriaLabel,
  eventMarkers,
  formatDayLabel,
  formatMonthTitle,
  groupEventsByDate,
  normalizeDateKey,
  normalizeYearMonth,
  parseDateKey,
  toDateKey,
  weekdayIndexOf,
  weekdayLabels,
} from "./calendar.utils.js";
export {
  normalizeCalendarLocaleTag,
  resolveDateFnsLocale,
} from "./calendar.locales.js";
