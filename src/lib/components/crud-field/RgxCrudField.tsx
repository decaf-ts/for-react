import React, { useEffect, useRef, useState } from "react";
import {
  ControlFieldProps,
  FormServiceLike,
  Option,
} from "../../engine/types.js";
import { translateKey } from "../../services/RgxTranslateService.js";
import { ValidatorFactory } from "../../engine/ValidatorFactory.js";

const NON_VALIDATOR_KEYS = ["type", "design:type"];

/**
 * @description Form-provider-backed CRUD input field.
 * @summary Renders a labelled control selected from `type` (`text` by default,
 * plus `textarea`, `select`, `checkbox` and `radio`, where checkbox/radio use
 * `options`) and keeps its value in sync with an injected `formProvider`. On
 * mount it registers the control and seeds the provider value only when the
 * provider has none yet; it then subscribes to provider notifications and
 * mirrors value, validation error, touched and dirty state. Changes call
 * `setValue`, `markAsDirty` and `validateField`, and blur marks the field
 * touched and validates it. Labels, placeholders and option text are passed
 * through `translateKey`. Without a `formProvider` the component warns and
 * renders `null`.
 * @param {ControlFieldProps} props - Field metadata plus form provider and options.
 * @returns {React.ReactElement | null} The field markup, or `null` when no provider is supplied.
 * @memberOf module:for-react
 * @example
 * <RgxCrudField
 *   name="email"
 *   path="user.email"
 *   label="Email"
 *   type="text"
 *   formProvider={form}
 * />
 */
