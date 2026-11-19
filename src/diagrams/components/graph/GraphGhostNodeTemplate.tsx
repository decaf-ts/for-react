import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useSignalValue } from '../../internal/reactive.js';
import { ghostNodeStore } from '../../execution/GhostNodeStore.js';
import { useGraphCanvasActions } from './GraphCanvasContext.js';

interface GhostFlowData extends Record<string, unknown> {
  ghostParentId?: string;
  title?: string;
  kind?: string;
}

/**
 * @description Canvas template for loop-body ghost nodes (non-deletable add-node affordance). The ghost fades out once its loop holds a real body node and is revealed while the loop or the ghost itself is hovered.
 * @summary Canvas template for loop-body ghost nodes (non-deletable add-node affordance).  The ghost fades out once its loop holds a real body node and is revealed while the loop or the ghost itself is hovered.
 * @memberOf module:for-react.diagrams
 */
export function GraphGhostNodeTemplate({ id, data }: NodeProps) {
  const ghost = data as GhostFlowData;
  const actions = useGraphCanvasActions();
  const parent = ghost.ghostParentId;
  const loopBodyIds = useSignalValue(ghostNodeStore.loopBodyIds);
  const hoveredLoopId = useSignalValue(ghostNodeStore.hoveredLoopId);
  const hoveredGhostId = useSignalValue(ghostNodeStore.hoveredGhostId);
  const muted = Boolean(parent && loopBodyIds.has(parent) && hoveredLoopId !== parent && hoveredGhostId !== id);

  const add = (anchor?: { x: number; y: number }) => {
    if (parent) actions.requestAddNode(parent, anchor);
  };

  return (
    <article
      className={`graph-ghost-node${muted ? ' graph-ghost-node--muted' : ''}`}
      role="button"
      tabIndex={0}
      onMouseEnter={() => ghostNodeStore.hoveredGhostId.set(id)}
      onMouseLeave={() => {
        if (ghostNodeStore.hoveredGhostId() === id) ghostNodeStore.hoveredGhostId.set(null);
      }}
      onClick={(event) => {
        event.stopPropagation();
        add({ x: event.clientX, y: event.clientY });
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        add({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
    >
      <div className="graph-ghost-node__plus">+</div>
      <span className="graph-ghost-node__label">Add node</span>
      <Handle id="in" type="target" position={Position.Left} aria-label="Ghost input" />
      <Handle id="out" type="source" position={Position.Right} aria-label="Ghost output" />
    </article>
  );
}

export default GraphGhostNodeTemplate;
