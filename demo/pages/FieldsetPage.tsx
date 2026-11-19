import React, { useMemo } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { RgxModelRenderer } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";
import { FieldSetForm } from "../forms/FieldsetForm";
import "../models/CategoryModel";

export function FieldsetPage() {
  const model = useMemo(() => new FieldSetForm(), []);
  return (
    <section className="app-page" aria-labelledby="fieldset-title">
      <CardTitle title="fieldset.title" subtitle="fieldset.subtitle" />
      <h2 id="fieldset-title" className="app-visually-hidden">
        Fieldset form
      </h2>
      <RgxModelRenderer
        model={model}
        globals={{ operation: OperationKeys.CREATE }}
      />
    </section>
  );
}
