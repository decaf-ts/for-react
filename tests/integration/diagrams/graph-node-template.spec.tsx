/**
 * @module for-react/graph/graph-node-template.spec
 * @summary Row 2 — hidden ports stay mounted and zone signature drives the remeasure path.
 * @description `GraphNodeTemplate` renders every declared port (including the
 * `hidden: true` ports Mastra-family manifests use) so a hidden port still owns
 * its React Flow handle. A zone/port-surface signature change must call
 * `useUpdateNodeInternals` so React Flow remeasures the moved handles. React
 * Flow is mocked with a handle-capture stub; no pointer simulation.
 */
jest.mock('@xyflow/react', () => {
  // jest.mock factories are hoisted above imports, so `require` is the only way to load React here.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  const updateNodeInternals = jest.fn();
  return {
    __updateNodeInternals: updateNodeInternals,
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
    Handle: (props: Record<string, unknown>) =>
      React.createElement('div', {
        'data-handle-id': props.id,
        'data-handle-type': props.type,
        'data-handle-position': props.position,
        'data-handle-class': props.className,
      }),
    useEdges: () => [],
    useUpdateNodeInternals: () => updateNodeInternals,
  };
});

import React from 'react';
import { render } from '@testing-library/react';
import type { GraphPortDefinition } from '@decaf-ts/as-graph/shared';
import { PortDirection } from '@decaf-ts/as-graph/shared';

import { GraphNodeTemplate } from '../../../src/diagrams/components/graph/GraphNodeTemplate';

function port(
  id: string,
  direction: PortDirection,
  overrides: Record<string, unknown> = {}
): GraphPortDefinition {
  return {
    property: id,
    path: id,
    name: id,
    label: id,
    direction,
    hidden: false,
    ...overrides,
  } as unknown as GraphPortDefinition;
}

const PORTS: GraphPortDefinition[] = [
  port('in-visible', PortDirection.INPUT, { hidden: false }),
  port('in-hidden', PortDirection.INPUT, { hidden: true }),
  port('out-visible', PortDirection.OUTPUT, { hidden: false }),
  port('out-hidden', PortDirection.OUTPUT, { hidden: true }),
  port('memory-hidden', PortDirection.CONNECTION, {
    hidden: true,
    graph: { direction: 'connection', zone: { side: 'top', align: 'end', order: 2 } },
  }),
  port('tools-hidden', PortDirection.CONNECTION, {
    hidden: true,
    graph: { direction: 'connection', zone: { side: 'bottom', align: 'start', order: 1 } },
  }),
];

function handleIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-handle-id]')).map(
    (handle) => handle.getAttribute('data-handle-id') as string
  );
}

function nodeProps(ports: GraphPortDefinition[]) {
  return {
    id: 'node-1',
    data: { title: 'Agent', kind: 'mastra.agent', ports },
    selected: false,
  } as never;
}

describe('GraphNodeTemplate hidden ports', () => {
  it('keeps hidden input/output/connection ports mounted as handles', () => {
    const { container } = render(<GraphNodeTemplate {...nodeProps(PORTS)} />);

    expect(handleIds(container).sort()).toEqual(
      ['in-hidden', 'in-visible', 'memory-hidden', 'out-hidden', 'out-visible', 'tools-hidden'].sort()
    );

    const hiddenHandle = container.querySelector('[data-handle-id="memory-hidden"]');
    expect(hiddenHandle).not.toBeNull();
    expect(hiddenHandle).toHaveAttribute('data-handle-position', 'top');
  });

  it('positions zoned connection handles on their declared side', () => {
    const { container } = render(<GraphNodeTemplate {...nodeProps(PORTS)} />);
    expect(container.querySelector('[data-handle-id="memory-hidden"]')).toHaveAttribute(
      'data-handle-position',
      'top'
    );
    expect(container.querySelector('[data-handle-id="tools-hidden"]')).toHaveAttribute(
      'data-handle-position',
      'bottom'
    );
  });

  it('remeasures once on mount and again when the port surface signature changes', () => {
    const updateNodeInternals = jest.requireMock('@xyflow/react').__updateNodeInternals as jest.Mock;
    updateNodeInternals.mockClear();

    const { rerender } = render(<GraphNodeTemplate {...nodeProps(PORTS)} />);
    expect(updateNodeInternals).toHaveBeenCalledTimes(1);
    expect(updateNodeInternals).toHaveBeenLastCalledWith('node-1');

    rerender(<GraphNodeTemplate {...nodeProps([...PORTS])} />);
    expect(updateNodeInternals).toHaveBeenCalledTimes(1);

    const withDynamicPort = [...PORTS, port('case-1', PortDirection.CONNECTION, {
      hidden: true,
      graph: { direction: 'connection', zone: { side: 'top', align: 'end', order: 3 } },
    })];
    rerender(<GraphNodeTemplate {...nodeProps(withDynamicPort)} />);
    expect(updateNodeInternals).toHaveBeenCalledTimes(2);
    expect(updateNodeInternals).toHaveBeenLastCalledWith('node-1');
  });
});
