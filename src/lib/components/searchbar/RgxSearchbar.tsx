import React, { useEffect, useState } from "react";

/**
 * @description Public props accepted by the {@link RgxSearchbar} component.
 * @summary Sets the controlled value, placeholder and debounce delay, controls
 * disabled state, and selects when the clear and cancel buttons are shown. It
 * also supplies the search and cancel callbacks.
 * @memberOf module:for-react
 */
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

/**
 * @description Search input with a leading icon and optional clear and cancel
 * buttons.
 * @summary Keeps an internal copy of the value that is synchronised from the
 * `value` prop, then after the `debounce` delay invokes `onSearch` when the
 * internal value differs from the prop. The clear and cancel buttons follow
 * their `"always"`, `"focus"` or `"never"` modes: clear is shown while focused
 * (or always) when there is text, and cancel is shown while focused (or
 * always). Clearing updates the internal value, and cancelling also clears it
 * and calls `onCancel`.
 * @param {RgxSearchbarProps} props - Values that control the input and its
 * buttons.
 * @returns {React.ReactElement} The rendered searchbar container.
 * @memberOf module:for-react
 */
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
