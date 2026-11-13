import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import './assets';
import { createAsset, listAssets } from './assets/registry';
import { buildLocation } from './world/build';

const meshes = (o: THREE.Object3D): THREE.Mesh[] => {
  const out: THREE.Mesh[] = [];
  o.traverse((c) => void (c instanceof THREE.Mesh && out.push(c)));
  return out;
};
const size = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());

describe('scenery assets', () => {
  it('registers the new kit', () => {
    const ids = listAssets().map((a) => a.id);
    for (const id of ['light.tubeLamp', 'school.ceilingFan', 'school.speaker', 'structure.fence', 'structure.gate', 'nature.grass', 'nature.weeds', 'school.concreteTable', 'structure.canopy', 'backdrop.house', 'backdrop.skyline']) expect(ids).toContain(id);
  });

  it('a fence of any length is a handful of meshes, not one per bar', () => {
    const fence = createAsset('structure.fence', { length: 40 });
    expect(meshes(fence).length).toBeLessThanOrEqual(3);
    expect(size(fence).x).toBeCloseTo(40, 0);
    expect(size(fence).y).toBeCloseTo(1.9, 1);
  });

  it('a tube lamp hangs from its origin and lights only when asked', () => {
    const lit = createAsset('light.tubeLamp');
    const dark = createAsset('light.tubeLamp', { intensity: 0 });
    const lights = (o: THREE.Object3D) => o.children.filter((c) => c instanceof THREE.PointLight).length;
    expect([lights(lit), lights(dark)]).toEqual([1, 0]);
    expect(new THREE.Box3().setFromObject(lit).max.y).toBeLessThanOrEqual(0.001);
  });

  it('the fan turns with the time it is given, the same for the same time', () => {
    const fan = createAsset('school.ceilingFan');
    const rotor = fan.children[fan.children.length - 1];
    const animate = fan.userData.animate as (t: number) => void;
    animate(0.25);
    const a = rotor.rotation.y;
    animate(0.5);
    expect(rotor.rotation.y).not.toBe(a);
    animate(0.25);
    expect(rotor.rotation.y).toBe(a);
    expect(createAsset('school.ceilingFan', { speed: 0 }).userData.animate).toBeUndefined();
  });

  it('the gate slides open along its rail', () => {
    const gate = createAsset('structure.gate', { width: 3 });
    const channels = gate.userData.channels as Record<string, { apply(v: number): void }>;
    const leaf = gate.children[gate.children.length - 1];
    channels.open.apply(1);
    expect(leaf.position.x).toBeCloseTo(2.9);
  });

  it('grass is one mesh of many tufts, and concrete tables come in three kinds', () => {
    const grass = createAsset('nature.grass', { width: 10, depth: 10, density: 4 });
    const tufts = meshes(grass)[0] as THREE.InstancedMesh;
    expect(tufts.count).toBe(400);
    for (const params of [{ shape: 'round', seats: 'stools' }, { shape: 'round', seats: 'benches' }, { shape: 'rect', seats: 'benches' }]) {
      const table = createAsset('school.concreteTable', params);
      expect(size(table).y).toBeGreaterThan(0.7);
      expect(size(table).x).toBeGreaterThan(1.4);
    }
  });

  it('a painted skyline stands in an arc around its origin', () => {
    const skyline = createAsset('backdrop.skyline', { radius: 100, count: 8 });
    expect(skyline.children).toHaveLength(8);
    for (const card of skyline.children) expect(Math.hypot(card.position.x, card.position.z)).toBeGreaterThan(90);
  });

  it('what is walked through or under does not block the way, and moving props are listed', () => {
    const built = buildLocation({
      id: 't', name: 't', ground: { color: '#fff', size: 40 },
      rooms: [{ id: 'r', name: 'r', origin: [0, 0], size: [10, 10], outdoor: true, floorColor: '#ccc', props: [
        { asset: 'structure.canopy', pos: [5, 5], params: { length: 8 } },
        { asset: 'nature.grass', pos: [5, 5] },
        { asset: 'school.ceilingFan', pos: [5, 5], y: 2.9 },
      ] }],
    });
    expect(built.colliders).toHaveLength(0);
    expect(built.animated).toHaveLength(1);
    const fenced = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 40 }, rooms: [], props: [{ asset: 'structure.fence', pos: [0, 0], params: { length: 6 } }] });
    expect(fenced.colliders).toHaveLength(1);
  });
});
