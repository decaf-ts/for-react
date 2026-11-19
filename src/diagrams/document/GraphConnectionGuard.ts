/**
 * @module for-react/diagrams/document/GraphConnectionGuard
 * @summary Pure React Flow connection guard mirroring the canonical
 * `GraphDiagramMutationTranslator` connection policy.
 * @description React Flow's `isValidConnection` is a pre-emptive UX check only;
 * the document translator remains the authority. This guard reads the resolved
 * manifests through the catalogue reader so the canvas rejects the same pairs
 * the translator would (direction, unknown port, self, node kinds, categories,
 * occupancy) while the drag is in progress.
 */
import type { Connection } from '@xyflow/react';
import type { GraphPortManifest } from '@decaf-ts/as-graph/shared';
import type { GraphNodeManifestReader } from '../catalog/GraphNodeCatalogReader.js';

/** Minimal canvas edge shape the guard reads. */
export interface GraphGuardEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/** Denial codes surfaced to the canvas status region. */
export type GraphConnectionDenialCode =
  | 'allowed'
  | 'incomplete'
  | 'unknown-node'
  | 'unknown-port'
  | 'direction'
  | 'duplicate'
  | 'self'
  | 'blocked-node-kind'
  | 'allowed-node-kinds'
  | 'port-category'
  | 'source-occupied'
  | 'target-occupied';

/** One guard decision with a human-readable reason. */
export interface GraphConnectionDecision {
  ok: boolean;
  code: GraphConnectionDenialCode;
  message: string;
}

function allowed(): GraphConnectionDecision {
  return { ok: true, code: 'allowed', message: 'Connection accepted.' };
}

function denied(code: GraphConnectionDenialCode, message: string): GraphConnectionDecision {
  return { ok: false, code, message };
}

function portsOf(
  resolved: { inputs: GraphPortManifest[]; outputs: GraphPortManifest[]; connections?: GraphPortManifest[] },
  direction: 'input' | 'output' | 'connection'
): GraphPortManifest[] {
  if (direction === 'input') return resolved.inputs;
  if (direction === 'output') return resolved.outputs;
  return resolved.connections ?? [];
}

function findPort(
  resolved: { inputs: GraphPortManifest[]; outputs: GraphPortManifest[]; connections?: GraphPortManifest[] },
  portId: string
): { direction: 'input' | 'output' | 'connection'; port: GraphPortManifest } | undefined {
  for (const direction of ['input', 'output', 'connection'] as const) {
    const port = portsOf(resolved, direction).find((candidate) => candidate.id === portId);
    if (port) return { direction, port };
  }
  return undefined;
}

function endpointMatches(
  edge: GraphGuardEdge,
  nodeId: string,
  portId: string,
  side: 'source' | 'target'
): boolean {
  const edgeNodeId = side === 'source' ? edge.source : edge.target;
  const edgePortId = side === 'source' ? edge.sourceHandle : edge.targetHandle;
  return edgeNodeId === nodeId && (edgePortId ?? null) === portId;
}

function portEdgeCount(
  edges: readonly GraphGuardEdge[],
  nodeId: string,
  portId: string,
  side: 'source' | 'target'
): number {
  return edges.filter((edge) => endpointMatches(edge, nodeId, portId, side)).length;
}

/**
 * @description Evaluates one candidate connection against the resolved manifests.
 * @summary Pure pre-emptive UX check applied while the user drags a connection.
 * It rejects incomplete endpoints, unknown nodes/ports, direction mismatches,
 * duplicates, self connections and the port occupancy/policy rules, returning a
 * decision with a stable denial code. The document translator remains the
 * authority for what is actually persisted.
 * @param {Connection} connection - Candidate React Flow connection.
 * @param {Object} options - Guard inputs: current edges, node resolver and optional ignored edge id.
 * @returns {GraphConnectionDecision} The accept/deny decision with code and message.
 * @memberOf module:for-react.diagrams
 */
