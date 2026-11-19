/**
 * @module for-react/graph/port-zones.spec
 * @summary Row 2 — zone-anchored port contract (SAA-836 M1).
 * @description Covers the manifest/canvas port-zone extraction and validation in
 * `src/diagrams/port-zones.ts` plus the React Flow slot math in
 * `graph-node-utils.ts` (`graphHandlePositionOf`, `graphZoneSlotPercent`,
 * `graphZoneHandleStyle`, `graphInlineHandleStyle`, zone grouping and the
 * remeasure signature). None of these pure helpers had coverage before.
 */
jest.mock('@xyflow/react', () => ({
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

import type { GraphPortDefinition, GraphPortManifest } from '@decaf-ts/as-graph/shared';
import { PortDirection } from '@decaf-ts/as-graph/shared';
import {
  graphConnectionPortSideOf,
  graphManifestPortZoneOf,
  graphPortZoneOf,
} from '../../../src/diagrams/port-zones';
import {
  graphConnectionZoneGroupsOf,
  graphHandlePositionOf,
  graphInlineHandleStyle,
  graphPortSignatureOf,
  graphPortZoneOfDefinition,
  graphZoneHandleStyle,
  graphZoneSlotPercent,
} from '../../../src/diagrams/components/graph/graph-node-utils';

function manifestPort(overrides: Record<string, unknown> = {}): GraphPortManifest {
  return {
    id: 'memory',
    label: 'Memory',
    direction: PortDirection.CONNECTION,
    ...overrides,
  } as unknown as GraphPortManifest;
}

function canvasPort(graph: Record<string, unknown> | undefined, id = 'memory'): GraphPortDefinition {
  return {
    property: id,
    path: id,
    name: id,
    label: id,
    direction: PortDirection.CONNECTION,
    ...(graph ? { graph } : {}),
  } as unknown as GraphPortDefinition;
}

describe('graphManifestPortZoneOf — GraphPortZone contract', () => {
  it('reads a valid zone off the served manifest port', () => {
    const zone = { side: 'top', align: 'end', order: 3 } as const;
    expect(graphManifestPortZoneOf(manifestPort({ zone }))).toEqual(zone);
  });

  it('accepts every valid side and align combination', () => {
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      for (const align of ['start', 'center', 'end'] as const) {
        expect(graphManifestPortZoneOf(manifestPort({ zone: { side, align } }))).toEqual({ side, align });
      }
    }
  });

  it('rejects a missing zone, arrays, primitives and non-objects', () => {
    expect(graphManifestPortZoneOf(manifestPort())).toBeUndefined();
    expect(graphManifestPortZoneOf(manifestPort({ zone: [] }))).toBeUndefined();
    expect(graphManifestPortZoneOf(manifestPort({ zone: 'top' }))).toBeUndefined();
    expect(graphManifestPortZoneOf(manifestPort({ zone: null }))).toBeUndefined();
    expect(graphManifestPortZoneOf(manifestPort({ zone: 42 }))).toBeUndefined();
  });

  it('rejects an invalid side, align or order', () => {
    expect(graphManifestPortZoneOf(manifestPort({ zone: { side: 'middle' } }))).toBeUndefined();
    expect(graphManifestPortZoneOf(manifestPort({ zone: { side: 'top', align: 'left' } }))).toBeUndefined();
    expect(graphManifestPortZoneOf(manifestPort({ zone: { side: 'top', order: '1' } }))).toBeUndefined();
    expect(graphManifestPortZoneOf(manifestPort({ zone: { side: 'top', order: Number.NaN } }))).toEqual({
      side: 'top',
      order: Number.NaN,
    });
  });
});

describe('graphPortZoneOf — canvas definition extraction', () => {
  it('reads the zone from the canvas port `graph` block', () => {
    expect(graphPortZoneOf(canvasPort({ direction: 'connection', zone: { side: 'left', align: 'start' } }))).toEqual({
      side: 'left',
      align: 'start',
    });
  });

  it('returns undefined when the port has no graph block, no zone or an invalid zone', () => {
    expect(graphPortZoneOf(canvasPort(undefined))).toBeUndefined();
    expect(graphPortZoneOf(canvasPort({ direction: 'connection' }))).toBeUndefined();
    expect(graphPortZoneOf(canvasPort({ zone: { side: 'off-canvas' } }))).toBeUndefined();
  });

  it('mirrors the same validation through graphPortZoneOfDefinition', () => {
    expect(graphPortZoneOfDefinition(canvasPort({ zone: { side: 'bottom', align: 'center', order: 2 } }))).toEqual({
      side: 'bottom',
      align: 'center',
      order: 2,
    });
    expect(graphPortZoneOfDefinition(canvasPort({ zone: { side: 'diagonal' } }))).toBeUndefined();
    expect(graphPortZoneOfDefinition(canvasPort(undefined))).toBeUndefined();
  });
});

describe('graphConnectionPortSideOf — side + align defaults', () => {
  it('anchors zoned ports on their declared side', () => {
    expect(graphConnectionPortSideOf(canvasPort({ zone: { side: 'top', align: 'end' } }))).toBe('top');
    expect(graphConnectionPortSideOf(canvasPort({ zone: { side: 'left' } }))).toBe('left');
  });

  it('falls back to the legacy bottom edge for unzoned ports', () => {
    expect(graphConnectionPortSideOf(canvasPort(undefined))).toBe('bottom');
    expect(graphConnectionPortSideOf(canvasPort({ zone: { side: 'nope' } }))).toBe('bottom');
  });
});

describe('graphHandlePositionOf — React Flow handle sides', () => {
  it('maps each zone side to its React Flow Position', () => {
    expect(graphHandlePositionOf('top')).toBe('top');
    expect(graphHandlePositionOf('bottom')).toBe('bottom');
    expect(graphHandlePositionOf('left')).toBe('left');
    expect(graphHandlePositionOf('right')).toBe('right');
  });

  it('defaults unknown sides to the bottom edge', () => {
    expect(graphHandlePositionOf('diagonal' as never)).toBe('bottom');
  });
});

describe('graphZoneSlotPercent — zone slot math', () => {
  it('anchors a single port per align', () => {
    expect(graphZoneSlotPercent('center', 0, 1)).toBe(50);
    expect(graphZoneSlotPercent('start', 0, 1)).toBe(14);
    expect(graphZoneSlotPercent('end', 0, 1)).toBe(86);
  });

  it('spreads ports around the anchor by the 14% step', () => {
    expect(graphZoneSlotPercent('center', 0, 3)).toBe(36);
    expect(graphZoneSlotPercent('center', 1, 3)).toBe(50);
    expect(graphZoneSlotPercent('center', 2, 3)).toBe(64);
    expect(graphZoneSlotPercent('start', 0, 2)).toBe(8);
    expect(graphZoneSlotPercent('end', 1, 2)).toBe(92);
  });

  it('clamps the slot to the 8%..92% band', () => {
    expect(graphZoneSlotPercent('center', -10, 3)).toBe(8);
    expect(graphZoneSlotPercent('center', 10, 3)).toBe(92);
    expect(graphZoneSlotPercent('start', 0, 40)).toBe(8);
    expect(graphZoneSlotPercent('end', 39, 40)).toBe(92);
  });

  it('treats a zero/negative count as a single port', () => {
    expect(graphZoneSlotPercent('center', 0, 0)).toBe(50);
    expect(graphZoneSlotPercent('center', 0, -3)).toBe(50);
  });
});

describe('graphZoneHandleStyle / graphInlineHandleStyle', () => {
  it('positions top/bottom zones on the horizontal axis', () => {
    expect(graphZoneHandleStyle('bottom', 'center', 0, 1)).toEqual({ left: '50%' });
    expect(graphZoneHandleStyle('top', 'start', 0, 1)).toEqual({ left: '14%' });
  });

  it('positions left/right zones on the vertical axis', () => {
    expect(graphZoneHandleStyle('left', 'end', 0, 1)).toEqual({ top: '86%' });
    expect(graphZoneHandleStyle('right', 'center', 1, 3)).toEqual({ top: '50%' });
  });

  it('lays inline ports out along the vertical center axis', () => {
    expect(graphInlineHandleStyle(0, 1)).toEqual({ top: '50%' });
    expect(graphInlineHandleStyle(2, 3)).toEqual({ top: '64%' });
  });
});

describe('graphConnectionZoneGroupsOf — grouping and ordering', () => {
  const zoned = (id: string, side: string, align: string, order?: number) =>
    canvasPort({ zone: { side, align, ...(order === undefined ? {} : { order }) } }, id);

  it('groups zoned ports by side/align and puts zoned groups before legacy ones', () => {
    const groups = graphConnectionZoneGroupsOf([
      canvasPort(undefined, 'legacy-a'),
      zoned('top-1', 'top', 'end', 2),
      canvasPort(undefined, 'legacy-b'),
      zoned('top-0', 'top', 'end', 1),
      zoned('left-1', 'left', 'start', 1),
    ]);

    expect(groups.map((group) => group.key)).toEqual(['top:end', 'left:start', 'legacy']);
    expect(groups[0].zoned).toBe(true);
    expect(groups[0].ports.map((port) => port.path)).toEqual(['top-0', 'top-1']);
    expect(groups[2]).toMatchObject({ side: 'bottom', align: 'center', zoned: false });
    expect(groups[2].ports.map((port) => port.path)).toEqual(['legacy-a', 'legacy-b']);
  });

  it('derives stable port signatures from direction, id, side, align and order', () => {
    const before = graphPortSignatureOf([zoned('a', 'top', 'end', 1)]);
    const changedAlign = graphPortSignatureOf([zoned('a', 'top', 'start', 1)]);
    const changedOrder = graphPortSignatureOf([zoned('a', 'top', 'end', 2)]);
    expect(before).not.toBe(changedAlign);
    expect(before).not.toBe(changedOrder);
    expect(before).toBe(graphPortSignatureOf([zoned('a', 'top', 'end', 1)]));
  });
});
