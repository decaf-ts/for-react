/**
 * @file
 * @summary Model selector backed by the configured model list.
 * @description Renders the `ChatModelSelector` agent chat component and its props contract.
 */
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatModel } from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatModelSelector}.
 * @summary Declares every input the ChatModelSelector component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [models] - Models offered by the selector.
 * @property {AgentChatModel | string} [model] - Selected model.
 * @property {boolean} [disabled] - Whether the control is disabled.
 * @property {function} [onModelChange] - Called when the selected model changes.
 * @property {function} [onOpenChange] - Called when the open state changes.
 */
export interface ChatModelSelectorProps {
  models?: AgentChatModel[];
  model?: AgentChatModel | string | null;
  disabled?: boolean;
  onModelChange?: (model: AgentChatModel) => void;
  onOpenChange?: (open: boolean) => void;
}

/**
 * @description Model selector backed by the configured model list.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatModelSelector({
  models = [],
  model = null,
  disabled = false,
  onModelChange,
  onOpenChange,
}: ChatModelSelectorProps) {
  const t = useAgentTranslate();
  const hostRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo<AgentChatModel | null>(() => {
    if (!model) return null;
    if (typeof model !== "string") return model;
    return models.find((candidate) => candidate.id === model) ?? null;
  }, [model, models]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return models;
    return models.filter((candidate) =>
      [
        candidate.name,
        candidate.id,
        candidate.provider ?? "",
        candidate.description ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [models, search]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filtered]);

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => searchRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && hostRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  });

  const setOpen = (open: boolean) => {
    if (isOpen === open) return;
    setIsOpen(open);
    if (!open) setSearch("");
    onOpenChange?.(open);
  };

  const selectModel = (candidate: AgentChatModel) => {
    if (disabled) return;
    setSearch("");
    onModelChange?.(candidate);
    setOpen(false);
  };

  const move = (delta: number) => {
    const total = filtered.length;
    if (total === 0) return;
    setActiveIndex((current) => (current + delta + total) % total);
  };

  const selectActive = () => {
    const candidate = filtered[activeIndex];
    if (candidate) selectModel(candidate);
  };

  const onPanelKeydown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Enter":
        event.preventDefault();
        selectActive();
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="dcf-chat-model-selector" ref={hostRef}>
      <button
        type="button"
        className="dcf-chat-model-selector__trigger"
        data-action="trigger"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => {
          if (disabled) return;
          setOpen(!isOpen);
        }}
      >
        <span className="dcf-chat-model-selector__label">
          {t("agent.chat.modelSelector.label", "Model")}:
        </span>
        {selected ? (
          <>
            <span className="dcf-chat-model-selector__current">
              {selected.name}
            </span>
            {selected.provider ? (
              <span className="dcf-chat-model-selector__provider">
                {selected.provider}
              </span>
            ) : null}
          </>
        ) : (
          <span className="dcf-chat-model-selector__placeholder">
            {t("agent.chat.modelSelector.trigger", "Select model")}
          </span>
        )}
        <ChatIcon name="chevron-down" size={14} />
      </button>

      {isOpen ? (
        <div className="dcf-chat-model-selector__panel">
          <input
            ref={searchRef}
            type="search"
            className="dcf-chat-model-selector__search"
            data-role="search"
            value={search}
            placeholder={t("agent.chat.modelSelector.search", "Search models…")}
            aria-label={t("agent.chat.modelSelector.search", "Search models…")}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={onPanelKeydown}
          />

          <div
            className="dcf-chat-model-selector__list"
            role="listbox"
            aria-label={t("agent.chat.modelSelector.label", "Model")}
          >
            {filtered.length > 0 ? (
              filtered.map((candidate, index) => (
                <button
                  type="button"
                  className={`dcf-chat-model-selector__option${activeIndex === index ? " dcf-chat-model-selector__option--active" : ""}`}
                  role="option"
                  aria-selected={selected?.id === candidate.id}
                  data-model-id={candidate.id}
                  tabIndex={-1}
                  key={candidate.id}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => selectModel(candidate)}
                >
                  <span className="dcf-chat-model-selector__name">
                    {candidate.name}
                  </span>
                  {candidate.description ? (
                    <span className="dcf-chat-model-selector__description">
                      {candidate.description}
                    </span>
                  ) : null}
                  {candidate.provider ? (
                    <span className="dcf-chat-model-selector__provider">
                      {candidate.provider}
                    </span>
                  ) : null}
                </button>
              ))
            ) : (
              <p className="dcf-chat-model-selector__empty" role="status">
                {t(
                  "agent.chat.modelSelector.empty",
                  "No models match your search."
                )}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * @description Named alias of {@link ChatModelSelector} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatModelSelectorComponent = ChatModelSelector;
