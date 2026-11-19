/**
 * @file
 * @summary Collapsible DSW session/plugin sidebar with slot-based sections.
 * @description Renders the `DswSidebar` agent chat component and its props contract.
 */
import React, { useId, type ReactNode } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";

/**
 * @description Plugin status rendered by {@link DswSidebar}.
 * @memberOf module:for-react.agent
 */
export type DswSidebarPluginState = "active" | "inactive" | "error";

/**
 * @description Display status of one sidebar plugin.
 * @memberOf module:for-react.agent
 */
export interface DswSidebarPluginStatus {
  /** Stable plugin id. */
  id: string;
  /** Display label. */
  label: string;
  /** Current plugin status. */
  state: DswSidebarPluginState;
  /** Optional supporting detail. */
  detail?: string;
}

/**
 * @description Props accepted by {@link DswSidebar}.
 * @summary Declares every input the DswSidebar component understands.
 * @memberOf module:for-react.agent
 * @property {boolean} [collapsed] - Whether the sidebar is collapsed.
 * @property {boolean} [collapsible] - Whether the sidebar can be collapsed.
 * @property {string} [title] - Title text.
 * @property {string} [titleKey] - Translation key for the title.
 * @property {string} [titleFallback] - English fallback for the title.
 * @property {string} [newSessionLabelKey] - Translation key for the new-session label.
 * @property {string} [newSessionLabelFallback] - English fallback for the new-session label.
 * @property {boolean} [newSessionDisabled] - Whether the new-session action is disabled.
 * @property {Array} [plugins] - Plugin statuses rendered by the sidebar.
 * @property {boolean} [showPluginStatus] - Whether plugin status is shown.
 * @property {string} [ariaLabelKey] - Translation key for the accessible label.
 * @property {string} [ariaLabelFallback] - English fallback for the accessible label.
 * @property {string} [sessionsLabelKey] - Translation key for the sessions label.
 * @property {string} [sessionsLabelFallback] - English fallback for the sessions label.
 * @property {string} [pluginsLabelKey] - Translation key for the plugins label.
 * @property {string} [pluginsLabelFallback] - English fallback for the plugins label.
 * @property {string} [collapseLabelKey] - Translation key for the collapse label.
 * @property {string} [collapseLabelFallback] - English fallback for the collapse label.
 * @property {string} [expandLabelKey] - Translation key for the expand label.
 * @property {string} [expandLabelFallback] - English fallback for the expand label.
 * @property {ReactNode} [brandSlot] - Custom brand node in the sidebar header.
 * @property {ReactNode} [sessionsSlot] - Custom sessions node.
 * @property {ReactNode} [footerSlot] - Custom footer node.
 * @property {function} [onNewSession] - Called when a new session is requested.
 * @property {function} [onPluginOpen] - Called when a plugin is opened.
 * @property {function} [onCollapseChange] - Called when the collapse state changes.
 */
