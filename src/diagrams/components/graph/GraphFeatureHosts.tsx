import { useState } from 'react';
import type { ComponentType, ReactElement } from 'react';

/**
 * @description Props common to the optional graph feature hosts.
 * @summary Props common to the optional graph feature hosts.
 * @memberOf module:for-react.diagrams
 */
export interface GraphFeatureHostProps {
  value?: string;
  placeholder?: string;
  mode?: 'code' | 'formula';
  disabled?: boolean;
  onChange?: (value: string) => void;
}

/**
 * @description Optional host-provided code editor contract.
 * @summary Optional host-provided code editor contract.
 * @memberOf module:for-react.diagrams
 */
export interface GraphCodeEditorType {
  (props: GraphFeatureHostProps): ReactElement;
}

/**
 * @description Optional host-provided model builder contract.
 * @summary Optional host-provided model builder contract.
 * @memberOf module:for-react.diagrams
 */
export interface GraphModelBuilderType {
  (props: { value?: Record<string, unknown>; onChange?: (value: Record<string, unknown>) => void }): ReactElement;
}

/**
 * @description Props accepted by the code editor host.
 * @summary Props accepted by the code editor host.
 * @memberOf module:for-react.diagrams
 */
export interface GraphCodeEditorHostProps extends GraphFeatureHostProps {
  component?: GraphCodeEditorType;
}

/**
 * @description Code editor host: renders the registered editor when the host provides one and degrades to a plain code textarea otherwise (the headless parity fallback).
 * @summary Code editor host: renders the registered editor when the host provides one and degrades to a plain code textarea otherwise (the headless parity fallback).
 * @memberOf module:for-react.diagrams
 */
export function GraphCodeEditorHostComponent({ component: Editor, value = '', placeholder, mode = 'code', disabled, onChange }: GraphCodeEditorHostProps) {
  if (Editor) return <Editor value={value} placeholder={placeholder} mode={mode} disabled={disabled} onChange={onChange} />;
  return (
    <textarea
      className={`graph-code-editor-host graph-code-editor-host--${mode}`}
      value={value}
      placeholder={placeholder ?? '// code runs backend-side'}
      rows={8}
      spellCheck={false}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

/**
 * @description Props accepted by the model builder host.
 * @summary Props accepted by the model builder host.
 * @memberOf module:for-react.diagrams
 */
export interface GraphModelBuilderHostProps {
  value?: Record<string, unknown>;
  onChange?: (value: Record<string, unknown>) => void;
  component?: GraphModelBuilderType;
}

/**
 * @description Model builder host: renders the registered builder or a JSON textarea fallback.
 * @summary Model builder host: renders the registered builder or a JSON textarea fallback.
 * @memberOf module:for-react.diagrams
 */
export function GraphModelBuilderHostComponent({ value, onChange, component: Builder }: GraphModelBuilderHostProps) {
  const [draft, setDraft] = useState(JSON.stringify(value ?? {}, null, 2));
  if (Builder) return <Builder value={value} onChange={onChange} />;
  return (
    <textarea
      className="graph-model-builder-host"
      value={draft}
      rows={8}
      onChange={(event) => {
        setDraft(event.target.value);
        try {
          onChange?.(JSON.parse(event.target.value) as Record<string, unknown>);
        } catch {
          // keep invalid JSON out of the document until it parses
        }
      }}
    />
  );
}

/**
 * @description Registered feature component contract (provider value).
 * @summary Registered feature component contract (provider value).
 * @memberOf module:for-react.diagrams
 */
export type GraphFeatureComponent = ComponentType<never> | null;
