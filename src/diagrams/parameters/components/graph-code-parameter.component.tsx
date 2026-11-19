import type { GraphParameterRendererContract } from '../GraphParameterRendererContract.js';

/**
 * @description Code parameter renderer: multiline code editing with a textarea fallback.
 * @summary Code parameter renderer: multiline code editing with a textarea fallback.
 * @memberOf module:for-react.diagrams
 */
export function GraphCodeParameterComponent({
  parameter,
  value,
  disabled,
  onValueChange,
}: GraphParameterRendererContract) {
  const code = typeof value === 'string' ? value : '';
  const placeholder =
    (parameter as { placeholder?: string }).placeholder ??
    '// code runs backend-side; values are parameters, never manifest methods';
  return (
    <textarea
      className="graph-code-parameter graph-parameter-textarea"
      value={code}
      placeholder={placeholder}
      rows={8}
      spellCheck={false}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value === '' ? undefined : event.target.value)}
    />
  );
}

export default GraphCodeParameterComponent;
