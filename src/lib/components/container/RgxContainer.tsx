import React from "react";
import { ElementPositions, ElementSizes } from "../../engine/constants.js";

/**
 * @description Width token accepted by {@link RgxContainer}.
 * @summary Mirrors the decaf container width classes (`block`, `small`,
 * `medium`, `large`, `expand`, `auto`) while also permitting any custom
 * `string`, which is interpolated verbatim into the `dcf-width-*` class.
 * @memberOf module:for-react
 */
export type ContainerSize =
  | "block"
  | "small"
  | "medium"
  | "large"
  | "expand"
  | "auto"
  | string;

/**
 * @description Public props accepted by {@link RgxContainer}.
 * @summary Controls the outer section layout (flex alignment, fullscreen
 * height) and the inner container width token, plus any extra classes and
 * child content.
 * @memberOf module:for-react
 */
export interface RgxContainerProps {
  className?: string;
  position?: string;
  flex?: boolean;
  fullscreen?: boolean;
  size?: ContainerSize;
  children?: React.ReactNode;
}

/**
 * @description Layout container that applies decaf flex and width classes.
 * @summary Renders a `<section>` wrapper around a `dcf-container` div. When
 * `flex` is enabled it adds `dcf-flex` and `dcf-flex-<position>` unless the
 * supplied `className` already contains a `dcf-flex-` token; an unrecognised
 * `position` falls back to `center`. `fullscreen` adds `dcf-height-viewport`
 * and `size` becomes the `dcf-width-*` token on the inner div.
 * @param {RgxContainerProps} props - Container props, including children and layout tokens.
 * @returns {React.ReactElement} The rendered container markup.
 * @memberOf module:for-react
 * @example
 * <RgxContainer position="middle" size="large" fullscreen>
 *   <p>Content</p>
 * </RgxContainer>
 */
export const RgxContainer: React.FC<RgxContainerProps> = ({
  className = "",
  position = "center",
  flex = true,
  fullscreen = false,
  size = ElementSizes.expand,
  children,
}) => {
  const resolvedPosition =
    Object.values(ElementPositions).includes(
      position as (typeof ElementPositions)[keyof typeof ElementPositions]
    )
      ? position
      : "center";
  const classes = [
    className,
    flex && !className.includes("dcf-flex-") ? "dcf-flex" : "",
    flex && !className.includes("dcf-flex-") ? `dcf-flex-${resolvedPosition}` : "",
    fullscreen ? "dcf-height-viewport" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      <div className={`dcf-container dcf-width-${size}`}>{children}</div>
    </section>
  );
};
