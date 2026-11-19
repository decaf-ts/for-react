import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import {
  CRON_FIELD_KEYS,
  CronFieldKey,
  DEFAULT_CRON,
  DEFAULT_FIELD_VALUES,
  buildCronFromFields,
  describeCronValue,
  fieldsFromCron,
  parseIntervalValue,
} from "./cron-utils.js";
import { useCurrentLang, useTranslate } from "../lib/services/RgxContext.js";
import type { CronSelectorFormControlLike } from "./CronSelector.js";

/**
 * @description Props accepted by {@link CronBuilder}.
 * @summary Configures the incoming cron value, the visible quick presets and
 * raw fields, whether a readable description is shown, multi-schedule support,
 * and how changes are reported. The component is uncontrolled after mount
 * except for `value` and `cron`, which are adopted when they change.
 * @interface CronBuilderProps
 * @property {string} [value] - Controlled cron value; takes precedence over
 * `cron` and is adopted when it changes.
 * @property {string} [cron] - Fallback controlled cron value used when `value`
 * is absent.
 * @property {string} [label=""] - Field label rendered in read-only mode and by
 * `CronSelectorField`.
 * @property {boolean} [isReadOnlyOperation=false] - Renders the value as static
 * text instead of an editor.
 * @property {CronFieldKey[]} [fields=CRON_FIELD_KEYS] - Cron fields to render as
 * quick presets and raw inputs, in order.
 * @property {boolean} [describeCron=true] - Renders a cronstrue description of
 * the current expression.
 * @property {boolean} [disabled=false] - Disables every control and suppresses
 * change emission.
 * @property {boolean} [hideDaily=false] - Hides the daily quick preset.
 * @property {boolean} [hideInterval=false] - Hides the minutes and hour interval
 * presets.
 * @property {boolean} [hideWeekly=false] - Hides the weekday quick preset.
 * @property {boolean} [multiple=false] - Enables accumulating several cron
 * expressions, joined with `;`.
 * @property {CronSelectorFormControlLike} [formControl] - Optional form control
 * that receives the generated cron through `setValue`.
 * @property {string} [className] - Extra class name applied to the root element.
 * @property {function(string): void} [onChange] - Called with the generated cron
 * value after each edit.
 * @property {function(string): void} [onValueChange] - Called alongside
 * `onChange` with the same cron value.
 * @property {function(string): void} [changeEvent] - Additional change
 * callback invoked with the same cron value.
 * @memberOf module:for-react.cron
 */
export interface CronBuilderProps {
  value?: string;
  cron?: string;
  label?: string;
  isReadOnlyOperation?: boolean;
  fields?: CronFieldKey[];
  describeCron?: boolean;
  disabled?: boolean;
  hideDaily?: boolean;
  hideInterval?: boolean;
  hideWeekly?: boolean;
  multiple?: boolean;
  formControl?: CronSelectorFormControlLike;
  className?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  changeEvent?: (value: string) => void;
}

