import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { format, type Locale } from "date-fns";
import {
  DayFlag,
  DayPicker,
  SelectionState,
  UI,
  type ClassNames,
  type CustomComponents,
  type DayButtonProps,
  type DayProps,
  type Formatters,
  type WeekdayProps,
  type WeekdaysProps,
  type WeekProps,
} from "react-day-picker";
import { resolveDateFnsLocale } from "./calendar.locales.js";
import type {
  CalendarEvent,
  CalendarMonthDirection,
  CalendarProps,
} from "./calendar.types.js";
import {
  buildMonthGrid,
  eventMarkers,
  formatDayLabel,
  formatMonthTitle,
  groupEventsByDate,
  normalizeDateKey,
  normalizeYearMonth,
  parseDateKey,
  toDateKey,
} from "./calendar.utils.js";

const CLASS_NAMES: Partial<ClassNames> = {
  [UI.Root]: "dcf-calendar__picker",
  [UI.Months]: "dcf-calendar__months",
  [UI.Month]: "dcf-calendar__grid",
  [UI.MonthGrid]: "dcf-calendar__table",
  [UI.Weekdays]: "dcf-calendar__row dcf-calendar__weekdays",
  [UI.Weekday]: "dcf-calendar__weekday",
  [UI.Weeks]: "dcf-calendar__weeks",
  [UI.Week]: "dcf-calendar__row dcf-calendar__week",
  [UI.Day]: "dcf-calendar__day",
  [UI.DayButton]: "dcf-calendar__day-button",
  [DayFlag.outside]: "dcf-calendar__day--outside",
  [DayFlag.today]: "dcf-calendar__day--today",
  [DayFlag.disabled]: "dcf-calendar__day--disabled",
  [DayFlag.hidden]: "dcf-calendar__day--hidden",
  [DayFlag.focused]: "dcf-calendar__day--focused",
  [SelectionState.selected]: "dcf-calendar__day--selected",
};

interface CalendarCellContextValue {
  readonly eventsByDate: Map<string, CalendarEvent[]>;
  readonly locale: Locale;
  readonly tabbableDate: string | null;
}

const CalendarCellContext = createContext<CalendarCellContextValue>({
  eventsByDate: new Map(),
  locale: resolveDateFnsLocale("en-GB"),
  tabbableDate: null,
});

function CalendarWeekdays(props: WeekdaysProps): React.ReactElement {
  return (
    <thead>
      <tr {...props} role="row" />
    </thead>
  );
}

function CalendarWeek(props: WeekProps): React.ReactElement {
  const { week, ...rest } = props;
  return <tr {...rest} role="row" />;
}

function CalendarWeekday(props: WeekdayProps): React.ReactElement {
  return <th {...props} role="columnheader" />;
}

function CalendarEmpty(): React.ReactElement {
  return <></>;
}

function CalendarDay(props: DayProps): React.ReactElement {
  const { day, modifiers, ...rest } = props;
  return (
    <td
      {...rest}
      aria-current={modifiers.today ? "date" : undefined}
      data-calendar-date={day.isoDate}
    />
  );
}

