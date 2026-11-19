import { InternalError } from "@decaf-ts/db-decorators";
import cronstrue from "cronstrue/i18n.js";

/**
 * @description Schedule editing mode of a {@link CronSchedule}.
 * @summary Selects which controls `CronSelector` renders: a single editable time
 * list (`daily`), a fixed-hour interval (`hourly`), or a weekday selection with
 * one or more times (`weekly`).
 * @typedef {string} ScheduleMode
 * @memberOf module:for-react.cron
 */
export type ScheduleMode = "daily" | "hourly" | "weekly";

/**
 * @description A single selectable weekday entry.
 * @summary Pairs a translation key with the cron weekday number it represents.
 * The label is resolved by the host i18n service rather than stored as literal
 * text.
 * @interface WeekdayOption
 * @property {string} label - Translation key of the weekday name, for example
 * `component.cron_selector.weekdays.monday`.
 * @property {number} value - Cron weekday number, `0` (Sunday) through
 * `6` (Saturday).
 * @memberOf module:for-react.cron
 */
export interface WeekdayOption {
  label: string;
  value: number;
}

/**
 * @description Editable schedule model used by `CronSelector`.
 * @summary Captures the mode-specific fields and keeps the values needed to
 * rebuild a cron expression through {@link scheduleToCron}. Only the fields that
 * belong to the active `mode` are read when the expression is generated.
 * @interface CronSchedule
 * @property {ScheduleMode} mode - Active editing mode.
 * @property {string} time - Primary `HH:mm` time of the schedule.
 * @property {string[]} times - Ordered `HH:mm` times rendered in `daily` and
 * `weekly` modes.
 * @property {number} everyHours - Interval in hours used by `hourly` mode;
 * rendered from {@link HOUR_INTERVALS}.
 * @property {number[]} weekdays - Selected cron weekday numbers for `weekly`
 * mode, sorted ascending.
 * @memberOf module:for-react.cron
 */
export interface CronSchedule {
  mode: ScheduleMode;
  time: string;
  times: string[];
  everyHours: number;
  weekdays: number[];
}

/**
 * @description Name of one of the five standard cron fields.
 * @summary Ordering follows the cron expression itself: minute, hour,
 * day-of-month, month, then day-of-week. {@link CRON_FIELD_KEYS} fixes that order
 * for parsing and serialization.
 * @typedef {string} CronFieldKey
 * @memberOf module:for-react.cron
 */
export type CronFieldKey = "minute" | "hour" | "day" | "month" | "weekday";

/**
 * @description Default cron expression used when no value is supplied.
 * @summary Runs every day at 09:00 (`0 9 * * *`). `CronSelector` and
 * `CronBuilder` fall back to this value when the incoming prop is empty.
 * @constant
 * @type {string}
 * @memberOf module:for-react.cron
 */
export const DEFAULT_CRON = "0 9 * * *";

/**
 * @description Default editable schedule used by `CronSelector`.
 * @summary Mirrors {@link DEFAULT_CRON}: daily mode, a single 09:00 entry, an
 * eight-hour interval, and Monday-to-Friday weekdays. Copies are made by the
 * component before mutation, so this object is treated as read-only.
 * @constant
 * @type {CronSchedule}
 * @memberOf module:for-react.cron
 */
export const DEFAULT_SCHEDULE: CronSchedule = {
  mode: "daily",
  time: "09:00",
  times: ["09:00"],
  everyHours: 8,
  weekdays: [1, 2, 3, 4, 5],
};

/**
 * @description Ordered list of the five standard cron field names.
 * @summary Defines the field order used by {@link buildCronFromFields},
 * {@link fieldsFromCron}, and {@link DEFAULT_FIELD_VALUES}. The order matches
 * the positional order of a cron expression.
 * @constant
 * @type {CronFieldKey[]}
 * @memberOf module:for-react.cron
 */
export const CRON_FIELD_KEYS: CronFieldKey[] = [
  "minute",
  "hour",
  "day",
  "month",
  "weekday",
];

