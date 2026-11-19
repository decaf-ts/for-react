import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type OnBeforeDelete,
  type OnConnect,
  type OnConnectEnd,
  type OnNodeDrag,
  type OnReconnect,
} from '@xyflow/react';
import type {
  GraphNodeManifest,
  GraphWorkflowDocument,
  GraphWorkflowViewport,
} from '@decaf-ts/as-graph/shared';
import { GraphNodeCatalogStore } from '../../catalog/GraphNodeCatalogStore.js';
import type { GraphNodeManifestReader } from '../../catalog/GraphNodeCatalogReader.js';
import { GraphDiagramAdapter } from '../../document/GraphDiagramAdapter.js';
import type { GraphFlowEdge, GraphFlowNode } from '../../document/GraphDiagramAdapter.js';
import { GraphWorkflowDocumentStore } from '../../document/GraphWorkflowDocumentStore.js';
import { applyGraphDocumentCommand, type GraphDocumentCommand } from '../../document/GraphDocumentCommands.js';
import {
  isGraphGhostCanvasId,
  type GraphDiagramEdgePayload,
} from '../../document/GraphDocumentMutation.js';
import { graphDocumentCommandsFromDiagramMutation } from '../../document/GraphDiagramMutationTranslator.js';
import {
  graphLoopBodyOrderOf,
  graphLoopChainCommandsFor,
  graphLoopEntryPortOf,
  type GraphLoopBodyStep,
} from '../../document/LoopChainRepair.js';
import { graphPaletteEntriesOf, type GraphPaletteEntry } from '../../utils.js';
import type { GraphWorkflowPortInstance } from '@decaf-ts/as-graph/shared';
import {
  buildWorkflowInputFieldsFromPorts,
  normalizeWorkflowInputValues,
  type WorkflowInputFieldDefinition,
} from '../../workflow-inputs.js';
import { useSignalValue } from '../../internal/reactive.js';
import { graphConnectionGuardOf, evaluateGraphConnection } from '../../document/GraphConnectionGuard.js';
import { ghostNodeStore } from '../../execution/GhostNodeStore.js';
import { GraphCanvasContext, type GraphCanvasActions } from './GraphCanvasContext.js';
import { GraphNodeTemplate } from './GraphNodeTemplate.js';
import { BoundaryNodeTemplate } from './BoundaryNodeTemplate.js';
import { GraphGhostNodeTemplate } from './GraphGhostNodeTemplate.js';
import { GraphEdgeTemplate } from './GraphEdgeTemplate.js';
import { GraphNodeEditModal } from './GraphNodeEditModal.js';
import { GraphNodeInspectionComponent } from './GraphNodeInspection.js';
import { GraphLogsWidgetComponent } from './graph-logs-widget.component.js';
import { graphInspection } from '../../execution/GraphInspectionStore.js';

const INPUT_BOUNDARY_PREFIX = 'input-';
const OUTPUT_BOUNDARY_PREFIX = 'output-';
const NODE_TYPES = {
  'graph-node': GraphNodeTemplate,
  'graph-boundary': BoundaryNodeTemplate,
  'graph-ghost': GraphGhostNodeTemplate,
};
const EDGE_TYPES = { 'graph-edge': GraphEdgeTemplate };
const CONNECTION_MODE = ConnectionMode.Strict;

/**
 * @description Props accepted by the canonical graph canvas renderer.
 * @summary Props accepted by the canonical graph canvas renderer.
 * @memberOf module:for-react.diagrams
 */
