import * as THREE from 'three';
import { createAsset, mat } from '../assets/registry';
import { buildDoor } from './doors';
import type { Channel, Interactive } from './interactive';
import { contains, subtractRects, type Rect } from './rect';
import { layoutStairs, partHeight, type StairLayout } from './stairs';
import type { Location, Prop } from './types';
import { DEFAULT_ROOM_H, WALL_T, roomOpenings, roomWalls, type WallPiece } from './walls';

/** Footprint that blocks movement between heights y0 and y1. */
export interface Collider extends Rect {
  y0: number;
  y1: number;
  /** Set while the thing is out of the way, e.g. an open door. */
  disabled?: boolean;
}

/** Something to stand on: a floor, the ground, a landing or a flight of stairs. */
export interface Surface {
  rect: Rect;
  height(x: number, z: number): number;
}

export interface BuiltRoom {
  id: string;
  elevation: number;
  group: THREE.Group;
  /** Kept apart so the studio can hide it for a dollhouse view. */
  ceiling: THREE.Group;
}

export interface BuiltLocation {
  group: THREE.Group;
  rooms: BuiltRoom[];
  /** Ground and location-level props. */
  exterior: THREE.Group;
  stairs: { bottom: number; group: THREE.Group }[];
  colliders: Collider[];
  surfaces: Surface[];
  /** Doors and named props, by id: everything actions can act on. */
  interactives: Map<string, Interactive>;
}

const WALKER_HEIGHT = 1.7;
const STEP_UP = 0.5;
const RAIL_H = 0.95;

const glass = new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.35, roughness: 0.1 });

function box(r: Rect, y0: number, y1: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(r.maxX - r.minX, y1 - y0, r.maxZ - r.minZ), material);
  mesh.position.set((r.minX + r.maxX) / 2, (y0 + y1) / 2, (r.minZ + r.maxZ) / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function pieceRect(p: WallPiece, thickness = WALL_T): Rect {
  const half = thickness / 2;
  return p.axis === 'x'
    ? { minX: p.from, maxX: p.to, minZ: p.center - half, maxZ: p.center + half }
    : { minX: p.center - half, maxX: p.center + half, minZ: p.from, maxZ: p.to };
}

function placeProps(props: Prop[] | undefined, origin: [number, number], elevation: number, parent: THREE.Object3D, register: (i: Interactive) => void): void {
  for (const prop of props ?? []) {
    const [nx, nz] = prop.repeat?.count ?? [1, 1];
    const [dx, dz] = prop.repeat?.spacing ?? [0, 0];
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const obj = createAsset(prop.asset, prop.params);
        obj.position.set(origin[0] + prop.pos[0] + i * dx, elevation + (prop.y ?? 0), origin[1] + prop.pos[1] + j * dz);
        obj.rotation.y = THREE.MathUtils.degToRad(prop.rot ?? 0);
        obj.traverse((o) => {
          if (o instanceof THREE.Mesh && !o.userData.noShadow) o.castShadow = o.receiveShadow = true;
        });
        parent.add(obj);
        if (prop.id) {
          if (prop.repeat) throw new Error(`Prop "${prop.id}": a prop with an id cannot use repeat.`);
          if (prop.id.includes('.')) throw new Error(`Prop id "${prop.id}" must not contain dots.`);
          register({
            id: prop.id,
            kind: 'prop',
            object: obj,
            channels: (obj.userData.channels as Record<string, Channel>) ?? {},
            anchors: (obj.userData.anchors as Record<string, THREE.Object3D>) ?? {},
            pose: { x: obj.position.x, y: obj.position.y, z: obj.position.z, rot: prop.rot ?? 0 },
          });
        }
      }
    }
  }
}

/** Handrail from a to b ([x, y, z] at floor level) with posts; blocks movement across it. */
function rail(a: THREE.Vector3, b: THREE.Vector3, parent: THREE.Object3D, colliders: Collider[]): void {
  const length = a.distanceTo(b);
  if (length < 0.05) return;
  const metal = mat('#5a5f6b');
  const up = new THREE.Vector3(0, RAIL_H, 0);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, length), metal);
  bar.position.copy(a).add(b).multiplyScalar(0.5).add(up);
  bar.lookAt(b.clone().add(up));
  parent.add(bar);
  const posts = Math.max(1, Math.round(length / 1.1));
  for (let i = 0; i <= posts; i++) {
    const p = a.clone().lerp(b, i / posts);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, RAIL_H, 8), metal);
    post.position.set(p.x, p.y + RAIL_H / 2, p.z);
    parent.add(post);
  }
  colliders.push({
    minX: Math.min(a.x, b.x) - 0.03, maxX: Math.max(a.x, b.x) + 0.03,
    minZ: Math.min(a.z, b.z) - 0.03, maxZ: Math.max(a.z, b.z) + 0.03,
    y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) + RAIL_H,
  });
}

