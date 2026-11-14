/**
 * Things a character wears over the built-in body: a cap, a vest, a backpack, a duty belt. Each is a few pieces
 * fixed to joints of the standard skeleton, so it moves with the body in every pose with no extra work. A
 * character lists what it wears in its file (`wear`), by id, with a color where it makes sense:
 *
 *   "wear": ["policeCap", { "id": "vest", "color": "#1d2430" }, "dutyBelt", "badge"]
 *
 * Check the catalog here before adding a piece; a new one should serve more than one character.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, rbox } from '../assets/registry';
import { PARENT, type Joint } from './types';

export interface WearSpec {
  id: string;
  /** Main color of the piece. */
  color?: string;
  /** Second color: a stripe, a flap, a logo plate. */
  accent?: string;
  /** Starts out of sight, to be put on during an episode (`showWear` on the rig). */
  hidden?: boolean;
}

/** What a piece is built against: the size of this body. */
export interface WearBody {
  /** Radius of the head. */
  head: number;
  /** Body width factor (1 is the default build). */
  wide: number;
  shirt: string;
}

/** A part of a piece, in the frame of the joint it is fixed to ("head" is the center of the head). */
export interface WearPart {
  joint: Joint;
  object: THREE.Object3D;
  /** Id of the piece this part belongs to (filled by buildWear). */
  id?: string;
  /** Called after every pose with the joints of the body, for a piece that moves by itself (a skirt keeping clear of the legs). */
  pose?(joints: Record<Joint, THREE.Object3D>): void;
}

interface Wearable {
  description: string;
  build(spec: WearSpec, body: WearBody): WearPart[];
}

const catalog = new Map<string, Wearable>();

export function registerWearable(id: string, description: string, build: Wearable['build']): void {
  if (catalog.has(id)) throw new Error(`Wearable already registered: ${id}`);
  catalog.set(id, { description, build });
}

export function listWearables(): { id: string; description: string }[] {
  return [...catalog].map(([id, w]) => ({ id, description: w.description }));
}

/** The parts of everything a character wears. Unknown ids are an error that names the catalog. */
export function buildWear(wear: (string | WearSpec)[] | undefined, body: WearBody): WearPart[] {
  return (wear ?? []).flatMap((entry) => {
    const spec = typeof entry === 'string' ? { id: entry } : entry;
    const piece = catalog.get(spec.id);
    if (!piece) throw new Error(`Peça de roupa desconhecida "${spec.id}". Existem: ${[...catalog.keys()].join(', ')}.`);
    return piece.build(spec, body).map((p) => {
      if (spec.hidden) p.object.visible = false;
      return { ...p, id: spec.id };
    });
  });
}

const part = (joint: Joint, object: THREE.Object3D): WearPart => ({ joint, object });
const dome = (radius: number, color: string, from = 0, to = Math.PI / 2): THREE.Mesh => new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, from, to), mat(color));
const disc = (radius: number, height: number, color: string): THREE.Mesh => new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), mat(color));

// ---- Head ----

registerWearable('cap', 'Boné, com a aba para a frente (color, accent no botão de cima)', (s, b) => {
  const r = b.head;
  const color = s.color ?? '#c0392b';
  const crown = dome(r * 1.06, color, 0, Math.PI * 0.42);
  crown.position.y = r * 0.16;
  const brim = rbox(r * 1.3, r * 0.07, r * 0.95, color, [0, r * 0.52, -r * 1.25], r * 0.03);
  brim.rotation.x = 0.12;
  const button = disc(r * 0.1, r * 0.05, s.accent ?? color);
  button.position.y = r * 1.22;
  return [part('head', crown), part('head', brim), part('head', button)];
});

registerWearable('policeCap', 'Quepe de policial: copa chata, aba curta e distintivo na frente (color, accent no distintivo)', (s, b) => {
  const r = b.head;
  const color = s.color ?? '#1f2a3d';
  const band = disc(r * 0.98, r * 0.28, color);
  band.position.y = r * 0.78;
  const top = disc(r * 1.16, r * 0.14, color);
  top.position.y = r * 1.0;
  const visor = rbox(r * 1.2, r * 0.06, r * 0.6, '#11151c', [0, r * 0.64, -r * 1.02], r * 0.025);
  visor.rotation.x = 0.25;
  const badge = rbox(r * 0.24, r * 0.26, r * 0.05, s.accent ?? '#d9b04a', [0, r * 0.82, -r * 0.98], r * 0.02);
  return [part('head', band), part('head', top), part('head', visor), part('head', badge)];
});

