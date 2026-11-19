import React, { useMemo } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { RgxModelRenderer } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";
import { SteppedForm } from "../forms/SteppedForm";
import "../models/CategoryModel";

export function StepsFormPage() {
  const model = useMemo(() => new SteppedForm({}), []);
  return (
    <section className="app-page" aria-labelledby="steps-form-title">
      <CardTitle title="steps_form.title" subtitle="steps_form.subtitle" />
      <h2 id="steps-form-title" className="app-visually-hidden">
        Stepped form
      </h2>
      <RgxModelRenderer
        model={model}
        globals={{ operation: OperationKeys.CREATE }}
      />
    </section>
  );
}
