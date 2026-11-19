/**
 * @file Demo page for the `@decaf-ts/for-react/calendar` subpath.
 * @description Exercises {@link Calendar} with host-owned month and selection
 * state, host-owned event markers and page-level i18n, showing that the
 * component itself is prop-driven.
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  Calendar,
  toDateKey,
  type CalendarEvent,
  type CalendarMonthChangeEvent,
  type CalendarSelectionEvent,
} from "../../src/calendar";
import { useCurrentLang, useTranslate } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";

interface Booking {
  reference: string;
}

const COLORS = ["#2563eb", "#0f766e", "#b45309", "#7c3aed"];

/**
 * @description Interactive demo of the controlled calendar component.
 * @summary Resolves the application language and label strings at the page
 * level, passes them to {@link Calendar} as plain props, applies the emitted
 * selection and month requests to its own state, and lists the events of the
 * selected day.
 * @returns {React.ReactElement} The calendar demo page.
 */
export function CalendarPage() {
  const translate = useTranslate();
  const currentLanguage = useCurrentLang();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);

  const events = useMemo<CalendarEvent<Booking>[]>(() => {
    const first = new Date(today.getFullYear(), today.getMonth(), 4);
    const second = new Date(today.getFullYear(), today.getMonth(), 12);
    const busy = new Date(today.getFullYear(), today.getMonth(), 18);
    return [
      {
        id: "booking-1",
        date: toDateKey(first),
        title: translate("calendar.event.site_visit"),
        color: COLORS[0],
        data: { reference: "B-1042" },
      },
      {
        id: "booking-2",
        date: toDateKey(second),
        title: translate("calendar.event.inspection"),
        color: COLORS[1],
        data: { reference: "B-1043" },
      },
      {
        id: "booking-3",
        date: toDateKey(busy),
        title: translate("calendar.event.delivery"),
        color: COLORS[2],
        data: { reference: "B-1044" },
      },
      {
        id: "booking-4",
        date: toDateKey(busy),
        title: translate("calendar.event.training"),
        color: COLORS[3],
        data: { reference: "B-1045" },
      },
      {
        id: "booking-5",
        date: toDateKey(busy),
        title: translate("calendar.event.audit"),
        color: COLORS[0],
        data: { reference: "B-1046" },
      },
      {
        id: "booking-6",
        date: toDateKey(busy),
        title: translate("calendar.event.handover"),
        color: COLORS[1],
        data: { reference: "B-1047" },
      },
    ];
  }, [today, translate]);

  const handleSelection = useCallback((event: CalendarSelectionEvent) => {
    setSelectedDate(event.date);
  }, []);

  const handleMonthChange = useCallback((event: CalendarMonthChangeEvent) => {
    setYear(event.year);
    setMonth(event.month);
  }, []);

  const selectedEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate]
  );

  return (
    <section className="app-page calendar-page" aria-labelledby="calendar-title">
      <CardTitle title="calendar.title" subtitle="calendar.intro" />
      <h2 id="calendar-title" className="app-visually-hidden">
        {translate("calendar.title")}
      </h2>

      <div className="calendar-page__layout">
        <section
          className="calendar-page__panel"
          aria-label={translate("calendar.demo_label")}
        >
          <Calendar
            year={year}
            month={month}
            selectedDate={selectedDate}
            events={events}
            today={todayKey}
            locale={currentLanguage}
            label={translate("calendar.label")}
            previousMonthLabel={translate("calendar.previous_month")}
            nextMonthLabel={translate("calendar.next_month")}
            todayLabel={translate("calendar.today")}
            onDateSelected={handleSelection}
            onMonthChange={handleMonthChange}
          />
        </section>

        <section
          className="calendar-page__panel"
          aria-label={translate("calendar.details_label")}
        >
          <h3>{translate("calendar.details_label")}</h3>
          <dl className="calendar-page__summary">
            <dt>{translate("calendar.month_label")}</dt>
            <dd>
              {translate("calendar.month_value", {
                month: String(month).padStart(2, "0"),
                year: String(year),
              })}
            </dd>
            <dt>{translate("calendar.selected_label")}</dt>
            <dd>
              {selectedDate ?? translate("calendar.no_selection")}
            </dd>
          </dl>

          <h4>{translate("calendar.events_label")}</h4>
          {selectedEvents.length > 0 ? (
            <ul className="calendar-page__events">
              {selectedEvents.map((event) => (
                <li key={event.id}>
                  <span
                    className="calendar-page__event-color"
                    style={{ background: event.color }}
                    aria-hidden="true"
                  />
                  <span>{event.title}</span>
                  <code>{event.data?.reference}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="calendar-page__empty">
              {translate("calendar.no_events")}
            </p>
          )}

          <p className="calendar-page__note">{translate("calendar.note")}</p>
        </section>
      </div>
    </section>
  );
}
