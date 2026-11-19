/**
 * @file
 * @summary DSW-style composer shell with notice, permissions and dock slots.
 * @description Renders the `DswComposerShell` agent chat component and its props contract.
 */
import React, { type ReactNode } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import { ChatComposer } from "../chat-composer/ChatComposer.js";

/**
 * @description Props accepted by {@link DswComposerShell}.
 * @summary Declares every input the DswComposerShell component understands.
 * @memberOf module:for-react.agent
 * @property {string} [value] - Current value.
 * @property {boolean} [running] - Whether a send or replay is in flight.
 * @property {boolean} [disabled] - Whether the control is disabled.
 * @property {string} [placeholder] - Placeholder text.
 * @property {number} [minRows] - Minimum composer rows.
 * @property {number} [maxRows] - Maximum composer rows before scrolling.
 * @property {string} [notice] - Notice text rendered above the input.
 * @property {string} [noticeKey] - Translation key for the notice.
 * @property {boolean} [showPermissions] - Whether the permissions control is shown.
 * @property {boolean} [permissionsActive] - Whether the permissions control is active.
 * @property {string} [permissionsLabelKey] - Translation key for the permissions label.
 * @property {string} [permissionsLabelFallback] - English fallback for the permissions label.
 * @property {ReactNode} [accessory] - Accessory node rendered beside the composer input.
 * @property {ReactNode} [dock] - Node docked above the composer input.
 * @property {ReactNode} [tools] - Artifact tools rendered by the toolbar.
 * @property {ReactNode} [footer] - Footer node rendered by the shell.
 * @property {function} [onSend] - Called with the text to send.
 * @property {function} [onStop] - Called when a running send is stopped.
 * @property {function} [onValueChange] - Called when the value changes.
 * @property {function} [onSlashQuery] - Called when the slash query changes.
 * @property {function} [onPermissionsOpen] - Called when the permissions action is triggered.
 */
export interface DswComposerShellProps {
  value?: string;
  running?: boolean;
  disabled?: boolean;
  placeholder?: string | null;
  minRows?: number;
  maxRows?: number;
  notice?: string;
  noticeKey?: string;
  showPermissions?: boolean;
  permissionsActive?: boolean;
  permissionsLabelKey?: string;
  permissionsLabelFallback?: string;
  accessory?: ReactNode;
  dock?: ReactNode;
  tools?: ReactNode;
  footer?: ReactNode;
  onSend?: (text: string) => void;
  onStop?: () => void;
  onValueChange?: (value: string) => void;
  onSlashQuery?: (query: string | null) => void;
  onPermissionsOpen?: () => void;
}

/**
 * @description DSW-style composer shell with notice, permissions and dock slots.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function DswComposerShell({
  value = "",
  running = false,
  disabled = false,
  placeholder = null,
  minRows = 1,
  maxRows = 6,
  notice = "",
  noticeKey = "",
  showPermissions = false,
  permissionsActive = false,
  permissionsLabelKey = "agent.dsw.composer.permissions",
  permissionsLabelFallback = "Permissions",
  accessory,
  dock,
  tools,
  footer,
  onSend,
  onStop,
  onValueChange,
  onSlashQuery,
  onPermissionsOpen,
}: DswComposerShellProps) {
  const t = useAgentTranslate();
  const hasAccessory = accessory !== undefined && accessory !== null;
  const hasDock = dock !== undefined && dock !== null;
  const hasTools = tools !== undefined && tools !== null;
  const hasFooter = footer !== undefined && footer !== null;
  const hasNotice = !!notice || !!noticeKey;
  const showsToolsRow = showPermissions || hasTools;

  return (
    <div
      className={`dcf-dsw-composer-shell${running ? " dcf-dsw-composer-shell--running" : ""}`}
    >
      {hasNotice ? (
        <p className="dcf-dsw-composer-shell__notice" role="status">
          {t(noticeKey || "", notice)}
        </p>
      ) : null}

      {hasDock ? (
        <div className="dcf-dsw-composer-shell__dock">{dock}</div>
      ) : null}

      <div className="dcf-dsw-composer-shell__card">
        {hasAccessory ? (
          <div className="dcf-dsw-composer-shell__accessory">{accessory}</div>
        ) : null}

        <div className="dcf-dsw-composer-shell__editor">
          <ChatComposer
            value={value}
            running={running}
            disabled={disabled}
            placeholder={placeholder}
            minRows={minRows}
            maxRows={maxRows}
            onSend={onSend}
            onStop={onStop}
            onValueChange={onValueChange}
            onSlashQuery={onSlashQuery}
          />
        </div>

        {showsToolsRow ? (
          <div className="dcf-dsw-composer-shell__tools">
            {showPermissions ? (
              <button
                type="button"
                className={`dcf-dsw-composer-shell__permissions${permissionsActive ? " dcf-dsw-composer-shell__permissions--active" : ""}`}
                aria-pressed={permissionsActive}
                onClick={() => onPermissionsOpen?.()}
              >
                {t(permissionsLabelKey, permissionsLabelFallback)}
              </button>
            ) : null}
            <div className="dcf-dsw-composer-shell__tools-slot">{tools}</div>
          </div>
        ) : null}
      </div>

      {hasFooter ? (
        <div className="dcf-dsw-composer-shell__footer">{footer}</div>
      ) : null}
    </div>
  );
}

/**
 * @description Named alias of {@link DswComposerShell} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const DswComposerShellComponent = DswComposerShell;
