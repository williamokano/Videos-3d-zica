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

registerAsset('arms.sword', 'Espada reta de ferro com guarda e punho de bronze; pegável, pelo punho, com a lâmina para cima e um pouco à frente. Canal `swing` (0 a 1) leva a lâmina para a frente e para baixo, como no fim de um golpe (params: length da lâmina, padrão 0.7; color)', (p) => {
  const length = num(p.length, 0.7);
  const wide = 0.05 * Math.sqrt(length / 0.7);
  const sword = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(wide * 0.15, wide / 2, length, 4, 1).scale(1, 1, 0.22).rotateY(Math.PI / 4), metal(String(p.color ?? IRON)));
  blade.scale.set(1.41, 1, 1.41);
  blade.position.y = 0.16 + length / 2;
  // Everything turns round the grip, so `swing` can bring the blade down in a blow without the hand letting go.
  const GRIP = 0.085;
  const pivot = new THREE.Group();
  pivot.position.y = GRIP;
  const parts = new THREE.Group();
  parts.position.y = -GRIP;
  parts.add(
    blade,
    rbox(wide * 2.4, 0.025, 0.04, BRONZE, [0, 0.15, 0], 0.008),
    rod(0.016, 0.12, '#5a3a22', 0.03),
    new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), metal(BRONZE)).translateY(0.025),
  );
  pivot.add(parts);
  sword.add(pivot);
  sword.userData.grip = [0, GRIP, 0];
  sword.userData.tilt = -0.5;
  // `swing` 0: the blade up, as held; 1: turned forward and down, at the end of a blow (the action `chop`).
  return setChannels(sword, { swing: { value: 0, apply: (v) => void (pivot.rotation.x = -1.7 * Math.max(0, Math.min(1, v))) } });
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

registerAsset('arms.sling', 'Funda de pastor: duas cordas e a bolsinha de couro, pendurada da mão. Canais: `spin` (voltas, 0 a 1 é uma volta inteira, girando num plano em pé de frente para trás), `overhead` (1: as cordas saem quase deitadas da mão e `spin` gira em volta dela, como acima da cabeça; é o que a ação `whirl` faz) e `loaded` (1 com a pedra na bolsinha). Pegável, pelas pontas das cordas (params: cord, o comprimento das cordas em metros, padrão 0.6)', (p) => {
  // Real slings have cords of 60 to 90 cm: a longer arm throws harder, and it reads as a sling, not a yo-yo.
  const cord = num(p.cord, 0.6);
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
  // Over the head the cords stand out from the hand, nearly level (a little below), and go round it.
  pivot.rotation.order = 'YZX';
  const DROOP = (80 * Math.PI) / 180;
  let spin = 0;
  let overhead = 0;
  const turn = (): void => {
    if (overhead >= 0.5) pivot.rotation.set(0, spin * Math.PI * 2, DROOP);
    else pivot.rotation.set(spin * Math.PI * 2, 0, 0);
  };
  return setChannels(sling, {
    spin: { value: 0, apply: (v) => void ((spin = v), turn()) },
    overhead: { value: 0, apply: (v) => void ((overhead = v), turn()) },
    loaded: { value: 0, apply: (v) => void (stone.visible = v > 0.5) },
  });
});

