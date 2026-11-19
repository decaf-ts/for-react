import React, { useState } from "react";
import { MathInput } from "../../src/math";
import { useTranslate } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";

const DEFAULT_VALUE = "\\frac{a}{b}";

export function MathPage() {
  const translate = useTranslate();
  const [value, setValue] = useState(DEFAULT_VALUE);
  const [placeholder, setPlaceholder] = useState("\\frac{a}{b}");
  const [disabled, setDisabled] = useState(false);

  const reset = () => {
    setValue(DEFAULT_VALUE);
    setPlaceholder("\\frac{a}{b}");
    setDisabled(false);
  };

  return (
    <section className="app-page math-page" aria-labelledby="math-title">
      <CardTitle title="math.title" subtitle="math.intro" />
      <h2 id="math-title" className="app-visually-hidden">
        {translate("math.title")}
      </h2>

      <div className="math-page__layout">
        <section
          className="math-page__controls"
          aria-label={translate("math.title")}
        >
          <label className="math-page__field">
            <span>{translate("math.value_label")}</span>
            <textarea
              data-testid="math-value"
              rows={2}
              value={value}
              placeholder={translate("math.value_placeholder")}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>

          <label className="math-page__field">
            <span>{translate("math.placeholder_label")}</span>
            <input
              data-testid="math-placeholder"
              type="text"
              value={placeholder}
              onChange={(event) => setPlaceholder(event.target.value)}
            />
          </label>

          <label className="math-page__toggle">
            <input
              data-testid="math-disabled"
              type="checkbox"
              checked={disabled}
              onChange={(event) => setDisabled(event.target.checked)}
            />
            <span>{translate("math.disabled_label")}</span>
          </label>

          <button
            type="button"
            className="math-page__reset"
            data-testid="math-reset"
            onClick={reset}
          >
            {translate("math.reset")}
          </button>
        </section>

        <section
          className="math-page__preview"
          aria-label={translate("math.preview_label")}
        >
          <label className="math-page__field">
            <span>{translate("math.preview_label")}</span>
            <MathInput
              value={value}
              placeholder={placeholder}
              disabled={disabled}
              onChange={setValue}
              onValueChange={setValue}
            />
          </label>

          <h3>{translate("math.output_label")}</h3>
          <output
            className="math-page__output"
            data-testid="math-output"
            aria-live="polite"
          >
            {value || translate("math.empty")}
          </output>

          <p className="math-page__note">{translate("math.note")}</p>
        </section>
      </div>
    </section>
  );
}