/**
 * @description Imperative handle exposed through a React `ref` on
 * {@link CronBuilder}.
 * @summary Drives the field model, presets, multi-schedule accumulation, and
 * description without depending on the rendered controls. Mutating helpers go
 * through the same commit path as the UI, so they emit `onChange`,
 * `onValueChange`, `changeEvent`, and form-control updates, and are no-ops while
 * the component is disabled.
 * @interface CronBuilderHandle
 * @property {function(CronFieldKey): string} getFieldValue - Returns the current
 * value of one cron field.
 * @property {function(CronFieldKey, string): void} setFieldValue - Writes one
 * cron field; blank input becomes `*`.
 * @property {function(CronFieldKey): boolean} isEvery - Reports whether the
 * minute or hour field is in interval (`*&#47;N`) mode.
 * @property {function(CronFieldKey): void} toggleEvery - Toggles interval mode
 * for the minute or hour field; non-numeric or zero values turn it off.
 * @property {function(CronFieldKey, boolean, string): void} patchValue - Writes
 * a field, applying or removing the `*&#47;` prefix according to `every`.
 * @property {function(string, boolean): void} incrementTime - Increments the
 * hour or minute field, clamped at `23` or `59`.
 * @property {function(string, boolean): void} decrementTime - Decrements the
 * hour or minute field, clamped at `*`.
 * @property {function(string[], string, Object): void} handleSelectionPreset -
 * Maps a multi-select weekday or month selection to a cron field value.
 * @property {function(number): void} applyEveryMinutes - Applies an every-N-minute
 * preset across all fields.
 * @property {function(number): void} applyDailyAt - Applies a daily-at-hour
 * preset.
 * @property {function(): void} applyMonthly - Applies the monthly preset (day 1
 * at 00:00).
 * @property {function(string[]): void} applyPresetWeekdays - Applies the weekday
 * preset for the given days, or all days when the list is full or empty.
 * @property {function(number): void} togglePresetWeekday - Adds or removes a
 * weekday from the preset selection and applies it.
 * @property {function(): void} toggleAllWeekdays - Reapplies the weekday preset
 * for the current selection.
 * @property {function(string): boolean} isPresetWeekdaySelected - Reports whether
 * a weekday, or `all`, is selected in the preset.
 * @property {function(): Array<string>} weekdaySelectValue - Returns the values
 * for the weekday multi-select, including `all` when every day is selected.
 * @property {function(): void} addAnother - Accumulates the current expression
 * and resets the fields; only effective in `multiple` mode.
 * @property {function(number): void} removeAccumulated - Removes an accumulated
 * expression at `index`.
 * @property {function(): string} currentCron - Returns the cron expression for
 * the current field values.
 * @property {function(string): string} describeAccumulatedCron - Describes one
 * accumulated expression, returning it unchanged when description fails.
 * @property {function(string): boolean} isPresetHidden - Reports whether a quick
 * preset is hidden by the hide flags.
 * @property {function(): string} getValue - Returns the current cron value,
 * including any accumulated expressions.
 * @property {function(): string} getDisplayedSchedule - Returns the described
 * schedule, or the raw value when description is disabled or fails.
 * @property {function(): string[]} getAccumulatedCrons - Returns the accumulated
 * cron expressions.
 * @property {function(): number} getEveryMinutesValue - Returns the every-N-minute
 * preset value.
 * @property {function(): number} getDailyAtHourValue - Returns the daily-at-hour
 * preset value.
 * @memberOf module:for-react.cron
 */
export interface CronBuilderHandle {
  getFieldValue(key: CronFieldKey): string;
  setFieldValue(key: CronFieldKey, value: string): void;
  isEvery(key: CronFieldKey): boolean;
  toggleEvery(key: CronFieldKey): void;
  patchValue(key: CronFieldKey, every: boolean, value: string): void;
  incrementTime(key: "hour" | "minute", every?: boolean): void;
  decrementTime(key: "hour" | "minute", every?: boolean): void;
  handleSelectionPreset(
    value: string[],
    key: "weekday" | "month",
    element?: { value?: unknown } | null
  ): void;
  applyEveryMinutes(minutes: number): void;
  applyDailyAt(hour: number): void;
  applyMonthly(): void;
  applyPresetWeekdays(days?: string[]): void;
  togglePresetWeekday(day: number): void;
  toggleAllWeekdays(): void;
  isPresetWeekdaySelected(day: string | "all"): boolean;
  weekdaySelectValue(): (string | "all")[];
  addAnother(): void;
  removeAccumulated(index: number): void;
  currentCron(): string;
  describeAccumulatedCron(cron: string): string;
  isPresetHidden(preset: string): boolean;
  getValue(): string;
  getDisplayedSchedule(): string;
  getAccumulatedCrons(): string[];
  getEveryMinutesValue(): number;
  getDailyAtHourValue(): number;
}

/**
 * @description Weekday options offered by the `weekday` quick preset.
 * @summary One entry per cron weekday, Sunday (`"0"`) through Saturday (`"6"`),
 * each pairing a translation key with the string value used by the Ionic
 * multi-select.
 * @constant
 * @type {Object[]}
 * @memberOf module:for-react.cron
 */
