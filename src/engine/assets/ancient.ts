import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { channelAt, type CompiledActions } from '../actions/catalog';
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
    let burning: ((t: number) => void) | undefined;
    if (lit) {
      const glow = (color: string) => new THREE.MeshBasicMaterial({ color });
      const embers = new THREE.Mesh(merge([0, 1, 2, 3, 4].map(() => new THREE.IcosahedronGeometry(0.06 + rand() * 0.03, 0).translate((rand() - 0.5) * 0.3, 0.04, (rand() - 0.5) * 0.3))), glow('#ff6a1f'));
      fire.add(embers);
      embers.userData.noShadow = true;
      const flame = flickeringFire(rand, 0.55);
      flame.fire.position.y = 0.05;
      fire.add(flame.fire);
      burning = flame.update;
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
      g.userData.animate = (t: number) => {
        burning?.(t);
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
    // Each leg hangs from a pivot at the hip, so it can swing when the donkey is led along.
    const legs = [[-0.13, -0.33], [0.13, -0.33], [-0.13, 0.4], [0.13, 0.4]].map(([x, z]) => {
      const leg = new THREE.Group();
      leg.position.set(x, 0.84, z);
      leg.add(rod(v3(0, -0.77, 0), v3(0, 0, 0), 0.05, color, 0.09), mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.08, 10), dark, [0, -0.8, 0]));
      g.add(leg);
      return leg;
    });
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
    // Led along (moveTo), it walks: speed from where it is a moment before and after, a diagonal gait
    // (front left with back right), one step about every 0.45 m, and a small bob of the head.
    g.userData.present = (compiled: CompiledActions, t: number, id: string) => {
      const dt = 0.12;
      const at = (u: number) => [channelAt(compiled, id, 'x', u), channelAt(compiled, id, 'z', u)];
      const [a, b] = [at(Math.max(0, t - dt)), at(t + dt)];
      const speed = Math.hypot(b[0] - a[0], b[1] - a[1]) / (2 * dt);
      const walk = Math.min(1, speed / 0.5);
      const stride = (t * speed * Math.PI * 2) / 0.9;
      legs.forEach((leg, i) => (leg.rotation.x = walk * 0.38 * Math.sin(stride + (i === 0 || i === 3 ? 0 : Math.PI))));
      head.position.y = 1.0 + walk * 0.025 * Math.abs(Math.sin(stride));
      head.rotation.x += walk * 0.08 * Math.sin(stride * 2);
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
  'ancient.seatStone',
  'Pedra baixa de topo chato, para sentar: o banco dos anciãos no portão, a pedra do pastor no campo. Lugar "seat" no topo (params: height — altura do assento, 0,45 —, width, seed, color)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const height = Number(p.height ?? 0.45);
    const width = Number(p.width ?? 0.6);
    const color = String(p.color ?? STONES[Math.floor(rand() * STONES.length)]);
    const g = lumpGeo(rand, width / 2, 1.1, 1);
    g.computeBoundingBox();
    const box = g.boundingBox!;
    const pos = g.attributes.position;
    // Stretched to the seat's height and cut flat on top, where one sits.
    const scale = (height * 1.12) / (box.max.y - box.min.y);
    const bottom = box.min.y;
    for (let i = 0; i < pos.count; i++) pos.setY(i, Math.min(height, (pos.getY(i) - bottom) * scale - height * 0.06));
    pos.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    const stone = mesh(g, color);
    stone.rotation.y = rand() * 6;
    return group(stone, place('seat', 0, height, 0));
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

// ---------------------------------------------------------------------------------------------------------
// Sheep

/** A geometry in one color, kept as vertex colors so parts of different colors merge into one mesh. */
function painted(g: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  const c = new THREE.Color(color);
  const colors = new Float32Array(n.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) [colors[i], colors[i + 1], colors[i + 2]] = [c.r, c.g, c.b];
  n.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return n;
}

/** An ellipsoid of radii r·(sx, sy, sz) centered at `at`. */
const ball = (r: number, [sx, sy, sz]: [number, number, number], at: [number, number, number]) => new THREE.SphereGeometry(r, 14, 10).scale(sx, sy, sz).translate(...at);

/** The same geometry pushed out along its normals: the shell of a cel outline. */
function inflated(g: THREE.BufferGeometry, by: number): THREE.BufferGeometry {
  const shell = g.clone();
  const [pos, nor] = [shell.attributes.position, shell.attributes.normal];
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + nor.getX(i) * by, pos.getY(i) + nor.getY(i) * by, pos.getZ(i) + nor.getZ(i) * by);
  return shell;
}

/*
 * A sheep in its own frame: facing -z, hooves on y = 0, 0.75 m to the top of the back. Four rigid parts that
 * move: the woolly body, the head on its neck (turning at the chest), the two ears and the four legs.
 */
const NECK = v3(0, 0.46, -0.3);
const EAR = v3(0.072, 0.19, -0.255);
const HIPS: [number, number, number][] = [[-0.12, 0.34, -0.22], [0.12, 0.34, -0.22], [-0.12, 0.34, 0.26], [0.12, 0.34, 0.26]];

interface SheepShape { body: THREE.BufferGeometry; head: THREE.BufferGeometry; ear: THREE.BufferGeometry; leg: THREE.BufferGeometry }
const sheepShapes = new Map<string, SheepShape>();

/** The geometries of a sheep of these colors, built once and shared by every sheep and flock. */
function sheepShape(wool: string, face: string): SheepShape {
  const key = `${wool}|${face}`;
  let shape = sheepShapes.get(key);
  if (shape) return shape;
  const lumps = [ball(1, [0.27, 0.2, 0.38], [0, 0.5, 0.04]), ball(0.16, [1, 1, 0.9], [0, 0.5, -0.3]), ball(0.07, [1, 1.2, 1], [0, 0.56, 0.46])];
  for (const [z, r] of [[-0.24, 0.15], [-0.03, 0.16], [0.17, 0.16], [0.34, 0.13]]) lumps.push(ball(r, [1, 0.85, 1], [0, 0.6, z]));
  for (const s of [-1, 1]) for (const z of [-0.2, 0.06, 0.3]) lumps.push(ball(0.14, [0.9, 1, 1], [s * 0.16, 0.49, z]));
  const head = [
    painted(ball(0.13, [1, 1.05, 1.25], [0, 0.07, -0.08]), wool),
    painted(ball(1, [0.085, 0.095, 0.16], [0, 0, 0]).rotateX(-0.6).translate(0, 0.12, -0.34), face),
    painted(ball(0.075, [1.1, 0.8, 1.1], [0, 0.215, -0.27]), wool),
  ];
  for (const s of [-1, 1]) head.push(painted(ball(0.021, [1, 1, 1], [s * 0.07, 0.165, -0.37]), '#f4efe4'), painted(ball(0.012, [1, 1, 1], [s * 0.084, 0.166, -0.384]), '#141010'));
  shape = {
    body: mergeGeometries(lumps.map((g) => painted(g, wool))),
    head: mergeGeometries(head),
    // Pointing out along +x from where it joins the head.
    ear: painted(ball(1, [0.065, 0.016, 0.034], [0.055, 0, 0]), face),
    // Hanging from the hip, its tip on the ground.
    leg: painted(new THREE.CapsuleGeometry(0.034, 0.272, 4, 8).translate(0, -0.17, 0), face),
  };
  sheepShapes.set(key, shape);
  return shape;
}

/** What makes one sheep unlike the next: when it grazes, how big it is, the shade of its wool. */
interface SheepLife { phase: number; period: number; size: number; tint: THREE.Color }
function sheepLife(rand: () => number): SheepLife {
  const k = 0.9 + rand() * 0.14;
  return { phase: rand() * 40, period: 9 + rand() * 6, size: 0.9 + rand() * 0.18, tint: new THREE.Color(k, k * (0.97 + rand() * 0.03), k * (0.9 + rand() * 0.08)) };
}

const smooth01 = (u: number) => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

const [_q, _e, _p, _one, _part] = [new THREE.Quaternion(), new THREE.Euler(), new THREE.Vector3(), new THREE.Vector3(1, 1, 1), new THREE.Matrix4()];
/** base × a part placed at `at`, turned by the euler angles. */
const partAt = (out: THREE.Matrix4, base: THREE.Matrix4, at: THREE.Vector3, x: number, y: number, z: number, order: THREE.EulerOrder = 'XYZ') =>
  out.multiplyMatrices(base, _part.compose(at, _q.setFromEuler(_e.set(x, y, z, order)), _one));

/**
 * Where the parts of a sheep are at time t, written into `out` (body, head, right ear, left ear, four legs),
 * from `base` (where the sheep stands, which way it faces, its size). It grazes by itself: head down to the
 * grass nibbling, then up looking around; the ears flick now and then. `walk` (0 to 1) swings the legs, at
 * `stride` (radians of the step cycle).
 */
function poseSheep(out: THREE.Matrix4[], base: THREE.Matrix4, life: SheepLife, t: number, walk = 0, stride = 0): void {
  const { phase } = life;
  const u = (((t + phase) / life.period) % 1 + 1) % 1;
  const down = smooth01(u / 0.08) * (1 - smooth01((u - 0.62) / 0.1));
  const nibble = down * 0.06 * (0.5 + 0.5 * Math.sin(t * 8.5 + phase));
  const pitch = 0.12 * (1 - down) - 1.2 * down - nibble;
  const yaw = (1 - down) * 0.5 * Math.sin(t * 0.55 + phase * 1.7) + down * 0.12 * Math.sin(t * 0.8 + phase);
  out[0].copy(base);
  partAt(out[1], base, NECK, pitch, yaw, 0, 'YXZ');
  for (const [i, s] of [[2, 1], [3, -1]] as const) {
    const flick = Math.max(0, Math.sin(t * (1.1 + i * 0.17) + phase * (i + 2))) ** 14;
    // The left ear is the right one turned round: the same geometry, never mirrored.
    partAt(out[i], out[1], _p.set(s * EAR.x, EAR.y, EAR.z), 0, s > 0 ? -0.25 : Math.PI + 0.25, -0.35 + 0.55 * flick);
  }
  HIPS.forEach(([x, y, z], i) => {
    const swing = walk * 0.45 * Math.sin(stride + (i === 0 || i === 3 ? 0 : Math.PI));
    partAt(out[4 + i], base, _p.set(x, y, z), swing, 0, 0);
  });
}

const sheepMaterials = new Map<string, THREE.MeshStandardMaterial>();
/** The material of a sheep: its colors are in the geometry, `tint` shades them. */
function sheepMaterial(tint: string): THREE.MeshStandardMaterial {
  let m = sheepMaterials.get(tint);
  if (!m) sheepMaterials.set(tint, (m = new THREE.MeshStandardMaterial({ color: tint, vertexColors: true, roughness: 0.95, metalness: 0 })));
  return m;
}

const SHEEP_WOOL = '#eee6d3';
const SHEEP_FACE = '#3d322c';
/** Thickness of the outline the flock draws itself in cel (the style's own shells are not instanced). */
const FLOCK_OUTLINE = 0.01;
const outlineShell = new THREE.MeshBasicMaterial({ color: '#17131a', side: THREE.BackSide });

