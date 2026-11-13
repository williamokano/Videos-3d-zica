import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { compileActions, evaluateActions } from './actions/catalog';
import './actions/builtin';
import { buildLocation } from './world/build';
import type { Location, Opening, WindowFrame } from './world/types';

const KINDS: WindowFrame['kind'][] = ['fixed', 'sliding', 'tilt', 'casement', 'louver', 'blinds'];
const room = (openings: Opening[], windows?: WindowFrame): Location => ({
  id: 't', name: 't', ground: { color: '#fff', size: 40 }, windows,
  rooms: [{ id: 'sala', name: 'Sala', origin: [0, 0], size: [16, 5], floorColor: '#ccc', openings }],
});
const meshCount = (o: THREE.Object3D): number => {
  let n = 0;
  o.traverse((c) => void (c instanceof THREE.Mesh && n++));
  return n;
};

describe('windows', () => {
  it('without a frame a window is a pane of glass, as before, and cannot be opened', () => {
    const built = buildLocation(room([{ wall: 's', type: 'window', at: 3, width: 2 }]));
    expect(built.interactives).toHaveLength(0);
  });

  it('every kind builds a frame in the opening, in place of the plain glass, and the wall still blocks the way', () => {
    const plain = buildLocation(room([{ wall: 's', type: 'window', at: 3, width: 2 }]));
    for (const kind of KINDS) {
      const built = buildLocation(room([{ id: 'janela', wall: 's', type: 'window', at: 3, width: 2, frame: { kind } }]));
      const window = built.interactives.find((i) => i.id === 'janela')!;
      expect(window.kind).toBe('window');
      expect(meshCount(window.object)).toBeGreaterThan(5);
      expect(built.colliders).toHaveLength(plain.colliders.length);
      // It fills the opening: 2 m wide, from the sill (0.9 m) to the lintel (2.1 m), in the south wall.
      const box = new THREE.Box3().setFromObject(window.object);
      expect(box.min.x).toBeGreaterThan(1.9);
      expect(box.max.x).toBeLessThan(4.1);
      expect(box.min.y).toBeGreaterThan(0.8);
      expect(box.max.y).toBeLessThan(2.15);
      expect((box.min.z + box.max.z) / 2).toBeCloseTo(4.925, 0);
    }
  });

  it('opening moves something in every kind but the fixed one', () => {
    for (const kind of KINDS) {
      const built = buildLocation(room([{ id: 'janela', wall: 'e', type: 'window', at: 2.5, width: 1.8, frame: { kind } }]));
      const window = built.interactives.find((i) => i.id === 'janela')!;
      const snapshot = () => {
        const parts: string[] = [];
        window.object.updateMatrixWorld(true);
        window.object.traverse((c) => parts.push(c.matrixWorld.elements.map((v) => v.toFixed(3)).join()));
        return parts.join('|');
      };
      window.set('open', 0);
      const closed = snapshot();
      window.set('open', 1);
      expect(snapshot() === closed).toBe(kind === 'fixed');
    }
  });

  it('the location gives a frame to every window that has none, unless the window says no', () => {
    const built = buildLocation(room([
      { wall: 's', type: 'window', at: 2, width: 1.6 },
      { wall: 's', type: 'window', at: 6, width: 1.6, frame: { kind: 'sliding', open: 1 } },
      { wall: 's', type: 'window', at: 10, width: 1.6, frame: false },
      { wall: 's', type: 'door', at: 14, width: 1 },
    ], { kind: 'tilt', open: 0.4 }));
    expect(built.interactives.map((i) => [i.id, i.kind, i.channels.open])).toEqual([['sala.s0', 'window', 0.4], ['sala.s1', 'window', 1]]);
  });

  it('open and close work on a window as on a door', () => {
    const built = buildLocation(room([{ id: 'janela', wall: 'n', type: 'window', at: 3, width: 2, frame: { kind: 'tilt' } }]));
    const compiled = compileActions([{ t: 0, target: 'janela', action: 'open', params: { amount: 0.6 } }, { t: 2, target: 'janela', action: 'close' }], built.interactives);
    expect(evaluateActions(compiled, 1.5).janela.open).toBeCloseTo(0.6);
    expect(evaluateActions(compiled, 4).janela.open).toBe(0);
  });
});
