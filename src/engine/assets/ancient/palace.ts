import * as THREE from 'three';
import { rng } from '../../core/rng';
import { group, place, rbox, registerAsset } from '../registry';
import { BRONZE, lathe, merge, merged, mesh, prismGeo, rod, rodGeo, shade, sidePrismGeo, STONE, v3, WOOD_DARK } from './kit';

// Palace

/** Flame material: its own light, see-through at the edges and adding up where flames cross, like real fire. */
const flameMaterials = new Map<string, THREE.MeshBasicMaterial>();
export function flameMaterial(color: string, opacity: number): THREE.MeshBasicMaterial {
  const key = `${color}/${opacity}`;
  let m = flameMaterials.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    flameMaterials.set(key, m);
  }
  return m;
}

/** A tongue of flame: a drop, wide low down and drawn up to a point, a little twisted. */
export function tongue(r: number, h: number): THREE.BufferGeometry {
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
export function flickeringFire(rand: () => number, size: number): { fire: THREE.Group; update(t: number): void } {
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
