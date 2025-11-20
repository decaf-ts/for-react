import React, { useMemo } from "react";
import { Model } from "@decaf-ts/decorator-validation";
import { RgxRenderingEngine } from "../../engine/RgxRenderingEngine";
import { KeyValue } from "../../engine/types";

const defaultEngine = new RgxRenderingEngine();
defaultEngine.initialize();

export interface RgxModelRendererProps {
  model: Model | string;
  globals?: KeyValue;
  engine?: RgxRenderingEngine;
  className?: string;
}

/**
 * React equivalent of `ngx-decaf-model-renderer`.
 * Accepts a model class instance or model name (registered via decorators) and renders it using the rendering engine.
 */
export const RgxModelRenderer: React.FC<RgxModelRendererProps> = ({
  model,
  globals = {},
  engine,
  className,
}) => {
  const renderingEngine = engine ?? defaultEngine;

  const rendered = useMemo(() => {
    const instance = typeof model === "string" ? Model.build({}, model) : model;
    if (!instance) return null;
    return renderingEngine.render(instance, globals);
  }, [model, globals, renderingEngine]);

  if (!rendered) return null;
  return <div className={className}>{rendered}</div>;
};
