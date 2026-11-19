import type { GraphJsonValue } from '@decaf-ts/as-graph/shared';
import type { GraphParameterRendererContract } from '../GraphParameterRendererContract.js';

/**
 * @description Resource-locator parameter renderer: edits the mode plus the mode's value.
 * @summary Resource-locator parameter renderer: edits the mode plus the mode's value.
 * @memberOf module:for-react.diagrams
 */
export function GraphResourceLocatorParameterComponent({
  parameter,
  value,
  disabled,
  onValueChange,
}: GraphParameterRendererContract) {
  const locator =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, GraphJsonValue>)
      : undefined;
  const mode = locator?.['mode'] === 'dynamic' ? 'dynamic' : 'list';
  const modes = (parameter as { modes?: ('list' | 'dynamic')[] }).modes ?? ['list'];
  const textValue = locator?.['value'];
  const locatorText =
    typeof textValue === 'string' ? textValue : textValue === undefined || textValue === null ? '' : String(textValue);

  const emit = (nextMode: 'list' | 'dynamic', nextText: string) => {
    const record: Record<string, GraphJsonValue> = { ...(locator ?? {}), mode: nextMode };
    if (nextText) record['value'] = nextText;
    else delete record['value'];
    onValueChange(record);
  };

  return (
    <div className="graph-resource-locator-parameter">
      <select
        className="graph-resource-locator-mode graph-parameter-select"
        value={mode}
        disabled={disabled}
        onChange={(event) => emit(event.target.value === 'dynamic' ? 'dynamic' : 'list', locatorText)}
      >
        {modes.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
      </select>
      <input
        className="graph-resource-locator-value graph-parameter-input"
        type="text"
        value={locatorText}
        placeholder={parameter.placeholder ?? ''}
        disabled={disabled}
        onChange={(event) => emit(mode, event.target.value.trim())}
      />
    </div>
  );
}

export default GraphResourceLocatorParameterComponent;
