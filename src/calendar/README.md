# `@decaf-ts/for-react/calendar`

A small, presentation-only month-grid calendar for embedding in Decaf React
screens. It renders a fixed six-week grid, a single date selection, host-owned
event markers and month navigation. The entry point is built on
`react-day-picker` with `date-fns` for the localized month, weekday and date
labels, and it is the only subpath that loads either library.

The calendar is presentation only. It does not schedule, persist, load or
validate events, and it owns no month or selection state. Timeline scheduling
lives in [`/gantt`](../gantt); `/calendar` only shows what the host supplies.

## Install

```bash
npm install @decaf-ts/for-react react-day-picker date-fns @date-fns/tz
```

`react-day-picker` and `date-fns` are **optional peers** of
`@decaf-ts/for-react` and are **required by this subpath**: install them in
every application that imports `/calendar`; the root entry point never loads
them. `@date-fns/tz` is the package's optional time-zone peer — the calendar
itself imports only `react-day-picker` and `date-fns`, so install it only when
the host uses it directly.

Import the stylesheet next to the component (consumer-wired, like every
for-react subpath):

```ts
import "@decaf-ts/for-react/calendar/styles.css";
```

### Compatibility

| Package | Tested range |
| --- | --- |
| `react` / `react-dom` | `>=18.0.0` |
| `react-day-picker` | `10.0.2` (optional peer, pinned) |
| `date-fns` | `^4.1.0` (optional peer) |
| `@date-fns/tz` | `^1.5.0` (optional peer) |
| `@decaf-ts/for-react` | `0.0.x` |

## Controlled contract

The host owns:

- the rendered `year` and `month`;
- the single `selectedDate`;
- the `events` projected onto dates;
- what happens after a selection or month request.

`onDateSelected` and `onMonthChange` are requests/notifications, never internal
mutations. Advancing the month in the UI requires the host to apply the emitted
`year`/`month` back to the component. This keeps URL state, data loading and
permission policy in the application.

The built-in **Today** button requests the today month and selects the resolved
today in one gesture: an `onMonthChange` event with `direction: "today"`
followed by an `onDateSelected` event, then focus moves to today's cell.

## Usage

```tsx
import { useState } from "react";
import {
  Calendar,
  type CalendarEvent,
  type CalendarMonthChangeEvent,
  type CalendarSelectionEvent,
} from "@decaf-ts/for-react/calendar";

interface Booking {
  reference: string;
}

export function BookingsCalendar() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const events: CalendarEvent<Booking>[] = [
    {
      id: "booking-1",
      date: "2026-10-25",
      title: "Site visit",
      color: "#2563eb",
      data: { reference: "B-1042" },
    },
  ];

  return (
    <Calendar
      year={year}
      month={month}
      selectedDate={selectedDate}
      events={events}
      locale="en-GB"
      label="Bookings"
      previousMonthLabel="Previous month"
      nextMonthLabel="Next month"
      todayLabel="Today"
      onDateSelected={(event: CalendarSelectionEvent) =>
        setSelectedDate(event.date)
      }
      onMonthChange={(event: CalendarMonthChangeEvent) => {
        setYear(event.year);
        setMonth(event.month);
      }}
    />
  );
}
```

The month and selection state are applied from the emitted events — without
those `setState` calls the grid would never move, because the component never
mutates its own view.

## Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `year` | `number` | current year | Calendar year to render. |
| `month` | `number` | current month | Calendar month to render, `1`-based; out-of-range values roll into adjacent years. |
| `selectedDate` | `string \| null` | `null` | Selected local date in `YYYY-MM-DD` form. |
| `events` | `readonly CalendarEvent<T>[]` | `[]` | Events/markers projected onto dates. Invalid dates are ignored. |
| `today` | `string \| null` | host clock | Override for the date marked as today and targeted by the Today button. Use in deterministic hosts/tests. |
| `locale` | `string` | `en-GB` | BCP 47 tag for month, weekday and accessible date labels, mapped to a `date-fns` locale object. |
| `firstDayOfWeek` | `CalendarWeekday` | `1` (Monday) | First grid column (`0` Sunday). |
| `label` | `string` | `Calendar` | Accessible name of the calendar region. |
| `previousMonthLabel` | `string` | `Previous month` | Accessible name of the previous-month button. |
| `nextMonthLabel` | `string` | `Next month` | Accessible name of the next-month button. |
| `todayLabel` | `string` | `Today` | Visible label of the today button. |
| `instanceId` | `string` | — | `id` of the root `<section>` element. |
| `className` | `string` | — | Extra classes for the root `<section>` element. |
| `onDateSelected` | `(event: CalendarSelectionEvent) => void` | — | Selection request. |
| `onMonthChange` | `(event: CalendarMonthChangeEvent) => void` | — | Month-navigation request. |

