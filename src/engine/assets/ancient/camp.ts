import * as THREE from 'three';
import { rng } from '../../core/rng';
import { group, loose, post, rbox, registerAsset } from '../registry';
import { BRONZE, cloth, HOLE, lathe, LINEN, merge, merged, mesh, prismGeo, rockGeo, rod, rodGeo, ROPE, shade, sidePrismGeo, v3, wavingCloth, WOOD, WOOD_DARK } from './kit';
import { flickeringFire } from './palace';

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

export const BURLAP = ['#cdb588', '#d6c196', '#bfa476', '#c8ad80'];
const SACK: [number, number][] = [[0, 0], [0.17, 0.005], [0.225, 0.05], [0.245, 0.18], [0.235, 0.33], [0.19, 0.45], [0.11, 0.53], [0.05, 0.58], [0.045, 0.6], [0.075, 0.64], [0.06, 0.68], [0.02, 0.7], [0.001, 0.7]];
/** A grain sack, 0.7 m tall, tied at the neck. Lying, it points to -z and is flatter. */
export function sackGeo(lying: boolean): THREE.BufferGeometry {
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

export const CLAYS = ['#b9663f', '#c47a4a', '#a85a38', '#cf8a5a'];
const JARS: Record<string, [number, number][]> = {
  // A tall storage jar with a collar at the neck, for grain, oil or water (height 1).
  storage: [[0.001, 0], [0.1, 0], [0.18, 0.07], [0.28, 0.33], [0.3, 0.5], [0.26, 0.68], [0.15, 0.8], [0.11, 0.83], [0.12, 0.87], [0.13, 0.93], [0.1, 0.94], [0.09, 0.88], [0.001, 0.88]],
  // A pitcher with one handle.
  pitcher: [[0.001, 0], [0.12, 0], [0.15, 0.05], [0.2, 0.25], [0.19, 0.42], [0.12, 0.58], [0.09, 0.67], [0.12, 0.78], [0.13, 0.82], [0.1, 0.82], [0.08, 0.72], [0.001, 0.72]],
};
/** A clay jar `height` tall, its mouth dark inside. */
export function jar(shape: string, height: number, color: string): THREE.Group {
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