registerAsset(
  'ancient.sheep',
  'Ovelha de lã fofa, cara e pernas escuras, de frente para -z, 75 cm até o lombo. Pasta sozinha com o tempo: baixa a cabeça até o capim e mordisca, levanta e olha em volta, mexe as orelhas; cada `seed` pasta num ritmo seu e tem tamanho e tom de lã um pouco diferentes (params: seed, color — da lã —, face — da cara e das pernas)',
  (p) => {
    const life = sheepLife(rng(Number(p.seed ?? 1)));
    const shape = sheepShape(String(p.color ?? SHEEP_WOOL), String(p.face ?? SHEEP_FACE));
    const material = sheepMaterial(`#${life.tint.getHexString()}`);
    const parts = [shape.body, shape.head, shape.ear, shape.ear, ...HIPS.map(() => shape.leg)].map((geometry) => {
      const m = new THREE.Mesh(geometry, material);
      m.matrixAutoUpdate = false;
      return m;
    });
    const g = group(...parts);
    const base = new THREE.Matrix4().makeScale(life.size, life.size, life.size);
    const out = parts.map(() => new THREE.Matrix4());
    g.userData.animate = (t: number) => {
      poseSheep(out, base, life, t);
      parts.forEach((m, i) => {
        m.matrix.copy(out[i]);
        m.matrixWorldNeedsUpdate = true;
      });
    };
    g.userData.animate(0);
    return g;
  },
);

registerAsset(
  'ancient.flock',
  'Rebanho de ovelhas espalhado num retângulo (width × depth, centrado na origem). Cada ovelha pasta no seu ritmo e vai andando devagar pelo pasto, para e anda de novo, virando para onde vai e mexendo as pernas; nunca sai da área nem esbarra na outra. Pisa-se no meio delas. Barato: 30 ovelhas são quatro malhas (params: count — 14 —, width — 12 —, depth — 8 —, color — da lã —, face, seed)',
  (p) => {
    const count = Math.max(1, Math.round(Number(p.count ?? 14)));
    const width = Number(p.width ?? 12);
    const depth = Number(p.depth ?? 8);
    const rand = rng(Number(p.seed ?? 1));
    const shape = sheepShape(String(p.color ?? SHEEP_WOOL), String(p.face ?? SHEEP_FACE));
    const material = sheepMaterial('#ffffff');
    const g = group();
    const parts = ([[shape.body, 1], [shape.head, 1], [shape.ear, 2], [shape.leg, 4]] as const).map(([geometry, each]) => {
      const m = new THREE.InstancedMesh(geometry, material, count * each);
      // Instances move: the box of the whole mesh is not kept.
      m.frustumCulled = false;
      m.userData.noOutline = true;
      const shell = new THREE.InstancedMesh(inflated(geometry, FLOCK_OUTLINE), outlineShell, count * each);
      shell.instanceMatrix = m.instanceMatrix;
      shell.frustumCulled = false;
      shell.visible = false;
      shell.userData.noShadow = shell.userData.noOutline = true;
      g.add(m, shell);
      return { mesh: m, shell, each };
    });
    // Each sheep wanders in a cell of its own, so two never meet: a grid over the area, cells taken at random.
    const cols = Math.max(1, Math.min(count, Math.round(Math.sqrt((count * width) / depth))));
    const rows = Math.ceil(count / cols);
    const cells = Array.from({ length: cols * rows }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const [cw, cd] = [width / cols, depth / rows];
    const flock = Array.from({ length: count }, (_, i) => {
      const [c, r] = [cells[i] % cols, Math.floor(cells[i] / cols)];
      // How far it may stray from the middle of its cell, keeping the whole body inside.
      const [ax, az] = [Math.max(0, cw / 2 - 0.65), Math.max(0, cd / 2 - 0.65)];
      const [f1, f2] = [0.6 + rand() * 0.5, 0.6 + rand() * 0.5];
      const reach = Math.hypot(ax * f1, az * f2);
      return {
        life: sheepLife(rand),
        home: [-width / 2 + (c + 0.5) * cw, -depth / 2 + (r + 0.5) * cd],
        ax, az, f1, f2, reach,
        a1: rand() * Math.PI * 2,
        a2: rand() * Math.PI * 2,
        // A walk cycle of `cycle` seconds: it stops, sets off, walks and slows down again. `k` keeps the top speed near 0.25 m/s.
        cycle: 14 + rand() * 10,
        psi: rand() * Math.PI * 2,
        k: reach > 0.01 ? 0.25 / (4 * reach) : 0,
        heading: rand() * Math.PI * 2,
      };
    });
    const tint = new THREE.Color();
    flock.forEach((s, i) => {
      for (const { mesh, each } of parts) for (let j = 0; j < each; j++) mesh.setColorAt(i * each + j, tint.copy(s.life.tint));
    });
    const out = Array.from({ length: 8 }, () => new THREE.Matrix4());
    const base = new THREE.Matrix4();
    const [at, scale, turn] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Quaternion()];
    const up = v3(0, 1, 0);
    g.userData.followsGround = true;
    g.userData.animate = (t: number) => {
      flock.forEach((s, i) => {
        // How far along its path: a pure function of t, so any frame can be drawn on its own.
        const x = (2 * Math.PI * t) / s.cycle + s.psi;
        const along = ((s.k * s.cycle) / (2 * Math.PI)) * (1.5 * x - 2 * Math.sin(x) + 0.25 * Math.sin(2 * x));
        const rate = s.k * (1 - Math.cos(x)) ** 2;
        const [c1, c2] = [Math.cos(along * s.f1 + s.a1), Math.cos(along * s.f2 + s.a2)];
        const [dx, dz] = [s.ax * s.f1 * c1, s.az * s.f2 * c2];
        const speed = Math.hypot(dx, dz) * rate;
        const walk = Math.min(1, speed / 0.12);
        const stride = ((along * s.reach * 0.7) / 0.5) * Math.PI * 2;
        const heading = s.reach > 0.01 ? Math.atan2(-dx, -dz) : s.heading;
        at.set(s.home[0] + s.ax * Math.sin(along * s.f1 + s.a1), 0.012 * walk * Math.abs(Math.sin(stride)), s.home[1] + s.az * Math.sin(along * s.f2 + s.a2));
        // On a hillside, each sheep stands on the ground under it (the location gives the height; see build.ts).
        at.y += (g.userData.ground as ((x: number, z: number) => number) | undefined)?.(at.x, at.z) ?? 0;
        base.compose(at, turn.setFromAxisAngle(up, heading), scale.setScalar(s.life.size));
        poseSheep(out, base, s.life, t, walk, stride);
        parts[0].mesh.setMatrixAt(i, out[0]);
        parts[1].mesh.setMatrixAt(i, out[1]);
        for (let j = 0; j < 2; j++) parts[2].mesh.setMatrixAt(i * 2 + j, out[2 + j]);
        for (let j = 0; j < 4; j++) parts[3].mesh.setMatrixAt(i * 4 + j, out[4 + j]);
      });
      for (const { mesh, shell } of parts) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.boundingBox = mesh.boundingSphere = null;
        // The outline shows only when the style has turned the sheep to cel.
        shell.visible = mesh.material instanceof THREE.MeshToonMaterial;
      }
    };
    g.userData.animate(0);
    g.userData.passable = true;
    return g;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Lamps

/** A clay oil lamp with its flame, the spout toward -z; with intensity > 0, a warm light that flickers with it. */
function oilLamp(p: Record<string, number | string>): THREE.Group {
  const color = String(p.color ?? '#b5704a');
  const intensity = Number(p.intensity ?? 0);
  const phase = rng(Number(p.seed ?? 1))() * 10;
  // A round saucer, pinched at the front into a spout and with its rim folded up there.
  const body = lathe([[0.001, 0], [0.03, 0], [0.048, 0.012], [0.052, 0.026], [0.046, 0.033], [0.038, 0.026], [0.03, 0.02], [0.001, 0.019]], 32);
  body.deleteAttribute('normal');
  body.deleteAttribute('uv');
  const clay = mergeVertices(body);
  const pos = clay.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const r = Math.hypot(x, z);
    const f = r > 1e-4 ? Math.max(0, -z / r) ** 5 : 0;
    pos.setXYZ(i, x * (1 - 0.55 * f), y + f * (y / 0.033) * 0.006, z - f * (r / 0.05) * 0.045);
  }
  clay.computeVertexNormals();
  const tip = v3(0, 0.032, -0.088);
  // The oil, the handle at the back and the wick lying in the spout: too small for an outline.
  const small = [
    mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.002, 18), '#3a2a1a', [0, 0.024, 0]),
    mesh(new THREE.TorusGeometry(0.014, 0.005, 6, 12, Math.PI * 1.3).rotateY(Math.PI / 2).rotateX(-0.6), color, [0, 0.028, 0.05]),
    rod(v3(0, 0.026, -0.05), tip, 0.0035, '#2a211c'),
  ];
  for (const m of small) m.userData.noOutline = true;
  const lamp = group(mesh(clay, color), ...small);
  // The flame: an orange drop round a pale core, both their own light.
  const drop = (r: number, h: number) => lathe([[0, 0], [r * 0.7, h * 0.12], [r, h * 0.33], [r * 0.6, h * 0.66], [0.0005, h]], 10);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), flameMaterial('#ffa040', 0.07));
  glow.position.y = 0.03;
  const flame = group(new THREE.Mesh(tongue(0.014, 0.07), flameMaterial('#ff8a2a', 0.8)), new THREE.Mesh(tongue(0.009, 0.045), flameMaterial('#ffd36b', 0.9)), new THREE.Mesh(drop(0.0055, 0.024), new THREE.MeshBasicMaterial({ color: '#fff6d0' })), glow);
  flame.traverse((o) => void (o.userData.noOutline = true));
  flame.position.copy(tip).add(v3(0, 0.002, 0));
  flame.traverse((o) => void (o.userData.noShadow = true));
  lamp.add(flame);
  const light = intensity > 0 ? new THREE.PointLight('#ffb062', intensity, Number(p.range ?? 6), 2) : undefined;
  if (light) {
    light.position.copy(tip).add(v3(0, 0.07, 0));
    if (Number(p.shadow ?? 0) > 0) {
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
      light.shadow.camera.near = 0.03;
      light.shadow.bias = -0.002;
    }
    lamp.add(light);
  }
  lamp.scale.setScalar(Number(p.size ?? 1));
  const g = group(lamp);
  g.userData.animate = (t: number) => {
    const k = 1 + 0.16 * Math.sin(t * 13 + phase) + 0.08 * Math.sin(t * 29.7 + phase * 2);
    flame.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
    flame.rotation.set(0.1 * Math.sin(t * 3.1 + phase), 0, 0.12 * Math.sin(t * 4.3 + phase));
    if (light) light.intensity = intensity * (0.88 + 0.08 * Math.sin(t * 13 + phase) + 0.04 * Math.sin(t * 29.7 + phase * 2));
  };
  g.userData.animate(0);
  return g;
}

