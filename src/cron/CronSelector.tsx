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
  IonCheckbox,
  IonDatetime,
  IonDatetimeButton,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import {
  CronSchedule,
  DEFAULT_CRON,
  DEFAULT_SCHEDULE,
  HOUR_INTERVALS,
  ScheduleMode,
  WEEKDAY_OPTIONS,
  describeCronValue,
  extractTime,
  scheduleToCron,
  visibleModes,
} from "./cron-utils.js";
import { useCurrentLang, useTranslate } from "../lib/services/RgxContext.js";

/**
 * @description Minimal writable form-control contract accepted by the cron
 * components.
 * @summary Lets a host form service receive generated cron values without the
 * components depending on a concrete form implementation. Both members are
 * optional, so passing a partial control is safe.
 * @interface CronSelectorFormControlLike
 * @property {unknown} [value] - Current value exposed by the control, when the
 * host tracks one.
 * @property {function(string, Object): void} [setValue] - Writes the generated
 * cron value; `options.emitEvent` asks the control to emit a change event.
 * @memberOf module:for-react.cron
 */
export interface CronSelectorFormControlLike {
  value?: unknown;
  setValue?(value: string, options?: { emitEvent?: boolean }): void;
}

/**
 * @description Props accepted by {@link CronSelector}.
 * @summary Controls the initial cron value, which editing modes are offered,
 * whether a readable description is shown, and how changes are reported. The
 * component is uncontrolled after mount except for `value`, which is applied
 * when it changes.
 * @interface CronSelectorProps
 * @property {string} [value] - Controlled cron value; when it changes the
 * component adopts it as its internal value.
 * @property {string} [defaultValue] - Initial cron value used when `value` is
 * absent.
 * @property {boolean} [describeCron=true] - Renders a cronstrue description
 * instead of the raw expression in the generated-schedule row.
 * @property {boolean} [hideDaily=false] - Hides the daily editing mode.
 * @property {boolean} [hideInterval=false] - Hides the hourly/interval editing
 * mode.
 * @property {boolean} [hideWeekly=false] - Hides the weekly editing mode.
 * @property {boolean} [disabled=false] - Disables every control and suppresses
 * change emission.
 * @property {CronSelectorFormControlLike} [formControl] - Optional form control
 * that receives the generated cron through `setValue`.
 * @property {string} [className] - Extra class name applied to the root element.
 * @property {function(string): void} [onChange] - Called with the generated cron
 * expression after each edit.
 * @property {function(string): void} [onValueChange] - Called alongside
 * `onChange` with the same cron expression.
 * @memberOf module:for-react.cron
 */
export interface CronSelectorProps {
  value?: string;
  defaultValue?: string;
  describeCron?: boolean;
  hideDaily?: boolean;
  hideInterval?: boolean;
  hideWeekly?: boolean;
  disabled?: boolean;
  formControl?: CronSelectorFormControlLike;
  className?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
}

/**
 * @description Imperative handle exposed through a React `ref` on
 * {@link CronSelector}.
 * @summary Drives the schedule model and generated value without depending on
 * the rendered controls, which is useful for tests and host toolbars. Mutating
 * helpers emit the same `onChange`/`onValueChange`/form-control updates as the
 * UI, and are no-ops while the component is disabled.
 * @interface CronSelectorHandle
 * @property {function(): void} addTime - Appends a `12:00` entry to the time
 * list.
 * @property {function(number): void} removeTime - Removes the time at `index`;
 * the last remaining entry is kept.
 * @property {function(number, string): void} updateTime - Replaces the time at
 * `index` using the first `HH:mm` pair in the value; non-string values are
 * ignored.
 * @property {function(number, boolean): void} toggleWeekday - Adds or removes a
 * cron weekday number and keeps the selection sorted.
 * @property {function(number): boolean} isWeekdaySelected - Reports whether a
 * cron weekday number is selected.
 * @property {function(string, unknown): void} setControlValue - Writes one
 * schedule field (`mode`, `time`, `times`, `everyHours`, or `weekdays`); unknown
 * names are ignored.
 * @property {function(string): string|number|unknown[]|undefined}
 * getControlValue - Reads one schedule field; returns `undefined` for unknown
 * names.
 * @property {function(): string} createCron - Builds a cron expression from the
 * current schedule without publishing it.
 * @property {function(): string} getValue - Returns the current cron value.
 * @property {function(): string} getDisplayedSchedule - Returns the described
 * schedule, or the raw cron value when description is disabled or fails.
 * @memberOf module:for-react.cron
 */