registerWearable('helmet', 'Capacete (de bicicleta ou moto aberto), com faixa embaixo (color, accent na faixa)', (s, b) => {
  const r = b.head;
  const shell = dome(r * 1.12, s.color ?? '#e9e9e4', 0, Math.PI * 0.42);
  shell.position.y = r * 0.12;
  shell.scale.set(1, 1, 1.08);
  // The rim sits above the brows, so the eyes stay in view.
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.08, r * 0.05, 8, 28).rotateX(Math.PI / 2), mat(s.accent ?? '#2b2e36'));
  rim.position.y = r * 0.4;
  rim.scale.set(1, 1, 1.08);
  return [part('head', shell), part('head', rim)];
});

// ---- Body ----

registerWearable('vest', 'Colete por cima da camisa, tático ou refletivo: cobre o peito e a barriga (color, accent em duas faixas)', (s, b) => {
  const color = s.color ?? '#1d2430';
  const chest = new THREE.Group();
  chest.add(rbox(0.385 * b.wide, 0.3, 0.225 * b.wide, color, [0, 0.11, 0], 0.09));
  const belly = new THREE.Group();
  belly.add(rbox(0.315 * b.wide, 0.2, 0.205 * b.wide, color, [0, 0.07, 0], 0.07));
  if (s.accent) {
    chest.add(rbox(0.39 * b.wide, 0.035, 0.23 * b.wide, s.accent, [0, 0.06, 0], 0.012));
    belly.add(rbox(0.32 * b.wide, 0.035, 0.21 * b.wide, s.accent, [0, 0.04, 0], 0.012));
  } else {
    // Pouches on the front, as on a tactical vest.
    for (const x of [-0.09, 0.09]) chest.add(rbox(0.1, 0.1, 0.05, '#2a3342', [x * b.wide, 0.03, -0.115 * b.wide], 0.015));
  }
  return [part('chest', chest), part('spine', belly)];
});

registerWearable('badge', 'Distintivo no peito, do lado esquerdo (color)', (s, b) => [
  part('chest', rbox(0.055, 0.065, 0.02, s.color ?? '#d9b04a', [-0.1 * b.wide, 0.17, -0.118 * b.wide], 0.012)),
]);

registerWearable('longSleeves', 'Mangas compridas: o antebraço fica da cor da camisa (color para outra cor)', (s, b) =>
  (['L', 'R'] as const).map((side) => {
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.05 * b.wide, 0.2, 4, 10).rotateZ(Math.PI / 2), mat(s.color ?? b.shirt));
    sleeve.position.x = (side === 'L' ? -1 : 1) * 0.11;
    return part(`forearm${side}`, sleeve);
  }),
);

registerWearable('dutyBelt', 'Cinto de serviço: coldre do lado direito, rádio do lado esquerdo e fivela (color, accent na fivela)', (s, b) => {
  const color = s.color ?? '#15181e';
  const belt = new THREE.Group();
  belt.add(
    rbox(0.32 * b.wide, 0.05, 0.21 * b.wide, color, [0, 0.1, 0], 0.02),
    rbox(0.05, 0.045, 0.02, s.accent ?? '#b9bcc2', [0, 0.1, -0.108 * b.wide], 0.008),
    // Holster on the right hip, radio on the left with its short antenna.
    rbox(0.06, 0.17, 0.1, color, [0.17 * b.wide, 0.03, -0.01], 0.02),
    rbox(0.035, 0.07, 0.05, '#2b2f38', [0.172 * b.wide, 0.13, -0.02], 0.01),
    rbox(0.05, 0.11, 0.06, '#22262e', [-0.17 * b.wide, 0.07, 0], 0.012),
    rbox(0.012, 0.08, 0.012, '#111318', [-0.185 * b.wide, 0.165, 0.015], 0.004),
  );
  return [part('hips', belt)];
});

registerWearable('backpack', 'Mochila nas costas, com alças (color, accent no bolso)', (s, b) => {
  const color = s.color ?? '#2f5d8a';
  const pack = new THREE.Group();
  pack.add(
    rbox(0.3 * b.wide, 0.36, 0.14, color, [0, 0.04, 0.17 * b.wide], 0.05),
    rbox(0.22 * b.wide, 0.14, 0.05, s.accent ?? color, [0, -0.04, 0.25 * b.wide], 0.02),
  );
  for (const x of [-0.11, 0.11]) pack.add(rbox(0.04, 0.3, 0.235 * b.wide, color, [x * b.wide, 0.1, 0.005], 0.015));
  return [part('chest', pack)];
});