/**
 * @description Field values parsed from {@link DEFAULT_CRON}.
 * @summary Maps each {@link CronFieldKey} to its token in the default
 * expression, yielding `minute: "0"`, `hour: "9"`, and `"*"` for the remaining
 * fields. Used to seed `CronBuilder` when the incoming value is not a complete
 * five-field expression.
 * @constant
 * @type {Record<CronFieldKey, string>}
 * @memberOf module:for-react.cron
 */
export const DEFAULT_FIELD_VALUES: Record<CronFieldKey, string> =
  CRON_FIELD_KEYS.reduce(
    (acc, key, index) => ({
      ...acc,
      [key]: DEFAULT_CRON.split(" ")[index],
    }),
    {} as Record<CronFieldKey, string>
  );

/**
 * @description Weekday options rendered by `CronSelector` in `weekly` mode.
 * @summary One {@link WeekdayOption} per day, Sunday (`0`) through Saturday
 * (`6`), each carrying a translation key instead of literal text.
 * @constant
 * @type {WeekdayOption[]}
 * @memberOf module:for-react.cron
 */
export const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { label: "component.cron_selector.weekdays.sunday", value: 0 },
  { label: "component.cron_selector.weekdays.monday", value: 1 },
  { label: "component.cron_selector.weekdays.tuesday", value: 2 },
  { label: "component.cron_selector.weekdays.wednesday", value: 3 },
  { label: "component.cron_selector.weekdays.thursday", value: 4 },
  { label: "component.cron_selector.weekdays.friday", value: 5 },
  { label: "component.cron_selector.weekdays.saturday", value: 6 },
];

/**
 * @description Allowed hour intervals for `hourly` mode.
 * @summary Values offered by the interval selector, in hours. They divide a day
 * evenly so the generated `*&#47;N` expression runs at consistent times.
 * @constant
 * @type {number[]}
 * @memberOf module:for-react.cron
 */
export const HOUR_INTERVALS = [2, 4, 6, 8, 12];

/**
 * @description Extracts an `HH:mm` time from a longer value.
 * @summary Scans the input for the first `HH:mm` pair, which allows ISO
 * datetime strings returned by Ionic's datetime control to be normalized before
 * they reach the schedule model.
 * @param {string} value - Time or datetime string containing an `HH:mm` pair.
 * @returns {string} The normalized `HH:mm` time.
 * @throws {InternalError} When no `HH:mm` pair is present in `value`.
 * @function extractTime
 * @memberOf module:for-react.cron
 * @example
 * extractTime("2026-11-19T09:30:00.000Z"); // "09:30"
 */
export function extractTime(value: string): string {
  const match = value.match(/(\d{2}):(\d{2})/);
  if (!match) {
    throw new InternalError(`Invalid time value: ${value}`);
  }
  return `${match[1]}:${match[2]}`;
}

/**
 * @description Splits an `HH:mm` time into numeric hour and minute values.
 * @summary Normalizes the input through {@link extractTime} first, so datetime
 * strings are accepted. Values are not range-checked beyond numeric conversion.
 * @param {string} time - Time or datetime string containing an `HH:mm` pair.
 * @returns {number[]} Tuple of `[hour, minute]`.
 * @throws {InternalError} When the value has no `HH:mm` pair or the parsed parts
 * are not numbers.
 * @function splitTime
 * @memberOf module:for-react.cron
 * @example
 * splitTime("23:45"); // [23, 45]
 */
export function splitTime(time: string): [number, number] {
  const normalized = extractTime(time);
  const [hour, minute] = normalized.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new InternalError(`Invalid time value: ${time}`);
  }
  return [hour, minute];
}

/**
 * @description Builds the timed portion of a cron expression from times.
 * @summary Sorts the supplied times chronologically and collapses them into a
 * single expression when they share the same minute (`M H1,H2 * * DOW`).
 * Otherwise it returns one expression per time joined with `;`, which the
 * package treats as a multi-schedule value.
 * @param {string[]} times - Times in `HH:mm` (or datetime) form.
 * @param {string} [dayOfWeek="*"] - Cron day-of-week token, such as `1,3,5`.
 * @returns {string} A single cron expression, or `;`-joined expressions when the
 * times do not share one minute.
 * @throws {InternalError} When any time cannot be parsed by {@link splitTime}.
 * @function createTimedCron
 * @memberOf module:for-react.cron
 * @example
 * createTimedCron(["09:00", "17:00"]); // "0 9,17 * * *"
 */