export interface CronSelectorHandle {
  addTime(): void;
  removeTime(index: number): void;
  updateTime(index: number, value: string | string[] | null): void;
  toggleWeekday(day: number, checked: boolean): void;
  isWeekdaySelected(day: number): boolean;
  setControlValue(name: string, value: unknown): void;
  getControlValue(name: string): string | number | unknown[] | undefined;
  createCron(): string;
  getValue(): string;
  getDisplayedSchedule(): string;
}

/**
 * @description Mode-based cron editor with daily, interval, and weekly layouts.
 * @summary Renders an Ionic segment for the visible modes and the controls that
 * belong to the active one: an editable time list, an hour-interval selector, or
 * weekday checkboxes. Every edit is serialized with {@link scheduleToCron} and
 * published through `onChange`, `onValueChange`, and the optional form control,
 * while a cronstrue description is shown in the generated-schedule row when
 * `describeCron` is enabled. The component is uncontrolled after mount except
 * for `value`, and exposes {@link CronSelectorHandle} through a React `ref`.
 * @param {CronSelectorProps} props - Initial cron value, mode visibility flags,
 * disabled state, form control, and change callbacks.
 * @param {React.Ref<CronSelectorHandle>} ref - Optional ref that receives the
 * imperative schedule and value helpers.
 * @returns {React.ReactElement} The selector region.
 * @function CronSelector
 * @memberOf module:for-react.cron
 * @example
 * ```tsx
 * import { useRef } from "react";
 * import { CronSelector, type CronSelectorHandle } from "@decaf-ts/for-react/cron";
 *
 * export function DoseSchedule() {
 *   const cronRef = useRef<CronSelectorHandle>(null);
 *
 *   return (
 *     <CronSelector
 *       ref={cronRef}
 *       defaultValue="0 9 * * 1-5"
 *       hideInterval
 *       onChange={(cron) => console.log(cron)}
 *     />
 *   );
 * }
 * ```
 */
