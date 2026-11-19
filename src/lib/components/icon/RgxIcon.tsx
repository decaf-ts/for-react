import React, { useEffect, useState } from "react";
import { safeImageSrc } from "../../pipes/safe-html.js";

/**
 * @description Public props accepted by the {@link RgxIcon} component.
 * @summary Configures which icon to render, its color token or CSS value, its
 * layout slot and optional button styling, together with sizing, inline layout,
 * accessibility label and click handling.
 * @property {string} [name] - Vector icon name, or an image URL when it contains
 * a dot. Image names are validated with `safeImageSrc`; a rejected URL renders
 * the vector fallback instead.
 * @memberOf module:for-react
 */
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
  ariaLabel?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const COLOR_MAP: Record<string, string> = {
  primary: "var(--app-accent, #1f6feb)",
  secondary: "var(--dcf-color-secondary, #5f6b7a)",
  tertiary: "var(--dcf-color-tertiary, #7048e8)",
  danger: "var(--app-danger, #b42318)",
  medium: "var(--dcf-color-gray-6, #6b7280)",
  dark: "currentColor",
  light: "#ffffff",
};

const ICON_PATHS: Record<string, string> = {
  "folder-open-outline":
    "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  "ti-folder":
    "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  "ti-package":
    "M12 3 3 8v8l9 5 9-5V8l-9-5Z M3 8l9 5 9-5 M12 13v8",
  "ti-pencil": "M4 20h4L20 8l-4-4L4 16v4Z M14 6l4 4",
  "ti-trash":
    "M4 7h16 M9 7V4h6v3 M6 7l1 14h10l1-14 M10 11v6 M14 11v6",
  "ti-user": "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0",
  "ti-world":
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3 12h18 M12 3a15 15 0 0 1 0 18 M12 3a15 15 0 0 0 0 18",
  "ti-cup":
    "M5 8h10v6a5 5 0 0 1-10 0V8Z M15 9h2a2 2 0 0 1 0 4h-2 M4 21h12",
  "ti-device-floppy":
    "M5 3h11l3 3v15H5V3Z M8 3v6h8V3 M8 15h8v6H8v-6Z",
  "ti-layers": "M12 3 3 8l9 5 9-5-9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5",
  "ti-steps": "M4 20v-4h5v-4h5V8h6",
  "ti-scan-cube":
    "M4 8V5a1 1 0 0 1 1-1h3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3 M12 8l5 3v5l-5 3-5-3v-5l5-3Z M7 11l5 3 5-3 M12 14v5",
  "ti-components":
    "M4 4h7v7H4V4Z M13 4h7v7h-7V4Z M4 13h7v7H4v-7Z M13 13h7v7h-7v-7Z",
  "ti-login": "M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4 M4 12h12 M12 8l4 4-4 4",
  "ti-list": "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  "ti-layout-dashboard": "M4 4h7v7H4V4Z M13 4h7v4h-7V4Z M13 10h7v10h-7V10Z M4 13h7v7H4v-7Z",
  "ti-message-chatbot": "M4 5h16v11H8l-4 4V5Z",
  "ti-menu": "M4 7h16 M4 12h16 M4 17h16",
  "ti-moon-stars": "M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z",
};

const FALLBACK_PATH = "M4 4h16v16H4V4Z";

function IconSvg({ name }: { name: string }) {
  const path = ICON_PATHS[name] || FALLBACK_PATH;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

/**
 * @description Renders a built-in vector icon or an image reference.
 * @summary Resolves `name` against the internal icon path map and renders an
 * inline SVG, falling back to a placeholder square when the name is unknown.
 * When `name` contains a dot it is treated as an image source, validated with
 * `safeImageSrc`, and rendered as an `<img>` instead; a rejected URL (for
 * example a `javascript:` scheme or a non-image `data:` payload) falls back to
 * the vector icon path and is never bound as `src`. Named color tokens are mapped to CSS custom properties, and
 * any other `color` value is used verbatim. Setting `button` wraps the icon in a
 * button that uses `ariaLabel` (or `name`) as its label and forwards `onClick`.
 * Returns `null` when no `name` is supplied.
 * @param {RgxIconProps} props - Component properties.
 * @returns {React.ReactElement | null} The rendered icon or button, or `null`
 * when `name` is missing.
 * @memberOf module:for-react
 */
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
  ariaLabel,
  onClick,
}) => {
  const [isImage, setIsImage] = useState(false);

  useEffect(() => {
    setIsImage(!!name && name.includes("."));
  }, [name]);

  if (!name) return null;

  const classes = ["dcf-icon", className].filter(Boolean).join(" ");
  const resolvedColor = COLOR_MAP[color] || color;
  const imageSrc = isImage ? safeImageSrc(name) : null;
  const content = imageSrc ? (
    <img
      aria-hidden="true"
      data-slot={slot}
      src={imageSrc}
      style={{ width }}
      alt=""
    />
  ) : (
    <span
      aria-hidden="true"
      data-slot={slot}
      className={`ion-icon ${size}`}
      style={{ color: resolvedColor }}
    >
      <IconSvg name={name} />
    </span>
  );

  if (button) {
    return (
      <button
        className={`dcf-icon-button ${buttonFill} ${buttonShape} ${size}`}
        data-slot={slot}
        type="button"
        aria-label={ariaLabel || name}
        style={{ color: resolvedColor }}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={classes} data-inline={inline} style={{ color: resolvedColor }}>
      {content}
    </div>
  );
};
