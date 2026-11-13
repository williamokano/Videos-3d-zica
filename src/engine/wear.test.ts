import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildBody } from './character/body';
import { buildWear, listWearables } from './character/wear';

describe('what a character wears', () => {
  it('has a catalog, and an unknown piece is an error that names it', () => {
    expect(listWearables().map((w) => w.id)).toEqual(expect.arrayContaining(['cap', 'policeCap', 'helmet', 'vest', 'badge', 'longSleeves', 'dutyBelt', 'backpack', 'deliveryBag']));
    expect(() => buildWear(['capa'], { head: 0.15, wide: 1, shirt: '#fff' })).toThrow(/capa.*policeCap/);
  });

  it('fixes the pieces to the joints, so they move with the body', () => {
    const plain = buildBody({ id: 'a', name: 'A' });
    const dressed = buildBody({ id: 'b', name: 'B', wear: ['policeCap', { id: 'vest', color: '#123' }, 'dutyBelt', 'deliveryBag'] });
    const count = (o: THREE.Object3D): number => {
      let n = 0;
      o.traverse((c) => void (c instanceof THREE.Mesh && n++));
      return n;
    };
    expect(count(dressed.object)).toBeGreaterThan(count(plain.object) + 10);
    // The bag is on the back: behind the chest, and it turns with it.
    const chest = dressed.joint('chest')!;
    const box = new THREE.Box3().setFromObject(chest);
    expect(box.max.z).toBeGreaterThan(0.4);
    // The cap hides with the head, for a camera in the eyes.
    const head = dressed.joint('head')!.children[0];
    dressed.hideHead!(true);
    expect(head.visible).toBe(false);
    expect(head.children.length).toBeGreaterThan(plain.joint('head')!.children[0].children.length);
  });
});