const WEEKDAY_SELECT_OPTIONS = [
  { text: "date.weekdays.sunday", value: "0" },
  { text: "date.weekdays.monday", value: "1" },
  { text: "date.weekdays.tuesday", value: "2" },
  { text: "date.weekdays.wednesday", value: "3" },
  { text: "date.weekdays.thursday", value: "4" },
  { text: "date.weekdays.friday", value: "5" },
  { text: "date.weekdays.saturday", value: "6" },
];

/**
 * @description Month options offered by the `month` quick preset.
 * @summary One entry per month, January (`"1"`) through December (`"12"`), each
 * pairing a translation key with the cron month value.
 * @constant
 * @type {Object[]}
 * @memberOf module:for-react.cron
 */
const MONTH_SELECT_OPTIONS = [
  { text: "date.months.january", value: "1" },
  { text: "date.months.february", value: "2" },
  { text: "date.months.march", value: "3" },
  { text: "date.months.april", value: "4" },
  { text: "date.months.may", value: "5" },
  { text: "date.months.june", value: "6" },
  { text: "date.months.july", value: "7" },
  { text: "date.months.august", value: "8" },
  { text: "date.months.september", value: "9" },
  { text: "date.months.october", value: "10" },
  { text: "date.months.november", value: "11" },
  { text: "date.months.december", value: "12" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index));

function cloneFieldValues(
  values: Record<CronFieldKey, string>
): Record<CronFieldKey, string> {
  return { ...values };
}

function splitInitialValue(
  rawValue: string,
  multiple: boolean
): { fields: Record<CronFieldKey, string>; accumulated: string[] } {
  const raw = (rawValue || DEFAULT_CRON).trim();
  const segments = multiple
    ? raw
        .split(";")
        .map((segment) => segment.trim())
        .filter(Boolean)
    : [raw];
  const last = segments.pop() || DEFAULT_CRON;
  const parts = last.split(/\s+/);
  const fields =
    parts.length === 5
      ? fieldsFromCron(last)
      : cloneFieldValues(DEFAULT_FIELD_VALUES);
  return { fields, accumulated: segments };
}

/**
 * @description Raw cron-expression editor with quick presets and multi-schedule
 * support.
 * @summary Keeps a per-field model alongside a set of quick presets (every N
 * minutes, daily at an hour, monthly, weekday selection), renders the five field
 * inputs, and serializes the result with {@link buildCronFromFields}. When
 * `multiple` is enabled the component accumulates several expressions and joins
 * them with `;`. Changes are published through `onChange`, `onValueChange`,
 * `changeEvent`, and the optional form control, and a cronstrue description is
 * shown when `describeCron` is enabled. In read-only mode it renders the value
 * as static text. It exposes {@link CronBuilderHandle} through a React `ref`.
 * @param {CronBuilderProps} props - Incoming value, visible presets and fields,
 * read-only/disabled flags, multiple mode, form control, and change callbacks.
 * @param {React.Ref<CronBuilderHandle>} ref - Optional ref that receives the
 * imperative field, preset, and value helpers.
 * @returns {React.ReactElement} The builder region.
 * @function CronBuilder
 * @memberOf module:for-react.cron
 * @example
 * ```tsx
 * import { useRef } from "react";
 * import { CronBuilder, type CronBuilderHandle } from "@decaf-ts/for-react/cron";
 *
 * export function CronEditor() {
 *   const builderRef = useRef<CronBuilderHandle>(null);
 *
 *   return (
 *     <CronBuilder
 *       ref={builderRef}
 *       cron="0 9 * * 1-5"
 *       multiple
 *       onChange={(cron) => console.log(cron)}
 *     />
 *   );
 * }
 * ```
 */
