import * as THREE from 'three';
import type { Ambient } from '../actions/ambient';
import type { ActionTarget, CompiledActions } from '../actions/catalog';
import { assetKind, createAsset, mat, type AssetChannels } from '../assets/registry';
import { buildDoor } from './doors';
import { contains, subtractRects, union, type Rect } from './rect';
import { layoutStairs, partHeight, type StairLayout } from './stairs';
import type { Location, Prop } from './types';
import { DEFAULT_ROOM_H, DOOR_H, WALL_T, roomOpenings, roomWalls, sideGeometry, type WallPiece } from './walls';

/** Footprint that blocks movement between heights y0 and y1. */
export interface Collider extends Rect {
  y0: number;
  y1: number;
  /** Lets walkers through for now (an open door). */
  disabled?: boolean;
  /** Id of the door this collider belongs to. */
  door?: string;
}

/** An object that episode actions can animate: a door leaf or a prop with an id. */
export interface InteractiveObject extends ActionTarget {
  object: THREE.Object3D;
  /** Show a channel at a value. */
  set(channel: string, value: number): void;
  /** Current value of a channel, for objects that keep state others read (the world). */
  get?(channel: string): number | undefined;
  /** Where it is, for finding the nearest one: [x, y, z]. */
  position(): [number, number, number];
  /** Things that move by themselves with the clock (blinking, breathing). Called after the channels are set. */
  tick?(t: number): void;
  /** A moving place on the object where something can ride, e.g. a character's "handR". */
  socket?(name: string): THREE.Object3D | undefined;
  /** Ride on a socket: `weight` 0 leaves the object where its channels put it, 1 puts it on the socket. */
  follow?(socket: THREE.Object3D | undefined, weight: number, holder?: InteractiveObject): void;
  /** Show whatever depends on the whole track rather than on channels, e.g. a phone's screen. Called last. */
  present?(compiled: CompiledActions, t: number): void;
  /** Characters: what the body does by itself right now (see actions/ambient.ts). */
  ambient?(values: Ambient | undefined): void;
  /** Characters: show or hide for a camera sitting in their eyes. */
  firstPerson?(on: boolean): void;
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
  /** Doors and props with an id, for the action track. */
  interactives: InteractiveObject[];
  /** Props that move by themselves with the clock (a ceiling fan): call each with the time of the frame. */
  animated: ((t: number) => void)[];
  /** Footprint of all areas. */
  bounds: Rect;
}

export const WALKER_HEIGHT = 1.7;
export const STEP_UP = 0.5;
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

function placeProps(
  props: Prop[] | undefined,
  origin: [number, number],
  elevation: number,
  parent: THREE.Object3D,
  interactives: InteractiveObject[],
  colliders: Collider[],
  animated: ((t: number) => void)[],
): void {
  for (const prop of props ?? []) {
    if (prop.repeat && prop.id) throw new Error(`Prop "${prop.id}": um prop com id não pode usar "repeat".`);
    if (prop.pickable && !prop.id) throw new Error(`Prop "${prop.asset}": um prop pegável precisa de "id".`);
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
        if (typeof obj.userData.animate === 'function') animated.push(obj.userData.animate as (t: number) => void);
        if (prop.id) interactives.push(interactiveProp(prop, obj));
        else {
          const solid = footprint(obj);
          if (solid) colliders.push(solid);
        }
      }
    }
  }
}

/**
 * What a piece of furniture blocks: the footprint of its parts that are at body height. A tree blocks with its
 * trunk, not its crown; a ceiling lamp or a rug blocks nothing. Props with an id can move, so they do not count.
 */
function footprint(obj: THREE.Object3D): Collider | undefined {
  // Something walked through or under: grass, a covered walkway, a picture of far buildings.
  if (obj.userData.passable) return undefined;
  obj.updateMatrixWorld(true);
  const base = obj.position.y;
  const box = new THREE.Box3();
  const part = new THREE.Box3();
  obj.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    part.setFromObject(o);
    if (part.min.y < base + 1.5 && part.max.y > base + 0.25) box.union(part);
  });
  if (box.isEmpty()) return undefined;
  return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, y0: box.min.y, y1: box.max.y };
}

/** A prop of its own, outside any room: something an episode brings in, like a phone in a pocket. */
export function buildProp(prop: Prop): InteractiveObject {
  if (!prop.id) throw new Error(`Prop "${prop.asset}" de episódio precisa de "id".`);
  const obj = createAsset(prop.asset, prop.params);
  obj.position.set(prop.pos[0], prop.y ?? 0, prop.pos[1]);
  obj.rotation.y = THREE.MathUtils.degToRad(prop.rot ?? 0);
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh && !o.userData.noShadow) o.castShadow = o.receiveShadow = true;
  });
  return interactiveProp(prop, obj);
}

