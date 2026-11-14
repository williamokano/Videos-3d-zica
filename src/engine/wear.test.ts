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

  it('has period pieces, and a piece can start hidden and be put on later', () => {
    expect(listWearables().map((w) => w.id)).toEqual(expect.arrayContaining(['tunic', 'robe', 'cloak', 'sash', 'sandals', 'headwrap', 'headband', 'scaleArmor', 'greaves', 'bronzeHelmet', 'plumedHelmet', 'crown', 'shepherdBag', 'scabbard', 'scabbardEmpty']));
    const body = buildBody({ id: 'd', name: 'D', wear: ['tunic', { id: 'scaleArmor', hidden: true }] });
    const armor = buildWear([{ id: 'scaleArmor' }], { head: 0.15, wide: 1, shirt: '#fff' });
    expect(armor.every((p) => p.id === 'scaleArmor')).toBe(true);
    const visibleMeshes = (): number => {
      let n = 0;
      body.object.traverseVisible((o) => void (o instanceof THREE.Mesh && n++));
      return n;
    };
    const hidden = visibleMeshes();
    body.showWear!('scaleArmor', true);
    expect(visibleMeshes()).toBeGreaterThan(hidden);
    body.showWear!('scaleArmor', false);
    expect(visibleMeshes()).toBe(hidden);
  });

  it('a skirt keeps clear of the legs: it opens over a step and lies on the lap when sitting', () => {
    const body = buildBody({ id: 'd', name: 'D', wear: ['tunic'] });
    const lowest = (): THREE.Vector3 => {
      // How far forward and down what hangs on the hips reaches (the joints of the legs have names; the cloth has none).
      body.object.updateMatrixWorld(true);
      const box = new THREE.Box3();
      body.joint('hips')!.children.filter((c) => c.name === '').forEach((c) => box.expandByObject(c));
      return box.min.clone();
    };
    body.applyPose({ joints: {}, lift: 0 });
    const standing = lowest();
    body.applyPose({ joints: { thighL: [90, 0, 0], thighR: [90, 0, 0], shinL: [-90, 0, 0], shinR: [-90, 0, 0] }, lift: -0.45 });
    const sitting = lowest();
    // Sitting, the cloth reaches forward over the thighs instead of hanging through them.
    expect(sitting.z).toBeLessThan(standing.z - 0.2);
  });
});
