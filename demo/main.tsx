import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "../node_modules/@decaf-ts/styles/dist/main.min.css";
import "../src/lib/components/card/card.component.css";
import "../src/lib/components/crud-field/crud-field.component.css";
import "../src/lib/components/crud-form/crud-form.component.css";
import "../src/lib/components/dashboard/dashboard.component.css";
import "../src/lib/components/empty-state/empty-state.component.css";
import "../src/lib/components/icon/icon.component.css";
import "../src/lib/components/layout/layout.component.css";
import "../src/lib/components/pagination/pagination.component.css";
import "../src/lib/components/searchbar/searchbar.component.css";
import {
  registerDefaultComponents,
  RgxI18nProvider,
  useI18nLoaded,
} from "../src/lib";
import { App } from "./App";
import "./styles.css";

registerDefaultComponents();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");

function TranslationGate() {
  const loaded = useI18nLoaded();
  if (!loaded) {
    return (
      <p className="app-loading" role="status" aria-live="polite">
        Loading…
      </p>
    );
  }
  return <App />;
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RgxI18nProvider
      lang="en"
      fallbackLang="en"
      resources={[{ prefix: "/i18n/", suffix: ".json" }]}
    >
      <BrowserRouter>
        <TranslationGate />
      </BrowserRouter>
    </RgxI18nProvider>
  </React.StrictMode>
);