export const CronBuilder = forwardRef<CronBuilderHandle, CronBuilderProps>(
  function CronBuilder(
    {
      value,
      cron,
      label = "",
      isReadOnlyOperation = false,
      fields = CRON_FIELD_KEYS,
      describeCron = true,
      disabled = false,
      hideDaily = false,
      hideInterval = false,
      hideWeekly = false,
      multiple = false,
      formControl,
      className,
      onChange,
      onValueChange,
      changeEvent,
    },
    ref
  ) {
    const translate = useTranslate();
    const language = useCurrentLang();

    const initialRaw = value ?? cron ?? DEFAULT_CRON;
    const initial = splitInitialValue(initialRaw, multiple);

    const [fieldValues, setFieldValues] = useState<Record<CronFieldKey, string>>(
      () => cloneFieldValues(initial.fields)
    );
    const [accumulatedCrons, setAccumulatedCrons] = useState<string[]>(
      () => [...initial.accumulated]
    );
    const [everyState, setEveryState] = useState<Record<"minute" | "hour", boolean>>(
      () => ({ minute: false, hour: false })
    );
    const [everyMinutesValue, setEveryMinutesValue] = useState(
      parseIntervalValue(DEFAULT_FIELD_VALUES.minute)
    );
    const [dailyAtHourValue, setDailyAtHourValue] = useState(
      parseIntervalValue(DEFAULT_FIELD_VALUES.hour)
    );
    const [presetWeekdays, setPresetWeekdays] = useState<string[]>([]);
    const [internalValue, setInternalValue] = useState(initialRaw);
    const [displayedSchedule, setDisplayedSchedule] = useState(initialRaw);
    const [copied, setCopied] = useState(false);

    const fieldsRef = useRef(fieldValues);
    const accumulatedRef = useRef(accumulatedCrons);
    const everyRef = useRef(everyState);
    const internalValueRef = useRef(initialRaw);
    const requestIdRef = useRef(0);
    const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onChangeRef = useRef(onChange);
    const onValueChangeRef = useRef(onValueChange);
    const changeEventRef = useRef(changeEvent);
    const formControlRef = useRef(formControl);
    const disabledRef = useRef(disabled);
    const multipleRef = useRef(multiple);

    onChangeRef.current = onChange;
    onValueChangeRef.current = onValueChange;
    changeEventRef.current = changeEvent;
    formControlRef.current = formControl;
    disabledRef.current = disabled;
    multipleRef.current = multiple;

    const commit = useCallback(
      (
        nextFields: Record<CronFieldKey, string>,
        nextAccumulated: string[]
      ) => {
        fieldsRef.current = nextFields;
        accumulatedRef.current = nextAccumulated;
        setFieldValues(nextFields);
        setAccumulatedCrons(nextAccumulated);

        if (disabledRef.current) return;

        const currentCron = buildCronFromFields(nextFields);
        const isMultiple = multipleRef.current;
        const cronValue =
          isMultiple && nextAccumulated.length
            ? (nextAccumulated.includes(currentCron)
                ? nextAccumulated
                : [...nextAccumulated, currentCron]
              ).join(";")
            : currentCron;

        setInternalValue(cronValue);
        internalValueRef.current = cronValue;
        onChangeRef.current?.(cronValue);
        onValueChangeRef.current?.(cronValue);
        changeEventRef.current?.(cronValue);
        formControlRef.current?.setValue?.(cronValue, { emitEvent: true });
      },
      []
    );

    const updateField = useCallback(
      (key: CronFieldKey, nextValue: string) => {
        const nextFields = { ...fieldsRef.current, [key]: nextValue };
        commit(nextFields, accumulatedRef.current);
      },
      [commit]
    );

    useEffect(() => {
      const requestId = ++requestIdRef.current;
      const currentCron = buildCronFromFields(fieldsRef.current);
      if (!describeCron) {
        setDisplayedSchedule(currentCron);
        return;
      }
      Promise.resolve()
        .then(() => describeCronValue(currentCron, language))
        .then((description) => {
          if (requestId === requestIdRef.current) {
            setDisplayedSchedule(description);
          }
        })
        .catch(() => {
          if (requestId === requestIdRef.current) {
            setDisplayedSchedule(currentCron);
          }
        });
    }, [fieldValues, language, describeCron]);

    const incomingValue = value ?? cron;
    useEffect(() => {
      if (incomingValue === undefined) return;
      if (incomingValue === internalValueRef.current) return;
      internalValueRef.current = incomingValue;
      const parsed = splitInitialValue(incomingValue, multipleRef.current);
      fieldsRef.current = parsed.fields;
      accumulatedRef.current = parsed.accumulated;
      setFieldValues(parsed.fields);
      setAccumulatedCrons(parsed.accumulated);
      setInternalValue(incomingValue);
    }, [incomingValue]);

    useEffect(
      () => () => {
        if (copiedTimerRef.current) {
          clearTimeout(copiedTimerRef.current);
        }
      },
      []
    );

    const getFieldValue = (key: CronFieldKey): string =>
      String(fieldsRef.current[key]);

    const setFieldValue = (key: CronFieldKey, next: string) => {
      updateField(key, next.trim() || "*");
    };

    const isEvery = (key: CronFieldKey): boolean =>
      everyRef.current[key as "minute" | "hour"] ?? false;

    const patchValue = (key: CronFieldKey, every: boolean, nextValue: string) => {
      let next = nextValue;
      if (!every && next !== "*") {
        next = next.replace(/\D/g, "");
      }
      const blocked = next === "*" || next === "0" || Number(next) === 0;
      next = !blocked && every ? `*/${next}` : String(next);
      updateField(key, next);
    };

    const toggleEvery = (key: CronFieldKey) => {
      if (key !== "minute" && key !== "hour") return;
      const current = fieldsRef.current[key];
      const validNumber = /^\d+$/.test(current);
      let every = !everyRef.current[key];
      if (!validNumber || Number(current) < 1) {
        every = false;
      }
      const nextEvery = { ...everyRef.current, [key]: every };
      everyRef.current = nextEvery;
      setEveryState(nextEvery);
      patchValue(key, every, current);
    };

    const toBase = (current: string): number => {
      const digits = current.replace(/\D/g, "");
      return digits === "" ? -1 : Number(digits);
    };

    const fromBase = (next: number): string => (next < 0 ? "*" : String(next));

    const incrementTime = (key: "hour" | "minute", every = false) => {
      const max = key === "hour" ? 23 : 59;
      const next = Math.min(max, toBase(getFieldValue(key)) + 1);
      patchValue(key, every, fromBase(next));
    };

    const decrementTime = (key: "hour" | "minute", every = false) => {
      const next = Math.max(-1, toBase(getFieldValue(key)) - 1);
      patchValue(key, every, fromBase(next));
    };

    const handleSelectionPreset = (
      selected: string[],
      key: "weekday" | "month",
      element?: { value?: unknown } | null
    ) => {
      let mapped = selected;
      if (selected.length === 1) {
        if (selected.includes("all") && element) {
          element.value = "";
        }
        mapped = selected.map((entry) =>
          ["", "all"].includes(entry) ? "*" : String(entry)
        );
      }
      setFieldValue(key, mapped.join(","));
    };

    const applyEveryMinutes = (minutes: number) => {
      const next = Number.isNaN(minutes) ? 0 : minutes;
      setEveryMinutesValue(next);
      commit(
        {
          minute: `*/${next}`,
          hour: "*",
          day: "*",
          month: "*",
          weekday: "*",
        },
        accumulatedRef.current
      );
    };

    const applyDailyAt = (hour: number) => {
      setDailyAtHourValue(hour);
      commit(
        {
          minute: "0",
          hour: `${hour}`,
          day: "*",
          month: "*",
          weekday: "*",
        },
        accumulatedRef.current
      );
    };

    const applyMonthly = () => {
      commit(
        {
          minute: "0",
          hour: "0",
          day: "1",
          month: "*",
          weekday: "*",
        },
        accumulatedRef.current
      );
    };

    const applyPresetWeekdays = (days: string[] = presetWeekdays) => {
      const weekday =
        days.length && days.length < WEEKDAY_SELECT_OPTIONS.length
          ? days.join(",")
          : "*";
      commit(
        {
          minute: "0",
          hour: "9",
          day: "*",
          month: "*",
          weekday,
        },
        accumulatedRef.current
      );
    };

    const togglePresetWeekday = (day: number) => {
      const key = String(day);
      const set = new Set(presetWeekdays);
      if (set.has(key)) {
        set.delete(key);
      } else {
        set.add(key);
      }
      const next = [...set].sort((a, b) => Number(a) - Number(b));
      setPresetWeekdays(next);
      applyPresetWeekdays(next);
    };

    const toggleAllWeekdays = () => {
      applyPresetWeekdays(presetWeekdays);
    };

    const isPresetWeekdaySelected = (day: string | "all"): boolean => {
      if (day === "all") {
        return presetWeekdays.length === WEEKDAY_SELECT_OPTIONS.length;
      }
      return presetWeekdays.includes(day);
    };

    const weekdaySelectValue = (): (string | "all")[] =>
      isPresetWeekdaySelected("all")
        ? [...presetWeekdays, "all"]
        : presetWeekdays;

    const resetFields = () => {
      const defaults = cloneFieldValues(DEFAULT_FIELD_VALUES);
      fieldsRef.current = defaults;
      setFieldValues(defaults);
      setEveryMinutesValue(parseIntervalValue(DEFAULT_FIELD_VALUES.minute));
      setDailyAtHourValue(parseIntervalValue(DEFAULT_FIELD_VALUES.hour));
      setPresetWeekdays([]);
      return defaults;
    };

    const currentCron = () => buildCronFromFields(fieldsRef.current);

    const addAnother = () => {
      if (!multipleRef.current || disabledRef.current) return;
      const cronValue = currentCron();
      if (accumulatedRef.current.includes(cronValue)) return;
      const nextAccumulated = [...accumulatedRef.current, cronValue];
      const defaults = resetFields();
      commit(defaults, nextAccumulated);
    };

    const removeAccumulated = (index: number) => {
      const nextAccumulated = accumulatedRef.current.filter(
        (_, currentIndex) => currentIndex !== index
      );
      commit(fieldsRef.current, nextAccumulated);
    };

    const describeAccumulatedCron = (cronValue: string): string => {
      try {
        return describeCronValue(cronValue, language);
      } catch {
        return cronValue;
      }
    };

    const isPresetHidden = (preset: string): boolean => {
      if (preset === "minutes" || preset === "hour") return hideInterval;
      if (preset === "daily") return hideDaily;
      if (preset === "weekdays") return hideWeekly;
      return false;
    };

    const handleCopyToClipBoard = async () => {
      try {
        await navigator.clipboard.writeText(currentCron());
        setCopied(true);
        if (copiedTimerRef.current) {
          clearTimeout(copiedTimerRef.current);
        }
        copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
      } catch {
        setCopied(false);
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        getFieldValue,
        setFieldValue,
        isEvery,
        toggleEvery,
        patchValue,
        incrementTime,
        decrementTime,
        handleSelectionPreset,
        applyEveryMinutes,
        applyDailyAt,
        applyMonthly,
        applyPresetWeekdays,
        togglePresetWeekday,
        toggleAllWeekdays,
        isPresetWeekdaySelected,
        weekdaySelectValue,
        addAnother,
        removeAccumulated,
        currentCron,
        describeAccumulatedCron,
        isPresetHidden,
        getValue: () => internalValue,
        getDisplayedSchedule: () => displayedSchedule,
        getAccumulatedCrons: () => accumulatedCrons,
        getEveryMinutesValue: () => everyMinutesValue,
        getDailyAtHourValue: () => dailyAtHourValue,
      }),
      [
        internalValue,
        displayedSchedule,
        accumulatedCrons,
        everyMinutesValue,
        dailyAtHourValue,
        language,
        hideDaily,
        hideInterval,
        hideWeekly,
      ]
    );

    const renderPreset = (field: CronFieldKey) => {
      const fieldValue = fieldValues[field];
      const every = everyState[field as "minute" | "hour"] ?? false;

      if (field === "hour" || field === "minute") {
        return (
          <div key={field}>
            <div className="dcf-cron-builder-preset">
              <button
                type="button"
                className={`dcf-every${every ? " dcf-color-primary" : ""}`}
                onClick={() => toggleEvery(field)}
                aria-pressed={every}
                title={translate("component.cron_builder.enable_step")}
              >
                {translate("component.cron_builder.every")}
              </button>
              <div className="dcf-flex dcf-flex-middle">
                <input
                  type="text"
                  minLength={1}
                  pattern="[0-9*/]+"
                  maxLength={2}
                  className="dcf-cron-builder-preset-input"
                  value={fieldValue}
                  disabled={disabled}
                  aria-label={translate(
                    `component.cron_builder.step_value.${field}`
                  )}
                  onChange={(event) => updateField(field, event.target.value)}
                  onBlur={(event) =>
                    updateField(field, event.target.value.trim() || "*")
                  }
                />
                <div className="dcf-input-controls">
                  <button
                    type="button"
                    aria-label={translate("component.cron_builder.increment")}
                    onClick={() => incrementTime(field, every)}
                  >
                    <span className="ti ti-chevron-up" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={translate("component.cron_builder.decrement")}
                    onClick={() => decrementTime(field, every)}
                  >
                    <span className="ti ti-chevron-down" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <span>{translate(`component.cron_builder.${field}`)}</span>
            </div>
          </div>
        );
      }

      if (field === "day") {
        return (
          <div key={field}>
            <div className="dcf-cron-builder-preset selectable">
              <IonSelect
                label={translate("component.cron_builder.daily_at")}
                interface="popover"
                value={String(dailyAtHourValue)}
                disabled={disabled}
                onIonChange={(event) =>
                  applyDailyAt(Number(event.detail.value))
                }
              >
                {HOUR_OPTIONS.map((hour) => (
                  <IonSelectOption key={hour} value={hour}>
                    {hour.padStart(2, "0")}:00
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>
          </div>
        );
      }

      if (field === "weekday") {
        const selected = fieldValue === "*" ? [] : fieldValue.split(",");
        return (
          <div key={field}>
            <div className="dcf-cron-builder-preset selectable">
              <div>
                <IonButton
                  fill={fieldValue === "*" ? "solid" : "clear"}
                  size="small"
                  slot="start"
                  onClick={() =>
                    handleSelectionPreset(["all"], "weekday", null)
                  }
                >
                  {translate("component.cron_builder.all")}
                </IonButton>
                <IonSelect
                  multiple={true}
                  interface="popover"
                  placeholder={translate("component.cron_builder.all")}
                  justify="start"
                  label={translate("component.cron_builder.weekdays_preset")}
                  selectedText=""
                  value={selected}
                  disabled={disabled}
                  onIonChange={(event) =>
                    handleSelectionPreset(
                      event.detail.value,
                      "weekday",
                      event.target as unknown as { value?: unknown }
                    )
                  }
                >
                  {WEEKDAY_SELECT_OPTIONS.map((day) => (
                    <IonSelectOption key={day.value} value={day.value}>
                      {translate(day.text)}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </div>
            </div>
          </div>
        );
      }

      if (field === "month") {
        return (
          <div key={field}>
            <div className="dcf-cron-builder-preset dcf-flex dcf-flex-center">
              <IonButton
                fill="clear"
                size="small"
                disabled={disabled}
                onClick={applyMonthly}
              >
                {translate("component.cron_builder.monthly")}
              </IonButton>
            </div>
          </div>
        );
      }

      return null;
    };

    return (
      <div
        className={[
          "dcf-cron-builder",
          isReadOnlyOperation ? "dcf-readonly" : "",
          disabled && !isReadOnlyOperation ? "dcf-cron-builder-disabled" : "",
          className || "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="group"
      >
        {isReadOnlyOperation ? (
          <IonItem className="dcf-input-item read">
            <IonLabel>
              {translate(label)}
              <br />
              <code className={internalValue?.length ? "" : "dcf-empty"}>
                {internalValue}
              </code>
            </IonLabel>
          </IonItem>
        ) : (
          <>
            <div className="dcf-cron-builder-presets">
              <p className="dcf-cron-builder-label">
                {translate("component.cron_builder.quick_presets")}
              </p>
              <div className="dcf-grid-fields presets">
                {fields.map((field) => renderPreset(field))}
              </div>
            </div>

            <div className="dcf-grid-fields">
              {fields.map((field) => (
                <div key={field} className="dcf-cron-builder-field">
                  <label
                    className="dcf-cron-builder-field-label"
                    htmlFor={`cron-builder-${field}`}
                  >
                    {translate(`component.cron_builder.fields.${field}`)}
                  </label>
                  <input
                    id={`cron-builder-${field}`}
                    type="text"
                    className="dcf-cron-builder-field-input"
                    value={fieldValues[field]}
                    disabled={disabled}
                    onChange={(event) => updateField(field, event.target.value)}
                    onBlur={(event) =>
                      updateField(field, event.target.value.trim() || "*")
                    }
                  />
                </div>
              ))}
            </div>

            <div className="dcf-cron-builder-result" aria-live="polite">
              <div className="dcf-cron-description">
                <code className="dcf-cron-builder-expression">
                  {currentCron()}
                </code>
                <IonButton
                  className="dcf-copy-button"
                  fill="outline"
                  size="small"
                  color={copied ? "primary" : "medium"}
                  onClick={handleCopyToClipBoard}
                >
                  <span
                    aria-hidden="true"
                    className={`ti ${
                      copied
                        ? "ti-clipboard-check dcf-text-primary"
                        : "ti-clipboard-copy"
                    }`}
                  />
                  {translate(
                    copied
                      ? "component.cron_builder.copied"
                      : "component.cron_builder.copy"
                  )}
                </IonButton>
              </div>
              {describeCron && (
                <p className="dcf-cron-builder-description">
                  {displayedSchedule}
                </p>
              )}
            </div>

            {multiple && (
              <div className="dcf-cron-builder-multiple">
                {accumulatedCrons.length > 0 && (
                  <IonList className="dcf-cron-builder-accumulated">
                    {accumulatedCrons.map((cronValue, index) => (
                      <IonItem
                        key={`${cronValue}-${index}`}
                        className="dcf-cron-item dcf-animation dcf-animation-slide-bottom-small dcf-animation-medium"
                      >
                        <span
                          className="ti ti-clock-2 dcf-task-icon"
                          aria-hidden="true"
                        />
                        <IonLabel>
                          <code>{cronValue}</code>
                        </IonLabel>
                        <div
                          className="dcf-flex dcf-cron-builder-item-end"
                          slot="end"
                        >
                          <span className="dcf-cron-builder-item-readable">
                            {describeAccumulatedCron(cronValue)}
                          </span>
                          <IonButton
                            fill="clear"
                            size="small"
                            color="danger"
                            className="dcf-button-delete"
                            disabled={disabled}
                            aria-label={translate(
                              "component.cron_selector.remove"
                            )}
                            onClick={() => removeAccumulated(index)}
                          >
                            <span className="ti ti-trash" aria-hidden="true" />
                            <span className="dcf-text">
                              {translate("component.cron_selector.remove")}
                            </span>
                          </IonButton>
                        </div>
                      </IonItem>
                    ))}
                  </IonList>
                )}
                <IonButton
                  disabled={disabled}
                  onClick={addAnother}
                  fill="clear"
                >
                  {translate("component.cron_builder.add_another")}
                </IonButton>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);

/**
 * @description Alias of {@link CronBuilder} kept for callers porting Angular
 * component names to the React package.
 * @summary Behaves exactly like {@link CronBuilder}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {React.ForwardRefExoticComponent<CronBuilderProps>}
 * @memberOf module:for-react.cron
 */
export const CronBuilderComponent = CronBuilder;

/**
 * @description Alias of {@link CronBuilder} following the `Rgx*` naming
 * convention of the main for-react UI kit.
 * @summary Behaves exactly like {@link CronBuilder}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {React.ForwardRefExoticComponent<CronBuilderProps>}
 * @memberOf module:for-react.cron
 */
export const RgxCronBuilder = CronBuilder;

export { MONTH_SELECT_OPTIONS, WEEKDAY_SELECT_OPTIONS };
