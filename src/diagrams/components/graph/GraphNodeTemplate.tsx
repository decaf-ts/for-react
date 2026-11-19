import { useEffect, useMemo } from 'react';
import { Handle, Position, useEdges, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { GraphPortDefinition, GraphIconReference, GraphNodePinState } from '@decaf-ts/as-graph/shared';
import { PortDirection } from '@decaf-ts/as-graph/shared';
import { useGraphCanvasActions } from './GraphCanvasContext.js';
import {
  graphConnectionZoneGroupsOf,
  graphHandlePositionOf,
  graphIconImageSrcOf,
  graphIconSpriteHrefOf,
  graphInlineHandleStyle,
  graphPortSignatureOf,
  graphZoneHandleStyle,
  graphPortZoneOfDefinition,
} from './graph-node-utils.js';

interface GraphNodeFlowData extends Record<string, unknown> {
  title?: string;
  kind?: string;
  color?: string;
  labels?: string[];
  ports?: GraphPortDefinition[];
  iconReference?: GraphIconReference;
  cornerRadius?: number;
  shape?: string;
  pinned?: GraphNodePinState;
  pinnable?: boolean;
}

const HANDLE_CLASS = 'graph-node__handle';

/**
 * @description Member node template. Handles always carry the graph port id; unnamed handles are never rendered so every canvas edge remains anchorable to a document port. Connection-port typing decision (design adjustment 7): connection ports render as `target` handles in strict mode, matching the as-graph direction contract where a `@connection()` port is a binding *target*. A connection-port edge is still allowed to originate from a node output/connection port, so `ConnectionMode.Strict` stays the canvas default.
 * @summary Member node template.  Handles always carry the graph port id; unnamed handles are never rendered so every canvas edge remains anchorable to a document port.
 * @memberOf module:for-react.diagrams
 */
export function GraphNodeTemplate({ id, data, selected }: NodeProps) {
  const nodeData = data as GraphNodeFlowData;
  const updateNodeInternals = useUpdateNodeInternals();
  const edges = useEdges();
  const actions = useGraphCanvasActions();
  const ports = nodeData.ports ?? [];
  const inputs = ports.filter((port) => port.direction === PortDirection.INPUT);
  const outputs = ports.filter((port) => port.direction === PortDirection.OUTPUT);
  const connections = ports.filter((port) => port.direction === PortDirection.CONNECTION);
  const groups = useMemo(() => graphConnectionZoneGroupsOf(connections), [connections]);
  const signature = graphPortSignatureOf(ports);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, signature, updateNodeInternals]);

  const connected = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of edges) {
      if (edge.source === id && edge.sourceHandle) ids.add(edge.sourceHandle);
      if (edge.target === id && edge.targetHandle) ids.add(edge.targetHandle);
    }
    return ids;
  }, [edges, id]);

  const sprite = graphIconSpriteHrefOf(nodeData.iconReference);
  const image = graphIconImageSrcOf(nodeData.iconReference);
  const pinned = Boolean(nodeData.pinned);
  const pinnable = nodeData.pinnable !== false;
  const kind = nodeData.kind ?? '';
  const classes = [
    'graph-node',
    selected ? 'graph-node--selected' : '',
    pinned ? 'graph-node--pinned' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const style = {
    ['--graph-accent' as string]: nodeData.color ?? '#5b21b6',
    borderRadius: `${nodeData.cornerRadius ?? 12}px`,
  } as React.CSSProperties;

  return (
    <article
      className={classes}
      style={style}
      data-node-shape={nodeData.shape ?? 'default'}
      data-node-kind={kind}
      onDoubleClick={(event) => {
        event.stopPropagation();
        actions.editNode(id);
      }}
    >
      <div className="graph-node__icon">
        {sprite ? (
          <svg className="graph-node__icon-svg" aria-hidden="true">
            <use href={sprite} />
          </svg>
        ) : image ? (
          <img className="graph-node__icon-img" src={image} alt="" />
        ) : (
          <span className="graph-node__icon-fallback">{nodeData.title?.slice(0, 1) ?? '?'}</span>
        )}
      </div>
      <span className="graph-node__name">{nodeData.title ?? kind}</span>

      <div className="graph-node__actions">
        {pinnable ? (
          <button
            type="button"
            className={`graph-node__btn graph-node__btn--pin${pinned ? ' graph-node__btn--pinned' : ''}`}
            title={pinned ? 'Unpin node' : 'Pin node'}
            aria-label={pinned ? 'Unpin node' : 'Pin node'}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              actions.togglePin(id);
            }}
          >
            📌
          </button>
        ) : null}
        <button
          type="button"
          className="graph-node__btn graph-node__btn--delete"
          title="Delete node"
          aria-label="Delete node"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            actions.deleteNode(id);
          }}
        >
          ×
        </button>
      </div>

      <div className="graph-node__ports graph-node__ports--in">
        {inputs.map((port, index) => {
          const portId = port.path || port.property;
          return (
            <div
              key={`in:${portId}`}
              className={`graph-node__port graph-node__port--in${connected.has(portId) ? ' graph-node__port--connected' : ''}${port.required ? ' graph-node__port--required' : ''}`}
            >
              <Handle
                id={portId}
                type="target"
                position={Position.Left}
                className={HANDLE_CLASS}
                style={graphInlineHandleStyle(index, inputs.length)}
                aria-label={`${port.label || portId} input`}
              />
              <span className="graph-node__port-label">{port.label || portId}</span>
            </div>
          );
        })}
      </div>

      <div className="graph-node__ports graph-node__ports--out">
        {outputs.map((port, index) => {
          const portId = port.path || port.property;
          return (
            <div
              key={`out:${portId}`}
              className={`graph-node__port graph-node__port--out${connected.has(portId) ? ' graph-node__port--connected' : ''}${port.required ? ' graph-node__port--required' : ''}`}
            >
              <Handle
                id={portId}
                type="source"
                position={Position.Right}
                className={HANDLE_CLASS}
                style={graphInlineHandleStyle(index, outputs.length)}
                aria-label={`${port.label || portId} output`}
              />
              <span className="graph-node__port-label">{port.label || portId}</span>
            </div>
          );
        })}
      </div>

      {groups.map((group) => (
        <div
          key={group.key}
          className={`graph-node__ports graph-node__ports--connection graph-node__zone--${group.zoned ? `${group.side}-${group.align}` : 'legacy'}`}
        >
          {group.ports.map((port, index) => {
            const portId = port.path || port.property;
            const zone = graphPortZoneOfDefinition(port);
            return (
              <div
                key={`conn:${group.key}:${portId}`}
                className={`graph-node__port graph-node__port--connection${connected.has(portId) ? ' graph-node__port--connected' : ''}`}
                style={{ ['--connection-color' as string]: '#0ea5e9' } as React.CSSProperties}
              >
                <Handle
                  id={portId}
                  type="target"
                  position={graphHandlePositionOf(zone?.side ?? 'bottom')}
                  className={HANDLE_CLASS}
                  style={graphZoneHandleStyle(zone?.side ?? 'bottom', zone?.align ?? 'center', index, group.ports.length)}
                  aria-label={`${port.label || portId} connection port`}
                />
                <span className="graph-node__port-label">
                  {(port.graph as { category?: string } | undefined)?.category || port.label || portId}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </article>
  );
}

export default GraphNodeTemplate;
