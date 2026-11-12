import type { WalkPath } from '../actions/catalog';
import { STEP_UP, WALKER_HEIGHT, surfaceHeight, type Collider, type Surface } from './build';
import { contains, type Rect } from './rect';

/**
 * Walkable map of a location: a grid of standing spots on every floor and stair, linked where a person
 * can step from one to the next. Doors count as passable here; whether a door is open at the moment
 * someone reaches it is checked by the action that uses the path.
 */
export interface Nav {
  cell: number;
  minX: number;
  minZ: number;
  nx: number;
  nz: number;
  /** Node coordinates, three per node: x, y, z. */
  pos: Float32Array;
  /** Node indices per grid column. */
  columns: number[][];
  edges: number[][];
  surfaces: Surface[];
  doors: Collider[];
}

const RADIUS = 0.3;
/** Largest height change between neighbouring spots (a stair step, not a drop). */
const MAX_STEP = 0.4;
const SAMPLE = 0.1;

function blocked(x: number, z: number, y: number, colliders: Collider[]): boolean {
  for (const r of colliders) {
    if (y >= r.y1 - 0.3 || y + WALKER_HEIGHT <= r.y0) continue;
    const dx = x - Math.max(r.minX, Math.min(x, r.maxX));
    const dz = z - Math.max(r.minZ, Math.min(z, r.maxZ));
    if (dx * dx + dz * dz < RADIUS * RADIUS) return true;
  }
  return false;
}

export function buildNav(world: { surfaces: Surface[]; colliders: Collider[]; bounds: Rect }, cell = 0.25, margin = 6): Nav {
  const solid = world.colliders.filter((c) => !c.door);
  const minX = world.bounds.minX - margin;
  const minZ = world.bounds.minZ - margin;
  const nx = Math.ceil((world.bounds.maxX + margin - minX) / cell);
  const nz = Math.ceil((world.bounds.maxZ + margin - minZ) / cell);
  const pos: number[] = [];
  const columns: number[][] = [];

  for (let i = 0; i < nx; i++) {
    const x = minX + (i + 0.5) * cell;
    // Only the surfaces and walls near this strip matter.
    const near = world.surfaces.filter((s) => x >= s.rect.minX && x <= s.rect.maxX);
    const walls = solid.filter((c) => x > c.minX - RADIUS && x < c.maxX + RADIUS);
    for (let j = 0; j < nz; j++) {
      const z = minZ + (j + 0.5) * cell;
      const heights = near.filter((s) => contains(s.rect, x, z)).map((s) => s.height(x, z)).sort((a, b) => b - a);
      const column: number[] = [];
      let above = Infinity;
      for (const y of heights) {
        // A spot just under another one is not where a person would stand.
        if (above - y <= STEP_UP) continue;
        above = y;
        if (blocked(x, z, y, walls)) continue;
        column.push(pos.length / 3);
        pos.push(x, y, z);
      }
      columns.push(column);
    }
  }

  const count = pos.length / 3;
  const edges: number[][] = Array.from({ length: count }, () => []);
  const at = (i: number, j: number, y: number): number => {
    if (i < 0 || j < 0 || i >= nx || j >= nz) return -1;
    for (const n of columns[i * nz + j]) if (Math.abs(pos[n * 3 + 1] - y) <= MAX_STEP) return n;
    return -1;
  };
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      for (const n of columns[i * nz + j]) {
        const y = pos[n * 3 + 1];
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            if (!di && !dj) continue;
            const m = at(i + di, j + dj, y);
            if (m < 0) continue;
            // No cutting corners: a diagonal step needs both sides free.
            if (di && dj && (at(i + di, j, y) < 0 || at(i, j + dj, y) < 0)) continue;
            edges[n].push(m);
          }
        }
      }
    }
  }
  return { cell, minX, minZ, nx, nz, pos: new Float32Array(pos), columns, edges, surfaces: world.surfaces, doors: world.colliders.filter((c) => c.door) };
}

function nodeAt(nav: Nav, x: number, z: number, y: number, tolerance: number): number {
  const i = Math.floor((x - nav.minX) / nav.cell);
  const j = Math.floor((z - nav.minZ) / nav.cell);
  if (i < 0 || j < 0 || i >= nav.nx || j >= nav.nz) return -1;
  for (const n of nav.columns[i * nav.nz + j]) if (Math.abs(nav.pos[n * 3 + 1] - y) <= tolerance) return n;
  return -1;
}

