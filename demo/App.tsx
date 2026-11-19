import React from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useTranslate } from "../src/lib";
import { Header } from "./components/Header";
import { AppMenu } from "./constants";
import { DashboardPage } from "./pages/DashboardPage";
import { DashboardBuilderPage } from "./pages/DashboardBuilderPage";
import { CrudPage } from "./pages/CrudPage";
import { FieldsetPage } from "./pages/FieldsetPage";
import { StepsFormPage } from "./pages/StepsFormPage";
import { ModelBuilderPage } from "./pages/ModelBuilderPage";
import { ListModelPage } from "./pages/ListModelPage";
import { ModelPage } from "./pages/ModelPage";
import { LoginPage } from "./pages/LoginPage";
import { ComponentsPage } from "./pages/ComponentsPage";
import { CodeEditorPage } from "./pages/CodeEditorPage";
import { BarcodePage } from "./pages/BarcodePage";
import { MathPage } from "./pages/MathPage";
import { CronPage } from "./pages/CronPage";
import { GanttPage } from "./pages/GanttPage";
import { CalendarPage } from "./pages/CalendarPage";
import { KanbanPage } from "./pages/KanbanPage";
import { ScrumPage } from "./pages/ScrumPage";
import { StoryboardPage } from "./pages/StoryboardPage";
import { ChartsPage } from "./pages/ChartsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

const titles: Record<string, string> = {
  "/": "menu.dashboard",
  "/crud": "menu.crud",
  "/fieldset": "menu.fieldset",
  "/steps-form": "menu.steps_form",
  "/model-builder": "menu.model_builder",
  "/dashboard-builder": "dashboard-builder.title",
  "/list-model": "menu.list_model",
  "/model": "menu.model",
  "/components": "menu.components",
  "/code-editor": "menu.code_editor",
  "/barcode": "menu.barcode",
  "/math": "menu.math",
  "/cron": "menu.cron",
  "/gantt": "Gantt",
  "/calendar": "menu.calendar",
  "/kanban": "menu.kanban",
  "/scrum": "menu.scrum",
  "/storyboard": "menu.storyboard",
  "/charts": "menu.charts",
  "/login": "menu.login",
};

export function App() {
  const location = useLocation();
  const titleKey = titles[location.pathname] || "menu.not_found";
  const isLogin = location.pathname === "/login";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="app-sidebar" aria-label="Demo navigation">
        <nav>
          <ul className="app-menu">
            {AppMenu.map((item) => (
              <li key={item.url}>
                <NavItem to={item.url as string} labelKey={item.label} />
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="app-main-column">
        <Header titleKey={titleKey} showBackButton={!isLogin} />
        <main id="main-content" className="app-content" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/crud" element={<CrudPage />} />
            <Route path="/fieldset" element={<FieldsetPage />} />
            <Route path="/steps-form" element={<StepsFormPage />} />
            <Route path="/model-builder" element={<ModelBuilderPage />} />
            <Route path="/dashboard-builder" element={<DashboardBuilderPage />} />
            <Route path="/list-model" element={<ListModelPage />} />
            <Route path="/model" element={<ModelPage />} />
            <Route path="/components" element={<ComponentsPage />} />
            <Route path="/code-editor" element={<CodeEditorPage />} />
            <Route path="/barcode" element={<BarcodePage />} />
            <Route path="/math" element={<MathPage />} />
            <Route path="/cron" element={<CronPage />} />
            <Route path="/gantt" element={<GanttPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/scrum" element={<ScrumPage />} />
            <Route path="/storyboard" element={<StoryboardPage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, labelKey }: { to: string; labelKey: string }) {
  const translate = useTranslate();
  return (
    <NavLink
      className={({ isActive }) =>
        isActive ? "app-menu-link active" : "app-menu-link"
      }
      to={to}
    >
      {translate(labelKey)}
    </NavLink>
  );
}