registerWearable('deliveryBag', 'Bag de entrega: caixa térmica grande nas costas, com alças e tampa (color, accent na tampa e na faixa)', (s, b) => {
  const color = s.color ?? '#d7263d';
  const accent = s.accent ?? '#f4f4f0';
  const bag = new THREE.Group();
  bag.add(
    rbox(0.44, 0.46, 0.36, color, [0, 0.08, 0.3 * b.wide], 0.03),
    rbox(0.45, 0.05, 0.37, accent, [0, 0.31, 0.3 * b.wide], 0.02),
    rbox(0.3, 0.16, 0.01, accent, [0, 0.08, 0.3 * b.wide + 0.183], 0.004),
  );
  for (const x of [-0.11, 0.11]) bag.add(rbox(0.045, 0.34, 0.24 * b.wide, '#1c1f26', [x * b.wide, 0.1, 0.01], 0.015));
  return [part('chest', bag)];
});

// ---- Cloth that hangs: skirts, robes, cloaks ----

/** One ring of a drape: how long its panels are, how far they flare out at least (radians), how much wider they get at the bottom. */
interface DrapeSegment {
  length: number;
  flare: number;
  grow: number;
}

/**
 * Cloth hanging from a ring around a joint, cut in panels hinged at the top, like a pleated skirt. After each
 * pose every panel swings out just enough to keep clear of the legs, so a skirt opens over a step and lies
 * on the lap of someone sitting. A drape of two segments bends at the knee (a robe down to the ankles).
 */
interface Drape {
  joint: Joint;
  /** Height of the ring in the frame of the joint. */
  y: number;
  /** Half width and half depth of the ring. */
  rx: number;
  rz: number;
  /** Part of the ring that has cloth, in radians: 0 is the back (+z), ±π the front. */
  arc: [number, number];
  panels: number;
  segments: DrapeSegment[];
  color: string;
  /** Color of a band along the bottom edge. */
  hem?: string;
}

/** A thin panel hanging down from its top edge, `top` wide there and `bottom` wide at the end, curved like part of a ring of radius `radius`. */
function panelGeometry(top: number, bottom: number, length: number, thick: number, radius: number): THREE.BufferGeometry {
  const g = new RoundedBoxGeometry(top, length, thick, 2, Math.min(thick / 2, 0.006));
  g.translate(0, -length / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = -p.getY(i) / length;
    const x = p.getX(i) * (1 + (bottom / top - 1) * v);
    p.setXYZ(i, x, p.getY(i), p.getZ(i) - (x * x) / (2 * radius));
  }
  g.computeVertexNormals();
  return g;
}

/** Matrix taking a point from the frame of `joint` to the frame of the hips. */
function toHips(joints: Record<Joint, THREE.Object3D>, joint: Joint, out: THREE.Matrix4): THREE.Matrix4 {
  out.identity();
  for (let j: Joint | null = joint; j && j !== 'hips'; j = PARENT[j]) {
    joints[j].updateMatrix();
    out.premultiply(joints[j].matrix);
  }
  return out;
}

/** Points along both legs, in the frame of the hips, with the radius of the leg there and the way that part of the leg points. */
function legPoints(joints: Record<Joint, THREE.Object3D>, wide: number): { p: THREE.Vector3; r: number; dir: THREE.Vector3 }[] {
  const out: { p: THREE.Vector3; r: number; dir: THREE.Vector3 }[] = [];
  const thigh = new THREE.Matrix4();
  const shin = new THREE.Matrix4();
  for (const side of ['L', 'R'] as const) {
    toHips(joints, `thigh${side}`, thigh);
    toHips(joints, `shin${side}`, shin);
    const knee = new THREE.Vector3(0, 0, 0).applyMatrix4(shin);
    const hip = new THREE.Vector3(0, 0, 0).applyMatrix4(thigh);
    const ankle = new THREE.Vector3(0, -0.4, 0).applyMatrix4(shin);
    const along = knee.clone().sub(hip).normalize();
    const below = ankle.clone().sub(knee).normalize();
    for (const t of [0.3, 0.55, 0.8, 1]) out.push({ p: new THREE.Vector3(0, -0.42 * t, 0).applyMatrix4(thigh), r: 0.075 * wide, dir: along });
    for (const t of [0.35, 0.7, 1]) out.push({ p: new THREE.Vector3(0, -0.4 * t, 0).applyMatrix4(shin), r: 0.062 * wide, dir: below });
  }
  return out;
}

