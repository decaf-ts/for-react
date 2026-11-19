import { useEffect, useState } from 'react';
import type { ConditionExpression } from '@decaf-ts/as-graph/shared';

/**
 * @description Props accepted by the graphical/code condition editor.
 * @summary Props accepted by the graphical/code condition editor.
 * @memberOf module:for-react.diagrams
 */
export interface GraphConditionEditorProps {
  value?: ConditionExpression | null;
  onChange?: (value: ConditionExpression | null) => void;
  disabled?: boolean;
}

/**
 * @description Condition editor: graphical JSON editing with validation for one condition expression.
 * @summary Condition editor: graphical JSON editing with validation for one condition expression.
 * @memberOf module:for-react.diagrams
 */
export function GraphConditionEditorComponent({ value, onChange, disabled }: GraphConditionEditorProps) {
  const [mode, setMode] = useState<'graphical' | 'code'>(value && (value as { type?: string }).type === 'code' ? 'code' : 'graphical');
  const [text, setText] = useState(value ? JSON.stringify(value, null, 2) : '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(value ? JSON.stringify(value, null, 2) : '');
  }, [value]);

  const commit = (next: string) => {
    setText(next);
    if (!next.trim()) {
      setError(null);
      onChange?.(null);
      return;
    }
    try {
      const parsed = JSON.parse(next) as ConditionExpression;
      setError(null);
      onChange?.(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid condition JSON.');
    }
  };

  return (
    <div className="graph-condition-editor">
      <div className="graph-condition-editor__modes" role="tablist" aria-label="Condition mode">
        <button type="button" role="tab" aria-selected={mode === 'graphical'} onClick={() => setMode('graphical')}>
          Graphical
        </button>
        <button type="button" role="tab" aria-selected={mode === 'code'} onClick={() => setMode('code')}>
          Code
        </button>
      </div>
      <textarea
        className="graph-condition-editor__input"
        value={mode === 'code' ? text : text}
        disabled={disabled}
        rows={8}
        aria-label="Condition expression"
        onChange={(event) => commit(event.target.value)}
      />
      {error ? <p className="graph-condition-editor__error" role="alert">{error}</p> : null}
    </div>
  );
}

export default GraphConditionEditorComponent;
