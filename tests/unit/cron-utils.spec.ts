/**
 * @module for-react/cron-utils.spec
 * @summary SAA-1957 — unit coverage for the cron serialization and
 * description helpers backing the React `/cron` port (SAA-1955 / DECAF-895).
 * @description Ports the Angular cron specs' serialization expectations onto
 * the React helpers and covers the locale mapping, semicolon splitting and
 * invalid-input contract:
 *
 * - hourly `0 *\/N * * *`, weekly weekday join (and `*` when empty), daily
 *   `*` day-of-week;
 * - shared-minute collapse (`\${minute} \${hours} * * dow`) versus
 *   semicolon-joined entries when minutes differ;
 * - sorting by hour then minute regardless of input order;
 * - invalid time input raises `InternalError`;
 * - `resolveCronLocale` (pt* -> `pt_BR`, en* -> `en`, other `-` -> `_`) and
 *   `describeCronValue` semicolon split/trim/join.
 */
import { InternalError } from "@decaf-ts/db-decorators";
import {
  CRON_FIELD_KEYS,
  DEFAULT_CRON,
  DEFAULT_FIELD_VALUES,
  DEFAULT_SCHEDULE,
  HOUR_INTERVALS,
  WEEKDAY_OPTIONS,
  buildCronFromFields,
  createTimedCron,
  describeCronValue,
  extractTime,
  fieldsFromCron,
  isModeHidden,
  parseIntervalValue,
  resolveCronLocale,
  scheduleToCron,
  splitTime,
  visibleModes,
} from "../../src/cron/cron-utils";