registerAsset(
  'ancient.oilLamp',
  'Candeia de barro: pires com o bico beliscado para a frente (-z), pavio e chama que tremula sozinha (13 cm). Com `intensity` maior que 0 acende uma luz quente de verdade, de alcance curto (6 m), para interior à noite; `shadow: 1` faz essa luz projetar sombra (mais caro) (params: intensity, shadow, range, size — escala —, color — do barro —, seed)',
  (p) => oilLamp(p),
);

registerAsset(
  'ancient.lampStand',
  'Candeia acesa num suporte. `kind`: "wood" (pé de madeira de três pernas, 1,1 m), "stone" (coluna baixa de pedra, 90 cm) ou "shelf" (prateleira de parede com mão-francesa: costas em z = 0, olha para +z; a origem é o tampo, ponha na altura com `y`). Mesma luz da `ancient.oilLamp` (params: kind, intensity, shadow, range, color — da madeira ou da pedra —, seed)',
  (p) => {
    const kind = String(p.kind ?? 'wood');
    const g = group();
    let top = 0;
    let turn = 0;
    if (kind === 'stone') {
      const color = String(p.color ?? STONE);
      top = 0.9;
      g.add(mesh(lathe([[0.001, 0], [0.2, 0], [0.2, 0.08], [0.15, 0.12], [0.11, 0.16], [0.1, 0.78], [0.13, 0.82], [0.16, 0.86], [0.16, top], [0.001, top]], 18), color));
    } else if (kind === 'shelf') {
      const color = String(p.color ?? WOOD);
      g.add(rbox(0.4, 0.035, 0.22, color, [0, -0.0175, 0.11], 0.008));
      for (const x of [-0.14, 0.14]) {
        g.add(rbox(0.03, 0.2, 0.03, shade(color, 0.8), [x, -0.135, 0.015], 0.006), rod(v3(x, -0.21, 0.025), v3(x, -0.03, 0.18), 0.012, shade(color, 0.8)));
      }
      turn = Math.PI;
    } else {
      const color = String(p.color ?? WOOD_DARK);
      top = 1.1;
      const legs = [0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.3;
        return rodGeo(v3(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24), v3(Math.cos(a) * 0.03, 0.3, Math.sin(a) * 0.03), 0.018, 0.022, 7);
      });
      g.add(merged(legs, color, true), mesh(new THREE.CylinderGeometry(0.025, 0.03, top - 0.25, 10), color, [0, 0.25 + (top - 0.25) / 2, 0]));
      g.add(mesh(lathe([[0.001, 0], [0.04, 0], [0.11, 0.025], [0.12, 0.035], [0.001, 0.03]], 18), color, [0, top - 0.035, 0]));
    }
    const lamp = oilLamp(p);
    lamp.position.set(0, top, kind === 'shelf' ? 0.12 : 0);
    lamp.rotation.y = turn;
    g.add(lamp);
    g.userData.animate = lamp.userData.animate;
    return g;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Cattle

registerAsset(
  'ancient.heifer',
  'Novilha (vaca nova), de frente para -z, 1,2 m na cernelha, com cabresto. Mexe a cauda, as orelhas e a cabeça sozinha com o tempo. `rope: 1` põe a corda de puxar pendurada do cabresto até o chão, para alguém levar pelo caminho (`moveTo`) (params: color — do pelo, castanho claro —, rope, seed)',
  (p) => {
    const color = String(p.color ?? '#b98a5a');
    const light = '#ead7bb';
    const dark = '#352a24';
    const g = group(mesh(new THREE.CapsuleGeometry(0.33, 0.85, 6, 16).rotateX(Math.PI / 2), color, [0, 0.9, 0.05]));
    // Legs with dark hooves; shoulders and haunches; the pale belly.
    for (const [x, z] of [[-0.17, -0.42], [0.17, -0.42], [-0.17, 0.5], [0.17, 0.5]]) {
      g.add(rod(v3(x, 0.08, z), v3(x, 0.82, z), 0.06, color, 0.1), mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.09, 10), dark, [x, 0.045, z]));
    }
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.2, 12, 10).scale(0.8, 1, 1), color, [s * 0.14, 0.92, 0.5]), mesh(new THREE.SphereGeometry(0.19, 12, 10).scale(0.8, 1.05, 1), color, [s * 0.13, 0.95, -0.42]));
    g.add(mesh(new THREE.CapsuleGeometry(0.22, 0.6, 4, 12).rotateX(Math.PI / 2), light, [0, 0.72, 0.05]));
    // Neck and head turn together from the shoulders.
    const head = new THREE.Group();
    head.position.set(0, 1.0, -0.55);
    const skull = new THREE.CapsuleGeometry(0.13, 0.24, 6, 12);
    skull.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), v3(0, -0.75, -1).normalize()));
    head.add(
      rod(v3(0, -0.08, 0.1), v3(0, 0.16, -0.25), 0.22, color, 0.15),
      mesh(skull, color, [0, 0.13, -0.42]),
      mesh(new THREE.SphereGeometry(0.115, 12, 10).scale(1.05, 0.85, 0.9), light, [0, 0.0, -0.58]),
      // The dewlap under the throat.
      mesh(new THREE.SphereGeometry(0.1, 10, 8).scale(0.6, 1.3, 1.2), color, [0, -0.08, -0.2]),
    );
    for (const s of [-1, 1]) {
      head.add(mesh(new THREE.SphereGeometry(0.02, 8, 6), '#141010', [s * 0.11, 0.21, -0.43]), mesh(new THREE.SphereGeometry(0.016, 8, 6), '#4a3030', [s * 0.04, -0.02, -0.68]));
      // Two small horn buds: she is young.
      head.add(mesh(new THREE.ConeGeometry(0.022, 0.06, 8).rotateZ(-s * 0.5), '#e2d6bd', [s * 0.07, 0.3, -0.32]));
    }
    const ears = [-1, 1].map((s) => {
      const ear = new THREE.Group();
      ear.position.set(s * 0.12, 0.25, -0.3);
      ear.add(mesh(new THREE.SphereGeometry(1, 10, 8).scale(0.09, 0.025, 0.05).translate(s * 0.08, 0, 0), color));
      ear.rotation.z = s * -0.25;
      head.add(ear);
      return ear;
    });
    // The halter: a band round the nose and one behind the ears, a ring under the chin.
    const halter: THREE.BufferGeometry[] = [new THREE.TorusGeometry(0.125, 0.012, 5, 18).rotateX(1.25).translate(0, 0.03, -0.53), new THREE.TorusGeometry(0.15, 0.012, 5, 18).rotateY(Math.PI / 2).rotateZ(Math.PI / 2).rotateX(-0.25).translate(0, 0.17, -0.3)];
    for (const s of [-1, 1]) halter.push(rodGeo(v3(s * 0.12, 0.06, -0.53), v3(s * 0.145, 0.2, -0.32), 0.011, 0.011, 5));
    head.add(merged(halter, '#7a3b2a', true), mesh(new THREE.TorusGeometry(0.025, 0.007, 5, 12), BRONZE, [0, -0.1, -0.5]));
    if (Number(p.rope ?? 0) > 0) {
      // From the ring it hangs in a curve to the ground and lies there a little way forward.
      const ground = -head.position.y;
      const curve = new THREE.CatmullRomCurve3([v3(0, -0.12, -0.5), v3(0.02, -0.5, -0.62), v3(0.05, ground + 0.25, -0.72), v3(0.08, ground + 0.015, -0.9), v3(0.14, ground + 0.015, -1.25)]);
      const rope = mesh(new THREE.TubeGeometry(curve, 24, 0.011, 5), ROPE);
      rope.userData.noOutline = true;
      head.add(rope);
    }
    g.add(head);
    const tail = new THREE.Group();
    tail.position.set(0, 1.08, 0.82);
    tail.add(rod(v3(0, 0, 0), v3(0, -0.7, 0.05), 0.022, color), mesh(new THREE.SphereGeometry(0.05, 8, 8).scale(1, 2, 1), dark, [0, -0.76, 0.055]));
    g.add(tail);
    const phase = rng(Number(p.seed ?? 1))() * 10;
    g.userData.animate = (t: number) => {
      tail.rotation.z = 0.3 * Math.sin(t * 1.7 + phase) * Math.max(0, Math.sin(t * 0.4 + phase));
      tail.rotation.x = 0.06 * Math.sin(t * 0.9 + phase);
      head.rotation.x = 0.07 * Math.sin(t * 0.7 + phase);
      head.rotation.y = 0.1 * Math.sin(t * 0.23 + phase);
      ears.forEach((ear, i) => (ear.rotation.x = 0.5 * Math.max(0, Math.sin(t * (1.2 + i * 0.35) + phase * (i + 1))) ** 8));
    };
    g.userData.animate(0);
    return g;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Palace

/** Flame material: its own light, see-through at the edges and adding up where flames cross, like real fire. */
const flameMaterials = new Map<string, THREE.MeshBasicMaterial>();
function flameMaterial(color: string, opacity: number): THREE.MeshBasicMaterial {
  const key = `${color}/${opacity}`;
  let m = flameMaterials.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    flameMaterials.set(key, m);
  }
  return m;
}

/** A tongue of flame: a drop, wide low down and drawn up to a point, a little twisted. */
function tongue(r: number, h: number): THREE.BufferGeometry {
  const g = lathe([[0.0005, 0], [r * 0.75, h * 0.08], [r, h * 0.24], [r * 0.86, h * 0.45], [r * 0.5, h * 0.7], [r * 0.18, h * 0.9], [0.0005, h]], 10);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / h;
    const a = y * 1.4;
    const [x, z] = [pos.getX(i), pos.getZ(i)];
    pos.setXYZ(i, x * Math.cos(a) - z * Math.sin(a) + y * y * r * 0.4, pos.getY(i), x * Math.sin(a) + z * Math.cos(a));
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A fire that lives by itself: tongues of flame in three colors (deep orange outside, yellow, a pale core), each
 * licking up and swaying on its own, a soft glow round it and sparks that rise and go out. Stands on y = 0 of
 * its group, `size` across.
 */
function flickeringFire(rand: () => number, size: number): { fire: THREE.Group; update(t: number): void } {
  const fire = group();
  const flames: { mesh: THREE.Mesh; phase: number; speed: number }[] = [];
  const layers: [number, number, string, number, number][] = [
    [0.42, 1.0, '#ff5a14', 0.55, 6],
    [0.3, 0.85, '#ff8a1e', 0.7, 5],
    [0.2, 0.6, '#ffc23d', 0.85, 4],
    [0.11, 0.38, '#fff0b0', 1, 2],
  ];
  for (const [r, h, color, opacity, count] of layers) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand();
      const off = count > 2 ? r * 0.55 : r * 0.2;
      const f = new THREE.Mesh(tongue(r * size * (0.75 + rand() * 0.4), h * size * (0.7 + rand() * 0.5)), flameMaterial(color, opacity));
      f.position.set(Math.cos(a) * off * size, 0, Math.sin(a) * off * size);
      f.userData.noShadow = true;
      f.userData.noOutline = true;
      flames.push({ mesh: f, phase: rand() * 10, speed: 0.8 + rand() * 0.6 });
      fire.add(f);
    }
  }
  // The glow of the fire in the air round it.
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.7 * size, 16, 10), flameMaterial('#ff6a1a', 0.05));
  halo.position.y = 0.45 * size;
  halo.userData.noShadow = halo.userData.noOutline = true;
  fire.add(halo);
  // Sparks rising, each on its own loop.
  const sparkGeo = new THREE.OctahedronGeometry(0.012 * size + 0.006, 0);
  const sparks = Array.from({ length: 14 }, () => {
    const m = new THREE.Mesh(sparkGeo, flameMaterial('#ffb347', 1));
    m.userData.noShadow = m.userData.noOutline = true;
    fire.add(m);
    return { m, phase: rand(), period: 1.4 + rand() * 1.2, a: rand() * Math.PI * 2, r: rand() * 0.3 * size };
  });
  const update = (t: number) => {
    for (const { mesh, phase, speed } of flames) {
      const k = 1 + 0.22 * Math.sin(t * 9 * speed + phase) + 0.12 * Math.sin(t * 17.3 * speed + phase * 2) + 0.06 * Math.sin(t * 31 + phase * 3);
      mesh.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
      mesh.rotation.set(0.16 * Math.sin(t * 4.3 * speed + phase), t * 1.1 * speed + phase, 0.16 * Math.sin(t * 5.7 * speed + phase));
    }
    halo.scale.setScalar(1 + 0.08 * Math.sin(t * 7.1) + 0.04 * Math.sin(t * 13.3));
    for (const sp of sparks) {
      const u = ((t / sp.period + sp.phase) % 1 + 1) % 1;
      sp.m.position.set(Math.cos(sp.a + u * 3) * (sp.r + u * 0.15 * size), u * 1.9 * size, Math.sin(sp.a + u * 3) * (sp.r + u * 0.15 * size));
      sp.m.scale.setScalar(1 - u);
      sp.m.visible = u < 0.95;
    }
  };
  update(0);
  return { fire, update };
}

