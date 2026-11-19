/**
 * @file Demo page for the `@decaf-ts/for-react/barcode` subpath.
 * @description Exercises {@link Barcode}, {@link renderBarcodeSvg} and
 * {@link BarcodeTypes} with a live payload, symbology picker and scale control.
 */
import React, { useMemo, useState } from "react";
import {
  Barcode,
  BarcodeTypes,
  type BarcodeType,
  renderBarcodeSvg,
} from "../../src/barcode";
import { useTranslate } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";

const DEFAULT_PAYLOAD = "DECAF-1234-5678";
const SYMBOLOGIES: BarcodeType[] = Object.values(BarcodeTypes);

interface RenderedBarcode {
  markup: string | null;
  error: boolean;
}

/**
 * @description Interactive demo of the barcode helpers and component.
 * @summary Lets a visitor edit the payload, switch symbology and scale, and see
 * either the rendered barcode or the encoded/validation error state.
 * @returns {React.ReactElement} The barcode demo page.
 */
export function BarcodePage() {
  const translate = useTranslate();
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [symbology, setSymbology] = useState<BarcodeType>(
    BarcodeTypes.datamatrix
  );
  const [scale, setScale] = useState(4);

  const rendered = useMemo<RenderedBarcode>(() => {
    const value = payload.trim();
    if (!value) return { markup: null, error: false };
    try {
      return {
        markup: renderBarcodeSvg(value, {
          bcid: symbology,
          options: { scale } as never,
        }),
        error: false,
      };
    } catch {
      return { markup: null, error: true };
    }
  }, [payload, symbology, scale]);

  const onPayloadChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPayload(event.target.value);
  };

  const onSymbologyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSymbology(event.target.value as BarcodeType);
  };

  const onScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScale(Number(event.target.value) || 1);
  };

  const reset = () => {
    setPayload(DEFAULT_PAYLOAD);
    setSymbology(BarcodeTypes.datamatrix);
    setScale(4);
  };

  return (
    <section className="app-page barcode-page" aria-labelledby="barcode-title">
      <CardTitle title="barcode.title" subtitle="barcode.intro" />
      <h2 id="barcode-title" className="app-visually-hidden">
        {translate("barcode.title")}
      </h2>

      <div className="barcode-page__layout">
        <section
          className="barcode-page__controls"
          aria-label={translate("barcode.title")}
        >
          <label className="barcode-page__field">
            <span>{translate("barcode.payload_label")}</span>
            <textarea
              data-testid="barcode-payload"
              rows={3}
              value={payload}
              placeholder={translate("barcode.payload_placeholder")}
              onChange={onPayloadChange}
            />
          </label>

          <label className="barcode-page__field">
            <span>{translate("barcode.symbology_label")}</span>
            <select
              data-testid="barcode-symbology"
              value={symbology}
              onChange={onSymbologyChange}
            >
              {SYMBOLOGIES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="barcode-page__field">
            <span>{translate("barcode.scale_label")}</span>
            <input
              data-testid="barcode-scale"
              type="range"
              min={1}
              max={10}
              step={1}
              value={scale}
              onChange={onScaleChange}
            />
            <output>{scale}&times;</output>
          </label>

          <button
            type="button"
            className="barcode-page__reset"
            data-testid="barcode-reset"
            onClick={reset}
          >
            {translate("barcode.reset")}
          </button>
        </section>

        <section className="barcode-page__preview" aria-live="polite">
          {rendered.markup ? (
            <>
              <Barcode
                text={payload.trim()}
                bcid={symbology}
                options={{ scale } as never}
                className="barcode-page__canvas"
                ariaLabel={translate("barcode.preview_aria")}
              />
              <p className="barcode-page__meta" data-testid="barcode-chars">
                {translate("barcode.char_count", { count: payload.length })}
              </p>
            </>
          ) : rendered.error ? (
            <p
              className="barcode-page__error"
              data-testid="barcode-error"
              role="alert"
            >
              {translate("barcode.error")}
            </p>
          ) : (
            <p className="barcode-page__empty" data-testid="barcode-empty">
              {translate("barcode.empty")}
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
