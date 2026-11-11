import { union, type Rect } from './rect';
import type { Dir, Stairs } from './types';

export interface StairPart {
  kind: 'flight' | 'landing';
  rect: Rect;
  /** Height where the part is entered (its high end) and left (its low end). Equal for landings. */
  yStart: number;
  yEnd: number;
  /** Flights only: direction of descent and number of steps. */
  dir?: Dir;
  steps?: number;
}

export interface StairLayout {
  parts: StairPart[];
  /** Footprint of the whole stair; floors and ceilings crossed by the stair are cut open here. */
  well: Rect;
  top: number;
  bottom: number;
  /** Edge where the stair is entered at the top: a line across `axis` at `line`, spanning from..to. */
  entry: { axis: 'x' | 'z'; line: number; from: number; to: number };
}

const VEC: Record<Dir, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

/** Rectangle starting at edge center (x, z), extending `length` along `dir`, spanning lateral lo..hi around the center. */
function rectFrom(x: number, z: number, dir: Dir, length: number, lo: number, hi: number): Rect {
  const [dx, dz] = VEC[dir];
  if (dx !== 0) {
    const x2 = x + dx * length;
    return { minX: Math.min(x, x2), maxX: Math.max(x, x2), minZ: z + lo, maxZ: z + hi };
  }
  const z2 = z + dz * length;
  return { minX: x + lo, maxX: x + hi, minZ: Math.min(z, z2), maxZ: Math.max(z, z2) };
}

export function layoutStairs(st: Stairs): StairLayout {
  const hw = st.width / 2;
  const parts: StairPart[] = [];
  let [x, z] = st.top;
  let y = st.elevation;
  let dir: Dir | undefined;
  let entry: StairLayout['entry'] | undefined;

  for (const seg of st.path) {
    if ('flight' in seg) {
      dir = seg.flight;
      const steps = Math.max(1, Math.round(seg.drop / (st.riser ?? 0.18)));
      const length = steps * (st.tread ?? 0.28);
      if (!entry) {
        entry = VEC[dir][0] !== 0 ? { axis: 'z', line: x, from: z - hw, to: z + hw } : { axis: 'x', line: z, from: x - hw, to: x + hw };
      }
      parts.push({ kind: 'flight', rect: rectFrom(x, z, dir, length, -hw, hw), yStart: y, yEnd: y - seg.drop, dir, steps });
      x += VEC[dir][0] * length;
      z += VEC[dir][1] * length;
      y -= seg.drop;
      continue;
    }
    if (!dir) throw new Error(`Stairs "${st.id}": the path must start with a flight.`);
    const depth = seg.depth ?? st.width;
    const [dx, dz] = VEC[dir];
    if (seg.landing === 'straight') {
      parts.push({ kind: 'landing', rect: rectFrom(x, z, dir, depth, -hw, hw), yStart: y, yEnd: y });
      x += dx * depth;
      z += dz * depth;
      continue;
    }
    if (!seg.side || VEC[seg.side][0] * dx + VEC[seg.side][1] * dz !== 0) {
      throw new Error(`Stairs "${st.id}": a ${seg.landing} landing needs a "side" perpendicular to the flight before it.`);
    }
    const [sx, sz] = VEC[seg.side];
    if (seg.landing === 'uturn') {
      const shift = (st.width + (seg.gap ?? 0.1)) * (sx + sz);
      parts.push({ kind: 'landing', rect: rectFrom(x, z, dir, depth, Math.min(0, shift) - hw, Math.max(0, shift) + hw), yStart: y, yEnd: y });
      x += sx * Math.abs(shift);
      z += sz * Math.abs(shift);
    } else {
      parts.push({ kind: 'landing', rect: rectFrom(x, z, dir, st.width, -hw, hw), yStart: y, yEnd: y });
      x += dx * hw + sx * hw;
      z += dz * hw + sz * hw;
    }
  }
  if (!entry) throw new Error(`Stairs "${st.id}": the path has no flight.`);
  return { parts, well: union(parts.map((p) => p.rect)), top: st.elevation, bottom: y, entry };
}

/** Height of a stair part's walking surface at (x, z). */
export function partHeight(part: StairPart, x: number, z: number): number {
  if (!part.dir) return part.yStart;
  const r = part.rect;
  const f =
    part.dir === 'e' ? (x - r.minX) / (r.maxX - r.minX)
    : part.dir === 'w' ? (r.maxX - x) / (r.maxX - r.minX)
    : part.dir === 's' ? (z - r.minZ) / (r.maxZ - r.minZ)
    : (r.maxZ - z) / (r.maxZ - r.minZ);
  return part.yStart + (part.yEnd - part.yStart) * Math.min(1, Math.max(0, f));
}