/** The warm light of a fire, when `intensity` > 0; `shadow: 1` makes it cast shadows. */
function fireLight(p: Record<string, number | string>, range: number): THREE.PointLight | undefined {
  const intensity = Number(p.intensity ?? 0);
  if (intensity <= 0) return undefined;
  const light = new THREE.PointLight('#ffa257', intensity, Number(p.range ?? range), 2);
  if (Number(p.shadow ?? 0) > 0) {
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = 0.05;
    light.shadow.bias = -0.002;
  }
  return light;
}

const flickerLight = (light: THREE.PointLight | undefined, intensity: number, t: number, phase: number) => {
  if (light) light.intensity = intensity * (0.85 + 0.1 * Math.sin(t * 11 + phase) + 0.05 * Math.sin(t * 23.3 + phase));
};

registerAsset(
  'ancient.wallTorch',
  'Tocha num suporte de ferro preso na parede: costas em z = 0, olha para +z, a tocha inclinada para fora com a chama tremendo sozinha. A origem é o pé da tocha: ponha na altura com `y` (1,6 m numa sala). Com `intensity` maior que 0 ilumina de verdade, quente e tremendo (alcance 8 m; `shadow: 1` para sombra) (params: intensity, shadow, range, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const iron = '#3b3836';
    const g = group();
    // The plate on the wall and the arm holding a ring round the torch.
    const ring = v3(0, 0.28, 0.13);
    g.add(rbox(0.07, 0.22, 0.016, iron, [0, 0.22, 0.008], 0.006));
    const arms = [rodGeo(v3(0, 0.3, 0.012), ring.clone().add(v3(0, 0.0, -0.035)), 0.009, 0.009, 6), rodGeo(v3(0, 0.15, 0.012), v3(0, 0.25, 0.1), 0.008, 0.008, 6), new THREE.TorusGeometry(0.035, 0.008, 6, 14).rotateX(Math.PI / 2).translate(ring.x, ring.y, ring.z)];
    g.add(merged(arms, iron));
    // The torch, leaning out from the wall, its head wrapped in pitch-soaked cloth.
    const foot = v3(0, 0.0, 0.06);
    const dir = ring.clone().sub(foot).normalize();
    const head = foot.clone().addScaledVector(dir, 0.52);
    g.add(rod(foot, head, 0.018, WOOD_DARK, 0.024), rod(head.clone().addScaledVector(dir, -0.09), head.clone().addScaledVector(dir, 0.03), 0.04, '#2d241f', 0.045));
    const { fire, update } = flickeringFire(rand, 0.17);
    fire.position.copy(head).addScaledVector(dir, 0.015);
    g.add(fire);
    const light = fireLight(p, 8);
    if (light) {
      light.position.copy(head).add(v3(0, 0.22, 0.08));
      g.add(light);
    }
    const intensity = Number(p.intensity ?? 0);
    const phase = rand() * 10;
    g.userData.animate = (t: number) => {
      update(t);
      flickerLight(light, intensity, t, phase);
    };
    return g;
  },
);

registerAsset(
  'ancient.brazier',
  'Braseiro: bacia de bronze sobre três pernas (85 cm até a borda), cheia de brasas, com fogo que treme sozinho. Com `intensity` maior que 0 ilumina de verdade, quente e tremendo (alcance 9 m; `shadow: 1` para sombra) (params: intensity, shadow, range, size — escala —, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const bronze = new THREE.MeshStandardMaterial({ color: BRONZE, roughness: 0.45, metalness: 0.45 });
    const g = group();
    const rim = 0.85;
    const bowl = new THREE.Mesh(lathe([[0.001, rim - 0.2], [0.12, rim - 0.2], [0.27, rim - 0.1], [0.33, rim - 0.01], [0.35, rim], [0.32, rim + 0.005], [0.29, rim - 0.02], [0.001, rim - 0.06]], 24), bronze);
    g.add(bowl);
    const legs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      legs.push(rodGeo(v3(c * 0.3, 0.04, s * 0.3), v3(c * 0.2, rim - 0.12, s * 0.2), 0.022, 0.018, 8), new THREE.SphereGeometry(0.04, 10, 8).scale(1, 0.7, 1).translate(c * 0.3, 0.028, s * 0.3));
    }
    legs.push(new THREE.TorusGeometry(0.22, 0.01, 6, 24).rotateX(Math.PI / 2).translate(0, 0.32, 0));
    const legMesh = new THREE.Mesh(merge(legs), bronze);
    g.add(legMesh);
    // Coals heaped in the bowl, glowing, and the fire on them.
    const coals = new THREE.Mesh(merge(Array.from({ length: 14 }, () => new THREE.IcosahedronGeometry(0.045 + rand() * 0.03, 0).translate((rand() - 0.5) * 0.4, rim - 0.035 + rand() * 0.03, (rand() - 0.5) * 0.4))), new THREE.MeshBasicMaterial({ color: '#ff5a1a' }));
    coals.userData.noShadow = true;
    const { fire, update } = flickeringFire(rand, 0.42);
    fire.position.y = rim - 0.03;
    g.add(coals, fire);
    const light = fireLight(p, 9);
    if (light) {
      light.position.set(0, rim + 0.45, 0);
      g.add(light);
    }
    g.scale.setScalar(Number(p.size ?? 1));
    const intensity = Number(p.intensity ?? 0);
    const phase = rand() * 10;
    g.userData.animate = (t: number) => {
      update(t);
      flickerLight(light, intensity, t, phase);
    };
    return g;
  },
);

registerAsset(
  'ancient.throne',
  'Trono de madeira da Idade do Ferro, de frente para -z: espaldar alto com crista, braços entalhados terminando em volutas, pés de pata, almofada e um escabelo (banquinho de pés) na frente. Assento `throne` para `sit` (params: color — da madeira —, trim — dos detalhes, dourado —, cushion — cor da almofada)',
  (p) => {
    const wood = String(p.color ?? '#6e4a2e');
    const trim = String(p.trim ?? '#c99a3e');
    const cloth = String(p.cushion ?? '#8e2f36');
    const [w, d, seat] = [0.66, 0.56, 0.5];
    const g = group();
    // Seat box with a band of trim, on four legs ending in paws.
    g.add(rbox(w, 0.08, d, wood, [0, seat - 0.04, 0], 0.02), rbox(w + 0.01, 0.025, d + 0.01, trim, [0, seat - 0.075, 0], 0.008));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const [px, pz] = [x * (w / 2 - 0.05), z * (d / 2 - 0.05)];
      g.add(rbox(0.07, seat - 0.1, 0.07, wood, [px, (seat - 0.1) / 2 + 0.04, pz], 0.02), mesh(new THREE.SphereGeometry(0.055, 12, 8).scale(1, 0.75, 1.25), shade(wood, 0.85), [px, 0.04, pz - 0.015]));
    }
    // The tall back with a rounded crest and a trim panel.
    const backH = 1.35;
    g.add(rbox(w, backH - seat, 0.07, wood, [0, seat + (backH - seat) / 2, d / 2 - 0.035], 0.025));
    const crest = 0.15;
    const arch = Array.from({ length: 17 }, (_, i): [number, number] => [Math.cos((i / 16) * Math.PI) * (w / 2), Math.sin((i / 16) * Math.PI) * crest]);
    g.add(mesh(prismGeo(arch, 0.05), wood, [0, backH - 0.03, d / 2 - 0.035]));
    g.add(rbox(w * 0.62, (backH - seat) * 0.62, 0.02, trim, [0, seat + (backH - seat) * 0.52, d / 2 - 0.075], 0.01));
    g.add(mesh(new THREE.SphereGeometry(0.045, 12, 10), trim, [0, backH + crest - 0.01, d / 2 - 0.035]));
    // Arms: a solid panel each side, a rail with a scroll at the front and a knob.
    const armH = seat + 0.26;
    for (const s of [-1, 1]) {
      const x = s * (w / 2 - 0.02);
      g.add(
        mesh(sidePrismGeo([[-d / 2 + 0.06, seat], [d / 2 - 0.05, seat], [d / 2 - 0.05, armH], [-d / 2 + 0.12, armH], [-d / 2 + 0.06, armH - 0.08]], 0.05), wood, [x, 0, 0]),
        rbox(0.09, 0.05, d, shade(wood, 1.1), [x, armH + 0.02, 0.01], 0.02),
        mesh(new THREE.TorusGeometry(0.055, 0.022, 8, 16, Math.PI * 1.5).rotateY(Math.PI / 2), trim, [x, armH - 0.03, -d / 2 + 0.03]),
        mesh(new THREE.SphereGeometry(0.035, 10, 8), trim, [x, armH + 0.06, -d / 2 + 0.02]),
      );
    }
    // The cushion and the footstool in front.
    g.add(rbox(w - 0.14, 0.07, d - 0.1, cloth, [0, seat + 0.035, -0.03], 0.03));
    g.add(rbox(0.56, 0.13, 0.3, wood, [0, 0.065, -d / 2 - 0.2], 0.02), rbox(0.57, 0.02, 0.31, trim, [0, 0.12, -d / 2 - 0.2], 0.006));
    g.add(place('throne', 0, seat + 0.07, -0.02));
    return g;
  },
);

