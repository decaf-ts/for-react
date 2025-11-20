import React from "react";
import "./card.component.css";

export type RgxCardType = "clear" | "shadow";
export type RgxCardBody = "small" | "default" | "blank";

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
 * React port of the Decaf card component used throughout the Angular UI kit.
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
