import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../core/rng';
import { group, loose, mat, place, post, rbox, registerAsset, setChannels } from './registry';

/*
 * The kit of the ancient world (Israel around 1000 BC): army camp, tents, the things of the baggage, the
 * dry hills and the stream of a valley, the stone houses and the gate of a town.
 *
 * Conventions:
 * - Things with a front (tent, royal tent, house, gate, chest) have it toward +z: whoever goes in or uses them
 *   walks toward -z. The cart and the donkey face -z, like the vehicles.
 * - Long things (wall, stream) run along x, centered on their origin.
 * - Everything stands on y = 0; rocks and roots sink a little, so they sit on ground that is not quite flat.
 */

const LINEN = '#e4d6b4';
const BROWN = '#8d6b4b';
const DARK_CLOTH = '#4d3d34';
const WOOD = '#a47a52';
const WOOD_DARK = '#6e4c33';
const BRONZE = '#b8873a';
const STONE = '#c4b394';
const ROPE = '#cdb88a';
const HOLE = '#2a211c';

/** Named cloth colors, or any color. "striped" is linen with brown stripes. */
const CLOTHS: Record<string, string> = { linen: LINEN, raw: LINEN, brown: BROWN, dark: DARK_CLOTH, striped: LINEN };
const cloth = (name: unknown, fallback = 'linen'): string => CLOTHS[String(name ?? fallback)] ?? String(name ?? fallback);
const shade = (color: string, f: number): string => `#${new THREE.Color(color).multiplyScalar(f).getHexString()}`;
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function mesh(geometry: THREE.BufferGeometry, color: string, pos: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const m = new THREE.Mesh(geometry, mat(color));
  m.position.set(...pos);
  return m;
}

/** One geometry from many: they need not share attributes or indexing. */
function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
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
function merged(parts: THREE.BufferGeometry[], color: string, outline = false): THREE.Mesh {
  const m = mesh(merge(parts), color);
  if (!outline) m.userData.noOutline = true;
  return m;
}

/** A round stick from a to b, radius r0 at a and r1 at b. */
function rodGeo(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1 = r0, segments = 8): THREE.BufferGeometry {
  const d = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), segments);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d.normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}
const rod = (a: THREE.Vector3, b: THREE.Vector3, r0: number, color: string, r1 = r0) => mesh(rodGeo(a, b, r0, r1), color);

/** A flat piece cut from a polygon of [x, y], `depth` thick, centered on z = 0. */
function prismGeo(points: [number, number][], depth: number, bevel = 0.008): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 }).translate(0, 0, -depth / 2);
}
/** The same, standing across x: points are [z, y], centered on x = 0. */
const sidePrismGeo = (points: [number, number][], depth: number) => prismGeo(points, depth).rotateY(-Math.PI / 2);

const lathe = (profile: [number, number][], segments = 16) => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments);

/** An irregular lump: a ball pushed in and out at random, then squashed. Centered on the origin. */
function lumpGeo(rand: () => number, radius: number, squash = 0.7, detail = 1): THREE.BufferGeometry {
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
function rockGeo(rand: () => number, radius: number, squash = 0.7, detail = 1): THREE.BufferGeometry {
  const g = lumpGeo(rand, radius, squash, detail);
  g.computeBoundingBox();
  return g.translate(0, -g.boundingBox!.min.y - radius * squash * 0.18, 0);
}

const STONES = ['#bfb197', '#b3a78f', '#a89c86', '#c9bca2', '#9d927e'];

/**
 * A cloth that moves in the wind: hanging from its top edge (a standard) or flying from the pole along its left
 * edge (a pennant, narrowing to a point). Colored in bands. Returns the mesh and what moves it with time.
 */
function wavingCloth(width: number, height: number, color: string, trim: string, kind: 'hang' | 'pennant', phase: number): { mesh: THREE.Mesh; update(t: number): void } {
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

// ---------------------------------------------------------------------------------------------------------
// Camp

/** A soldier's ridge tent: two sloping sides to the ground, closed at the back, the front flaps tied back. */
function ridgeTent(color: string, stripes: number, stripe: string): THREE.Group {
  const [w, d, h] = [2.4, 3, 1.75];
  const slope = Math.hypot(w / 2, h);
  const g = group();
  for (const s of [-1, 1]) {
    const side = rbox(slope + 0.06, 0.035, d, color, [(s * w) / 4, h / 2, 0], 0.012);
    side.rotation.z = Math.atan2(h, (-s * w) / 2);
    for (let i = 0; i < stripes; i++) side.add(rbox(0.1, 0.045, d + 0.004, stripe, [-slope / 2 + ((i + 1) * slope) / (stripes + 1), 0, 0], 0.008));
    g.add(side);
  }
  g.add(mesh(prismGeo([[-w / 2, 0], [w / 2, 0], [0, h]], 0.03), shade(color, 0.92), [0, 0, -d / 2 + 0.03]));
  // The front flaps, folded back over the sides as if tied there: the inside of the cloth shows.
  for (const s of [-1, 1]) {
    const flap = prismGeo([[0, h], [(s * w) / 2, 0], [s * 0.12, 0]], 0.02, 0.004).translate(0, 0, d / 2 + 0.01);
    const [ridge, corner] = [v3(0, h, d / 2), v3((s * w) / 2, 0, d / 2)];
    const axis = corner.clone().sub(ridge).normalize();
    const back = (a: number) => v3(s * 0.12, 0, d / 2).sub(ridge).applyAxisAngle(axis, a).z < 0;
    const angle = back(1.68) ? 1.68 : -1.68;
    flap.translate(-ridge.x, -ridge.y, -ridge.z).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, angle)).translate(ridge.x, ridge.y, ridge.z);
    g.add(mesh(flap, shade(color, 0.82)));
  }
  // Ridge pole on two uprights, guy ropes and pegs front and back, a mat and a bedroll inside.
  g.add(
    rod(v3(0, h + 0.03, -d / 2 - 0.12), v3(0, h + 0.03, d / 2 + 0.12), 0.035, WOOD_DARK),
    post(0.03, h + 0.12, WOOD_DARK, 0, 0, d / 2 + 0.06),
    post(0.03, h + 0.12, WOOD_DARK, 0, 0, -d / 2 - 0.02),
    rbox(w * 0.7, 0.02, d * 0.85, shade(color, 0.55), [0, 0.01, 0], 0.008),
    rod(v3(-0.45, 0.09, -0.9), v3(-0.45, 0.09, 0.2), 0.08, '#7d5a48'),
  );
  const ropes: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const peg = v3(0, 0.12, s * (d / 2 + 1));
    ropes.push(rodGeo(v3(0, h + 0.08, s * (d / 2 + 0.1)), peg, 0.008, 0.008, 4), rodGeo(v3(0, -0.05, peg.z), v3(0, 0.16, peg.z), 0.02, 0.02, 5));
  }
  g.add(merged(ropes, ROPE));
  return g;
}

/** A long goat-hair style tent: a sloping roof on poles, walls at the back and sides, and a front awning. */
function longTent(color: string, stripes: number, stripe: string): THREE.Group {
  const [w, d, hf, hb, awning] = [4.2, 3.2, 1.95, 1.4, 1];
  const [z0, z1] = [-d / 2, d / 2 + awning];
  const heightAt = (z: number) => hb + ((z - z0) / (z1 - z0)) * (hf - hb);
  const length = Math.hypot(z1 - z0, hf - hb);
  const roof = rbox(w + 0.2, 0.04, length + 0.1, color, [0, (hf + hb) / 2 + 0.03, (z0 + z1) / 2], 0.012);
  roof.rotation.x = -Math.atan2(hf - hb, z1 - z0);
  for (let i = 0; i < stripes; i++) roof.add(rbox(w + 0.204, 0.048, 0.16, stripe, [0, 0, -length / 2 + ((i + 1) * length) / (stripes + 1)], 0.008));
  const g = group(roof, rbox(w, hb, 0.04, shade(color, 0.92), [0, hb / 2, z0], 0.012));
  for (const s of [-1, 1]) {
    const wall = mesh(sidePrismGeo([[z0, 0], [d / 2, 0], [d / 2, heightAt(d / 2)], [z0, hb]], 0.04), shade(color, 0.92), [(s * w) / 2, 0, 0]);
    g.add(wall);
  }
  for (const x of [-w / 2, -w / 6, w / 6, w / 2]) g.add(post(0.035, hf + 0.08, WOOD_DARK, x, 0, z1));
  g.add(post(0.045, heightAt(0) + 0.06, WOOD_DARK, 0, 0, 0), rbox(w - 0.3, 0.02, d - 0.3, shade(color, 0.6), [0, 0.01, 0], 0.008));
  const ropes: THREE.BufferGeometry[] = [];
  for (const x of [-w / 2, w / 2]) {
    const peg = v3(x * 1.25, 0.12, z1 + 0.9);
    ropes.push(rodGeo(v3(x, hf + 0.04, z1), peg, 0.008, 0.008, 4), rodGeo(v3(peg.x, -0.05, peg.z), v3(peg.x, 0.16, peg.z), 0.02, 0.02, 5));
  }
  g.add(merged(ropes, ROPE));
  return g;
}

registerAsset(
  'ancient.tent',
  'Tenda de soldado. `style`: "ridge" (duas abas até o chão, 2,4 × 3 m, 1,75 m de altura) ou "long" (tenda comprida de teto inclinado sobre varas, com toldo na frente, 4,2 × 4,2 m). Fechada atrás, aberta na frente (+z), com abas presas para trás, cordas e estacas (params: style, color — "linen", "brown", "dark", "striped" ou uma cor —, stripes — número de listras —, stripe — cor das listras —, size — escala, 1 = normal)',
  (p) => {
    const name = String(p.color ?? 'linen');
    const color = cloth(name);
    const stripes = Math.round(Number(p.stripes ?? (name === 'striped' ? 3 : 0)));
    const stripe = String(p.stripe ?? (name === 'dark' ? LINEN : '#8a4b35'));
    const tent = String(p.style ?? 'ridge') === 'long' ? longTent(color, stripes, stripe) : ridgeTent(color, stripes, stripe);
    tent.scale.setScalar(Number(p.size ?? 1));
    return group(tent);
  },
);

