import React, { useEffect, useState } from "react";
import type { RgxFormService } from "../../src/lib";
import { useTranslate } from "../../src/lib";

export interface ExpiryDateFieldProps {
  name?: string;
  formProvider: RgxFormService;
  locale?: string;
}

function lastDayOfMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return `${new Date(year, month, 0).getDate()}`;
}

function parseCalendarInputValue(
  date: string,
  enableDaySelection: boolean
): string {
  const result = date
    .split("-")
    .map((part, index) => (index === 0 ? part.slice(2) : part));
  if (result.length === 2) {
    result.push(
      enableDaySelection
        ? lastDayOfMonth(result.join("-"))
        : "00"
    );
  }
  return result.join("");
}

export function revertGs1ToDateValue(
  date: string,
  enableDaySelection: boolean
): string {
  const year = 2000 + Number(date.slice(0, 2));
  const month = Number(date.slice(2, 4));
  let day = Number(date.slice(4, 6));
  if (!enableDaySelection || day === 0) {
    day = Number(lastDayOfMonth(`${year}-${month}`));
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

export function ExpiryDateField({
  name = "expiryDate",
  formProvider,
  locale = "expiry",
}: ExpiryDateFieldProps) {
  const translate = useTranslate();
  const [enableDaySelection, setEnableDaySelection] = useState(true);
  const [value, setValue] = useState("");

  useEffect(() => {
    formProvider.setValue(name, value);
  }, [formProvider, name, value]);

  const gs1Value = value ? parseCalendarInputValue(value, enableDaySelection) : "";

  return (
    <div className="app-expiry-field">
      <label htmlFor={`${name}-input`}>
        {translate(`${locale}.date.label`)}
      </label>
      <input
        id={`${name}-input`}
        name={name}
        type="date"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <label className="app-inline-check">
        <input
          type="checkbox"
          checked={enableDaySelection}
          onChange={(event) => setEnableDaySelection(event.target.checked)}
        />
        <span>{translate(`${locale}.day_selection.label`)}</span>
      </label>
      <output aria-live="polite">
        {translate(`${locale}.gs1.label`)}:{" "}
        <strong>{gs1Value || translate(`${locale}.empty`)}</strong>
      </output>
    </div>
  );
}
