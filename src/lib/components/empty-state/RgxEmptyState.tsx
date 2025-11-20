import React from "react";
import { RgxCard, RgxCardProps } from "../card/RgxCard";
import { RgxIcon } from "../icon/RgxIcon";
import { stringToBoolean } from "../../utils/helpers";
import "./empty-state.component.css";

export interface RgxEmptyStateProps extends RgxCardProps {
  title?: string;
  titleColor?: string;
  subtitle?: string;
  subtitleColor?: string;
  showIcon?: boolean | string;
  icon?: string;
  iconSize?: "large" | "small" | "default";
  iconColor?: string;
  buttonLink?: string | (() => void);
  buttonText?: string;
  buttonFill?: "clear" | "outline" | "solid";
  buttonColor?: string;
  buttonSize?: "small" | "default" | "large";
  enableCreationByModelRoute?: boolean;
  searchValue?: string;
  searchSubtitle?: string;
  onButtonClick?: () => void;
}

const normalizeBool = (value?: boolean | string) => stringToBoolean((value ?? true) as any);

export const RgxEmptyState: React.FC<RgxEmptyStateProps> = ({
  title = "title",
  titleColor = "gray-6",
  subtitle = "",
  subtitleColor = "gray-4",
  showIcon = true,
  icon = "folder-open-outline",
  iconSize = "large",
  iconColor = "medium",
  buttonLink,
  buttonText,
  buttonFill = "solid",
  buttonColor = "primary",
  buttonSize = "default",
  enableCreationByModelRoute = false,
  searchValue,
  searchSubtitle,
  onButtonClick,
  className,
  children,
  ...cardProps
}) => {
  const displayIcon = normalizeBool(showIcon);
  const effectiveSubtitle =
    searchValue && searchSubtitle
      ? searchSubtitle.replace("{0}", `<span class="dcf-highlight">${searchValue}</span>`)
      : subtitle;

  const handleButton = () => {
    if (typeof buttonLink === "function") buttonLink();
    else if (typeof buttonLink === "string") window?.open(buttonLink, "_self");
    onButtonClick?.();
  };

  return (
    <div className="decaf-empty-state-component">
      <RgxCard className={className} {...cardProps}>
        {displayIcon && icon && (
          <div className="dcf-icon-container">
            <RgxIcon name={icon} size={iconSize} color={iconColor} />
          </div>
        )}
        {title && (
          <h4 className={`dcf-ititle ${titleColor}`} dangerouslySetInnerHTML={{ __html: title }} />
        )}
        {effectiveSubtitle && (
          <p
            className={`dcf-subtitle ${subtitleColor}`}
            dangerouslySetInnerHTML={{ __html: effectiveSubtitle }}
          />
        )}
        {children}
        {(buttonLink || enableCreationByModelRoute) && (
          <div className="dcf-empty-state-button">
            <button
              className={`dcf-button ${buttonFill} ${buttonColor} ${buttonSize}`}
              type="button"
              onClick={handleButton}
            >
              {buttonText}
            </button>
          </div>
        )}
      </RgxCard>
    </div>
  );
};
