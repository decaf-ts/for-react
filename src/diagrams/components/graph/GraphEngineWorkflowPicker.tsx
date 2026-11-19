import { useEffect } from 'react';
import type { GraphEngineWorkflowSelection, GraphEngineWorkflowSummary } from '../../capabilities/GraphEngineCapability.js';
import { GraphEngineCapabilityService } from '../../capabilities/GraphEngineCapabilityService.js';
import { useSignalValue } from '../../internal/reactive.js';

/**
 * @description Props accepted by the engine/workflow picker.
 * @summary Props accepted by the engine/workflow picker.
 * @memberOf module:for-react.diagrams
 */
export interface GraphEngineWorkflowPickerProps {
  open: boolean;
  service?: GraphEngineCapabilityService;
  onSelect?: (selection: GraphEngineWorkflowSelection) => void;
  onDismiss?: () => void;
}

/**
 * @description Engine workflow picker: selects the active engine and lists its workflows.
 * @summary Engine workflow picker: selects the active engine and lists its workflows.
 * @memberOf module:for-react.diagrams
 */
export function GraphEngineWorkflowPickerComponent({ open, service, onSelect, onDismiss }: GraphEngineWorkflowPickerProps) {
  const capabilities = service ?? new GraphEngineCapabilityService();
  const engines = useSignalValue(capabilities.engines);
  const selectedEngineId = useSignalValue(capabilities.selectedEngineId);
  const workflows = useSignalValue(capabilities.workflows);
  const canListWorkflows = useSignalValue(capabilities.canBrowseWorkflows);
  const canRunWorkflow = useSignalValue(capabilities.canRunWorkflow);
  const status = useSignalValue(capabilities.status);
  const failure = useSignalValue(capabilities.failure);

  useEffect(() => {
    if (!open) return;
    void capabilities.load();
  }, [open, capabilities]);

  useEffect(() => {
    if (!open || !selectedEngineId || !canListWorkflows) return;
    void capabilities.listWorkflows(selectedEngineId).catch(() => undefined);
  }, [open, selectedEngineId, canListWorkflows, capabilities]);

  if (!open) return null;

  return (
    <div className="graph-modal-backdrop" role="presentation" onMouseDown={onDismiss}>
      <div className="graph-modal graph-engine-workflow-picker" role="dialog" aria-modal="true" aria-labelledby="graph-picker-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="graph-modal__header">
          <h3 id="graph-picker-title">Choose a workflow</h3>
          <button type="button" className="graph-modal__close" aria-label="Close" onClick={onDismiss}>×</button>
        </header>
        <div className="graph-modal__body">
          {status === 'degraded' || status === 'failed' ? (
            <p className="graph-modal__notice" role="status">{failure?.message ?? 'The engine catalogue is unavailable.'}</p>
          ) : null}
          {engines.length > 1 ? (
            <label>
              Engine
              <select value={selectedEngineId ?? ''} onChange={(event) => capabilities.selectEngine(event.target.value)}>
                {engines.map((engine) => (
                  <option key={engine.engineId} value={engine.engineId}>{engine.displayName}</option>
                ))}
              </select>
            </label>
          ) : null}
          {!canListWorkflows ? (
            <p className="graph-modal__empty">The selected engine does not advertise a workflow catalogue.</p>
          ) : workflows.length === 0 ? (
            <p className="graph-modal__empty">{status === 'loading' ? 'Loading workflows...' : 'No workflows listed.'}</p>
          ) : (
            <ul className="graph-engine-workflow-picker__list">
              {workflows.map((workflow: GraphEngineWorkflowSummary) => (
                <li key={workflow.workflowId}>
                  <span>{workflow.workflowId}</span>
                  <button
                    type="button"
                    className="graph-modal__btn graph-modal__btn--primary"
                    disabled={!canRunWorkflow}
                    onClick={() => {
                      if (!selectedEngineId) return;
                      void capabilities
                        .getWorkflow(selectedEngineId, workflow.workflowId)
                        .then((document) => {
                          if (document) onSelect?.({ engineId: selectedEngineId, summary: workflow, document });
                        })
                        .catch(() => undefined);
                    }}
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * @description Engine workflow picker used to browse an engine catalogue and load a workflow into the canvas.
 * @summary Engine workflow picker used to browse an engine catalogue and load a workflow into the canvas.
 * @memberOf module:for-react.diagrams
 */
export const GraphEngineWorkflowPicker = GraphEngineWorkflowPickerComponent;
export type { GraphEngineWorkflowSelection };
export default GraphEngineWorkflowPickerComponent;
