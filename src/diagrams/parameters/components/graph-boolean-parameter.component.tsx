import type { GraphParameterRendererContract } from '../GraphParameterRendererContract.js';

/**
 * @description Boolean parameter renderer: a checkbox bound to the parameter value.
 * @summary Boolean parameter renderer: a checkbox bound to the parameter value.
 * @memberOf module:for-react.diagrams
 */
export function GraphBooleanParameterComponent({
  value,
  disabled,
  onValueChange,
}: GraphParameterRendererContract) {
  return (
    <input
      className="graph-boolean-parameter graph-parameter-checkbox"
      type="checkbox"
      checked={value === true}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.checked)}
    />
  );
}

export default GraphBooleanParameterComponent;