export interface GraphRendererProps {
  /** Canonical document to open. Replaces the store's document when it changes. */
  document?: GraphWorkflowDocument;
  /** Explicit document store; a fresh one is created when omitted. */
  store?: GraphWorkflowDocumentStore;
  /** Catalogue reader (usually the `GraphNodeCatalogStore`). */
  catalogue?: GraphNodeManifestReader;
  /** Manifests used to build a default catalogue when `catalogue` is omitted. */
  manifests?: GraphNodeManifest[];
  /** Whether the palette and side panels render. */
  showSidePanels?: boolean;
  /** Whether canvas editing is disabled. */
  readOnly?: boolean;
  /** Whether the docked run log console renders. */
  showLogs?: boolean;
  /** Extra class on the canvas root. */
  className?: string;
  /** Notified whenever the document version changes. */
  onDocumentChange?: (document: GraphWorkflowDocument) => void;
  /** Notified when the user submits the workflow input form. */
  onRun?: (inputs: Record<string, unknown>) => void;
  /** Notified after a node/edge mutation so hosts can autosave. */
  onMutation?: (source: 'node-position' | 'edge-connect' | 'edge-disconnect' | 'node-crud') => void;
}

function connectionFromFinalState(state: Pick<FinalConnectionState, 'fromHandle' | 'toHandle'>): Connection | null {
  const from = state.fromHandle;
  const to = state.toHandle;
  if (!from || !to) return null;
  if (from.type === 'target') {
    return {
      source: to.nodeId,
      sourceHandle: to.id ?? null,
      target: from.nodeId,
      targetHandle: from.id ?? null,
    };
  }
  return {
    source: from.nodeId,
    sourceHandle: from.id ?? null,
    target: to.nodeId,
    targetHandle: to.id ?? null,
  };
}

function isMandatoryEdge(edge: { data?: Record<string, unknown> }): boolean {
  return edge.data?.['mandatory'] === true;
}

function isBoundaryId(id: string): boolean {
  return id.startsWith(INPUT_BOUNDARY_PREFIX) || id.startsWith(OUTPUT_BOUNDARY_PREFIX);
}

function edgePayloadOf(connection: Connection): GraphDiagramEdgePayload {
  return {
    sourceNodeId: connection.source,
    sourcePort: connection.sourceHandle ?? undefined,
    targetNodeId: connection.target,
    targetPort: connection.targetHandle ?? undefined,
  };
}

/**
 * @description Canonical graph canvas. React Flow owns the canvas runtime; every gesture is translated into canonical document commands and the canvas is re-projected from the stored document. React Flow guards are UX/consistency checks only - the document translator remains the authority.
 * @summary Canonical graph canvas.  React Flow owns the canvas runtime; every gesture is translated into canonical document commands and the canvas is re-projected from the stored document.
 * @memberOf module:for-react.diagrams
 */
export function GraphRenderer(props: GraphRendererProps) {
  if (typeof window === 'undefined') {
    return (
      <div className={`graph-renderer graph-renderer--ssr ${props.className ?? ''}`.trim()} aria-hidden="true" />
    );
  }
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  );
}

