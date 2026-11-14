import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import './assets';
import { createAsset, listAssets } from './assets/registry';
import { buildLocation } from './world/build';
import type { Prop } from './world/types';

const size = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
const place = (props: Prop[]) => buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 80 }, rooms: [], props });
/** Whether a point on the ground is inside some collider. */
const blocked = (built: ReturnType<typeof place>, x: number, z: number) => built.colliders.some((c) => !c.disabled && x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ);

describe('ancient kit', () => {
  it('every asset builds with its defaults and stands on the ground', () => {
    const ids = listAssets().map((a) => a.id).filter((id) => id.startsWith('ancient.'));
    expect(ids.length).toBeGreaterThanOrEqual(27);
    for (const id of ids) {
      const box = new THREE.Box3().setFromObject(createAsset(id));
      expect(box.min.y, id).toBeGreaterThan(-0.25);
      expect(box.min.y, id).toBeLessThan(0.05);
    }
  });

  it('the city gate lets people through the arch but not through its towers', () => {
    const built = place([{ asset: 'ancient.cityGate', pos: [0, 0] }]);
    expect(blocked(built, 0, 0)).toBe(false);
    expect(blocked(built, 0, 1)).toBe(false);
    expect(blocked(built, 4, 0)).toBe(true);
    expect(blocked(built, -4, 0)).toBe(true);
  });

  it('the inside of the royal tent is free to walk, its walls are not', () => {
    const built = place([{ asset: 'ancient.royalTent', pos: [0, 0], params: { width: 7, depth: 6 } }]);
    expect(blocked(built, 0, 0)).toBe(false);
    expect(blocked(built, 1.5, -1.5)).toBe(false);
    expect(blocked(built, 0, -3)).toBe(true);
    expect(blocked(built, 3.5, 0)).toBe(true);
  });

  it('stream, pebbles and rug are walked on; rocks, tents and walls block', () => {
    expect(place([{ asset: 'ancient.stream', pos: [0, 0] }, { asset: 'ancient.pebbles', pos: [0, 5] }, { asset: 'ancient.rug', pos: [5, 5] }]).colliders).toHaveLength(0);
    expect(place([{ asset: 'ancient.boulder', pos: [0, 0] }, { asset: 'ancient.tent', pos: [10, 0] }, { asset: 'ancient.wall', pos: [20, 0] }]).colliders).toHaveLength(3);
  });

  it('fire, banners, the stream and the donkey move by themselves', () => {
    for (const id of ['ancient.campfire', 'ancient.banner', 'ancient.stream', 'ancient.hitchedDonkey', 'ancient.royalTent']) {
      expect(typeof createAsset(id).userData.animate, id).toBe('function');
    }
    expect(createAsset('ancient.campfire', { lit: 0 }).userData.animate).toBeUndefined();
    const fire = createAsset('ancient.campfire', { intensity: 3 });
    const light = (o: THREE.Object3D) => {
      let found: THREE.PointLight | undefined;
      o.traverse((c) => void (c instanceof THREE.PointLight && (found = c)));
      return found;
    };
    expect(light(createAsset('ancient.campfire'))).toBeUndefined();
    (fire.userData.animate as (t: number) => void)(1.3);
    expect(light(fire)!.intensity).toBeGreaterThan(2);
  });

  it('sizes follow the params', () => {
    expect(size(createAsset('ancient.wall', { length: 12 })).x).toBeCloseTo(12, 0);
    expect(size(createAsset('ancient.stream', { length: 20, width: 2 })).x).toBeGreaterThan(19.9);
    expect(size(createAsset('ancient.jar', { size: 1 })).y).toBeCloseTo(0.94, 1);
    expect(size(createAsset('ancient.palm', { height: 8, seed: 2 })).y).toBeGreaterThan(7);
    const chest = createAsset('ancient.chest');
    (chest.userData.channels as Record<string, { apply(v: number): void }>).open.apply(1);
    expect(size(chest).y).toBeGreaterThan(0.8);
  });
});
