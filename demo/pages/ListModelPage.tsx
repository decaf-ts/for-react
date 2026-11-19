import React, { useMemo, useState } from "react";
import { RgxCard, RgxList } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";
import { AIModel, AIVendorModel } from "../models/AIVendorModel";

type ListType = "infinite" | "paginated";

const vendorData = [
  { id: "1", name: "google", models: "Gemini, PaLM" },
  { id: "2", name: "openai", models: "GPT-4, o1" },
  { id: "3", name: "anthropic", models: "Claude" },
  { id: "4", name: "mistralai", models: "Mistral Large" },
  { id: "5", name: "ollama", models: "Llama, Qwen" },
  { id: "6", name: "perplexity", models: "Sonar" },
];

const modelData = [
  { id: "1", name: "Gemini", features: "chat, reasoning" },
  { id: "2", name: "GPT-4", features: "chat, coding" },
  { id: "3", name: "Claude", features: "chat, translation" },
  { id: "4", name: "Mistral Large", features: "chat, planning" },
  { id: "5", name: "Llama", features: "chat" },
  { id: "6", name: "Qwen", features: "coding" },
];

export function ListModelPage() {
  const [type, setType] = useState<ListType>("infinite");
  const tabs = useMemo(
    () => [
      { title: "list_model.infinite", value: "infinite" },
      { title: "list_model.paginated", value: "paginated" },
    ],
    []
  );
  const active = type === "infinite" ? 0 : 1;

  return (
    <section className="app-page" aria-labelledby="list-model-title">
      <CardTitle
        title="list_model.title"
        subtitle="list_model.subtitle"
        tabs={tabs}
        activeTab={active}
        onTabChange={(index) =>
          setType(index === 0 ? "infinite" : "paginated")
        }
      />
      <h2 id="list-model-title" className="app-visually-hidden">
        Model lists
      </h2>
      <RgxCard type="shadow">
        <RgxList
          type={type}
          model={type === "infinite" ? AIVendorModel : AIModel}
          data={type === "infinite" ? vendorData : modelData}
          mapper={{ title: "name", description: "models" }}
          pageSize={4}
          showRefresher={false}
          enableFilter={false}
        />
      </RgxCard>
    </section>
  );
}
