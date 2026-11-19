import { useState } from 'react';

/**
 * @description Props accepted by the inline node editor.
 * @summary Props accepted by the inline node editor.
 * @memberOf module:for-react.diagrams
 */
export interface GraphNodeInlineEditorProps {
  nodeId: string;
  label?: string;
  value?: unknown;
  onCommit?: (value: unknown) => void;
}

/**
 * @description Inline single-value editor used inside the node inspection surface.
 * @summary Inline single-value editor used inside the node inspection surface.
 * @memberOf module:for-react.diagrams
 */
export function GraphNodeInlineEditorComponent({ nodeId, label = '', value, onCommit }: GraphNodeInlineEditorProps) {
  const [draft, setDraft] = useState(typeof value === 'string' ? value : JSON.stringify(value ?? null));
  return (
    <div className="graph-node-inline-editor" data-node-id={nodeId}>
      <label>
        {label || nodeId}
        <input type="text" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => onCommit?.(draft)} />
      </label>
    </div>
  );
}

/**
 * @description Props accepted by the workflow input editor.
 * @summary Props accepted by the workflow input editor.
 * @memberOf module:for-react.diagrams
 */
export interface GraphWorkflowInputEditorProps {
  fields: { controlName: string; label: string; value?: unknown }[];
  values?: Record<string, unknown>;
  onChange?: (values: Record<string, unknown>) => void;
}

/**
 * @description Workflow run-input editor rendering one control per declared input field.
 * @summary Workflow run-input editor rendering one control per declared input field.
 * @memberOf module:for-react.diagrams
 */
export function GraphWorkflowInputEditorComponent({ fields, values = {}, onChange }: GraphWorkflowInputEditorProps) {
  return (
    <div className="graph-workflow-input-editor">
      {fields.map((field) => (
        <label key={field.controlName}>
          {field.label}
          <input
            type="text"
            value={String(values[field.controlName] ?? field.value ?? '')}
            onChange={(event) => onChange?.({ ...values, [field.controlName]: event.target.value })}
          />
        </label>
      ))}
    </div>
  );
}

export default GraphNodeInlineEditorComponent;