/** Closest standing spot to a place, within about a meter. */
function nearestNode(nav: Nav, x: number, z: number, y: number): number {
  let best = -1;
  let bestD = Infinity;
  const reach = Math.ceil(1 / nav.cell);
  const ci = Math.floor((x - nav.minX) / nav.cell);
  const cj = Math.floor((z - nav.minZ) / nav.cell);
  for (let i = Math.max(0, ci - reach); i <= Math.min(nav.nx - 1, ci + reach); i++) {
    for (let j = Math.max(0, cj - reach); j <= Math.min(nav.nz - 1, cj + reach); j++) {
      for (const n of nav.columns[i * nav.nz + j]) {
        if (Math.abs(nav.pos[n * 3 + 1] - y) > 1) continue;
        const d = Math.hypot(nav.pos[n * 3] - x, nav.pos[n * 3 + 2] - z);
        if (d < bestD) [best, bestD] = [n, d];
      }
    }
  }
  return best;
}

/** Can a person walk straight from a to b ([x, y, z]) without leaving the walkable spots? */
function clear(nav: Nav, a: number[], b: number[]): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / (nav.cell / 2)));
  let y = a[1];
  for (let k = 1; k <= steps; k++) {
    const u = k / steps;
    const n = nodeAt(nav, a[0] + (b[0] - a[0]) * u, a[2] + (b[2] - a[2]) * u, y, MAX_STEP);
    if (n < 0) return false;
    y = nav.pos[n * 3 + 1];
  }
  return Math.abs(y - b[1]) <= MAX_STEP;
}

/** Radius people take around a corner at walking pace, in meters (measured: about 0.5 to 1). */
const CORNER_RADIUS = 0.7;
const MIN_CORNER_RADIUS = 0.2;

/**
 * Round each corner of a straight-line route with an arc, as people do: they cut the corner on a curve instead of
 * stopping to turn. Each arc starts and ends R·tan(θ/2) from the corner, at most a little under half of each side;
 * an arc that would run into something gets a smaller radius, and a corner with no room keeps its point.
 */
function roundCorners(nav: Nav, corners: number[][]): number[][] {
  const out: number[][] = [corners[0]];
  for (let c = 1; c < corners.length - 1; c++) {
    const [a, p, b] = [corners[c - 1], corners[c], corners[c + 1]];
    const into = [p[0] - a[0], p[2] - a[2]];
    const away = [b[0] - p[0], b[2] - p[2]];
    const [lenIn, lenOut] = [Math.hypot(into[0], into[1]), Math.hypot(away[0], away[1])];
    const cos = (into[0] * away[0] + into[1] * away[1]) / (lenIn * lenOut || 1);
    const theta = Math.acos(Math.max(-1, Math.min(1, cos)));
    // On stairs and landings (a change of level), and for almost straight corners, keep the point.
    if (lenIn < 1e-6 || lenOut < 1e-6 || theta < 0.05 || Math.abs(a[1] - p[1]) > 0.05 || Math.abs(b[1] - p[1]) > 0.05) {
      out.push(p);
      continue;
    }
    // The previous arc may have used part of the side coming in.
    const before = out[out.length - 1];
    const room = Math.min(Math.hypot(p[0] - before[0], p[2] - before[2]), lenOut / 2) * 0.95;
    let radius = Math.min(CORNER_RADIUS, room / Math.tan(theta / 2));
    let arc: number[][] | null = null;
    while (radius >= MIN_CORNER_RADIUS && !arc) {
      const d = radius * Math.tan(theta / 2);
      const start = [p[0] - (into[0] / lenIn) * d, p[1], p[2] - (into[1] / lenIn) * d];
      const end = [p[0] + (away[0] / lenOut) * d, p[1], p[2] + (away[1] / lenOut) * d];
      // A quadratic curve with the corner as its control point: tangent to both sides, close to a circle.
      const steps = Math.max(3, Math.ceil((theta * radius) / 0.1));
      const samples: number[][] = [];
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const [w0, w1, w2] = [(1 - u) ** 2, 2 * u * (1 - u), u * u];
        samples.push([start[0] * w0 + p[0] * w1 + end[0] * w2, p[1], start[2] * w0 + p[2] * w1 + end[2] * w2]);
      }
      const ok = clear(nav, before, samples[0]) && samples.every((q, k) => k === 0 || clear(nav, samples[k - 1], q));
      if (ok) arc = samples;
      else radius /= 2;
    }
    out.push(...(arc ?? [p]));
  }
  out.push(corners[corners.length - 1]);
  return out;
}