registerAsset(
  'ancient.column',
  'Coluna grossa de pedra rebocada, com base em degraus e capitel largo de volutas (diâmetro 60 cm) (params: height — 4,5 —, radius — 0,3 —, color — do reboco —, trim — da base e do capitel)',
  (p) => {
    const h = Number(p.height ?? 4.5);
    const r = Number(p.radius ?? 0.3);
    const color = String(p.color ?? '#e6d8bc');
    const trim = String(p.trim ?? shade(STONE, 0.95));
    const g = group();
    // A slight swelling of the shaft, wider at the foot.
    const shaft = lathe([[0.001, 0.2], [r * 1.04, 0.2], [r, h * 0.45], [r * 0.93, h - 0.3], [0.001, h - 0.3]], 24);
    g.add(mesh(shaft, color));
    g.add(rbox(r * 2.7, 0.12, r * 2.7, trim, [0, 0.06, 0], 0.03), mesh(new THREE.CylinderGeometry(r * 1.2, r * 1.25, 0.1, 24), trim, [0, 0.17, 0]));
    // The capital: a ring, a flaring bell, the volutes and the square slab on top.
    g.add(mesh(new THREE.TorusGeometry(r * 0.96, 0.03, 8, 24).rotateX(Math.PI / 2), trim, [0, h - 0.3, 0]));
    g.add(mesh(lathe([[0.001, 0], [r * 0.95, 0], [r * 1.25, 0.12], [r * 1.35, 0.18], [0.001, 0.18]], 24), trim, [0, h - 0.3, 0]));
    for (const s of [-1, 1]) for (const z of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.075, 0.03, 8, 16).rotateY(Math.PI / 2), trim, [s * r * 1.15, h - 0.17, z * r * 0.7]));
    g.add(rbox(r * 2.9, 0.12, r * 2.9, trim, [0, h - 0.06, 0], 0.025));
    return g;
  },
);

// ---------------------------------------------------------------------------------------------------------
// The house (Jesse's house in Bethlehem): mud plaster over fieldstone, rough posts, pottery, baskets, cloth
//
// Wall pieces (bench, shelf, cloth, niche, ladder) have their back at z = 0 and face +z, like the lamp shelf
// and the torch. Hanging things (cloth, herbs) have their origin where they hang from: the episode sets the
// height with the prop's `y`. Furniture to sit on faces -z, like the throne.

const MUD = '#cfb089';
const POTTERY = ['#b5684a', '#a85f42', '#c27d55', '#9a5a40', '#b97a5a', '#c99470', '#8e5940'];
const WICKER = ['#c49a5c', '#b88c50', '#cfa96b'];
const RUSH = '#c9ab6a';
const OLD_WOOD = '#9c8a72';
const pickOf = <T>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length)];

/**
 * A block of mud brick under plaster, w × h × d, centered on the origin: its edges rounded by hand and its faces
 * not quite flat. The back (-z) and the bottom stay flat and square, to stand against a wall on the floor.
 */
function mudBlockGeo(rand: () => number, w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  // A plain geometry, not a box: the style takes boxes for flat walls and leaves them without cel and outline.
  let g = new THREE.BufferGeometry().copy(new THREE.BoxGeometry(w, h, d, Math.ceil(w / 0.09), Math.ceil(h / 0.09), Math.ceil(d / 0.09)));
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position;
  const ph = Array.from({ length: 4 }, () => rand() * 6);
  const clamp = THREE.MathUtils.clamp;
  const [p, inner, out] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    // Rounded over the top, the front and the ends; square at the bottom and at the back.
    inner.set(clamp(p.x, -w / 2 + r, w / 2 - r), clamp(p.y, -h / 2, h / 2 - r), clamp(p.z, -d / 2, d / 2 - r));
    out.copy(p).sub(inner);
    const reach = out.length();
    if (reach < 1e-6) continue;
    const keep = Math.min(1, (p.z + d / 2) / 0.1) * Math.min(1, (p.y + h / 2) / 0.1);
    const bump = 0.011 * (Math.sin(p.x * 4.1 + ph[0]) * Math.sin(p.y * 6.3 + ph[1]) + 0.6 * Math.sin(p.x * 9.7 + p.z * 5 + ph[2]) + 0.4 * Math.sin(p.x * 2.3 + ph[3])) * keep;
    p.copy(inner).addScaledVector(out.normalize(), Math.min(reach, r) + bump);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeVertexNormals();
  return g;
}

registerAsset(
  'ancient.mudBench',
  'Banco baixo de barro (tijolo de barro rebocado) encostado na parede, de bordas arredondadas e irregulares, feito à mão, com pedras aparecendo no pé. Costas em z = 0, a frente olha para +z: ponha rente à parede. Assentos `seat1`, `seat2`, ... a cada ~0,6 m ao longo dele (quem senta olha para +z, para fora da parede) e `top` no meio, para pôr coisas (params: length — 2 —, height — 0,42 —, depth — 0,45 —, color — do reboco —, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const length = Number(p.length ?? 2);
    const h = Number(p.height ?? 0.42);
    const d = Number(p.depth ?? 0.45);
    const color = String(p.color ?? MUD);
    // A little sunk into the floor, as if built up from it.
    const g = group(mesh(mudBlockGeo(rand, length, h + 0.02, d, Math.min(0.07, h / 4)).translate(0, (h + 0.02) / 2 - 0.02, d / 2), color));
    // The fieldstones of its core, showing at the foot where the plaster has worn away.
    const stones: THREE.BufferGeometry[] = [];
    for (let i = 0; i < Math.max(2, Math.round(length * 1.5)); i++) {
      stones.push(lumpGeo(rand, 0.045 + rand() * 0.03, 0.6, 0).translate((rand() - 0.5) * (length - 0.3), 0.04 + rand() * 0.07, d - 0.012));
    }
    g.add(merged(stones, '#a99c86', true));
    const n = Math.max(1, Math.round(length / 0.6));
    for (let i = 0; i < n; i++) g.add(place(`seat${i + 1}`, -length / 2 + ((i + 0.5) * length) / n, h, d * 0.55, 180));
    g.add(place('top', 0, h, d / 2));
    return g;
  },
);

registerAsset(
  'ancient.stool',
  'Banquinho baixo de assento de palha trançada (35 cm): quatro pés de madeira com travessas e o assento de tiras de palha em quadrados um dentro do outro, com o X das emendas. De frente para -z como os móveis. Assento `seat` (params: height — 0,35 —, width — 0,36 —, color — da madeira)',
  (p) => {
    const h = Number(p.height ?? 0.35);
    const s = Number(p.width ?? 0.36);
    const wood = String(p.color ?? '#a88a68');
    const g = group();
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [x * (s / 2 - 0.022), z * (s / 2 - 0.022)]);
    for (const [x, z] of corners) g.add(rbox(0.036, h - 0.004, 0.036, wood, [x, (h - 0.004) / 2, z], 0.008));
    // Stretchers between the legs: lower ones front and back, higher ones at the sides, as a chair maker does.
    const bars: THREE.BufferGeometry[] = [];
    for (const z of [-1, 1]) bars.push(rodGeo(v3(-s / 2 + 0.02, 0.11, z * (s / 2 - 0.022)), v3(s / 2 - 0.02, 0.11, z * (s / 2 - 0.022)), 0.012, 0.012, 6));
    for (const x of [-1, 1]) bars.push(rodGeo(v3(x * (s / 2 - 0.022), 0.16, -s / 2 + 0.02), v3(x * (s / 2 - 0.022), 0.16, s / 2 - 0.02), 0.012, 0.012, 6));
    g.add(merged(bars, shade(wood, 0.9), true));
    // The rush seat over its frame, a little domed.
    g.add(rbox(s - 0.006, 0.045, s - 0.006, RUSH, [0, h - 0.024, 0], 0.016));
    const rings: [THREE.BufferGeometry[], THREE.BufferGeometry[]] = [[], []];
    let k = 0;
    for (let half = s / 2 - 0.012; half > 0.02; half -= 0.021, k++) {
      const y = h + 0.001 + 0.006 * (1 - half / (s / 2));
      for (const side of [-1, 1]) {
        rings[k % 2].push(new THREE.BoxGeometry(half * 2, 0.009, 0.013).translate(0, y, side * half), new THREE.BoxGeometry(0.013, 0.009, half * 2).translate(side * half, y, 0));
      }
    }
    // Round the edges the cords wrap the frame: bands down the sides of the seat.
    for (let i = 0, u = -s / 2 + 0.03; u < s / 2 - 0.025; u += 0.022, i++) {
      for (const side of [-1, 1]) {
        rings[i % 2].push(new THREE.BoxGeometry(0.012, 0.046, 0.006).translate(u, h - 0.024, side * (s / 2 - 0.002)), new THREE.BoxGeometry(0.006, 0.046, 0.012).translate(side * (s / 2 - 0.002), h - 0.024, u));
      }
    }
    const seams = [Math.PI / 4, -Math.PI / 4].map((a) => new THREE.BoxGeometry((s - 0.03) * Math.SQRT2, 0.006, 0.009).rotateY(a).translate(0, h + 0.008, 0));
    g.add(merged(rings[0], shade(RUSH, 0.78)), merged(rings[1], shade(RUSH, 1.1)), merged(seams, shade(RUSH, 0.55)));
    g.add(place('seat', 0, h, 0));
    return g;
  },
);

type VesselKind = 'storage' | 'cooking' | 'pot' | 'bowl' | 'bowls' | 'jug' | 'juglet' | 'cup';

const BOWL: [number, number][] = [[0.001, 0], [0.04, 0], [0.075, 0.025], [0.092, 0.058], [0.086, 0.062], [0.068, 0.034], [0.032, 0.014], [0.001, 0.014]];
const COOKING_POT: [number, number][] = [[0.001, 0], [0.06, 0.004], [0.125, 0.045], [0.15, 0.1], [0.14, 0.16], [0.1, 0.195], [0.098, 0.215], [0.112, 0.23], [0.1, 0.233], [0.088, 0.218], [0.001, 0.218]];
const JUGLET: [number, number][] = [[0.001, 0], [0.018, 0], [0.042, 0.025], [0.048, 0.055], [0.036, 0.085], [0.016, 0.1], [0.014, 0.125], [0.021, 0.135], [0.011, 0.135], [0.001, 0.128]];
const CUP: [number, number][] = [[0.001, 0], [0.035, 0], [0.045, 0.05], [0.05, 0.09], [0.044, 0.092], [0.04, 0.06], [0.03, 0.014], [0.001, 0.014]];

