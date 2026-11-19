/**
 * @note Ported / adapted to for-react from the for-angular graph canvas interaction suites.
 *
 * @module for-react/graph/graph-interactions.spec
 * @summary Binding design adjustment 10 — React canvas interaction coverage.
 * @description React Flow owns the pointer runtime, but every gesture the canvas
 * accepts is decided by the framework-agnostic document layer: the connection
 * guard, the mutation translator, the move translator, the command store and
 * the palette factory. Exercising those authorities with the same payloads the
 * canvas hands them proves the interaction contract without a jsdom pointer
 * simulation:
 *
 * - connection validity/occupancy and the denial message the canvas renders;
 * - reconnect with `ignoreEdgeId` (React `shouldReplaceId: false`) and the
 *   mandatory-edge reconnect refusal;
 * - node drag position commit and workflow-boundary move persistence;
 * - viewport commit onto `document.ui.viewport`;
 * - zone re-layout: the port-signature change that triggers
 *   `useUpdateNodeInternals` re-measure;
 * - palette add through the manifest palette factory + `node.add` command.
 */
// `@xyflow/react` ships ESM-only; the interaction authorities under test do not
// need its runtime, only its `Position` enum via the node layout helpers.
jest.mock('@xyflow/react', () => ({
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

import type { Connection } from '@xyflow/react';
import type {
  GraphEdgeInstance,
  GraphNodeManifest,
  GraphPortManifest,
  GraphWorkflowDocument,
} from '@decaf-ts/as-graph/shared';
import { PortDirection } from '@decaf-ts/as-graph/shared';

import {
  evaluateGraphConnection,
  graphConnectionGuardOf,
  type GraphGuardEdge,
} from '../../../src/diagrams/document/GraphConnectionGuard';
import {
  graphDocumentCommandsFromDiagramMutation,
  graphNodeMovesCommandsOf,
} from '../../../src/diagrams/document/GraphDiagramMutationTranslator';
import { applyGraphDocumentCommand } from '../../../src/diagrams/document/GraphDocumentCommands';
import { GraphWorkflowDocumentStore } from '../../../src/diagrams/document/GraphWorkflowDocumentStore';
import { GraphNodeCatalogStore } from '../../../src/diagrams/catalog/GraphNodeCatalogStore';
import { graphNodeInstanceFromManifest } from '../../../src/diagrams/document/GraphNodePaletteFactory';
import { graphPortSignatureOf } from '../../../src/diagrams/components/graph/graph-node-utils';

/** A port manifest helper. */
function portManifest(
  id: string,
  direction: PortDirection,
  connectionPolicy?: GraphPortManifest['connectionPolicy']
): GraphPortManifest {
  return { id, label: id, direction, ...(connectionPolicy ? { connectionPolicy } : {}) } as GraphPortManifest;
}

/** Resolves a node kind to its manifest port surface. */
function nodeSurface(kind: string) {
  return {
    kind,
    inputs: [
      portManifest('value', PortDirection.INPUT, { allowMultiple: false }),
      portManifest('other', PortDirection.INPUT),
    ],
    outputs: [
      portManifest('text', PortDirection.OUTPUT, { allowMultiple: false }),
      portManifest('lines', PortDirection.OUTPUT),
      portManifest('empty', PortDirection.OUTPUT),
    ],
    connections: [],
  };
}

/** A resolver over the two node kinds used below. */
function resolveNode(nodeId: string) {
  if (nodeId === 'source' || nodeId === 'sink' || nodeId === 'self-node') {
    return nodeSurface(nodeId === 'sink' ? 'sink.kind' : 'source.kind');
  }
  return undefined;
}

/** One candidate connection between the fixtures. */
function connection(overrides: Partial<Connection> = {}): Connection {
  return {
    source: 'source',
    sourceHandle: 'text',
    target: 'sink',
    targetHandle: 'value',
    ...overrides,
  } as Connection;
}

/** A canvas edge already occupying the `source:text -> sink:value` pair. */
function occupiedEdge(id = 'existing'): GraphGuardEdge {
  return { id, source: 'source', sourceHandle: 'text', target: 'sink', targetHandle: 'value' };
}

/** Minimal canonical document with one source and one sink member. */
function documentOf(): GraphWorkflowDocument {
  return {
    id: 'wf-interactions',
    name: 'Interactions',
    inputs: [{ id: 'count', label: 'Count', direction: PortDirection.INPUT } as never],
    outputs: [{ id: 'result', label: 'Result', direction: PortDirection.OUTPUT } as never],
    nodes: [
      { id: 'source', kind: 'source.kind', label: 'Source', parameters: {}, ui: { position: { x: 0, y: 0 } } },
      { id: 'sink', kind: 'sink.kind', label: 'Sink', parameters: {}, ui: { position: { x: 200, y: 0 } } },
    ],
    edges: [],
  } as GraphWorkflowDocument;
}

/** A catalogue reader carrying the fixtures. */
function catalogueOf(): GraphNodeCatalogStore {
  const store = new GraphNodeCatalogStore();
  store.setManifests([
    { kind: 'source.kind', title: 'Source', inputs: nodeSurface('source.kind').inputs, outputs: nodeSurface('source.kind').outputs, parameters: [] },
    { kind: 'sink.kind', title: 'Sink', inputs: nodeSurface('sink.kind').inputs, outputs: nodeSurface('sink.kind').outputs, parameters: [] },
  ] as unknown as GraphNodeManifest[]);
  return store;
}

describe('canvas connection validity and occupancy (design adjustment 10)', () => {
  const edges: GraphGuardEdge[] = [];

  it('accepts an output -> input connection with named ports', () => {
    const decision = evaluateGraphConnection(connection(), { edges, resolveNode });
    expect(decision).toMatchObject({ ok: true, code: 'allowed' });
  });

  it('denies unnamed handles (strict mode) with an explanation', () => {
    const decision = evaluateGraphConnection(connection({ sourceHandle: null }), { edges, resolveNode });
    expect(decision.ok).toBe(false);
    expect(decision.code).toBe('incomplete');
    expect(decision.message).toContain('Both endpoints must name a node and a port id');
  });

  it('denies an input used as the source and an output used as the target', () => {
    expect(
      evaluateGraphConnection(connection({ sourceHandle: 'value' }), { edges, resolveNode })
    ).toMatchObject({ ok: false, code: 'direction' });
    expect(
      evaluateGraphConnection(connection({ targetHandle: 'text' }), { edges, resolveNode })
    ).toMatchObject({ ok: false, code: 'direction' });
  });

  it('denies unknown nodes and unknown ports', () => {
    expect(
      evaluateGraphConnection(connection({ source: 'missing' }), { edges, resolveNode })
    ).toMatchObject({ ok: false, code: 'unknown-node' });
    expect(
      evaluateGraphConnection(connection({ targetHandle: 'nope' }), { edges, resolveNode })
    ).toMatchObject({ ok: false, code: 'unknown-port' });
  });

  it('denies a duplicate port-to-port edge with the denial message the canvas shows', () => {
    const decision = evaluateGraphConnection(connection(), {
      edges: [occupiedEdge()],
      resolveNode,
    });
    expect(decision).toMatchObject({ ok: false, code: 'duplicate' });
    expect(decision.message).toBe('That exact port-to-port connection already exists.');
  });

  it('enforces a single-outgoing source occupancy policy', () => {
    const decision = evaluateGraphConnection(connection({ sourceHandle: 'text' }), {
      edges: [{ id: 'other-edge', source: 'source', sourceHandle: 'text', target: 'third', targetHandle: 'value' }],
      resolveNode,
    });
    expect(decision).toMatchObject({ ok: false, code: 'source-occupied' });
  });

  it('enforces a single-incoming target occupancy policy', () => {
    const decision = evaluateGraphConnection(connection(), {
      edges: [{ id: 'other-edge', source: 'third', sourceHandle: 'lines', target: 'sink', targetHandle: 'value' }],
      resolveNode,
    });
    expect(decision).toMatchObject({ ok: false, code: 'target-occupied' });
  });

  it('denies a self-connection unless the port policy allows it', () => {
    expect(
      evaluateGraphConnection(
        connection({ source: 'self-node', target: 'self-node', sourceHandle: 'text', targetHandle: 'value' }),
        { edges, resolveNode }
      )
    ).toMatchObject({ ok: false, code: 'self' });
  });

  it('exposes the same guard over resolved canvas nodes', () => {
    const resolver = graphConnectionGuardOf(catalogueOf(), [
      { id: 'source', data: { kind: 'source.kind' } },
      { id: 'sink', data: { kind: 'sink.kind' } },
    ]);
    expect(resolver('source')?.outputs.map((entry) => entry.id)).toEqual(['text', 'lines', 'empty']);
  });
});

describe('canvas reconnect (shouldReplaceId:false)', () => {
  const oldEdge = occupiedEdge('reconnect-edge');

  it('allows the replacement connection while ignoring the edge being re-anchored', () => {
    const decision = evaluateGraphConnection(connection(), {
      edges: [oldEdge],
      resolveNode,
      ignoreEdgeId: oldEdge.id,
    });
    expect(decision).toMatchObject({ ok: true, code: 'allowed' });
  });

  it('denies the same replacement once the ignored edge is not excluded (duplicate)', () => {
    const decision = evaluateGraphConnection(connection(), { edges: [oldEdge], resolveNode });
    expect(decision).toMatchObject({ ok: false, code: 'duplicate' });
  });

  it('translates a reconnect as remove + add so the edge keeps its React identity but gets a canonical command', () => {
    const document = documentOf();
    document.edges = [oldEdge as unknown as GraphEdgeInstance];
    const catalogue = catalogueOf();
    const remove = graphDocumentCommandsFromDiagramMutation(
      document,
      { type: 'edges-removed', edgeIds: ['reconnect-edge'] },
      catalogue
    );
    let working = document;
    for (const command of remove) {
      const next = applyGraphDocumentCommand(working, command);
      if (next) working = next;
    }
    const add = graphDocumentCommandsFromDiagramMutation(
      working,
      {
        type: 'edges-added',
        edges: [{ sourceNodeId: 'source', sourcePort: 'lines', targetNodeId: 'sink', targetPort: 'value' }],
      },
      catalogue
    );
    expect(add).toHaveLength(1);
    expect(add[0]).toMatchObject({
      type: 'edge.add',
      edge: { source: { nodeId: 'source', port: 'lines' }, target: { nodeId: 'sink', port: 'value' } },
    });
  });
});

describe('node drag, boundary move and viewport commits', () => {
  it('commits one node.moves command with the dropped position', () => {
    const commands = graphNodeMovesCommandsOf(documentOf(), [
      { nodeId: 'source', position: { x: 48, y: 96 } },
    ]);
    expect(commands).toEqual([{ type: 'node.moves', moves: [{ nodeId: 'source', position: { x: 48, y: 96 } }] }]);
  });

  it('emits no command when a node is dropped at its committed position', () => {
    const document = documentOf();
    const commands = graphNodeMovesCommandsOf(document, [
      { nodeId: 'source', position: { x: 0, y: 0 } },
    ]);
    expect(commands).toEqual([]);
  });

  it('persists a workflow-boundary move on document.ui.boundaryPositions', () => {
    const store = new GraphWorkflowDocumentStore();
    store.initialize(documentOf());
    for (const command of graphNodeMovesCommandsOf(store.document()!, [
      { nodeId: 'output-result', position: { x: 900, y: 300 } },
    ])) {
      store.dispatchCommand(command);
    }
    expect(store.document()!.ui?.['boundaryPositions']).toMatchObject({
      'output-result': { x: 900, y: 300 },
    });
    expect(store.document()!.nodes.find((node) => node.id === 'output-result')).toBeUndefined();
  });

  it('commits a viewport change through viewport.set', () => {
    const store = new GraphWorkflowDocumentStore();
    store.initialize(documentOf());
    store.setViewport({ x: 12, y: 18, zoom: 1.25 });
    expect(store.document()!.ui?.['viewport']).toEqual({ x: 12, y: 18, zoom: 1.25 });
  });
});

describe('zone re-layout re-measure signature', () => {
  it('changes the port signature when a dynamic zone port is added', () => {
    const before = graphPortSignatureOf([portManifest('value', PortDirection.INPUT)]);
    const after = graphPortSignatureOf([
      portManifest('value', PortDirection.INPUT),
      portManifest('case-1', PortDirection.OUTPUT),
    ]);
    expect(before).not.toBe(after);
  });

  it('is stable for the same port surface in a different array identity', () => {
    const ports = [portManifest('value', PortDirection.INPUT), portManifest('text', PortDirection.OUTPUT)];
    expect(graphPortSignatureOf(ports)).toBe(graphPortSignatureOf([...ports]));
  });
});

describe('palette add', () => {
  const manifest = {
    kind: 'core.utility.code',
    title: 'Code',
    display: { name: 'Code' },
    inputs: [{ id: 'data', label: 'data', direction: PortDirection.INPUT, required: true }],
    outputs: [{ id: 'result', label: 'result', direction: PortDirection.OUTPUT, required: true }],
    parameters: [{ id: 'code', type: 'code', label: 'Code', defaultValue: 'return input;' }],
  } as unknown as GraphNodeManifest;

  it('builds a node.add command carrying the manifest parameter defaults', () => {
    const command = graphNodeInstanceFromManifest(documentOf(), manifest, { x: 10, y: 20 }, 'Code 1');
    expect(command).toMatchObject({
      type: 'node.add',
      node: { kind: 'core.utility.code', label: 'Code 1', ui: { position: { x: 10, y: 20 } } },
    });
    expect(command.type === 'node.add' && command.node.parameters?.['code']).toBe('return input;');
  });

  it('adds the palette node to the document through node.add', () => {
    const document = documentOf();
    const command = graphNodeInstanceFromManifest(document, manifest, { x: 10, y: 20 });
    const next = applyGraphDocumentCommand(document, command);
    expect(next?.nodes.some((entry) => entry.kind === 'core.utility.code')).toBe(true);
  });
});