registerAsset('arms.stone', 'Pedra lisa de riacho, pequena, do tamanho de um ovo; pegável. Canal `trail` (0 a 1): um rastro de ar atrás dela, para o voo (o `throw` liga sozinho e vira a pedra para onde ela vai) (params: size, color)', (p) => {
  const size = num(p.size, 0.05);
  const stone = new THREE.Mesh(new THREE.SphereGeometry(size / 2, 14, 10), mat(String(p.color ?? '#9a958c')));
  stone.scale.set(1, 0.72, 0.85);
  stone.position.y = size * 0.36;
  const g = new THREE.Group();
  g.add(stone);
  g.userData.grip = [0, size * 0.36, 0];
  // The trail: a long thin cone of pale air behind the stone (behind is +z, the stone faces where it goes).
  const length = size * 16;
  const trail = new THREE.Mesh(
    new THREE.ConeGeometry(size * 0.42, length, 10, 1, true).rotateX(Math.PI / 2).translate(0, 0, length / 2),
    new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  );
  trail.position.y = size * 0.36;
  trail.userData.noOutline = true;
  trail.visible = false;
  g.add(trail);
  return setChannels(g, {
    trail: {
      value: 0,
      apply: (v) => {
        trail.visible = v > 0.01;
        trail.scale.set(1, 1, Math.max(0.01, v));
        (trail.material as THREE.MeshBasicMaterial).opacity = 0.55 * Math.min(1, v);
      },
    },
  });
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

registerAsset('arms.lyre', 'Kinnor, a lira pequena de madeira: caixa de som embaixo, dois braços que se abrem, a travessa inclinada em cima e as cordas, de frente para -z (50 cm). Pegável, pela ponta de baixo da caixa: segure na mão esquerda, ela fica de pé ao lado do corpo e inclinada para fora; com `raise` (`to: "chest"`) fica contra o peito e o braço (params: size — escala —, strings — quantas cordas, 8 —, color)', (p) => {
  const wood = String(p.color ?? '#9a6a3c');
  const dark = '#5e3d22';
  const lyre = new THREE.Group();
  // The sound box, its hole and the bar where the strings are tied, on the front.
  const [bw, bh, bd] = [0.24, 0.13, 0.06];
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16).rotateY(Math.PI), mat('#24170e'));
  hole.position.set(0, 0.078, -bd / 2 - 0.001);
  lyre.add(rbox(bw, bh, bd, wood, [0, bh / 2, 0], 0.025), hole, rbox(0.15, 0.016, 0.014, dark, [0, 0.03, -bd / 2 - 0.005], 0.005));
  // Two arms bowing outward, the left one taller, and the yoke across them, slanted.
  const [left, right] = [new THREE.Vector3(-0.15, 0.49, 0), new THREE.Vector3(0.13, 0.43, 0)];
  for (const [x0, top, bow] of [[-0.085, left, -0.05], [0.085, right, 0.045]] as const) {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0, bh - 0.01, 0), new THREE.Vector3(x0 + bow, (bh + top.y) / 2, 0), top.clone().add(new THREE.Vector3(0, -0.015, 0)));
    lyre.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.012, 7), mat(wood)));
  }
  const ends = [left.clone().add(new THREE.Vector3(-0.025, 0.004, 0)), right.clone().add(new THREE.Vector3(0.025, -0.001, 0))];
  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, ends[0].distanceTo(ends[1]), 8), mat(dark));
  yoke.position.copy(ends[0]).add(ends[1]).multiplyScalar(0.5);
  yoke.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ends[1].clone().sub(ends[0]).normalize());
  lyre.add(yoke);
  for (const end of ends) lyre.add(new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), mat(dark)).translateX(end.x).translateY(end.y));
  // The strings: from the bar on the box up to the yoke, in front of it.
  const n = Math.max(3, Math.round(num(p.strings, 8)));
  const points: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const top = new THREE.Vector3().lerpVectors(left, right, 0.12 + u * 0.76);
    points.push(-0.06 + u * 0.12, 0.034, -bd / 2 - 0.013, top.x, top.y - 0.012, -0.013);
  }
  const strings = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)), new THREE.LineBasicMaterial({ color: '#efe6cf' }));
  lyre.add(strings);
  for (const m of lyre.children) m.userData.noOutline = m !== lyre.children[0];
  // In the left hand: held by the lower corner of the box nearest the body, the top leaning away from the head.
  const grip = new THREE.Vector3(bw / 2 - 0.035, 0.035, 0.012);
  const lean = new THREE.Group();
  lean.position.copy(grip);
  lean.rotation.z = 0.22;
  lyre.position.copy(grip).negate();
  lean.add(lyre);
  // Leaning, the far corner of the box would go into the ground: everything goes up as much.
  lean.position.y -= new THREE.Box3().setFromObject(lean).min.y;
  const g = new THREE.Group();
  g.add(lean);
  g.scale.setScalar(num(p.size, 1));
  g.userData.grip = lean.position.clone().multiplyScalar(num(p.size, 1)).toArray();
  return g;
});

/** A hollow tube along a curve that narrows from radius r0 at the start to r1 at the end. */
function taperedTube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, segments = 24, radial = 12): THREE.BufferGeometry {
  const tube = new THREE.TubeGeometry(curve, segments, 1, radial, false);
  const pos = tube.attributes.position;
  const at = new THREE.Vector3();
  const center = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const u = Math.floor(i / (radial + 1)) / segments;
    curve.getPointAt(u, center);
    at.fromBufferAttribute(pos, i).sub(center).multiplyScalar(r0 + (r1 - r0) * u ** 0.8).add(center);
    pos.setXYZ(i, at.x, at.y, at.z);
  }
  tube.computeVertexNormals();
  return tube;
}

