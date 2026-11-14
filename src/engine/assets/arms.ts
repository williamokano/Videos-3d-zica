/**
 * Things held in the hand, from the ancient Near East: spear, shield, sword, staff, sling, stone, bow and
 * frame drum. Give the prop an `id` and `"pickable": true` to have a character pick it up.
 *
 * A held thing is placed so that its `userData.grip` (a point of its own frame) sits in the palm, turned to
 * face the way the holder faces and pitched by `userData.tilt`. Each of these stands upright in its own frame
 * with its front toward -z (away from whoever holds it), and its grip where a fist closes: on the shaft, the
 * hilt, the handle behind the shield. In the palm the fingers close around a vertical axis, so shafts and
 * hilts are upright at the grip.
 */
import * as THREE from 'three';
import { mat, rbox, registerAsset, setChannels } from './registry';

const BRONZE = '#b5803a';
const IRON = '#8d9096';
const WOOD = '#8a6239';
const LEATHER = '#6b4423';

const num = (v: number | string | undefined, fallback: number): number => (v === undefined || Number.isNaN(Number(v)) ? fallback : Number(v));
const metal = (color: string): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.45 });
const rod = (radius: number, length: number, color: string, y0: number): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), mat(color));
  mesh.position.y = y0 + length / 2;
  return mesh;
};

registerAsset('arms.spear', 'Lança de pé: haste de madeira, ponta de ferro em folha e ponteira no pé; pegável, segurada pela haste (params: length em metros, padrão 2.4; grip, altura da mão na haste)', (p) => {
  const length = num(p.length, 2.4);
  const thick = 0.018 * Math.sqrt(length / 2.4);
  const spear = new THREE.Group();
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), metal(String(p.color ?? IRON)));
  const blade = length * 0.1;
  head.scale.set(thick * 2.4, blade / 2, thick * 0.7);
  head.position.y = length - blade / 2;
  spear.add(
    rod(thick, length - blade * 0.8, WOOD, 0.06),
    head,
    new THREE.Mesh(new THREE.CylinderGeometry(thick * 1.25, thick * 1.1, blade * 0.35, 10), metal(IRON)).translateY(length - blade * 1.05),
    new THREE.Mesh(new THREE.ConeGeometry(thick * 1.2, 0.08, 10).rotateX(Math.PI), metal(BRONZE)).translateY(0.04),
  );
  spear.userData.grip = [0, num(p.grip, Math.min(1.0, length * 0.42)), 0];
  return spear;
});

registerAsset('arms.shield', 'Escudo: redondo de couro com borda e umbo de bronze, ou o grande escudo filisteu em pé (kind: round | tower); pegável, pela alça de trás (params: kind, size em metros, color, accent)', (p) => {
  const tower = p.kind === 'tower';
  const size = num(p.size, tower ? 1.4 : 0.7);
  const color = String(p.color ?? (tower ? '#a08052' : '#93633a'));
  const rim = String(p.accent ?? BRONZE);
  const shield = new THREE.Group();
  const face = new THREE.Group();
  if (tower) {
    // Tall and slightly curved, of wicker and hide, with a bronze edge.
    const w = size * 0.5;
    face.add(rbox(w, size, 0.05, color, [0, 0, 0], 0.06), rbox(w + 0.03, 0.04, 0.06, rim, [0, size / 2, 0], 0.015), rbox(w + 0.03, 0.04, 0.06, rim, [0, -size / 2, 0], 0.015));
    for (const x of [-1, 1]) face.add(rbox(0.035, size, 0.06, rim, [x * (w / 2), 0, 0], 0.015));
    for (const y of [-0.25, 0, 0.25]) face.add(rbox(w * 0.9, 0.02, 0.055, '#6d5236', [0, y * size, 0], 0.008));
  } else {
    const r = size / 2;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 32).rotateX(Math.PI / 2), mat(color));
    const edge = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 8, 32), metal(rim));
    const boss = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2), metal(rim));
    boss.position.z = -0.02;
    face.add(disc, edge, boss);
  }
  // The handle across the back.
  face.add(rbox(0.12, 0.03, 0.03, LEATHER, [0, 0, 0.06], 0.01), rbox(0.02, 0.03, 0.05, LEATHER, [-0.06, 0, 0.035], 0.008), rbox(0.02, 0.03, 0.05, LEATHER, [0.06, 0, 0.035], 0.008));
  face.position.y = tower ? size / 2 : size / 2;
  shield.add(face);
  // In the fist: the handle, behind the middle of the shield.
  shield.userData.grip = [0, size / 2, 0.075];
  return shield;
});

registerAsset('arms.sword', 'Espada reta de ferro com guarda e punho de bronze; pegável, pelo punho, com a lâmina para cima e um pouco à frente (params: length da lâmina, padrão 0.7; color)', (p) => {
  const length = num(p.length, 0.7);
  const wide = 0.05 * Math.sqrt(length / 0.7);
  const sword = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(wide * 0.15, wide / 2, length, 4, 1).scale(1, 1, 0.22).rotateY(Math.PI / 4), metal(String(p.color ?? IRON)));
  blade.scale.set(1.41, 1, 1.41);
  blade.position.y = 0.16 + length / 2;
  sword.add(
    blade,
    rbox(wide * 2.4, 0.025, 0.04, BRONZE, [0, 0.15, 0], 0.008),
    rod(0.016, 0.12, '#5a3a22', 0.03),
    new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), metal(BRONZE)).translateY(0.025),
  );
  sword.userData.grip = [0, 0.085, 0];
  sword.userData.tilt = -0.5;
  return sword;
});

