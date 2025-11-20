import React, { useEffect, useState } from "react";
import { ControlFieldProps, Option } from "../../engine/types";
import "./crud-field.component.css";

const textTypes = [
  "text",
  "password",
  "number",
  "email",
  "tel",
  "date",
  "time",
  "datetime-local",
  "url",
];

const isTextInput = (type?: string) => (type ? textTypes.includes(type) : true);

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
  const initial = (fieldId ? formProvider?.getValues(fieldId) : undefined) ?? props.value ?? "";
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (fieldId && formProvider) {
      formProvider.setValue(fieldId, initial);
    }
  }, [fieldId]);

  if (!formProvider) {
    console.warn("RgxCrudField requires a formProvider");
    return null;
  }

  const handleValueChange = (val: unknown) => {
    setValue(val);
    if (fieldId) {
      formProvider.setValue(fieldId, val);
    }
  };

  const renderTextInput = () => (
    <input
      id={fieldId}
      name={name}
      type={type}
      value={value as string}
      placeholder={placeholder}
      required={required}
      readOnly={readonly}
      disabled={disabled}
      onChange={(event) => handleValueChange(event.target.value)}
    />
  );

  const renderTextarea = () => (
    <textarea
      id={fieldId}
      name={name}
      value={value as string}
      placeholder={placeholder}
      required={required}
      readOnly={readonly}
      disabled={disabled}
      onChange={(event) => handleValueChange(event.target.value)}
    />
  );

  const renderSelect = () => (
    <select
      id={fieldId}
      name={name}
      value={(value as string) ?? ""}
      disabled={disabled}
      onChange={(event) => handleValueChange(event.target.value)}
    >
      <option value="" disabled>
        {placeholder || "Select option"}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.text}
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
            onChange={(event) => handleValueChange(event.target.checked)}
          />
          <span>{label}</span>
        </label>
      );
    }

    return (
      <div className="dcf-options-stack">
        {options.map((option) => (
          <label key={option.value} className="dcf-input-inline">
            <input
              type="checkbox"
              value={option.value}
              disabled={option.disabled || disabled}
              checked={currentValue.includes(option.value)}
              onChange={() => toggleValue(option)}
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>
    );
  };

  const renderRadioGroup = () => (
    <div className="dcf-options-stack">
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
          <span>{option.text}</span>
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
          {label} {required && <span className="dcf-required">*</span>}
        </label>
      )}
      {renderField()}
      {description && <small className="dcf-help-text">{description}</small>}
      {children}
    </div>
  );
};
