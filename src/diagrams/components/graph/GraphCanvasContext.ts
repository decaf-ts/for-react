/**
 * @module for-react/diagrams/components/graph/GraphCanvasContext
 * @summary Canvas-wide callbacks shared by the projected node/edge templates.
 * @description React Flow node data stays serializable; interaction callbacks
 * (pin, delete, edit, ghost add) travel through this context instead so the
 * canonical document store remains the single writer.
 */
import { createContext, useContext } from 'react';
import type { GraphJsonValue, GraphNodeInstance } from '@decaf-ts/as-graph/shared';

/**
 * @description Canvas interaction surface provided by {@link GraphRenderer}.
 * @summary Canvas interaction surface provided by {@link GraphRenderer}.
 * @memberOf module:for-react.diagrams
 */
export interface GraphCanvasActions {
  /** Pins or unpins a document node (D4 data pinning). */
  togglePin: (nodeId: string) => void;
  /** Deletes a document node (or a canvas-only boundary projection). */
  deleteNode: (nodeId: string) => void;
  /** Opens the node editor/inspection surface for a node. */
  editNode: (nodeId: string) => void;
  /** Opens the add-node palette anchored to a loop ghost. */
  requestAddNode: (parentNodeId: string, anchor?: { x: number; y: number }) => void;
  /** Resolves a node instance for parameter editing. */
  resolveNode?: (nodeId: string) => GraphNodeInstance | undefined;
  /** Applies one parameter edit to a document node. */
  updateNodeParameters?: (nodeId: string, parameters: Record<string, GraphJsonValue>) => void;
}

const noop = () => undefined;

/**
 * @description React context exposing the canvas interaction surface to graph node and toolbar components.
 * @summary React context exposing the canvas interaction surface to graph node and toolbar components.
 * @memberOf module:for-react.diagrams
 */
export const GraphCanvasContext = createContext<GraphCanvasActions>({
  togglePin: noop,
  deleteNode: noop,
  editNode: noop,
  requestAddNode: noop,
});

/**
 * @description Reads the canvas interaction surface.
 * @summary Reads the canvas interaction surface.
 * @memberOf module:for-react.diagrams
 */
export function useGraphCanvasActions(): GraphCanvasActions {
  return useContext(GraphCanvasContext);
}