function drape(d: Drape, wide: number): WearPart {
  const group = new THREE.Group();
  const [from, to] = d.arc;
  const span = to - from;
  const radius = (d.rx + d.rz) / 2;
  const perimeter = 2 * Math.PI * Math.sqrt((d.rx * d.rx + d.rz * d.rz) / 2) * (span / (2 * Math.PI));
  // Neighbouring panels overlap, so no gap opens between them when one swings out more.
  const thick = 0.013;
  const panels = Array.from({ length: d.panels }, (_, i) => {
    const angle = from + ((i + 0.5) / d.panels) * span;
    const pivot = new THREE.Group();
    pivot.position.set(d.rx * Math.sin(angle), d.y, d.rz * Math.cos(angle));
    pivot.rotation.y = angle;
    group.add(pivot);
    let parent: THREE.Object3D = pivot;
    let width = (perimeter / d.panels) * 1.35;
    let ring = radius;
    const hinges = d.segments.map((segment, k) => {
      const hinge = new THREE.Group();
      if (k > 0) hinge.position.y = -d.segments[k - 1].length;
      const bottom = width * segment.grow;
      hinge.add(new THREE.Mesh(panelGeometry(width, bottom, segment.length, thick, ring), mat(d.color)));
      if (d.hem && k === d.segments.length - 1) {
        const hem = new THREE.Mesh(panelGeometry(bottom * 0.995, bottom * 1.005, 0.045, thick * 1.4, ring * segment.grow), mat(d.hem));
        hem.position.y = -segment.length + 0.045;
        hinge.add(hem);
      }
      parent.add(hinge);
      parent = hinge;
      const widths = [width, bottom];
      width = bottom;
      ring *= segment.grow;
      return { hinge, segment, widths };
    });
    return { angle, cos: Math.cos(angle), sin: Math.sin(angle), pivot, hinges };
  });

  const frame = new THREE.Matrix4();
  const local = new THREE.Vector3();
  const DOWN = new THREE.Vector3(0, -1, 0);
  const swing = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const before = new THREE.Quaternion();
  return {
    joint: d.joint,
    object: group,
    pose(joints) {
      // The legs, seen from the joint the cloth hangs on.
      const fromHips = toHips(joints, d.joint, frame).invert();
      const legs = legPoints(joints, wide).map(({ p, r, dir }) => ({ p: p.applyMatrix4(fromHips), r, dir: dir.clone().transformDirection(fromHips) }));
      for (const panel of panels) {
        // Each leg point in the frame of the panel: x across it, y up, z out.
        const across = (x: number, z: number): [number, number] => [x * panel.cos - z * panel.sin, x * panel.sin + z * panel.cos];
        const pts = legs.map(({ p, r, dir }) => {
          local.set(p.x - panel.pivot.position.x, p.y - d.y, p.z - panel.pivot.position.z);
          const [x, z] = across(local.x, local.z);
          const [dx, dz] = across(dir.x, dir.z);
          return { x, y: local.y, z, r, dx, dz };
        });
        const end = new THREE.Vector3();
        before.identity();
        for (const { hinge, segment, widths } of panel.hinges) {
          let need = segment.flare;
          let push: (typeof pts)[number] | undefined;
          for (const p of pts) {
            const h = end.y - p.y;
            if (h < 0.01 || h > segment.length + 0.1) continue;
            const half = (widths[0] + (widths[1] - widths[0]) * Math.min(1, h / segment.length)) / 2;
            if (Math.abs(p.x - end.x) > half + p.r) continue;
            // The tilt that leaves the point (and the leg round it) behind the panel, measured square to the panel.
            const far = Math.hypot(h, p.z - end.z);
            const a = Math.atan2(p.z - end.z, h) + Math.asin(Math.min(1, (p.r + 0.02) / far));
            if (a > need) [need, push] = [a, p];
          }
          // Pushed by a leg, the panel swings the way the leg goes (forward over the lap, back behind a step), not
          // only straight out, so that neighbouring panels stay side by side instead of opening like a fan.
          let [sx, sz] = [0, 1];
          if (push && Math.hypot(push.dx, push.dz) > 0.2) {
            const l = Math.hypot(push.dx, push.dz + 0.35);
            [sx, sz] = [push.dx / l, (push.dz + 0.35) / l];
          }
          const tilt = Math.min(1.6, need / Math.max(sz, 0.5));
          swing.set(Math.sin(tilt) * sx, -Math.cos(tilt), Math.sin(tilt) * sz);
          turn.setFromUnitVectors(DOWN, swing);
          hinge.quaternion.copy(before).invert().multiply(turn);
          before.copy(turn);
          end.addScaledVector(swing, segment.length);
        }
      }
    },
  };
}