function shortest(nav: Nav, start: number, goal: number): number[] | null {
  const count = nav.edges.length;
  const cost = new Float32Array(count).fill(Infinity);
  const parent = new Int32Array(count).fill(-1);
  const closed = new Uint8Array(count);
  const p = nav.pos;
  const dist = (a: number, b: number) => Math.hypot(p[a * 3] - p[b * 3], p[a * 3 + 1] - p[b * 3 + 1], p[a * 3 + 2] - p[b * 3 + 2]);
  // Binary heap of [priority, node].
  const heap: [number, number][] = [[0, start]];
  const push = (item: [number, number]) => {
    let i = heap.push(item) - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (heap[up][0] <= heap[i][0]) break;
      [heap[up], heap[i]] = [heap[i], heap[up]];
      i = up;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        let low = i;
        for (const c of [2 * i + 1, 2 * i + 2]) if (c < heap.length && heap[c][0] < heap[low][0]) low = c;
        if (low === i) break;
        [heap[low], heap[i]] = [heap[i], heap[low]];
        i = low;
      }
    }
    return top;
  };

  cost[start] = 0;
  while (heap.length) {
    const [, n] = pop();
    if (closed[n]) continue;
    closed[n] = 1;
    if (n === goal) {
      const path = [n];
      while (parent[path[0]] >= 0) path.unshift(parent[path[0]]);
      return path;
    }
    for (const m of nav.edges[n]) {
      const c = cost[n] + dist(n, m);
      if (c < cost[m]) {
        cost[m] = c;
        parent[m] = n;
        push([c + dist(m, goal), m]);
      }
    }
  }
  return null;
}

/** Route on foot from a place to another, straightened where the way is clear. Null when there is no way. */
export function findPath(nav: Nav, from: [number, number, number], to: [number, number], toElevation: number): WalkPath | null {
  const start = nearestNode(nav, from[0], from[2], from[1]);
  const goal = nearestNode(nav, to[0], to[1], toElevation);
  if (start < 0 || goal < 0) return null;
  const nodes = shortest(nav, start, goal);
  if (!nodes) return null;

  const raw = nodes.map((n) => [nav.pos[n * 3], nav.pos[n * 3 + 1], nav.pos[n * 3 + 2]]);
  // The ends are the real places, not the grid spots next to them.
  raw[0] = [from[0], raw[0][1], from[2]];
  raw[raw.length - 1] = [to[0], raw[raw.length - 1][1], to[1]];
  const corners = [raw[0]];
  for (let i = 0; i < raw.length - 1; ) {
    let j = raw.length - 1;
    while (j > i + 1 && !clear(nav, raw[i], raw[j])) j--;
    corners.push(raw[j]);
    i = j;
  }

  const route = roundCorners(nav, corners);
  const points: [number, number, number][] = [[route[0][0], route[0][1], route[0][2]]];
  const distances = [0];
  let y = route[0][1];
  for (let c = 1; c < route.length; c++) {
    const [a, b] = [route[c - 1], route[c]];
    const span = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const steps = Math.max(1, Math.ceil(span / SAMPLE));
    for (let k = 1; k <= steps; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / steps;
      const z = a[2] + ((b[2] - a[2]) * k) / steps;
      y = surfaceHeight(nav.surfaces, x, z, y);
      const last = points[points.length - 1];
      distances.push(distances[distances.length - 1] + Math.hypot(x - last[0], y - last[1], z - last[2]));
      points.push([x, y, z]);
    }
  }

  const doors: WalkPath['doors'] = [];
  points.forEach(([x, py, z], i) => {
    for (const d of nav.doors) {
      if (py < d.y0 - 0.3 || py > d.y1 || x < d.minX - 0.05 || x > d.maxX + 0.05 || z < d.minZ - 0.05 || z > d.maxZ + 0.05) continue;
      if (doors.at(-1)?.id !== d.door) doors.push({ id: d.door!, distance: distances[i] });
    }
  });
  return { points, distances, length: distances[distances.length - 1], doors };
}
