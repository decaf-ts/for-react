import type { GraphNodeInspectionPayload } from '@decaf-ts/as-graph/shared';
import { useSignalValue } from '../../internal/reactive.js';
import { graphInspection } from '../../execution/GraphInspectionStore.js';
import { GraphIoViewerComponent } from './graph-io-viewer.component.js';

/**
 * @description Props accepted by the node inspection split view.
 * @summary Props accepted by the node inspection split view.
 * @memberOf module:for-react.diagrams
 */
export interface GraphNodeInspectionProps {
  nodeId?: string | null;
  payload?: GraphNodeInspectionPayload | null;
  runId?: string;
  backendUrl?: string;
  onClose?: () => void;
}

/**
 * @description Node inspection split view: inputs on the right, outputs or error on the left.
 * @summary Node inspection split view: inputs on the right, outputs or error on the left.
 * @memberOf module:for-react.diagrams
 */
export function GraphNodeInspectionComponent({ nodeId, payload: providedPayload, runId = '', backendUrl = '', onClose }: GraphNodeInspectionProps) {
  const openNodeId = useSignalValue(graphInspection.openNodeId);
  const inspections = useSignalValue(graphInspection.inspections);
  const activeId = nodeId ?? openNodeId;
  if (!activeId) return null;
  const payload = providedPayload ?? inspections[activeId] ?? null;
  return (
    <section className="graph-node-inspection" aria-label={`Node ${activeId} inspection`}>
      <header className="graph-node-inspection__header">
        <h4>{activeId}</h4>
        {onClose ? (
          <button type="button" className="graph-node-inspection__close" aria-label="Close inspection" onClick={onClose}>
            ×
          </button>
        ) : null}
      </header>
      <div className="graph-node-inspection__split">
        <GraphIoViewerComponent
          title="Inputs"
          value={payload?.inputs}
          runId={runId}
          nodeId={activeId}
          field="inputs"
          backendUrl={backendUrl}
        />
        {payload?.error ? (
          <GraphIoViewerComponent
            title="Error"
            value={payload.error}
            error={payload.error}
            runId={runId}
            nodeId={activeId}
            field="outputs"
            backendUrl={backendUrl}
          />
        ) : (
          <GraphIoViewerComponent
            title="Outputs"
            value={payload?.outputs}
            runId={runId}
            nodeId={activeId}
            field="outputs"
            backendUrl={backendUrl}
          />
        )}
      </div>
    </section>
  );
}

export default GraphNodeInspectionComponent;
