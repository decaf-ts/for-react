import React, { useMemo } from "react";
import type { BwippOptions } from "@bwip-js/browser";
import {
  BarcodeTypes,
  renderBarcodeSvg,
  validateBarcodeSvg,
  type BarcodeType,
} from "./barcode-renderer.js";

/**
 * @description Props accepted by {@link Barcode}.
 * @summary Configures the payload, the symbology, the validated rendering
 * overrides, and the presentation and accessibility attributes of the wrapper
 * element.
 * @interface BarcodeProps
 * @property {string} text - The payload to encode; at most 4096 characters.
 * @property {BarcodeType} [bcid=datamatrix] - Symbology to render.
 * @property {Partial<BwippOptions>} [options] - Rendering overrides merged onto
 * {@link DEFAULT_BARCODE_OPTIONS} and validated key by key before rendering.
 * @property {string} [className] - Class name applied to the wrapper element.
 * @property {React.CSSProperties} [style] - Inline styles applied to the
 * wrapper element.
 * @property {string} [ariaLabel="Barcode"] - Accessible name of the wrapper
 * element.
 * @property {string} [role="img"] - ARIA role of the wrapper element.
 * @memberOf module:for-react.barcode
 */
export interface BarcodeProps {
  text: string;
  bcid?: BarcodeType;
  options?: Partial<BwippOptions>;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  role?: string;
}

const DEFAULT_ARIA_LABEL = "Barcode";

/**
 * @description Renders a barcode payload as validated SVG markup.
 * @summary Encodes `text` with {@link renderBarcodeSvg}, gates the result
 * through {@link validateBarcodeSvg}, and binds the validated markup through
 * `dangerouslySetInnerHTML` on a wrapper element. React's sink inserts the
 * string without escaping, so the validator gate is mandatory on every render;
 * when encoding or validation throws, the component renders nothing instead of
 * injecting unvalidated markup. Requires a browser DOM and must be rendered
 * client-side.
 * @param {BarcodeProps} props - The payload, symbology, rendering overrides, and
 * wrapper presentation options.
 * @returns {React.ReactElement|null} The wrapper element containing the
 * validated SVG, or `null` when the payload cannot be encoded or validated.
 * @memberOf module:for-react.barcode
 * @example
 * <Barcode
 *   text="(01)09501101530003(17)261231"
 *   bcid={BarcodeTypes.gs1datamatrix}
 *   options={{ scale: 4, height: 16 }}
 * />
 */
export function Barcode({
  text,
  bcid = BarcodeTypes.datamatrix,
  options,
  className,
  style,
  ariaLabel = DEFAULT_ARIA_LABEL,
  role = "img",
}: BarcodeProps) {
  const markup = useMemo(() => {
    try {
      return validateBarcodeSvg(renderBarcodeSvg(text, { bcid, options }));
    } catch {
      return null;
    }
  }, [text, bcid, options]);

  if (markup === null) {
    return null;
  }

  return (
    <div
      className={className}
      style={style}
      role={role}
      aria-label={ariaLabel}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

/**
 * @description Alias of {@link Barcode}.
 * @summary Same component and props as {@link Barcode}; exported so hosts can
 * use an explicit component suffix consistent with the other React port
 * components.
 * @memberOf module:for-react.barcode
 */
export const BarcodeComponent = Barcode;
