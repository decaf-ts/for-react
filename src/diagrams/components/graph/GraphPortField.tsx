import { useEffect, useMemo, useState } from 'react';
import type { GraphPortDefinition, GraphValueTemplateLanguage } from '@decaf-ts/as-graph/shared';
import {
  graphPortDefaultValueMode,
  graphPortValueModesOf,
  graphPortValueModeOf,
  graphPortValueBodyOf,
  graphPortValuePatchOf,
  type GraphPortValueMode,
} from './graph-port-value.js';

/**
 * @description Declarative configuration for one port field.
 * @summary Declarative configuration for one port field.
 * @memberOf module:for-react.diagrams
 */
export interface GraphPortFieldConfig {
  port: GraphPortDefinition;
  label: string;
  type: string;
  value: unknown;
  useAsPort: boolean;
  valueMode?: GraphPortValueMode;
  language?: GraphValueTemplateLanguage;
  valueModes?: GraphPortValueMode[];
}

/**
 * @description Value edit emitted on every content change.
 * @summary Value edit emitted on every content change.
 * @memberOf module:for-react.diagrams
 */
export interface GraphPortFieldChange {
  property: string;
  value: unknown;
  useAsPort: boolean;
}

/**
 * @description Value-mode edit emitted when the user switches the input mode.
 * @summary Value-mode edit emitted when the user switches the input mode.
 * @memberOf module:for-react.diagrams
 */
export interface GraphPortFieldModeChange {
  property: string;
  mode: GraphPortValueMode;
  language?: GraphValueTemplateLanguage;
}

/**
 * @description Props accepted by the port field editor.
 * @summary Props accepted by the port field editor.
 * @memberOf module:for-react.diagrams
 */
export interface GraphPortFieldProps {
  field: GraphPortFieldConfig;
  disabled?: boolean;
  onChange?: (change: GraphPortFieldChange) => void;
  onModeChange?: (change: GraphPortFieldModeChange) => void;
  onDefinitionChange?: (definition: Record<string, unknown> | null) => void;
}

const MODE_LABELS: Record<GraphPortValueMode, string> = {
  port: 'Port',
  literal: 'Value',
  expression: 'Code',
  template: 'Template',
  formula: 'Formula',
};

/**
 * @description Editor for one node port: port/value toggle, value-mode switching and value editing.
 * @summary Editor for one node port: port/value toggle, value-mode switching and value editing.
 * @memberOf module:for-react.diagrams
 */
export function GraphPortFieldComponent({ field, disabled, onChange, onModeChange }: GraphPortFieldProps) {
  const valueModes = useMemo(
    () => field.valueModes ?? graphPortValueModesOf(field.port),
    [field.valueModes, field.port]
  );
  const initialMode = useMemo(
    () => field.valueMode ?? graphPortValueModeOf(field.port, undefined, field.value) ?? graphPortDefaultValueMode(field.port),
    [field.valueMode, field.port, field.value]
  );
  const [mode, setMode] = useState<GraphPortValueMode>(initialMode);
  const [text, setText] = useState(() => graphPortValueBodyOf(undefined, field.value));

  useEffect(() => {
    setMode(initialMode);
    setText(graphPortValueBodyOf(undefined, field.value));
  }, [initialMode, field.port, field.value]);

  const emitMode = (next: GraphPortValueMode) => {
    setMode(next);
    setText(graphPortValueBodyOf(undefined, field.value));
    onModeChange?.({
      property: field.port.property,
      mode: next,
      language: field.language,
    });
  };

  const emitValue = (nextText: string) => {
    setText(nextText);
    const patch = graphPortValuePatchOf(field.port, mode, nextText);
    if (patch) onChange?.({ property: field.port.property, value: nextText, useAsPort: field.useAsPort });
  };

  const isPortMode = mode === 'port';

  return (
    <div className="graph-port-field" data-port-property={field.port.property}>
      <div className="graph-port-field__header">
        <span className="graph-port-field__label">{field.label || field.port.name || field.port.property}</span>
        <button
          type="button"
          className={`graph-port-field__port-toggle${field.useAsPort ? ' graph-port-field__port-toggle--on' : ''}`}
          aria-pressed={field.useAsPort}
          disabled={disabled}
          title={field.useAsPort ? 'Use a literal value instead of a live port' : 'Expose as a live port'}
          onClick={() =>
            onChange?.({
              property: field.port.property,
              value: field.value,
              useAsPort: !field.useAsPort,
            })
          }
        >
          {field.useAsPort ? 'Port' : 'Value'}
        </button>
      </div>
      {!isPortMode ? (
        <div className="graph-port-field__modes" role="group" aria-label="Value input mode">
          {valueModes
            .filter((entry) => entry !== 'port')
            .map((entry) => (
              <button
                key={entry}
                type="button"
                className={`graph-port-field__mode${mode === entry ? ' graph-port-field__mode--active' : ''}`}
                aria-pressed={mode === entry}
                disabled={disabled}
                onClick={() => emitMode(entry)}
              >
                {MODE_LABELS[entry]}
              </button>
            ))}
        </div>
      ) : null}
      {mode === 'expression' || mode === 'formula' ? (
        <textarea
          className="graph-port-field__code"
          rows={6}
          spellCheck={false}
          value={text}
          disabled={disabled || isPortMode}
          onChange={(event) => emitValue(event.target.value)}
        />
      ) : mode === 'template' ? (
        <input
          className="graph-port-field__input"
          type="text"
          value={text}
          disabled={disabled || isPortMode}
          placeholder="Template with {{placeholders}}"
          onChange={(event) => emitValue(event.target.value)}
        />
      ) : field.type === 'textarea' ? (
        <textarea
          className="graph-port-field__textarea"
          rows={4}
          value={text}
          disabled={disabled || isPortMode}
          onChange={(event) => emitValue(event.target.value)}
        />
      ) : (
        <input
          className="graph-port-field__input"
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          value={text}
          disabled={disabled || isPortMode}
          onChange={(event) => emitValue(event.target.value)}
        />
      )}
    </div>
  );
}

export default GraphPortFieldComponent;
