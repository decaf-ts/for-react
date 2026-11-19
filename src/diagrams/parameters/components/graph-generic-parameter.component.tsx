import type { GraphParameterRendererContract } from '../GraphParameterRendererContract.js';

function textValueOf(value: GraphParameterRendererContract['value']): string {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  return JSON.stringify(value, null, 2);
}

/**
 * @description Fallback parameter renderer used when no schema-specific renderer is registered.
 * @summary Fallback parameter renderer used when no schema-specific renderer is registered.
 * @memberOf module:for-react.diagrams
 */
export function GraphGenericParameterComponent({
  parameter,
  value,
  disabled,
  onValueChange,
}: GraphParameterRendererContract) {
  const textValue = textValueOf(value);
  const structured =
    typeof value === 'object' ||
    (value !== undefined && value !== null && typeof value !== 'string');
  const handle = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const raw = event.target.value.trim();
    onValueChange(raw === '' ? undefined : raw);
  };
  return structured ? (
    <textarea
      className="graph-parameter-generic graph-parameter-textarea"
      value={textValue}
      placeholder={parameter.placeholder ?? ''}
      rows={6}
      disabled={disabled}
      onChange={handle}
    />
  ) : (
    <input
      className="graph-parameter-generic graph-parameter-input"
      type="text"
      value={textValue}
      placeholder={parameter.placeholder ?? ''}
      disabled={disabled}
      onChange={handle}
    />
  );
}

export default GraphGenericParameterComponent;