registerAsset(
  'ancient.royalTent',
  'Tenda do rei, um pavilhão: paredes de pano atrás e dos lados, teto de duas águas, sem parede na frente (+z), com sanefa de franjas, cortinas presas nos cantos da frente e um galhardete no alto que tremula. Por dentro só se vê pano: monte o interior com tapete, almofadas, baú e mesa. Não bloqueia a passagem (params: width, depth, height — da cumeeira —, color, trim — cor da sanefa e das faixas)',
  (p) => {
    const w = Number(p.width ?? 7);
    const d = Number(p.depth ?? 6);
    const h = Number(p.height ?? 3.6);
    const color = cloth(p.color ?? '#efe5cc');
    const trim = String(p.trim ?? '#8e2f36');
    const gold = '#d6a640';
    const wallH = h * 0.66;
    const g = group();
    // Back and sides, a band of trim near the top of each.
    g.add(rbox(w, wallH, 0.05, color, [0, wallH / 2, -d / 2], 0.015), rbox(w + 0.01, 0.22, 0.07, trim, [0, wallH - 0.25, -d / 2], 0.01));
    for (const s of [-1, 1]) {
      g.add(
        mesh(sidePrismGeo([[-d / 2, 0], [d / 2, 0], [d / 2, wallH], [0, h], [-d / 2, wallH]], 0.05), color, [(s * w) / 2, 0, 0]),
        rbox(0.07, 0.22, d, trim, [(s * w) / 2, wallH - 0.25, 0], 0.01),
      );
    }
    // Two roof slopes meeting at the ridge, along x, a little past the walls.
    const run = Math.hypot(d / 2 + 0.25, h - wallH + 0.13);
    for (const s of [-1, 1]) {
      const roof = rbox(w + 0.4, 0.05, run, color, [0, (wallH + h) / 2 - 0.06, (s * (d / 2 + 0.25)) / 2], 0.015);
      roof.rotation.x = s * Math.atan2(h - wallH + 0.13, d / 2 + 0.25);
      roof.add(rbox(w + 0.404, 0.056, 0.24, trim, [0, 0, s * (run / 2 - 0.4)], 0.01));
      g.add(roof);
    }
    g.add(rod(v3(-w / 2 - 0.25, h + 0.02, 0), v3(w / 2 + 0.25, h + 0.02, 0), 0.05, WOOD_DARK));
    // The valance: a hanging band with pointed tabs along the front and back eaves, in two colors.
    const eave = wallH - 0.13;
    const tabs: [THREE.BufferGeometry[], THREE.BufferGeometry[]] = [[], []];
    const n = Math.round((w + 0.4) / 0.35);
    for (const s of [-1, 1]) {
      g.add(rbox(w + 0.4, 0.2, 0.03, trim, [0, eave - 0.08, s * (d / 2 + 0.25)], 0.008));
      for (let i = 0; i < n; i++) {
        const x = -(w + 0.4) / 2 + ((i + 0.5) / n) * (w + 0.4);
        tabs[i % 2].push(prismGeo([[x - 0.16, 0], [x + 0.16, 0], [x, -0.22]], 0.02, 0).translate(0, eave - 0.17, s * (d / 2 + 0.25)));
      }
    }
    g.add(merged(tabs[0], gold, true), merged(tabs[1], trim, true));
    // Poles at the corners and on each side of the doorway, with gilded tops; the curtains tied at the front corners.
    for (const x of [-w / 2, -w / 4.5, w / 4.5, w / 2]) g.add(post(0.06, eave, WOOD_DARK, x, 0, d / 2 + 0.2), post(0.08, 0.1, gold, x, eave - 0.02, d / 2 + 0.2));
    for (const x of [-w / 2, w / 2]) g.add(post(0.06, wallH, WOOD_DARK, x, 0, -d / 2 + 0.05));
    for (const s of [-1, 1]) {
      const curtain = mesh(lathe([[0.02, 0], [0.32, 0], [0.22, 0.6], [0.07, 1.15], [0.1, 1.3], [0.32, eave - 0.2], [0.42, eave - 0.05], [0.02, eave - 0.05]], 14), shade(color, 0.9), [s * (w / 2 - 0.4), 0, d / 2 + 0.1]);
      curtain.scale.z = 0.3;
      g.add(curtain, mesh(new THREE.TorusGeometry(0.085, 0.025, 6, 14).rotateX(Math.PI / 2), trim, [s * (w / 2 - 0.4), 1.16, d / 2 + 0.1]));
    }
    // A pole on top of the ridge, with a pennant in the wind.
    const flag = wavingCloth(1.1, 0.42, trim, gold, 'pennant', 0.7);
    flag.mesh.position.set(0.03, h + 1.25, 0);
    g.add(post(0.035, 1.5, WOOD_DARK, 0, h, 0), mesh(new THREE.SphereGeometry(0.07, 12, 8), gold, [0, h + 1.52, 0]), flag.mesh);
    g.userData.animate = (t: number) => flag.update(t);
    // Walked into: each wall and pole blocks on its own, the inside (a room of the location) is free.
    g.userData.solidParts = true;
    return g;
  },
);

const BURLAP = ['#cdb588', '#d6c196', '#bfa476', '#c8ad80'];
const SACK: [number, number][] = [[0, 0], [0.17, 0.005], [0.225, 0.05], [0.245, 0.18], [0.235, 0.33], [0.19, 0.45], [0.11, 0.53], [0.05, 0.58], [0.045, 0.6], [0.075, 0.64], [0.06, 0.68], [0.02, 0.7], [0.001, 0.7]];
/** A grain sack, 0.7 m tall, tied at the neck. Lying, it points to -z and is flatter. */
function sackGeo(lying: boolean): THREE.BufferGeometry {
  const g = lathe(SACK, 14).scale(1, 1, 0.82);
  if (!lying) return g;
  return g.rotateX(-Math.PI / 2).scale(1, 0.85, 1).translate(0, 0.17, 0.35);
}

registerAsset(
  'ancient.sack',
  'Saco de grão de pano grosso, amarrado na boca (70 cm em pé). Com `count` maior que 1 vira uma pilha de sacos deitados, como a carga do acampamento (params: count, arrange — "pile" deitados em pirâmide ou "standing" em pé lado a lado —, seed)',
  (p) => {
    const count = Math.max(1, Math.round(Number(p.count ?? 1)));
    const rand = rng(Number(p.seed ?? 1));
    const g = group();
    const sack = (lying: boolean, x: number, y: number, z: number, yaw: number) => {
      const m = mesh(sackGeo(lying), BURLAP[Math.floor(rand() * BURLAP.length)], [x, y, z]);
      m.rotation.y = yaw;
      g.add(m);
    };
    if (count === 1) {
      sack(false, 0, 0, 0, rand() * 6);
      return loose(g);
    }
    if (String(p.arrange ?? 'pile') === 'standing') {
      const perRow = Math.ceil(Math.sqrt(count));
      for (let i = 0; i < count; i++) sack(false, ((i % perRow) - (perRow - 1) / 2) * 0.46 + (rand() - 0.5) * 0.06, 0, (Math.floor(i / perRow) - (Math.ceil(count / perRow) - 1) / 2) * 0.42, rand() * 6);
      return g;
    }
    let base = 1;
    while ((base * (base + 1)) / 2 < count) base++;
    let left = count;
    for (let layer = 0; left > 0; layer++) {
      const inLayer = Math.min(left, base - layer);
      for (let i = 0; i < inLayer; i++) sack(true, (i - (inLayer - 1) / 2) * 0.46, layer * 0.3, (rand() - 0.5) * 0.12, (rand() - 0.5) * 0.25 + (rand() < 0.5 ? Math.PI : 0));
      left -= inLayer;
    }
    return g;
  },
);

const CLAYS = ['#b9663f', '#c47a4a', '#a85a38', '#cf8a5a'];
const JARS: Record<string, [number, number][]> = {
  // A tall storage jar with a collar at the neck, for grain, oil or water (height 1).
  storage: [[0.001, 0], [0.1, 0], [0.18, 0.07], [0.28, 0.33], [0.3, 0.5], [0.26, 0.68], [0.15, 0.8], [0.11, 0.83], [0.12, 0.87], [0.13, 0.93], [0.1, 0.94], [0.09, 0.88], [0.001, 0.88]],
  // A pitcher with one handle.
  pitcher: [[0.001, 0], [0.12, 0], [0.15, 0.05], [0.2, 0.25], [0.19, 0.42], [0.12, 0.58], [0.09, 0.67], [0.12, 0.78], [0.13, 0.82], [0.1, 0.82], [0.08, 0.72], [0.001, 0.72]],
};
/** A clay jar `height` tall, its mouth dark inside. */
function jar(shape: string, height: number, color: string): THREE.Group {
  const profile = JARS[shape] ?? JARS.storage;
  const g = group(mesh(lathe(profile, 18), color));
  const mouth = profile[profile.length - 2];
  g.add(mesh(new THREE.CircleGeometry(mouth[0] + 0.005, 16).rotateX(-Math.PI / 2), HOLE, [0, mouth[1] + 0.006, 0]));
  if (shape === 'pitcher') {
    g.add(mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12, Math.PI * 1.2).rotateZ(-Math.PI * 0.55), color, [0.17, 0.6, 0]));
  } else {
    for (const s of [-1, 1]) {
      const handle = mesh(new THREE.TorusGeometry(0.05, 0.018, 6, 10, Math.PI), color, [s * 0.27, 0.6, 0]);
      handle.rotation.set(0, Math.PI / 2, s * -Math.PI / 2);
      g.add(handle);
    }
  }
  g.scale.setScalar(height);
  return g;
}

registerAsset(
  'ancient.jar',
  'Jarro de barro. `shape`: "storage" (talha alta de gargalo com colar e duas alças, para grão, azeite ou água) ou "pitcher" (jarra de uma alça). Com `count` maior que 1, um grupo de jarros de alturas diferentes (params: shape, size — altura em metros, 0,75 a talha e 0,3 a jarra —, count, color, seed)',
  (p) => {
    const shape = String(p.shape ?? 'storage');
    const size = Number(p.size ?? (shape === 'pitcher' ? 0.3 : 0.75));
    const count = Math.max(1, Math.round(Number(p.count ?? 1)));
    const rand = rng(Number(p.seed ?? 1));
    const g = group();
    for (let i = 0; i < count; i++) {
      const a = i * 2.4;
      const r = i === 0 ? 0 : size * (0.55 + 0.12 * Math.sqrt(i));
      const one = jar(shape, size * (i === 0 ? 1 : 0.8 + rand() * 0.25), p.color ? String(p.color) : CLAYS[Math.floor(rand() * CLAYS.length)]);
      one.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      one.rotation.y = rand() * 6;
      g.add(one);
    }
    return count === 1 ? loose(g) : g;
  },
);