/** A clay vessel of the house standing on y = 0, turned at random, and how far it reaches from its middle. */
function vessel(kind: VesselKind, rand: () => number): { obj: THREE.Group; r: number } {
  const color = pickOf(rand, POTTERY);
  let obj: THREE.Group;
  let r: number;
  if (kind === 'storage') {
    const h = 0.55 + rand() * 0.2;
    obj = jar('storage', h, color);
    r = 0.32 * h;
  } else if (kind === 'jug') {
    const h = 0.24 + rand() * 0.08;
    obj = jar('pitcher', h, color);
    r = 0.27 * h;
  } else if (kind === 'cooking' || kind === 'pot') {
    // A wide cooking pot with a short neck, a rolled rim and two small handles at the shoulder.
    const k = kind === 'pot' ? 0.5 + rand() * 0.1 : 0.85 + rand() * 0.3;
    obj = group(mesh(lathe(COOKING_POT, 18), color), mesh(new THREE.CircleGeometry(0.09, 14).rotateX(-Math.PI / 2), HOLE, [0, 0.22, 0]));
    for (const s of [-1, 1]) {
      const handle = mesh(new THREE.TorusGeometry(0.028, 0.009, 5, 8, Math.PI), color, [s * 0.142, 0.15, 0]);
      handle.rotation.set(0, Math.PI / 2, s * -Math.PI / 2);
      handle.userData.noOutline = true;
      obj.add(handle);
    }
    obj.scale.setScalar(k);
    r = 0.16 * k;
  } else if (kind === 'bowls') {
    // Three bowls stacked one in the other, not quite the same clay.
    obj = group();
    for (let i = 0; i < 3; i++) obj.add(mesh(lathe(BOWL, 16), i === 0 ? color : pickOf(rand, POTTERY), [0, i * 0.022, 0]));
    r = 0.095;
  } else if (kind === 'juglet') {
    obj = group(mesh(lathe(JUGLET, 14), color));
    const handle = mesh(new THREE.TorusGeometry(0.025, 0.006, 4, 8, Math.PI * 1.1).rotateZ(-Math.PI * 0.45), color, [0.022, 0.09, 0]);
    handle.userData.noOutline = true;
    obj.add(handle);
    r = 0.055;
  } else if (kind === 'cup') {
    obj = group(mesh(lathe(CUP, 14), color));
    r = 0.05;
  } else {
    obj = group(mesh(lathe(BOWL, 16), color));
    r = 0.095;
  }
  obj.rotation.y = rand() * Math.PI * 2;
  return { obj: group(obj), r };
}

/** Spots on the floor for round things of these radii, none overlapping, about `spread` round the origin; the first in the middle. */
function scatter(rand: () => number, radii: number[], spread: number): [number, number][] {
  const taken: [number, number, number][] = [];
  return radii.map((r) => {
    for (let k = 0; ; k++) {
      const reach = taken.length === 0 ? 0 : spread * Math.sqrt(rand()) * (1 + k * 0.03);
      const a = rand() * Math.PI * 2;
      const [x, z] = [Math.cos(a) * reach, Math.sin(a) * reach];
      if (k > 300 || taken.every(([ox, oz, or]) => Math.hypot(x - ox, z - oz) > r + or + 0.015)) {
        taken.push([x, z, r]);
        return [x, z];
      }
    }
  });
}

registerAsset(
  'ancient.plankShelf',
  'Prateleira de uma tábua rústica sobre duas cavilhas na parede, com potes, tigelas, jarrinhas e uma jarra de barro escolhidos pelo `seed`. Costas em z = 0, olha para +z; a origem é o tampo da tábua: ponha na altura com `y` (1,5 m numa sala). Não bloqueia a passagem (params: length — 1,2 —, count — quantas peças, 5 —, color — da madeira —, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const length = Number(p.length ?? 1.2);
    const wood = String(p.color ?? '#8a6a4c');
    const [depth, t, bevel] = [0.2, 0.035, 0.008];
    // Seen from above: straight at the back, a little uneven along the front, the ends not cut quite square.
    const n = Math.max(3, Math.round(length / 0.2));
    const front = Array.from({ length: n + 1 }, (_, i): [number, number] => [-length / 2 + (i * length) / n + (i === 0 || i === n ? (rand() - 0.5) * 0.02 : 0), depth - rand() * 0.018]);
    const outline: [number, number][] = [[-length / 2 + 0.01, 0.01], [length / 2 - 0.01, 0.01], ...front.reverse()];
    const plank = prismGeo(outline, t, bevel).rotateX(Math.PI / 2).translate(0, -t / 2 - bevel, 0);
    const g = group(mesh(plank, wood));
    const pegs: THREE.BufferGeometry[] = [];
    for (const x of [-length / 2 + Math.min(0.18, length * 0.2), length / 2 - Math.min(0.18, length * 0.2)]) {
      pegs.push(rodGeo(v3(x, -t - 2 * bevel - 0.024, 0), v3(x, -t - 2 * bevel - 0.016, depth - 0.03), 0.02, 0.017, 7));
    }
    g.add(merged(pegs, shade(wood, 0.72), true));
    // The pottery, side by side: as many as fit, with uneven gaps.
    const kinds: VesselKind[] = ['jug', 'bowls', 'juglet', 'pot', 'bowl', 'cup', 'juglet', 'bowl', 'cup'];
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    const count = Math.max(0, Math.round(Number(p.count ?? 5)));
    const items = Array.from({ length: count }, (_, i) => vessel(kinds[i % kinds.length], rand));
    while (items.length && items.reduce((s, v) => s + 2 * v.r, 0) > length - 0.08) items.pop();
    const free = length - 0.08 - items.reduce((s, v) => s + 2 * v.r, 0);
    const weights = Array.from({ length: items.length + 1 }, () => 0.3 + rand());
    const total = weights.reduce((s, w) => s + w, 0);
    let x = -length / 2 + 0.04;
    items.forEach((v, i) => {
      x += (free * weights[i]) / total + v.r;
      v.obj.position.set(x, 0, depth / 2 + (rand() - 0.5) * 0.015);
      g.add(v.obj);
      x += v.r;
    });
    g.add(place('top', 0, 0, depth / 2));
    g.userData.passable = true;
    return g;
  },
);

registerAsset(
  'ancient.potteryGroup',
  'Grupo de vasilhas de barro para o chão ou um banco: talha de guardar, panela de cozinhar, tigelas empilhadas, jarra de alça e jarrinhas, em vermelhos e marrons de barro um pouco diferentes. Arrumadas pelo `seed` sem se encostar (params: count — 7 —, spread — raio do grupo, 0,6 —, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const count = Math.max(1, Math.round(Number(p.count ?? 7)));
    const order: VesselKind[] = ['storage', 'cooking', 'bowls', 'jug', 'juglet', 'bowl', 'storage', 'juglet', 'pot', 'cup', 'jug', 'cooking'];
    const items = Array.from({ length: count }, (_, i) => vessel(order[i % order.length], rand));
    const spots = scatter(rand, items.map((v) => v.r), Number(p.spread ?? 0.6));
    const g = group();
    items.forEach((v, i) => {
      v.obj.position.set(spots[i][0], 0, spots[i][1]);
      g.add(v.obj);
    });
    return g;
  },
);

registerAsset(
  'ancient.quern',
  'Moinho de mão (mó de sela): pedra de baixo comprida e côncava no chão, ao longo de x, com a pedra de cima em forma de pão atravessada nela, grãos espalhados, farinha no chão e uma tigela com farinha na ponta. Quem mói ajoelha do lado -x (params: bowl — 0 ou 1 —, color — da pedra —, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const color = String(p.color ?? '#7f7a72');
    const [L, W, H] = [0.58, 0.3, 0.13];
    let base = new THREE.BufferGeometry().copy(new THREE.BoxGeometry(L, H, W, 12, 3, 6));
    base.deleteAttribute('normal');
    base.deleteAttribute('uv');
    base = mergeVertices(base);
    // The saddle: an oval narrowing at the ends, hollowed along its length by the grinding, one end a little higher.
    const surface = (u: number) => H - 0.045 * (1 - u * u) + 0.012 * u;
    const pos = base.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const [u, v, w] = [pos.getX(i) / (L / 2), pos.getZ(i) / (W / 2), pos.getY(i) / H + 0.5];
      const y = w * H - (H - surface(u)) * w * w * (1 - 0.45 * v * v);
      const narrow = (1 - 0.32 * u * u) * (0.88 + 0.12 * (1 - w));
      pos.setXYZ(i, pos.getX(i) * (1 - 0.08 * v * v) + (rand() - 0.5) * 0.008, y - 0.012 + (w > 0 ? (rand() - 0.5) * 0.006 : 0), pos.getZ(i) * narrow + (rand() - 0.5) * 0.008);
    }
    base.computeVertexNormals();
    const g = group(mesh(base, color));
    // The upper stone lies across the lower one, resting in its hollow.
    const at = L * 0.12;
    const upper = mesh(lumpGeo(rand, 1, 1, 1).scale(0.065, 0.045, 0.165), shade(color, 1.12), [at, surface(at / (L / 2)) - 0.012 + 0.04, 0]);
    upper.rotation.y = (rand() - 0.5) * 0.25;
    g.add(upper);
    // Grain on the stone and some spilled on the floor; flour at the low end.
    const grain: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 26; i++) {
      const x = (-0.15 - rand() * 0.08) * L;
      grain.push(new THREE.IcosahedronGeometry(0.007, 0).scale(1, 0.7, 1.4).rotateY(rand() * 6).translate(x, surface(x / (L / 2)) - 0.008, (rand() - 0.5) * W * 0.5));
    }
    for (let i = 0; i < 12; i++) grain.push(new THREE.IcosahedronGeometry(0.007, 0).scale(1, 0.7, 1.4).rotateY(rand() * 6).translate((rand() - 0.5) * L, 0.004, (rand() < 0.5 ? -1 : 1) * (W / 2 + 0.03 + rand() * 0.1)));
    const flour = mesh(new THREE.CircleGeometry(0.13, 16).scale(1.3, 1, 1).rotateX(-Math.PI / 2), '#eee5d0', [L / 2 + 0.06, 0.004, 0]);
    flour.userData.noOutline = true;
    g.add(merged(grain, '#d4b062'), flour);
    if (Number(p.bowl ?? 1) > 0) {
      const bowl = group(mesh(lathe(BOWL, 16).scale(1.3, 1.3, 1.3), pickOf(rand, POTTERY)), mesh(new THREE.SphereGeometry(0.085, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.3, 1), '#f1e9d6', [0, 0.04, 0]));
      bowl.position.set(L / 2 + 0.17, 0, 0.03);
      g.add(bowl);
    }
    return g;
  },
);

