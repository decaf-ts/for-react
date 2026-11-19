import { useState } from 'react';
import type { GraphJsonValue, GraphParameterDefinition } from '@decaf-ts/as-graph/shared';
import type { GraphParameterRendererContract, GraphParameterValueIssue } from '../GraphParameterRendererContract.js';
import { GraphParameterFieldComponent } from './graph-parameter-field.component.js';

/**
 * @description Object parameter renderer: nested property editing for object-typed parameters.
 * @summary Object parameter renderer: nested property editing for object-typed parameters.
 * @memberOf module:for-react.diagrams
 */
export function GraphObjectParameterComponent({
  parameter,
  value,
  disabled,
  context,
  onValueChange,
  onErrorChange,
}: GraphParameterRendererContract) {
  const properties = (parameter as { properties?: GraphParameterDefinition[] }).properties ?? [];
  const [, setIssues] = useState<Record<string, GraphParameterValueIssue[]>>({});
  const record =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, GraphJsonValue>)
      : {};

  const handlePropertyChange = (property: GraphParameterDefinition, next: GraphJsonValue | undefined) => {
    const updated: Record<string, GraphJsonValue> = { ...record };
    if (next === undefined) delete updated[property.id];
    else updated[property.id] = next;
    onValueChange(updated);
  };

  const handlePropertyErrors = (property: GraphParameterDefinition, list: GraphParameterValueIssue[]) => {
    const remapped = list.map((issue) => ({
      ...issue,
      parameterId: parameter.id,
      path: issue.path ? `${property.id}.${issue.path}` : property.id,
    }));
    setIssues((current) => {
      const next = { ...current };
      if (remapped.length) next[property.id] = remapped;
      else delete next[property.id];
      onErrorChange?.(Object.values(next).flat());
      return next;
    });
  };

  return (
    <div className="graph-object-parameter">
      {properties.map((property) => (
        <GraphParameterFieldComponent
          key={property.id}
          parameter={property}
          value={record[property.id]}
          disabled={disabled}
          context={context ? { ...context, values: { ...record, [property.id]: undefined } } : undefined}
          onValueChange={(next) => handlePropertyChange(property, next)}
          onErrorChange={(list) => handlePropertyErrors(property, list)}
        />
      ))}
    </div>
  );
}

export default GraphObjectParameterComponent;