// ---- Period pieces (the ancient Near East): tunics, robes, armor of bronze ----

const BRONZE = '#b5803a';
const BRONZE_DARK = '#7f5727';
const shade = (color: string, k: number): string => `#${new THREE.Color(color).multiplyScalar(k).getHexString()}`;

/** Cloth over the chest and the belly, a little larger than the body. */
function torso(color: string, b: WearBody, grow = 1): WearPart[] {
  return [
    part('chest', rbox(0.372 * b.wide * grow, 0.29, 0.212 * b.wide * grow, color, [0, 0.12, 0], 0.09)),
    part('spine', rbox(0.302 * b.wide * grow, 0.215, 0.192 * b.wide * grow, color, [0, 0.07, 0], 0.07)),
  ];
}

/** A sleeve on each upper arm, from the shoulder `length` along the arm, widening a little. */
function sleeves(color: string, b: WearBody, length: number, joint: 'upperArm' | 'forearm' = 'upperArm', radius = 0.066, end = 1.12, from = 0.015): WearPart[] {
  return (['L', 'R'] as const).map((side) => {
    const x = side === 'L' ? -1 : 1;
    const geometry = new THREE.CylinderGeometry(radius * b.wide, radius * end * b.wide, length, 16).rotateZ(x * (Math.PI / 2));
    const sleeve = new THREE.Mesh(geometry, mat(color));
    sleeve.position.x = x * (from + length / 2);
    return part(`${joint}${side}`, sleeve);
  });
}

/** A narrow belt at the waist, over the top of a skirt. */
const belt = (color: string, b: WearBody, height = 0.045): WearPart => part('hips', rbox(0.348 * b.wide, height, 0.25 * b.wide, color, [0, 0.105, 0], height / 2));

registerWearable('tunic', 'Túnica até o joelho, de manga curta, com cinto estreito; a saia abre ao andar e cobre o colo sentado (color, accent no cinto e na barra). Ponha `pants` e `shoes` da cor da pele para pernas de fora', (s, b) => {
  const color = s.color ?? b.shirt;
  const trim = s.accent ?? shade(color, 0.6);
  return [
    ...torso(color, b),
    ...sleeves(color, b, 0.15),
    drape({ joint: 'hips', y: 0.1, rx: 0.168 * b.wide, rz: 0.118 * b.wide, arc: [-Math.PI, Math.PI], panels: 14, segments: [{ length: 0.42, flare: 0.14, grow: 1.35 }], color, hem: s.accent }, b.wide),
    belt(trim, b),
  ];
});

registerWearable('robe', 'Manto longo até os tornozelos, de mangas compridas e largas: rei, sacerdote, mulher (color, accent na barra e nos punhos)', (s, b) => {
  const color = s.color ?? b.shirt;
  const parts = [
    ...torso(color, b),
    ...sleeves(color, b, 0.27, 'upperArm', 0.068, 1.12),
    ...sleeves(color, b, 0.2, 'forearm', 0.08, 1.45, 0.0),
    drape({ joint: 'hips', y: 0.1, rx: 0.17 * b.wide, rz: 0.12 * b.wide, arc: [-Math.PI, Math.PI], panels: 16, segments: [{ length: 0.46, flare: 0.1, grow: 1.3 }, { length: 0.42, flare: 0.04, grow: 1.22 }], color, hem: s.accent }, b.wide),
  ];
  if (s.accent) parts.push(...sleeves(s.accent, b, 0.03, 'forearm', 0.08 * 1.42, 1.02, 0.19));
  return parts;
});

