/**
 * @file
 * @summary Slash-command popover for the composer.
 * @description Renders the `ChatSlashCommands` agent chat component and its props contract.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatSlashCommand } from "../../types.js";

function matches(command: AgentChatSlashCommand, prefix: string): boolean {
  const candidates = [command.name, ...(command.aliases ?? [])];
  return candidates.some((candidate) =>
    candidate.toLowerCase().startsWith(prefix)
  );
}

/**
 * @description Props accepted by {@link ChatSlashCommands}.
 * @summary Declares every input the ChatSlashCommands component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [commands] - Slash commands offered by the popover.
 * @property {string} [query] - Current slash query.
 * @property {boolean} [open] - Whether the surface is open.
 * @property {function} [onSelect] - Called when an item is selected.
 * @property {function} [onClose] - Called when the component requests to close.
 */
export interface ChatSlashCommandsProps {
  commands?: AgentChatSlashCommand[];
  query?: string;
  open?: boolean;
  onSelect?: (command: AgentChatSlashCommand) => void;
  onClose?: () => void;
}

/**
 * @description Slash-command popover for the composer.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatSlashCommands({
  commands = [],
  query = "",
  open = true,
  onSelect,
  onClose,
}: ChatSlashCommandsProps) {
  const t = useAgentTranslate();
  const instance = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedQuery = query.replace(/^\//, "").trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return commands;
    return commands.filter((command) => matches(command, normalizedQuery));
  }, [commands, normalizedQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filtered]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const options =
      container.querySelectorAll<HTMLElement>("[data-command-index]");
    options[activeIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, filtered]);

  const optionId = (index: number) => `agent-chat-slash-command-${instance}-${index}`;
  const activeDescendant =
    filtered.length > 0 ? optionId(activeIndex) : undefined;

  const setActive = (index: number) => {
    if (index < 0 || index >= filtered.length) return;
    setActiveIndex(index);
  };

  const move = (delta: number) => {
    const total = filtered.length;
    if (total === 0) return;
    setActiveIndex((current) => (current + delta + total) % total);
  };

  const selectCommand = (command: AgentChatSlashCommand) => {
    onSelect?.(command);
    onClose?.();
  };

  const selectActive = () => {
    const command = filtered[activeIndex];
    if (command) selectCommand(command);
  };

  const onKeydown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(filtered.length - 1);
        break;
      case "Enter":
        event.preventDefault();
        selectActive();
        break;
      case "Escape":
        event.preventDefault();
        onClose?.();
        break;
      default:
        break;
    }
  };

  if (!open) return null;

  return (
    <div
      ref={listRef}
      className="dcf-chat-slash-commands"
      role={filtered.length > 0 ? "listbox" : "group"}
      tabIndex={0}
      aria-label={t("agent.chat.slashCommands.label", "Slash commands")}
      aria-activedescendant={activeDescendant}
      onKeyDown={onKeydown}
    >
      {filtered.length > 0 ? (
        filtered.map((command, index) => (
          <button
            type="button"
            className={`dcf-chat-slash-commands__item${activeIndex === index ? " dcf-chat-slash-commands__item--active" : ""}`}
            role="option"
            id={optionId(index)}
            aria-selected={activeIndex === index}
            data-command-index={index}
            data-command={command.name}
            tabIndex={-1}
            key={command.name}
            onMouseMove={() => setActive(index)}
            onClick={() => selectCommand(command)}
          >
            <span className="dcf-chat-slash-commands__name">
              /{command.name}
            </span>
            {command.description ? (
              <span className="dcf-chat-slash-commands__description">
                {command.description}
              </span>
            ) : null}
          </button>
        ))
      ) : (
        <p className="dcf-chat-slash-commands__empty" role="status">
          {t("agent.chat.slashCommands.empty", "No matching commands")}
        </p>
      )}
    </div>
  );
}

/**
 * @description Named alias of {@link ChatSlashCommands} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatSlashCommandsComponent = ChatSlashCommands;
