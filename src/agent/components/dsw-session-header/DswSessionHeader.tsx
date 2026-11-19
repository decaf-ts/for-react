/**
 * @file
 * @summary DSW-style session header with title, status and menu slots.
 * @description Renders the `DswSessionHeader` agent chat component and its props contract.
 */
import React, { type ReactNode } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";

/**
 * @description Session lifecycle status rendered by {@link DswSessionHeader}.
 * @memberOf module:for-react.agent
 */
export type DswSessionStatus = "idle" | "running" | "done" | "error";

/**
 * @description Props accepted by {@link DswSessionHeader}.
 * @summary Declares every input the DswSessionHeader component understands.
 * @memberOf module:for-react.agent
 * @property {string} [title] - Title text.
 * @property {string} [titleKey] - Translation key for the title.
 * @property {string} [titleFallback] - English fallback for the title.
 * @property {string} [subtitle] - Supporting subtitle.
 * @property {DswSessionStatus} [status] - Component-specific status value.
 * @property {boolean} [showStatus] - Whether the session status is shown.
 * @property {boolean} [showMenu] - Whether the menu affordance is shown.
 * @property {string} [menuLabelKey] - Translation key for the menu label.
 * @property {string} [menuLabelFallback] - English fallback for the menu label.
 * @property {ReactNode} [leadingSlot] - Custom leading node.
 * @property {ReactNode} [actionsSlot] - Custom actions slot replacing the default header actions.
 * @property {function} [onMenu] - Called when the menu action is triggered.
 */
export interface DswSessionHeaderProps {
  title?: string;
  titleKey?: string;
  titleFallback?: string;
  subtitle?: string;
  status?: DswSessionStatus;
  showStatus?: boolean;
  showMenu?: boolean;
  menuLabelKey?: string;
  menuLabelFallback?: string;
  leadingSlot?: ReactNode;
  actionsSlot?: ReactNode;
  onMenu?: () => void;
}

function statusLabelFallback(status: DswSessionStatus): string {
  switch (status) {
    case "running":
      return "Running";
    case "done":
      return "Done";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

/**
 * @description DSW-style session header with title, status and menu slots.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function DswSessionHeader({
  title = "",
  titleKey = "",
  titleFallback = "Session",
  subtitle = "",
  status = "idle",
  showStatus = true,
  showMenu = false,
  menuLabelKey = "agent.dsw.session.menu",
  menuLabelFallback = "Session actions",
  leadingSlot,
  actionsSlot,
  onMenu,
}: DswSessionHeaderProps) {
  const t = useAgentTranslate();
  const statusLabelKey = `agent.dsw.session.status.${status}`;

  return (
    <header className="dcf-dsw-session-header">
      <div className="dcf-dsw-session-header__leading">{leadingSlot}</div>

      <div className="dcf-dsw-session-header__row">
        <div className="dcf-dsw-session-header__title-cluster">
          <h1 className="dcf-dsw-session-header__title">
            {t(titleKey || "", title || titleFallback)}
          </h1>
          {subtitle ? (
            <p className="dcf-dsw-session-header__subtitle">{subtitle}</p>
          ) : null}
        </div>

        {showStatus ? (
          <span
            className={`dcf-dsw-session-header__status dcf-dsw-session-header__status--${status}`}
            role="status"
          >
            <span
              className="dcf-dsw-session-header__status-dot"
              aria-hidden="true"
            />
            <span className="dcf-dsw-session-header__status-label">
              {t(statusLabelKey, statusLabelFallback(status))}
            </span>
          </span>
        ) : null}

        <div className="dcf-dsw-session-header__actions">
          {actionsSlot}
          {showMenu ? (
            <button
              type="button"
              className="dcf-dsw-session-header__menu"
              aria-label={t(menuLabelKey, menuLabelFallback)}
              title={t(menuLabelKey, menuLabelFallback)}
              onClick={() => onMenu?.()}
            >
              <span aria-hidden="true">⋯</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/**
 * @description Named alias of {@link DswSessionHeader} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const DswSessionHeaderComponent = DswSessionHeader;
