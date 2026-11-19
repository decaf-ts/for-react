import type { CSSProperties } from 'react';
import { Position } from '@xyflow/react';
import type { GraphIconReference, GraphPortDefinition } from '@decaf-ts/as-graph/shared';

/** Resolves a catalogue icon reference to a Tabler sprite href. */
export function graphIconSpriteHrefOf(icon: GraphIconReference | undefined): string | null {
  if (!icon || icon.type !== 'catalogue' || !icon.name) return null;
  return `assets/tabler-sprite.svg#tabler-${icon.name.replace(/^ti-/, '')}`;
}

/** Resolves a URL/data icon reference to an image source. */
export function graphIconImageSrcOf(icon: GraphIconReference | undefined): string | null {
  if (!icon) return null;
  if (icon.type === 'url' && icon.url) return icon.url;
  if (icon.type === 'data' && icon.value) {
    return `data:${icon.mediaType ?? 'image/svg+xml'};utf8,${encodeURIComponent(icon.value)}`;
  }
  return null;
}

/** Whether a port is the manifest's default complete-input/branch port. */
export function isGraphDefaultPort(port: { property: string; path?: string }): boolean {
  const id = port.path || port.property;
  return id === 'value' || id === 'default';
}

/**
 * @description Side of a graph node on which a port zone is rendered.
 * @summary One of the four React Flow handle sides a canvas port definition can
 * declare.
 * @memberOf module:for-react.diagrams
 */
export type GraphPortZoneSide = 'top' | 'bottom' | 'left' | 'right';

/**
 * @description Cross-axis alignment of the ports within a graph port zone.
 * @summary Positions a zone's ports at the start, centre or end of its side.
 * @memberOf module:for-react.diagrams
 */
export type GraphPortZoneAlign = 'start' | 'center' | 'end';

/**
 * @description Render zone carried by a canvas graph port definition.
 * @summary Selects the node side, the cross-axis alignment and an optional
 * ordering hint used to lay out a port on the React Flow canvas.
 * @memberOf module:for-react.diagrams
 */
export interface GraphCanvasPortZone {
  side: GraphPortZoneSide;
  align?: GraphPortZoneAlign;
  order?: number;
}

/** Reads the render zone a canvas port definition carries. */
export function graphPortZoneOfDefinition(port: GraphPortDefinition): GraphCanvasPortZone | undefined {
  const zone = (port.graph as { zone?: unknown } | undefined)?.zone;
  if (!zone || typeof zone !== 'object') return undefined;
  const record = zone as Record<string, unknown>;
  if (record['side'] !== 'top' && record['side'] !== 'bottom' && record['side'] !== 'left' && record['side'] !== 'right') {
    return undefined;
  }
  return record as unknown as GraphCanvasPortZone;
}

/** React Flow handle position for a zone side. */
export function graphHandlePositionOf(side: GraphPortZoneSide): Position {
  switch (side) {
    case 'top':
      return Position.Top;
    case 'left':
      return Position.Left;
    case 'right':
      return Position.Right;
    default:
      return Position.Bottom;
  }
}

/** Percentage slot along a zone edge for one port. */
export function graphZoneSlotPercent(align: GraphPortZoneAlign, index: number, count: number): number {
  const step = 14;
  const safeCount = Math.max(1, count);
  const offset = (index - (safeCount - 1) / 2) * step;
  const anchor = align === 'start' ? 14 : align === 'end' ? 86 : 50;
  return Math.min(92, Math.max(8, anchor + offset));
}

/** Handle style anchoring a port in its zone slot. */
export function graphZoneHandleStyle(
  side: GraphPortZoneSide,
  align: GraphPortZoneAlign,
  index: number,
  count: number
): CSSProperties {
  const percent = `${graphZoneSlotPercent(align, index, count)}%`;
  return side === 'top' || side === 'bottom' ? { left: percent } : { top: percent };
}

/** Handle style for an inline (non-zoned) input/output port. */
export function graphInlineHandleStyle(index: number, count: number): CSSProperties {
  return { top: `${graphZoneSlotPercent('center', index, count)}%` };
}

/** Groups connection ports by their manifest zone. */
export function graphConnectionZoneGroupsOf(ports: GraphPortDefinition[]) {
  const groups = new Map<string, { key: string; side: GraphPortZoneSide; align: GraphPortZoneAlign; zoned: boolean; ports: GraphPortDefinition[] }>();
  for (const port of ports) {
    const zone = graphPortZoneOfDefinition(port);
    const side = zone?.side ?? 'bottom';
    const align = zone?.align ?? 'center';
    const key = zone ? `${side}:${align}` : 'legacy';
    const group = groups.get(key) ?? { key, side, align, zoned: Boolean(zone), ports: [] };
    group.ports.push(port);
    groups.set(key, group);
  }
  const ordered = [...groups.values()].sort((left, right) => (left.zoned === right.zoned ? 0 : left.zoned ? -1 : 1));
  for (const group of ordered) {
    group.ports.sort(
      (left, right) =>
        (graphPortZoneOfDefinition(left)?.order ?? 0) - (graphPortZoneOfDefinition(right)?.order ?? 0)
    );
  }
  return ordered;
}

/** Stable signature of a node's ports/zones, used to re-measure handles. */
export function graphPortSignatureOf(ports: GraphPortDefinition[]): string {
  return ports
    .map((port) => {
      const zone = graphPortZoneOfDefinition(port);
      return `${port.direction}:${port.path || port.property}:${zone?.side ?? ''}:${zone?.align ?? ''}:${zone?.order ?? 0}`;
    })
    .join('|');
}
