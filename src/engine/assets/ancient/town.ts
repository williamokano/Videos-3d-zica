import * as THREE from 'three';
import { rng } from '../../core/rng';
import { group, post, rbox, registerAsset } from '../registry';
import { HOLE, lathe, merge, merged, mesh, rod, ROPE, shade, STONE, v3, WOOD, WOOD_DARK } from './kit';
import { CLAYS, jar } from './camp';

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