Every label prop is a plain string with an English default, so the application
resolves translations at the page level and passes the resolved strings down.
When a label prop is omitted, the component renders the English literal in the
table above.

### Callback payloads

| Callback | Payload |
| --- | --- |
| `onDateSelected` | `{ date, previousDate, year, month, day }` |
| `onMonthChange` | `{ year, month, previousYear, previousMonth, direction }` where `direction` is `previous`, `next` or `today` |

The component is exported as `Calendar`, with `CalendarComponent` and
`RgxCalendar` as aliases matching the naming of the other for-react components.

## Dates and events

- Date keys are **local** calendar dates (`YYYY-MM-DD`). They are never parsed
  as UTC instants, so `2026-10-05` stays 5 October in every timezone.
- Invalid keys and `Date` values are rejected; invalid event dates are skipped
  without breaking the grid.
- Event order is preserved. A day shows up to three colour dots
  (`MAX_EVENT_MARKERS`) plus a `+N` overflow counter.
- The grid always has 42 cells (six weeks, `fixedWeeks`), including
  leading/trailing days from adjacent months (`showOutsideDays`). Those cells
  are rendered dimmed and remain selectable.
- `CalendarEvent.id` must be unique within the supplied list; it is used as the
  React key.
- `CalendarEvent` is `{ id, date, title, color?, data? }`: `title` feeds the
  accessible day name, `color` styles the marker dot and `data` carries any
  host payload.

## Pure helpers

The date math is exported for hosts and tests. Helpers accept a `date-fns`
`Locale` object or a BCP 47 string, resolved through `resolveDateFnsLocale`:

| Helper | Purpose |
| --- | --- |
| `toDateKey` / `normalizeDateKey` | Convert a `Date` or value to a local `YYYY-MM-DD` key. |
| `parseDateKey` | Parse a strict local date key; returns `null` when invalid. |
| `normalizeYearMonth` | Roll any year/month pair into the valid `1..12` range. |
| `addDaysToDateKey` | Add/subtract days while staying in local time. |
| `weekdayIndexOf` | Position of a date in its week for a configured first column. |
| `buildMonthGrid` | Build the six-week `CalendarWeek[]` projection. |
| `groupEventsByDate` | Group host events by local date key. |
| `eventMarkers` / `MAX_EVENT_MARKERS` | Split events into visible markers and the `+N` overflow. |
| `formatMonthTitle` / `formatDayLabel` / `weekdayLabels` / `dayAriaLabel` | `date-fns`-backed labels. |

## Locale resolution

- `locale` is prop-driven and defaults to `en-GB`. Hosts that follow the
  surrounding application language resolve the tag themselves and pass it (and
  any translated label props) down, as the demo page does.
- `normalizeCalendarLocaleTag` trims the tag, lowercases it and replaces `_`
  with `-`.
- The tag is matched against the bundled `date-fns` locale table (regional
  English and Portuguese variants, `zh-CN`/`zh-TW` and many other languages);
  an unmatched tag falls back to its base language and finally to `en-GB`.

## Accessibility and keyboard

- The grid is a `role="grid"` table with weekday `columnheader` cells and
  `gridcell` day buttons. The selected cell carries `aria-selected`; today
  carries `aria-current="date"`.
- Roving tabindex: exactly one day is in the tab order — the selected date,
  falling back to today — and the rest are reachable with arrow keys.
  `ArrowLeft`/`ArrowRight` move by a day, `ArrowUp`/`ArrowDown` by a week,
  `Home` and `End` jump to the week edges, `Shift`+arrows and
  `PageUp`/`PageDown` move by month or year. Moving past the grid requests the
  target month through `onMonthChange`.
- Day accessible names are the full localized date plus the day's event titles
  (for example `domingo, 10 de março de 2024: Reunião`).
- The month title is an `aria-live="polite"` heading and names the grid, so
  month changes are announced.
- Visible `:focus-visible` rings, `prefers-reduced-motion` and
  `forced-colors` handling are included, and interactive targets stay at least
  `2.25rem` high.
- Import-time code touches neither `window` nor `document`, and the only DOM
  access (the Today button's focus handoff) is guarded, so the component can be
  server-rendered.

## Packaging and licensing

The subpath is dual ESM + CJS: both `import` and `require` conditions are
published, so `require('@decaf-ts/for-react/calendar')` works in CommonJS hosts
without a dynamic `import()`. The stylesheet is bundled to
`@decaf-ts/for-react/calendar/styles.css` and is the only extra asset.
`react-day-picker`, `date-fns` and `@date-fns/tz` are external optional peers
(MIT-licensed) and are not vendored.