registerAsset(
  'ancient.basket',
  'Cesto de vime redondo e baixo (50 cm), com pães redondos dentro (params: bread — quantos pães, 0 para vazio —, size — escala —, color)',
  (p) => {
    const color = String(p.color ?? '#c9a464');
    const bread = Math.max(0, Math.round(Number(p.bread ?? 4)));
    const g = group(
      mesh(lathe([[0.001, 0], [0.17, 0], [0.21, 0.03], [0.25, 0.2], [0.265, 0.235], [0.245, 0.235], [0.235, 0.205], [0.195, 0.05], [0.001, 0.05]], 20), color),
      mesh(new THREE.TorusGeometry(0.255, 0.014, 6, 24).rotateX(Math.PI / 2), shade(color, 0.75), [0, 0.225, 0]),
      mesh(new THREE.TorusGeometry(0.235, 0.01, 6, 24).rotateX(Math.PI / 2), shade(color, 0.75), [0, 0.12, 0]),
    );
    const rand = rng(Number(p.seed ?? 3));
    for (let i = 0; i < bread; i++) {
      const a = i * 2.4 + rand();
      const r = i === 0 ? 0 : Math.min(0.13, 0.08 + 0.02 * i);
      const loaf = mesh(new THREE.SphereGeometry(0.085, 14, 8).scale(1, 0.42, 1), i % 3 === 2 ? '#b97a3e' : '#c88d4a', [Math.cos(a) * r, 0.19 + (i === 0 ? 0.035 : 0) + Math.floor(i / 5) * 0.035, Math.sin(a) * r]);
      loaf.rotation.set((rand() - 0.5) * 0.4, 0, (rand() - 0.5) * 0.4);
      g.add(loaf);
    }
    g.scale.setScalar(Number(p.size ?? 1));
    return loose(group(g));
  },
);

registerAsset(
  'ancient.cheese',
  'Queijos: uma trouxinha de pano amarrada no alto, do tamanho de levar no braço, ou (`wrapped: 0`) o pano aberto com os queijos redondos empilhados (params: count — queijos, 10 —, wrapped, color — do pano)',
  (p) => {
    const count = Math.max(1, Math.round(Number(p.count ?? 10)));
    const color = cloth(p.color ?? '#e9dcc0');
    const cheese = '#eedd9c';
    if (Number(p.wrapped ?? 1) > 0) {
      const k = Math.cbrt(count / 10);
      const g = group(
        mesh(lathe([[0.001, 0], [0.13, 0.005], [0.17, 0.04], [0.18, 0.09], [0.15, 0.14], [0.08, 0.17], [0.035, 0.185], [0.03, 0.2], [0.001, 0.2]], 16).scale(1, 1, 0.85), color),
        mesh(new THREE.TorusGeometry(0.034, 0.008, 5, 10).rotateX(Math.PI / 2), '#8a5a3a', [0, 0.19, 0]),
      );
      // The two knotted corners of the cloth.
      for (const s of [-1, 1]) {
        const ear = mesh(new THREE.ConeGeometry(0.03, 0.09, 6), color, [s * 0.035, 0.225, 0]);
        ear.rotation.z = -s * 0.7;
        g.add(ear);
      }
      g.scale.setScalar(k);
      return loose(group(g));
    }
    const g = group(rbox(0.5, 0.01, 0.5, color, [0, 0.005, 0], 0.004));
    g.children[0].rotation.y = 0.4;
    const columns = Math.ceil(count / 4);
    for (let i = 0; i < count; i++) {
      const c = i % columns;
      const a = (c / columns) * Math.PI * 2;
      const r = columns > 1 ? 0.11 : 0;
      g.add(mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.05, 16), cheese, [Math.cos(a) * r, 0.035 + Math.floor(i / columns) * 0.052, Math.sin(a) * r]));
    }
    return g;
  },
);

registerAsset(
  'ancient.cart',
  'Carroça de duas rodas de madeira, de boi, de frente para -z: a lança desce até o chão com a canga na ponta. Com `load`, sacos deitados na caixa (params: load — quantos sacos, 0 a 6 —, color)',
  (p) => {
    const wood = String(p.color ?? WOOD);
    const dark = shade(wood, 0.66);
    const [bw, bl, by] = [1.2, 1.8, 0.72];
    const g = group(rbox(bw, 0.07, bl, wood, [0, by, 0.1], 0.015));
    // Side and back rails on stakes.
    for (const s of [-1, 1]) {
      g.add(rbox(0.05, 0.08, bl, dark, [(s * bw) / 2, by + 0.32, 0.1], 0.012), rbox(0.04, 0.24, bl, wood, [(s * bw) / 2, by + 0.14, 0.1], 0.01));
      for (const z of [-0.7, -0.1, 0.5, 0.95]) g.add(rbox(0.05, 0.38, 0.05, dark, [(s * bw) / 2, by + 0.16, z], 0.01));
    }
    g.add(rbox(bw, 0.22, 0.04, wood, [0, by + 0.14, 0.1 + bl / 2], 0.01));
    // Axle and two spoked wheels.
    const radius = 0.55;
    g.add(rod(v3(-bw / 2 - 0.2, radius, 0.15), v3(bw / 2 + 0.2, radius, 0.15), 0.045, dark));
    for (const s of [-1, 1]) {
      const wheel = group(
        mesh(new THREE.TorusGeometry(radius - 0.04, 0.045, 8, 28), dark),
        mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 12).rotateX(Math.PI / 2), wood),
      );
      const spokes: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        spokes.push(rodGeo(v3(0, 0, 0), v3(Math.cos(a) * (radius - 0.05), Math.sin(a) * (radius - 0.05), 0), 0.025, 0.02, 6));
      }
      wheel.add(merged(spokes, wood, true));
      wheel.position.set(s * (bw / 2 + 0.12), radius, 0.15);
      wheel.rotation.y = Math.PI / 2;
      g.add(wheel);
    }
    // The pole goes forward and down to the ground; the yoke lies across its tip.
    const tip = v3(0, 0.1, -2.6);
    g.add(rod(v3(0, by - 0.05, 0.6), v3(0, by - 0.05, -0.75), 0.05, dark), rod(v3(0, by - 0.05, -0.75), tip, 0.05, dark, 0.04));
    g.add(rod(v3(-0.75, 0.07, tip.z - 0.05), v3(0.75, 0.07, tip.z - 0.05), 0.055, wood));
    const load = Math.max(0, Math.min(6, Math.round(Number(p.load ?? 3))));
    const rand = rng(5);
    for (let i = 0; i < load; i++) {
      const [row, col] = [Math.floor(i / 2), i % 2];
      const m = mesh(sackGeo(true), BURLAP[i % BURLAP.length], [(col - 0.5) * 0.48, by + 0.03 + (row === 2 ? 0.28 : 0), (row === 2 ? 0.1 : row * 0.75 - 0.35) - 0.3]);
      m.rotation.y = (rand() - 0.5) * 0.3;
      g.add(m);
    }
    return g;
  },
);

registerAsset(
  'ancient.campfire',
  'Fogueira: roda de pedras, lenha em pirâmide, brasas e chamas que tremem sozinhas com o tempo. `pot: 1` põe um tripé com uma panela de barro pendurada sobre o fogo. Com `intensity` maior que 0 ilumina de verdade, tremendo (use em poucas, à noite) (params: size — escala —, lit — 0 para só cinzas e lenha —, pot, intensity, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const lit = Number(p.lit ?? 1) > 0;
    const intensity = Number(p.intensity ?? 0);
    const fire = group();
    const stones: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + rand() * 0.2;
      stones.push(rockGeo(rand, 0.09 + rand() * 0.04, 0.7, 0).rotateY(rand() * 6).translate(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45));
    }
    fire.add(merged(stones, '#8f877c', true), mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.03, 20), '#4a4440', [0, 0.015, 0]));
    const logs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rand() * 0.3;
      logs.push(rodGeo(v3(Math.cos(a) * 0.32, 0.03, Math.sin(a) * 0.32), v3(Math.cos(a) * 0.04, lit ? 0.36 : 0.12, Math.sin(a) * 0.04), 0.04, 0.03, 7));
    }
    fire.add(merged(logs, '#5e4130', true));
    const flames: THREE.Mesh[] = [];
    if (lit) {
      const glow = (color: string) => new THREE.MeshBasicMaterial({ color });
      const embers = new THREE.Mesh(merge([0, 1, 2, 3, 4].map(() => new THREE.IcosahedronGeometry(0.06 + rand() * 0.03, 0).translate((rand() - 0.5) * 0.3, 0.04, (rand() - 0.5) * 0.3))), glow('#ff6a1f'));
      fire.add(embers);
      for (const [r, h, color, x, z] of [[0.18, 0.8, '#ff7b22', 0, 0], [0.12, 0.58, '#ff9f2e', 0.09, 0.05], [0.12, 0.52, '#ff9f2e', -0.08, -0.06], [0.1, 0.45, '#ffd45e', 0, 0.01]] as const) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7).translate(0, h / 2, 0), glow(color));
        f.position.set(x, 0.05, z);
        flames.push(f);
      }
      for (const m of [embers, ...flames]) m.userData.noShadow = true;
      fire.add(...flames);
    }
    if (Number(p.pot ?? 0) > 0) {
      const top = v3(0, 1.05, 0);
      const legs = [0, 1, 2].map((i) => rodGeo(v3(Math.cos((i / 3) * Math.PI * 2 + 0.5) * 0.62, -0.02, Math.sin((i / 3) * Math.PI * 2 + 0.5) * 0.62), top, 0.025, 0.02, 6));
      legs.push(rodGeo(top, v3(0, 0.62, 0), 0.006, 0.006, 4));
      fire.add(merged(legs, WOOD_DARK, true), mesh(lathe([[0.001, 0], [0.1, 0.01], [0.16, 0.08], [0.15, 0.18], [0.11, 0.24], [0.12, 0.27], [0.09, 0.27], [0.001, 0.25]], 16), '#5a4a42', [0, 0.36, 0]));
    }
    const light = intensity > 0 && lit ? new THREE.PointLight('#ffa257', intensity, 9, 1.6) : undefined;
    if (light) {
      light.position.set(0, 0.6, 0);
      fire.add(light);
    }
    fire.scale.setScalar(Number(p.size ?? 1));
    const g = group(fire);
    if (lit) {
      const phases = flames.map(() => rand() * 10);
      g.userData.animate = (t: number) => {
        flames.forEach((f, i) => {
          const k = 1 + 0.2 * Math.sin(t * 9 + phases[i]) + 0.1 * Math.sin(t * 15.7 + phases[i] * 2);
          f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
          f.rotation.set(0.12 * Math.sin(t * 5.3 + phases[i]), t * 0.7 + phases[i], 0.12 * Math.sin(t * 6.1 + phases[i]));
        });
        if (light) light.intensity = intensity * (0.85 + 0.1 * Math.sin(t * 11) + 0.05 * Math.sin(t * 23.3));
      };
    }
    return g;
  },
);

