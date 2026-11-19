import { useMemo } from 'react';
import { Handle, Position, useEdges } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { GraphPortDefinition } from '@decaf-ts/as-graph/shared';
import { PortDirection } from '@decaf-ts/as-graph/shared';
import { useGraphCanvasActions } from './GraphCanvasContext.js';
import { isGraphDefaultPort } from './graph-node-utils.js';

interface BoundaryFlowData extends Record<string, unknown> {
  title?: string;
  role?: 'input' | 'output';
  property?: string;
  ports?: GraphPortDefinition[];
}

/**
 * @description Canvas template for the workflow input/output boundary badges.
 * @summary Canvas template for the workflow input/output boundary badges.
 * @memberOf module:for-react.diagrams
 */
export function BoundaryNodeTemplate({ id, data, selected }: NodeProps) {
  const boundary = data as BoundaryFlowData;
  const edges = useEdges();
  const actions = useGraphCanvasActions();
  const ports = boundary.ports ?? [];
  const inputPorts = useMemo(
    () => ports.filter((port) => port.direction === PortDirection.INPUT),
    [ports]
  );
  const outputPorts = useMemo(
    () =>
      ports
        .filter((port) => port.direction === PortDirection.OUTPUT)
        .sort((left, right) => Number(isGraphDefaultPort(left)) - Number(isGraphDefaultPort(right))),
    [ports]
  );
  const connected = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of edges) {
      if (edge.source === id && edge.sourceHandle) ids.add(edge.sourceHandle);
      if (edge.target === id && edge.targetHandle) ids.add(edge.targetHandle);
    }
    return ids;
  }, [edges, id]);
  const role = boundary.role === 'output' ? 'output' : 'input';

  return (
    <article
      className={[
        'graph-badge',
        `graph-badge--${role}`,
        selected ? 'graph-badge--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ['--graph-accent' as string]: role === 'input' ? '#0f766e' : '#6d28d9' } as React.CSSProperties}
      onDoubleClick={(event) => {
        event.stopPropagation();
        actions.editNode(id);
      }}
    >
      <span className="graph-badge__name">{boundary.property ?? boundary.title}</span>
      <button
        type="button"
        className="graph-badge__btn graph-badge__btn--delete"
        title="Delete"
        aria-label="Delete boundary"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          actions.deleteNode(id);
        }}
      >
        ×
      </button>
      {inputPorts.length ? (
        <div className="graph-badge__ports graph-badge__ports--in">
          {inputPorts.map((port, index) => {
            const portId = port.path || port.property;
            return (
              <div
                key={`in:${portId}`}
                className={`graph-badge__port graph-badge__port--in${connected.has(portId) ? ' graph-badge__port--connected' : ''}`}
              >
                <Handle
                  id={portId}
                  type="target"
                  position={Position.Left}
                  style={{ top: `${50 + (index - (inputPorts.length - 1) / 2) * 18}%` }}
                  aria-label={`${port.label || portId} input`}
                />
                <span className="graph-badge__port-label">{port.label || portId}</span>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="graph-badge__ports graph-badge__ports--out">
        {outputPorts.map((port, index) => {
          const portId = port.path || port.property;
          return (
            <div
              key={`out:${portId}`}
              className={`graph-badge__port graph-badge__port--out${connected.has(portId) ? ' graph-badge__port--connected' : ''}`}
            >
              <Handle
                id={portId}
                type="source"
                position={Position.Right}
                style={{ top: `${50 + (index - (outputPorts.length - 1) / 2) * 18}%` }}
                aria-label={`${port.label || portId} output`}
              />
              <span className="graph-badge__port-label">{port.label || portId}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default BoundaryNodeTemplate;
