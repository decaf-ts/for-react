/**
 * @file
 * @summary DSW-style settings drawer or panel.
 * @description Renders the `DswSettingsDrawer` agent chat component and its props contract.
 */
import React, { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Model } from "@decaf-ts/decorator-validation";
import { RgxModelRenderer } from "../../../lib/components/model-renderer/RgxModelRenderer.js";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";

/**
 * @description Constructor form of a model entry accepted by
 * {@link DswSettingsDrawer}.
 * @summary Builds a decaf model instance for the settings form.
 * @memberOf module:for-react.agent
 */
export interface DswSettingsModelConstructor {
  /**
   * Builds a model instance for the settings form.
   *
   * @param arg - Optional constructor argument forwarded by the renderer.
   * @returns The model instance rendered by the form.
   */
  new (arg?: unknown): Model;
}

/**
 * @description Model entry accepted by {@link DswSettingsDrawer}: a name, a
 * decaf model instance, or a model constructor.
 * @memberOf module:for-react.agent
 */
export type DswSettingsModel = string | Model | DswSettingsModelConstructor;

/**
 * @description Props accepted by {@link DswSettingsDrawer}.
 * @summary Declares every input the DswSettingsDrawer component understands.
 * @memberOf module:for-react.agent
 * @property {boolean} [open] - Whether the surface is open.
 * @property {Array} [models] - Models offered by the selector.
 * @property {string} [variant] - Component presentation variant.
 * @property {string} [titleKey] - Translation key for the title.
 * @property {string} [titleFallback] - English fallback for the title.
 * @property {string} [emptyKey] - Translation key for the empty label.
 * @property {string} [emptyFallback] - English fallback for the empty label.
 * @property {string} [closeLabelKey] - Translation key for the close label.
 * @property {string} [closeLabelFallback] - English fallback for the close label.
 * @property {function} [onOpenChange] - Called when the open state changes.
 * @property {function} [onDismiss] - Called when the drawer is dismissed.
 * @property {ReactNode} [children] - Child content rendered by the component.
 */
export interface DswSettingsDrawerProps {
  open?: boolean;
  models?: DswSettingsModel[];
  variant?: "drawer" | "panel";
  titleKey?: string;
  titleFallback?: string;
  emptyKey?: string;
  emptyFallback?: string;
  closeLabelKey?: string;
  closeLabelFallback?: string;
  onOpenChange?: (open: boolean) => void;
  onDismiss?: () => void;
  children?: ReactNode;
}

function toRenderable(model: DswSettingsModel): string | Model {
  if (typeof model === "string") return model;
  if (model instanceof Model) return model;
  try {
    return new (model as new (arg?: unknown) => Model)({});
  } catch {
    return (model as new (arg?: unknown) => Model).name;
  }
}

/**
 * @description DSW-style settings drawer or panel.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function DswSettingsDrawer({
  open = false,
  models = [],
  variant = "drawer",
  titleKey = "agent.dsw.settings.title",
  titleFallback = "Settings",
  emptyKey = "agent.dsw.settings.empty",
  emptyFallback = "No settings available",
  closeLabelKey = "agent.dsw.settings.close",
  closeLabelFallback = "Close settings",
  onOpenChange,
  onDismiss,
  children,
}: DswSettingsDrawerProps) {
  const t = useAgentTranslate();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const renderables = useMemo(
    () => models.map((model) => toRenderable(model)),
    [models]
  );
  const hasModels = renderables.length > 0;

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  const closeDrawer = () => {
    onOpenChange?.(false);
    onDismiss?.();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDocumentKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onOpenChange?.(false);
      onDismiss?.();
    };
    document.addEventListener("keydown", onDocumentKeydown);
    return () => document.removeEventListener("keydown", onDocumentKeydown);
  }, [open, onOpenChange, onDismiss]);

  if (!open) return null;

  return (
    <>
      {variant === "drawer" ? (
        <div
          className="dcf-dsw-settings-drawer__scrim"
          aria-hidden="true"
          onClick={closeDrawer}
        />
      ) : null}

      <aside
        className={`dcf-dsw-settings-drawer${variant === "panel" ? " dcf-dsw-settings-drawer--panel" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t(titleKey, titleFallback)}
      >
        <header className="dcf-dsw-settings-drawer__header">
          <h2 className="dcf-dsw-settings-drawer__title">
            {t(titleKey, titleFallback)}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="dcf-dsw-settings-drawer__close"
            aria-label={t(closeLabelKey, closeLabelFallback)}
            title={t(closeLabelKey, closeLabelFallback)}
            onClick={closeDrawer}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="dcf-dsw-settings-drawer__body">
          {!hasModels ? (
            <p className="dcf-dsw-settings-drawer__empty" role="status">
              {t(emptyKey, emptyFallback)}
            </p>
          ) : (
            renderables.map((model, index) => (
              <section className="dcf-dsw-settings-drawer__card" key={index}>
                <RgxModelRenderer model={model} />
              </section>
            ))
          )}
          {children}
        </div>
      </aside>
    </>
  );
}

/**
 * @description Named alias of {@link DswSettingsDrawer} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const DswSettingsDrawerComponent = DswSettingsDrawer;
