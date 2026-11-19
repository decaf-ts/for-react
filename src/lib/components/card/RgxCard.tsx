import React from "react";
import { sanitizeHtmlContent } from "../../pipes/safe-html.js";

/**
 * @description Visual variants supported by {@link RgxCard}.
 * @summary Selects a flat (`clear`) or elevated (`shadow`) card appearance.
 * @memberOf module:for-react
 */
export type RgxCardType = "clear" | "shadow";
/**
 * @description Body spacing variants for {@link RgxCard}.
 * @summary Controls the padding applied to the card content area.
 * @memberOf module:for-react
 */
export type RgxCardBody = "small" | "default" | "blank";

/**
 * @description Props accepted by {@link RgxCard}.
 * @summary Configures the card variant, header text, body spacing, borders,
 * inline content and custom classes.
 * @property {string | React.ReactNode} [inlineContent] - Content rendered above
 * or below the children. A string is treated as untrusted HTML and sanitized
 * with `sanitizeHtmlContent` before `dangerouslySetInnerHTML`; a React node is
 * rendered as a normal React node.
 * @memberOf module:for-react
 */
export interface RgxCardProps {
  type?: RgxCardType;
  title?: string;
  body?: RgxCardBody;
  subtitle?: string;
  color?: string;
  separator?: boolean;
  borders?: boolean;
  inlineContent?: string | React.ReactNode;
  inlineContentPosition?: "top" | "bottom";
  className?: string;
  children?: React.ReactNode;
}

/**
 * @description React port of the Decaf card component.
 * @summary Renders a styled card with an optional header, subtitle and inline
 * content positioned above or below the children, mirroring the Angular UI kit.
 * String `inlineContent` is sanitized with `sanitizeHtmlContent` before being
 * bound through `dangerouslySetInnerHTML`, preserving benign markup while
 * stripping scripts, event handlers and dangerous URLs; ReactNode content is
 * rendered as normal React nodes and is not parsed as HTML.
 * @param {RgxCardProps} props - The card configuration and children.
 * @returns {React.ReactElement} The rendered card element.
 * @memberOf module:for-react
 */
export const RgxCard: React.FC<RgxCardProps> = ({
  type = "clear",
  title = "",
  subtitle = "",
  body = "default",
  color,
  separator = false,
  borders = true,
  inlineContent,
  inlineContentPosition = "bottom",
  className,
  children,
}) => {
  const classes = [
    "dcf-card",
    `dcf-card-${body}`,
    separator ? "dcf-card-separator" : "",
    borders ? "dcf-card-bordered" : "",
    type === "shadow" ? "dcf-card-shadow" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  const renderInlineContent = (position: "top" | "bottom") => {
    if (!inlineContent || inlineContentPosition !== position) return null;
    if (typeof inlineContent === "string") {
      return (
        <div
          dangerouslySetInnerHTML={{
            __html: sanitizeHtmlContent(inlineContent),
          }}
        />
      );
    }
    return <div>{inlineContent}</div>;
  };

  return (
    <div className={classes} data-color={color}>
      {(title || subtitle) && (
        <div className="dcf-card-header">
          {title && (
            <div className="dcf-card-title" data-color={color}>
              {title}
            </div>
          )}
          {subtitle && <div className="dcf-card-subtitle">{subtitle}</div>}
        </div>
      )}
      <div className="dcf-card-content">
        {renderInlineContent("top")}
        {children}
        {renderInlineContent("bottom")}
      </div>
    </div>
  );
};