/** Rest positions of a cloth hanging from y = 0, and what makes it sway: gently, more at the bottom, never into the wall. */
function swayingCloth(geo: THREE.BufferGeometry, length: number, phase: number): (t: number) => void {
  const pos = geo.attributes.position;
  const rest = Float32Array.from(pos.array);
  return (t: number) => {
    for (let i = 0; i < pos.count; i++) {
      const [x, y] = [rest[i * 3], rest[i * 3 + 1]];
      const f = Math.min(1.1, -y / length);
      const folds = 0.012 * (0.5 + 0.5 * Math.sin(x * 16 + phase)) * (0.4 + f);
      const swing = f * f * (0.022 + 0.018 * Math.sin(t * 1.3 + phase + x * 2.2) + 0.007 * Math.sin(t * 2.7 + phase * 2 - y * 3));
      pos.setXYZ(i, x + f * f * 0.012 * Math.sin(t * 0.9 + phase), y, 0.03 + folds + swing);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
}

registerAsset(
  'ancient.hangingCloth',
  'Pano de lã tecido e listrado (faixas de outra cor perto das pontas, franja embaixo) pendurado numa vara presa em duas cavilhas na parede; balança de leve sozinho. Costas em z = 0, olha para +z; a origem é a vara: ponha na altura com `y` (1,8 m para um pano, a altura do vão para cortina). Serve de cortina numa porta: não bloqueia a passagem (params: width — 0,7 —, length — 1,2 —, color — "linen", "brown", "dark" ou uma cor —, stripe — cor das listras —, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const width = Number(p.width ?? 0.7);
    const length = Number(p.length ?? 1.2);
    const color = cloth(p.color ?? '#e2d3b0');
    // Dark stripes on a light cloth, light ones on a dark cloth, unless asked.
    const light = new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }).l > 0.45;
    const stripe = String(p.stripe ?? (light ? '#7a2f2a' : LINEN));
    const dark = light ? shade(stripe, 0.55) : '#3a2a24';
    // Bands from the top down: a group of stripes near each end, and sometimes one in the middle.
    const marks: [number, number, string][] = [];
    const ends = (from: number, dir: number) => {
      for (const [o, h, c] of [[0.06, 0.05, stripe], [0.13, 0.014, dark], [0.16, 0.014, stripe], [0.19, 0.014, dark]] as const) {
        const a = from + dir * o * Math.min(1, length / 1.2);
        marks.push(dir > 0 ? [a, a + h, c] : [a - h, a, c]);
      }
    };
    ends(0, 1);
    ends(length, -1);
    if (rand() < 0.5) marks.push([length / 2 - 0.02, length / 2 + 0.02, stripe]);
    marks.sort((a, b) => a[0] - b[0]);
    const parts: THREE.BufferGeometry[] = [];
    const band = (a: number, b: number, c: string) => {
      if (b - a > 0.001) parts.push(painted(new THREE.PlaneGeometry(width, b - a, 10, Math.max(1, Math.ceil((b - a) / 0.08))).translate(0, -(a + b) / 2, 0), c));
    };
    let at = 0;
    for (const [a, b, c] of marks) {
      band(at, a, color);
      band(a, b, c);
      at = b;
    }
    band(at, length, color);
    // The fringe: loose warp threads under the bottom edge.
    for (let x = -width / 2 + 0.015; x < width / 2; x += 0.028) parts.push(painted(new THREE.PlaneGeometry(0.01, 0.07, 1, 2).translate(x, -length - 0.035, 0), color));
    const geo = mergeVertices(mergeGeometries(parts));
    const sway = swayingCloth(geo, length, rand() * 6);
    const fabric = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, side: THREE.DoubleSide, roughness: 0.95 }));
    fabric.position.y = -0.012;
    fabric.userData.noOutline = true;
    sway(0);
    const wood = shade(WOOD, 0.85);
    const g = group(fabric, rod(v3(-width / 2 - 0.06, 0, 0.035), v3(width / 2 + 0.06, 0, 0.035), 0.014, wood));
    const pegs = [-1, 1].map((s) => rodGeo(v3(s * (width / 2 + 0.03), -0.025, 0), v3(s * (width / 2 + 0.03), -0.005, 0.07), 0.011, 0.01, 6));
    g.add(merged(pegs, WOOD_DARK));
    g.userData.animate = sway;
    g.userData.passable = true;
    return g;
  },
);

const HERBS = ['#8c935e', '#9a9a68', '#7f8a58', '#a69a6a', '#8f8296'];

registerAsset(
  'ancient.herbBundle',
  'Maços de ervas secas pendurados de cabeça para baixo numa cordinha esticada, para debaixo de uma viga; balançam de leve sozinhos. A origem é a corda, ao longo de x: ponha na altura com `y` (logo abaixo da viga). Não bloqueia a passagem (params: count — 3 —, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const count = Math.max(1, Math.round(Number(p.count ?? 3)));
    const span = count * 0.17 + 0.1;
    const g = group(merged([rodGeo(v3(-span / 2, 0, 0), v3(span / 2, 0, 0), 0.005, 0.005, 5)], ROPE));
    const bundles: { pivot: THREE.Group; phase: number }[] = [];
    for (let i = 0; i < count; i++) {
      const color = pickOf(rand, HERBS);
      const drop = 0.04 + rand() * 0.1;
      const len = 0.28 + rand() * 0.14;
      const tie = -drop - 0.02;
      // The bunch: narrow at the tie, swelling below it and ending ragged, upside down as herbs are dried.
      const wide = 0.045 + rand() * 0.025;
      let bunch: THREE.BufferGeometry = lathe([[0.001, -len], [wide * 0.7, -len * 0.9], [wide, -len * 0.65], [wide * 0.75, -len * 0.3], [0.016, -0.01], [0.001, 0]], 9);
      bunch.deleteAttribute('normal');
      bunch.deleteAttribute('uv');
      bunch = mergeVertices(bunch);
      const bp = bunch.attributes.position;
      for (let k = 0; k < bp.count; k++) {
        const [x, y, z] = [bp.getX(k), bp.getY(k), bp.getZ(k)];
        const f = 0.8 + rand() * 0.45;
        bp.setXYZ(k, x * f, y + (y < -len * 0.85 ? (rand() - 0.3) * 0.05 : 0), z * f);
      }
      bunch.computeVertexNormals();
      bunch.translate(0, tie - 0.01, 0);
      // Stalks out of the top and the bottom, sprigs of leaves all over it, and the string it hangs by.
      const stems: THREE.BufferGeometry[] = [rodGeo(v3(0, 0, 0), v3(0, tie, 0), 0.004, 0.004, 4)];
      const sprigs: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 8; k++) {
        const a = rand() * Math.PI * 2;
        const [c, sn] = [Math.cos(a), Math.sin(a)];
        stems.push(rodGeo(v3(c * 0.008, tie - 0.01, sn * 0.008), v3(c * 0.014, tie + 0.03 + rand() * 0.02, sn * 0.014), 0.003, 0.003, 3));
        stems.push(rodGeo(v3(c * wide * 0.4, tie - len * 0.8, sn * wide * 0.4), v3(c * wide * 0.9, tie - len - 0.02 - rand() * 0.06, sn * wide * 0.9), 0.003, 0.002, 3));
      }
      for (let k = 0; k < 16; k++) {
        const a = rand() * Math.PI * 2;
        const u = 0.2 + rand() * 0.75;
        const r = wide * Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.85 + 0.008;
        const leaf = new THREE.ConeGeometry(0.009, 0.035 + rand() * 0.025, 3).scale(1, 1, 0.4).rotateZ(Math.PI + (rand() - 0.5) * 0.8).rotateY(-a);
        sprigs.push(leaf.translate(Math.cos(a) * r, tie - 0.01 - u * len, Math.sin(a) * r));
      }
      const pivot = group(mesh(bunch, color), merged(stems, shade(color, 0.7)), merged(sprigs, shade(color, 0.82)), mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.03, 8), ROPE, [0, tie, 0]));
      pivot.children[3].userData.noOutline = true;
      pivot.position.x = -span / 2 + 0.05 + ((i + 0.5) * (span - 0.1)) / count + (rand() - 0.5) * 0.04;
      g.add(pivot);
      bundles.push({ pivot, phase: rand() * 6 });
    }
    g.userData.animate = (t: number) => {
      for (const { pivot, phase } of bundles) {
        pivot.rotation.z = 0.05 * Math.sin(t * 0.9 + phase);
        pivot.rotation.x = 0.035 * Math.sin(t * 0.7 + phase * 1.3);
      }
    };
    g.userData.animate(0);
    g.userData.passable = true;
    return g;
  },
);

registerAsset(
  'ancient.ladder',
  'Escada de mão rústica: dois varões tortos e degraus de galho amarrados com corda, encostada. O alto encosta na parede em z = 0 e os pés ficam para +z (a escada olha para +z; quem sobe olha para -z). Para subir ao terraço ou ao sótão (params: height — altura do alto, 2,6 —, lean — inclinação em graus, 15 —, color, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const height = Number(p.height ?? 2.6);
    const lean = THREE.MathUtils.degToRad(Number(p.lean ?? 15));
    const wood = String(p.color ?? OLD_WOOD);
    const run = height * Math.tan(lean);
    const rails = [-1, 1].map((s) => {
      const points = [0, 1 / 3, 2 / 3, 1].map((u, i) => {
        const wobble = i === 0 || i === 3 ? 0 : 1;
        return v3(s * (0.2 + 0.035 * (1 - u)) + wobble * (rand() - 0.5) * 0.03, u * height, run * (1 - u) + 0.035 + wobble * (rand() - 0.5) * 0.02);
      });
      return new THREE.CatmullRomCurve3(points);
    });
    const poles: THREE.BufferGeometry[] = rails.map((c) => new THREE.TubeGeometry(c, 12, 0.034, 7, false));
    const rungs: THREE.BufferGeometry[] = [];
    const ties: THREE.BufferGeometry[] = [];
    for (let y = 0.3; y < height - 0.12; y += 0.31) {
      const u = y / height;
      const [a, b] = rails.map((c) => c.getPoint(u));
      const tilt = (rand() - 0.5) * 0.02;
      rungs.push(rodGeo(a.clone().add(v3(-0.05, tilt, 0.012)), b.clone().add(v3(0.05, -tilt, 0.012)), 0.021, 0.019, 6));
      // A lashing of cord round each joint, crossed.
      for (const [c, at] of [[rails[0], a], [rails[1], b]] as const) {
        const along = c.getTangent(u);
        for (const twist of [0.5, -0.5]) {
          const ring = new THREE.TorusGeometry(0.041, 0.007, 4, 10);
          ring.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 0, 1), along.clone().applyAxisAngle(v3(1, 0, 0), twist).normalize()));
          ties.push(ring.translate(at.x, at.y, at.z + 0.006));
        }
      }
    }
    return group(merged(poles, wood, true), merged(rungs, shade(wood, 1.08), true), merged(ties, ROPE));
  },
);

registerAsset(
  'ancient.post',
  'Esteio de tronco de árvore bruto, que segura a viga do teto: torto, mais fino em cima, com nós e um toco de galho, o topo cortado reto. Bloqueia só o tronco (params: height — 2,7 —, radius — 0,11 —, color, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const h = Number(p.height ?? 2.7);
    const r = Number(p.radius ?? 0.11);
    const wood = String(p.color ?? '#a39178');
    const ph = Array.from({ length: 6 }, () => rand() * 6);
    const bend = (y: number) => [0.06 * Math.sin((y / h) * 2.6 + ph[0]) - 0.06 * Math.sin(ph[0]), 0.045 * Math.sin((y / h) * 2.1 + ph[1]) - 0.045 * Math.sin(ph[1])];
    let trunk: THREE.BufferGeometry = new THREE.CylinderGeometry(r * 0.8, r, h, 11, Math.max(4, Math.round(h / 0.25)));
    trunk.deleteAttribute('normal');
    trunk.deleteAttribute('uv');
    trunk = mergeVertices(trunk);
    const pos = trunk.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const [x, z] = [pos.getX(i), pos.getZ(i)];
      const y = pos.getY(i) + h / 2;
      const a = Math.atan2(z, x);
      const k = (1 + 0.09 * Math.sin(3 * a + ph[2] + y * 1.3) + 0.06 * Math.sin(5 * a + ph[3] - y * 2.1) + 0.08 * Math.max(0, Math.sin(y * 1.7 + ph[4])) ** 4) * (1 + 0.3 * Math.max(0, 1 - y / 0.35) ** 2);
      const [bx, bz] = bend(y);
      pos.setXYZ(i, x * k + bx, y - 0.03, z * k + bz);
    }
    trunk.computeVertexNormals();
    // Knots where branches were cut off, and one stub left a little longer.
    const knots: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const y = h * (0.15 + rand() * 0.75);
      const a = rand() * Math.PI * 2;
      const [bx, bz] = bend(y);
      const rr = r * (1 - 0.2 * (y / h)) * 0.95;
      knots.push(lumpGeo(rand, 0.035 + rand() * 0.015, 0.8, 0).scale(1, 1.4, 1).translate(bx + Math.cos(a) * rr, y, bz + Math.sin(a) * rr));
    }
    const y = h * (0.55 + rand() * 0.2);
    const a = rand() * Math.PI * 2;
    const [bx, bz] = bend(y);
    const from = v3(bx + Math.cos(a) * r * 0.6, y, bz + Math.sin(a) * r * 0.6);
    knots.push(rodGeo(from, from.clone().add(v3(Math.cos(a) * r * 0.9, r * 0.6, Math.sin(a) * r * 0.9)), 0.03, 0.024, 7));
    return group(mesh(trunk, wood), merged(knots, shade(wood, 0.78), true));
  },
);

