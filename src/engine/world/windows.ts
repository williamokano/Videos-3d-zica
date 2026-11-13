import * as THREE from 'three';
import { mat } from '../assets/registry';
import type { Opening, Room, WindowFrame } from './types';
import { DOOR_H, SILL_H, WALL_T, sideGeometry } from './walls';

/*
 * Real windows: a frame in the opening, with glass or slats that move. Without a `frame` an opening of type
 * "window" is a hole with a pane of glass, as before. Kinds:
 *
 * - fixed:    glass that does not open, divided by mullions.
 * - sliding:  leaves that run along the wall, half of them over the other half (the common home window).
 * - tilt:     "basculante": rows of panes in an iron frame, each row tilting out on its middle. The window of
 *             Brazilian public schools.
 * - casement: two leaves hinged at the sides, opening outward.
 * - louver:   "veneziana": slats that turn, no glass; closed, nothing is seen through it.
 * - blinds:   fixed glass with a blind on the inside ("persiana") that rolls up as it opens.
 *
 * The group sits at the start of the opening, at sill height, with local +x along the wall and z across it:
 * +z points into the declaring room on n/e walls and out of it on s/w walls (the same as doors).
 */

export interface BuiltWindow {
  object: THREE.Object3D;
  /** Show the window at `open` from 0 (closed) to 1 (fully open). */
  setOpen(open: number): void;
}

const glass = new THREE.MeshStandardMaterial({ color: '#a9d6f5', transparent: true, opacity: 0.32, roughness: 0.1, side: THREE.DoubleSide });
const BAR = 0.045;
const DEPTH = 0.07;

/** A box from its corner, in the window's frame: x along the wall, y up from the sill, centered across the wall. */
function bar(x: number, y: number, w: number, h: number, color: string, depth = DEPTH, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), mat(color));
  mesh.position.set(x + w / 2, y + h / 2, z);
  return mesh;
}

function pane(x: number, y: number, w: number, h: number, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), glass);
  mesh.position.set(x + w / 2, y + h / 2, z);
  mesh.userData.noShadow = true;
  return mesh;
}