function GraphCanvas({
  document: initialDocument,
  store: providedStore,
  catalogue: providedCatalogue,
  manifests,
  showSidePanels = true,
  readOnly = false,
  showLogs = true,
  className,
  onDocumentChange,
  onRun,
  onMutation,
}: GraphRendererProps) {
  const store = useMemo(() => providedStore ?? new GraphWorkflowDocumentStore(), [providedStore]);
  const catalogue = useMemo<GraphNodeManifestReader>(() => {
    if (providedCatalogue) return providedCatalogue;
    const catalogStore = new GraphNodeCatalogStore();
    catalogStore.setManifests(manifests ?? []);
    return catalogStore;
  }, [providedCatalogue, manifests]);
  const adapter = useMemo(() => new GraphDiagramAdapter(), []);
  const version = useSignalValue(store.signals.version);
  const document = store.document();
  const [status, setStatus] = useState(
    'Drag from an output handle to a compatible port. Occupancy rules are enforced while you drag.'
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteAnchor, setPaletteAnchor] = useState<{ parent: string; x: number; y: number } | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, unknown>>({});
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const reconnectEdgeIdRef = useRef<string | null>(null);
  const reactFlow = useReactFlow<GraphFlowNode, GraphFlowEdge>();

  useEffect(() => {
    if (!initialDocument) return;
    store.initialize(initialDocument);
  }, [initialDocument, store]);

  useEffect(() => {
    if (!document) return;
    onDocumentChange?.(document);
  }, [version, document]);

  const projection = useMemo(() => {
    if (!document) return { nodes: [] as GraphFlowNode[], edges: [] as GraphFlowEdge[] };
    const projected = adapter.project(document, catalogue);
    return { nodes: projected.nodes, edges: projected.edges };
  }, [adapter, document, version, catalogue]);

  const [nodes, setNodes, onNodesChange] = useNodesState<GraphFlowNode>(projection.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<GraphFlowEdge>(projection.edges);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    setNodes(projection.nodes);
    setEdges(projection.edges);
  }, [projection, setNodes, setEdges]);

  const resolveNode = useMemo(() => graphConnectionGuardOf(catalogue, nodes), [catalogue, nodes]);

  const isValidConnection = useCallback(
    (candidate: Connection | Edge) =>
      evaluateGraphConnection(candidate as Connection, {
        edges: edgesRef.current,
        resolveNode,
        ignoreEdgeId: reconnectEdgeIdRef.current,
      }).ok,
    [resolveNode]
  );

  const dispatch = useCallback(
    (commands: GraphDocumentCommand[]) => {
      for (const command of commands) {
        store.dispatchCommand(command);
      }
    },
    [store]
  );

  const translateMutation = useCallback(
    (source: 'node-position' | 'edge-connect' | 'edge-disconnect' | 'node-crud'): void => {
      onMutation?.(source);
    },
    [onMutation]
  );

  const onConnect = useCallback<OnConnect>(
    (connection) => {
      if (readOnly) return;
      const decision = evaluateGraphConnection(connection, {
        edges: edgesRef.current,
        resolveNode,
        ignoreEdgeId: reconnectEdgeIdRef.current,
      });
      if (!decision.ok) {
        setStatus(`Connection refused: ${decision.message}`);
        return;
      }
      const current = store.document();
      if (!current) return;
      try {
        dispatch(
          graphDocumentCommandsFromDiagramMutation(
            current,
            { type: 'edges-added', edges: [edgePayloadOf(connection)] },
            catalogue
          )
        );
        setStatus(`Connected ${connection.source}:${connection.sourceHandle} -> ${connection.target}:${connection.targetHandle}.`);
        translateMutation('edge-connect');
      } catch (error) {
        setStatus(
          `Connection refused: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    [readOnly, resolveNode, store, dispatch, catalogue, translateMutation]
  );

  const onConnectEnd = useCallback<OnConnectEnd>(
    (_event, state) => {
      if (!state.toHandle) {
        setStatus('Connection cancelled: release on a port handle.');
        return;
      }
      if (state.isValid !== false) return;
      const connection = connectionFromFinalState(state);
      if (!connection) {
        setStatus('Connection refused: that pair of handles cannot be connected.');
        return;
      }
      const decision = evaluateGraphConnection(connection, {
        edges: edgesRef.current,
        resolveNode,
        ignoreEdgeId: reconnectEdgeIdRef.current,
      });
      setStatus(
        decision.ok
          ? 'Connection refused: the drag pair is not connectable in strict mode.'
          : `Connection refused: ${decision.message}`
      );
    },
    [resolveNode]
  );

  const onBeforeDelete = useCallback<OnBeforeDelete<GraphFlowNode, GraphFlowEdge>>(
    async ({ nodes: deletingNodes, edges: deletingEdges }) => {
      const mandatoryEdges = edgesRef.current.filter(isMandatoryEdge);
      const mandatoryNodeIds = new Set<string>();
      for (const edge of mandatoryEdges) {
        mandatoryNodeIds.add(edge.source);
        mandatoryNodeIds.add(edge.target);
      }
      const blockedNodeIds: string[] = [];
      const keptNodes = deletingNodes.filter((node) => {
        const blocked =
          isGraphGhostCanvasId(node.id) || isBoundaryId(node.id) || mandatoryNodeIds.has(node.id);
        if (blocked) blockedNodeIds.push(node.id);
        return !blocked;
      });
      const blockedEdgeIds: string[] = [];
      const keptEdges = deletingEdges.filter((edge) => {
        if (!isMandatoryEdge(edge)) return true;
        blockedEdgeIds.push(edge.id);
        return false;
      });
      if (blockedEdgeIds.length) setStatus(`Deletion blocked: mandatory edge(s) ${blockedEdgeIds.join(', ')}.`);
      else if (blockedNodeIds.length) setStatus(`Deletion blocked: ghost/boundary/mandatory endpoint node(s) ${blockedNodeIds.join(', ')}.`);
      else setStatus(`Removing ${keptNodes.length} node(s) and ${keptEdges.length} edge(s).`);
      return { nodes: keptNodes, edges: keptEdges };
    },
    []
  );

  const onDelete = useCallback(
    ({ nodes: deletedNodes, edges: deletedEdges }: { nodes: GraphFlowNode[]; edges: GraphFlowEdge[] }) => {
      if (readOnly) return;
      const current = store.document();
      if (!current) return;
      const memberNodeIds = deletedNodes.map((node) => node.id).filter((id) => !isBoundaryId(id));
      const edgeIds = deletedEdges.map((edge) => edge.id);
      try {
        if (memberNodeIds.length) {
          dispatch(graphDocumentCommandsFromDiagramMutation(current, { type: 'nodes-removed', nodeIds: memberNodeIds }, catalogue));
        }
        if (edgeIds.length) {
          dispatch(graphDocumentCommandsFromDiagramMutation(current, { type: 'edges-removed', edgeIds }, catalogue));
        }
        translateMutation('node-crud');
      } catch (error) {
        setStatus(`Deletion refused: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    [readOnly, store, dispatch, catalogue, translateMutation]
  );

  const onNodeDragStop = useCallback<OnNodeDrag<GraphFlowNode>>(
    (_event, node) => {
      if (readOnly) return;
      const current = store.document();
      if (!current) return;
      const position = { x: node.position.x, y: node.position.y };
      try {
        dispatch(
          graphDocumentCommandsFromDiagramMutation(
            current,
            { type: 'nodes-moved', nodes: [{ nodeId: node.id, position }] },
            catalogue
          )
        );
        translateMutation('node-position');
      } catch (error) {
        setStatus(`Move refused: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    [readOnly, store, dispatch, catalogue, translateMutation]
  );

  const onReconnectStart = useCallback((_event: React.MouseEvent, edge: GraphFlowEdge) => {
    reconnectEdgeIdRef.current = edge.id;
    setStatus(`Re-anchoring edge ${edge.id}...`);
  }, []);

  const onReconnect = useCallback<OnReconnect<GraphFlowEdge>>(
    (oldEdge, newConnection) => {
      if (readOnly) return;
      if (isMandatoryEdge(oldEdge)) {
        setStatus(`Reconnect refused: edge '${oldEdge.id}' is mandatory.`);
        return;
      }
      const decision = evaluateGraphConnection(newConnection, {
        edges: edgesRef.current,
        resolveNode,
        ignoreEdgeId: oldEdge.id,
      });
      if (!decision.ok) {
        setStatus(`Reconnect refused: ${decision.message}`);
        return;
      }
      const current = store.document();
      if (!current) return;
      try {
        const removeCommands = graphDocumentCommandsFromDiagramMutation(
          current,
          { type: 'edges-removed', edgeIds: [oldEdge.id] },
          catalogue
        );
        let working = current;
        for (const command of removeCommands) {
          const next = applyGraphDocumentCommand(working, command);
          if (next) working = next;
        }
        const addCommands = graphDocumentCommandsFromDiagramMutation(
          working,
          { type: 'edges-added', edges: [edgePayloadOf(newConnection)] },
          catalogue
        );
        dispatch([...removeCommands, ...addCommands]);
        setEdges((currentEdges) => reconnectEdge(oldEdge, newConnection, currentEdges, { shouldReplaceId: false }));
        setStatus(`Reconnected ${oldEdge.id}.`);
        translateMutation('edge-connect');
      } catch (error) {
        setStatus(`Reconnect refused: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    [readOnly, resolveNode, store, dispatch, catalogue, setEdges, translateMutation]
  );

  const onReconnectEnd = useCallback(() => {
    reconnectEdgeIdRef.current = null;
  }, []);

  const onMoveEnd = useCallback(
    (_event: unknown, viewport: { x: number; y: number; zoom: number }) => {
      if (readOnly) return;
      const current = store.document();
      if (!current) return;
      store.setViewport({ x: viewport.x, y: viewport.y, zoom: viewport.zoom } as GraphWorkflowViewport);
    },
    [readOnly, store]
  );

  const paletteEntries = useMemo(() => graphPaletteEntriesOf(catalogue.all()), [catalogue]);
  const filteredPalette = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    if (!query) return paletteEntries;
    return paletteEntries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.kind.toLowerCase().includes(query) ||
        (entry.category ?? '').toLowerCase().includes(query)
    );
  }, [paletteEntries, paletteQuery]);

  const openPalette = (parent?: string, anchor?: { x: number; y: number }) => {
    setPaletteOpen(true);
    setPaletteQuery('');
    setPaletteAnchor(parent && anchor ? { parent, x: anchor.x, y: anchor.y } : null);
  };

  const addNode = (entry: GraphPaletteEntry) => {
    if (readOnly) return;
    const current = store.document();
    if (!current) return;
    const center = reactFlow.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    try {
      const fallbackParent = paletteAnchor?.parent ?? ghostNodeStore.pendingParentId();
      store.addNodeFromManifest(entry.manifest, center, entry.title);
      const working = store.document();
      const created = working?.nodes[working.nodes.length - 1];
      if (fallbackParent && created && working) {
        // Append the new node to the loop body chain through the canonical
        // chain repair helper so the loop chain matches the document order and
        // the body-entry/exit ports come from the resolved manifest.
        const resolved = catalogue.resolve(created);
        const inputPort = resolved.inputs[0]?.id;
        const outputPort = resolved.outputs[0]?.id;
        if (inputPort && outputPort) {
          const steps: GraphLoopBodyStep[] = [
            ...graphLoopBodyOrderOf(working, fallbackParent),
            { nodeId: created.id, inputPort, outputPort },
          ];
          const entryPort = graphLoopEntryPortOf(working, fallbackParent);
          const commands = graphLoopChainCommandsFor(working, new Map([[fallbackParent, steps]]));
          for (const command of commands) store.dispatchCommand(command);
          void entryPort;
        }
      }
      ghostNodeStore.clear();
      setPaletteOpen(false);
      setPaletteAnchor(null);
      setStatus(`Added node '${entry.title}'.`);
      translateMutation('node-crud');
    } catch (error) {
      setStatus(`Add node failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const actions = useMemo<GraphCanvasActions>(
    () => ({
      togglePin: (nodeId) => {
        if (readOnly) return;
        try {
          if (store.isNodePinned(nodeId)) store.unpinNode(nodeId);
          else store.pinNode(nodeId);
          setStatus(`${store.isNodePinned(nodeId) ? 'Pinned' : 'Unpinned'} node '${nodeId}'.`);
        } catch (error) {
          setStatus(`Pin failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      deleteNode: (nodeId) => {
        if (readOnly) return;
        if (isBoundaryId(nodeId) || isGraphGhostCanvasId(nodeId)) {
          setStatus(`Deletion blocked: '${nodeId}' is a canvas projection, not a document node.`);
          return;
        }
        try {
          store.removeNode(nodeId);
          setStatus(`Removed node '${nodeId}'.`);
          translateMutation('node-crud');
        } catch (error) {
          setStatus(`Delete failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      editNode: (nodeId) => {
        if (isBoundaryId(nodeId)) {
          graphInspection.open(nodeId);
          setStatus(`Inspecting workflow boundary '${nodeId}'.`);
          return;
        }
        setEditingNodeId(nodeId);
      },
      requestAddNode: (parentNodeId, anchor) => openPalette(parentNodeId, anchor),
      resolveNode: (nodeId) => (document ? document.nodes.find((node) => node.id === nodeId) : undefined),
    }),
    [readOnly, store, translateMutation, document]
  );

  const inputFields: WorkflowInputFieldDefinition[] = useMemo(
    () => (document ? buildWorkflowInputFieldsFromPorts(document.inputs as GraphWorkflowPortInstance[]) : []),
    [document]
  );

  const submitRun = () => {
    const normalized = normalizeWorkflowInputValues(inputFields, inputValues);
    onRun?.(normalized);
  };

  const editingNode = editingNodeId
    ? document?.nodes.find((node) => node.id === editingNodeId) ?? null
    : null;
  const editingManifest = editingNode ? catalogue.get(editingNode.kind) ?? null : null;
  const inspectionNodeId = useSignalValue(graphInspection.openNodeId);

  if (!document) {
    return (
      <section className={`graph-renderer ${className ?? ''}`.trim()}>
        <div className="graph-renderer__loading" role="status">Loading graph document...</div>
      </section>
    );
  }

  const paletteStyle: CSSProperties = paletteAnchor
    ? { left: paletteAnchor.x, top: paletteAnchor.y, position: 'fixed' }
    : {};

  return (
    <GraphCanvasContext.Provider value={actions}>
      <section className={`graph-renderer ${className ?? ''}`.trim()}>
        <div className="graph-renderer__canvas" data-graph-validity="idle">
          {showSidePanels ? (
            <aside className="graph-renderer__side graph-renderer__side--inputs" aria-label="Workflow inputs">
              <header className="graph-renderer__side-header">Inputs</header>
              {document.inputs.length === 0 ? (
                <p className="graph-renderer__side-empty">No workflow inputs declared.</p>
              ) : (
                <ul className="graph-renderer__side-list">
                  {document.inputs.map((port) => (
                    <li key={port.id} className="graph-renderer__side-item">
                      <span className="graph-renderer__side-label">{port.label ?? port.id}</span>
                      <button
                        type="button"
                        className="graph-renderer__side-action"
                        onClick={() => {
                          const center = reactFlow.screenToFlowPosition({ x: 160, y: 180 });
                          store.dispatchCommand({
                            type: 'boundary.moves',
                            moves: [{ nodeId: `input-${port.id}`, position: center }],
                          });
                        }}
                      >
                        Place
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {inputFields.length ? (
                <div className="graph-renderer__run-form">
                  {inputFields.map((field) => (
                    <label key={field.controlName} className="graph-renderer__run-field">
                      <span>{field.label}</span>
                      <input
                        type={field.controlType === 'number' ? 'number' : field.controlType === 'date' ? 'date' : 'text'}
                        value={String(inputValues[field.controlName] ?? field.value ?? '')}
                        onChange={(event) =>
                          setInputValues((current) => ({ ...current, [field.controlName]: event.target.value }))
                        }
                      />
                    </label>
                  ))}
                  {onRun ? (
                    <button type="button" className="graph-renderer__run-btn" onClick={submitRun}>
                      Run
                    </button>
                  ) : null}
                </div>
              ) : null}
            </aside>
          ) : null}

          <div className="graph-renderer__flow">
            <ReactFlow<GraphFlowNode, GraphFlowEdge>
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectEnd={onConnectEnd}
              onBeforeDelete={onBeforeDelete}
              onDelete={onDelete}
              onNodeDragStop={onNodeDragStop}
              onReconnectStart={onReconnectStart}
              onReconnect={onReconnect}
              onReconnectEnd={onReconnectEnd}
              onMoveEnd={onMoveEnd}
              isValidConnection={isValidConnection}
              connectionMode={CONNECTION_MODE}
              fitView
              minZoom={0.3}
              maxZoom={2}
              nodesDraggable={!readOnly}
              nodesConnectable={!readOnly}
              edgesReconnectable={!readOnly}
            >
              <Background gap={16} />
              <MiniMap pannable zoomable />
              <Controls />
              <Panel position="top-left">
                <div className="graph-renderer__status" role="status" aria-live="polite">
                  {status}
                </div>
              </Panel>
            </ReactFlow>

            <div className="graph-renderer__palette">
              <button
                type="button"
                className="graph-renderer__palette-btn"
                aria-expanded={paletteOpen}
                onClick={() => (paletteOpen ? setPaletteOpen(false) : openPalette())}
              >
                + Add node
              </button>
              {paletteOpen ? (
                <div className="graph-renderer__palette-popup" style={paletteStyle} role="dialog" aria-label="Available nodes">
                  <div className="graph-renderer__palette-popup-header">
                    <span>Available nodes</span>
                    <button type="button" className="graph-renderer__palette-close" aria-label="Close palette" onClick={() => setPaletteOpen(false)}>
                      ×
                    </button>
                  </div>
                  <input
                    type="search"
                    className="graph-renderer__palette-search-input"
                    role="searchbox"
                    aria-label="Search nodes"
                    placeholder="Search nodes..."
                    value={paletteQuery}
                    onChange={(event) => setPaletteQuery(event.target.value)}
                  />
                  {filteredPalette.length === 0 ? (
                    <p className="graph-renderer__palette-empty">No nodes match that search.</p>
                  ) : (
                    <ul className="graph-renderer__palette-list">
                      {filteredPalette.map((entry) => (
                        <li key={entry.kind}>
                          <button type="button" className="graph-renderer__palette-item" onClick={() => addNode(entry)}>
                            <strong>{entry.title}</strong>
                            <span>{entry.category ?? entry.kind}</span>
                            {entry.description ? <small>{entry.description}</small> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {showSidePanels ? (
            <aside className="graph-renderer__side graph-renderer__side--outputs" aria-label="Workflow outputs">
              <header className="graph-renderer__side-header">Outputs</header>
              {document.outputs.length === 0 ? (
                <p className="graph-renderer__side-empty">No workflow outputs declared.</p>
              ) : (
                <ul className="graph-renderer__side-list">
                  {document.outputs.map((port) => (
                    <li key={port.id} className="graph-renderer__side-item">
                      <span className="graph-renderer__side-label">{port.label ?? port.id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          ) : null}
        </div>
        {showLogs ? <GraphLogsWidgetComponent /> : null}
        <GraphNodeEditModal
          open={!!editingNode}
          node={editingNode}
          manifest={editingManifest}
          onClose={() => setEditingNodeId(null)}
          onSubmit={(parameters, label) => {
            if (!editingNode) return;
            try {
              store.dispatchCommand({ type: 'node.update', nodeId: editingNode.id, patch: { parameters, ...(label ? { label } : {}) } });
              setEditingNodeId(null);
              setStatus(`Saved node '${editingNode.id}'.`);
              translateMutation('node-crud');
            } catch (error) {
              setStatus(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
            }
          }}
        />
        {inspectionNodeId && !isBoundaryId(inspectionNodeId) ? (
          <GraphNodeInspectionComponent nodeId={inspectionNodeId} onClose={() => graphInspection.close()} />
        ) : null}
      </section>
    </GraphCanvasContext.Provider>
  );
}

export default GraphRenderer;
