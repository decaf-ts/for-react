import React, { useEffect, useRef, useState } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { IonButton, IonCheckbox, IonLabel } from "@ionic/react";
import { CronBuilder } from "./CronBuilder.js";
import { CronSelector } from "./CronSelector.js";
import { DEFAULT_CRON } from "./cron-utils.js";
import {
  ControlFieldProps,
  FormServiceLike,
} from "../lib/engine/types.js";
import { RgxComponentRegistry } from "../lib/engine/ComponentRegistry.js";
import { useTranslate } from "../lib/services/RgxContext.js";

/**
 * @description Props accepted by {@link CronSelectorField}.
 * @summary Extends {@link ControlFieldProps} with cron-specific visibility and
 * emptiness options. The field binds to a host form service through
 * `formProvider`, reading and writing the value under `path` or `name`, and
 * renders {@link CronBuilder} as its editor.
 * @interface CronSelectorFieldProps
 * @extends ControlFieldProps
 * @property {boolean} [allowEmpty=false] - Lets the field start without a
 * schedule, exposing a toggle that enables or clears it.
 * @property {boolean} [hideDaily=false] - Hides the daily quick preset.
 * @property {boolean} [hideInterval=false] - Hides the interval presets.
 * @property {boolean} [hideWeekly=false] - Hides the weekday preset.
 * @property {boolean} [describeCron=false] - Renders a cronstrue description of
 * the value.
 * @property {OperationKeys|string} [operation] - Form operation; `READ` and
 * `DELETE` render the field read-only.
 * @memberOf module:for-react.cron
 */
export interface CronSelectorFieldProps extends ControlFieldProps {
  allowEmpty?: boolean;
  hideDaily?: boolean;
  hideInterval?: boolean;
  hideWeekly?: boolean;
  describeCron?: boolean;
  operation?: OperationKeys | string;
}

function isReadOnlyOperation(
  operation: OperationKeys | string | undefined,
  readonly: boolean,
  disabled: boolean
): boolean {
  return (
    readonly ||
    disabled ||
    operation === OperationKeys.READ ||
    operation === OperationKeys.DELETE
  );
}

/**
 * @description Form-bound cron field rendered through {@link CronBuilder}.
 * @summary Seeds its value from the host form service (or `value`), registers a
 * control when the provider supports it, and keeps the provider in sync through
 * subscriptions while writing edits back with dirty and validation marking. When
 * `allowEmpty` is set it renders a toggle that enables or clears the schedule;
 * `READ` and `DELETE` operations render it read-only. Field errors from the
 * provider are surfaced in an `aria-live` region.
 * @param {CronSelectorFieldProps} props - Field identity, label, value, form
 * provider, operation, and cron visibility options.
 * @returns {React.ReactElement} The field wrapper containing the builder and its
 * error region.
 * @function CronSelectorField
 * @memberOf module:for-react.cron
 * @example
 * ```tsx
 * <CronSelectorField
 *   name="schedule"
 *   label="component.schedule.label"
 *   formProvider={formService}
 *   allowEmpty
 * />
 * ```
 */