export function createTimedCron(times: string[], dayOfWeek = "*"): string {
  const normalized = times
    .map((time) => splitTime(time))
    .sort(([hourA, minuteA], [hourB, minuteB]) => hourA - hourB || minuteA - minuteB);

  const minutes = new Set(normalized.map(([, minute]) => minute));

  if (minutes.size === 1) {
    const minute = normalized[0][1];
    const hours = normalized.map(([hour]) => hour).join(",");
    return `${minute} ${hours} * * ${dayOfWeek}`;
  }

  return normalized
    .map(([hour, minute]) => `${minute} ${hour} * * ${dayOfWeek}`)
    .join(";");
}

/**
 * @description Serializes a {@link CronSchedule} into a cron expression.
 * @summary Maps `hourly` to `0 *&#47;N * * *`, and delegates `daily` and `weekly`
 * to {@link createTimedCron}; `weekly` passes the selected weekdays as the
 * day-of-week token (or `*` when none are selected).
 * @param {CronSchedule} schedule - Schedule model to serialize.
 * @returns {string} The resulting cron expression, possibly `;`-joined for
 * multiple non-aligned times.
 * @function scheduleToCron
 * @memberOf module:for-react.cron
 * @example
 * scheduleToCron({ mode: "daily", time: "09:00", times: ["09:00"], everyHours: 8, weekdays: [] }); // "0 9 * * *"
 */
export function scheduleToCron(schedule: CronSchedule): string {
  switch (schedule.mode) {
    case "hourly":
      return `0 */${schedule.everyHours} * * *`;
    case "weekly": {
      const days = schedule.weekdays.length ? schedule.weekdays.join(",") : "*";
      return createTimedCron(schedule.times, days);
    }
    case "daily":
    default:
      return createTimedCron(schedule.times);
  }
}

/**
 * @description Reports whether a schedule mode is hidden by the host flags.
 * @summary Each hide flag suppresses exactly one mode: `hideDaily` → `daily`,
 * `hideInterval` → `hourly`, `hideWeekly` → `weekly`.
 * @param {ScheduleMode} mode - Mode to test.
 * @param {boolean} hideDaily - Whether daily mode is hidden.
 * @param {boolean} hideInterval - Whether hourly/interval mode is hidden.
 * @param {boolean} hideWeekly - Whether weekly mode is hidden.
 * @returns {boolean} `true` when the mode is suppressed.
 * @function isModeHidden
 * @memberOf module:for-react.cron
 */
export function isModeHidden(
  mode: ScheduleMode,
  hideDaily: boolean,
  hideInterval: boolean,
  hideWeekly: boolean
): boolean {
  if (mode === "daily") return hideDaily;
  if (mode === "hourly") return hideInterval;
  return hideWeekly;
}

/**
 * @description Lists the schedule modes that remain visible.
 * @summary Filters the full mode list through {@link isModeHidden}, preserving
 * the `daily`, `hourly`, `weekly` order used by the selector segment.
 * @param {boolean} hideDaily - Whether daily mode is hidden.
 * @param {boolean} hideInterval - Whether hourly/interval mode is hidden.
 * @param {boolean} hideWeekly - Whether weekly mode is hidden.
 * @returns {ScheduleMode[]} Visible modes in display order; may be empty.
 * @function visibleModes
 * @memberOf module:for-react.cron
 */
export function visibleModes(
  hideDaily: boolean,
  hideInterval: boolean,
  hideWeekly: boolean
): ScheduleMode[] {
  return (["daily", "hourly", "weekly"] as ScheduleMode[]).filter(
    (mode) => !isModeHidden(mode, hideDaily, hideInterval, hideWeekly)
  );
}