registerAsset('arms.staff', 'Cajado de pastor: vara comprida com a ponta curva em gancho; pegável, pela vara (params: length, padrão 1.7)', (p) => {
  const length = num(p.length, 1.7);
  const staff = new THREE.Group();
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 8, 20, Math.PI * 1.15), mat(String(p.color ?? WOOD)));
  hook.position.set(-0.09, length - 0.02, 0);
  staff.add(rod(0.017, length - 0.02, String(p.color ?? WOOD), 0), hook);
  staff.userData.grip = [0, Math.min(1.0, length * 0.58), 0];
  return staff;
});

registerAsset('arms.sling', 'Funda de pastor: duas cordas e a bolsinha de couro, pendurada da mão. Canais: `spin` (voltas, 0 a 1 é uma volta inteira, girando num plano em pé de frente para trás) e `loaded` (1 com a pedra na bolsinha). Pegável, pelas pontas das cordas', (p) => {
  const cord = 0.48;
  const sling = new THREE.Group();
  // Everything turns round the hand: the pivot is the grip.
  const pivot = new THREE.Group();
  pivot.position.y = cord + 0.03;
  const color = String(p.color ?? '#8a6a45');
  for (const x of [-1, 1]) {
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, cord, 5), mat(color));
    line.position.set(x * 0.012, -cord / 2, 0);
    line.rotation.z = x * 0.035;
    pivot.add(line);
  }
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), new THREE.MeshStandardMaterial({ color: LEATHER, roughness: 0.85, side: THREE.DoubleSide }));
  pouch.scale.set(1, 0.9, 0.7);
  pouch.position.y = -cord - 0.005;
  const stone = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 8), mat('#9a958c'));
  stone.scale.set(1, 0.8, 0.85);
  stone.position.y = -cord - 0.012;
  pivot.add(pouch, stone, rbox(0.03, 0.02, 0.02, color, [0, 0, 0], 0.006));
  sling.add(pivot);
  sling.userData.grip = [0, cord + 0.03, 0];
  sling.userData.pivot = pivot;
  return setChannels(sling, {
    spin: { value: 0, apply: (v) => void (pivot.rotation.x = v * Math.PI * 2) },
    loaded: { value: 0, apply: (v) => void (stone.visible = v > 0.5) },
  });
});

registerAsset('arms.stone', 'Pedra lisa de riacho, pequena, do tamanho de um ovo; pegável (params: size, color)', (p) => {
  const size = num(p.size, 0.05);
  const stone = new THREE.Mesh(new THREE.SphereGeometry(size / 2, 14, 10), mat(String(p.color ?? '#9a958c')));
  stone.scale.set(1, 0.72, 0.85);
  stone.position.y = size * 0.36;
  const g = new THREE.Group();
  g.add(stone);
  g.userData.grip = [0, size * 0.36, 0];
  return g;
});

registerAsset('arms.bow', 'Arco de madeira com a corda, em pé; pegável, pelo meio (params: size, a altura, padrão 1.2)', (p) => {
  const size = num(p.size, 1.2);
  const bow = new THREE.Group();
  const bend = 0.5;
  const radius = size / 2 / Math.sin(bend);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.014, 6, 24, bend * 2).rotateZ(-bend), mat(String(p.color ?? WOOD)));
  // The wood bulges forward (-z); the string is behind it, toward the holder.
  arc.rotation.y = Math.PI / 2;
  arc.position.set(0, size / 2, radius * Math.cos(bend));
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, size, 4), mat('#e8e0cc'));
  string.position.set(0, size / 2, 0);
  bow.add(arc, string, rbox(0.035, 0.1, 0.035, LEATHER, [0, size / 2, -radius * (1 - Math.cos(bend))], 0.01));
  bow.userData.grip = [0, size / 2, -radius * (1 - Math.cos(bend))];
  return bow;
});

registerAsset('arms.tambourine', 'Tamborim (adufe): aro de madeira com pele e platinelas, em pé de frente; pegável, pelo aro de baixo (params: size, o diâmetro, padrão 0.3; color da pele)', (p) => {
  const size = num(p.size, 0.3);
  const r = size / 2;
  const drum = new THREE.Group();
  const face = new THREE.Group();
  face.add(
    new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 28, 1, true).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.8, side: THREE.DoubleSide })),
    new THREE.Mesh(new THREE.CylinderGeometry(r * 0.99, r * 0.99, 0.004, 28).rotateX(Math.PI / 2).translate(0, 0, -0.023), mat(String(p.color ?? '#eadcb8'))),
  );
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.25 + i * 0.375);
    const jingle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 12), metal(BRONZE));
    jingle.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    jingle.rotation.z = a;
    face.add(jingle);
  }
  face.position.y = r;
  drum.add(face);
  drum.userData.grip = [0, 0.01, 0];
  return drum;
});
