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

  it('a lyre stands on its box and is held by its lower corner', () => {
    const lyre = createAsset('arms.lyre');
    const box = new THREE.Box3().setFromObject(lyre);
    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.y).toBeGreaterThan(0.45);
    const grip = lyre.userData.grip as [number, number, number];
    expect(grip[1]).toBeLessThan(0.1);
    // It reaches away from the hand on the side away from the body (-x for the left hand).
    expect(box.min.x).toBeLessThan(grip[0] - 0.2);
    expect(box.max.x).toBeLessThan(grip[0] + 0.1);
    expect(createAsset('arms.lyre', { size: 1.5 }).userData.grip[1]).toBeCloseTo(grip[1] * 1.5);
  });

  it('a horn of oil tips round the hand and pours a stream', () => {
    const horn = buildProp({ id: 'chifre', asset: 'arms.oilHorn', pickable: true, pos: [0, 0] });
    const { pivot, stream } = horn.object.userData as { pivot: THREE.Object3D; stream: THREE.Mesh };
    const grip = new THREE.Vector3(...(horn.object.userData.grip as [number, number, number]));
    expect(pivot.position.distanceTo(grip)).toBeLessThan(1e-9);
    expect(horn.channels.pour).toBe(0);
    expect(stream.visible).toBe(false);
    horn.set('pour', 0.5);
    expect(stream.visible).toBe(false);
    horn.set('pour', 1);
    expect(pivot.rotation.x).toBeCloseTo((-2 * Math.PI) / 3);
    expect(stream.visible).toBe(true);
    // The stream starts at the mouth, now below and in front of the hand, and falls 0.6 m.
    expect(stream.position.y).toBeLessThan(grip.y);
    expect(stream.position.z).toBeLessThan(grip.z);
    const fall = new THREE.Box3().setFromObject(stream);
    expect(stream.position.y - fall.min.y).toBeCloseTo(0.6, 1);
    // It wobbles with the time.
    horn.tick!(1);
    const a = stream.rotation.z;
    horn.tick!(1.3);
    expect(stream.rotation.z).not.toBeCloseTo(a);
    horn.set('pour', 0);
    expect(stream.visible).toBe(false);
  });
});
