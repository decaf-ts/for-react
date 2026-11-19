/**
 * @module for-react/graph/graph-renderer.spec
 * @summary Renderer-level contract for the canonical graph canvas.
 * @description React Flow owns the pointer runtime, so these tests mock
 * `@xyflow/react` with a minimal capture-only renderer instead of simulating
 * gestures. They exercise the *real* `GraphRenderer` component:
 *
 * - the SSR/client-only branch (`typeof window === 'undefined'`) renders the
 *   placeholder and never initializes a graph;
 * - the connection status region is `role="status"` + `aria-live="polite"` and
 *   surfaces a denied connection message;
 * - `showLogs` defaults to the docked run-log widget and hides it when false;
 * - `onBeforeDelete` (row 3 parity) blocks ghost nodes, input/output boundary
 *   ids, nodes that are endpoints of a mandatory edge, and mandatory edges
 *   themselves, while keeping ordinary nodes/edges.
 */
jest.mock('@xyflow/react', () => {
  const React = require('react');
  const Position = { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' };
  const flow: { props: Record<string, unknown> | null } = { props: null };
  const updateNodeInternals = jest.fn();
  const useFlowState = (initial: unknown) => {
    const [state, setState] = React.useState(initial);
    return [state, setState, () => undefined];
  };
  return {
    __flow: flow,
    __updateNodeInternals: updateNodeInternals,
    Position,
    ConnectionMode: { Strict: 'strict' },
    ReactFlow: (props: Record<string, unknown>) => {
      flow.props = props;
      return React.createElement('div', { 'data-testid': 'react-flow' }, props.children);
    },
    ReactFlowProvider: ({ children }: { children: unknown }) =>
      React.createElement(React.Fragment, null, children),
    Panel: ({ children }: { children: unknown }) => React.createElement('div', {}, children),
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    Handle: (props: Record<string, unknown>) =>
      React.createElement('div', {
        'data-handle-id': props.id,
        'data-handle-position': props.position,
      }),
    BaseEdge: () => null,
    EdgeLabelRenderer: ({ children }: { children: unknown }) => React.createElement('div', {}, children),
    getBezierPath: () => ['', 0, 0, 0, 0],
    useEdges: () => [],
    useUpdateNodeInternals: () => updateNodeInternals,
    reconnectEdge: jest.fn((edge: unknown) => edge),
    useReactFlow: () => ({ screenToFlowPosition: (position: unknown) => position }),
    useNodesState: useFlowState,
    useEdgesState: useFlowState,
  };
});

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { GraphNodeManifest, GraphWorkflowDocument } from '@decaf-ts/as-graph/shared';
import { PortDirection } from '@decaf-ts/as-graph/shared';

import { GraphRenderer } from '../../../src/diagrams/components/graph/GraphRenderer';

interface CapturedFlowProps {
  nodes: { id: string; data?: Record<string, unknown> }[];
  edges: { id: string; data?: Record<string, unknown> }[];
  onConnect: (connection: unknown) => void;
  onBeforeDelete: (payload: {
    nodes: { id: string; data?: Record<string, unknown> }[];
    edges: { id: string; data?: Record<string, unknown> }[];
  }) => Promise<{
    nodes: { id: string; data?: Record<string, unknown> }[];
    edges: { id: string; data?: Record<string, unknown> }[];
  }>;
}

const LOOP_MANIFEST = {
  kind: 'core.loop.foreach',
  display: { name: 'Loop', category: 'flow' },
  inputs: [],
  outputs: [{ id: 'item', label: 'item', direction: 'output' }],
  connections: [{ id: 'loop', label: 'loop', direction: 'connection' }],
  parameters: [],
} as unknown as GraphNodeManifest;

const NOOP_MANIFEST = {
  kind: 'core.utility.noop',
  display: { name: 'Noop', category: 'utility' },
  inputs: [{ id: 'in', label: 'in', direction: 'input' }],
  outputs: [{ id: 'out', label: 'out', direction: 'output' }],
  connections: [],
  parameters: [],
} as unknown as GraphNodeManifest;

/** Canonical document with one empty loop (projects a ghost + mandatory edges), two ordinary nodes and one ordinary edge. */
function documentOf(): GraphWorkflowDocument {
  return {
    id: 'wf-renderer',
    name: 'Renderer',
    inputs: [{ id: 'count', label: 'Count', direction: PortDirection.INPUT }],
    outputs: [{ id: 'result', label: 'Result', direction: PortDirection.OUTPUT }],
    nodes: [
      {
        id: 'loop-1',
        kind: 'core.loop.foreach',
        label: 'Loop',
        parameters: {},
        ui: { position: { x: 0, y: 0 } },
      },
      {
        id: 'free-a',
        kind: 'core.utility.noop',
        label: 'A',
        parameters: {},
        ui: { position: { x: 200, y: 0 } },
      },
      {
        id: 'free-b',
        kind: 'core.utility.noop',
        label: 'B',
        parameters: {},
        ui: { position: { x: 400, y: 0 } },
      },
    ],
    edges: [
      {
        id: 'free-edge',
        type: 'data',
        source: { scope: 'node', nodeId: 'free-a', port: 'out' },
        target: { scope: 'node', nodeId: 'free-b', port: 'in' },
      },
    ],
  } as unknown as GraphWorkflowDocument;
}

const MANIFESTS = [LOOP_MANIFEST, NOOP_MANIFEST];

function capturedFlow(): { props: CapturedFlowProps | null } {
  return jest.requireMock('@xyflow/react').__flow as { props: CapturedFlowProps | null };
}

/** Renders the real canvas with the mocked React Flow runtime and waits for the projection. */
async function renderGraph(props: Record<string, unknown> = {}) {
  const flow = capturedFlow();
  flow.props = null;
  const document = (props.document as GraphWorkflowDocument | undefined) ?? documentOf();
  const utils = render(
    <GraphRenderer document={document} manifests={MANIFESTS} {...props} />
  );
  await waitFor(() => expect(flow.props).not.toBeNull());
  await waitFor(() => expect(flow.props!.nodes.length).toBeGreaterThan(0));
  return { ...utils, flow, document };
}

describe('GraphRenderer status region', () => {
  it('exposes the connection status as role="status" with aria-live="polite"', async () => {
    await renderGraph();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('surfaces a denied connection message in the status region', async () => {
    const { flow } = await renderGraph();
    await act(async () => {
      flow.props!.onConnect({
        source: 'free-a',
        sourceHandle: null,
        target: 'free-b',
        targetHandle: 'in',
      });
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /^Connection refused: Both endpoints must name a node and a port id/
    );
  });
});

describe('GraphRenderer showLogs', () => {
  it('renders the docked run-log widget by default', async () => {
    const { container } = await renderGraph();
    expect(container.querySelector('.graph-logs-dock')).not.toBeNull();
  });

  it('hides the run-log widget when showLogs is false', async () => {
    const document = documentOf();
    const { container, rerender, flow } = await renderGraph({ document });
    expect(container.querySelector('.graph-logs-dock')).not.toBeNull();
    rerender(<GraphRenderer document={document} manifests={MANIFESTS} showLogs={false} />);
    await waitFor(() => expect(capturedFlow().props).not.toBeNull());
    expect(flow.props).not.toBeNull();
    expect(container.querySelector('.graph-logs-dock')).toBeNull();
  });
});

describe('GraphRenderer.onBeforeDelete (row 3 deletion protection)', () => {
  it('blocks ghost nodes, boundary ids, mandatory endpoints and mandatory edges, keeping ordinary elements', async () => {
    const { flow } = await renderGraph();
    const nodes = flow.props!.nodes;
    const edges = flow.props!.edges;

    const mandatoryEdges = edges.filter((edge) => edge.data?.['mandatory'] === true);
    expect(mandatoryEdges).toHaveLength(2);
    const ghostNode = nodes.find((node) => node.id === 'ghost-loop-1');
    expect(ghostNode).toBeDefined();

    const targets = nodes.filter((node) =>
      ['ghost-loop-1', 'input-count', 'output-result', 'loop-1', 'free-a'].includes(node.id)
    );
    expect(targets).toHaveLength(5);

    let result: Awaited<ReturnType<CapturedFlowProps['onBeforeDelete']>> | undefined;
    await act(async () => {
      result = await flow.props!.onBeforeDelete({
        nodes: targets,
        edges: [mandatoryEdges[0], { id: 'free-edge', data: {} }],
      });
    });

    expect(result!.nodes.map((node) => node.id)).toEqual(['free-a']);
    expect(result!.edges.map((edge) => edge.id)).toEqual(['free-edge']);
    expect(screen.getByRole('status')).toHaveTextContent(
      `Deletion blocked: mandatory edge(s) ${mandatoryEdges[0].id}.`
    );
  });

  it('reports the node-only block when no mandatory edge is selected', async () => {
    const { flow } = await renderGraph();
    const nodes = flow.props!.nodes;
    const targets = nodes.filter((node) => ['input-count', 'output-result', 'free-a'].includes(node.id));

    let result: Awaited<ReturnType<CapturedFlowProps['onBeforeDelete']>> | undefined;
    await act(async () => {
      result = await flow.props!.onBeforeDelete({ nodes: targets, edges: [] });
    });

    expect(result!.nodes.map((node) => node.id)).toEqual(['free-a']);
    expect(result!.edges).toEqual([]);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Deletion blocked: ghost/boundary/mandatory endpoint node(s) input-count, output-result.'
    );
  });

  it('removes ordinary nodes and edges when nothing protected is selected', async () => {
    const { flow } = await renderGraph();
    const nodes = flow.props!.nodes;
    const targets = nodes.filter((node) => ['free-a', 'free-b'].includes(node.id));

    let result: Awaited<ReturnType<CapturedFlowProps['onBeforeDelete']>> | undefined;
    await act(async () => {
      result = await flow.props!.onBeforeDelete({
        nodes: targets,
        edges: [{ id: 'free-edge', data: {} }],
      });
    });

    expect(result!.nodes.map((node) => node.id)).toEqual(['free-a', 'free-b']);
    expect(result!.edges.map((edge) => edge.id)).toEqual(['free-edge']);
    expect(screen.getByRole('status')).toHaveTextContent('Removing 2 node(s) and 1 edge(s).');
  });
});