registerAsset(
  'ancient.banner',
  'Estandarte: vara alta fincada num monte de pedras, com um pano que tremula sozinho. `shape`: "hang" (pano pendurado de uma travessa, 0,8 × 1,1 m) ou "pennant" (flâmula comprida voando da vara) (params: height — da vara —, color, trim — cor das faixas —, shape, seed)',
  (p) => {
    const height = Number(p.height ?? 3.4);
    const color = String(p.color ?? '#3f5f9e');
    const trim = String(p.trim ?? '#e8d9a8');
    const rand = rng(Number(p.seed ?? 1));
    const shape = String(p.shape ?? 'hang') === 'pennant' ? 'pennant' : 'hang';
    const stones: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      stones.push(rockGeo(rand, 0.12 + rand() * 0.05, 0.75, 0).translate(Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18));
    }
    const g = group(merged(stones, '#a39a8c', true), post(0.035, height, WOOD_DARK, 0, -0.1, 0), mesh(new THREE.ConeGeometry(0.05, 0.18, 8), BRONZE, [0, height + 0.0, 0]));
    const cloth = shape === 'hang' ? wavingCloth(0.8, 1.1, color, trim, 'hang', rand() * 6) : wavingCloth(1.6, 0.6, color, trim, 'pennant', rand() * 6);
    if (shape === 'hang') {
      g.add(rod(v3(-0.48, height - 0.15, 0), v3(0.48, height - 0.15, 0), 0.022, WOOD_DARK));
      cloth.mesh.position.set(0, height - 0.17, 0.035);
    } else cloth.mesh.position.set(0.03, height - 0.45, 0);
    g.add(cloth.mesh);
    g.userData.animate = (t: number) => cloth.update(t);
    return g;
  },
);

/** A spear lying along a direction from its butt: shaft and leaf-shaped head, as geometry to merge. */
function spearGeo(base: THREE.Vector3, dir: THREE.Vector3, length: number): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const neck = base.clone().addScaledVector(dir, length - 0.3);
  const head = new THREE.ConeGeometry(0.04, 0.3, 4).scale(1, 1, 0.35).translate(0, 0.15, 0);
  head.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), dir)).translate(neck.x, neck.y, neck.z);
  return [rodGeo(base, neck, 0.018, 0.016, 6), head];
}

registerAsset(
  'ancient.spearRack',
  'Suporte de lanças: travessa sobre dois cavaletes em X, com lanças encostadas dos dois lados, ao longo de x (params: count — lanças —, color — da madeira)',
  (p) => {
    const count = Math.max(1, Math.round(Number(p.count ?? 6)));
    const wood = String(p.color ?? WOOD);
    const length = count * 0.22 + 0.5;
    const bar = 1.25;
    const frame: THREE.BufferGeometry[] = [rodGeo(v3(-length / 2 - 0.1, bar, 0), v3(length / 2 + 0.1, bar, 0), 0.035)];
    for (const x of [-length / 2, length / 2]) frame.push(rodGeo(v3(x, 0, -0.45), v3(x, bar + 0.2, 0.15), 0.035), rodGeo(v3(x, 0, 0.45), v3(x, bar + 0.2, -0.15), 0.035));
    const [shafts, heads]: THREE.BufferGeometry[][] = [[], []];
    const rand = rng(Number(p.seed ?? 2));
    for (let i = 0; i < count; i++) {
      const x = -length / 2 + 0.25 + i * ((length - 0.5) / Math.max(1, count - 1));
      const s = i % 2 ? 1 : -1;
      const base = v3(x + (rand() - 0.5) * 0.08, 0, s * 0.55);
      const dir = v3(x + (rand() - 0.5) * 0.15, bar + 0.035, s * 0.04).sub(base).normalize();
      const [shaft, head] = spearGeo(base, dir, 2.4 + rand() * 0.2);
      shafts.push(shaft);
      heads.push(head);
    }
    return group(merged(frame, shade(wood, 0.75), true), merged(shafts, wood, true), merged(heads, '#9a8f7c', true));
  },
);

/** A round shield facing +z, its center at the origin. */
function shield(radius: number, color: string, rim: string): THREE.Group {
  return group(
    mesh(new THREE.CylinderGeometry(radius, radius, 0.035, 28).rotateX(Math.PI / 2), color),
    mesh(new THREE.TorusGeometry(radius, 0.022, 6, 32), rim),
    mesh(new THREE.TorusGeometry(radius * 0.6, 0.01, 5, 28), shade(color, 0.7), [0, 0, 0.018]),
    mesh(new THREE.SphereGeometry(radius * 0.22, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), rim, [0, 0, 0.016]),
  );
}

registerAsset(
  'ancient.groundShields',
  'Escudos redondos de couro com borda e umbo de bronze, no chão (não na mão). `arrange`: "mixed" (dois apoiados um no outro e o resto empilhado), "stack" (pilha) ou "lean" (fileira inclinada para trás, para encostar em tenda, suporte ou pedra) (params: count, arrange, color, rim, seed)',
  (p) => {
    const count = Math.max(1, Math.round(Number(p.count ?? 4)));
    const arrange = String(p.arrange ?? 'mixed');
    const color = String(p.color ?? '#8a5a32');
    const rim = String(p.rim ?? BRONZE);
    const rand = rng(Number(p.seed ?? 1));
    const r = 0.36;
    const g = group();
    const standing = (x: number, z: number, lean: number, yaw: number) => {
      const pivot = new THREE.Group();
      const s = shield(r, color, rim);
      s.position.y = r + 0.02;
      pivot.add(s);
      pivot.position.set(x, 0, z);
      pivot.rotation.set(lean, yaw, 0);
      g.add(pivot);
    };
    const stack = (n: number, x: number, z: number) => {
      for (let i = 0; i < n; i++) {
        const s = shield(r, color, rim);
        s.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.08, 0, rand() * 6);
        s.position.set(x + (rand() - 0.5) * 0.12, 0.04 + i * 0.1, z + (rand() - 0.5) * 0.12);
        g.add(s);
      }
    };
    if (arrange === 'lean') for (let i = 0; i < count; i++) standing((i - (count - 1) / 2) * 0.62, 0, -0.32, (rand() - 0.5) * 0.2);
    else if (arrange === 'stack' || count < 3) stack(count, 0, 0);
    else {
      standing(-0.5, 0.2, -0.45, 0);
      standing(-0.5, -0.4, 0.45, Math.PI);
      stack(count - 2, 0.45, 0);
    }
    return g;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Inside the king's tent

registerAsset(
  'ancient.rug',
  'Tapete tecido, com barra de outra cor, losangos no meio e franjas nas pontas (ao longo de z); pisa-se nele (params: width, depth, color, trim, seed)',
  (p) => {
    const [w, d] = [Number(p.width ?? 2), Number(p.depth ?? 3)];
    const color = String(p.color ?? '#9c3b2e');
    const trim = String(p.trim ?? '#d8b45a');
    const rand = rng(Number(p.seed ?? 1));
    const g = group(rbox(w, 0.014, d, trim, [0, 0.007, 0], 0.005), rbox(w - 0.24, 0.018, d - 0.24, color, [0, 0.009, 0], 0.005), rbox(w - 0.4, 0.02, d - 0.4, shade(color, 0.72), [0, 0.01, 0], 0.005));
    const n = Math.max(1, Math.round((d - 0.6) / Math.min(w * 0.6, 1)));
    for (let i = 0; i < n; i++) {
      const size = Math.min(w * 0.45, (d - 0.6) / n) * (0.8 + rand() * 0.1);
      const diamond = rbox(size * 0.7, 0.024, size * 0.7, i % 2 ? trim : '#2f4a6b', [0, 0.012, -d / 2 + 0.3 + ((i + 0.5) * (d - 0.6)) / n], 0.004);
      diamond.rotation.y = Math.PI / 4;
      g.add(diamond);
    }
    const fringe: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) for (let x = -w / 2 + 0.05; x < w / 2; x += 0.05) fringe.push(new THREE.BoxGeometry(0.012, 0.006, 0.09).translate(x, 0.004, s * (d / 2 + 0.04)));
    g.add(merged(fringe, '#efe4c8'));
    g.userData.passable = true;
    return g;
  },
);

registerAsset(
  'ancient.cushion',
  'Almofada de chão, quadrada e fofa com borlas nos cantos, ou um rolo para encostar (params: shape — "square" ou "bolster" —, color, trim, size — escala)',
  (p) => {
    const color = String(p.color ?? '#7a3b6a');
    const trim = String(p.trim ?? '#d6a640');
    const g = group();
    if (String(p.shape ?? 'square') === 'bolster') {
      g.add(mesh(new THREE.CapsuleGeometry(0.13, 0.62, 6, 14).rotateZ(Math.PI / 2), color, [0, 0.13, 0]));
      for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 16).rotateY(Math.PI / 2), trim, [s * 0.32, 0.13, 0]));
    } else {
      g.add(rbox(0.62, 0.17, 0.62, color, [0, 0.085, 0], 0.075), mesh(new THREE.SphereGeometry(0.025, 8, 6), trim, [0, 0.172, 0]));
      for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        // Hanging down from the corner.
        const tassel = mesh(new THREE.ConeGeometry(0.022, 0.08, 6).rotateX(Math.PI), trim, [x * 0.315, 0.045, z * 0.315]);
        g.add(tassel);
      }
    }
    g.scale.setScalar(Number(p.size ?? 1));
    return loose(group(g));
  },
);