export const CronSelector = forwardRef<CronSelectorHandle, CronSelectorProps>(
  function CronSelector(
    {
      value,
      defaultValue,
      describeCron = true,
      hideDaily = false,
      hideInterval = false,
      hideWeekly = false,
      disabled = false,
      formControl,
      className,
      onChange,
      onValueChange,
    },
    ref
  ) {
    const translate = useTranslate();
    const language = useCurrentLang();

    const [schedule, setSchedule] = useState<CronSchedule>(() => ({
      ...DEFAULT_SCHEDULE,
      times: [...DEFAULT_SCHEDULE.times],
      weekdays: [...DEFAULT_SCHEDULE.weekdays],
    }));
    const scheduleRef = useRef(schedule);
    const [internalCron, setInternalCron] = useState<string>(
      defaultValue ?? value ?? DEFAULT_CRON
    );
    const [displayedSchedule, setDisplayedSchedule] = useState<string>(
      defaultValue ?? value ?? DEFAULT_CRON
    );
    const requestIdRef = useRef(0);
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    const onValueChangeRef = useRef(onValueChange);
    const disabledRef = useRef(disabled);
    const formControlRef = useRef(formControl);

    onChangeRef.current = onChange;
    onValueChangeRef.current = onValueChange;
    disabledRef.current = disabled;
    formControlRef.current = formControl;

    const publish = useCallback((next: CronSchedule) => {
      if (disabledRef.current) return;
      const cron = scheduleToCron(next);
      setInternalCron(cron);
      onChangeRef.current?.(cron);
      onValueChangeRef.current?.(cron);
      formControlRef.current?.setValue?.(cron, { emitEvent: true });
    }, []);

    const applySchedule = useCallback(
      (updater: (current: CronSchedule) => CronSchedule) => {
        const next = updater(scheduleRef.current);
        scheduleRef.current = next;
        setSchedule(next);
        publish(next);
      },
      [publish]
    );

    useEffect(() => {
      const requestId = ++requestIdRef.current;
      if (!describeCron) {
        setDisplayedSchedule(internalCron);
        return;
      }
      Promise.resolve()
        .then(() => describeCronValue(internalCron, language))
        .then((description) => {
          if (requestId === requestIdRef.current) {
            setDisplayedSchedule(description);
          }
        })
        .catch(() => {
          if (requestId === requestIdRef.current) {
            setDisplayedSchedule(internalCron);
          }
        });
    }, [internalCron, language, describeCron]);

    useEffect(() => {
      if (value === undefined) return;
      if (value === valueRef.current) return;
      valueRef.current = value;
      setInternalCron(value);
    }, [value]);

    const addTime = () => {
      applySchedule((current) => ({
        ...current,
        times: [...current.times, "12:00"],
      }));
    };

    const removeTime = (index: number) => {
      const nextTimes = scheduleRef.current.times.filter(
        (_, currentIndex) => currentIndex !== index
      );
      if (!nextTimes.length) return;
      applySchedule((current) => ({ ...current, times: nextTimes }));
    };

    const updateTime = (index: number, next: string | string[] | null) => {
      if (typeof next !== "string") return;
      const time = extractTime(next);
      applySchedule((current) => {
        const times = [...current.times];
        times[index] = time;
        return { ...current, times };
      });
    };

    const toggleWeekday = (day: number, checked: boolean) => {
      applySchedule((current) => {
        const selected = new Set(current.weekdays);
        if (checked) {
          selected.add(day);
        } else {
          selected.delete(day);
        }
        return {
          ...current,
          weekdays: [...selected].sort((a, b) => a - b),
        };
      });
    };

    const isWeekdaySelected = (day: number): boolean =>
      scheduleRef.current.weekdays.includes(day);

    const setControlValue = (name: string, next: unknown) => {
      applySchedule((current) => {
        switch (name) {
          case "mode":
            return { ...current, mode: next as ScheduleMode };
          case "time":
            return { ...current, time: String(next) };
          case "times":
            return { ...current, times: [...(next as string[])] };
          case "everyHours":
            return { ...current, everyHours: Number(next) };
          case "weekdays":
            return { ...current, weekdays: [...(next as number[])] };
          default:
            return current;
        }
      });
    };

    const getControlValue = (name: string): string | number | unknown[] | undefined => {
      switch (name) {
        case "mode":
          return scheduleRef.current.mode;
        case "time":
          return scheduleRef.current.time;
        case "times":
          return scheduleRef.current.times;
        case "everyHours":
          return scheduleRef.current.everyHours;
        case "weekdays":
          return scheduleRef.current.weekdays;
        default:
          return undefined;
      }
    };

    const createCron = () => scheduleToCron(scheduleRef.current);

    useImperativeHandle(
      ref,
      () => ({
        addTime,
        removeTime,
        updateTime,
        toggleWeekday,
        isWeekdaySelected,
        setControlValue,
        getControlValue,
        createCron,
        getValue: () => internalCron,
        getDisplayedSchedule: () => displayedSchedule,
      }),
      [internalCron, displayedSchedule]
    );

    const modes = visibleModes(hideDaily, hideInterval, hideWeekly);

    const renderTimes = () =>
      schedule.times.map((time, index) => {
        const datetimeId = `daily-time-${index}`;
        return (
          <IonItem
            key={`${datetimeId}-${index}`}
            className="dcf-cron-item dcf-animation dcf-animation-slide-bottom-small dcf-animation-medium"
          >
            <span className="ti ti-clock-2 dcf-task-icon" aria-hidden="true" />
            <IonLabel>
              {translate("component.cron_selector.dose", { "0": index + 1 })}
            </IonLabel>
            <div className="dcf-flex" slot="end">
              <IonDatetimeButton
                datetime={datetimeId}
                disabled={disabled}
              />
              <IonModal keepContentsMounted={true}>
                <IonDatetime
                  id={datetimeId}
                  presentation="time"
                  value={time}
                  onIonChange={(event) =>
                    updateTime(index, event.detail.value ?? null)
                  }
                />
              </IonModal>
              <IonButton
                fill="clear"
                size="small"
                color={schedule.times.length === 1 ? undefined : "danger"}
                className="dcf-button-delete"
                disabled={disabled || schedule.times.length === 1}
                aria-label={translate("component.cron_selector.remove")}
                onClick={() => removeTime(index)}
              >
                <span className="ti ti-trash" aria-hidden="true" />
                <span className="dcf-text">
                  {translate("component.cron_selector.remove")}
                </span>
              </IonButton>
            </div>
          </IonItem>
        );
      });

    return (
      <div
        className={["dcf-cron-selector-component", className]
          .filter(Boolean)
          .join(" ")}
        data-disabled={disabled || undefined}
      >
        <div className="dcf-grid dcf-grid-small dcf-flex dcf-flex-middle dcf-grid-match-item dcf-segment-grid">
          <div className="dcf-width-expand@s">
            <IonSegment
              mode="ios"
              value={schedule.mode}
              disabled={disabled}
              onIonChange={(event) =>
                setControlValue("mode", event.detail.value)
              }
            >
              {modes.map((mode) => (
                <IonSegmentButton
                  key={mode}
                  className="dcf-cron-selector-segment"
                  value={mode}
                >
                  <IonLabel>
                    {translate(`component.cron_selector.modes.${mode}`)}
                  </IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
          </div>
          <div className="dcf-width-auto@s dcf-add-button-col">
            <IonButton
              expand="block"
              disabled={disabled || schedule.mode === "hourly"}
              onClick={addTime}
            >
              {translate("component.cron_selector.add_ocurrence")}
            </IonButton>
          </div>
        </div>

        <IonItem className="dcf-current-cron">
          <IonNote>
            {translate("component.cron_selector.generated_schedule")}{" "}
            <code>{displayedSchedule}</code>
          </IonNote>
        </IonItem>

        <IonList>
          {schedule.mode === "weekly" && (
            <div className="dcf-grid dcf-grid-small dcf-grid-weekly">
              {WEEKDAY_OPTIONS.map((day) => (
                <div
                  key={day.value}
                  className="dcf-width-1-4@m dcf-width-1-2@s dcf-animation dcf-animation-slide-top-small dcf-animation-medium"
                >
                  <IonItem>
                    <IonCheckbox
                      justify="space-between"
                      checked={schedule.weekdays.includes(day.value)}
                      disabled={disabled}
                      onIonChange={(event) =>
                        toggleWeekday(day.value, event.detail.checked)
                      }
                    >
                      {translate(day.label)}
                    </IonCheckbox>
                  </IonItem>
                </div>
              ))}
            </div>
          )}

          {(schedule.mode === "daily" || schedule.mode === "weekly") &&
            renderTimes()}

          {schedule.mode === "hourly" && (
            <IonItem className="dcf-cron-item dcf-animation dcf-animation-slide-bottom-small dcf-animation-medium">
              <span
                className="ti ti-clock-bolt dcf-task-icon hourly"
                aria-hidden="true"
              />
              <IonSelect
                label={translate("component.cron_selector.repeat_every")}
                interface="popover"
                value={schedule.everyHours}
                disabled={disabled}
                onIonChange={(event) =>
                  setControlValue("everyHours", event.detail.value)
                }
              >
                {HOUR_INTERVALS.map((hours) => (
                  <IonSelectOption key={hours} value={hours}>
                    {hours} {translate("component.cron_selector.hours")}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          )}
        </IonList>
      </div>
    );
  }
);

/**
 * @description Alias of {@link CronSelector} kept for callers porting Angular
 * component names to the React package.
 * @summary Behaves exactly like {@link CronSelector}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {React.ForwardRefExoticComponent<CronSelectorProps>}
 * @memberOf module:for-react.cron
 */
export const CronSelectorComponent = CronSelector;

/**
 * @description Alias of {@link CronSelector} following the `Rgx*` naming
 * convention of the main for-react UI kit.
 * @summary Behaves exactly like {@link CronSelector}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {React.ForwardRefExoticComponent<CronSelectorProps>}
 * @memberOf module:for-react.cron
 */
export const RgxCronSelector = CronSelector;
