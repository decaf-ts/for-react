/**
 * @jest-environment node
 *
 * @module for-react/graph/graph-renderer-ssr.spec
 * @summary Row 9 (SSR) branch of the canonical graph canvas.
 * @description jsdom installs a non-configurable `window` getter on the global
 * object, so the client-only branch cannot be reached from the jsdom suite.
 * This file runs under the `node` environment (where `typeof window` is
 * genuinely `undefined`) and server-renders the real `GraphRenderer` to prove
 * the placeholder branch never initializes React Flow.
 */
jest.mock('@xyflow/react', () => {
  const React = require('react');
  const flow: { props: Record<string, unknown> | null } = { props: null };
  const useFlowState = (initial: unknown) => {
    const [state, setState] = React.useState(initial);
    return [state, setState, () => undefined];
  };
  return {
    __flow: flow,
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
    ConnectionMode: { Strict: 'strict' },
    ReactFlow: (props: Record<string, unknown>) => {
      flow.props = props;
      return React.createElement('div', {}, props.children);
    },
    ReactFlowProvider: ({ children }: { children: unknown }) =>
      React.createElement(React.Fragment, null, children),
    Panel: ({ children }: { children: unknown }) => React.createElement('div', {}, children),
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    Handle: () => null,
    BaseEdge: () => null,
    EdgeLabelRenderer: () => null,
    getBezierPath: () => ['', 0, 0, 0, 0],
    useEdges: () => [],
    useUpdateNodeInternals: () => () => undefined,
    reconnectEdge: (edge: unknown) => edge,
    useReactFlow: () => ({ screenToFlowPosition: (position: unknown) => position }),
    useNodesState: useFlowState,
    useEdgesState: useFlowState,
  };
});

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GraphWorkflowDocument } from '@decaf-ts/as-graph/shared';

import { GraphRenderer } from '../../../src/diagrams/components/graph/GraphRenderer';

const DOCUMENT = {
  id: 'wf-ssr',
  name: 'SSR',
  inputs: [],
  outputs: [],
  nodes: [],
  edges: [],
} as unknown as GraphWorkflowDocument;

describe('GraphRenderer SSR branch', () => {
  it('renders the graph-renderer--ssr placeholder and initializes no graph', () => {
    expect(typeof window).toBe('undefined');
    const flow = jest.requireMock('@xyflow/react').__flow as { props: Record<string, unknown> | null };
    flow.props = null;

    const html = renderToStaticMarkup(<GraphRenderer document={DOCUMENT} manifests={[]} />);

    expect(html).toContain('graph-renderer--ssr');
    expect(html).toContain('aria-hidden="true"');
    expect(flow.props).toBeNull();
  });
});
