import React, { useMemo } from "react";
import { Model } from "@decaf-ts/decorator-validation";
import {
  getRgxRenderingEngine,
  RgxRenderingEngine,
} from "../../engine/RgxRenderingEngine.js";
import { KeyValue } from "../../engine/types.js";

/**
 * @description Props accepted by {@link RgxModelRenderer}.
 * @summary Supplies the model to render, the globals passed to the rendering
 * engine, an optional engine override and a wrapper class.
 * @memberOf module:for-react
 */
export interface RgxModelRendererProps {
  model: Model | string;
  globals?: KeyValue;
  engine?: RgxRenderingEngine;
  className?: string;
}

/**
 * @description React equivalent of `ngx-decaf-model-renderer`.
 * @summary Accepts a model instance or a registered model name and renders it
 * through the rendering engine, wrapping the output in a div.
 * @param {RgxModelRendererProps} props - The model, globals and rendering options.
 * @returns {React.ReactElement | null} The rendered model, or null when rendering produces no output.
 * @memberOf module:for-react
 */
export const RgxModelRenderer: React.FC<RgxModelRendererProps> = ({
  model,
  globals = {},
  engine,
  className,
}) => {
  const renderingEngine = engine ?? getRgxRenderingEngine();

  const rendered = useMemo(() => {
    const instance = typeof model === "string" ? Model.build({}, model) : model;
    if (!instance) return null;
    return renderingEngine.render(instance, globals);
  }, [model, globals, renderingEngine]);

  if (!rendered) return null;
  return <div className={className}>{rendered}</div>;
};
