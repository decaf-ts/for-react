import React from "react";
import { escapeHtml } from "@decaf-ts/ui-decorators";
import { RgxCard, RgxCardProps } from "../card/RgxCard.js";
import { RgxIcon } from "../icon/RgxIcon.js";
import { stringToBoolean } from "../../utils/helpers.js";
import { translateKey } from "../../services/RgxTranslateService.js";

/**
 * @description Public props accepted by {@link RgxEmptyState}.
 * @summary Extends {@link RgxCardProps} with optional icon, title/subtitle,
 * search-highlight text and a call-to-action button configuration.
 * @memberOf module:for-react
 */
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

/**
 * @description Empty-state card shown when a collection has no content.
 * @summary Renders optional icon, translated title and subtitle inside a
 * {@link RgxCard}, forwarding remaining props to the card. When both
 * `searchValue` and `searchSubtitle` are set, the subtitle's `{0}` placeholder
 * is replaced with the search value wrapped in a `dcf-highlight` span (rendered
 * as HTML). A button is shown when `buttonLink` is provided or
 * `enableCreationByModelRoute` is set; clicking it invokes a function link or
 * opens a string link in the current window, then calls `onButtonClick`.
 * @param {RgxEmptyStateProps} props - Empty-state content, styling and button configuration.
 * @returns {React.ReactElement} The rendered empty-state card.
 * @memberOf module:for-react
 * @example
 * <RgxEmptyState title="No records" subtitle="Create your first record" buttonText="Create" buttonLink="/new" />
 */
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
      ? searchSubtitle.replace("{0}", `<span class="dcf-highlight">${escapeHtml(searchValue)}</span>`)
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
          <h4 className={`dcf-ititle ${titleColor}`} dangerouslySetInnerHTML={{ __html: translateKey(title) }} />
        )}
        {effectiveSubtitle && (
          <p
            className={`dcf-subtitle ${subtitleColor}`}
            dangerouslySetInnerHTML={{ __html: translateKey(effectiveSubtitle) }}
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
              {buttonText ? translateKey(buttonText) : buttonText}
            </button>
          </div>
        )}
      </RgxCard>
    </div>
  );
};