registerWearable('cloak', 'Capa sobre os ombros, caindo pelas costas até a panturrilha, presa na frente (color, accent no broche e na barra)', (s, b) => {
  const color = s.color ?? '#7a2b2b';
  const yoke = new THREE.Group();
  // Over the shoulders and round the back of the neck, closed on the chest by a brooch.
  yoke.add(rbox(0.4 * b.wide, 0.045, 0.235 * b.wide, color, [0, 0.25, 0.01], 0.022));
  const brooch = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 16).rotateX(Math.PI / 2), mat(s.accent ?? '#d9b04a'));
  brooch.position.set(0, 0.235, -0.13 * b.wide);
  yoke.add(brooch);
  return [
    part('chest', yoke),
    drape({ joint: 'chest', y: 0.25, rx: 0.205 * b.wide, rz: 0.13 * b.wide, arc: [-1.05, 1.05], panels: 7, segments: [{ length: 0.6, flare: 0.07, grow: 1.25 }, { length: 0.42, flare: 0.04, grow: 1.12 }], color, hem: s.accent }, b.wide),
  ];
});

registerWearable('sash', 'Faixa larga de pano na cintura, com a ponta caindo do lado (color, accent numa listra)', (s, b) => {
  const color = s.color ?? '#a8322d';
  const sash = new THREE.Group();
  sash.add(rbox(0.36 * b.wide, 0.08, 0.262 * b.wide, color, [0, 0.11, 0], 0.035));
  if (s.accent) sash.add(rbox(0.362 * b.wide, 0.018, 0.264 * b.wide, s.accent, [0, 0.11, 0], 0.008));
  // The knot and its ends, on the left of the front.
  sash.add(rbox(0.06, 0.06, 0.04, color, [-0.08 * b.wide, 0.11, -0.135 * b.wide], 0.02));
  const end = rbox(0.045, 0.2, 0.015, color, [-0.09 * b.wide, -0.0, -0.14 * b.wide], 0.007);
  end.rotation.z = 0.12;
  sash.add(end);
  return [part('hips', sash)];
});

registerWearable('sandals', 'Sandálias de couro: sola e tiras sobre o pé e no tornozelo. Ponha `shoes` da cor da pele (color)', (s, b) => {
  const color = s.color ?? '#6b4423';
  return (['L', 'R'] as const).flatMap((side) => {
    const foot = new THREE.Group();
    foot.add(
      rbox(0.112, 0.018, 0.255, color, [0, -0.051, -0.052], 0.008),
      rbox(0.108, 0.085, 0.022, color, [0, -0.022, -0.115], 0.01),
      rbox(0.108, 0.085, 0.022, color, [0, -0.022, -0.035], 0.01),
    );
    const ankle = new THREE.Mesh(new THREE.TorusGeometry(0.062 * b.wide, 0.011, 6, 18).rotateX(Math.PI / 2), mat(color));
    ankle.position.y = -0.37;
    return [part(`foot${side}`, foot), part(`shin${side}`, ankle)];
  });
});

registerWearable('scaleArmor', 'Couraça de escamas de bronze sobre o peito e a barriga, com ombreiras (color, accent nas escamas)', (s, b) => {
  const color = s.color ?? BRONZE;
  const scales = s.accent ?? shade(color, 1.18);
  /** Rows of scales over the front and the back of a box `w` wide and `d` deep, from y0 down to y1. */
  const rows = (w: number, d: number, y0: number, y1: number): THREE.Mesh => {
    const pieces: THREE.BufferGeometry[] = [];
    const size = 0.026 * b.wide;
    for (let y = y0, row = 0; y >= y1; y -= size * 1.5, row++) {
      for (let x = -w / 2 + size, i = 0; x <= w / 2 - size * 0.5; x += size * 1.7, i++) {
        for (const z of [-1, 1]) {
          const scale = new THREE.SphereGeometry(size, 6, 4).scale(1, 1.25, 0.35).translate(x + (row % 2) * size * 0.85, y, z * d / 2);
          pieces.push(scale);
        }
      }
    }
    const mesh = new THREE.Mesh(mergeGeometries(pieces), mat(scales));
    mesh.userData.noOutline = true;
    return mesh;
  };
  const chest = new THREE.Group();
  chest.add(rbox(0.395 * b.wide, 0.31, 0.236 * b.wide, color, [0, 0.11, 0], 0.09), rows(0.33 * b.wide, 0.236 * b.wide, 0.22, -0.02));
  const belly = new THREE.Group();
  belly.add(rbox(0.33 * b.wide, 0.21, 0.218 * b.wide, color, [0, 0.075, 0], 0.07), rows(0.28 * b.wide, 0.218 * b.wide, 0.14, 0.0));
  return [part('chest', chest), part('spine', belly), ...sleeves(shade(color, 0.9), b, 0.11, 'upperArm', 0.078, 1.15, 0.0)];
});