/**
 * @description Parses the numeric part of a cron interval field.
 * @summary Strips the `*&#47;` prefix from values such as `*&#47;5` and converts
 * the remainder; non-numeric input yields `0` rather than throwing.
 * @param {string} field - Cron field value that may carry an interval prefix.
 * @returns {number} The parsed interval, or `0` when the value is not numeric.
 * @function parseIntervalValue
 * @memberOf module:for-react.cron
 * @example
 * parseIntervalValue("*&#47;15"); // 15
 * parseIntervalValue("abc"); // 0
 */
export function parseIntervalValue(field: string): number {
  const numeric = Number(field.replace("*/", ""));
  return Number.isNaN(numeric) ? 0 : numeric;
}

/**
 * @description Assembles a cron expression from per-field values.
 * @summary Emits the five fields in {@link CRON_FIELD_KEYS} order, substituting
 * `*` for any missing or empty field.
 * @param {Record<CronFieldKey, string>} values - Cron field values keyed by
 * {@link CronFieldKey}.
 * @returns {string} A five-field cron expression.
 * @function buildCronFromFields
 * @memberOf module:for-react.cron
 * @example
 * buildCronFromFields({ minute: "0", hour: "9", day: "*", month: "*", weekday: "*" }); // "0 9 * * *"
 */
export function buildCronFromFields(
  values: Record<CronFieldKey, string>
): string {
  return CRON_FIELD_KEYS.map((key) => values[key] || "*").join(" ");
}

/**
 * @description Splits a cron expression into per-field values.
 * @summary Reads the five whitespace-separated tokens in
 * {@link CRON_FIELD_KEYS} order and defaults any missing token to `*`. Only the
 * first five tokens are considered.
 * @param {string} cron - Cron expression to parse.
 * @returns {Record<CronFieldKey, string>} Field values keyed by
 * {@link CronFieldKey}.
 * @function fieldsFromCron
 * @memberOf module:for-react.cron
 * @example
 * fieldsFromCron("0 9 * * 1-5"); // { minute: "0", hour: "9", day: "*", month: "*", weekday: "1-5" }
 */
export function fieldsFromCron(cron: string): Record<CronFieldKey, string> {
  const parts = cron.trim().split(/\s+/);
  return CRON_FIELD_KEYS.reduce(
    (acc, key, index) => ({ ...acc, [key]: parts[index] || "*" }),
    {} as Record<CronFieldKey, string>
  );
}

/**
 * @description Maps an application language to a cronstrue locale.
 * @summary Portuguese maps to `pt_BR` and English to `en`; any other language is
 * lowercased and its first hyphen is replaced with an underscore. Falls back to
 * `en` when `language` is empty.
 * @param {string} language - Application language code, such as `pt-BR`.
 * @returns {string} A cronstrue-compatible locale identifier.
 * @function resolveCronLocale
 * @memberOf module:for-react.cron
 * @example
 * resolveCronLocale("pt-BR"); // "pt_BR"
 * resolveCronLocale("fr-FR"); // "fr_FR"
 */
export function resolveCronLocale(language: string): string {
  const locale = (language || "en").toLowerCase();
  if (locale.startsWith("pt")) {
    return "pt_BR";
  }
  if (locale.startsWith("en")) {
    return "en";
  }
  return locale.replace("-", "_");
}

/**
 * @description Renders a human-readable description of a cron value.
 * @summary Describes each `;`-separated expression with cronstrue in the locale
 * resolved by {@link resolveCronLocale}, using 24-hour time and suppressing parse
 * exceptions, then joins the descriptions with `; `. Blank segments are skipped.
 * @param {string} cron - Cron value, optionally `;`-joined.
 * @param {string} language - Application language code used for the description.
 * @returns {string} A readable description, or an empty string when `cron` has
 * no non-blank segments.
 * @function describeCronValue
 * @memberOf module:for-react.cron
 * @example
 * describeCronValue("0 9 * * *", "en"); // "At 09:00 AM, every day"
 */
export function describeCronValue(cron: string, language: string): string {
  const locale = resolveCronLocale(language);
  return cron
    .split(";")
    .map((expression) => expression.trim())
    .filter(Boolean)
    .map((expression) =>
      cronstrue.toString(expression, {
        locale,
        throwExceptionOnParseError: false,
        use24HourTimeFormat: true,
      })
    )
    .join("; ");
}
