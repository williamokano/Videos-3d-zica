import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type AssetParams = Record<string, number | string>;
export type AssetFactory = (params: AssetParams) => THREE.Object3D;

interface AssetEntry {
  id: string;
  description: string;
  create: AssetFactory;
}

const assets = new Map<string, AssetEntry>();

/** Register a reusable asset. Check `listAssets()` before creating a new one. */
export function registerAsset(id: string, description: string, create: AssetFactory): void {
  if (assets.has(id)) throw new Error(`Asset already registered: ${id}`);
  assets.set(id, { id, description, create });
}

export function createAsset(id: string, params: AssetParams = {}): THREE.Object3D {
  const entry = assets.get(id);
  if (!entry) throw new Error(`Unknown asset "${id}". Known: ${[...assets.keys()].join(', ')}`);
  const obj = entry.create(params);
  obj.name = id;
  return obj;
}

export function listAssets(): { id: string; description: string }[] {
  return [...assets.values()].map(({ id, description }) => ({ id, description }));
}

// ---- Building blocks shared by all assets (the "soft low poly" look) ----

const materials = new Map<string, THREE.MeshStandardMaterial>();

export function mat(color: string): THREE.MeshStandardMaterial {
  let m = materials.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
    materials.set(color, m);
  }
  return m;
}

/** Box with beveled edges, centered at (x, y, z). */
export function rbox(w: number, h: number, d: number, color: string, pos: [number, number, number], radius = 0.02): THREE.Mesh {
  const r = Math.min(radius, w / 2, h / 2, d / 2);
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat(color));
  mesh.position.set(...pos);
  return mesh;
}

/** Vertical cylinder standing on y0. */
export function post(radius: number, height: number, color: string, x: number, y0: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), mat(color));
  mesh.position.set(x, y0 + height / 2, z);
  return mesh;
}

export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  if (children.length) g.add(...children);
  return g;
}
