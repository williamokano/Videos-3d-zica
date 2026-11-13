import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../core/rng';
import { group, mat, post, rbox, registerAsset, setChannels } from './registry';

/*
 * The outside of a place: fences and gates, low grass and weeds, yard furniture, a covered walkway.
 * Long things (fence, walkway) run along x, centered on their origin, and take a `length`: one prop covers a
 * whole side, or a short one is repeated. Many small parts are merged into one mesh, so a long fence costs
 * one draw, not hundreds.
 */

const box = (w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/** One mesh from many boxes. It gets the light in bands of the cel look, but no outline: too thin for one. */
function merged(parts: THREE.BufferGeometry[], color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(mergeGeometries(parts), mat(color));
  mesh.userData.noOutline = true;
  return mesh;
}

registerAsset(
  'structure.fence',
  'Cerca de escola, um trecho ao longo de x: mureta de concreto com gradil de barras em cima, ou alambrado (params: length, height, style — "bars" ou "mesh" —, color, base — altura da mureta, 0 para sem)',
  (p) => {
    const length = Number(p.length ?? 2);
    const height = Number(p.height ?? 1.9);
    const base = Number(p.base ?? 0.45);
    const color = String(p.color ?? '#4d6b57');
    const style = String(p.style ?? 'bars');
    const g = group();
    if (base > 0) g.add(rbox(length, base, 0.16, '#b9b4aa', [0, base / 2, 0], 0.02));
    const metal: THREE.BufferGeometry[] = [];
    // A post every 2 m or so, and the rails between them.
    const spans = Math.max(1, Math.round(length / 2));
    for (let i = 0; i <= spans; i++) metal.push(box(0.06, height - base, 0.06, -length / 2 + (i / spans) * length, base + (height - base) / 2, 0));
    metal.push(box(length, 0.04, 0.035, 0, height - 0.06, 0), box(length, 0.04, 0.035, 0, base + 0.08, 0));
    if (style === 'bars') {
      const bars = Math.max(1, Math.round(length / 0.13));
      for (let i = 0; i < bars; i++) metal.push(box(0.018, height - base - 0.1, 0.018, -length / 2 + ((i + 0.5) / bars) * length, base + (height - base) / 2, 0));
    }
    g.add(merged(metal, color));
    if (style === 'mesh') {
      // Chain-link: a diamond pattern with holes, drawn once and repeated.
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(length, height - base - 0.12), chainLink(length, height - base - 0.12, color));
      panel.position.y = base + (height - base) / 2;
      panel.userData.noShadow = true;
      g.add(panel);
    }
    return g;
  },
);