function buildStairs(layout: StairLayout, color: string, colliders: Collider[], surfaces: Surface[]): THREE.Group {
  const g = new THREE.Group();
  const material = mat(color);
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  for (const part of layout.parts) {
    const r = part.rect;
    surfaces.push({ rect: r, height: (x, z) => partHeight(part, x, z) });
    // No walking underneath where there is no headroom.
    if (part.yEnd - layout.bottom > 0.3) colliders.push({ ...r, y0: layout.bottom, y1: part.yEnd - 0.01 });

    if (part.kind === 'landing') {
      g.add(box(r, part.yStart - 0.12, part.yStart, material));
      continue;
    }
    const n = part.steps!;
    const rise = (part.yStart - part.yEnd) / n;
    const alongX = part.dir === 'e' || part.dir === 'w';
    const sign = part.dir === 'e' || part.dir === 's' ? 1 : -1;
    const start = alongX ? (sign > 0 ? r.minX : r.maxX) : sign > 0 ? r.minZ : r.maxZ;
    const tread = (alongX ? r.maxX - r.minX : r.maxZ - r.minZ) / n;
    for (let i = 0; i < n; i++) {
      const a = start + sign * tread * i;
      const b = a + sign * tread;
      const top = part.yStart - rise * (i + 1);
      const step: Rect = alongX
        ? { minX: Math.min(a, b), maxX: Math.max(a, b), minZ: r.minZ, maxZ: r.maxZ }
        : { minX: r.minX, maxX: r.maxX, minZ: Math.min(a, b), maxZ: Math.max(a, b) };
      g.add(box(step, top - rise - 0.04, top, material));
    }
    // Side rails following the slope.
    const end = start + sign * tread * n;
    for (const side of alongX ? [r.minZ + 0.03, r.maxZ - 0.03] : [r.minX + 0.03, r.maxX - 0.03]) {
      rail(alongX ? v(start, part.yStart, side) : v(side, part.yStart, start), alongX ? v(end, part.yEnd, side) : v(side, part.yEnd, end), g, colliders);
    }
  }

  // Guard rail around the opening at the top floor, leaving the entry edge free.
  const w = layout.well;
  const e = layout.entry;
  const edge = (axis: 'x' | 'z', line: number, from: number, to: number) => {
    const spans = e.axis === axis && Math.abs(e.line - line) < 0.01 ? [[from, e.from], [e.to, to]] : [[from, to]];
    for (const [a, b] of spans) {
      rail(axis === 'x' ? v(a, layout.top, line) : v(line, layout.top, a), axis === 'x' ? v(b, layout.top, line) : v(line, layout.top, b), g, colliders);
    }
  };
  edge('x', w.minZ, w.minX, w.maxX);
  edge('x', w.maxZ, w.minX, w.maxX);
  edge('z', w.minX, w.minZ, w.maxZ);
  edge('z', w.maxX, w.minZ, w.maxZ);
  return g;
}