registerAsset(
  'ancient.chest',
  'Baú de madeira com cintas de bronze, a frente (fechadura) para +z; a tampa abre para trás (canal `open`) e em cima se põem coisas (`top`) (params: width, color)',
  (p) => {
    const w = Number(p.width ?? 0.9);
    const [h, d] = [0.45, 0.5];
    const wood = String(p.color ?? '#7a5236');
    const g = group(rbox(w, h, d, wood, [0, h / 2, 0], 0.02));
    for (const x of [-w * 0.3, w * 0.3]) g.add(rbox(0.06, h + 0.01, d + 0.01, BRONZE, [x, h / 2, 0], 0.008));
    g.add(rbox(0.1, 0.12, 0.02, BRONZE, [0, h - 0.07, d / 2 + 0.01], 0.008));
    for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12).rotateY(Math.PI / 2), BRONZE, [s * (w / 2 + 0.012), h * 0.65, 0]));
    // The lid turns on hinges along the back.
    const lid = group(rbox(w + 0.03, 0.08, d + 0.03, shade(wood, 1.1), [0, 0.04, d / 2], 0.02), mesh(new THREE.CylinderGeometry(d / 2, d / 2, w + 0.02, 18, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.25, 1), shade(wood, 1.1), [0, 0.08, d / 2]));
    for (const x of [-w * 0.3, w * 0.3]) lid.add(rbox(0.062, 0.09, d + 0.04, BRONZE, [x, 0.045, d / 2], 0.008));
    lid.position.set(0, h, -d / 2);
    g.add(lid, place('top', 0, h + 0.15, 0));
    return setChannels(g, { open: { value: 0, apply: (v) => (lid.rotation.x = -v * 1.9) } });
  },
);

registerAsset(
  'ancient.lowTable',
  'Mesa baixa de madeira (35 cm, para comer sentado no chão), com jarra, copos e uma tigela de frutas em cima; põe-se coisas em `top` (params: width, depth, jar — 0 ou 1 —, cups, fruit — 0 ou 1 —, color)',
  (p) => {
    const [w, d] = [Number(p.width ?? 1.2), Number(p.depth ?? 0.7)];
    const wood = String(p.color ?? '#8a5a3a');
    const top = 0.35;
    const g = group(rbox(w, 0.05, d, wood, [0, top - 0.025, 0], 0.015), rbox(w - 0.1, 0.06, d - 0.1, shade(wood, 0.75), [0, top - 0.08, 0], 0.01));
    for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) g.add(rbox(0.07, top - 0.05, 0.07, shade(wood, 0.75), [x * (w / 2 - 0.07), (top - 0.05) / 2, z * (d / 2 - 0.07)], 0.015));
    if (Number(p.jar ?? 1) > 0) {
      const pitcher = jar('pitcher', 0.3, '#b86a42');
      pitcher.position.set(-w * 0.28, top, -d * 0.12);
      g.add(pitcher);
    }
    const cups = Math.max(0, Math.round(Number(p.cups ?? 2)));
    for (let i = 0; i < cups; i++) {
      g.add(mesh(lathe([[0.001, 0], [0.03, 0], [0.045, 0.06], [0.048, 0.08], [0.04, 0.08], [0.035, 0.065], [0.001, 0.065]], 14), i % 2 ? BRONZE : '#c47a4a', [w * 0.02 + (i - (cups - 1) / 2) * 0.16, top, d * 0.18]));
    }
    if (Number(p.fruit ?? 1) > 0) {
      const bowl = group(mesh(lathe([[0.001, 0], [0.06, 0], [0.13, 0.05], [0.14, 0.065], [0.125, 0.065], [0.115, 0.055], [0.001, 0.03]], 16), '#b9663f'));
      const rand = rng(8);
      const grapes: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 14; i++) grapes.push(new THREE.IcosahedronGeometry(0.022, 1).translate(-0.04 + (rand() - 0.5) * 0.08, 0.06 + rand() * 0.04, (rand() - 0.5) * 0.08));
      bowl.add(merged(grapes, '#5d2f5a', true));
      for (let i = 0; i < 3; i++) bowl.add(mesh(new THREE.SphereGeometry(0.035, 10, 8).scale(1, 1.15, 1), '#7a5a3a', [0.05, 0.075, (i - 1) * 0.055]));
      bowl.position.set(w * 0.3, top, -d * 0.05);
      g.add(bowl);
    }
    g.add(place('top', 0, top + 0.01, 0));
    return g;
  },
);

registerAsset(
  'ancient.hitchedDonkey',
  'Jumento parado, de frente para -z, amarrado pelo cabresto a uma estaca; mexe a cauda, as orelhas e a cabeça sozinho. `load: 1` põe manta e alforjes no lombo (params: color, load, tied — 0 sem estaca —, seed)',
  (p) => {
    const color = String(p.color ?? '#8f877d');
    const light = '#ddd5c8';
    const dark = '#3a3330';
    const g = group(mesh(new THREE.CapsuleGeometry(0.27, 0.6, 6, 14).rotateX(Math.PI / 2), color, [0, 0.88, 0.05]));
    // Legs, a little thicker at the top, with dark hooves; the haunches.
    for (const [x, z] of [[-0.13, -0.33], [0.13, -0.33], [-0.13, 0.4], [0.13, 0.4]]) {
      g.add(rod(v3(x, 0.07, z), v3(x, 0.84, z), 0.05, color, 0.09), mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.08, 10), dark, [x, 0.04, z]));
    }
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.15, 12, 10).scale(0.8, 1, 1), color, [s * 0.11, 0.86, 0.42]));
    // The light belly.
    g.add(mesh(new THREE.CapsuleGeometry(0.17, 0.45, 4, 12).rotateX(Math.PI / 2), light, [0, 0.74, 0.05]));
    // Neck and head turn together from the shoulders.
    const head = new THREE.Group();
    head.position.set(0, 1.0, -0.42);
    const skull = new THREE.CapsuleGeometry(0.115, 0.26, 6, 12);
    skull.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), v3(0, -0.55, -1).normalize()));
    head.add(
      rod(v3(0, -0.05, 0.04), v3(0, 0.3, -0.22), 0.17, color, 0.12),
      rod(v3(0, 0.16, 0.0), v3(0, 0.43, -0.2), 0.04, dark),
      mesh(skull, color, [0, 0.28, -0.38]),
      mesh(new THREE.SphereGeometry(0.11, 12, 10).scale(0.95, 0.9, 1.05), light, [0, 0.18, -0.56]),
      mesh(new THREE.SphereGeometry(0.03, 8, 6), dark, [0, 0.17, -0.65]),
      mesh(new THREE.TorusGeometry(0.105, 0.012, 5, 16).rotateX(1.1), '#8a3b2a', [0, 0.22, -0.5]),
    );
    for (const s of [-1, 1]) head.add(mesh(new THREE.SphereGeometry(0.018, 8, 6), '#141010', [s * 0.085, 0.36, -0.42]));
    const ears = [-1, 1].map((s) => {
      const ear = new THREE.Group();
      ear.position.set(s * 0.06, 0.42, -0.3);
      const cone = mesh(new THREE.ConeGeometry(0.045, 0.3, 7).scale(1, 1, 0.55).translate(0, 0.15, 0), color);
      const tip = mesh(new THREE.ConeGeometry(0.028, 0.08, 7).translate(0, 0.27, 0), dark);
      ear.add(cone, tip);
      ear.rotation.set(0.35, 0, -s * 0.35);
      head.add(ear);
      return ear;
    });
    g.add(head);
    const tail = new THREE.Group();
    tail.position.set(0, 0.98, 0.62);
    tail.add(rod(v3(0, 0, 0), v3(0, -0.4, 0.06), 0.02, color), mesh(new THREE.SphereGeometry(0.05, 8, 8).scale(1, 1.8, 1), dark, [0, -0.44, 0.065]));
    g.add(tail);
    if (Number(p.load ?? 0) > 0) {
      g.add(rbox(0.6, 0.03, 0.55, '#7d3b33', [0, 1.13, 0.0], 0.01));
      for (const s of [-1, 1]) {
        g.add(rbox(0.03, 0.34, 0.55, '#7d3b33', [s * 0.28, 0.98, 0], 0.01));
        const bag = mesh(sackGeo(true).scale(0.75, 0.75, 0.75).rotateY(Math.PI / 2), BURLAP[1], [s * 0.36, 0.78, -0.25]);
        g.add(bag);
      }
    }
    if (Number(p.tied ?? 1) > 0) g.add(post(0.04, 0.75, WOOD_DARK, 0.45, 0, -1.25), rod(v3(0.03, 1.12, -0.95), v3(0.45, 0.6, -1.25), 0.008, ROPE));
    const phase = rng(Number(p.seed ?? 1))() * 10;
    g.userData.animate = (t: number) => {
      tail.rotation.z = 0.25 * Math.sin(t * 1.9 + phase) * Math.max(0, Math.sin(t * 0.45 + phase));
      head.rotation.x = 0.06 * Math.sin(t * 0.6 + phase);
      head.rotation.y = 0.12 * Math.sin(t * 0.27 + phase);
      ears.forEach((ear, i) => (ear.rotation.x = 0.35 + 0.25 * Math.max(0, Math.sin(t * (1.3 + i * 0.4) + phase * (i + 1))) ** 6));
    };
    return g;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Nature of the hills and the valley

registerAsset(
  'ancient.rock',
  'Pedra solta irregular, de terra clara, meio enterrada (params: size — largura em metros, 0,6 —, seed, color)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const size = Number(p.size ?? 0.6);
    const color = String(p.color ?? STONES[Math.floor(rand() * STONES.length)]);
    const m = mesh(rockGeo(rand, size / 2, 0.55 + rand() * 0.3), color);
    m.rotation.y = rand() * 6;
    return group(m);
  },
);