export const RgxCrudField: React.FC<ControlFieldProps> = (props) => {
  const {
    name,
    label,
    className,
    placeholder,
    type = "text",
    required,
    readonly,
    disabled,
    description,
    options = [],
    formProvider,
    children,
  } = props;

  const fieldId = props.path || name;
  const translatedLabel = label ? translateKey(String(label)) : label;
  const translatedPlaceholder = placeholder
    ? translateKey(String(placeholder))
    : placeholder;
  const providerValue = fieldId ? formProvider?.getValues(fieldId) : undefined;
  const initial = providerValue ?? props.value ?? "";
  const [fieldState, setFieldState] = useState<{
    value: unknown;
    revision: number;
  }>(() => ({ value: initial, revision: 0 }));
  const value = fieldState.value;
  const fallbackValue = useRef<unknown>(props.value);

  const buildControlProps = (): ControlFieldProps => {
    const descriptor: ControlFieldProps = {
      name,
      path: fieldId,
      type,
      label: label ? String(label) : undefined,
    };
    const rawProps = props as Record<string, unknown>;
    for (const key of ValidatorFactory.supportedKeys()) {
      if (NON_VALIDATOR_KEYS.includes(key)) continue;
      if (rawProps[key] !== undefined) {
        (descriptor as Record<string, unknown>)[key] = rawProps[key];
      }
    }
    if (typeof props.defaultValue !== "undefined") {
      descriptor.defaultValue = props.defaultValue;
    }
    return descriptor;
  };

  useEffect(() => {
    if (!fieldId || !formProvider) return;
    const provider = formProvider as FormServiceLike;
    if (
      typeof provider.addFormControl === "function" &&
      typeof provider.getControl === "function" &&
      !provider.getControl(fieldId)
    ) {
      provider.addFormControl(buildControlProps());
    }
    // Seed the provider only when it has no value for this field. This keeps
    // externally-set values (set between render and mount) from being clobbered.
    if (
      typeof provider.getValues(fieldId) === "undefined" &&
      typeof initial !== "undefined"
    ) {
      formProvider.setValue(fieldId, initial);
    }
  }, [fieldId, formProvider]);

  useEffect(() => {
    fallbackValue.current = props.value;
  }, [props.value]);

  useEffect(() => {
    const provider = formProvider as FormServiceLike | undefined;
    if (!provider || typeof provider.subscribe !== "function") return;
    // Re-read the provider value on every notification so values set before
    // or after mount are reflected in the rendered control. The revision is
    // bumped unconditionally so validation/error changes that leave the value
    // untouched still re-render the field.
    const syncFromProvider = () => {
      const next = fieldId ? provider.getValues(fieldId) : undefined;
      setFieldState((previous) => ({
        value: next ?? fallbackValue.current ?? "",
        revision: previous.revision + 1,
      }));
    };
    syncFromProvider();
    return provider.subscribe(syncFromProvider);
  }, [fieldId, formProvider]);

  if (!formProvider) {
    console.warn("RgxCrudField requires a formProvider");
    return null;
  }

  const provider = formProvider as FormServiceLike;
  const error =
    fieldId && typeof provider.getFieldError === "function"
      ? provider.getFieldError(fieldId)
      : undefined;
  const errorId = fieldId ? `${fieldId}-error` : undefined;
  const ariaProps: Record<string, string> = error
    ? { "aria-invalid": "true", "aria-describedby": errorId as string }
    : {};

  const handleValueChange = (val: unknown) => {
    setFieldState((previous) => ({
      value: val,
      revision: previous.revision + 1,
    }));
    if (fieldId) {
      formProvider.setValue(fieldId, val);
      provider.markAsDirty?.(fieldId);
      provider.validateField?.(fieldId);
    }
  };

  const handleBlur = () => {
    if (!fieldId) return;
    provider.markAsTouched?.(fieldId);
    provider.validateField?.(fieldId);
  };

  const renderTextInput = () => (
    <input
      id={fieldId}
      name={name}
      type={type}
      value={value as string}
      placeholder={translatedPlaceholder}
      required={required}
      readOnly={readonly}
      disabled={disabled}
      onBlur={handleBlur}
      onChange={(event) => handleValueChange(event.target.value)}
      {...ariaProps}
    />
  );

  const renderTextarea = () => (
    <textarea
      id={fieldId}
      name={name}
      value={value as string}
      placeholder={translatedPlaceholder}
      required={required}
      readOnly={readonly}
      disabled={disabled}
      onBlur={handleBlur}
      onChange={(event) => handleValueChange(event.target.value)}
      {...ariaProps}
    />
  );

  const renderSelect = () => (
    <select
      id={fieldId}
      name={name}
      value={(value as string) ?? ""}
      disabled={disabled}
      onBlur={handleBlur}
      onChange={(event) => handleValueChange(event.target.value)}
      {...ariaProps}
    >
      <option value="" disabled>
        {translatedPlaceholder || "Select option"}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {translateKey(String(option.text))}
        </option>
      ))}
    </select>
  );

  const renderCheckboxGroup = () => {
    const currentValue = Array.isArray(value) ? value : value ? [value] : [];
    const toggleValue = (option: Option) => {
      let updated: string[] = [];
      if (currentValue.includes(option.value)) {
        updated = currentValue.filter((item) => item !== option.value);
      } else {
        updated = [...currentValue, option.value];
      }
      handleValueChange(updated);
    };

    if (!options.length) {
      return (
        <label className="dcf-input-inline">
          <input
            type="checkbox"
            checked={!!value}
            disabled={disabled}
            onBlur={handleBlur}
            onChange={(event) => handleValueChange(event.target.checked)}
            {...ariaProps}
          />
          <span>{translatedLabel}</span>
        </label>
      );
    }

    return (
      <div className="dcf-options-stack" role="group" {...ariaProps}>
        {options.map((option) => (
          <label key={option.value} className="dcf-input-inline">
            <input
              type="checkbox"
              value={option.value}
              disabled={option.disabled || disabled}
              checked={currentValue.includes(option.value)}
              onChange={() => toggleValue(option)}
            />
            <span>{translateKey(String(option.text))}</span>
          </label>
        ))}
      </div>
    );
  };

  const renderRadioGroup = () => (
    <div className="dcf-options-stack" role="group" {...ariaProps}>
      {options.map((option) => (
        <label key={option.value} className="dcf-input-inline">
          <input
            type="radio"
            name={name}
            value={option.value}
            disabled={option.disabled || disabled}
            checked={value === option.value}
            onChange={(event) => handleValueChange(event.target.value)}
          />
          <span>{translateKey(String(option.text))}</span>
        </label>
      ))}
    </div>
  );

  const renderField = () => {
    if (type === "textarea") return renderTextarea();
    if (type === "select") return renderSelect();
    if (type === "checkbox") return renderCheckboxGroup();
    if (type === "radio") return renderRadioGroup();
    return renderTextInput();
  };

  return (
    <div className={`dcf-form-field ${className || ""}`}>
      {label && (
        <label htmlFor={fieldId} className="dcf-form-label">
          {translatedLabel} {required && <span className="dcf-required">*</span>}
        </label>
      )}
      {renderField()}
      {error && (
        <span className="dcf-input-error" id={errorId} role="alert">
          {error}
        </span>
      )}
      {description && <small className="dcf-help-text">{description}</small>}
      {children}
    </div>
  );
};