export function buildLocation(loc: Location): BuiltLocation {
  const root = new THREE.Group();
  root.name = loc.id;
  const colliders: Collider[] = [];
  const surfaces: Surface[] = [];
  const interactives = new Map<string, Interactive>();
  const register = (i: Interactive) => {
    if (interactives.has(i.id)) throw new Error(`Two interactive objects share the id "${i.id}".`);
    interactives.set(i.id, i);
  };

  const layouts = (loc.stairs ?? []).map((st) => ({ st, layout: layoutStairs(st) }));
  /** Stair wells that pass through a slab at height y. */
  const holesAt = (y: number) => layouts.filter(({ layout }) => y > layout.bottom + 0.2 && y <= layout.top + 0.01).map(({ layout }) => layout.well);
  const flat = (rect: Rect, y: number): Surface => ({ rect, height: () => y });

  const exterior = new THREE.Group();
  const half = loc.ground.size / 2;
  for (const r of subtractRects({ minX: -half, maxX: half, minZ: -half, maxZ: half }, holesAt(0))) {
    const ground = box(r, -0.04, -0.02, mat(loc.ground.color));
    ground.castShadow = false;
    exterior.add(ground);
    surfaces.push(flat(r, 0));
  }
  placeProps(loc.props, [0, 0], 0, exterior, register);
  root.add(exterior);

  const openings = loc.rooms.flatMap(roomOpenings);
  const rooms: BuiltRoom[] = loc.rooms.map((room) => {
    const elevation = room.elevation ?? 0;
    const height = room.height ?? DEFAULT_ROOM_H;
    const footprint: Rect = { minX: room.origin[0], maxX: room.origin[0] + room.size[0], minZ: room.origin[1], maxZ: room.origin[1] + room.size[1] };
    const g = new THREE.Group();
    g.name = room.id;
    const ceiling = new THREE.Group();

    for (const r of subtractRects(footprint, holesAt(elevation))) {
      g.add(box(r, elevation - 0.05, elevation, mat(room.floorColor)));
      surfaces.push(flat(r, elevation));
    }
    for (const piece of roomWalls(room, openings)) {
      const y0 = elevation + piece.y0;
      const y1 = elevation + piece.y1;
      const isGlass = piece.kind === 'glass';
      const mesh = box(pieceRect(piece, isGlass ? 0.03 : WALL_T), y0, y1, isGlass ? glass : mat(room.wallColor ?? '#f2ead8'));
      mesh.castShadow = !isGlass;
      g.add(mesh);
      colliders.push({ ...pieceRect(piece), y0, y1 });
    }
    for (const o of room.openings ?? []) {
      if (!o.leaf) continue;
      const door = buildDoor(room, o);
      g.add(door.interactive.object);
      colliders.push(door.collider);
      register(door.interactive);
    }
    placeProps(room.props, room.origin, elevation, g, register);
    if (!room.outdoor) {
      // The ceiling hangs just under the floor of the storey above.
      const top = elevation + height - 0.06;
      for (const r of subtractRects(footprint, holesAt(top))) ceiling.add(box(r, top - 0.06, top, mat('#e9e4d8')));
    }
    g.add(ceiling);
    root.add(g);
    return { id: room.id, elevation, group: g, ceiling };
  });

  const stairs = layouts.map(({ st, layout }) => {
    const group = buildStairs(layout, st.color ?? '#9aa0a8', colliders, surfaces);
    group.name = st.id;
    root.add(group);
    return { bottom: layout.bottom, group };
  });

  return { group: root, rooms, exterior, stairs, colliders, surfaces, interactives };
}

/** Floor height under a walker whose feet are at `feetY`: the highest surface they can stand on or step up to. */
export function surfaceHeight(surfaces: Surface[], x: number, z: number, feetY: number): number {
  let best = -Infinity;
  for (const s of surfaces) {
    if (!contains(s.rect, x, z)) continue;
    const y = s.height(x, z);
    if (y <= feetY + STEP_UP && y > best) best = y;
  }
  return best === -Infinity ? feetY : best;
}

/** Push a walker's circle at (x, z) out of every collider that overlaps their height. */
export function resolveCollisions(x: number, z: number, radius: number, colliders: Collider[], feetY = 0): [number, number] {
  for (let pass = 0; pass < 2; pass++) {
    for (const r of colliders) {
      if (r.disabled || feetY >= r.y1 - 0.3 || feetY + WALKER_HEIGHT <= r.y0) continue;
      const cx = Math.max(r.minX, Math.min(x, r.maxX));
      const cz = Math.max(r.minZ, Math.min(z, r.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * radius;
        z = cz + (dz / d) * radius;
      } else {
        // Center is inside the rect: exit through the nearest face.
        const exits: [number, number, number][] = [
          [x - r.minX, r.minX - radius, z],
          [r.maxX - x, r.maxX + radius, z],
          [z - r.minZ, x, r.minZ - radius],
          [r.maxZ - z, x, r.maxZ + radius],
        ];
        exits.sort((a, b) => a[0] - b[0]);
        [, x, z] = exits[0];
      }
    }
  }
  return [x, z];
}

