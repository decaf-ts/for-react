import React, { useEffect, useState } from "react";
import { RgxMediaService } from "../../services/RgxMediaService";
import "./icon.component.css";

export interface RgxIconProps {
  name?: string;
  color?: string;
  slot?: "start" | "end" | "icon-only";
  button?: boolean;
  buttonFill?: "clear" | "outline" | "solid";
  buttonShape?: "round" | "default";
  width?: string;
  size?: "large" | "small" | "default";
  inline?: boolean;
  className?: string;
}

export const RgxIcon: React.FC<RgxIconProps> = ({
  name,
  color = "dark",
  slot = "icon-only",
  button = false,
  buttonFill = "clear",
  buttonShape = "round",
  width,
  size = "default",
  inline = false,
  className,
}) => {
  const [isSvg, setIsSvg] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const media = new RgxMediaService();
    const unsubscribe = media.onColorSchemeChange((scheme) => setIsDarkMode(scheme === "dark"));
    return () => {
      unsubscribe?.();
      media.dispose();
    };
  }, []);

  useEffect(() => {
    if (!name) return;
    const isFile = name.includes(".");
    const svg = name.endsWith(".svg");
    setIsImage(isFile);
    setIsSvg(svg);
  }, [name]);

  if (!name) return null;

  const classes = ["dcf-icon", className].filter(Boolean).join(" ");
  const iconColor = isDarkMode ? "light" : color;

  const renderImage = () => {
    if (isSvg) {
      return (
        <img
          aria-hidden="true"
          data-slot={slot}
          src={name}
          style={{ width }}
          className={color ? `dcf-color-${color}` : ""}
          alt={name}
        />
      );
    }
    return <img aria-hidden="true" data-slot={slot} src={name} style={{ width }} alt={name} />;
  };

  const renderIcon = () => (
    <span aria-hidden="true" data-slot={slot} className={`ion-icon ${size}`} data-color={iconColor}>
      {name}
    </span>
  );

  const content = isImage ? renderImage() : renderIcon();

  if (button) {
    return (
      <button className={`dcf-icon-button ${buttonFill} ${buttonShape} ${size}`} data-slot={slot} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className={classes} data-inline={inline}>
      {content}
    </div>
  );
};
