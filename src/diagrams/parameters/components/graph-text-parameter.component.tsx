import type { GraphParameterRendererContract } from '../GraphParameterRendererContract.js';

function textValueOf(value: GraphParameterRendererContract['value']): string {
  if (typeof value === 'string') return value;
  return value === undefined || value === null ? '' : String(value);
}

/**
 * @description Text parameter renderer: single-line input or auto-growing textarea.
 * @summary Text parameter renderer: single-line input or auto-growing textarea.
 * @memberOf module:for-react.diagrams
 */
export function GraphTextParameterComponent({
  parameter,
  value,
  disabled,
  onValueChange,
}: GraphParameterRendererContract) {
  const multiline = (parameter as { multiline?: boolean }).multiline === true;
  const textValue = textValueOf(value);
  const handle = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = event.target.value;
    onValueChange(next === '' ? undefined : next);
  };
  return multiline ? (
    <textarea
      className="graph-parameter-textarea"
      value={textValue}
      placeholder={parameter.placeholder ?? ''}
      disabled={disabled}
      rows={4}
      onChange={handle}
    />
  ) : (
    <input
      className="graph-parameter-input"
      type="text"
      value={textValue}
      placeholder={parameter.placeholder ?? ''}
      disabled={disabled}
      onChange={handle}
    />
  );
}

export default GraphTextParameterComponent;
