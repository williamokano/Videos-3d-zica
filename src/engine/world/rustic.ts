import * as THREE from 'three';
import { mat } from '../assets/registry';
import type { Rect } from './rect';
import type { Opening, Room } from './types';
import { DOOR_H, SILL_H, WALL_T, sideGeometry } from './walls';

/**
 * Rooms built by hand, long ago (`rustic: true` on a room): walls of stone and mud plaster that are never quite
 * flat or straight, doorways and windows with a rounded top instead of a square corner, doors of rough planks and
 * windows closed by wooden shutters. Everything is worked out from where it is in the world, so two pieces of
 * wall that meet bulge the same way at the joint and the same room always comes out the same.
 */

/** Smooth bumps, from -1 to 1, as a function of a place in the world. */
function bumps(x: number, y: number, z: number): number {
  return (
    0.55 * Math.sin(x * 2.3 + Math.sin(z * 1.7) * 1.6 + y * 0.9) * Math.cos(z * 2.1 - y * 1.3) +
    0.3 * Math.sin(x * 5.9 - z * 4.7 + y * 3.1) +
    0.15 * Math.sin(x * 11.3 + y * 9.1 + z * 7.7)
  );
}

const plaster = new Map<string, THREE.MeshStandardMaterial>();
function plasterMaterial(): THREE.MeshStandardMaterial {
  let m = plaster.get('v');
  if (!m) {
    m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 });
    plaster.set('v', m);
  }
  return m;
}

/** How far the rounded top of an opening comes down from its top corners, for an opening this wide. */
export function archRise(width: number): number {
  return Math.min(0.42, width * 0.38);
}

/**
 * A block of wall as a rough, hand-plastered slab: its faces bulge in and out by a couple of centimeters, its
 * edges are uneven and its color goes in patches, lighter and darker, like mud plaster.
 */
export function rusticBlock(r: Rect, y0: number, y1: number, color: string): THREE.Mesh {
  const [w, h, d] = [r.maxX - r.minX, y1 - y0, r.maxZ - r.minZ];
  const geo = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w / 0.22)), Math.max(1, Math.round(h / 0.22)), Math.max(1, Math.round(d / 0.22)));
  const [cx, cy, cz] = [(r.minX + r.maxX) / 2, (y0 + y1) / 2, (r.minZ + r.maxZ) / 2];
  geo.translate(cx, cy, cz);
  const pos = geo.attributes.position;
  const base = new THREE.Color(color);
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    // Out of the thin side of the slab (across the wall), and a little up and down at the top edge.
    const n = bumps(x, y, z);
    if (w < d) pos.setX(i, x + n * 0.025);
    else pos.setZ(i, z + n * 0.025);
    if (Math.abs(y - y1) < 1e-4) pos.setY(i, y + bumps(z, x, y) * 0.03);
    const shade = 0.9 + 0.1 * bumps(x * 0.6 + 3, y * 0.8, z * 0.6 - 2) + 0.03 * Math.sin(x * 23 + y * 31 + z * 17);
    c.copy(base).multiplyScalar(shade);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.translate(-cx, -cy, -cz);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, plasterMaterial());
  mesh.position.set(cx, cy, cz);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/**
 * The wall that fills the top corners of an opening so its top is a rounded arch: a piece of wall between the
 * square top of the opening and a half ellipse under it.
 */
export function archFill(room: Room, o: Opening, color: string): THREE.Mesh {
  const g = sideGeometry(room, o.wall);
  const top = DOOR_H;
  const rise = archRise(o.width);
  const half = o.width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(half, top - rise);
  shape.lineTo(half, top);
  shape.lineTo(-half, top);
  shape.lineTo(-half, top - rise);
  shape.absellipse(0, top - rise, half, rise, Math.PI, 0, true, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 16 });
  geo.translate(0, 0, -WALL_T / 2);
  const mesh = new THREE.Mesh(geo, mat(color));
  const at = g.from + o.at;
  mesh.position.set(g.axis === 'x' ? at : g.center, room.elevation ?? 0, g.axis === 'x' ? g.center : at);
  mesh.rotation.y = g.axis === 'x' ? 0 : -Math.PI / 2;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

const WOODS = ['#6e4a2c', '#7a5232', '#654327', '#80583a'];

/** A leaf of rough boards side by side, held by two crossbars, in a leaf's own frame (x along, from 0). */
export function plankLeaf(width: number, height: number, color: string, z = 0, seed = 1): THREE.Group {
  const g = new THREE.Group();
  const boards = Math.max(2, Math.round(width / 0.16));
  const bw = width / boards;
  for (let i = 0; i < boards; i++) {
    // Boards a little uneven in length and shade.
    const len = height - Math.abs(Math.sin(seed * 7.1 + i * 2.3)) * 0.035;
    const board = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.008, len, 0.04), mat(i % 3 === 1 ? color : WOODS[(i + seed) % WOODS.length]));
    board.position.set(i * bw + bw / 2, len / 2, z);
    g.add(board);
  }
  for (const y of [height * 0.2, height * 0.78]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width - 0.04, 0.09, 0.03), mat('#5a3b22'));
    bar.position.set(width / 2, y, z + 0.035);
    g.add(bar);
  }
  return g;
}

/** Two wooden shutters closing an arched window, hinged at the sides and opening into the room. */
export function shutterWindow(room: Room, o: Opening, color: string): { object: THREE.Object3D; setOpen(open: number): void } {
  const g = sideGeometry(room, o.wall);
  const start = g.from + o.at - o.width / 2;
  const root = new THREE.Group();
  root.position.set(g.axis === 'x' ? start : g.center, (room.elevation ?? 0) + SILL_H, g.axis === 'x' ? g.center : start);
  root.rotation.y = g.axis === 'x' ? 0 : -Math.PI / 2;
  // Into the declaring room, in the window's own frame (doors and windows share it).
  const inward = o.wall === 'n' || o.wall === 'e' ? 1 : -1;
  const h = DOOR_H - SILL_H - archRise(o.width) + 0.02;
  const lw = o.width / 2;
  // A wooden sill.
  const sill = new THREE.Mesh(new THREE.BoxGeometry(o.width + 0.08, 0.05, WALL_T + 0.08), mat('#6b4a2e'));
  sill.position.set(o.width / 2, -0.025, 0);
  root.add(sill);
  const leaves = [0, 1].map((k) => {
    const hinge = new THREE.Group();
    hinge.position.set(k ? o.width : 0, 0, inward * (WALL_T / 2 - 0.03));
    const leaf = plankLeaf(lw, h, color, 0, k + 3);
    leaf.position.x = k ? -lw : 0;
    hinge.add(leaf);
    root.add(hinge);
    return { hinge, dir: k ? -1 : 1 };
  });
  const setOpen = (open: number): void => leaves.forEach(({ hinge, dir }) => (hinge.rotation.y = -dir * inward * open * 1.7));
  root.traverse((m) => (m.castShadow = m.receiveShadow = true));
  return { object: root, setOpen };
}
