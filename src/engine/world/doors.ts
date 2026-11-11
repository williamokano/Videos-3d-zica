import * as THREE from 'three';
import { mat } from '../assets/registry';
import type { Interactive } from './interactive';
import type { Rect } from './rect';
import type { Opening, Room } from './types';
import { DOOR_H, WALL_T, sideGeometry } from './walls';

export interface BuiltDoor {
  interactive: Interactive;
  /** Blocks the doorway while the door is closed. */
  collider: Rect & { y0: number; y1: number; disabled?: boolean };
}

function part(w: number, h: number, d: number, color: string, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Build the leaf of an opening. Local +x runs along the wall from the start of the opening; local z crosses the wall. */
export function buildDoor(room: Room, o: Opening): BuiltDoor {
  const leaf = o.leaf!;
  const kind = leaf.kind ?? 'swing';
  const color = leaf.color ?? '#8f563b';
  const g = sideGeometry(room, o.wall);
  const elevation = room.elevation ?? 0;
  const start = g.from + o.at - o.width / 2;
  const w = o.width;

  const root = new THREE.Group();
  root.position.set(g.axis === 'x' ? start : g.center, elevation, g.axis === 'x' ? g.center : start);
  root.rotation.y = g.axis === 'x' ? 0 : -Math.PI / 2;
  // Local +z points into the declaring room on n/e walls and out of it on s/w walls.
  const inside = o.wall === 'n' || o.wall === 'e' ? 1 : -1;

  const collider: BuiltDoor['collider'] = {
    ...(g.axis === 'x'
      ? { minX: start, maxX: start + w, minZ: g.center - WALL_T / 2, maxZ: g.center + WALL_T / 2 }
      : { minX: g.center - WALL_T / 2, maxX: g.center + WALL_T / 2, minZ: start, maxZ: start + w }),
    y0: elevation,
    y1: elevation + DOOR_H,
  };

  let move: (open: number) => void;
  let passableFrom = 0.5;

  if (kind === 'swing') {
    const pivot = new THREE.Group();
    pivot.add(part(w - 0.04, DOOR_H - 0.04, 0.05, color, w / 2, DOOR_H / 2, 0));
    const bar = leaf.opensFrom === 'inside';
    const sides = leaf.opensFrom === 'inside' ? [inside] : leaf.opensFrom === 'outside' ? [-inside] : [1, -1];
    for (const side of sides) pivot.add(part(bar ? w * 0.7 : 0.12, 0.05, 0.05, '#d0d4dc', bar ? w / 2 : w - 0.14, 1.02, side * 0.05));
    root.add(pivot);
    // Emergency doors swing out of the room; ordinary doors swing into it.
    const swing = inside * (leaf.opensFrom === 'inside' ? 1 : -1);
    const angle = THREE.MathUtils.degToRad(leaf.angle ?? 95);
    move = (open) => (pivot.rotation.y = swing * angle * open);
  } else if (kind === 'sliding') {
    const z = inside * (WALL_T / 2 + 0.035);
    const panel = new THREE.Group();
    panel.add(part(w, DOOR_H - 0.04, 0.05, color, 0, DOOR_H / 2, 0));
    for (const side of [1, -1]) panel.add(part(0.04, 0.3, 0.04, '#d0d4dc', w / 2 - 0.12, 1.05, side * 0.045));
    panel.position.z = z;
    root.add(panel, part(w * 2, 0.06, 0.07, '#5a5f6b', 0, DOOR_H + 0.03, z));
    move = (open) => (panel.position.x = w / 2 - open * w);
  } else {
    const slatH = 0.15;
    const count = Math.ceil(DOOR_H / slatH);
    const slats: THREE.Mesh[] = [];
    for (let i = 0; i < count; i++) {
      const slat = part(w - 0.02, slatH - 0.012, 0.035, color, w / 2, 0, 0);
      slats.push(slat);
      root.add(slat);
    }
    root.add(part(w, 0.26, 0.26, '#5a5f6b', w / 2, DOOR_H + 0.13, inside * 0.1));
    passableFrom = 0.85;
    move = (open) => {
      slats.forEach((slat, i) => {
        const y = (i + 0.5) * slatH + open * DOOR_H;
        slat.position.y = y;
        slat.visible = y < DOOR_H;
      });
    };
  }

  const initial = leaf.open ?? 0;
  const set = (open: number) => {
    move(open);
    collider.disabled = open >= passableFrom;
  };
  set(initial);

  return {
    collider,
    interactive: {
      id: leaf.id ?? `${room.id}:${o.wall}:${o.at}`,
      kind: 'door',
      object: root,
      channels: { open: { initial, set } },
      anchors: {},
      opensFrom: leaf.opensFrom ?? 'both',
    },
  };
}
