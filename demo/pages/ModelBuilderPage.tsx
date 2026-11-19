import React, { useState } from "react";
import { RgxCard, RgxModelBuilder } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";

export function ModelBuilderPage() {
  const [definition, setDefinition] = useState<Record<string, unknown> | null>(
    null
  );
  return (
    <section className="app-page" aria-labelledby="model-builder-title">
      <CardTitle
        title="model_builder.title"
        subtitle="model_builder.subtitle"
      />
      <h2 id="model-builder-title" className="app-visually-hidden">
        Model builder
      </h2>
      <RgxCard type="shadow">
        <RgxModelBuilder
          preview
          onBuild={(built) => setDefinition(built)}
          onChange={(changed) => setDefinition(changed)}
        />
      </RgxCard>
      {definition ? (
        <RgxCard title="model_builder.definition" type="clear">
          <pre className="app-json">{JSON.stringify(definition, null, 2)}</pre>
        </RgxCard>
      ) : null}
    </section>
  );
}