registerWearable('greaves', 'Caneleiras de bronze, do joelho ao tornozelo (color)', (s, b) => {
  const color = s.color ?? BRONZE;
  return (['L', 'R'] as const).flatMap((side) => {
    const greave = new THREE.Mesh(new THREE.CylinderGeometry(0.074 * b.wide, 0.066 * b.wide, 0.3, 16), mat(color));
    greave.position.y = -0.2;
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.07 * b.wide, 14, 10), mat(color));
    knee.scale.set(1, 0.8, 0.7);
    knee.position.set(0, -0.03, -0.03);
    return [part(`shin${side}`, greave), part(`shin${side}`, knee)];
  });
});

registerWearable('bronzeHelmet', 'Capacete de bronze redondo, com ponta, protetor de nuca e de rosto dos lados (color, accent na borda)', (s, b) => {
  const r = b.head;
  const color = s.color ?? BRONZE;
  const shell = dome(r * 1.1, color, 0, Math.PI * 0.45);
  shell.position.y = r * 0.1;
  shell.scale.set(1, 1.05, 1.06);
  const knob = new THREE.Mesh(new THREE.ConeGeometry(r * 0.12, r * 0.32, 12), mat(color));
  knob.position.y = r * 1.28;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.08, r * 0.055, 8, 28).rotateX(Math.PI / 2), mat(s.accent ?? shade(color, 0.75)));
  rim.position.y = r * 0.42;
  rim.scale.set(1, 1, 1.07);
  // A band down the back of the neck, and a guard over each cheek, behind the eyes.
  const nape = new THREE.Mesh(new THREE.SphereGeometry(r * 1.12, 18, 6, Math.PI / 2 - 1.0, 2.0, Math.PI * 0.44, Math.PI * 0.2), new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }));
  const cheeks = [-1, 1].map((x) => {
    const cheek = rbox(r * 0.12, r * 0.6, r * 0.42, color, [x * r * 1.0, -r * 0.05, r * 0.12], r * 0.05);
    cheek.rotation.z = x * 0.12;
    return part('head', cheek);
  });
  return [part('head', shell), part('head', knob), part('head', rim), part('head', nape), ...cheeks];
});

registerWearable('plumedHelmet', 'Capacete filisteu: faixa de bronze com uma coroa de penas ou juncos em pé (color nas penas, accent na faixa)', (s, b) => {
  const r = b.head;
  const feathers = s.color ?? '#efe6cc';
  const bandColor = s.accent ?? BRONZE;
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.95, r * 0.3, 28, 1, true), new THREE.MeshStandardMaterial({ color: bandColor, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }));
  band.position.y = r * 0.58;
  g.add(band);
  // Studs along the band, and a cap under the feathers.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.add(ball(r * 0.06, shade(bandColor, 1.25), Math.sin(a) * r * 0.985, r * 0.58, Math.cos(a) * r * 0.985));
  }
  const cap = dome(r * 1.0, shade(bandColor, 0.8), 0, Math.PI * 0.32);
  cap.position.y = r * 0.12;
  g.add(cap);
  const count = 20;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const feather = new THREE.Group();
    feather.position.set(Math.sin(a) * r * 0.9, r * 0.66, Math.cos(a) * r * 0.9);
    feather.rotation.y = a;
    const blade = rbox(r * 0.16, r * 0.9, r * 0.04, i % 2 ? feathers : shade(feathers, 0.9), [0, r * 0.45, 0], r * 0.02);
    blade.rotation.x = 0.28;
    blade.position.z = r * 0.12;
    feather.add(blade);
    g.add(feather);
  }
  return [part('head', g)];
});

function ball(radius: number, color: string, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), mat(color));
  mesh.position.set(x, y, z);
  return mesh;
}

registerWearable('crown', 'Coroa simples de ouro: um aro com pontas baixas (color)', (s, b) => {
  const r = b.head;
  const color = s.color ?? '#e2b23c';
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.93, r * 0.18, 28, 1, true), new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide }));
  ring.position.y = r * 0.6;
  g.add(ring);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const point = new THREE.Mesh(new THREE.ConeGeometry(r * 0.07, r * 0.2, 8), mat(color));
    point.position.set(Math.sin(a) * r * 0.955, r * 0.78, Math.cos(a) * r * 0.955);
    g.add(point);
  }
  return [part('head', g)];
});

