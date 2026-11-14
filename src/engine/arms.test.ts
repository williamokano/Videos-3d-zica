import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import './assets';
import { createAsset, listAssets } from './assets/registry';
import { buildProp } from './world/build';

describe('things held in the hand', () => {
  it('each says where a fist closes on it', () => {
    const arms = listAssets().filter((a) => a.id.startsWith('arms.'));
    expect(arms.map((a) => a.id)).toEqual(expect.arrayContaining(['arms.spear', 'arms.shield', 'arms.sword', 'arms.staff', 'arms.sling', 'arms.stone', 'arms.bow', 'arms.tambourine']));
    for (const { id } of arms) expect(createAsset(id).userData.grip, id).toHaveLength(3);
    // A longer spear is held higher up the shaft, and stands taller.
    const size = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    expect(size(createAsset('arms.spear', { length: 3.6 })).y).toBeGreaterThan(3.5);
    expect(size(createAsset('arms.shield', { kind: 'tower' })).y).toBeGreaterThan(size(createAsset('arms.shield')).y * 1.5);
  });

  it('is put with its grip in the hand that holds it', () => {
    const spear = buildProp({ id: 'lanca', asset: 'arms.spear', pickable: true, pos: [0, 0] });
    const hand = new THREE.Object3D();
    hand.position.set(1, 1.1, 2);
    hand.updateMatrixWorld();
    const holder = { object: new THREE.Object3D() } as Parameters<NonNullable<typeof spear.follow>>[2];
    spear.follow!(hand, 1, holder);
    const grip = new THREE.Vector3(...(spear.object.userData.grip as [number, number, number])).applyEuler(spear.object.rotation).add(spear.object.position);
    expect(grip.distanceTo(hand.position)).toBeLessThan(1e-6);
  });

  it('a sling turns round the hand and can carry a stone', () => {
    const sling = buildProp({ id: 'funda', asset: 'arms.sling', pickable: true, pos: [0, 0] });
    const pivot = sling.object.userData.pivot as THREE.Object3D;
    sling.set('spin', 0.25);
    expect(pivot.rotation.x).toBeCloseTo(Math.PI / 2);
    expect(sling.channels.loaded).toBe(0);
    sling.set('loaded', 1);
    expect(pivot.children.some((c) => c.visible && c instanceof THREE.Mesh && c.geometry instanceof THREE.SphereGeometry && c.position.y < -0.48)).toBe(true);
  });
});
