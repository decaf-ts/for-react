import React, { useEffect, useState } from "react";
import "./searchbar.component.css";

export interface RgxSearchbarProps {
  value?: string;
  placeholder?: string;
  debounce?: number;
  disabled?: boolean;
  showCancelButton?: "always" | "focus" | "never";
  showClearButton?: "always" | "focus" | "never";
  onSearch?: (value: string) => void;
  onCancel?: () => void;
  className?: string;
}

export const RgxSearchbar: React.FC<RgxSearchbarProps> = ({
  value = "",
  placeholder = "Search",
  debounce = 500,
  disabled = false,
  showCancelButton = "never",
  showClearButton = "focus",
  onSearch,
  onCancel,
  className,
}) => {
  const [internal, setInternal] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setInternal(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (internal !== value) onSearch?.(internal);
    }, debounce);
    return () => clearTimeout(handler);
  }, [internal, debounce]);

  const showClear =
    showClearButton === "always" || (showClearButton === "focus" && focused && !!internal.length);

  const showCancel = showCancelButton === "always" || (showCancelButton === "focus" && focused);

  return (
    <div className={`dcf-searchbar ${className || ""} ${focused ? "focused" : ""}`}>
      <div className="dcf-searchbar-input">
        <span className="dcf-search-icon">🔍</span>
        <input
          value={internal}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => setInternal(event.target.value)}
        />
        {showClear && (
          <button
            type="button"
            className="dcf-clear"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setInternal("")}
          >
            ✕
          </button>
        )}
      </div>
      {showCancel && (
        <button
          className="dcf-cancel"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setInternal("");
            onCancel?.();
          }}
        >
          Cancel
        </button>
      )}
    </div>
  );
};