export const CronSelectorField: React.FC<CronSelectorFieldProps> = (props) => {
  const {
    name,
    path,
    label,
    className,
    required = false,
    readonly = false,
    disabled = false,
    operation,
    allowEmpty = false,
    hideDaily = false,
    hideInterval = false,
    hideWeekly = false,
    describeCron = false,
    multiple = true,
    formProvider,
  } = props;

  const translate = useTranslate();
  const fieldId = path || name;
  const readOnly = isReadOnlyOperation(operation, readonly, disabled);

  const providerValue = fieldId ? formProvider?.getValues(fieldId) : undefined;
  const seedValue = providerValue ?? props.value;
  const [fieldValue, setFieldValue] = useState<unknown>(seedValue);
  const [checked, setChecked] = useState<boolean>(
    (required && !allowEmpty) || readOnly
  );
  const valueRef = useRef<unknown>(seedValue);
  const readOnlyRef = useRef(readOnly);

  valueRef.current = fieldValue;
  readOnlyRef.current = readOnly;

  const hasCronValue =
    typeof fieldValue === "string" && fieldValue.trim().length > 0;
  const cronValue = hasCronValue ? (fieldValue as string) : DEFAULT_CRON;
  const showSelector = !allowEmpty || hasCronValue;

  const writeValue = (next: unknown, markDirty = true) => {
    valueRef.current = next;
    setFieldValue(next);
    if (fieldId && formProvider) {
      formProvider.setValue(fieldId, next);
      if (markDirty) {
        (formProvider as FormServiceLike).markAsDirty?.(fieldId);
        (formProvider as FormServiceLike).validateField?.(fieldId);
      }
    }
  };

  const handleCronChange = (next: string) => {
    if (readOnlyRef.current) return;
    writeValue(next);
  };

  const toggleVisibility = () => {
    const nextChecked = !checked;
    setChecked(nextChecked);
    if (!nextChecked) {
      writeValue(allowEmpty && !required ? "" : cronValue);
    }
  };

  useEffect(() => {
    if (!fieldId || !formProvider) return;
    const provider = formProvider as FormServiceLike;
    if (
      typeof provider.addFormControl === "function" &&
      typeof provider.getControl === "function" &&
      !provider.getControl(fieldId)
    ) {
      provider.addFormControl({
        name,
        path: fieldId,
        type: "text",
        label: label ? String(label) : undefined,
        required,
        readonly,
        multiple,
      } as ControlFieldProps);
    }
  }, [fieldId, formProvider]);

  useEffect(() => {
    if (readOnly) return;
    writeValue(allowEmpty && !required ? "" : cronValue, false);
    if (required && !allowEmpty) {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    const provider = formProvider as FormServiceLike | undefined;
    if (!provider || typeof provider.subscribe !== "function" || !fieldId) {
      return;
    }
    const sync = () => {
      const next = provider.getValues(fieldId);
      if (next !== valueRef.current) {
        valueRef.current = next;
        setFieldValue(next);
      }
    };
    sync();
    return provider.subscribe(sync);
  }, [fieldId, formProvider]);

  const error =
    fieldId && formProvider && typeof formProvider.getFieldError === "function"
      ? formProvider.getFieldError(fieldId)
      : undefined;
  const errorId = fieldId ? `${fieldId}-error` : undefined;

  return (
    <div
      className={[
        "dcf-input-item",
        operation,
        className,
        "dcf-cron-selector-field",
        required ? "dcf-field-required" : "",
        readOnly ? "dcf-field-readonly" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!readOnly && (
        <div className="dcf-cron-selector-header">
          <IonLabel className="dcf-cron-selector-label">
            {translate(String(label || ""))}
          </IonLabel>
          {allowEmpty &&
            (checked ? (
              <IonButton
                className="dcf-cron-selector-close"
                fill="clear"
                size="small"
                disabled={readOnly}
                aria-label={translate(
                  "component.cron_selector.close_schedule"
                )}
                onClick={toggleVisibility}
              >
                {translate("component.cron_selector.close")}
              </IonButton>
            ) : (
              <IonCheckbox
                className="dcf-cron-selector-toggle"
                checked={false}
                disabled={readOnly}
                aria-label={translate(
                  "component.cron_selector.enable_schedule"
                )}
                onIonChange={toggleVisibility}
              />
            ))}
        </div>
      )}

      {checked && (
        <div
          className={
            readOnly ? undefined : "dcf-cron-selector-body"
          }
          data-show-selector={showSelector}
        >
          <CronBuilder
            label={label ? String(label) : ""}
            value={cronValue}
            isReadOnlyOperation={readOnly}
            describeCron={describeCron}
            disabled={readOnly}
            hideDaily={hideDaily}
            hideInterval={hideInterval}
            hideWeekly={hideWeekly}
            multiple={multiple}
            onChange={handleCronChange}
          />
        </div>
      )}

      {!readOnly && (
        <div
          className="dcf-input-error"
          id={errorId}
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * @description Alias of {@link CronSelectorField} kept for callers porting
 * Angular component names to the React package.
 * @summary Behaves exactly like {@link CronSelectorField}; it exists only as a
 * naming bridge and has no separate implementation.
 * @constant
 * @type {React.FC<CronSelectorFieldProps>}
 * @memberOf module:for-react.cron
 */
export const CronSelectorFieldComponent = CronSelectorField;

/**
 * @description Alias of {@link CronSelectorField} following the `Rgx*` naming
 * convention of the main for-react UI kit.
 * @summary Behaves exactly like {@link CronSelectorField}; it exists only as a
 * naming bridge and has no separate implementation.
 * @constant
 * @type {React.FC<CronSelectorFieldProps>}
 * @memberOf module:for-react.cron
 */
export const RgxCronSelectorField = CronSelectorField;

/**
 * @description Registers the cron components in the rendering engine registry.
 * @summary Makes `CronSelector`, `CronBuilder`, and `CronSelectorField` available
 * under the Angular-compatible `ngx-decaf-cron-*` names plus
 * `app-cron-selector-field`, so model-driven renderers can resolve cron fields
 * without importing them directly. Registration is idempotent for identical
 * names.
 * @returns {void}
 * @function registerCronComponents
 * @memberOf module:for-react.cron
 * @example
 * ```tsx
 * import { registerCronComponents } from "@decaf-ts/for-react/cron";
 *
 * registerCronComponents();
 * ```
 */
export function registerCronComponents(): void {
  RgxComponentRegistry.register(
    "ngx-decaf-cron-selector",
    CronSelector as unknown as React.ComponentType<unknown>
  );
  RgxComponentRegistry.register(
    "ngx-decaf-cron-builder",
    CronBuilder as unknown as React.ComponentType<unknown>
  );
  RgxComponentRegistry.register(
    "ngx-decaf-cron-selector-field",
    CronSelectorField as React.ComponentType<CronSelectorFieldProps>
  );
  RgxComponentRegistry.register(
    "app-cron-selector-field",
    CronSelectorField as React.ComponentType<CronSelectorFieldProps>
  );
}
