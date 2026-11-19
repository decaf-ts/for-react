import React, { useState } from "react";
import { CronBuilder, CronSelector } from "../../src/cron";
import { useTranslate } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";

export function CronPage() {
  const translate = useTranslate();
  const [selectorValue, setSelectorValue] = useState("0 9 * * *");
  const [builderValue, setBuilderValue] = useState("0 9 * * *");
  const [describeCron, setDescribeCron] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [hideDaily, setHideDaily] = useState(false);
  const [hideInterval, setHideInterval] = useState(false);
  const [hideWeekly, setHideWeekly] = useState(false);

  return (
    <section className="app-page cron-page" aria-labelledby="cron-title">
      <CardTitle title="cron.title" subtitle="cron.intro" />
      <h2 id="cron-title" className="app-visually-hidden">
        {translate("cron.title")}
      </h2>

      <fieldset className="cron-page__controls">
        <legend>{translate("cron.options_label")}</legend>
        <label className="cron-page__toggle">
          <input
            type="checkbox"
            checked={describeCron}
            onChange={(event) => setDescribeCron(event.target.checked)}
          />
          <span>{translate("cron.describe_label")}</span>
        </label>
        <label className="cron-page__toggle">
          <input
            type="checkbox"
            checked={disabled}
            onChange={(event) => setDisabled(event.target.checked)}
          />
          <span>{translate("cron.disabled_label")}</span>
        </label>
        <label className="cron-page__toggle">
          <input
            type="checkbox"
            checked={hideDaily}
            onChange={(event) => setHideDaily(event.target.checked)}
          />
          <span>{translate("cron.hide_daily")}</span>
        </label>
        <label className="cron-page__toggle">
          <input
            type="checkbox"
            checked={hideInterval}
            onChange={(event) => setHideInterval(event.target.checked)}
          />
          <span>{translate("cron.hide_interval")}</span>
        </label>
        <label className="cron-page__toggle">
          <input
            type="checkbox"
            checked={hideWeekly}
            onChange={(event) => setHideWeekly(event.target.checked)}
          />
          <span>{translate("cron.hide_weekly")}</span>
        </label>
      </fieldset>

      <div className="cron-page__layout">
        <section
          className="cron-page__panel"
          aria-label={translate("cron.selector_label")}
        >
          <h3>{translate("cron.selector_label")}</h3>
          <CronSelector
            value={selectorValue}
            describeCron={describeCron}
            disabled={disabled}
            hideDaily={hideDaily}
            hideInterval={hideInterval}
            hideWeekly={hideWeekly}
            onChange={setSelectorValue}
          />
          <output className="cron-page__output" aria-live="polite">
            {selectorValue}
          </output>
        </section>

        <section
          className="cron-page__panel"
          aria-label={translate("cron.builder_label")}
        >
          <h3>{translate("cron.builder_label")}</h3>
          <CronBuilder
            label="cron.builder_field_label"
            value={builderValue}
            describeCron={describeCron}
            disabled={disabled}
            multiple={true}
            hideDaily={hideDaily}
            hideInterval={hideInterval}
            hideWeekly={hideWeekly}
            onChange={setBuilderValue}
          />
          <output className="cron-page__output" aria-live="polite">
            {builderValue}
          </output>
        </section>
      </div>

      <p className="cron-page__note">{translate("cron.note")}</p>
    </section>
  );
}
