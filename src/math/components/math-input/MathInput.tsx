import { createElement, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, Ref } from "react";

/**
 * @description Structural subset of the MathLive `<math-field>` custom element.
 * @summary Keeps the component typed without importing MathLive types, so no
 * MathLive symbol leaks through the public component API.
 * @interface MathfieldElementLike
 * @memberOf module:for-react.math
 */
interface MathfieldElementLike {
  /** @description Current field content as a LaTeX string. */
  value: string;
  /** @description Placeholder shown when the field is empty. */
  placeholder: string;
  /** @description Whether the field rejects user edits. */
  readOnly: boolean;
  /** @description Keyboard policy; the component always pins it to `manual`. */
  mathVirtualKeyboardPolicy?: string;
}

/**
 * @description Props used to render the internal `<math-field>` host element.
 * @summary Intrinsic custom-element attributes forwarded through
 * `createElement`; the ref targets the {@link MathfieldElementLike} surface and
 * the `onInput` handler reports LaTeX after each edit.
 * @interface MathFieldProps
 * @property {React.Ref<MathfieldElementLike>} [ref] - Handle to the underlying
 * `<math-field>` element, mirroring the Angular `@ViewChild` field reference.
 * @property {string} [className] - CSS classes applied to the field element.
 * @property {React.CSSProperties} [style] - Inline styles for the field element.
 * @property {function(Event): void} [onInput] - DOM `input` listener that
 * forwards the new LaTeX value.
 * @memberOf module:for-react.math
 */
interface MathFieldProps {
  ref?: Ref<MathfieldElementLike>;
  className?: string;
  style?: CSSProperties;
  onInput?: (event: Event) => void;
}

/**
 * @description Props accepted by {@link MathInput}.
 * @summary Controls the controlled LaTeX value, placeholder, read-only state,
 * change notifications, and host-level styling. The component is controlled:
 * `value` is the source of truth and typing reports the new LaTeX string
 * through `onChange` (and the `onValueChange` alias), which the host feeds back
 * through `value`.
 * @interface MathInputProps
 * @property {string} [value=""] - Controlled LaTeX content of the field.
 * @property {string} [placeholder=""] - Placeholder shown while the field is empty.
 * @property {boolean} [disabled=false] - Renders the field read-only and rejects
 * edits.
 * @property {function(string): void} [onChange] - Reports the LaTeX value after
 * each edit.
 * @property {function(string): void} [onValueChange] - Alias of `onChange`;
 * both fire together.
 * @property {string} [className] - Extra classes appended to the field element.
 * @property {React.CSSProperties} [style] - Inline styles merged onto the field
 * defaults.
 * @memberOf module:for-react.math
 */
export interface MathInputProps {
  /**
   * @description Controlled LaTeX content of the field. Defaults to `""`.
   * Writing a new value updates the field; no-op writes are skipped so the
   * cursor and selection are not clobbered.
   */
  value?: string;
  /**
   * @description Placeholder shown while the field is empty. Defaults to `""`.
   */
  placeholder?: string;
  /**
   * @description Renders the field read-only and rejects user edits. Defaults
   * to `false`; the component never derives this from surrounding forms.
   */
  disabled?: boolean;
  /**
   * @description Reports the LaTeX value after each edit. Persist the value
   * and feed it back through `value` to keep the component controlled.
   * @param {string} value - The LaTeX content after the edit.
   * @returns {void}
   */
  onChange?: (value: string) => void;
  /**
   * @description Alias of `onChange`; both callbacks fire with the same LaTeX
   * value after each edit.
   * @param {string} value - The LaTeX content after the edit.
   * @returns {void}
   */
  onValueChange?: (value: string) => void;
  /**
   * @description Extra CSS classes appended to the field element.
   */
  className?: string;
  /**
   * @description Inline styles merged onto the field defaults.
   */
  style?: CSSProperties;
}

/**
 * @description Default inline styles applied to the `<math-field>` element.
 * @summary A block-level, full-width field with a readable minimum height and
 * font size. Host `style` values are merged on top of these defaults.
 * @constant
 * @memberOf module:for-react.math
 */
const FIELD_STYLE: CSSProperties = {
  display: "block",
  width: "100%",
  minHeight: 48,
  fontSize: "1.25rem",
};

