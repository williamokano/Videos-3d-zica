import * as THREE from 'three';
import { mat } from '../assets/registry';
import type { Dir, Opening, Room } from './types';
import { DOOR_H, WALL_T, sideGeometry } from './walls';

export interface BuiltDoor {
  object: THREE.Object3D;
  /** Show the door at `open` from 0 (closed) to 1 (fully open). */
  setOpen(open: number): void;
  /** From this much open, a person can walk through. */
  passableAt: number;
  /** Where a hand grabs the closed door, in the door's own frame. */
  handle: [number, number, number];
}

const SLAT_H = 0.14;

/**
 * Door leaf for an opening. The group sits at the start of the opening with local +x running along the wall;
 * local +z points into the declaring room on n/e walls and out of it on s/w walls.
 */
export function buildDoor(room: Room, o: Opening): BuiltDoor {
  const leaf = o.leaf!;
  const kind = leaf.kind ?? 'swing';
  const g = sideGeometry(room, o.wall);
  const start = g.from + o.at - o.width / 2;
  const root = new THREE.Group();
  root.position.set(g.axis === 'x' ? start : g.center, room.elevation ?? 0, g.axis === 'x' ? g.center : start);
  root.rotation.y = g.axis === 'x' ? 0 : -Math.PI / 2;
  const inside = o.wall === 'n' || o.wall === 'e' ? 1 : -1;
  const color = leaf.color ?? (kind === 'rollup' ? '#9aa0a8' : '#8f563b');
  const metal = mat('#d0d4dc');
  let setOpen: (open: number) => void;
  let passableAt = 0.5;
  let handle: [number, number, number] = [o.width - 0.14, 1.02, 0];

  if (kind === 'rollup') {
    // Slats ride up into the box; the ones above the opening are rolled away.
    const travel = DOOR_H - SLAT_H;
    const slats: THREE.Mesh[] = [];
    for (let y = SLAT_H / 2; y < DOOR_H; y += SLAT_H) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(o.width - 0.02, SLAT_H - 0.015, 0.035), mat(color));
      slat.position.set(o.width / 2, y, 0);
      slat.userData.rest = y;
      slats.push(slat);
      root.add(slat);
    }
    const housing = new THREE.Mesh(new THREE.BoxGeometry(o.width + 0.1, 0.26, 0.24), mat('#6f747d'));
    housing.position.set(o.width / 2, DOOR_H + 0.13, inside * (WALL_T / 2 + 0.12));
    root.add(housing);
    setOpen = (open) => {
      for (const slat of slats) {
        slat.position.y = slat.userData.rest + open * travel;
        slat.visible = slat.position.y < DOOR_H;
      }
    };
    passableAt = 1.75 / travel;
    handle = [o.width / 2, 0.45, 0];
  } else {
    const moving = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(o.width - 0.04, DOOR_H - 0.04, 0.05), mat(color));
    panel.position.set(o.width / 2, DOOR_H / 2, 0);
    moving.add(panel);
    root.add(moving);

    if (kind === 'sliding') {
      const dir = leaf.slide === 'end' ? 1 : -1;
      const offset = inside * (WALL_T / 2 + 0.04);
      moving.position.z = offset;
      for (const side of [1, -1]) {
        const pull = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.03), metal);
        pull.position.set(dir > 0 ? 0.12 : o.width - 0.12, 1.05, side * 0.04);
        moving.add(pull);
      }
      const track = new THREE.Mesh(new THREE.BoxGeometry(o.width * 2, 0.06, 0.07), mat('#5a5f6b'));
      track.position.set(o.width / 2 + (dir * o.width) / 2, DOOR_H + 0.03, offset);
      root.add(track);
      setOpen = (open) => {
        moving.position.x = dir * open * (o.width - 0.08);
      };
      passableAt = 0.6;
      handle = [dir > 0 ? 0.12 : o.width - 0.12, 1.05, offset];
    } else {
      // Emergency doors (opensFrom "inside") swing outward and get a push bar.
      const bar = leaf.opensFrom === 'inside';
      const handleSides = bar ? [inside] : leaf.opensFrom === 'outside' ? [-inside] : [1, -1];
      for (const side of handleSides) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(bar ? o.width * 0.7 : 0.12, 0.05, 0.05), metal);
        handle.position.set(bar ? o.width / 2 : o.width - 0.14, 1.02, side * 0.05);
        moving.add(handle);
      }
      const outward: Record<Dir, number> = { n: 1, s: -1, e: 1, w: -1 };
      const swing = outward[o.wall] * (bar ? 1 : -1);
      const full = THREE.MathUtils.degToRad(leaf.angle ?? 90);
      setOpen = (open) => {
        moving.rotation.y = swing * full * open;
      };
    }
  }

  root.traverse((m) => (m.castShadow = m.receiveShadow = true));
  setOpen(leaf.open ?? 0);
  return { object: root, setOpen, passableAt, handle };
}