registerAsset(
  'ancient.boulder',
  'Rochedo grande com pedras menores no pé, para os montes (params: size — largura, 2,2 m —, seed, color)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const size = Number(p.size ?? 2.2);
    const color = String(p.color ?? STONES[Math.floor(rand() * STONES.length)]);
    const big = mesh(rockGeo(rand, size / 2, 0.6 + rand() * 0.2, 2), color);
    big.rotation.y = rand() * 6;
    const small: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      const r = size * (0.15 + rand() * 0.12);
      small.push(rockGeo(rand, r / 2 + 0.05, 0.6).translate(Math.cos(a) * (size / 2 + r * 0.2), 0, Math.sin(a) * (size / 2 + r * 0.2)));
    }
    return group(big, merged(small, shade(color, 0.93), true));
  },
);

const OLIVE_LEAVES = ['#8f9c6e', '#a3ad84', '#7b8a5c'];

registerAsset(
  'ancient.oliveTree',
  'Oliveira: tronco retorcido de vários troncos enroscados e copa larga verde-prateada; só o tronco bloqueia a passagem (params: height — 3,5 —, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const h = Number(p.height ?? 3.5) * (0.9 + rand() * 0.2);
    const bark: THREE.BufferGeometry[] = [];
    const crowns: THREE.Vector3[] = [];
    const twist = 0.6 + rand() * 0.8;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + rand();
      const out = a + twist * 1.6 + (rand() - 0.5);
      const spread = h * (0.2 + rand() * 0.12);
      const tip = v3(Math.cos(out) * spread, h * (0.52 + rand() * 0.1), Math.sin(out) * spread);
      crowns.push(tip);
      const curve = new THREE.CatmullRomCurve3([
        v3(Math.cos(a) * 0.2, -0.1, Math.sin(a) * 0.2),
        v3(Math.cos(a + twist * 0.5) * 0.1, h * 0.15, Math.sin(a + twist * 0.5) * 0.1),
        v3(Math.cos(a + twist) * 0.12, h * 0.3, Math.sin(a + twist) * 0.12),
        tip,
      ]);
      bark.push(new THREE.TubeGeometry(curve, 14, 0.13 - i * 0.02, 7, false));
      // A branch off each stem.
      const from = curve.getPoint(0.7);
      const to = from.clone().add(v3(Math.cos(out + 1) * h * 0.18, h * 0.12, Math.sin(out + 1) * h * 0.18));
      bark.push(rodGeo(from, to, 0.06, 0.035, 6));
      crowns.push(to);
    }
    const g = group(merged(bark, '#7d6a58', true));
    const leaves: THREE.BufferGeometry[][] = [[], [], []];
    const blobs = [...crowns, v3(0, h * 0.78, 0)];
    blobs.forEach((c, i) => {
      const r = h * (0.17 + rand() * 0.06);
      const y = Math.max(c.y + r * 0.25, r * 0.72 + 1.6);
      leaves[i % 3].push(lumpGeo(rand, r, 0.72).translate(c.x, y, c.z));
    });
    for (let i = 0; i < 3; i++) g.add(merged(leaves[i], OLIVE_LEAVES[i], true));
    return g;
  },
);

const FROND = new THREE.MeshStandardMaterial({ color: '#5f8f3e', side: THREE.DoubleSide, roughness: 0.85 });

/** One palm frond along +x from the origin: rising, then drooping, folded in a V, with ragged leaflets. */
function frondGeo(length: number, width: number, rise: number, droop: number): THREE.BufferGeometry {
  const n = 14;
  const pos: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const x = s * length;
    const y = length * (rise * s - droop * s * s);
    const half = width * Math.sin(Math.PI * Math.min(1, s * 1.15)) * (i % 2 ? 1 : 0.6) + 0.01;
    pos.push(x, y - half * 0.35, -half, x, y + half * 0.15, 0, x, y - half * 0.35, half);
  }
  for (let i = 0; i < n; i++) {
    const [a, b] = [i * 3, (i + 1) * 3];
    index.push(a, a + 1, b + 1, a, b + 1, b, a + 1, a + 2, b + 2, a + 1, b + 2, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

registerAsset(
  'ancient.palm',
  'Tamareira: tronco anelado levemente curvo, coroa de folhas compridas caindo e cachos de tâmaras (params: height — 6 —, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const h = Number(p.height ?? 6) * (0.9 + rand() * 0.2);
    const lean = rand() * Math.PI * 2;
    const bend = h * (0.05 + rand() * 0.1);
    const curve = new THREE.QuadraticBezierCurve3(v3(0, -0.1, 0), v3(Math.cos(lean) * bend * 0.1, h * 0.5, Math.sin(lean) * bend * 0.1), v3(Math.cos(lean) * bend, h, Math.sin(lean) * bend));
    const rings: THREE.BufferGeometry[] = [];
    const segments = Math.round(h / 0.32);
    for (let i = 0; i < segments; i++) {
      const [a, b] = [curve.getPoint(i / segments), curve.getPoint((i + 1) / segments)];
      const r = 0.2 - (0.07 * i) / segments;
      rings.push(rodGeo(a, b, r * 1.12, r * 0.9, 9));
    }
    const top = curve.getPoint(1);
    const g = group(merged(rings, '#8a6f52', true), mesh(new THREE.SphereGeometry(0.24, 12, 10).scale(1, 1.2, 1), '#6d6a3e', [top.x, top.y + 0.05, top.z]));
    const fronds: THREE.BufferGeometry[] = [];
    const count = 15 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const up = i < 3;
      const f = frondGeo(h * (0.32 + rand() * 0.08), 0.38, up ? 1.2 : 0.55, up ? 0.6 : 1.05 + rand() * 0.35);
      fronds.push(f.rotateY((i / count) * Math.PI * 2 + rand() * 0.4).translate(top.x, top.y + 0.1, top.z));
    }
    const leaves = new THREE.Mesh(merge(fronds), FROND);
    leaves.userData.noOutline = true;
    const dates: THREE.BufferGeometry[] = [];
    for (let c = 0; c < 3; c++) {
      const a = rand() * Math.PI * 2;
      for (let i = 0; i < 12; i++) dates.push(new THREE.IcosahedronGeometry(0.035, 0).translate(top.x + Math.cos(a) * 0.25 + (rand() - 0.5) * 0.12, top.y - 0.25 - rand() * 0.25, top.z + Math.sin(a) * 0.25 + (rand() - 0.5) * 0.12));
    }
    g.add(leaves, merged(dates, '#b8662a'));
    return g;
  },
);

registerAsset(
  'ancient.dryBush',
  'Arbusto seco de encosta: galhos finos marrons e poucas folhas cinza-esverdeadas; bloqueia a passagem (params: size — 0,9 m —, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const size = Number(p.size ?? 0.9);
    const twigs: THREE.BufferGeometry[] = [];
    const tips: THREE.Vector3[] = [];
    for (let i = 0; i < 16; i++) {
      const a = rand() * Math.PI * 2;
      const e = 0.5 + rand() * 0.8;
      const len = size * (0.4 + rand() * 0.4);
      const base = v3((rand() - 0.5) * 0.1, -0.02, (rand() - 0.5) * 0.1);
      const end = base.clone().add(v3(Math.cos(a) * Math.cos(e) * len, Math.sin(e) * len, Math.sin(a) * Math.cos(e) * len));
      twigs.push(rodGeo(base, end, 0.02, 0.006, 4));
      const mid = base.clone().lerp(end, 0.55);
      const side = mid.clone().add(v3(Math.cos(a + 0.8) * len * 0.35, len * 0.25, Math.sin(a + 0.8) * len * 0.35));
      twigs.push(rodGeo(mid, side, 0.01, 0.004, 4));
      tips.push(end, side);
    }
    const leaves: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const t = tips[Math.floor(rand() * tips.length)];
      leaves.push(lumpGeo(rand, size * (0.035 + rand() * 0.03), 0.8, 0).translate(t.x, t.y, t.z));
    }
    return group(merged(twigs, '#7d6548'), merged(leaves, '#9d9b72', true));
  },
);

const PEBBLES = ['#b8b2a6', '#9d978c', '#cfc6b5', '#8f8a80', '#c2b29a', '#d8d0c0'];

/** Smooth stones as one InstancedMesh: each entry is [x, z, size]. */
function pebbleMesh(rand: () => number, at: [number, number, number][], y = 0): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(lumpGeo(rand, 1, 0.5, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), at.length);
  const m = new THREE.Matrix4();
  const [q, s, pos, color] = [new THREE.Quaternion(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Color()];
  at.forEach(([x, z, size], i) => {
    m.compose(pos.set(x, y + size * 0.2, z), q.setFromAxisAngle(v3(0, 1, 0), rand() * 6), s.set(size, size * (0.8 + rand() * 0.4), size * (0.7 + rand() * 0.3)));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, color.set(PEBBLES[Math.floor(rand() * PEBBLES.length)]));
  });
  mesh.userData.noOutline = true;
  return mesh;
}

registerAsset(
  'ancient.pebbles',
  'Seixos lisos de riacho espalhados num retângulo centrado na origem; pisa-se neles (params: width, depth, density — por m² —, seed)',
  (p) => {
    const [w, d] = [Number(p.width ?? 2), Number(p.depth ?? 2)];
    const rand = rng(Number(p.seed ?? 1));
    const count = Math.max(1, Math.round(w * d * Number(p.density ?? 30)));
    const at: [number, number, number][] = Array.from({ length: count }, () => [(rand() - 0.5) * w, (rand() - 0.5) * d, 0.025 + rand() ** 2 * 0.06]);
    const g = group(pebbleMesh(rand, at));
    g.userData.passable = true;
    return g;
  },
);

