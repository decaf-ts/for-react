import { useEffect, useState } from 'react';
import type { GraphJsonValue, GraphNodeInstance, GraphNodeManifest } from '@decaf-ts/as-graph/shared';
import { GraphParameterFormBuilder } from '../../parameters/GraphParameterFormBuilder.js';
import { GraphParameterFieldComponent } from '../../parameters/components/graph-parameter-field.component.js';

/**
 * @description Props accepted by the node CRUD modal.
 * @summary Props accepted by the node CRUD modal.
 * @memberOf module:for-react.diagrams
 */
export interface GraphNodeEditModalProps {
  open: boolean;
  node?: GraphNodeInstance | null;
  manifest?: GraphNodeManifest | null;
  degraded?: boolean;
  degradedReason?: string;
  onClose?: () => void;
  onSubmit?: (parameters: Record<string, GraphJsonValue>, label?: string) => void;
}

/**
 * @description Node CRUD modal: renders the manifest-driven parameter form for one node and submits the edited parameter values through the canonical document store.
 * @summary Node CRUD modal: renders the manifest-driven parameter form for one node and submits the edited parameter values through the canonical document store.
 * @memberOf module:for-react.diagrams
 */
export function GraphNodeEditModal({
  open,
  node,
  manifest,
  degraded = false,
  degradedReason = '',
  onClose,
  onSubmit,
}: GraphNodeEditModalProps) {
  const [values, setValues] = useState<Record<string, GraphJsonValue | undefined>>({});
  const [label, setLabel] = useState('');
  const [issues, setIssues] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!node) return;
    setValues({ ...(node.parameters ?? {}) });
    setLabel(node.label ?? '');
    setIssues({});
  }, [node]);

  if (!open || !node) return null;

  const form = manifest ? new GraphParameterFormBuilder().buildForm(node, manifest) : null;
  const fields = form?.renderedParameters ?? [];
  const hasBlockingIssues = Object.values(issues).some((list) => list.length > 0);

  return (
    <div className="graph-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="graph-modal graph-node-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="graph-node-edit-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="graph-modal__header">
          <h3 id="graph-node-edit-title">{manifest?.display?.name ?? node.kind}</h3>
          <button type="button" className="graph-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        {degraded ? (
          <p className="graph-modal__notice" role="status">
            {degradedReason || 'The node catalogue is degraded; dynamic parameter options may be incomplete.'}
          </p>
        ) : null}
        <div className="graph-modal__body">
          <label className="graph-parameter-field">
            <span className="graph-parameter-field-label">Label</span>
            <input
              className="graph-parameter-input"
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          {fields.length ? (
            fields.map((parameter) => (
              <GraphParameterFieldComponent
                key={parameter.id}
                parameter={parameter}
                value={values[parameter.id]}
                context={manifest ? { node, manifest, values } : undefined}
                onValueChange={(next) => setValues((current) => {
                  const updated = { ...current };
                  if (next === undefined) delete updated[parameter.id];
                  else updated[parameter.id] = next;
                  return updated;
                })}
                onErrorChange={(next) => setIssues((current) => ({
                  ...current,
                  [parameter.id]: next.map((issue) => issue.message),
                }))}
              />
            ))
          ) : (
            <p className="graph-modal__empty">This node kind declares no editable parameters.</p>
          )}
        </div>
        <footer className="graph-modal__footer">
          <button type="button" className="graph-modal__btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="graph-modal__btn graph-modal__btn--primary"
            disabled={hasBlockingIssues}
            onClick={() => {
              const next: Record<string, GraphJsonValue> = {};
              for (const [key, value] of Object.entries(values)) {
                if (value !== undefined) next[key] = value;
              }
              onSubmit?.(next, label.trim() || undefined);
            }}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

export default GraphNodeEditModal;
