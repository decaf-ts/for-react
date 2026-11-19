import { useEffect, useState } from 'react';
import type { ConditionExpression, SwitchCase } from '@decaf-ts/as-graph/shared';

/**
 * @description Props accepted by the switch-case editor modal.
 * @summary Props accepted by the switch-case editor modal.
 * @memberOf module:for-react.diagrams
 */
export interface GraphSwitchEditModalProps {
  open: boolean;
  cases?: SwitchCase[];
  hasDefault?: boolean;
  defaultPort?: string;
  onClose?: () => void;
  onSubmit?: (result: { cases: SwitchCase[]; hasDefault: boolean; defaultPort: string }) => void;
}

function emptyCase(index: number): SwitchCase {
  return {
    id: `case-${index}`,
    label: `Case ${index + 1}`,
    outputPort: `case-${index}`,
    condition: { op: 'eq', left: { path: 'value' }, right: { const: '' } } as ConditionExpression,
  };
}

/**
 * @description Switch-case editor: add/remove branches and edit their output ports and conditions.
 * @summary Switch-case editor: add/remove branches and edit their output ports and conditions.
 * @memberOf module:for-react.diagrams
 */
export function GraphSwitchEditModal({ open, cases = [], hasDefault = false, defaultPort = 'default', onClose, onSubmit }: GraphSwitchEditModalProps) {
  const [draft, setDraft] = useState<SwitchCase[]>(cases);
  const [defaultEnabled, setDefaultEnabled] = useState(hasDefault);
  const [port, setPort] = useState(defaultPort);

  useEffect(() => {
    setDraft(cases);
    setDefaultEnabled(hasDefault);
    setPort(defaultPort);
  }, [cases, hasDefault, defaultPort, open]);

  if (!open) return null;

  return (
    <div className="graph-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="graph-modal graph-switch-edit-modal" role="dialog" aria-modal="true" aria-labelledby="graph-switch-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="graph-modal__header">
          <h3 id="graph-switch-title">Switch cases</h3>
          <button type="button" className="graph-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </header>
        <div className="graph-modal__body">
          {draft.map((entry, index) => (
            <fieldset key={entry.id} className="graph-switch-case">
              <legend>Case {index + 1}</legend>
              <label>
                Label
                <input
                  type="text"
                  value={entry.label}
                  onChange={(event) => setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))}
                />
              </label>
              <label>
                Output port
                <input
                  type="text"
                  value={entry.outputPort}
                  onChange={(event) => setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, outputPort: event.target.value } : item))}
                />
              </label>
              <label>
                Condition (JSON)
                <textarea
                  rows={4}
                  value={JSON.stringify(entry.condition, null, 2)}
                  onChange={(event) => {
                    try {
                      const condition = JSON.parse(event.target.value) as ConditionExpression;
                      setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, condition } : item));
                    } catch {
                      // keep the last valid condition while the user types
                    }
                  }}
                />
              </label>
              <button type="button" className="graph-modal__btn" onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                Remove case
              </button>
            </fieldset>
          ))}
          <button type="button" className="graph-modal__btn" onClick={() => setDraft((current) => [...current, emptyCase(current.length)])}>
            Add case
          </button>
          <label className="graph-switch-default">
            <input type="checkbox" checked={defaultEnabled} onChange={(event) => setDefaultEnabled(event.target.checked)} />
            Has default branch
          </label>
          <label>
            Default port
            <input type="text" value={port} disabled={!defaultEnabled} onChange={(event) => setPort(event.target.value)} />
          </label>
        </div>
        <footer className="graph-modal__footer">
          <button type="button" className="graph-modal__btn" onClick={onClose}>Cancel</button>
          <button type="button" className="graph-modal__btn graph-modal__btn--primary" onClick={() => onSubmit?.({ cases: draft, hasDefault: defaultEnabled, defaultPort: port })}>
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

export default GraphSwitchEditModal;
