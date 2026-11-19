import React, { useState } from "react";
import { RgxCard } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";
import { DemoForm, DemoFormField } from "../components/DemoForm";
import "../models/DemoModel";

const fields: DemoFormField[] = [
  { name: "id", label: "demo.id.label", type: "number", required: true },
  { name: "name", label: "demo.name.label", required: true },
  {
    name: "gender",
    label: "demo.gender.label",
    type: "select",
    required: true,
    options: [
      { text: "male", value: "male" },
      { text: "female", value: "female" },
    ],
  },
  {
    name: "contact",
    label: "demo.contact.label",
    type: "select",
    required: true,
    options: [
      { text: "morning", value: "morning" },
      { text: "afternoon", value: "afternoon" },
      { text: "evening", value: "evening" },
      { text: "all", value: "all" },
    ],
  },
  { name: "birthdate", label: "demo.birthdate.label", type: "date" },
  { name: "email", label: "demo.email.label", type: "email" },
  { name: "website", label: "demo.website.label", type: "url" },
  {
    name: "password",
    label: "demo.password.label",
    type: "password",
  },
  { name: "agree", label: "demo.agree.label", type: "checkbox" },
];

export function CrudPage() {
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
    null
  );

  return (
    <section className="app-page" aria-labelledby="crud-title">
      <CardTitle title="crud.title" subtitle="crud.subtitle" />
      <h2 id="crud-title" className="app-visually-hidden">
        CRUD form
      </h2>
      <RgxCard type="shadow">
        <DemoForm
          id="demo-crud-form"
          fields={fields}
          initialValues={{
            id: 1,
            name: "Demerson Carvalho",
            gender: "male",
          }}
          submitLabel="common.submit"
          onSubmit={(data) => setSubmitted(data)}
        />
      </RgxCard>
      {submitted ? (
        <RgxCard title="crud.submitted" type="clear">
          <pre className="app-json">{JSON.stringify(submitted, null, 2)}</pre>
        </RgxCard>
      ) : null}
    </section>
  );
}
