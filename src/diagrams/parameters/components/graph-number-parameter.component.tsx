import type { GraphParameterRendererContract } from '../GraphParameterRendererContract.js';

/**
 * @description Number parameter renderer: numeric input honouring the declared min/max/step.
 * @summary Number parameter renderer: numeric input honouring the declared min/max/step.
 * @memberOf module:for-react.diagrams
 */
export function GraphNumberParameterComponent({
  parameter,
  value,
  disabled,
  onValueChange,
}: GraphParameterRendererContract) {
  const integer = (parameter as { integer?: boolean }).integer === true;
  const min = (parameter as { min?: number }).min;
  const max = (parameter as { max?: number }).max;
  const step = (parameter as { step?: number }).step;
  const handle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.trim();
    if (!raw) {
      onValueChange(undefined);
      return;
    }
    const parsed = Number(raw);
    onValueChange(Number.isFinite(parsed) ? parsed : undefined);
  };
  return (
    <input
      className="graph-number-parameter graph-parameter-input"
      type={integer ? 'number' : 'text'}
      inputMode="decimal"
      value={typeof value === 'number' ? String(value) : ''}
      placeholder={parameter.placeholder ?? ''}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={handle}
    />
  );
}

export default GraphNumberParameterComponent;
