/** @module for-react/diagrams/document/GraphDocumentMutation
 * @summary Canvas-side diagram mutation payloads translated by the canonical graph adapter.
 * @description React Flow mutates its local model on every user gesture. The canonical
 * pipeline (`GraphDiagramAdapter.applyDiagramMutation` and
 * `graphDocumentCommandsFromDiagramMutation`) routes each gesture through graph workflow
 * document commands while rejecting invalid optimistic connections client-side (never
 * trusted as the backend gate, DECAF-50 §4.12).
 */
import type { GraphJsonValue } from '@decaf-ts/as-graph/shared';

/**
 * @description Endpoint reference on the canvas during a mutation.
 * @summary Endpoint reference on the canvas during a mutation.
 * @memberOf module:for-react.diagrams
 */
export interface GraphDiagramEndpointPayload {
  /** Canvas node id (`input-${port}` for workflow input boundaries, `$workflow` sentinel otherwise). */
  nodeId: string;
  /** Port id (falls back to the node's only port when omitted). */
  port?: string;
}

/**
 * @description A single edge drawn/handled on the canvas, expressed with stable graph endpoints.
 * @summary A single edge drawn/handled on the canvas, expressed with stable graph endpoints.
 * @memberOf module:for-react.diagrams
 */
export interface GraphDiagramEdgePayload {
  sourceNodeId: string;
  sourcePort?: string;
  targetNodeId: string;
  targetPort?: string;
  label?: string;
}

/**
 * @description Final position of a node after a drag gesture ended (drag-end commit policy).
 * @summary Final position of a node after a drag gesture ended (drag-end commit policy).
 * @memberOf module:for-react.diagrams
 */
export interface GraphDiagramNodeMove {
  nodeId: string;
  position: { x: number; y: number };
}

/**
 * @description Final size of a node after a resize gesture ended (resize-end commit policy).
 * @summary Final size of a node after a resize gesture ended (resize-end commit policy).
 * @memberOf module:for-react.diagrams
 */
export interface GraphDiagramNodeResize {
  nodeId: string;
  size: { width?: number; height?: number };
}

/**
 * @description Viewport state after zoom/pan gestures (canvas shape `scale`).
 * @summary Viewport state after zoom/pan gestures (canvas shape `scale`).
 * @memberOf module:for-react.diagrams
 */
export interface GraphDiagramViewportPayload {
  x: number;
  y: number;
  scale: number;
}

/**
 * @description Mutation accepted by the adapter. The union retains its historical type name and mirrors the React Flow gesture set: palette drop, drag end, selection move, resize end, edge draw end, element removal, clipboard paste, viewport change.
 * @summary Mutation accepted by the adapter. The union retains its historical type name and mirrors the React Flow gesture set: palette drop, drag end, selection move, resize end, edge draw end, element removal, clipboard paste, viewport change.
 * @memberOf module:for-react.diagrams
 */
export type NgDiagramMutation =
  | {
      type: 'node-added';
      node: {
        id: string;
        kind: string;
        label?: string;
        position: { x: number; y: number };
        parameters?: Record<string, GraphJsonValue>;
      };
    }
  | { type: 'nodes-removed'; nodeIds: string[] }
  | { type: 'nodes-moved'; nodes: GraphDiagramNodeMove[] }
  | { type: 'node-resized'; node: GraphDiagramNodeResize }
  | { type: 'edges-added'; edges: GraphDiagramEdgePayload[] }
  | { type: 'edges-removed'; edgeIds: string[] }
  | { type: 'viewport-changed'; viewport: GraphDiagramViewportPayload };

const GRAPH_DIAGRAM_MUTATION_TYPES = [
  'node-added',
  'nodes-removed',
  'nodes-moved',
  'node-resized',
  'edges-added',
  'edges-removed',
  'viewport-changed',
] as const;

/**
 * @description The closed set of canvas mutation type names emitted by the diagram adapter.
 * @summary The closed set of canvas mutation type names emitted by the diagram adapter.
 * @memberOf module:for-react.diagrams
 */
export type GraphDiagramMutationType = (typeof GRAPH_DIAGRAM_MUTATION_TYPES)[number];

/**
 * @description Mutation type list (ordered), for adapters and tests to reason over.
 * @summary Mutation type list (ordered), for adapters and tests to reason over.
 * @memberOf module:for-react.diagrams
 */
export const GRAPH_DIAGRAM_MUTATION_TYPE_LIST: readonly GraphDiagramMutationType[] =
  GRAPH_DIAGRAM_MUTATION_TYPES;

/**
 * @description Canvas id prefix for ghost/placeholder nodes (loop body palette entries).
 * @summary Canvas id prefix for ghost/placeholder nodes (loop body palette entries).
 * @memberOf module:for-react.diagrams
 */
export const GRAPH_CANVAS_GHOST_PREFIX = 'ghost-';

/**
 * @description Whether a canvas id references a ghost/placeholder node.
 * @summary Whether a canvas id references a ghost/placeholder node.
 * @memberOf module:for-react.diagrams
 */
export function isGraphGhostCanvasId(id: string): boolean {
  return id.startsWith(GRAPH_CANVAS_GHOST_PREFIX);
}

/**
 * @description Whether a document node is a ghost/placeholder (kind `graph.ghost`, canvas id `ghost-${origin}` in legacy round trips).
 * @summary Whether a document node is a ghost/placeholder (kind `graph. ghost`, canvas id `ghost-${origin}` in legacy round trips).
 * @memberOf module:for-react.diagrams
 */
export function isGraphNodeGhost(node: { kind?: unknown; id: string }): boolean {
  return node.kind === 'graph.ghost' || isGraphGhostCanvasId(node.id);
}

/**
 * @description Type guard narrowing canvas event payloads into the mutation union.
 * @summary Type guard narrowing canvas event payloads into the mutation union.
 * @param value - value to check.
 * @returns {boolean} true when value is a member of the canvas mutation union.
 * @memberOf module:for-react.diagrams
 */
export function isGraphDiagramMutation(value: unknown): value is NgDiagramMutation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return (GRAPH_DIAGRAM_MUTATION_TYPES as readonly string[]).includes(
    String((value as Record<string, unknown>)['type'])
  );
}
