import React, { useCallback, useEffect, useState } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { DashDocument, RgxDashboard, useTranslate } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";
import {
  demoDashboardPalette,
  registerDemoDashboardComponents,
} from "./dashboard-builder/demo-components";

const STORAGE_KEY = "dashboard-builder:composition";

registerDemoDashboardComponents();

function emptyDocument(): DashDocument {
  return {
    name: `Dashboard${Date.now()}`,
    cols: 4,
    rows: 4,
    placements: [],
  };
}

function loadDocument(): DashDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DashDocument) : null;
  } catch {
    return null;
  }
}

function persistDocument(document: DashDocument): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
  } catch {
    /* storage unavailable: keep the in-memory composition */
  }
}

function clearDocument(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

const MODES: readonly { key: OperationKeys; label: string }[] = [
  { key: OperationKeys.CREATE, label: "dashboard-builder.create" },
  { key: OperationKeys.READ, label: "dashboard-builder.read" },
  { key: OperationKeys.UPDATE, label: "dashboard-builder.update" },
  { key: OperationKeys.DELETE, label: "dashboard-builder.delete" },
];

export function DashboardBuilderPage() {
  const translate = useTranslate();
  const [mode, setMode] = useState<OperationKeys>(OperationKeys.CREATE);
  const [document, setDocument] = useState<DashDocument | null>(null);
  const [saved, setSaved] = useState<DashDocument | null>(null);
  const [compositionKey, setCompositionKey] = useState(0);

  useEffect(() => {
    setDocument(loadDocument());
  }, []);

  const setOperation = useCallback((operation: OperationKeys) => {
    setMode(operation);
    if (
      operation === OperationKeys.READ ||
      operation === OperationKeys.UPDATE ||
      operation === OperationKeys.DELETE
    ) {
      setDocument(loadDocument() ?? emptyDocument());
    }
  }, []);

  const newDashboard = useCallback(() => {
    setDocument(emptyDocument());
    setSaved(null);
    setMode(OperationKeys.CREATE);
    setCompositionKey((value) => value + 1);
  }, []);

  const handleSave = useCallback((next: DashDocument) => {
    setDocument(next);
    setSaved(next);
    persistDocument(next);
    setMode(OperationKeys.READ);
  }, []);

  const handleDelete = useCallback(() => {
    clearDocument();
    setDocument(null);
    setSaved(null);
    setMode(OperationKeys.CREATE);
    setCompositionKey((value) => value + 1);
  }, []);

  return (
    <section
      className="app-page dashboard-builder"
      aria-labelledby="dashboard-builder-title"
    >
      <CardTitle title="dashboard-builder.title" subtitle="dashboard.subtitle" />
      <h2 id="dashboard-builder-title" className="app-visually-hidden">
        {translate("dashboard-builder.title")}
      </h2>

      <div
        className="dashboard-builder__toolbar"
        role="toolbar"
        aria-label={translate("dashboard-builder.title")}
      >
        {MODES.map((entry) => {
          const isActive = mode === entry.key;
          const onClick =
            entry.key === OperationKeys.CREATE
              ? newDashboard
              : () => setOperation(entry.key);
          return (
            <button
              key={entry.key}
              type="button"
              className={[
                "dashboard-builder__mode",
                isActive ? "active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={isActive}
              onClick={onClick}
            >
              {translate(entry.label)}
            </button>
          );
        })}
      </div>

      <div className="dashboard-builder__canvas">
        <RgxDashboard
          key={compositionKey}
          operation={mode}
          document={
            mode === OperationKeys.CREATE ? undefined : document ?? undefined
          }
          cols={4}
          rows={4}
          palette={demoDashboardPalette}
          onSave={handleSave}
          onDeleted={handleDelete}
        />
      </div>

      {saved ? (
        <output className="dashboard-builder__saved" aria-live="polite">
          {translate("dashboard-builder.saved")}
        </output>
      ) : null}
    </section>
  );
}
