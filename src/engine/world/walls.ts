import type { Dir, Room } from './types';

export const WALL_T = 0.15;
export const DOOR_H = 2.1;
export const SILL_H = 0.9;
export const DEFAULT_ROOM_H = 3;

/** An opening in world coordinates. `axis` is the direction the wall runs along. */
export interface WorldOpening {
  axis: 'x' | 'z';
  /** Coordinate of the room boundary the wall sits on (z for x-walls, x for z-walls). */
  line: number;
  /** Floor height of the room that declares the opening. */
  elevation: number;
  from: number;
  to: number;
  type: 'door' | 'window';
}

export interface WallPiece {
  axis: 'x' | 'z';
  /** Center line of the piece across its thickness. */
  center: number;
  from: number;
  to: number;
  y0: number;
  y1: number;
  kind: 'wall' | 'glass';
}

const SIDES: Dir[] = ['n', 's', 'e', 'w'];

export function sideGeometry(room: Room, side: Dir) {
  const [x0, z0] = room.origin;
  const x1 = x0 + room.size[0];
  const z1 = z0 + room.size[1];
  switch (side) {
    case 'n': return { axis: 'x' as const, line: z0, center: z0 + WALL_T / 2, from: x0, to: x1 };
    case 's': return { axis: 'x' as const, line: z1, center: z1 - WALL_T / 2, from: x0, to: x1 };
    case 'w': return { axis: 'z' as const, line: x0, center: x0 + WALL_T / 2, from: z0, to: z1 };
    case 'e': return { axis: 'z' as const, line: x1, center: x1 - WALL_T / 2, from: z0, to: z1 };
  }
}

export function roomOpenings(room: Room): WorldOpening[] {
  return (room.openings ?? []).map((o) => {
    const g = sideGeometry(room, o.wall);
    const c = g.from + o.at;
    return { axis: g.axis, line: g.line, elevation: room.elevation ?? 0, from: c - o.width / 2, to: c + o.width / 2, type: o.type };
  });
}

/** Cut one wall span into solid pieces around its openings. */
export function splitWall(
  span: { axis: 'x' | 'z'; center: number; from: number; to: number },
  height: number,
  openings: { from: number; to: number; type: 'door' | 'window' }[],
): WallPiece[] {
  const piece = (from: number, to: number, y0: number, y1: number, kind: WallPiece['kind'] = 'wall'): WallPiece => ({
    axis: span.axis, center: span.center, from, to, y0, y1, kind,
  });
  const cuts = openings
    .map((o) => ({ ...o, from: Math.max(o.from, span.from), to: Math.min(o.to, span.to) }))
    .filter((o) => o.to - o.from > 0.01)
    .sort((a, b) => a.from - b.from);

  const out: WallPiece[] = [];
  let cursor = span.from;
  for (const o of cuts) {
    if (o.from < cursor) continue; // overlapping openings: first one wins
    if (o.from - cursor > 0.001) out.push(piece(cursor, o.from, 0, height));
    if (height > DOOR_H) out.push(piece(o.from, o.to, DOOR_H, height));
    if (o.type === 'window') {
      out.push(piece(o.from, o.to, 0, SILL_H));
      out.push(piece(o.from, o.to, SILL_H, Math.min(DOOR_H, height), 'glass'));
    }
    cursor = o.to;
  }
  if (span.to - cursor > 0.001) out.push(piece(cursor, span.to, 0, height));
  return out;
}

/**
 * Wall pieces for a room, with heights relative to its floor. Walls sit just inside
 * the room bounds, and any opening on the same boundary line and floor height cuts
 * them, so a door declared by one room also opens the wall of the room next to it.
 */
export function roomWalls(room: Room, allOpenings: WorldOpening[]): WallPiece[] {
  if (room.outdoor) return [];
  const height = room.height ?? DEFAULT_ROOM_H;
  return SIDES.flatMap((side) => {
    const g = sideGeometry(room, side);
    const elevation = room.elevation ?? 0;
    const hits = allOpenings.filter((o) => o.axis === g.axis && Math.abs(o.line - g.line) < 0.05 && Math.abs(o.elevation - elevation) < 0.05);
    return splitWall(g, height, hits);
  });
}
