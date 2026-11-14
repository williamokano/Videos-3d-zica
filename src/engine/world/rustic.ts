import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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

/** A hash of a cell of a grid, 0 to 1. */
const hash = (i: number, j: number, k = 0): number => {
  const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * The stone a point of a wall face lies in, for walls of field stones laid in rough courses: stones about 32 cm
 * wide and 22 cm tall, each a little off the grid. Returns which stone, and how far the point is from its edge
 * (0 on the mortar joint, growing toward the middle of the stone).
 */
function stoneAt(u: number, v: number): { id: number; edge: number } {
  const [cw, ch] = [0.32, 0.22];
  const row = Math.floor(v / ch);
  // Courses are offset like brickwork, and each stone is placed a little off.
  const shift = hash(row, 7) * cw;
  const col = Math.floor((u + shift) / cw);
  let best = Infinity;
  let second = Infinity;
  let id = 0;
  for (let dj = -1; dj <= 1; dj++) {
    const r = row + dj;
    const sh = hash(r, 7) * cw;
    for (let di = -1; di <= 1; di++) {
      const c = Math.floor((u + sh) / cw) + di;
      const cx = (c + 0.5 + (hash(c, r) - 0.5) * 0.5) * cw - sh;
      const cy = (r + 0.5 + (hash(c, r, 3) - 0.5) * 0.4) * ch;
      // Stones are wider than tall.
      const d = Math.hypot((u - cx) / cw, (v - cy) / ch);
      if (d < best) [second, best, id] = [best, d, c * 7919 + r];
      else if (d < second) second = d;
    }
  }
  void col;
  return { id, edge: second - best };
}

const STONE_TINTS = ['#c9b796', '#bba98a', '#d2c3a4', '#b39f80', '#c4b08e', '#a99677'];

/**
 * A block of wall built by hand: field stones of different sizes and shades bulging out of mud mortar, with the
 * mud plaster that once covered them still on in patches. Its faces are never flat and its top is uneven.
 */
export function rusticBlock(r: Rect, y0: number, y1: number, color: string): THREE.Mesh {
  const [w, h, d] = [r.maxX - r.minX, y1 - y0, r.maxZ - r.minZ];
  const along = w >= d ? 'x' : 'z';
  const step = 0.07;
  const geo = new THREE.BoxGeometry(
    w,
    h,
    d,
    Math.max(1, Math.round((along === 'x' ? w : w) / (along === 'x' ? step : 0.2))),
    Math.max(1, Math.round(h / step)),
    Math.max(1, Math.round(d / (along === 'z' ? step : 0.2))),
  );
  const [cx, cy, cz] = [(r.minX + r.maxX) / 2, (y0 + y1) / 2, (r.minZ + r.maxZ) / 2];
  geo.translate(cx, cy, cz);
  const pos = geo.attributes.position;
  const plasterColor = new THREE.Color(color);
  const mortar = new THREE.Color('#7d6a52');
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const tint = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    // Where on the face of the wall: u along it, v up. The thin side is across the wall.
    const u = along === 'x' ? x : z;
    const across = along === 'x' ? z - cz : x - cx;
    const onFace = Math.abs(Math.abs(across) - (along === 'x' ? d : w) / 2) < 1e-4;
    const stone = stoneAt(u + (across > 0 ? 0 : 13.7), y);
    // Plaster still on where the bumps say so, mostly low on the wall and in the middle of it.
    const plastered = Math.max(0, Math.min(1, (bumps(u * 0.7 + 4, y * 0.9, across > 0 ? 1 : -1) + 0.15) * 2.2));
    const bulge = Math.min(1, stone.edge / 0.35);
    const out = onFace ? (0.034 * Math.sqrt(bulge) * (1 - plastered) + bumps(x, y, z) * 0.012) * Math.sign(across || 1) : 0;
    if (along === 'x') pos.setZ(i, z + out);
    else pos.setX(i, x + out);
    if (Math.abs(y - y1) < 1e-4) pos.setY(i, y + bumps(z, x, y) * 0.035);
    tint.set(STONE_TINTS[Math.floor(hash(stone.id, 1) * STONE_TINTS.length)]).multiplyScalar(0.92 + 0.12 * hash(stone.id, 2));
    c.copy(mortar).lerp(tint, Math.min(1, stone.edge / 0.12));
    c.lerp(plasterColor, plastered * 0.92).multiplyScalar(0.95 + 0.05 * bumps(x * 3, y * 3, z * 3));
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
 * The roof of a house built by hand: round wooden beams across the short side of the room, a layer of reeds and
 * branches laid over them with narrow gaps (the light of the day comes through in thin lines) and a few beams
 * resting on posts. No slab. `rect` is the room, `top` the height under the beams.
 */
export function beamRoof(rect: Rect, top: number, seed = 1): THREE.Group {
  const g = new THREE.Group();
  const [w, d] = [rect.maxX - rect.minX, rect.maxZ - rect.minZ];
  const acrossX = w <= d; // beams span the short side
  const span = acrossX ? w : d;
  const length = acrossX ? d : w;
  const wood = (i: number) => mat(['#5e4630', '#6a5036', '#54402b'][i % 3]);
  const count = Math.max(2, Math.round(length / 0.65));
  for (let i = 0; i <= count; i++) {
    const t = (i + 0.5) / (count + 1);
    const r = 0.085 + hash(i, seed) * 0.03;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, span + 0.3, 9), wood(i));
    const along = (acrossX ? rect.minZ : rect.minX) + t * length;
    // Never quite level or straight.
    const sag = (hash(i, seed, 2) - 0.5) * 0.06;
    if (acrossX) {
      beam.rotation.z = Math.PI / 2;
      beam.rotation.y = (hash(i, seed, 5) - 0.5) * 0.05;
      beam.position.set((rect.minX + rect.maxX) / 2, top + r + sag, along);
    } else {
      beam.rotation.x = Math.PI / 2;
      beam.rotation.y = (hash(i, seed, 5) - 0.5) * 0.05;
      beam.position.set(along, top + r + sag, (rect.minZ + rect.maxZ) / 2);
    }
    beam.castShadow = beam.receiveShadow = true;
    g.add(beam);
  }
  // Reeds and branches across the beams, in strips with small gaps.
  const strips: THREE.BufferGeometry[] = [];
  const stripW = 0.085;
  const n = Math.floor(length / (stripW + 0.018));
  for (let i = 0; i < n; i++) {
    const at = (acrossX ? rect.minZ : rect.minX) + 0.02 + i * (stripW + 0.018) + stripW / 2;
    const thick = 0.035 + hash(i, seed, 9) * 0.02;
    const box = acrossX ? new THREE.BoxGeometry(span + 0.2, thick, stripW) : new THREE.BoxGeometry(stripW, thick, span + 0.2);
    box.translate(acrossX ? (rect.minX + rect.maxX) / 2 : at, top + 0.23 + thick / 2 + (hash(i, seed, 4) - 0.5) * 0.02, acrossX ? at : (rect.minZ + rect.maxZ) / 2);
    const tone = 0.8 + hash(i, seed, 6) * 0.3;
    const color = new THREE.Color('#b89a62').multiplyScalar(tone);
    const cols = new Float32Array(box.attributes.position.count * 3);
    for (let k = 0; k < box.attributes.position.count; k++) cols.set([color.r, color.g, color.b], k * 3);
    box.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    strips.push(box);
  }
  const reeds = new THREE.Mesh(mergeGeometries(strips), plasterMaterial());
  reeds.castShadow = reeds.receiveShadow = true;
  g.add(reeds);
  return g;
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