export function buildWindow(room: Room, o: Opening, frame: WindowFrame): BuiltWindow {
  const g = sideGeometry(room, o.wall);
  const start = g.from + o.at - o.width / 2;
  const root = new THREE.Group();
  root.position.set(g.axis === 'x' ? start : g.center, (room.elevation ?? 0) + SILL_H, g.axis === 'x' ? g.center : start);
  root.rotation.y = g.axis === 'x' ? 0 : -Math.PI / 2;
  // Which way is out of the declaring room, in the window's own frame.
  const out = o.wall === 'n' || o.wall === 'e' ? -1 : 1;
  const [W, H] = [o.width, DOOR_H - SILL_H];
  const color = frame.color ?? ({ tilt: '#5b6b78', louver: '#8f6b4a', sliding: '#d9dde2', blinds: '#e9ecef' } as Record<string, string>)[frame.kind] ?? '#f1efe9';

  // The outer frame, and a sill that sticks out on both sides of the wall.
  root.add(bar(0, 0, W, BAR, color), bar(0, H - BAR, W, BAR, color), bar(0, 0, BAR, H, color), bar(W - BAR, 0, BAR, H, color));
  root.add(bar(-0.04, -0.035, W + 0.08, 0.035, '#cfcabd', WALL_T + 0.1));
  const [x0, y0, w, h] = [BAR, BAR, W - BAR * 2, H - BAR * 2];
  let setOpen: (open: number) => void = () => {};

  if (frame.kind === 'sliding') {
    // An even number of leaves; every other one runs on the inner track and slides over its neighbour.
    const n = Math.max(2, Math.round((frame.leaves ?? (W > 2.2 ? 4 : 2)) / 2) * 2);
    const lw = w / n;
    const moving: { leaf: THREE.Group; dir: number }[] = [];
    for (let i = 0; i < n; i++) {
      const leaf = new THREE.Group();
      const z = i % 2 ? 0.018 : -0.018;
      leaf.add(bar(0, 0, lw, 0.03, color, 0.03, z), bar(0, h - 0.03, lw, 0.03, color, 0.03, z), bar(0, 0, 0.03, h, color, 0.03, z), bar(lw - 0.03, 0, 0.03, h, color, 0.03, z), pane(0.03, 0.03, lw - 0.06, h - 0.06, z));
      leaf.position.set(x0 + i * lw, y0, 0);
      root.add(leaf);
      // In each pair, the leaf nearer the middle of the window slides over the outer one.
      const pair = Math.floor(i / 2);
      const inner = pair < n / 4 ? i % 2 === 1 : i % 2 === 0;
      if (inner) moving.push({ leaf, dir: pair < n / 4 ? -1 : 1 });
    }
    const rest = moving.map((m) => m.leaf.position.x);
    setOpen = (open) => moving.forEach((m, k) => (m.leaf.position.x = rest[k] + m.dir * open * (lw - 0.04)));
  } else if (frame.kind === 'tilt') {
    // Columns about half a meter wide; in each, three rows of panes. The lowest row is fixed, the others tilt.
    const columns = frame.columns ?? Math.max(1, Math.round(w / 0.55));
    const rows = 3;
    const [cw, rh] = [w / columns, h / rows];
    const tilting: THREE.Group[] = [];
    for (let c = 0; c < columns; c++) {
      if (c > 0) root.add(bar(x0 + c * cw - 0.012, y0, 0.024, h, color));
      for (let r = 0; r < rows; r++) {
        if (r > 0) root.add(bar(x0 + c * cw, y0 + r * rh - 0.012, cw, 0.024, color));
        // Each pane turns on a level axis through its middle.
        const sash = new THREE.Group();
        sash.position.set(x0 + c * cw + cw / 2, y0 + r * rh + rh / 2, 0);
        const [pw, ph] = [cw - 0.04, rh - 0.04];
        sash.add(pane(-pw / 2, -ph / 2, pw, ph), bar(-pw / 2, -ph / 2, pw, 0.016, color, 0.02), bar(-pw / 2, ph / 2 - 0.016, pw, 0.016, color, 0.02));
        root.add(sash);
        if (r > 0) tilting.push(sash);
      }
    }
    // The top of each pane leans out.
    setOpen = (open) => tilting.forEach((sash) => (sash.rotation.x = -out * open * 0.95));
  } else if (frame.kind === 'casement') {
    const lw = w / 2;
    const leaves = [0, 1].map((k) => {
      const hinge = new THREE.Group();
      hinge.position.set(k ? x0 + w : x0, y0, 0);
      const dir = k ? -1 : 1;
      const at = k ? -lw : 0;
      hinge.add(bar(at, 0, lw, 0.035, color, 0.035), bar(at, h - 0.035, lw, 0.035, color, 0.035), bar(at, 0, 0.035, h, color, 0.035), bar(at + lw - 0.035, 0, 0.035, h, color, 0.035), bar(at, h / 2 - 0.012, lw, 0.024, color, 0.03), pane(at + 0.035, 0.035, lw - 0.07, h - 0.07));
      root.add(hinge);
      return { hinge, dir };
    });
    setOpen = (open) => leaves.forEach(({ hinge, dir }) => (hinge.rotation.y = -dir * out * open * 1.5));
  } else if (frame.kind === 'louver') {
    // Slats across the whole opening. Closed they overlap like roof tiles; open they lie level and let air and light by.
    const count = Math.max(4, Math.round(h / 0.085));
    const pitch = h / count;
    const slats = Array.from({ length: count }, (_, i) => {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(w, pitch * 1.25, 0.012), mat(color));
      slat.position.set(x0 + w / 2, y0 + (i + 0.5) * pitch, 0);
      root.add(slat);
      return slat;
    });
    if (W > 1.4) root.add(bar(W / 2 - 0.02, 0, 0.04, H, color));
    setOpen = (open) => slats.forEach((slat) => (slat.rotation.x = out * (0.35 + open * 1.1)));
  } else if (frame.kind === 'blinds') {
    root.add(pane(x0, y0, w, h, out * 0.02));
    if (W > 1.4) root.add(bar(W / 2 - 0.015, 0, 0.03, H, color));
    // The blind hangs on the inside, from a box at the top, and gathers up into it.
    const count = Math.max(6, Math.round(h / 0.06));
    const pitch = h / count;
    const inside = -out * 0.06;
    const slats = Array.from({ length: count }, () => {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, pitch * 0.82, 0.008), mat(frame.blind ?? '#e9e2d0'));
      slat.position.set(x0 + w / 2, 0, inside);
      slat.rotation.x = 0.5;
      root.add(slat);
      return slat;
    });
    root.add(bar(x0, y0 + h - 0.05, w, 0.07, frame.blind ?? '#e9e2d0', 0.06, inside));
    setOpen = (open) => slats.forEach((slat, i) => {
      // From the bottom up; raised, the slats stack under the box.
      const down = y0 + (i + 0.5) * pitch;
      const up = y0 + h - 0.06 - (count - 1 - i) * 0.012;
      slat.position.y = down + (up - down) * open;
    });
  } else {
    // Fixed glass, with a mullion about every 70 cm and a transom across.
    root.add(pane(x0, y0, w, h));
    const columns = Math.max(1, Math.round(w / 0.7));
    for (let c = 1; c < columns; c++) root.add(bar(x0 + (c * w) / columns - 0.012, y0, 0.024, h, color));
    root.add(bar(x0, y0 + h * 0.62, w, 0.024, color));
  }
  setOpen(frame.open ?? 0);
  return { object: root, setOpen };
}
