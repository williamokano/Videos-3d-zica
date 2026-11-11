import * as THREE from 'three';
import { createAsset, mat } from '../assets/registry';
import type { Location, Prop, Room } from './types';
import { DEFAULT_ROOM_H, WALL_T, roomOpenings, roomWalls, type WallPiece } from './walls';

/** Axis-aligned footprint that blocks movement. */
export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface BuiltLocation {
  group: THREE.Group;
  /** Ceilings are separate so the studio can hide them for a dollhouse view. */
  ceilings: THREE.Group;
  colliders: Rect[];
}

const glass = new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.35, roughness: 0.1 });

function pieceRect(p: WallPiece): Rect {
  const half = WALL_T / 2;
  return p.axis === 'x'
    ? { minX: p.from, maxX: p.to, minZ: p.center - half, maxZ: p.center + half }
    : { minX: p.center - half, maxX: p.center + half, minZ: p.from, maxZ: p.to };
}

function pieceMesh(p: WallPiece, color: string): THREE.Mesh {
  const len = p.to - p.from;
  const t = p.kind === 'glass' ? 0.03 : WALL_T;
  const geo = p.axis === 'x' ? new THREE.BoxGeometry(len, p.y1 - p.y0, t) : new THREE.BoxGeometry(t, p.y1 - p.y0, len);
  const mesh = new THREE.Mesh(geo, p.kind === 'glass' ? glass : mat(color));
  const mid = (p.from + p.to) / 2;
  mesh.position.set(p.axis === 'x' ? mid : p.center, (p.y0 + p.y1) / 2, p.axis === 'x' ? p.center : mid);
  mesh.castShadow = p.kind === 'wall';
  mesh.receiveShadow = true;
  return mesh;
}

function placeProps(props: Prop[] | undefined, origin: [number, number], parent: THREE.Object3D): void {
  for (const prop of props ?? []) {
    const [nx, nz] = prop.repeat?.count ?? [1, 1];
    const [dx, dz] = prop.repeat?.spacing ?? [0, 0];
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const obj = createAsset(prop.asset, prop.params);
        obj.position.set(origin[0] + prop.pos[0] + i * dx, prop.y ?? 0, origin[1] + prop.pos[1] + j * dz);
        obj.rotation.y = THREE.MathUtils.degToRad(prop.rot ?? 0);
        obj.traverse((o) => {
          o.castShadow = true;
          o.receiveShadow = true;
        });
        parent.add(obj);
      }
    }
  }
}

function slab(room: Room, y: number, thickness: number, color: string): THREE.Mesh {
  const [w, d] = room.size;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat(color));
  mesh.position.set(room.origin[0] + w / 2, y, room.origin[1] + d / 2);
  mesh.receiveShadow = true;
  return mesh;
}

export function buildLocation(loc: Location): BuiltLocation {
  const root = new THREE.Group();
  root.name = loc.id;
  const ceilings = new THREE.Group();
  const colliders: Rect[] = [];

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(loc.ground.size, loc.ground.size), mat(loc.ground.color));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  root.add(ground);

  const openings = loc.rooms.flatMap(roomOpenings);
  for (const room of loc.rooms) {
    const g = new THREE.Group();
    g.name = room.id;
    g.add(slab(room, -0.025, 0.05, room.floorColor));
    for (const piece of roomWalls(room, openings)) {
      g.add(pieceMesh(piece, room.wallColor ?? '#f2ead8'));
      if (piece.y0 < 1.8) colliders.push(pieceRect(piece));
    }
    placeProps(room.props, room.origin, g);
    if (!room.outdoor) ceilings.add(slab(room, (room.height ?? DEFAULT_ROOM_H) + 0.05, 0.1, '#e9e4d8'));
    root.add(g);
  }
  placeProps(loc.props, [0, 0], root);
  root.add(ceilings);
  return { group: root, ceilings, colliders };
}

/** Push a circle at (x, z) out of every collider it overlaps. */
export function resolveCollisions(x: number, z: number, radius: number, colliders: Rect[]): [number, number] {
  for (let pass = 0; pass < 2; pass++) {
    for (const r of colliders) {
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