/** A strip along x that follows a center line z(x), from `from` to `to` across it, at height y, facing up. */
function ribbonGeo(length: number, center: (x: number) => number, from: number, to: number, y: number, across = 1, along = 60): THREE.BufferGeometry {
  const pos: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= along; i++) {
    const x = -length / 2 + (i / along) * length;
    const z = center(x);
    const slope = (center(x + 0.01) - center(x - 0.01)) / 0.02;
    const k = 1 / Math.hypot(1, slope);
    for (let j = 0; j <= across; j++) {
      const o = from + (j / across) * (to - from);
      pos.push(x - slope * k * o, y, z + k * o);
    }
  }
  const row = across + 1;
  for (let i = 0; i < along; i++) {
    for (let j = 0; j < across; j++) {
      const [a, b, c, d] = [i * row + j, i * row + j + 1, (i + 1) * row + j, (i + 1) * row + j + 1];
      index.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

registerAsset(
  'ancient.stream',
  'Riacho raso ao longo de x: água azul meio transparente que brilha e corre (para +x), leito de pedras lisas, margens de cascalho e capim verde. Plano: ponha no fundo do vale, onde o chão é reto; pisa-se nele (params: length, width — da água —, curve — quanto a linha se afasta do eixo, em metros —, bends — quantas curvas —, bank — largura de cada margem —, seed)',
  (p) => {
    const length = Number(p.length ?? 12);
    const width = Number(p.width ?? 2.2);
    const curve = Number(p.curve ?? 0);
    const bends = Number(p.bends ?? 1);
    const bank = Number(p.bank ?? 0.8);
    const rand = rng(Number(p.seed ?? 1));
    const center = (x: number) => curve * Math.sin(bends * Math.PI * (x / length + 0.5));
    const along = Math.max(20, Math.round(length * 6));
    const bed = mesh(ribbonGeo(length, center, -width / 2 - 0.05, width / 2 + 0.05, 0.014, 2, along), '#7d6e55');
    const banks = merged([ribbonGeo(length, center, width / 2 - 0.1, width / 2 + bank, 0.01, 1, along), ribbonGeo(length, center, -width / 2 - bank, -width / 2 + 0.1, 0.01, 1, along)], '#c2ad86');
    const surface = ribbonGeo(length, center, -width / 2 + 0.04, width / 2 - 0.04, 0.04, 6, along);
    const water = new THREE.Mesh(surface, new THREE.MeshStandardMaterial({ color: '#4f9cc4', transparent: true, opacity: 0.72, roughness: 0.15, metalness: 0.1 }));
    const g = group(bed, banks, water);
    for (const m of [bed, banks, water]) m.userData.noShadow = true;
    bed.receiveShadow = banks.receiveShadow = true;
    // Stones: small ones on the bed, a few big ones breaking the surface, gravel along each bank.
    const at = (o: number, size: number): [number, number, number] => {
      const x = (rand() - 0.5) * length;
      const slope = (center(x + 0.01) - center(x - 0.01)) / 0.02;
      const k = 1 / Math.hypot(1, slope);
      return [x - slope * k * o, center(x) + k * o, size];
    };
    const stones: [number, number, number][] = [];
    for (let i = 0; i < length * width * 8; i++) stones.push(at((rand() - 0.5) * width, 0.03 + rand() * 0.05));
    for (let i = 0; i < length * 0.6; i++) stones.push(at((rand() - 0.5) * width * 0.8, 0.12 + rand() * 0.1));
    for (const s of [-1, 1]) for (let i = 0; i < length * bank * 25; i++) stones.push(at(s * (width / 2 + rand() ** 1.6 * bank), 0.025 + rand() ** 2 * 0.07));
    g.add(pebbleMesh(rand, stones, 0.005));
    // Green grass on the outer edge of the banks.
    const blade = (lean: number, turn: number) => new THREE.ConeGeometry(0.022, 1, 3).translate(0, 0.5, 0).rotateZ(lean).rotateY(turn);
    const tufts = Math.round(length * 14);
    const grass = new THREE.InstancedMesh(mergeGeometries([blade(0.25, 0), blade(-0.3, 2.1), blade(0.18, 4.2)]), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), tufts);
    const [m4, q, sc, pos, color] = [new THREE.Matrix4(), new THREE.Quaternion(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Color()];
    for (let i = 0; i < tufts; i++) {
      const [x, z] = at((rand() < 0.5 ? -1 : 1) * (width / 2 + bank * (0.55 + rand() * 0.6)), 0);
      m4.compose(pos.set(x, 0, z), q.setFromAxisAngle(v3(0, 1, 0), rand() * 6), sc.set(0.9 + rand(), 0.12 + rand() * 0.2, 0.9 + rand()));
      grass.setMatrixAt(i, m4);
      grass.setColorAt(i, color.set(['#5f9d4a', '#6fae52', '#7fb85a', '#8a9b4e'][Math.floor(rand() * 4)]));
    }
    grass.userData.noShadow = grass.userData.noOutline = true;
    g.add(grass);
    // Glints that drift downstream, and small waves on the surface.
    const glint = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false });
    const glints = Array.from({ length: Math.max(6, Math.round(length * 0.8)) }, () => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.035).rotateX(-Math.PI / 2), glint);
      m.userData = { noShadow: true, phase: rand(), offset: (rand() - 0.5) * width * 0.7, speed: 0.5 + rand() * 0.4 };
      g.add(m);
      return m;
    });
    const rest = Float32Array.from(surface.attributes.position.array);
    const wpos = surface.attributes.position;
    g.userData.animate = (t: number) => {
      for (let i = 0; i < wpos.count; i++) {
        const [x, z] = [rest[i * 3], rest[i * 3 + 2]];
        wpos.setY(i, 0.04 + 0.006 * Math.sin(x * 2.3 - t * 2.2 + z * 3.1) + 0.004 * Math.sin(x * 4.1 - t * 3.3 - z * 2));
      }
      wpos.needsUpdate = true;
      surface.computeVertexNormals();
      for (const m of glints) {
        const u = (m.userData.phase + (t * m.userData.speed) / length) % 1;
        const x = -length / 2 + u * length;
        const slope = (center(x + 0.01) - center(x - 0.01)) / 0.02;
        m.position.set(x, 0.05, center(x) + m.userData.offset);
        m.rotation.y = -Math.atan(slope);
        m.scale.x = Math.max(0.01, Math.sin(Math.PI * u));
      }
    };
    g.userData.animate(0);
    g.userData.passable = true;
    return g;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Town

const PLASTER = ['#d9c49e', '#cfb28a', '#d4bc94', '#c9ad86', '#ddcaa6'];

/** Stones showing through the plaster of a wall face: boxes to merge, on the plane z = face, spread over w × h. */
function stonesOn(rand: () => number, n: number, w: number, h: number, face: number, y0 = 0): THREE.BufferGeometry[] {
  return Array.from({ length: n }, () => new THREE.BoxGeometry(0.2 + rand() * 0.25, 0.1 + rand() * 0.1, 0.04).translate((rand() - 0.5) * (w - 0.4), y0 + 0.2 + rand() * (h - 0.4), face));
}

registerAsset(
  'ancient.house',
  'Casa de pedra e barro de teto plano com terraço e mureta, porta baixa e janelinhas como vãos escuros, pontas das vigas aparecendo; a frente (porta) olha para +z. Pelo `seed` muda cor, altura, escada de fora até o terraço, quartinho ou cabana de ramos no terraço (params: width, depth, height, seed, stair — 0 ou 1 —, color)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const w = Number(p.width ?? 5);
    const d = Number(p.depth ?? 5);
    const h = Number(p.height ?? 2.6 + rand() * 0.6);
    const wall = String(p.color ?? PLASTER[Math.floor(rand() * PLASTER.length)]);
    const stair = Number(p.stair ?? (rand() < 0.6 ? 1 : 0)) > 0;
    const side = rand() < 0.5 ? -1 : 1;
    const g = group(rbox(w, h, d, wall, [0, h / 2, 0], 0.06), rbox(w + 0.1, 0.45, d + 0.1, '#a99b82', [0, 0.2, 0], 0.04));
    g.add(rbox(w + 0.1, 0.1, d + 0.1, shade(wall, 0.9), [0, h + 0.05, 0], 0.03));
    // Parapet round the terrace, with a gap where the stair arrives.
    const ph = 0.45;
    g.add(rbox(w + 0.1, ph, 0.14, wall, [0, h + ph / 2, d / 2 - 0.02], 0.03), rbox(w + 0.1, ph, 0.14, wall, [0, h + ph / 2, -d / 2 + 0.02], 0.03));
    for (const s of [-1, 1]) {
      if (stair && s === side) g.add(rbox(0.14, ph, d - 1.1, wall, [s * (w / 2 - 0.02), h + ph / 2, 0.5], 0.03));
      else g.add(rbox(0.14, ph, d, wall, [s * (w / 2 - 0.02), h + ph / 2, 0], 0.03));
    }
    // Beam ends under the roof, front and back.
    const beams: THREE.BufferGeometry[] = [];
    for (let x = -w / 2 + 0.4; x < w / 2 - 0.2; x += 0.55) for (const s of [-1, 1]) beams.push(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 8).rotateX(Math.PI / 2).translate(x, h - 0.16, s * (d / 2 + 0.08)));
    g.add(merged(beams, WOOD_DARK, true));
    // Door with a wooden lintel, and small high windows.
    const door = (rand() - 0.5) * (w - 2.2);
    g.add(rbox(0.85, 1.75, 0.06, HOLE, [door, 0.875 + 0.05, d / 2 + 0.005], 0.01), rbox(1.2, 0.15, 0.14, WOOD_DARK, [door, 1.88, d / 2 + 0.03], 0.02), rbox(1.1, 0.08, 0.3, '#a99b82', [door, 0.04, d / 2 + 0.12], 0.02));
    const windowAt = (x: number, z: number, along: 'x' | 'z') => {
      const [ww, wd] = along === 'x' ? [0.45, 0.06] : [0.06, 0.45];
      const y = h - 0.75;
      g.add(rbox(ww, 0.4, wd, HOLE, [x, y, z], 0.008), rbox(along === 'x' ? 0.6 : 0.16, 0.07, along === 'x' ? 0.16 : 0.6, WOOD_DARK, [x, y + 0.24, z], 0.015));
    };
    for (const x of [-w / 2 + 0.7, w / 2 - 0.7]) if (Math.abs(x - door) > 1) windowAt(x, d / 2 + 0.005, 'x');
    windowAt((rand() - 0.5) * (w - 1.5), -d / 2 - 0.005, 'x');
    windowAt(-side * (w / 2 + 0.005), (rand() - 0.5) * (d - 1.5), 'z');
    const stones: THREE.BufferGeometry[] = [...stonesOn(rand, Math.round(w * 2), w, h, d / 2 + 0.01), ...stonesOn(rand, Math.round(w * 2), w, h, -d / 2 - 0.01)];
    for (const s of [-1, 1]) stones.push(...stonesOn(rand, Math.round(d * 2), d, h, 0.01).map((b) => b.rotateY(Math.PI / 2).translate(s * (w / 2 + 0.01), 0, 0)));
    g.add(merged(stones, shade(wall, 0.85)));
    if (stair) {
      // Solid stone steps along the side wall, from the front up to the back of the terrace.
      const n = Math.ceil(h / 0.24);
      const run = (d - 0.6) / n;
      const steps: THREE.BufferGeometry[] = [];
      for (let i = 0; i < n; i++) steps.push(new THREE.BoxGeometry(0.8, ((i + 1) * h) / n, run + 0.01).translate(side * (w / 2 + 0.45), ((i + 1) * h) / n / 2, d / 2 - 0.3 - (i + 0.5) * run));
      g.add(mesh(merge(steps), '#b5a58a'));
    }
    const extra = rand();
    if (extra < 0.3) {
      // A small upper room in a back corner.
      const [rw, rd, rh] = [Math.min(2.4, w * 0.45), Math.min(2.2, d * 0.45), 2];
      const [x, z] = [-side * (w / 2 - rw / 2 - 0.1), -d / 2 + rd / 2 + 0.1];
      g.add(rbox(rw, rh, rd, wall, [x, h + rh / 2, z], 0.04), rbox(rw + 0.1, 0.1, rd + 0.1, shade(wall, 0.9), [x, h + rh + 0.05, z], 0.03), rbox(0.7, 1.5, 0.05, HOLE, [x, h + 0.75, z + rd / 2 + 0.005], 0.01));
    } else if (extra < 0.6) {
      // A shelter of branches on four poles, for the hot days.
      const [x, z] = [-side * (w / 2 - 1.1), -d / 2 + 1.1];
      for (const [dx, dz] of [[-0.8, -0.8], [-0.8, 0.8], [0.8, -0.8], [0.8, 0.8]]) g.add(post(0.04, 1.8, WOOD_DARK, x + dx, h, z + dz));
      g.add(rbox(1.9, 0.12, 1.9, '#8a8a52', [x, h + 1.86, z], 0.05));
    } else {
      const jars = group();
      for (let i = 0; i < 3; i++) {
        const one = jar('storage', 0.65 + rand() * 0.15, CLAYS[i % CLAYS.length]);
        one.position.set(i * 0.45, 0, 0);
        jars.add(one);
      }
      jars.position.set(-side * (w / 2 - 1.2), h + 0.1, -d / 2 + 0.5);
      g.add(jars);
    }
    return g;
  },
);

