import React, { useMemo } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { RgxModelRenderer } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";
import { DashboardLayout } from "../layouts/Dashboard";
import "../models/EmployeeModel";
import "../models/CategoryModel";

export function DashboardPage() {
  const model = useMemo(() => new DashboardLayout(), []);
  return (
    <section className="app-page" aria-labelledby="dashboard-title">
      <CardTitle
        title="dashboard.title"
        subtitle="dashboard.subtitle"
      />
      <h2 id="dashboard-title" className="app-visually-hidden">
        Dashboard
      </h2>
      <div className="app-dashboard-layout">
        <RgxModelRenderer
          model={model}
          globals={{ operation: OperationKeys.CREATE }}
        />
      </div>
    </section>
  );
}
