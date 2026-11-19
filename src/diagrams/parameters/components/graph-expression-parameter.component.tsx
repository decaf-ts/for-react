import type { GraphParameterRendererContract } from '../GraphParameterRendererContract.js';

/**
 * @description Expression parameter renderer: raw expression text editing.
 * @summary Expression parameter renderer: raw expression text editing.
 * @memberOf module:for-react.diagrams
 */
export function GraphExpressionParameterComponent({
  parameter,
  value,
  disabled,
  onValueChange,
}: GraphParameterRendererContract) {
  const expression = typeof value === 'string' ? value : '';
  return (
    <input
      className="graph-expression-parameter graph-parameter-input"
      type="text"
      value={expression}
      placeholder={parameter.placeholder ?? ''}
      disabled={disabled}
      onChange={(event) => {
        const next = event.target.value.trim();
        onValueChange(next === '' ? undefined : next);
      }}
    />
  );
}

export default GraphExpressionParameterComponent;
