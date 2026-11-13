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
import { mat, rbox } from '../assets/registry';
import type { Joint } from './types';

export interface WearSpec {
  id: string;
  /** Main color of the piece. */
  color?: string;
  /** Second color: a stripe, a flap, a logo plate. */
  accent?: string;
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
    return piece.build(spec, body);
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
