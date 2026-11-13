import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type AssetParams = Record<string, number | string>;
export type AssetFactory = (params: AssetParams) => THREE.Object3D;

interface AssetEntry {
  id: string;
  description: string;
  create: AssetFactory;
  kind: string;
}

/** Animatable parts of an asset: channel name → starting value and how to show a value. */
export type AssetChannels = Record<string, { value: number; apply(value: number): void }>;

/** Declare the channels of an asset instance, so actions can animate it when the prop has an id. */
export function setChannels<T extends THREE.Object3D>(obj: T, channels: AssetChannels): T {
  obj.userData.channels = channels;
  for (const c of Object.values(channels)) c.apply(c.value);
  return obj;
}

const assets = new Map<string, AssetEntry>();

/**
 * Register a reusable asset. Check `listAssets()` before creating a new one.
 * `kind` tells which actions fit the asset ("vehicle", or plain "prop").
 */
export function registerAsset(id: string, description: string, create: AssetFactory, kind = 'prop'): void {
  if (assets.has(id)) throw new Error(`Asset already registered: ${id}`);
  assets.set(id, { id, description, create, kind });
}

export function assetKind(id: string): string {
  return assets.get(id)?.kind ?? 'prop';
}

export function createAsset(id: string, params: AssetParams = {}): THREE.Object3D {
  const entry = assets.get(id);
  if (!entry) throw new Error(`Unknown asset "${id}". Known: ${[...assets.keys()].join(', ')}`);
  const obj = entry.create(params);
  obj.name = id;
  return obj;
}

export function listAssets(): { id: string; description: string; kind: string }[] {
  return [...assets.values()].map(({ id, description, kind }) => ({ id, description, kind }));
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

/**
 * A named place on an asset, which actions find: somewhere to sit (`sit`) or to put something (`putDown` with
 * `on`). `facing` turns whoever sits there from the way the asset faces, in degrees (a stool across a table).
 */
export function place(name: string, x: number, y: number, z: number, facing = 0): THREE.Object3D {
  const anchor = new THREE.Object3D();
  anchor.name = `seat.${name}`;
  anchor.position.set(x, y, z);
  anchor.rotation.y = THREE.MathUtils.degToRad(facing);
  return anchor;
}

/** The heading that looks from (x, z) to the origin of the asset: for seats around a table. */
export const facingCenter = (x: number, z: number): number => THREE.MathUtils.radToDeg(Math.atan2(x, z));

/**
 * A lamp that can be switched: `glow` are the parts seen lit, `light` what lights the scene (if any).
 * Returns the `on` channel. Off, the lit parts turn dark and the light goes out.
 */
export function switchable(glow: THREE.Mesh[], color: string, light?: THREE.PointLight): AssetChannels {
  const [lit, dark] = [new THREE.MeshBasicMaterial({ color }), mat(`#${new THREE.Color(color).multiplyScalar(0.3).getHexString()}`)];
  const intensity = light?.intensity ?? 0;
  return {
    on: {
      value: 1,
      apply(v) {
        for (const mesh of glow) mesh.material = v > 0.5 ? lit : dark;
        if (light) light.intensity = v > 0.5 ? intensity : 0;
      },
    },
  };
}

export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  if (children.length) g.add(...children);
  return g;
}
