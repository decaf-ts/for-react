import React from "react";

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
      return <div dangerouslySetInnerHTML={{ __html: inlineContent }} />;
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