/**
 * @description LaTeX formula input backed by MathLive.
 * @summary Controlled React component wrapping the MathLive `<math-field>`
 * custom element. MathLive is loaded with a memoized dynamic `import()` after
 * the component mounts, at most once per lifetime, and the field stays inert
 * instead of throwing when the import fails. `value` is the source of truth:
 * external writes are synced into the field (skipping no-op writes so the
 * cursor survives) and user edits are reported through `onChange` and
 * `onValueChange`. Ported from the Angular `MathInputComponent`, whose
 * `model()`/`input()` two-way binding maps to the controlled `value` prop plus
 * change callbacks, its `@ViewChild` reference to a `useRef` handle, its
 * `ngAfterViewInit` to a mount effect, and its `ngOnDestroy` to effect cleanup.
 * @param {MathInputProps} props - Controlled value, placeholder, read-only
 * state, change callbacks, and host styling.
 * @returns {React.ReactElement} The `<math-field>` host element.
 * @function MathInput
 * @example
 * ```tsx
 * import { useState } from "react";
 * import { MathInput } from "@decaf-ts/for-react/math";
 *
 * export function FormulaField() {
 *   const [latex, setLatex] = useState("\\frac{a}{b}");
 *
 *   return (
 *     <label>
 *       <span>Formula</span>
 *       <MathInput value={latex} onChange={setLatex} />
 *     </label>
 *   );
 * }
 * ```
 * @mermaid
 * %%{init: {"theme": "base", "themeVariables": {"actorBkg": "#E8F1FB", "actorBorder": "#5B8DEF", "signalColor": "#34507A"}}}%%
 * sequenceDiagram
 *   autonumber
 *   participant Host as Parent component
 *   participant Input as MathInput
 *   participant ML as MathLive
 *   participant Field as <math-field>
 *   Host->>Input: render with controlled value
 *   activate Input
 *   Input->>ML: dynamic import('mathlive')
 *   activate ML
 *   ML-->>Input: module settled (or import failure swallowed)
 *   deactivate ML
 *   Input->>Field: sync value and attributes
 *   activate Field
 *   Field-->>Input: field ready
 *   deactivate Field
 *   Input-->>Host: mounted math field
 *   deactivate Input
 *   Field->>Input: user edits the field
 *   activate Input
 *   Input->>Host: onChange(latex) and onValueChange(latex)
 *   deactivate Input
 *   Host->>Input: re-render with the emitted value
 *   activate Input
 *   Input->>Input: skip no-op write, preserve cursor
 *   Input-->>Host: no field reset
 *   deactivate Input
 * @memberOf module:for-react.math
 */
export function MathInput({
  value = "",
  placeholder = "",
  disabled = false,
  onChange,
  onValueChange,
  className,
  style,
}: MathInputProps) {
  const fieldRef = useRef<MathfieldElementLike | null>(null);
  const importPromiseRef = useRef<Promise<unknown> | null>(null);
  const onChangeRef = useRef(onChange);
  const onValueChangeRef = useRef(onValueChange);
  const [settled, setSettled] = useState(false);

  /**
   * @description Keeps the latest change callbacks reachable from the stable
   * `input` listener.
   * @summary Mirrors the Angular two-way binding: the host can swap `onChange`
   * and `onValueChange` without re-subscribing the field.
   */
  useEffect(() => {
    onChangeRef.current = onChange;
    onValueChangeRef.current = onValueChange;
  }, [onChange, onValueChange]);

  /**
   * @description Loads MathLive once per component lifetime.
   * @summary Replaces Angular's `ngAfterViewInit` and `ngOnDestroy`: the
   * dynamic `import('mathlive')` is memoized on mount and released on unmount.
   * Import failures are swallowed so non-browser hosts keep an inert field.
   */
  useEffect(() => {
    let active = true;
    if (!importPromiseRef.current) {
      importPromiseRef.current = import("mathlive");
    }
    importPromiseRef.current
      .catch(() => undefined)
      .then(() => {
        if (active) setSettled(true);
      });
    return () => {
      active = false;
      importPromiseRef.current = null;
    };
  }, []);

  /**
   * @description Writes the controlled value into the field when it differs.
   * @summary Equivalent to the Angular `syncValue` helper; skipping no-op
   * writes avoids clobbering the cursor and selection.
   */
  useEffect(() => {
    if (!settled) return;
    const field = fieldRef.current;
    if (!field) return;
    const next = value ?? "";
    if (field.value !== next) {
      field.value = next;
    }
  }, [settled, value]);

  /**
   * @description Applies placeholder, read-only and keyboard-policy attributes.
   * @summary Equivalent to the Angular `syncAttributes` helper; the virtual
   * keyboard policy is always pinned to `manual` so it never steals focus.
   */
  useEffect(() => {
    if (!settled) return;
    const field = fieldRef.current;
    if (!field) return;
    field.placeholder = placeholder ?? "";
    field.readOnly = disabled;
    field.mathVirtualKeyboardPolicy = "manual";
  }, [settled, placeholder, disabled]);

  /**
   * @description Handles the MathLive `input` event.
   * @summary Reads the LaTeX value from the field and reports it through both
   * change callbacks, replacing the Angular `onInput` model update.
   * @param {Event} event - The input event emitted by `<math-field>`.
   * @returns {void}
   */
  const handleInput = useCallback((event: Event) => {
    const target = event.target as MathfieldElementLike | null;
    const latex = target && typeof target.value === "string" ? target.value : "";
    onChangeRef.current?.(latex);
    onValueChangeRef.current?.(latex);
  }, []);

  return createElement<MathFieldProps>("math-field", {
    ref: fieldRef,
    className: ["decaf-math-input__field", className]
      .filter(Boolean)
      .join(" "),
    style: { ...FIELD_STYLE, ...style },
    onInput: handleInput,
  });
}

/**
 * @description Alias of {@link MathInput} kept for callers porting Angular
 * component names to the React package.
 * @summary Behaves exactly like {@link MathInput}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {React.FunctionComponent<MathInputProps>}
 * @memberOf module:for-react.math
 */
export const MathInputComponent = MathInput;

/**
 * @description Alias of {@link MathInput} following the `Rgx*` naming
 * convention of the main for-react UI kit.
 * @summary Behaves exactly like {@link MathInput}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {React.FunctionComponent<MathInputProps>}
 * @memberOf module:for-react.math
 */
export const RgxMathInput = MathInput;
