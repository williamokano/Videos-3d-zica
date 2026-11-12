import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import './assets';
import { createAsset, mat, rbox } from './assets/registry';
import { resolveStyle, type Style } from './bible';
import { buildBody } from './character/body';
import { applyStyle } from './style';

const cel = resolveStyle({ style: { look: 'cel' } });
const soft = resolveStyle({});

const outlines = (root: THREE.Object3D): THREE.Object3D[] => {
  const found: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.userData.outline) found.push(o);
  });
  return found;
};
const meshes = (root: THREE.Object3D): THREE.Mesh[] => {
  const found: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && !o.userData.outline) found.push(o);
  });
  return found;
};

describe('style of a series', () => {
  it('is soft unless the bible says otherwise, with defaults for the rest', () => {
    expect(soft).toEqual({ look: 'soft', outline: 0.01, bands: 3 });
    expect(cel).toEqual({ look: 'cel', outline: 0.01, bands: 3 });
    expect(resolveStyle({ style: { look: 'cel', outline: -1, bands: 40 } })).toEqual({ look: 'cel', outline: 0, bands: 8 });
  });
});

describe('applying a style', () => {
  const scene = (): { root: THREE.Group; round: THREE.Mesh; wall: THREE.Mesh; glass: THREE.Mesh; screen: THREE.Mesh; marked: THREE.Mesh } => {
    const root = new THREE.Group();
    const round = rbox(1, 1, 1, '#c0392b', [0, 0, 0]);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 0.2), mat('#dddddd'));
    const glass = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.35 }));
    const screen = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    const marked = new THREE.Mesh(new THREE.SphereGeometry(1), mat('#222222'));
    const holder = new THREE.Group();
    holder.userData.noOutline = true;
    holder.add(marked);
    root.add(round, wall, glass, screen, holder);
    return { root, round, wall, glass, screen, marked };
  };

  it('lights rounded things in bands, keeping color and transparency', () => {
    const { root, round, wall, glass, screen } = scene();
    const built = round.material as THREE.MeshStandardMaterial;
    applyStyle(root, cel);
    const now = round.material as THREE.MeshToonMaterial;
    expect(now).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(now.color.getHexString()).toBe(built.color.getHexString());
    // Three bands on the side that faces the light, and as many dark texels for the side that does not.
    expect((now.gradientMap?.image as { width: number }).width).toBe(6);
    expect((glass.material as THREE.MeshToonMaterial).transparent).toBe(true);
    expect((glass.material as THREE.MeshToonMaterial).opacity).toBe(0.35);
    // The shell of a location stays as built.
    expect(wall.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    // What is its own light stays as it is.
    expect(screen.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    // Two things of the same color still share one material.
    const other = rbox(1, 1, 1, '#c0392b', [0, 0, 0]);
    applyStyle(other, cel);
    expect(other.material).toBe(now);
  });

  it('outlines rounded things only, once', () => {
    const { root, round } = scene();
    applyStyle(root, cel);
    applyStyle(root, cel);
    const found = outlines(root);
    expect(found).toHaveLength(1);
    expect(found[0].parent).toBe(round);
    expect((found[0] as THREE.Mesh).geometry).toBe(round.geometry);
    expect(found[0].castShadow).toBe(false);
  });

  it('leaves only the bands with an outline of zero', () => {
    const { root, round } = scene();
    applyStyle(root, { ...cel, outline: 0 });
    expect(outlines(root)).toHaveLength(0);
    expect(round.material).toBeInstanceOf(THREE.MeshToonMaterial);
  });

  it('goes back to soft as built', () => {
    const { root } = scene();
    const before = meshes(root).map((m) => m.material);
    applyStyle(root, cel);
    applyStyle(root, soft);
    expect(meshes(root).map((m) => m.material)).toEqual(before);
    expect(outlines(root)).toHaveLength(0);
  });

  it('changes the number of bands on a scene already in cel', () => {
    const { root, round } = scene();
    applyStyle(root, cel);
    applyStyle(root, { ...cel, bands: 5 } satisfies Required<Style>);
    expect(((round.material as THREE.MeshToonMaterial).gradientMap?.image as { width: number }).width).toBe(10);
    expect(outlines(root)).toHaveLength(1);
  });

  it('outlines a character body and head, not the small parts of the face', () => {
    const rig = buildBody({ id: 'ana', name: 'Ana' });
    applyStyle(rig.object, cel);
    const parents = outlines(rig.object).map((o) => o.parent as THREE.Mesh);
    expect(parents.length).toBeGreaterThan(15);
    for (const parent of parents) {
      for (let o: THREE.Object3D | null = parent; o; o = o.parent) expect(o.userData.noOutline).toBeFalsy();
    }
    const faceParts = meshes(rig.object).filter((m) => {
      for (let o: THREE.Object3D | null = m; o; o = o.parent) if (o.userData.noOutline) return true;
      return false;
    });
    // Two eyes of seven parts each, two brows, the nose and five bands of mouth.
    expect(faceParts).toHaveLength(22);
    expect(faceParts.every((m) => !m.children.some((c) => c.userData.outline))).toBe(true);
  });

  it('keeps the screen of a phone readable: no bands, no outline on it', () => {
    const phone = createAsset('item.phone');
    applyStyle(phone, cel);
    const [body, screen] = meshes(phone);
    expect(body.children.some((c) => c.userData.outline)).toBe(true);
    expect(screen.children.some((c) => c.userData.outline)).toBe(false);
  });
});