let linkTexture: THREE.Texture | undefined;
function chainLink(width: number, height: number, color: string): THREE.Material {
  // Without a browser (tests) there is no picture to draw on.
  if (typeof document === 'undefined') return new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  if (!linkTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const c = canvas.getContext('2d')!;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 5;
    c.beginPath();
    for (const [a, b] of [[0, 32, 32, 0], [32, 0, 64, 32], [64, 32, 32, 64], [32, 64, 0, 32]].map((l) => [[l[0], l[1]], [l[2], l[3]]])) {
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
    }
    c.stroke();
    linkTexture = new THREE.CanvasTexture(canvas);
    linkTexture.wrapS = linkTexture.wrapT = THREE.RepeatWrapping;
  }
  const map = linkTexture.clone();
  map.needsUpdate = true;
  map.repeat.set(width / 0.12, height / 0.12);
  return new THREE.MeshStandardMaterial({ color, map, alphaMap: map, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
}

registerAsset(
  'structure.gate',
  'Portão de correr de gradil, entre dois pilares, ao longo de x; canal "open" de 0 (fechado) a 1 (aberto, a folha corre para +x) (params: width, height, color)',
  (p) => {
    const width = Number(p.width ?? 3.2);
    const height = Number(p.height ?? 2);
    const color = String(p.color ?? '#3e5a48');
    const leaf: THREE.BufferGeometry[] = [
      box(width, 0.06, 0.04, 0, height - 0.08, 0), box(width, 0.06, 0.04, 0, 0.14, 0),
      box(0.06, height - 0.1, 0.04, -width / 2 + 0.03, height / 2 + 0.03, 0), box(0.06, height - 0.1, 0.04, width / 2 - 0.03, height / 2 + 0.03, 0),
    ];
    const bars = Math.round(width / 0.13);
    for (let i = 1; i < bars; i++) leaf.push(box(0.02, height - 0.2, 0.02, -width / 2 + (i / bars) * width, height / 2 + 0.03, 0));
    const door = merged(leaf, color);
    door.position.z = 0.1;
    const g = group(
      rbox(0.3, height + 0.25, 0.3, '#b9b4aa', [-width / 2 - 0.15, (height + 0.25) / 2, 0], 0.03),
      rbox(0.3, height + 0.25, 0.3, '#b9b4aa', [width / 2 + 0.15, (height + 0.25) / 2, 0], 0.03),
      // The rail it runs on.
      rbox(width * 2, 0.03, 0.06, '#6b6f78', [width / 2, 0.015, 0.1], 0.008),
      door,
    );
    return setChannels(g, { open: { value: 0, apply: (v) => (door.position.x = v * (width - 0.1)) } });
  },
);

const GREENS = ['#5f9d4a', '#6fae52', '#4f8a43', '#7fb85a', '#8a9b4e'];

registerAsset(
  'nature.grass',
  'Grama baixa: tufos espalhados num retângulo centrado na origem, sobre o chão (params: width, depth, density — tufos por m² —, height, seed)',
  (p) => {
    const [width, depth] = [Number(p.width ?? 4), Number(p.depth ?? 4)];
    const count = Math.max(1, Math.round(width * depth * Number(p.density ?? 5)));
    const height = Number(p.height ?? 0.11);
    const rand = rng(Number(p.seed ?? 1));
    // A tuft: three thin blades leaning apart.
    const blade = (lean: number, turn: number) => new THREE.ConeGeometry(0.022, 1, 3).translate(0, 0.5, 0).rotateZ(lean).rotateY(turn);
    const tuft = mergeGeometries([blade(0.25, 0), blade(-0.3, 2.1), blade(0.18, 4.2)]);
    const mesh = new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), count);
    const m = new THREE.Matrix4();
    const [q, s, at, color] = [new THREE.Quaternion(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Color()];
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const h = height * (0.6 + rand() * 0.9);
      at.set((rand() - 0.5) * width, 0, (rand() - 0.5) * depth);
      m.compose(at, q.setFromAxisAngle(up, rand() * Math.PI * 2), s.set(0.8 + rand() * 0.9, h, 0.8 + rand() * 0.9));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.set(GREENS[Math.floor(rand() * GREENS.length)]));
    }
    mesh.userData.noShadow = mesh.userData.noOutline = true;
    mesh.receiveShadow = true;
    const g = group(mesh);
    g.userData.passable = true;
    return g;
  },
);