registerAsset('arms.oilHorn', 'Chifre de carneiro com azeite de unção, tampado embaixo, a boca estreita em cima com aro de bronze (30 cm). Pegável, pelo meio: segure na mão direita. Canal `pour`: 0 em pé, 1 virado com a boca para baixo (120°, girando na mão); passando de 0,6 cai da boca um fio de azeite dourado que balança (params: stream — comprimento do fio, 0,6 m —, color — do chifre)', (p) => {
  const horn = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([[0, 0.012, 0.035], [0, 0.09, 0.045], [0, 0.17, 0.028], [0, 0.235, -0.008], [0, 0.272, -0.06]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  // Light at the wide end, darker toward the tip.
  const body = taperedTube(curve, 0.036, 0.011);
  const [from, to] = [new THREE.Color(String(p.color ?? '#e3d0a6')), new THREE.Color('#8a6644')];
  const tint = new THREE.Color();
  const colors: number[] = [];
  for (let i = 0; i < body.attributes.position.count; i++) {
    tint.lerpColors(from, to, (Math.floor(i / 13) / 24) ** 1.5);
    colors.push(tint.r, tint.g, tint.b);
  }
  body.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  horn.add(new THREE.Mesh(body, new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.55 })));
  // Ridges round the horn, the wooden plug at the bottom, the bronze rim at the mouth.
  const along = (u: number, r: number, tube: number, color: THREE.Material) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 18), color);
    ring.position.copy(curve.getPointAt(u));
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangentAt(u));
    ring.userData.noOutline = true;
    return ring;
  };
  for (const u of [0.22, 0.4, 0.56]) horn.add(along(u, 0.036 - 0.025 * u ** 0.8, 0.003, mat('#c7b08a')));
  const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.022, 14), mat(WOOD));
  plug.position.copy(curve.getPointAt(0)).add(new THREE.Vector3(0, -0.004, 0));
  plug.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangentAt(0));
  const mouth = curve.getPointAt(1).add(curve.getTangentAt(1).multiplyScalar(0.004));
  horn.add(plug, along(1, 0.0125, 0.0045, metal(BRONZE)));
  // Held by the middle: the horn turns round the hand.
  const grip = curve.getPointAt(0.42);
  const pivot = new THREE.Group();
  pivot.position.copy(grip);
  horn.position.copy(grip).negate();
  pivot.add(horn);
  // The oil falls straight down from the mouth, wherever the mouth is.
  const length = num(p.stream, 0.6);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0028, 1, 6, 1).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: '#e2ac2c', emissive: '#4a3000', roughness: 0.2, metalness: 0.1 }));
  stream.userData.noOutline = stream.userData.noShadow = true;
  const g = new THREE.Group();
  g.add(pivot, stream);
  g.userData.grip = grip.toArray();
  g.userData.pivot = pivot;
  g.userData.stream = stream;
  const tip = new THREE.Vector3();
  let flow = 0;
  const pour = (v: number) => {
    pivot.rotation.x = -v * (Math.PI * 2) / 3;
    pivot.updateMatrix();
    tip.copy(mouth).sub(grip).applyQuaternion(pivot.quaternion).add(grip);
    stream.position.copy(tip);
    // Starting to run once the mouth is well down.
    flow = Math.max(0, Math.min(1, (v - 0.6) / 0.12));
    stream.visible = flow > 0;
    stream.scale.y = Math.max(0.001, flow * length);
  };
  g.userData.animate = (t: number) => {
    if (!stream.visible) return;
    stream.rotation.set(0.035 * Math.sin(t * 4.7 + 1), 0, 0.04 * Math.sin(t * 6.1));
    const k = 1 + 0.2 * Math.sin(t * 17);
    stream.scale.set(k, Math.max(0.001, flow * length * (1 + 0.03 * Math.sin(t * 9.3))), k);
  };
  return setChannels(g, { pour: { value: 0, apply: pour } });
});

registerAsset('arms.helmet', 'Capacete de bronze redondo, com ponta e protetor de nuca, solto (o mesmo da peça de roupa bronzeHelmet, para vestir com "don" e tirar com "doff"). Pegável, pela borda (params: size, o raio da cabeça, padrão 0.16; color)', (p) => {
  const r = num(p.size, 0.16);
  const color = String(p.color ?? BRONZE);
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(r * 1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), metal(color));
  shell.scale.set(1, 1.05, 1.06);
  shell.position.y = r * 0.1;
  const knob = new THREE.Mesh(new THREE.ConeGeometry(r * 0.12, r * 0.32, 12), metal(color));
  knob.position.y = r * 1.28;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.08, r * 0.055, 8, 28).rotateX(Math.PI / 2), metal('#8a5f2a'));
  rim.position.y = r * 0.42;
  rim.scale.set(1, 1, 1.07);
  const inner = new THREE.Group();
  inner.add(shell, knob, rim);
  // Standing on its rim.
  inner.position.y = -r * 0.36;
  g.add(inner);
  g.userData.grip = [r * 1.08, r * 0.12, 0];
  return g;
});

registerAsset('arms.armor', 'Couraça de escamas de bronze, solta (a peça de roupa scaleArmor fora do corpo, para vestir com "don" e tirar com "doff"): peito, barriga e ombreiras. Pegável, pelos ombros (params: size, a largura, padrão 0.45; color)', (p) => {
  const w = num(p.size, 0.45);
  const color = String(p.color ?? BRONZE);
  const g = new THREE.Group();
  g.add(
    rbox(w, w * 0.7, w * 0.55, color, [0, w * 0.82, 0], w * 0.18),
    rbox(w * 0.84, w * 0.5, w * 0.5, color, [0, w * 0.3, 0], w * 0.14),
    rbox(w * 0.3, w * 0.1, w * 0.36, '#8a5f2a', [-w * 0.42, w * 1.14, 0], w * 0.04),
    rbox(w * 0.3, w * 0.1, w * 0.36, '#8a5f2a', [w * 0.42, w * 1.14, 0], w * 0.04),
  );
  // Rows of scales on the front.
  for (let y = 0.1; y < 1.1; y += 0.14) g.add(rbox(w * (y > 0.55 ? 0.92 : 0.76), w * 0.035, 0.012, '#c99550', [0, w * y, -w * (y > 0.55 ? 0.28 : 0.255)], 0.005));
  g.userData.grip = [w * 0.42, w * 1.18, 0];
  return g;
});
