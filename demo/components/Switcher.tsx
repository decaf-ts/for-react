import React, { useRef } from "react";
import { useTranslate } from "../../src/lib";

export interface TabItem {
  title?: string;
  description?: string;
  value?: string;
  icon?: string;
  url?: string;
  showTitle?: boolean;
}

export interface SwitcherProps {
  items: TabItem[];
  activeIndex?: number;
  mode?: "button" | "toggle" | "default";
  type?: "tabs" | "switcher";
  onChange?: (index: number) => void;
  children?: React.ReactNode;
}

export function Switcher({
  items,
  activeIndex = 0,
  mode = "default",
  type = "switcher",
  onChange,
  children,
}: SwitcherProps) {
  const translate = useTranslate();
  const listRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let target = index;
    if (event.key === "ArrowRight") target = (index + 1) % items.length;
    else if (event.key === "ArrowLeft")
      target = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = items.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange?.(index);
      return;
    } else return;
    event.preventDefault();
    onChange?.(target);
    const buttons =
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[target]?.focus();
  };

  return (
    <div className={`app-switcher app-switcher-${type} app-switcher-${mode}`}>
      <ul role="tablist" ref={listRef} aria-label={translate("common.tabs")}>
        {items.map((item, index) => {
          const active = index === activeIndex;
          return (
            <li key={item.value || item.title || index} role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                className={active ? "app-switcher-tab active" : "app-switcher-tab"}
                onClick={() => onChange?.(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                {item.title ? translate(item.title) : item.value}
              </button>
            </li>
          );
        })}
      </ul>
      {type === "switcher" && children ? (
        <div className="app-switcher-content">{children}</div>
      ) : null}
    </div>
  );
}
