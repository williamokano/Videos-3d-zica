import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../../core/rng';
import { group, loose, place, rbox, registerAsset } from '../registry';
import { cloth, HOLE, lathe, LINEN, lumpGeo, merged, mesh, prismGeo, rod, rodGeo, ROPE, shade, v3, WOOD, WOOD_DARK } from './kit';
import { jar } from './camp';
import { painted } from './sheep';
import { oilLamp } from './lamps';

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

registerAsset(
  'ancient.severedHead',
  'A cabeça de um gigante separada do corpo, caída de lado no chão, de olhos fechados, com cabelo comprido, barba e o capacete de bronze. O corte fica do lado de -x (com "yaw" 90, virado para +z) e vai sempre sob censura ("mosaico" só no corte). Nas cores do personagem (params: radius em metros, padrão 0.27; skin; hair, barba e cabelo; helmet; stone — 1 para a pedra na testa)',
  (p) => {
    const r = Number(p.radius ?? 0.27);
    const skin = String(p.skin ?? '#b98a62');
    const hair = String(p.hair ?? '#22160f');
    const bronze = String(p.helmet ?? '#b8862f');
    // Upright first (top +y, face -z, the cut at -y), as the head sits on a body; then laid on its side.
    const head = group(
      mesh(new THREE.SphereGeometry(r, 20, 14), skin),
      // Long hair down the back, a full beard over the jaw and the chin.
      mesh(new THREE.SphereGeometry(r * 1.04, 18, 12, Math.PI * 0.15, Math.PI * 1.7, Math.PI * 0.3, Math.PI * 0.55), hair, [0, -r * 0.05, r * 0.05]),
      mesh(new THREE.SphereGeometry(r * 0.95, 18, 12, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.52, Math.PI * 0.4), hair, [0, -r * 0.06, -r * 0.08]),
      // Nose, and the eyes closed: two dark lines.
      mesh(new THREE.SphereGeometry(r * 0.13, 10, 8), skin, [0, r * 0.02, -r * 0.98]),
      mesh(new THREE.BoxGeometry(r * 0.24, r * 0.035, r * 0.04), '#2a1a12', [-r * 0.3, r * 0.16, -r * 0.93]),
      mesh(new THREE.BoxGeometry(r * 0.24, r * 0.035, r * 0.04), '#2a1a12', [r * 0.3, r * 0.16, -r * 0.93]),
      // The bronze helmet: the shell, its rim and the knob on top, as the "bronzeHelmet" piece.
      mesh(new THREE.SphereGeometry(r * 1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), bronze, [0, r * 0.1, 0]),
      mesh(new THREE.TorusGeometry(r * 1.08, r * 0.055, 8, 28).rotateX(Math.PI / 2), bronze, [0, r * 0.42, 0]),
      mesh(new THREE.ConeGeometry(r * 0.12, r * 0.32, 12), bronze, [0, r * 1.28, 0]),
      // The neck, short, where it was cut.
      mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.45, r * 0.35, 14), skin, [0, -r * 1.0, 0]),
    );
    if (Number(p.stone ?? 1) > 0.5) head.add(mesh(new THREE.SphereGeometry(r * 0.13, 10, 8).scale(1, 0.75, 0.6), '#9a958c', [r * 0.05, r * 0.18, -r * 0.98]));
    // On its side on the ground: the top toward +x, the cut toward -x, the face down a little.
    head.rotation.set(0.35, 0, -Math.PI / 2);
    head.position.y = r * 0.95;
    return loose(group(head));
  },
);
