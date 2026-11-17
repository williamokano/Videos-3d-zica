import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from '../registry';

/**
 * The common pieces of the ancient kit: colors, shapes and helpers that every part of it builds with. See
 * ../ancient.ts for the conventions of the kit.
 */
export const LINEN = '#e4d6b4';
const BROWN = '#8d6b4b';
const DARK_CLOTH = '#4d3d34';
export const WOOD = '#a47a52';
export const WOOD_DARK = '#6e4c33';
export const BRONZE = '#b8873a';
export const STONE = '#c4b394';
export const ROPE = '#cdb88a';
export const HOLE = '#2a211c';

/** Named cloth colors, or any color. "striped" is linen with brown stripes. */
const CLOTHS: Record<string, string> = { linen: LINEN, raw: LINEN, brown: BROWN, dark: DARK_CLOTH, striped: LINEN };
export const cloth = (name: unknown, fallback = 'linen'): string => CLOTHS[String(name ?? fallback)] ?? String(name ?? fallback);
export const shade = (color: string, f: number): string => `#${new THREE.Color(color).multiplyScalar(f).getHexString()}`;
export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function mesh(geometry: THREE.BufferGeometry, color: string, pos: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const m = new THREE.Mesh(geometry, mat(color));
  m.position.set(...pos);
  return m;
}

/** One geometry from many: they need not share attributes or indexing. */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return mergeGeometries(
    parts.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
      if (!n.attributes.normal) n.computeVertexNormals();
      return n;
    }),
  );
}

/** One mesh from many parts. Thin parts (ropes, twigs, stones on a wall) go without an outline. */
export function merged(parts: THREE.BufferGeometry[], color: string, outline = false): THREE.Mesh {
  const m = mesh(merge(parts), color);
  if (!outline) m.userData.noOutline = true;
  return m;
}

/** A round stick from a to b, radius r0 at a and r1 at b. */
export function rodGeo(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1 = r0, segments = 8): THREE.BufferGeometry {
  const d = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), segments);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d.normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}
export const rod = (a: THREE.Vector3, b: THREE.Vector3, r0: number, color: string, r1 = r0) => mesh(rodGeo(a, b, r0, r1), color);

/** A flat piece cut from a polygon of [x, y], `depth` thick, centered on z = 0. */
export function prismGeo(points: [number, number][], depth: number, bevel = 0.008): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 }).translate(0, 0, -depth / 2);
}
/** The same, standing across x: points are [z, y], centered on x = 0. */
export const sidePrismGeo = (points: [number, number][], depth: number) => prismGeo(points, depth).rotateY(-Math.PI / 2);

export const lathe = (profile: [number, number][], segments = 16) => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments);

/** An irregular lump: a ball pushed in and out at random, then squashed. Centered on the origin. */
export function lumpGeo(rand: () => number, radius: number, squash = 0.7, detail = 1): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(radius, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const bumps = Array.from({ length: 5 }, () => [v3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), (rand() - 0.5) * 0.6] as const);
  const at = new THREE.Vector3();
  const dir = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    at.fromBufferAttribute(p, i);
    dir.copy(at).normalize();
    let k = 0.9 + rand() * 0.18;
    for (const [b, s] of bumps) k += s * Math.max(0, dir.dot(b)) ** 2;
    at.multiplyScalar(k);
    p.setXYZ(i, at.x, at.y * squash, at.z);
  }
  g.computeVertexNormals();
  return g;
}

/** A rock standing on y = 0, sunk a little into the ground. */
export function rockGeo(rand: () => number, radius: number, squash = 0.7, detail = 1): THREE.BufferGeometry {
  const g = lumpGeo(rand, radius, squash, detail);
  g.computeBoundingBox();
  return g.translate(0, -g.boundingBox!.min.y - radius * squash * 0.18, 0);
}

export const STONES = ['#bfb197', '#b3a78f', '#a89c86', '#c9bca2', '#9d927e'];

/**
 * A cloth that moves in the wind: hanging from its top edge (a standard) or flying from the pole along its left
 * edge (a pennant, narrowing to a point). Colored in bands. Returns the mesh and what moves it with time.
 */
export function wavingCloth(width: number, height: number, color: string, trim: string, kind: 'hang' | 'pennant', phase: number): { mesh: THREE.Mesh; update(t: number): void } {
  const geo = new THREE.PlaneGeometry(width, height, 14, 10);
  const pos = geo.attributes.position;
  const colors: number[] = [];
  const [body, band] = [new THREE.Color(color), new THREE.Color(trim)];
  for (let i = 0; i < pos.count; i++) {
    const [x, y] = [pos.getX(i), pos.getY(i)];
    const u = x / width + 0.5;
    const w = y / height + 0.5;
    if (kind === 'hang') {
      pos.setXYZ(i, x, y - height / 2, 0);
      const c = w > 0.86 || w < 0.16 || Math.abs(w - 0.5) < 0.06 ? band : body;
      colors.push(c.r, c.g, c.b);
    } else {
      pos.setXYZ(i, u * width, (w - 0.5) * height * (1 - u * 0.9), 0);
      const c = Math.abs(w - 0.5) < 0.12 ? band : body;
      colors.push(c.r, c.g, c.b);
    }
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const rest = Float32Array.from(pos.array);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }));
  m.userData.noOutline = true;
  const update = (t: number) => {
    for (let i = 0; i < pos.count; i++) {
      const [x, y] = [rest[i * 3], rest[i * 3 + 1]];
      if (kind === 'hang') {
        const f = -y / height;
        pos.setZ(i, f * (0.07 * Math.sin(x * 3.2 + t * 2.4 + phase) + 0.05 * Math.sin(t * 1.3 + phase - y * 2)));
      } else {
        const u = x / width;
        pos.setY(i, y - 0.06 * u * u * width);
        pos.setZ(i, 0.11 * u * width * Math.sin(u * 6.5 - t * 5 + phase));
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  update(0);
  return { mesh: m, update };
}