registerAsset(
  'ancient.cityGate',
  'Portão de cidade de pedra: duas torres com ameias e, entre elas, uma passagem em arco com as folhas de madeira abertas para dentro; a frente (fora da cidade) olha para +z. Passa-se pelo arco ao longo de z; o asset não bloqueia nada: ponha `ancient.wall` dos lados (params: opening — largura do arco —, height — das torres —, color, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const opening = Number(p.opening ?? 3);
    const th = Number(p.height ?? 7.5);
    const color = String(p.color ?? STONE);
    const [gw, gh, gd] = [opening + 2, th * 0.7, 3];
    const spring = Math.min(2.6, gh - opening / 2 - 0.6);
    const tower = 3.4;
    // Two piers, and over the passage the arch: separate parts, so each blocks on its own and the way through is free.
    const pier = (gw - opening) / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-opening / 2, gh);
    shape.lineTo(-opening / 2, spring);
    shape.absarc(0, spring, opening / 2, Math.PI, 0, true);
    shape.lineTo(opening / 2, gh);
    shape.closePath();
    const g = group(
      rbox(pier, gh, gd, color, [-(opening + pier) / 2, gh / 2, 0], 0.03),
      rbox(pier, gh, gd, color, [(opening + pier) / 2, gh / 2, 0], 0.03),
      mesh(new THREE.ExtrudeGeometry(shape, { depth: gd - 0.02, bevelEnabled: false, curveSegments: 16 }).translate(0, 0, -(gd - 0.02) / 2), color),
    );
    const stones: THREE.BufferGeometry[] = [];
    const merlons: THREE.BufferGeometry[] = [];
    const battlements = (x: number, z: number, w: number, d: number, y: number) => {
      const nx = Math.max(2, Math.round(w / 0.9));
      for (let i = 0; i < nx; i += 2) for (const s of [-1, 1]) merlons.push(new THREE.BoxGeometry(w / nx, 0.6, 0.35).translate(x - w / 2 + (i + 0.5) * (w / nx), y + 0.3, z + s * (d / 2 - 0.175)));
      const nz = Math.max(2, Math.round(d / 0.9));
      for (let i = 0; i < nz; i += 2) for (const s of [-1, 1]) merlons.push(new THREE.BoxGeometry(0.35, 0.6, d / nz).translate(x + s * (w / 2 - 0.175), y + 0.3, z - d / 2 + (i + 0.5) * (d / nz)));
    };
    battlements(0, 0, gw, gd, gh);
    // Not where the passage is.
    const clear = (b: THREE.BufferGeometry) => {
      b.computeBoundingBox();
      const c = b.boundingBox!.getCenter(new THREE.Vector3());
      return Math.abs(c.x) > opening / 2 + 0.25 || c.y > spring + opening / 2 + 0.2;
    };
    stones.push(...[...stonesOn(rand, 18, gw, gh, gd / 2 + 0.04), ...stonesOn(rand, 18, gw, gh, -gd / 2 - 0.04)].filter(clear));
    for (const s of [-1, 1]) {
      const x = s * (gw / 2 + tower / 2 - 0.05);
      g.add(rbox(tower, th, tower, shade(color, 0.96), [x, th / 2, 0.3], 0.05), rbox(tower + 0.2, 0.15, tower + 0.2, shade(color, 0.85), [x, th - 0.6, 0.3], 0.03), rbox(tower + 0.3, 0.8, tower + 0.3, shade(color, 0.88), [x, 0.4, 0.3], 0.05));
      battlements(x, 0.3, tower, tower, th);
      for (const y of [th * 0.45, th * 0.75]) g.add(rbox(0.14, 0.7, 0.06, HOLE, [x, y, 0.3 + tower / 2 + 0.01], 0.01));
      stones.push(...stonesOn(rand, 16, tower, th, 0.3 + tower / 2 + 0.03).map((b) => b.translate(x, 0, 0)));
      // The wooden leaf, opened inward against the side of the passage.
      const leaf = group(rbox(0.1, spring + opening / 4, opening / 2, '#6b4a32', [0, (spring + opening / 4) / 2, 0], 0.015));
      for (const y of [0.5, spring * 0.55, spring]) leaf.add(rbox(0.12, 0.08, opening / 2 + 0.01, '#3a3430', [0, y, 0], 0.01));
      leaf.position.set(s * (opening / 2 - 0.08), 0, gd / 2 - 0.35 - opening / 4);
      g.add(leaf);
    }
    // The stones showing on the faces are one mesh across the whole front: decoration, it blocks nothing.
    const faces = merged(stones, shade(color, 0.86));
    faces.userData.passable = true;
    g.add(merged(merlons, color, true), faces, rbox(opening, 0.06, gd, '#a99b82', [0, 0.03, 0], 0.02));
    // Walked through along z: towers, piers and leaves block each on its own, the passage is free.
    g.userData.solidParts = true;
    return g;
  },
);

registerAsset(
  'ancient.wall',
  'Trecho de muralha de pedra ao longo de x, com ameias, base mais larga e pedras aparentes (params: length, height, thickness, color, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const length = Number(p.length ?? 8);
    const h = Number(p.height ?? 4.5);
    const t = Number(p.thickness ?? 1.4);
    const color = String(p.color ?? STONE);
    const g = group(rbox(length, h, t, color, [0, h / 2, 0], 0.05), rbox(length, 0.9, t + 0.4, shade(color, 0.88), [0, 0.45, 0], 0.05));
    const merlons: THREE.BufferGeometry[] = [];
    const n = Math.max(2, Math.round(length / 0.9));
    for (let i = 0; i < n; i += 2) for (const s of [-1, 1]) merlons.push(new THREE.BoxGeometry(length / n, 0.6, 0.35).translate(-length / 2 + (i + 0.5) * (length / n), h + 0.3, s * (t / 2 - 0.175)));
    const stones = [...stonesOn(rand, Math.round(length * 2.5), length, h, t / 2 + 0.01), ...stonesOn(rand, Math.round(length * 2.5), length, h, -t / 2 - 0.01)];
    g.add(merged(merlons, color, true), merged(stones, shade(color, 0.86)));
    return g;
  },
);

registerAsset(
  'ancient.well',
  'Poço redondo de pedra, com água escura lá dentro, dois esteios e um sarilho com corda e balde (params: radius — por fora, 0,75 —, color)',
  (p) => {
    const r = Number(p.radius ?? 0.75);
    const color = String(p.color ?? STONE);
    const h = 0.75;
    const ri = r - 0.2;
    const g = group(
      mesh(lathe([[ri, 0], [r, 0], [r, h], [r - 0.03, h + 0.05], [ri + 0.03, h + 0.05], [ri, h], [ri, 0.2]], 28), color),
      mesh(new THREE.CircleGeometry(ri, 24).rotateX(-Math.PI / 2), '#1d2a2e', [0, 0.25, 0]),
    );
    const rand = rng(Number(p.seed ?? 1));
    const stones: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      stones.push(new THREE.BoxGeometry(0.22, 0.1 + rand() * 0.06, 0.05).translate(0, 0.12 + rand() * (h - 0.25), r + 0.005).rotateY(a));
    }
    g.add(merged(stones, shade(color, 0.85)));
    const top = h + 1.05;
    for (const s of [-1, 1]) g.add(rod(v3(s * (r + 0.02), 0, 0), v3(s * (r + 0.02), top + 0.08, 0), 0.06, WOOD_DARK));
    g.add(rod(v3(-r - 0.15, top, 0), v3(r + 0.15, top, 0), 0.055, WOOD), mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), WOOD_DARK, [r + 0.21, top - 0.05, 0]));
    g.add(rod(v3(0, top - 0.05, 0), v3(0, h + 0.42, 0), 0.008, ROPE));
    const bucket = mesh(lathe([[0.001, 0], [0.1, 0], [0.13, 0.2], [0.14, 0.22], [0.12, 0.22], [0.11, 0.2], [0.001, 0.02]], 14), '#7a5a3a', [0, h + 0.18, 0]);
    g.add(bucket, mesh(new THREE.TorusGeometry(0.13, 0.008, 4, 14, Math.PI), '#4a4440', [0, h + 0.4, 0]));
    return g;
  },
);