export function evaluateGraphConnection(
  connection: Connection,
  options: {
    edges: readonly GraphGuardEdge[];
    resolveNode: (nodeId: string) => { kind: string; inputs: GraphPortManifest[]; outputs: GraphPortManifest[]; connections?: GraphPortManifest[] } | undefined;
    ignoreEdgeId?: string | null;
  }
): GraphConnectionDecision {
  const { resolveNode } = options;
  if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
    return denied(
      'incomplete',
      'Both endpoints must name a node and a port id; unnamed single handles cannot be anchored to a graph port.'
    );
  }
  const sourceNode = resolveNode(connection.source);
  if (!sourceNode) return denied('unknown-node', `Source node '${connection.source}' is not in the graph catalogue.`);
  const targetNode = resolveNode(connection.target);
  if (!targetNode) return denied('unknown-node', `Target node '${connection.target}' is not in the graph catalogue.`);

  const source = findPort(sourceNode, connection.sourceHandle);
  if (!source) {
    return denied('unknown-port', `Port '${connection.sourceHandle}' does not exist on source node '${connection.source}'.`);
  }
  const target = findPort(targetNode, connection.targetHandle);
  if (!target) {
    return denied('unknown-port', `Port '${connection.targetHandle}' does not exist on target node '${connection.target}'.`);
  }
  if (source.direction === 'input') {
    return denied('direction', `Source port '${connection.sourceHandle}' must be an output or connection port.`);
  }
  if (target.direction === 'output') {
    return denied('direction', `Target port '${connection.targetHandle}' must be an input or connection port.`);
  }

  const edges = options.edges.filter((edge) => edge.id !== options.ignoreEdgeId);
  const duplicate = edges.some(
    (edge) =>
      endpointMatches(edge, connection.source, connection.sourceHandle as string, 'source') &&
      endpointMatches(edge, connection.target, connection.targetHandle as string, 'target')
  );
  if (duplicate) return denied('duplicate', 'That exact port-to-port connection already exists.');

  const sourcePolicy = source.port.connectionPolicy;
  const targetPolicy = target.port.connectionPolicy;
  if (connection.source === connection.target && sourcePolicy?.allowSelf !== true) {
    return denied('self', `Node '${connection.source}' cannot connect to itself on this port.`);
  }
  if (sourcePolicy?.blockedNodeKinds?.includes(targetNode.kind)) {
    return denied('blocked-node-kind', `Port '${connection.sourceHandle}' blocks node kind '${targetNode.kind}'.`);
  }
  if (sourcePolicy?.allowedNodeKinds?.length && !sourcePolicy.allowedNodeKinds.includes(targetNode.kind)) {
    return denied('allowed-node-kinds', `Port '${connection.sourceHandle}' allows only [${sourcePolicy.allowedNodeKinds.join(', ')}].`);
  }
  if (
    sourcePolicy?.allowedPortCategories?.length &&
    (!target.port.category || !sourcePolicy.allowedPortCategories.includes(target.port.category))
  ) {
    return denied(
      'port-category',
      `Port '${connection.sourceHandle}' accepts categories [${sourcePolicy.allowedPortCategories.join(', ')}]; target has '${target.port.category ?? 'none'}'.`
    );
  }
  const sourceCount = portEdgeCount(edges, connection.source, connection.sourceHandle, 'source');
  if (sourcePolicy?.allowMultiple === false && sourceCount > 0) {
    return denied('source-occupied', `Port '${connection.sourceHandle}' accepts a single outgoing edge.`);
  }
  if (sourcePolicy?.maxConnections !== undefined && sourceCount >= sourcePolicy.maxConnections) {
    return denied('source-occupied', `Port '${connection.sourceHandle}' already holds ${sourceCount}/${sourcePolicy.maxConnections} outgoing edges.`);
  }
  const targetCount = portEdgeCount(edges, connection.target, connection.targetHandle, 'target');
  if (targetPolicy?.allowMultiple === false && targetCount > 0) {
    return denied('target-occupied', `Port '${connection.targetHandle}' is already occupied.`);
  }
  if (targetPolicy?.maxConnections !== undefined && targetCount >= targetPolicy.maxConnections) {
    return denied('target-occupied', `Port '${connection.targetHandle}' already holds ${targetCount}/${targetPolicy.maxConnections} incoming edges.`);
  }
  return allowed();
}

/**
 * @description Builds a resolver over the canvas nodes' resolved manifests.
 * @summary Indexes the canvas nodes by id and returns the node resolver consumed
 * by {@link evaluateGraphConnection}. Workflow boundary badge ids resolve to a
 * synthetic single-port node so edges to inputs/outputs stay connectable.
 * @param {GraphNodeManifestReader} catalogue - Catalogue reader resolving node kinds.
 * @param {Object[]} nodes - Canvas nodes carrying `id` and optional `data` metadata.
 * @returns {Function} Resolver from node id to its resolved inputs/outputs, or `undefined`.
 * @memberOf module:for-react.diagrams
 */
export function graphConnectionGuardOf(
  catalogue: GraphNodeManifestReader,
  nodes: readonly { id: string; data?: Record<string, unknown> }[]
): (nodeId: string) => { kind: string; inputs: GraphPortManifest[]; outputs: GraphPortManifest[]; connections?: GraphPortManifest[] } | undefined {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return (nodeId: string) => {
    // Workflow boundary badges are document-port projections, not catalogue
    // nodes. They expose a single `value` port in the boundary's direction so
    // edges to/from a workflow input/output stay connectable.
    if (nodeId.startsWith('input-')) {
      return {
        kind: 'value',
        inputs: [],
        outputs: [{ id: 'value', label: 'value', direction: 'output' } as GraphPortManifest],
      };
    }
    if (nodeId.startsWith('output-')) {
      return {
        kind: 'value',
        inputs: [{ id: 'value', label: 'value', direction: 'input' } as GraphPortManifest],
        outputs: [],
      };
    }
    const node = byId.get(nodeId);
    const kind = node?.data?.['kind'];
    if (typeof kind !== 'string') return undefined;
    const instance = {
      id: nodeId,
      kind,
      parameters: (node?.data?.['parameters'] as Record<string, never>) ?? {},
      metadata: (node?.data?.['metadata'] as Record<string, never>) ?? {},
    };
    try {
      const resolved = catalogue.resolve(instance as never);
      return { kind, inputs: resolved.inputs, outputs: resolved.outputs, connections: resolved.connections };
    } catch {
      return undefined;
    }
  };
}