function CalendarDayButton(props: DayButtonProps): React.ReactElement {
  const { day, modifiers, children, className, ...rest } = props;
  const { eventsByDate, locale, tabbableDate } = useContext(
    CalendarCellContext
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dayEvents = eventsByDate.get(day.isoDate) ?? [];
  const markers = eventMarkers(dayEvents);
  const titles = dayEvents
    .map((event) => event.title)
    .filter((title) => Boolean(title));
  const dayLabel = formatDayLabel(day.isoDate, locale);
  const joinedTitles = titles.join(", ");
  const ariaLabel = joinedTitles ? `${dayLabel}: ${joinedTitles}` : dayLabel;

  useEffect(() => {
    if (modifiers.focused) {
      buttonRef.current?.focus();
    }
  }, [modifiers.focused]);

  return (
    <button
      {...rest}
      ref={buttonRef}
      type="button"
      className={["dcf-calendar__day-button", className]
        .filter(Boolean)
        .join(" ")}
      tabIndex={day.isoDate === tabbableDate ? 0 : -1}
      aria-label={ariaLabel}
      data-calendar-date={day.isoDate}
    >
      <span className="dcf-calendar__day-number">{children}</span>
      {dayEvents.length > 0 ? (
        <span className="dcf-calendar__markers" aria-hidden="true">
          {markers.visible.map((event) => (
            <span
              key={event.id}
              className="dcf-calendar__marker"
              style={event.color ? { background: event.color } : undefined}
            />
          ))}
          {markers.overflow > 0 ? (
            <span className="dcf-calendar__marker-more">
              +{markers.overflow}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}

const CALENDAR_COMPONENTS: Partial<CustomComponents> = {
  Day: CalendarDay,
  DayButton: CalendarDayButton,
  Weekdays: CalendarWeekdays,
  Week: CalendarWeek,
  Weekday: CalendarWeekday,
  MonthCaption: CalendarEmpty,
  Nav: CalendarEmpty,
};

/**
 * @description Accessible, controlled month-grid calendar built on
 * react-day-picker.
 * @summary Renders a fixed six-week grid inside a labelled `<section>`, with a
 * header that exposes previous/next navigation and a today shortcut. The month
 * and the selected date are fully controlled: the component never mutates them
 * and only reports requests through `onMonthChange` and `onDateSelected`, so
 * the host decides whether to apply them. Locale is prop-driven: it defaults to
 * `en-GB` when the `locale` prop is omitted and is resolved to a date-fns
 * locale; labels are plain-string props with English defaults, so hosts wire
 * i18n at the page level. Events are projected as up to three colored markers
 * plus a `+N` overflow badge, while the full event list is merged into each
 * day's `aria-label`. Today carries `aria-current="date"`, exactly one day sits
 * in the tab order, and react-day-picker provides arrow/Home/End keyboard
 * navigation and cross-month month-change requests.
 * @template T The host payload type carried by each {@link CalendarEvent}.
 * @param {CalendarProps<T>} props - Controlled month and selection, host events
 * and today, locale and label overrides, and change callbacks.
 * @returns {React.ReactElement} The calendar region.
 * @function Calendar
 * @memberOf module:for-react.calendar
 * @example
 * ```tsx
 * import { useState } from "react";
 * import { Calendar, type CalendarEvent } from "@decaf-ts/for-react/calendar";
 *
 * export function Agenda({ events }: { events: CalendarEvent[] }) {
 *   const [year, setYear] = useState(2024);
 *   const [month, setMonth] = useState(3);
 *   const [selected, setSelected] = useState<string | null>("2024-03-15");
 *
 *   return (
 *     <Calendar
 *       year={year}
 *       month={month}
 *       selectedDate={selected}
 *       today="2024-03-15"
 *       events={events}
 *       firstDayOfWeek={1}
 *       onDateSelected={(event) => setSelected(event.date)}
 *       onMonthChange={(event) => {
 *         setYear(event.year);
 *         setMonth(event.month);
 *       }}
 *     />
 *   );
 * }
 * ```
 * @mermaid
 * %%{init: {"theme": "base", "themeVariables": {"actorBkg": "#E8F1FB", "actorBorder": "#5B8DEF", "signalColor": "#34507A"}}}%%
 * sequenceDiagram
 *   autonumber
 *   participant Host as Parent component
 *   participant Calendar as Calendar
 *   participant Locale as resolveDateFnsLocale
 *   participant Picker as react-day-picker
 *   Host->>Calendar: render with year, month, selection and events
 *   activate Calendar
 *   Calendar->>Locale: resolve locale prop (default en-GB)
 *   activate Locale
 *   Locale-->>Calendar: date-fns Locale
 *   deactivate Locale
 *   Calendar->>Picker: render fixed six-week grid and markers
 *   activate Picker
 *   Picker-->>Calendar: day cells and day buttons
 *   deactivate Picker
 *   Calendar-->>Host: labelled calendar region
 *   deactivate Calendar
 *   Picker->>Calendar: user selects a day
 *   activate Calendar
 *   Calendar->>Host: onDateSelected (date, previousDate, fields)
 *   deactivate Calendar
 *   Picker->>Calendar: user navigates months or presses Today
 *   activate Calendar
 *   Calendar->>Host: onMonthChange (normalized target and direction)
 *   deactivate Calendar
 */
export function Calendar<T = unknown>(
  props: CalendarProps<T>
): React.ReactElement {
  const {
    year,
    month,
    selectedDate,
    events = [],
    today,
    locale = "en-GB",
    firstDayOfWeek = 1,
    instanceId,
    className,
    label,
    previousMonthLabel,
    nextMonthLabel,
    todayLabel,
    onDateSelected,
    onMonthChange,
  } = props;

  const localeObject = useMemo(
    () => resolveDateFnsLocale(locale),
    [locale]
  );

  const sectionLabel = label ?? "Calendar";
  const previousLabel = previousMonthLabel ?? "Previous month";
  const nextLabel = nextMonthLabel ?? "Next month";
  const todayButtonLabel = todayLabel ?? "Today";

  const now = useMemo(() => new Date(), []);
  const view = useMemo(
    () =>
      normalizeYearMonth(
        Number.isFinite(year) ? (year as number) : now.getFullYear(),
        Number.isFinite(month) ? (month as number) : now.getMonth() + 1
      ),
    [year, month, now]
  );

  const selectedKey = normalizeDateKey(selectedDate);
  const todayKey = normalizeDateKey(today) ?? toDateKey(now);
  const [focusDate, setFocusDate] = useState<string | null>(null);

  const monthDate = useMemo(
    () => new Date(view.year, view.month - 1, 1),
    [view.year, view.month]
  );
  const todayDate = useMemo(
    () => parseDateKey(todayKey) ?? new Date(),
    [todayKey]
  );
  const selectedDateObject = useMemo(
    () => (selectedKey ? parseDateKey(selectedKey) ?? undefined : undefined),
    [selectedKey]
  );

  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const monthTitle = useMemo(
    () => formatMonthTitle(view.year, view.month, localeObject),
    [view.year, view.month, localeObject]
  );

  const grid = useMemo(
    () =>
      buildMonthGrid({
        year: view.year,
        month: view.month,
        firstDayOfWeek,
        today: todayKey,
        selected: selectedKey,
        events,
      }),
    [view.year, view.month, firstDayOfWeek, todayKey, selectedKey, events]
  );

  const gridDates = useMemo(
    () => new Set(grid.flatMap((week) => week.days.map((day) => day.date))),
    [grid]
  );

  const tabbableDate = useMemo(() => {
    if (focusDate && gridDates.has(focusDate)) {
      return focusDate;
    }
    if (selectedKey && gridDates.has(selectedKey)) {
      return selectedKey;
    }
    if (gridDates.has(todayKey)) {
      return todayKey;
    }
    return (
      grid.flatMap((week) => week.days).find((day) => day.inMonth)?.date ??
      null
    );
  }, [focusDate, grid, gridDates, selectedKey, todayKey]);

  const emitMonthChange = useCallback(
    (
      targetYear: number,
      targetMonth: number,
      direction: CalendarMonthDirection
    ) => {
      const target = normalizeYearMonth(targetYear, targetMonth);
      onMonthChange?.({
        year: target.year,
        month: target.month,
        previousYear: view.year,
        previousMonth: view.month,
        direction,
      });
    },
    [onMonthChange, view.year, view.month]
  );

  const emitSelection = useCallback(
    (key: string) => {
      const date = parseDateKey(key);
      if (!date) {
        return;
      }
      onDateSelected?.({
        date: key,
        previousDate: selectedKey,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
      });
    },
    [onDateSelected, selectedKey]
  );

  const handleSelect = useCallback(
    (_selected: Date | undefined, triggerDate: Date) => {
      const key = toDateKey(triggerDate);
      setFocusDate(key);
      emitSelection(key);
    },
    [emitSelection]
  );

  const handleDayFocus = useCallback((date: Date) => {
    setFocusDate(toDateKey(date));
  }, []);

  const handleMonthChange = useCallback(
    (nextMonth: Date) => {
      const targetYear = nextMonth.getFullYear();
      const targetMonth = nextMonth.getMonth() + 1;
      const direction: CalendarMonthDirection =
        targetYear < view.year ||
        (targetYear === view.year && targetMonth < view.month)
          ? "previous"
          : "next";
      emitMonthChange(targetYear, targetMonth, direction);
    },
    [emitMonthChange, view.year, view.month]
  );

  const requestPreviousMonth = useCallback(() => {
    emitMonthChange(view.year, view.month - 1, "previous");
  }, [emitMonthChange, view.year, view.month]);

  const requestNextMonth = useCallback(() => {
    emitMonthChange(view.year, view.month + 1, "next");
  }, [emitMonthChange, view.year, view.month]);

  const sectionRef = useRef<HTMLElement>(null);

  const goToToday = useCallback(() => {
    const date = parseDateKey(todayKey);
    if (!date) {
      return;
    }
    setFocusDate(todayKey);
    emitMonthChange(date.getFullYear(), date.getMonth() + 1, "today");
    emitSelection(todayKey);
  }, [emitMonthChange, emitSelection, todayKey]);

  useEffect(() => {
    if (!focusDate || !sectionRef.current) {
      return;
    }
    sectionRef.current
      .querySelector<HTMLElement>(`[data-calendar-date="${focusDate}"]`)
      ?.focus();
  }, [focusDate, view.year, view.month]);

  const formatters = useMemo<Partial<Formatters>>(
    () => ({
      formatWeekdayName: (weekday: Date) =>
        format(weekday, "EEE", { locale: localeObject }),
    }),
    [localeObject]
  );

  const cellContext = useMemo<CalendarCellContextValue>(
    () => ({ eventsByDate, locale: localeObject, tabbableDate }),
    [eventsByDate, localeObject, tabbableDate]
  );

  const labels = useMemo(
    () => ({ labelGrid: () => monthTitle }),
    [monthTitle]
  );

  return (
    <section
      ref={sectionRef}
      id={instanceId || undefined}
      className={["dcf-calendar", className].filter(Boolean).join(" ")}
      aria-label={sectionLabel}
    >
      <header className="dcf-calendar__header">
        <button
          type="button"
          className="dcf-calendar__nav"
          data-calendar-nav="previous"
          aria-label={previousLabel}
          onClick={requestPreviousMonth}
        >
          <svg
            className="dcf-calendar__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M15 18l-6-6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <h2 className="dcf-calendar__title" aria-live="polite">
          {monthTitle}
        </h2>

        <button
          type="button"
          className="dcf-calendar__nav"
          data-calendar-nav="next"
          aria-label={nextLabel}
          onClick={requestNextMonth}
        >
          <svg
            className="dcf-calendar__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M9 18l6-6-6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          type="button"
          className="dcf-calendar__today"
          data-calendar-nav="today"
          onClick={goToToday}
        >
          {todayButtonLabel}
        </button>
      </header>

      <CalendarCellContext.Provider value={cellContext}>
        <DayPicker
          mode="single"
          selected={selectedDateObject}
          onSelect={handleSelect}
          month={monthDate}
          onMonthChange={handleMonthChange}
          onDayFocus={handleDayFocus}
          today={todayDate}
          locale={localeObject}
          weekStartsOn={firstDayOfWeek}
          fixedWeeks
          showOutsideDays
          hideNavigation
          components={CALENDAR_COMPONENTS}
          classNames={CLASS_NAMES}
          formatters={formatters}
          labels={labels}
          aria-label={monthTitle}
          className="dcf-calendar__picker"
        />
      </CalendarCellContext.Provider>
    </section>
  );
}

/**
 * @description Alias of {@link Calendar} kept for callers porting Angular
 * component names to the React package.
 * @summary Behaves exactly like {@link Calendar}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {React.FunctionComponent<CalendarProps>}
 * @memberOf module:for-react.calendar
 */
export const CalendarComponent = Calendar;

/**
 * @description Alias of {@link Calendar} following the `Rgx*` naming convention
 * of the main for-react UI kit.
 * @summary Behaves exactly like {@link Calendar}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {React.FunctionComponent<CalendarProps>}
 * @memberOf module:for-react.calendar
 */
export const RgxCalendar = Calendar;