registerAsset(
  'nature.weeds',
  'Moita de mato alto, para pé de cerca, canto de muro e rachadura de calçada (params: seed, height, spread)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const height = Number(p.height ?? 0.5);
    const spread = Number(p.spread ?? 0.3);
    const blades: THREE.BufferGeometry[] = [];
    const n = 9 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const h = height * (0.5 + rand() * 0.7);
      const a = rand() * Math.PI * 2;
      const r = rand() * spread;
      blades.push(new THREE.ConeGeometry(0.035 + rand() * 0.02, h, 4).translate(0, h / 2, 0).rotateZ((rand() - 0.5) * 0.7).rotateY(a).translate(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const g = group(merged(blades, GREENS[Math.floor(rand() * GREENS.length)]));
    g.userData.passable = true;
    return g;
  },
);

registerAsset(
  'school.concreteTable',
  'Mesa de concreto de pátio de escola pública, com os bancos junto (params: shape — "round" ou "rect" —, seats — "stools" banquinhos redondos ou "benches" bancos em arco/retos —, color, top — cor do tampo e dos assentos)',
  (p) => {
    const concrete = String(p.color ?? '#c9c5ba');
    const top = String(p.top ?? concrete);
    const seats = String(p.seats ?? 'stools');
    const g = group();
    const disc = (radius: number, thick: number, color: string, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.97, thick, 28), mat(color));
      mesh.position.set(x, y, z);
      return mesh;
    };
    if (String(p.shape ?? 'round') === 'rect') {
      // A long table on two slab legs, with a bench on each long side.
      g.add(rbox(1.5, 0.08, 0.7, top, [0, 0.74, 0], 0.02), rbox(0.14, 0.7, 0.46, concrete, [-0.48, 0.35, 0], 0.02), rbox(0.14, 0.7, 0.46, concrete, [0.48, 0.35, 0], 0.02));
      for (const z of [-0.68, 0.68]) {
        g.add(rbox(1.5, 0.07, 0.32, top, [0, 0.44, z], 0.02), rbox(0.12, 0.41, 0.24, concrete, [-0.5, 0.205, z], 0.02), rbox(0.12, 0.41, 0.24, concrete, [0.5, 0.205, z], 0.02));
      }
      return g;
    }
    g.add(disc(0.58, 0.08, top, 0, 0.74, 0), post(0.11, 0.7, concrete, 0, 0, 0), disc(0.2, 0.04, concrete, 0, 0.02, 0));
    if (seats === 'stools') {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const [x, z] = [Math.cos(a) * 0.92, Math.sin(a) * 0.92];
        g.add(disc(0.19, 0.07, top, x, 0.44, z), post(0.085, 0.41, concrete, x, 0, z));
      }
      return g;
    }
    // Three curved benches around the table, each a piece of a ring on two legs.
    for (let i = 0; i < 3; i++) {
      const bench = new THREE.Group();
      bench.rotation.y = (i / 3) * Math.PI * 2;
      const arc = 1.5;
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 1.12, -arc / 2, arc / 2, false);
      shape.absarc(0, 0, 0.8, arc / 2, -arc / 2, true);
      const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 14 }).rotateX(-Math.PI / 2), mat(top));
      slab.position.y = 0.41;
      bench.add(slab);
      for (const a of [-arc / 2 + 0.25, arc / 2 - 0.25]) bench.add(rbox(0.24, 0.41, 0.12, concrete, [Math.cos(a) * 0.96, 0.205, -Math.sin(a) * 0.96], 0.02).rotateY(a));
      g.add(bench);
    }
    return g;
  },
);

registerAsset(
  'structure.canopy',
  'Passarela coberta: telhado sobre duas fileiras de pilares, ao longo de x, para ligar dois prédios; passa-se por baixo (params: length, width, height, color — do telhado —, posts — cor dos pilares)',
  (p) => {
    const length = Number(p.length ?? 8);
    const width = Number(p.width ?? 2.6);
    const height = Number(p.height ?? 2.7);
    const roof = String(p.color ?? '#b5533c');
    const posts = String(p.posts ?? '#d8d4ca');
    const g = group(
      // The roof, with a fascia under its edge, and a beam along each row of posts.
      rbox(length + 0.5, 0.09, width + 0.7, roof, [0, height + 0.2, 0], 0.02),
      rbox(length + 0.3, 0.14, width + 0.5, '#e6e2d8', [0, height + 0.09, 0], 0.02),
    );
    const bays = Math.max(1, Math.round(length / 3));
    for (const z of [-width / 2, width / 2]) {
      g.add(rbox(length, 0.16, 0.12, posts, [0, height - 0.06, z], 0.02));
      for (let i = 0; i <= bays; i++) g.add(rbox(0.16, height, 0.16, posts, [-length / 2 + (i / bays) * length, height / 2, z], 0.02));
    }
    // People walk under it, between the posts.
    g.userData.passable = true;
    return g;
  },
);
