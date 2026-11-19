import React, { useMemo } from "react";
import { ITooltipConfig } from "../engine/interfaces.js";
import { generateRandomValue, stripHTML } from "../utils/helpers.js";
import { truncate } from "../pipes/truncate.js";

/**
 * @description Tooltip input, as plain text or a full configuration object.
 * @summary A shorthand string is treated as the tooltip text; an
 * {@link ITooltipConfig} allows control over position, truncation and limit.
 * @memberOf module:for-react
 */
export type RgxTooltipOptions = string | ITooltipConfig;

/**
 * @description Props accepted by the {@link RgxTooltip} component.
 * @summary Supplies the tooltip options, an optional wrapper class name and the
 * content to display in place of the resolved text.
 * @memberOf module:for-react
 */
export interface RgxTooltipProps {
  options?: RgxTooltipOptions;
  className?: string;
  children?: React.ReactNode;
}

/**
 * @description Normalised tooltip state used for rendering.
 * @summary Holds whether a tooltip is active, the sanitised full text, the
 * possibly truncated visible text, the generated element id and its position.
 * @memberOf module:for-react
 */
export interface ResolvedTooltip {
  active: boolean;
  text: string;
  visible: string;
  id: string;
  position: "top" | "bottom";
}

/**
 * @description Resolves raw tooltip options into renderable state.
 * @summary Sanitises the configured text, determines whether a tooltip is
 * needed (non-empty text longer than the limit), optionally truncates the
 * visible text and generates a unique id. String input defaults to a bottom
 * position; config input defaults to a top position.
 * @param {RgxTooltipOptions} [options] - Plain text or tooltip configuration.
 * @returns {ResolvedTooltip} The normalised tooltip state.
 * @memberOf module:for-react
 */
export function resolveTooltip(options?: RgxTooltipOptions): ResolvedTooltip {
  const config = (typeof options === "string"
    ? { text: options, position: "bottom", trail: "" }
    : { truncate: false, limit: 30, position: "top", ...(options || {}) }) as ITooltipConfig;
  const sanitized = stripHTML(config.text || "") as string;
  const limit = config.limit ?? 30;
  const active = !!sanitized && sanitized.trim().length > 0 && sanitized.length > limit;
  const visible =
    active && config.truncate
      ? truncate(sanitized, limit, config.trail ?? "...")
      : sanitized;
  return {
    active,
    text: sanitized,
    visible,
    id: `dcf-tooltip-${generateRandomValue(8)}`,
    position: (config.position as "top" | "bottom") || "top",
  };
}

/**
 * @description Renders inline content with an accessible tooltip when needed.
 * @summary Resolves the tooltip options with {@link resolveTooltip} and, when
 * active, wraps the children in a `dcf-tooltip-parent` span linked to a
 * `role="tooltip"` element via `aria-describedby`. Falls back to the resolved
 * visible text when no children are provided.
 * @param {RgxTooltipProps} props - Tooltip options, wrapper class and content.
 * @returns {React.ReactElement} The wrapped content and optional tooltip.
 * @memberOf module:for-react
 */
export const RgxTooltip: React.FC<RgxTooltipProps> = ({
  options,
  className,
  children,
}) => {
  const tooltip = useMemo(() => resolveTooltip(options), [options]);
  return (
    <span
      className={[className, tooltip.active ? "dcf-tooltip-parent" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-describedby={tooltip.active ? tooltip.id : undefined}
    >
      {children ?? tooltip.visible}
      {tooltip.active && (
        <span
          className={`dcf-tooltip dcf-tooltip-${tooltip.position}`}
          role="tooltip"
          id={tooltip.id}
        >
          {tooltip.text}
        </span>
      )}
    </span>
  );
};