registerWearable('headband', 'Faixa de pano em volta da cabeça, na testa, com o nó atrás (color)', (s, b) => {
  const r = b.head;
  const color = s.color ?? '#c9b48a';
  const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.94, r * 0.06, 6, 28).rotateX(Math.PI / 2), mat(color));
  band.position.y = r * 0.5;
  band.rotation.x = -0.12;
  const knot = ball(r * 0.1, color, 0, r * 0.38, r * 0.95);
  const tail = rbox(r * 0.12, r * 0.5, r * 0.04, color, [0, r * 0.1, r * 1.0], r * 0.02);
  return [part('head', band), part('head', knot), part('head', tail)];
});

registerWearable('headwrap', 'Pano cobrindo a cabeça e caindo nas costas e dos lados, sobre o cabelo (color, accent numa faixa na testa)', (s, b) => {
  const r = b.head;
  const color = s.color ?? '#e6dcc4';
  const g = new THREE.Group();
  const top = dome(r * 1.1, color, 0, Math.PI * 0.55);
  top.rotation.x = 0.4;
  top.position.y = r * 0.05;
  // A hood round the back and the sides, open at the face, and the cloth falling from it onto the shoulders.
  const hood = new THREE.Mesh(new THREE.SphereGeometry(r * 1.13, 28, 14, Math.PI / 2 - 1.95, 3.9, Math.PI * 0.2, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }));
  hood.position.set(0, -r * 0.05, r * 0.05);
  const fall = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r * 1.15, r * 1.1, 20, 1, true, -1.35, 2.7), hood.material);
  fall.position.set(0, -r * 1.05, r * 0.12);
  g.add(top, hood, fall);
  if (s.accent) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.06, r * 0.055, 6, 28).rotateX(Math.PI / 2), mat(s.accent));
    band.position.y = r * 0.58;
    band.rotation.x = -0.1;
    g.add(band);
  }
  return [part('head', g)];
});

registerWearable('shepherdBag', 'Alforje de pastor: bolsa de couro do lado esquerdo do quadril, com a alça cruzando o peito (color, accent na tampa)', (s, b) => {
  const color = s.color ?? '#7a5130';
  const strap = new THREE.Group();
  for (const z of [-1, 1]) {
    const band = rbox(0.032, 0.36, 0.01, color, [-0.02 * b.wide, 0.1, z * 0.112 * b.wide], 0.004);
    band.rotation.z = z * -Math.PI / 4;
    strap.add(band);
  }
  const pouch = new THREE.Group();
  pouch.add(
    rbox(0.03, 0.2, 0.018, color, [-0.205 * b.wide, 0.17, 0], 0.006),
    rbox(0.075, 0.17, 0.2, color, [-0.235 * b.wide, -0.02, -0.01], 0.03),
    rbox(0.08, 0.07, 0.205, s.accent ?? shade(color, 0.75), [-0.238 * b.wide, 0.045, -0.01], 0.02),
  );
  return [part('chest', strap), part('hips', pouch)];
});

/** A sheathed sword on the left hip, or the sheath alone when the sword is out. */
function scabbard(s: WearSpec, b: WearBody, hilt: boolean): WearPart[] {
  const color = s.color ?? '#5a3a22';
  const g = new THREE.Group();
  g.position.set(-0.225 * b.wide, 0.06, 0.03);
  g.rotation.set(-0.35, 0, -0.12);
  g.add(rbox(0.065, 0.62, 0.032, color, [0, -0.31, 0], 0.014), rbox(0.07, 0.04, 0.036, s.accent ?? BRONZE, [0, -0.6, 0], 0.012), rbox(0.07, 0.035, 0.036, s.accent ?? BRONZE, [0, -0.02, 0], 0.012));
  if (hilt) {
    g.add(
      rbox(0.13, 0.024, 0.036, s.accent ?? BRONZE, [0, 0.015, 0], 0.008),
      new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.11, 10), mat(BRONZE_DARK)).translateY(0.08),
      ball(0.026, s.accent ?? BRONZE, 0, 0.145, 0),
    );
  }
  return [part('hips', g)];
}

registerWearable('scabbard', 'Espada embainhada no quadril esquerdo: bainha de couro e o punho à mostra (color na bainha, accent no metal)', (s, b) => scabbard(s, b, true));
registerWearable('scabbardEmpty', 'Só a bainha no quadril esquerdo, sem a espada (depois de tirá-la) (color, accent no metal)', (s, b) => scabbard(s, b, false));
