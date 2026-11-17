import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../../core/rng';
import { group, place, registerAsset } from '../registry';
import { lumpGeo, merge, merged, mesh, rockGeo, rodGeo, shade, STONES, v3 } from './kit';

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
