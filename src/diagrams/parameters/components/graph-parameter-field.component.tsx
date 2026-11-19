import { useMemo, useState } from 'react';
import type { GraphParameterDefinition } from '@decaf-ts/as-graph/shared';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract.js';
import {
  GraphParameterRendererRegistry,
  graphRegisterParameterRenderers,
} from '../GraphParameterRendererRegistry.js';

/**
 * @description Props accepted by the parameter field dispatcher.
 * @summary Props accepted by the parameter field dispatcher.
 * @memberOf module:for-react.diagrams
 */
export interface GraphParameterFieldProps {
  parameter: GraphParameterDefinition;
  value: GraphParameterRendererContract['value'];
  disabled?: boolean;
  context?: GraphParameterFormContext;
  onValueChange: GraphParameterRendererContract['onValueChange'];
  onErrorChange?: GraphParameterRendererContract['onErrorChange'];
  registry?: GraphParameterRendererRegistry;
}

const defaultRegistry = graphRegisterParameterRenderers(new GraphParameterRendererRegistry());

/**
 * @description Parameter field dispatcher: resolves the registered renderer for a parameter's schema type and delegates value editing to it.
 * @summary Parameter field dispatcher: resolves the registered renderer for a parameter's schema type and delegates value editing to it.
 * @memberOf module:for-react.diagrams
 */
export function GraphParameterFieldComponent({
  parameter,
  value,
  disabled = false,
  context,
  onValueChange,
  onErrorChange,
  registry = defaultRegistry,
}: GraphParameterFieldProps) {
  const [errors, setErrors] = useState<GraphParameterValueIssue[]>([]);
  const Renderer = useMemo(() => registry.resolve(parameter), [registry, parameter]);

  if (parameter.type === 'hidden') return null;
  if (parameter.type === 'notice') {
    return <div className="graph-parameter-field-notice">{parameter.label ?? parameter.id}</div>;
  }

  return (
    <div className="graph-parameter-field">
      <label className="graph-parameter-field-label">{parameter.label ?? parameter.id}</label>
      <Renderer
        parameter={parameter}
        value={value}
        disabled={disabled}
        context={context}
        onValueChange={onValueChange}
        onErrorChange={(next) => {
          setErrors(next);
          onErrorChange?.(next);
        }}
      />
      {parameter.description ? (
        <div className="graph-parameter-field-description">{parameter.description}</div>
      ) : null}
      {errors.length ? (
        <div className="graph-parameter-field-error" role="alert">
          {errors[0].message}
        </div>
      ) : null}
    </div>
  );
}

export default GraphParameterFieldComponent;
