import React, { useMemo, useState } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { Model } from "@decaf-ts/decorator-validation";
import { RgxCard, RgxModelRenderer } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";
import { CategoryModel } from "../models/CategoryModel";
import { DemoModel } from "../models/DemoModel";
import { EmployeeModel } from "../models/EmployeeModel";

type ModelName = "CategoryModel" | "DemoModel" | "EmployeeModel";

const modelOptions: { name: ModelName; label: string }[] = [
  { name: "CategoryModel", label: "Category" },
  { name: "DemoModel", label: "Demo" },
  { name: "EmployeeModel", label: "Employee" },
];

const operations: OperationKeys[] = [
  OperationKeys.CREATE,
  OperationKeys.READ,
  OperationKeys.UPDATE,
  OperationKeys.DELETE,
];

function buildInstance(name: ModelName): Model {
  switch (name) {
    case "CategoryModel":
      return new CategoryModel({
        id: 1,
        name: "Seasonal",
        description: "Seasonal products",
        sets: "month",
      });
    case "EmployeeModel":
      return new EmployeeModel({
        id: 1,
        name: "Jane Doe",
        occupation: "Frontend Developer",
      });
    default:
      return new DemoModel({
        id: 1,
        name: "Demerson Carvalho",
        gender: "Male",
        contact: "morning",
        birthdate: new Date("1989-12-12"),
        email: "john.doe@example.com",
        website: "https://johndoe.example.com",
        password: "password123",
        agree: "on",
      });
  }
}

export function ModelPage() {
  const [modelName, setModelName] = useState<ModelName>("CategoryModel");
  const [operation, setOperation] = useState<OperationKeys>(
    OperationKeys.CREATE
  );
  const model = useMemo(() => buildInstance(modelName), [modelName]);

  return (
    <section className="app-page" aria-labelledby="model-title">
      <CardTitle title="model.title" subtitle="model.subtitle" />
      <h2 id="model-title" className="app-visually-hidden">
        Model page
      </h2>
      <div className="app-toolbar">
        <label htmlFor="model-select">Model</label>
        <select
          id="model-select"
          value={modelName}
          onChange={(event) => setModelName(event.target.value as ModelName)}
        >
          {modelOptions.map((option) => (
            <option key={option.name} value={option.name}>
              {option.label}
            </option>
          ))}
        </select>
        <label htmlFor="operation-select">Operation</label>
        <select
          id="operation-select"
          value={operation}
          onChange={(event) =>
            setOperation(event.target.value as OperationKeys)
          }
        >
          {operations.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      </div>
      <RgxCard type="shadow">
        <RgxModelRenderer model={model} globals={{ operation }} />
      </RgxCard>
    </section>
  );
}