describe("cron-utils constants", () => {
  it("defines the default cron expression and five field keys in order", () => {
    expect(DEFAULT_CRON).toBe("0 9 * * *");
    expect(CRON_FIELD_KEYS).toEqual([
      "minute",
      "hour",
      "day",
      "month",
      "weekday",
    ]);
    expect(DEFAULT_FIELD_VALUES).toEqual({
      minute: "0",
      hour: "9",
      day: "*",
      month: "*",
      weekday: "*",
    });
  });

  it("defines the default daily schedule, hour intervals and weekday options", () => {
    expect(DEFAULT_SCHEDULE).toEqual({
      mode: "daily",
      time: "09:00",
      times: ["09:00"],
      everyHours: 8,
      weekdays: [1, 2, 3, 4, 5],
    });
    expect(HOUR_INTERVALS).toEqual([2, 4, 6, 8, 12]);
    expect(WEEKDAY_OPTIONS.map((option) => option.value)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });
});

describe("cron-utils time helpers", () => {
  it("extracts an HH:mm time from a longer value", () => {
    expect(extractTime("2024-01-01T09:00:00")).toBe("09:00");
    expect(extractTime("09:00")).toBe("09:00");
  });

  it("throws InternalError for an invalid time value", () => {
    expect(() => extractTime("not-a-time")).toThrow(InternalError);
    expect(() => splitTime("")).toThrow(InternalError);
  });

  it("splits a time into numeric hour and minute", () => {
    expect(splitTime("08:30")).toEqual([8, 30]);
  });
});

describe("cron-utils serialization", () => {
  it("collapses daily times sharing a minute into one expression", () => {
    expect(createTimedCron(["09:00", "21:00"])).toBe("0 9,21 * * *");
  });

  it("sort entries by hour then minute regardless of input order", () => {
    expect(createTimedCron(["10:45", "08:30"])).toBe(
      "30 8 * * *;45 10 * * *"
    );
    expect(createTimedCron(["21:00", "09:00", "12:00"])).toBe(
      "0 9,12,21 * * *"
    );
  });

  it("joins entries with semicolons when minutes differ", () => {
    expect(createTimedCron(["08:00", "20:30"])).toBe(
      "0 8 * * *;30 20 * * *"
    );
  });

  it("serializes hourly schedules as 0 */N * * *", () => {
    expect(
      scheduleToCron({ ...DEFAULT_SCHEDULE, mode: "hourly", everyHours: 6 })
    ).toBe("0 */6 * * *");
  });

  it("serializes daily schedules with an unrestricted day of week", () => {
    expect(
      scheduleToCron({ ...DEFAULT_SCHEDULE, mode: "daily", times: ["09:00"] })
    ).toBe("0 9 * * *");
  });

  it("serializes weekly schedules with the selected weekdays joined", () => {
    expect(
      scheduleToCron({
        ...DEFAULT_SCHEDULE,
        mode: "weekly",
        times: ["08:30"],
        weekdays: [1, 3, 5],
      })
    ).toBe("30 8 * * 1,3,5");
  });

  it("serializes weekly multiple hours sharing a minute into one expression", () => {
    expect(
      scheduleToCron({
        ...DEFAULT_SCHEDULE,
        mode: "weekly",
        times: ["08:30", "20:30"],
        weekdays: [1, 3, 5],
      })
    ).toBe("30 8,20 * * 1,3,5");
  });

  it("joins weekly entries when minutes differ", () => {
    expect(
      scheduleToCron({
        ...DEFAULT_SCHEDULE,
        mode: "weekly",
        times: ["08:30", "10:45"],
        weekdays: [1, 3, 5],
      })
    ).toBe("30 8 * * 1,3,5;45 10 * * 1,3,5");
  });

  it("uses * for the weekday when no weekdays are selected", () => {
    expect(
      scheduleToCron({
        ...DEFAULT_SCHEDULE,
        mode: "weekly",
        times: ["08:30"],
        weekdays: [],
      })
    ).toBe("30 8 * * *");
  });

  it("raises InternalError when a schedule carries an invalid time", () => {
    expect(() =>
      scheduleToCron({ ...DEFAULT_SCHEDULE, times: ["oops"] })
    ).toThrow(InternalError);
  });
});

describe("cron-utils mode visibility", () => {
  it("reports each hidden mode independently", () => {
    expect(isModeHidden("daily", true, false, false)).toBe(true);
    expect(isModeHidden("hourly", false, true, false)).toBe(true);
    expect(isModeHidden("weekly", false, false, true)).toBe(true);
    expect(isModeHidden("weekly", true, true, false)).toBe(false);
  });

  it("returns only the visible modes in canonical order", () => {
    expect(visibleModes(false, false, false)).toEqual([
      "daily",
      "hourly",
      "weekly",
    ]);
    expect(visibleModes(true, true, false)).toEqual(["weekly"]);
    expect(visibleModes(true, false, true)).toEqual(["hourly"]);
  });
});

describe("cron-utils field helpers", () => {
  it("parses an interval value and falls back to 0", () => {
    expect(parseIntervalValue("*/5")).toBe(5);
    expect(parseIntervalValue("5")).toBe(5);
    expect(parseIntervalValue("*")).toBe(0);
    expect(parseIntervalValue("*/0")).toBe(0);
  });

  it("builds a cron expression from fields, defaulting blanks to *", () => {
    expect(
      buildCronFromFields({ ...DEFAULT_FIELD_VALUES, minute: "15", hour: "3" })
    ).toBe("15 3 * * *");
    expect(buildCronFromFields({ ...DEFAULT_FIELD_VALUES, day: "" })).toBe(
      "0 9 * * *"
    );
  });

  it("splits a cron expression into the five fields, padding missing parts", () => {
    expect(fieldsFromCron("0 9 * * *")).toEqual(DEFAULT_FIELD_VALUES);
    expect(fieldsFromCron("*/5 * * * *")).toEqual({
      minute: "*/5",
      hour: "*",
      day: "*",
      month: "*",
      weekday: "*",
    });
    expect(fieldsFromCron("0 9")).toEqual({
      minute: "0",
      hour: "9",
      day: "*",
      month: "*",
      weekday: "*",
    });
  });
});

describe("cron-utils description", () => {
  it("maps pt* to pt_BR, en* to en and other locales dash to underscore", () => {
    expect(resolveCronLocale("pt")).toBe("pt_BR");
    expect(resolveCronLocale("pt-BR")).toBe("pt_BR");
    expect(resolveCronLocale("pt_PT")).toBe("pt_BR");
    expect(resolveCronLocale("en-US")).toBe("en");
    expect(resolveCronLocale("en")).toBe("en");
    expect(resolveCronLocale("fr-CA")).toBe("fr_ca");
    expect(resolveCronLocale("")).toBe("en");
  });

  it("describes an English daily expression", () => {
    expect(describeCronValue("0 9 * * *", "en")).toBe("At 09:00");
  });

  it("describes a Portuguese daily expression through pt_BR", () => {
    expect(describeCronValue("0 9 * * *", "pt-BR")).toBe("Às 09:00");
  });

  it("splits, trims and joins semicolon-separated expressions with '; '", () => {
    expect(
      describeCronValue(
        " 0 9 * * * ;  30 20 * * * ;; ",
        "en-US"
      )
    ).toBe("At 09:00; At 20:30");
  });
});