registerAsset(
  'ancient.wallNiche',
  'Nicho na parede: um vão raso e escuro de topo arredondado, com o peitoril de reboco e uma candeia (acesa) ou uma jarrinha dentro. É uma peça fina para pôr rente à face da parede (costas em z = 0, olha para +z, saindo um pouco da parede para se ler como nicho); a origem é o pé do nicho: ponha na altura com `y` (1,1 m). Com `intensity` a candeia ilumina de verdade (params: width — 0,35 —, height — 0,45 —, item — "lamp", "jug" ou "none" —, color — do reboco —, intensity, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const w = Number(p.width ?? 0.35);
    const h = Number(p.height ?? 0.45);
    const item = String(p.item ?? 'lamp');
    const color = String(p.color ?? MUD);
    // The dark of the hollow, its top an arch.
    const rise = Math.min(w / 2, h * 0.35);
    const arch = Array.from({ length: 11 }, (_, i): [number, number] => [Math.cos((i / 10) * Math.PI) * (w / 2), h - rise + Math.sin((i / 10) * Math.PI) * rise]);
    const hollow = mesh(prismGeo([[-w / 2, 0], [w / 2, 0], ...arch], 0.014, 0), '#3b2e25', [0, 0, 0.007]);
    hollow.userData.noOutline = true;
    const g = group(hollow);
    // The plaster sill the things stand on, a little proud of the wall.
    g.add(mesh(mudBlockGeo(rand, w + 0.06, 0.035, 0.11, 0.012).translate(0, 0.0175, 0.055), color));
    if (item === 'lamp') {
      const lamp = oilLamp(p);
      lamp.rotation.y = Math.PI;
      lamp.position.set(0, 0.035, 0.07);
      g.add(lamp);
      g.userData.animate = lamp.userData.animate;
    } else if (item === 'jug') {
      const jug = jar('pitcher', Math.min(0.24, h * 0.55), pickOf(rand, POTTERY));
      jug.position.set(0, 0.035, 0.055);
      jug.rotation.y = -Math.PI / 2 + (rand() - 0.5) * 0.6;
      g.add(jug);
    }
    g.userData.passable = true;
    return g;
  },
);

/** A woven basket r0 across the foot, r1 at the rim, h tall, open on top: willow rings and ribs over the body. */
function wovenBasket(rand: () => number, r0: number, r1: number, h: number, fill: string): THREE.Group {
  const color = pickOf(rand, WICKER);
  const g = group(mesh(lathe([[0.001, 0], [r0, 0], [r1, h], [r1 - 0.014, h], [r0 - 0.014, 0.02], [0.001, 0.02]], 20), color));
  const weave: THREE.BufferGeometry[] = [new THREE.TorusGeometry(r1 - 0.004, 0.016, 5, 24).rotateX(Math.PI / 2).translate(0, h, 0)];
  for (let y = 0.035; y < h - 0.025; y += 0.038) weave.push(new THREE.TorusGeometry(r0 + ((r1 - r0) * y) / h + 0.003, 0.0055, 3, 20).rotateX(Math.PI / 2).translate(0, y, 0));
  const ribs = Math.round((2 * Math.PI * r1) / 0.075);
  for (let i = 0; i < ribs; i++) {
    const a = (i / ribs) * Math.PI * 2;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    weave.push(rodGeo(v3(c * (r0 + 0.003), 0.004, s * (r0 + 0.003)), v3(c * (r1 + 0.003), h - 0.012, s * (r1 + 0.003)), 0.005, 0.005, 3));
  }
  if (h > 0.3) {
    // Two rope handles on a tall one.
    for (const s of [-1, 1]) {
      const handle = new THREE.TorusGeometry(0.045, 0.009, 4, 10, Math.PI).rotateZ(s * -Math.PI / 2).rotateY(Math.PI / 2).translate(s * (r1 + 0.005), h - 0.07, 0);
      weave.push(handle);
    }
  }
  g.add(merged(weave, shade(color, 0.76)));
  const inside = r1 - 0.02;
  if (fill === 'wool') {
    const tufts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const [a, d] = [rand() * Math.PI * 2, Math.sqrt(rand()) * inside * 0.6];
      tufts.push(lumpGeo(rand, 0.05 + rand() * 0.035, 0.7, 1).translate(Math.cos(a) * d, h - 0.01 + rand() * 0.04, Math.sin(a) * d));
    }
    g.add(merged(tufts, '#ece3cf', true));
  } else if (fill === 'grain') {
    g.add(mesh(new THREE.SphereGeometry(inside, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.28, 1), '#d4b062', [0, h - 0.035, 0]));
  }
  return g;
}

registerAsset(
  'ancient.basketGroup',
  'Cestos de vime trançado de tamanhos diferentes (um alto de alças, um largo e baixo, um pequeno...), juntos no chão sem se encostar; um com lã crua e outro com grão. `fill`: "mixed" (padrão), "wool", "grain" ou "none" (params: count — 3 —, spread — raio do grupo, 0,5 —, fill, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const count = Math.max(1, Math.round(Number(p.count ?? 3)));
    const fill = String(p.fill ?? 'mixed');
    const specs: [number, number, number, string][] = [[0.17, 0.23, 0.48, 'wool'], [0.22, 0.3, 0.2, 'grain'], [0.1, 0.14, 0.18, ''], [0.14, 0.19, 0.34, 'grain'], [0.2, 0.26, 0.14, ''], [0.12, 0.16, 0.26, 'wool']];
    const baskets = Array.from({ length: count }, (_, i) => {
      const [r0, r1, h, what] = specs[i % specs.length];
      const k = 0.9 + rand() * 0.2;
      const b = wovenBasket(rand, r0 * k, r1 * k, h * k, fill === 'mixed' ? what : fill === 'none' ? '' : fill);
      b.rotation.y = rand() * Math.PI * 2;
      return { b, r: r1 * k + 0.02 };
    });
    const spots = scatter(rand, baskets.map((x) => x.r), Number(p.spread ?? 0.5));
    const g = group();
    baskets.forEach(({ b }, i) => {
      b.position.set(spots[i][0], 0, spots[i][1]);
      g.add(b);
    });
    return g;
  },
);

registerAsset(
  'ancient.woodTable',
  'Mesa rústica de tábuas grossas sobre dois cavaletes (62 cm, a altura de comer sentado em banquinho ou no banco de barro), as tábuas desiguais; `cloth: 1` põe um caminho de pano listrado ao longo dela, caindo nas pontas. Põe-se coisas em `top` (params: width — 1,4 —, depth — 0,6 —, height — 0,62 —, cloth — 0 ou 1 —, color — da madeira —, clothColor, stripe, seed)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const [w, d] = [Number(p.width ?? 1.4), Number(p.depth ?? 0.6)];
    const top = Number(p.height ?? 0.62);
    const wood = String(p.color ?? '#8a6a4c');
    const g = group();
    // Three planks, not quite the same length, thickness or shade.
    const n = 3;
    for (let i = 0; i < n; i++) {
      const thick = 0.06 + rand() * 0.012;
      const plank = rbox(w - rand() * 0.05, thick, d / n - 0.012, shade(wood, 0.9 + rand() * 0.18), [(rand() - 0.5) * 0.02, top - thick / 2 - (i === 1 ? 0 : 0.004), -d / 2 + ((i + 0.5) * d) / n], 0.012);
      plank.rotation.y = (rand() - 0.5) * 0.012;
      g.add(plank);
    }
    // A trestle under each end: two splayed legs in a cleat, and a stretcher between them low down.
    const legs: THREE.BufferGeometry[] = [];
    const cleats: THREE.BufferGeometry[] = [];
    const ends = [-1, 1].map((s) => s * (w / 2 - 0.2));
    for (const x of ends) {
      for (const z of [-1, 1]) legs.push(rodGeo(v3(x, 0, z * (d / 2 - 0.04)), v3(x, top - 0.09, z * 0.1), 0.032, 0.03, 7));
      cleats.push(new THREE.BoxGeometry(0.08, 0.06, d - 0.08).translate(x, top - 0.095, 0));
    }
    legs.push(rodGeo(v3(ends[0] - 0.04, 0.2, 0), v3(ends[1] + 0.04, 0.2, 0), 0.026, 0.026, 7));
    for (const x of ends) legs.push(rodGeo(v3(x, 0.2, -d / 2 + 0.1), v3(x, 0.2, d / 2 - 0.1), 0.022, 0.022, 6));
    g.add(merged(legs, shade(wood, 0.82), true), merged(cleats, shade(wood, 0.72), true));
    let height = top;
    if (Number(p.cloth ?? 0) > 0) {
      const color = cloth(p.clothColor ?? 'linen');
      const stripe = String(p.stripe ?? '#7a2f2a');
      const [cw, drop] = [Math.min(0.36, d * 0.6), 0.2];
      const z = (rand() - 0.5) * 0.06;
      g.add(rbox(w + 0.02, 0.006, cw, color, [0, top + 0.003, z], 0.002));
      const bands: THREE.BufferGeometry[] = [];
      for (const s of [-1, 1]) {
        g.add(rbox(0.006, drop, cw, color, [s * (w / 2 + 0.013), top - drop / 2 + 0.006, z], 0.002));
        for (const y of [0.05, 0.1, 0.125]) bands.push(new THREE.BoxGeometry(0.009, y === 0.05 ? 0.03 : 0.012, cw + 0.002).translate(s * (w / 2 + 0.013), top - drop + y, z));
        for (const o of [0.08, 0.13]) bands.push(new THREE.BoxGeometry(o === 0.08 ? 0.03 : 0.012, 0.008, cw + 0.002).translate(s * (w / 2 - o), top + 0.003, z));
      }
      g.add(merged(bands, stripe));
      height += 0.006;
    }
    g.add(place('top', 0, height + 0.004, 0));
    return g;
  },
);