function interactiveProp(prop: Prop, obj: THREE.Object3D): InteractiveObject {
  const own = (obj.userData.channels ?? {}) as AssetChannels;
  const placement: AssetChannels = {
    x: { value: obj.position.x, apply: (v) => (obj.position.x = v) },
    y: { value: obj.position.y, apply: (v) => (obj.position.y = v) },
    z: { value: obj.position.z, apply: (v) => (obj.position.z = v) },
    yaw: { value: prop.rot ?? 0, apply: (v) => obj.rotation.set(0, THREE.MathUtils.degToRad(v), 0) },
  };
  // `held` is 1 while something carries the item; characters will read it to attach the item to a hand.
  const held: AssetChannels = prop.pickable ? { held: { value: 0, apply: () => {} } } : {};
  const all = { ...own, ...placement, ...held };
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  const sockets: Record<string, [number, number, number]> = {};
  obj.traverse((o) => {
    if (o !== obj && o.name.startsWith('seat.')) sockets[o.name] = o.position.toArray();
  });
  const grip = new THREE.Vector3();
  return {
    id: prop.id!,
    kind: prop.pickable && assetKind(prop.asset) === 'prop' ? 'item' : assetKind(prop.asset),
    channels: Object.fromEntries(Object.entries(all).map(([name, c]) => [name, c.value])),
    traits: { pickable: prop.pickable, size: [size.x, size.y, size.z], sockets, parts: obj.userData.parts },
    object: obj,
    set: (channel, value) => all[channel]?.apply(value),
    // Held by its middle and hanging centered on the hand, unless the asset says where it is gripped
    // (`userData.grip`, a point of its own frame); then it also turns to face whoever holds it.
    follow: (socket, weight, holder) => {
      if (!socket || weight <= 0) return;
      socket.getWorldPosition(grip);
      const at = obj.userData.grip as [number, number, number] | undefined;
      if (at && holder) {
        obj.rotation.set(obj.userData.tilt ?? 0, holder.object.rotation.y, 0, 'YXZ');
        grip.sub(new THREE.Vector3(...at).applyEuler(obj.rotation));
      } else {
        grip.y -= size.y / 2;
      }
      obj.position.lerp(grip, Math.min(1, weight));
    },
    present: obj.userData.present && ((compiled, t) => obj.userData.present(compiled, t, prop.id)),
    position: () => [obj.position.x, obj.position.y, obj.position.z],
  };
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
  const interactives: InteractiveObject[] = [];
  const animated: ((t: number) => void)[] = [];

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
  placeProps(loc.props, [0, 0], 0, exterior, interactives, colliders, animated);
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
    (room.openings ?? []).forEach((o, index) => {
      if (!o.leaf || o.type !== 'door') return;
      const door = buildDoor(room, o);
      g.add(door.object);
      // A closed door blocks the doorway; the collider follows the `open` channel.
      const side = sideGeometry(room, o.wall);
      const from = side.from + o.at - o.width / 2;
      const id = o.id ?? `${room.id}.${o.wall}${index}`;
      const collider: Collider = { door: id, ...pieceRect({ ...side, from, to: from + o.width, y0: 0, y1: 0, kind: 'wall' }), y0: elevation, y1: elevation + DOOR_H };
      colliders.push(collider);
      const set = (open: number) => {
        door.setOpen(open);
        collider.disabled = open >= door.passableAt;
      };
      set(o.leaf.open ?? 0);
      const center: [number, number, number] = side.axis === 'x' ? [from + o.width / 2, elevation, side.center] : [side.center, elevation, from + o.width / 2];
      const middle = [room.origin[0] + room.size[0] / 2, room.origin[1] + room.size[1] / 2];
      const inside: [number, number] = side.axis === 'x' ? [0, Math.sign(middle[1] - side.center)] : [Math.sign(middle[0] - side.center), 0];
      door.object.updateMatrixWorld();
      const handle = door.object.localToWorld(new THREE.Vector3(...door.handle)).toArray();
      interactives.push({
        id,
        kind: 'door',
        channels: { open: o.leaf.open ?? 0 },
        traits: { opensFrom: o.leaf.opensFrom ?? 'both', doorKind: o.leaf.kind ?? 'swing', passableAt: door.passableAt, door: { handle, center, inside, width: o.width } },
        object: door.object,
        set: (channel, value) => {
          if (channel === 'open') set(value);
        },
        position: () => center,
      });
    });
    placeProps(room.props, room.origin, elevation, g, interactives, colliders, animated);
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

  const seen = new Set<string>();
  for (const { id } of interactives) {
    if (seen.has(id)) throw new Error(`Id repetido no local "${loc.id}": "${id}".`);
    seen.add(id);
  }
  const bounds = union(loc.rooms.map((r) => ({ minX: r.origin[0], maxX: r.origin[0] + r.size[0], minZ: r.origin[1], maxZ: r.origin[1] + r.size[1] })));
  return { group: root, rooms, exterior, stairs, colliders, surfaces, interactives, animated, bounds };
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

/** How much of the straight line from `from` to `to` is free of colliders, from 0 (blocked at once) to 1. */
export function clearFraction(colliders: Collider[], from: [number, number, number], to: [number, number, number]): number {
  let free = 1;
  for (const r of colliders) {
    if (r.disabled) continue;
    const slabs: [number, number, number][] = [[0, r.minX, r.maxX], [1, r.y0, r.y1], [2, r.minZ, r.maxZ]];
    let enter = 0;
    let exit = free;
    for (const [axis, min, max] of slabs) {
      const d = to[axis] - from[axis];
      if (Math.abs(d) < 1e-9) {
        if (from[axis] < min || from[axis] > max) exit = -1;
        continue;
      }
      const t0 = (min - from[axis]) / d;
      const t1 = (max - from[axis]) / d;
      enter = Math.max(enter, Math.min(t0, t1));
      exit = Math.min(exit, Math.max(t0, t1));
    }
    if (enter <= exit) free = enter;
  }
  return free;
}

/** Push a walker's circle at (x, z) out of every collider that overlaps their height. */
export function resolveCollisions(x: number, z: number, radius: number, colliders: Collider[], feetY = 0): [number, number] {
  for (let pass = 0; pass < 2; pass++) {
    for (const r of colliders) {
      if (r.disabled) continue;
      if (feetY >= r.y1 - 0.3 || feetY + WALKER_HEIGHT <= r.y0) continue;
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

