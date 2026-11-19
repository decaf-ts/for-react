import { useEffect, useRef, useState } from 'react';
import type {
  GraphJsonPrimitive,
  GraphParameterOption,
} from '@decaf-ts/as-graph/shared';
import {
  isGraphJsonPrimitive,
  isGraphParameterOption,
  isGraphParameterOptionArray,
} from '@decaf-ts/as-graph/shared';
import type { GraphParameterRendererContract } from '../GraphParameterRendererContract.js';

function primitiveString(value: GraphJsonPrimitive): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * @description Options parameter renderer: single- or multi-select from static or loaded options.
 * @summary Options parameter renderer: single- or multi-select from static or loaded options.
 * @memberOf module:for-react.diagrams
 */
export function GraphOptionsParameterComponent({
  parameter,
  value,
  disabled,
  context,
  onValueChange,
}: GraphParameterRendererContract) {
  const definition = parameter as {
    options?: unknown;
    loadOptionsMethod?: string;
    multiple?: boolean;
    placeholder?: string;
  };
  const multiple = definition.multiple === true;
  const [resolved, setResolved] = useState<GraphParameterOption[]>([]);
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!definition.loadOptionsMethod || !context?.loadOptions) return;
    const token = (tokenRef.current += 1);
    void context
      .loadOptions(parameter, {
        method: definition.loadOptionsMethod,
        nodeId: context.node?.id ?? '',
      })
      .then((response) => {
        if (token !== tokenRef.current) return;
        const next: GraphParameterOption[] = [];
        if (Array.isArray(response)) {
          for (const entry of response) {
            if (isGraphParameterOption(entry)) next.push(entry);
            else if (isGraphJsonPrimitive(entry)) next.push({ label: String(entry), value: entry });
          }
        }
        setResolved(next);
      })
      .catch(() => setResolved([]));
    return () => {
      tokenRef.current += 1;
    };
  }, [parameter, context, definition.loadOptionsMethod]);

  const options = isGraphParameterOptionArray(definition.options)
    ? definition.options
    : resolved;

  if (definition.loadOptionsMethod && options.length === 0) {
    return (
      <input
        className="graph-options-loading graph-parameter-input"
        type="text"
        value=""
        placeholder={definition.placeholder ?? ''}
        disabled={disabled}
        onChange={() => undefined}
      />
    );
  }

  if (multiple) {
    const selected = Array.isArray(value)
      ? value.filter((entry) => isGraphJsonPrimitive(entry)) as GraphJsonPrimitive[]
      : [];
    return (
      <select
        className="graph-options-parameter graph-parameter-select"
        multiple
        disabled={disabled}
        value={selected.map(primitiveString)}
        onChange={(event) => {
          const next = Array.from(event.target.selectedOptions)
            .map((option) => options.find((entry) => primitiveString(entry.value) === option.value)?.value)
            .filter((entry): entry is GraphJsonPrimitive => isGraphJsonPrimitive(entry));
          onValueChange(next);
        }}
      >
        {options.map((entry) => (
          <option key={primitiveString(entry.value)} value={primitiveString(entry.value)}>
            {entry.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <select
      className="graph-options-parameter graph-parameter-select"
      disabled={disabled}
      value={isGraphJsonPrimitive(value) ? primitiveString(value) : ''}
      onChange={(event) => {
        const option = options.find((entry) => primitiveString(entry.value) === event.target.value);
        onValueChange(option ? option.value : undefined);
      }}
    >
      <option value="">{definition.placeholder ?? ''}</option>
      {options.map((entry) => (
        <option key={primitiveString(entry.value)} value={primitiveString(entry.value)}>
          {entry.label}
        </option>
      ))}
    </select>
  );
}

export default GraphOptionsParameterComponent;
