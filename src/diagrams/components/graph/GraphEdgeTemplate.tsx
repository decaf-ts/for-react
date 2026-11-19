import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { useSignalValue } from '../../internal/reactive.js';
import { graphExecutionState } from '../../execution/GraphExecutionStateService.js';

/**
 * @description Custom edge template applying the run's visual state to every canvas edge. State resolves through the engine plan-edge id carried on the edge data, with the React Flow edge id as the fallback.
 * @summary Custom edge template applying the run's visual state to every canvas edge.  State resolves through the engine plan-edge id carried on the edge data, with the React Flow edge id as the fallback.
 * @memberOf module:for-react.diagrams
 */
export function GraphEdgeTemplate({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const edgeData = (data ?? {}) as { label?: string; engineEdgeId?: string };
  const edgeStates = useSignalValue(graphExecutionState.edgeStates);
  const state = edgeStates[edgeData.engineEdgeId ?? id];
  const status = state?.status ?? state?.visualState ?? '';
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={`graph-edge graph-edge--${status || 'idle'}`}
      />
      {edgeData.label ? (
        <EdgeLabelRenderer>
          <div
            className="graph-edge__label"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export default GraphEdgeTemplate;