export interface DswSidebarProps {
  collapsed?: boolean;
  collapsible?: boolean;
  title?: string;
  titleKey?: string;
  titleFallback?: string;
  newSessionLabelKey?: string;
  newSessionLabelFallback?: string;
  newSessionDisabled?: boolean;
  plugins?: DswSidebarPluginStatus[];
  showPluginStatus?: boolean;
  ariaLabelKey?: string;
  ariaLabelFallback?: string;
  sessionsLabelKey?: string;
  sessionsLabelFallback?: string;
  pluginsLabelKey?: string;
  pluginsLabelFallback?: string;
  collapseLabelKey?: string;
  collapseLabelFallback?: string;
  expandLabelKey?: string;
  expandLabelFallback?: string;
  brandSlot?: ReactNode;
  sessionsSlot?: ReactNode;
  footerSlot?: ReactNode;
  onNewSession?: () => void;
  onPluginOpen?: (plugin: DswSidebarPluginStatus) => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

function pluginStateFallback(state: DswSidebarPluginState): string {
  switch (state) {
    case "active":
      return "Active";
    case "error":
      return "Error";
    default:
      return "Inactive";
  }
}

function pluginStateKey(state: DswSidebarPluginState): string {
  return `agent.dsw.sidebar.plugin.${state}`;
}

/**
 * @description Collapsible DSW session/plugin sidebar with slot-based sections.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function DswSidebar({
  collapsed = false,
  collapsible = true,
  title = "",
  titleKey = "",
  titleFallback = "Harness",
  newSessionLabelKey = "agent.dsw.sidebar.newSession",
  newSessionLabelFallback = "New session",
  newSessionDisabled = false,
  plugins = [],
  showPluginStatus = true,
  ariaLabelKey = "",
  ariaLabelFallback = "Sidebar",
  sessionsLabelKey = "agent.dsw.sidebar.sessions",
  sessionsLabelFallback = "Sessions",
  pluginsLabelKey = "agent.dsw.sidebar.plugins",
  pluginsLabelFallback = "Plugin status",
  collapseLabelKey = "agent.dsw.sidebar.collapse",
  collapseLabelFallback = "Collapse sidebar",
  expandLabelKey = "agent.dsw.sidebar.expand",
  expandLabelFallback = "Expand sidebar",
  brandSlot,
  sessionsSlot,
  footerSlot,
  onNewSession,
  onPluginOpen,
  onCollapseChange,
}: DswSidebarProps) {
  const t = useAgentTranslate();
  const instance = useId();
  const sessionsId = `dsw-sidebar-${instance}-sessions`;

  const toggleLabelKey = collapsed ? expandLabelKey : collapseLabelKey;
  const toggleLabelFallback = collapsed
    ? expandLabelFallback
    : collapseLabelFallback;

  return (
    <nav
      className={`dcf-dsw-sidebar${collapsed ? " dcf-dsw-sidebar--collapsed" : ""}`}
      aria-label={t(ariaLabelKey || "", ariaLabelFallback)}
    >
      <div className="dcf-dsw-sidebar__top">
        <div className="dcf-dsw-sidebar__brand">
          <span className="dcf-dsw-sidebar__brand-slot">{brandSlot}</span>
          <span className="dcf-dsw-sidebar__brand-name">
            {t(titleKey || "", title || titleFallback)}
          </span>
        </div>

        {collapsible ? (
          <button
            type="button"
            className="dcf-dsw-sidebar__toggle"
            aria-expanded={!collapsed}
            aria-controls={sessionsId}
            aria-label={t(toggleLabelKey, toggleLabelFallback)}
            title={t(toggleLabelKey, toggleLabelFallback)}
            onClick={() => onCollapseChange?.(!collapsed)}
          >
            <span className="dcf-dsw-sidebar__toggle-glyph" aria-hidden="true">
              {collapsed ? "›" : "‹"}
            </span>
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="dcf-dsw-sidebar__new-session"
        disabled={newSessionDisabled}
        aria-label={t(newSessionLabelKey, newSessionLabelFallback)}
        onClick={() => onNewSession?.()}
      >
        <span className="dcf-dsw-sidebar__new-session-glyph" aria-hidden="true">
          +
        </span>
        <span className="dcf-dsw-sidebar__new-session-label">
          {t(newSessionLabelKey, newSessionLabelFallback)}
        </span>
      </button>

      <div
        className="dcf-dsw-sidebar__region"
        id={sessionsId}
        role="region"
        aria-label={t(sessionsLabelKey, sessionsLabelFallback)}
      >
        {sessionsSlot}
      </div>

      {showPluginStatus ? (
        <ul
          className="dcf-dsw-sidebar__plugins"
          aria-label={t(pluginsLabelKey, pluginsLabelFallback)}
        >
          {plugins.map((plugin) => (
            <li className="dcf-dsw-sidebar__plugin" key={plugin.id}>
              <button
                type="button"
                className="dcf-dsw-sidebar__plugin-button"
                aria-label={`${plugin.label}: ${t(pluginStateKey(plugin.state), pluginStateFallback(plugin.state))}`}
                title={plugin.detail || plugin.label}
                onClick={() => onPluginOpen?.(plugin)}
              >
                <span
                  className={`dcf-dsw-sidebar__plugin-dot dcf-dsw-sidebar__plugin-dot--${plugin.state}`}
                  aria-hidden="true"
                />
                <span className="dcf-dsw-sidebar__plugin-label">
                  {plugin.label}
                </span>
                <span className="dcf-dsw-sidebar__plugin-state">
                  {t(
                    pluginStateKey(plugin.state),
                    pluginStateFallback(plugin.state)
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="dcf-dsw-sidebar__footer">{footerSlot}</div>
    </nav>
  );
}

/**
 * @description Named alias of {@link DswSidebar} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const DswSidebarComponent = DswSidebar;
