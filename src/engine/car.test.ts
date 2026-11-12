import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import './actions/builtin';
import './actions/character';
import { compileActions, evaluateActions, type ActionClip } from './actions/catalog';
import './assets';
import { buildCharacter } from './character/cast';
import { buildProp } from './world/build';

const car = () => buildProp({ id: 'carro', asset: 'vehicle.car', pos: [0, 0] });

function stage(at: [number, number], clips: ActionClip[], rot = 0) {
  const vehicle = buildProp({ id: 'carro', asset: 'vehicle.car', pos: [0, 0], rot });
  const ana = buildCharacter({ character: 'ana', at, yaw: -90 }, { id: 'ana', name: 'Ana' });
  const compiled = compileActions(clips, [vehicle, ana]);
  return { compiled, parts: vehicle.traits.parts!, where: (t: number) => evaluateActions(compiled, t).ana ?? {} };
}
const open: ActionClip = { t: 0, target: 'carro', action: 'set', params: { channel: 'rearLeft.open', value: 1 }, duration: 0 };
const close: ActionClip = { t: 1, target: 'carro', action: 'close', params: { part: 'rearLeft', by: 'ana' } };

describe('car', () => {
  it('says where each door is hinged, one after the other along the side', () => {
    const parts = car().traits.parts!;
    expect(Object.keys(parts).sort()).toEqual(['frontLeft', 'frontRight', 'rearLeft', 'rearRight']);
    expect(parts.frontLeft.side).toBe(-1);
    expect(parts.frontRight.hinge[0]).toBeCloseTo(-parts.frontLeft.hinge[0]);
    // The rear door starts where the front one ends, with a thin gap.
    expect(parts.rearLeft.hinge[1] - (parts.frontLeft.hinge[1] + parts.frontLeft.length)).toBeCloseTo(0.02);
  });

  it('has doors flush with the body', () => {
    const size = new THREE.Box3().setFromObject(car().object).getSize(new THREE.Vector3());
    const parts = car().traits.parts!;
    // Half the width of a door past its hinge line is the side of the car, but for mirrors and handles.
    expect(Math.abs(parts.frontLeft.hinge[0]) + 0.04).toBeCloseTo(0.85);
    expect(size.x).toBeLessThan(2.1);
  });

  it('leans the windscreen and the rear window toward the roof', () => {
    const slanted: number[] = [];
    car().object.traverse((o) => {
      if (o instanceof THREE.Mesh && (o.material as THREE.Material).transparent && Math.abs(o.rotation.x) > 0.3) slanted.push(o.rotation.x);
    });
    expect(slanted).toHaveLength(2);
    // One runs back as it rises and the other forward: the cabin narrows toward the roof.
    expect(Math.sign(Math.cos(slanted[0]))).toBe(-Math.sign(Math.cos(slanted[1])));
  });
});

describe('a door and whoever is in its way', () => {
  it('makes a character standing in the arc step out before the door closes', () => {
    const s = stage([-1.3, 0.8], [open, close]);
    const door = s.parts.rearLeft;
    const far = (t: number) => Math.hypot(s.where(t).x - door.hinge[0], s.where(t).z - door.hinge[1]);
    const end = 1 + s.compiled.clips.find((c) => c.action === 'close')!.duration;
    // Clear of the leaf before it starts to move, and it stays so.
    const starts = 1 + (end - 1) * 0.45;
    expect(far(starts)).toBeGreaterThan(door.length + 0.25);
    expect(far(end)).toBeGreaterThan(door.length + 0.25);
    expect(evaluateActions(s.compiled, starts).carro['rearLeft.open']).toBe(1);
    expect(evaluateActions(s.compiled, end).carro['rearLeft.open']).toBe(0);
    // Walking there, not sliding: the feet move and then stop.
    expect(s.where(1.3).gait).toBeGreaterThan(0.5);
    expect(s.where(end).gait).toBe(0);
    expect(s.where(end).stride).toBeGreaterThan(0);
  });

  it('leaves alone a character who is already clear', () => {
    const s = stage([-2.6, 0.8], [open, close]);
    expect(s.where(3).x).toBeUndefined();
    expect(s.compiled.clips.find((c) => c.action === 'close')!.duration).toBe(1.2);
  });

  it('works the same wherever the car is turned', () => {
    // Turned a quarter: the left side of the car now faces +z.
    const s = stage([0.8, 1.3], [open, close], 90);
    expect(Math.hypot(s.where(3).x - 0.8, s.where(3).z - 1.3)).toBeGreaterThan(0.4);
  });

  it('also when opening a door one is standing in front of', () => {
    const s = stage([-1.3, 0.8], [{ t: 1, target: 'carro', action: 'open', params: { part: 'rearLeft', by: 'ana' } }]);
    const door = s.parts.rearLeft;
    expect(Math.hypot(s.where(3).x - door.hinge[0], s.where(3).z - door.hinge[1])).toBeGreaterThan(door.length + 0.25);
  });
});
