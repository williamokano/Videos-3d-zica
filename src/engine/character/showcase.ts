import { BEHAVIOURS, NO_AMBIENT, type Ambient } from '../actions/ambient';
import type { ActionClip, Link, TargetTraits } from '../actions/catalog';
import { BODY } from '../actions/hands';
import { HAND_POSE_NAMES, VISEME_NAMES, mouthOpenOf, visemeTrack } from './motion';

/**
 * The showcase: characters side by side on an empty stage, each one doing a pose in a loop, to look at and
 * adjust them outside an episode. Everything here is a pure function of the time, like the motions themselves.
 */

/** Heading of every character on the stage: facing +z, where the camera starts. */
export const SHOWCASE_YAW = 180;

/** Height of the stool a seated character sits on. */
export const STOOL = 0.46;

/**
 * Where each of `count` characters stands, as [x, z]: rows centered on the origin, the first row in front
 * (largest z). A row stands in the gaps of the row in front of it, so nobody hides behind somebody else.
 */
export function showcaseLayout(count: number, spacing = 1.1, perRow = 8): [number, number][] {
  const rows = Math.ceil(count / perRow);
  const depth = spacing * 1.3;
  const sizeOf = (row: number): number => Math.min(perRow, count - row * perRow);
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow);
    // Two centered rows line up when both are odd or both even: the one behind then steps half a place aside.
    const aside = row % 2 === 1 && sizeOf(row) % 2 === sizeOf(row - 1) % 2 ? spacing / 2 : 0;
    return [(i - row * perRow - (sizeOf(row) - 1) / 2) * spacing + aside, ((rows - 1) / 2 - row) * depth];
  });
}

export interface ShowcasePose {
  label: string;
  /** Body channels at time t, on top of POSE_REST. */
  channels?(t: number, traits: TargetTraits, seed: number): Record<string, number>;
  /** What free hands do, when no behaviour is driving them. */
  ambient?(t: number, seed: number): Ambient;
  /** Shown with a phone in the right hand. */
  phone?: boolean;
}

/** Every channel a pose may write, at rest. A pose only says what differs. */
export const POSE_REST: Record<string, number> = {
  gait: 0, stride: 0, sit: 0, seat: 0, y: 0, crouch: 0, talk: 0, gesture: 0, carryR: 0,
  reachR: 0, 'reachR.x': 0, 'reachR.y': 0, 'reachR.z': 0, 'reachR.local': 0,
  ...Object.fromEntries(VISEME_NAMES.map((name) => [`vis.${name}`, 0])),
  ...Object.fromEntries(['L', 'R'].flatMap((side) => HAND_POSE_NAMES.map((name) => [`hand${side}.${name}`, 0]))),
};

/** What a character says on the stage, over and over: every mouth shape is in it. */
export const SHOWCASE_LINE = 'De repente o céu ficou vermelho, e ninguém soube o que fazer. Você viu?';
const LINE_SECONDS = 0.5 + SHOWCASE_LINE.length * 0.065;

const WALK_SPEED = 1.4;
const RUN_SPEED = 3.6;

/** The looped poses, by id. Check here before adding one. */
export const SHOWCASE_POSES: Record<string, ShowcasePose> = {
  idle: { label: 'Parado' },
  walk: { label: 'Andar', channels: (t, traits) => ({ gait: 1, stride: (t * WALK_SPEED) / (traits.strideLength ?? 1.5) }) },
  // A running stride is longer, as in walkTo.
  run: { label: 'Correr', channels: (t, traits) => ({ gait: 2, stride: (t * RUN_SPEED) / ((traits.strideLength ?? 1.5) * 1.75) }) },
  sit: { label: 'Sentar', channels: () => ({ sit: 1, seat: STOOL, y: STOOL }) },
  crouch: { label: 'Agachar', channels: () => ({ crouch: 1 }) },
  talk: {
    label: 'Falar',
    // Each one starts the line at its own moment.
    channels: (t, _traits, seed) => {
      const shapes = visemeTrack(SHOWCASE_LINE)(((t + seed * 0.37) / LINE_SECONDS) % 1);
      return { ...Object.fromEntries(VISEME_NAMES.map((name) => [`vis.${name}`, shapes[name]])), talk: mouthOpenOf(shapes), gesture: 1 };
    },
  },
  cross: { label: 'Cruzar os braços', ambient: () => ({ ...NO_AMBIENT, cross: 1 }) },
  gesture: {
    label: 'Gesticular',
    ambient: (t, seed) => ({ ...NO_AMBIENT, gestureR: 0.75 + 0.25 * Math.sin(t * 1.3 + seed), gestureL: 0.6 + 0.4 * Math.sin(t * 0.9 + seed * 2) }),
  },
  // What the action `pointAt` does with the arm, held: ahead and a little to the side.
  point: { label: 'Apontar', channels: () => ({ reachR: 1, 'reachR.x': 0.32, 'reachR.y': 1.42, 'reachR.z': -0.42, 'reachR.local': 1, 'handR.point': 1 }) },
  phone: {
    label: 'Levantar o celular',
    phone: true,
    // What the action `raise` leaves a hand doing.
    channels: () => {
      const [x, y, z] = BODY.eyes('R');
      return { carryR: 1, reachR: 1, 'reachR.x': x, 'reachR.y': y, 'reachR.z': z, 'reachR.local': 1 };
    },
  },
};

/** Channels of a character doing a pose at time t. The stage floor is at height 0, so `y` is the height of the stool. */
export function poseChannels(pose: string, t: number, traits: TargetTraits, seed = 0): Record<string, number> {
  return { ...POSE_REST, ...SHOWCASE_POSES[pose]?.channels?.(t, traits, seed) };
}

/** Behaviours of an extra that can be tried on the stage. */
export const SHOWCASE_BEHAVIOURS = Object.keys(BEHAVIOURS).filter((mode) => mode !== 'none');

export interface StageEntry {
  id: string;
  at: [number, number];
  pose: string;
  /** A mode of BEHAVIOURS, or "none". */
  behaviour: string;
}

/** Id of the phone a character holds on the stage. */
export const phoneOf = (id: string): string => `${id}.phone`;

/**
 * The action track of the stage: one `behave` per character with a behaviour, and a phone in the hand of whoever
 * shows one. Everybody chatting is in the same group; who pays attention looks at `focus`, or at a neighbour.
 */
export function stageTrack(entries: StageEntry[], focus?: string): { clips: ActionClip[]; links: Link[]; phones: string[] } {
  const clips: ActionClip[] = [];
  for (const entry of entries) {
    if (!SHOWCASE_BEHAVIOURS.includes(entry.behaviour)) continue;
    const other = focus && focus !== entry.id ? focus : entries.find((e) => e.id !== entry.id)?.id;
    // Alone on the stage there is nobody to pay attention to.
    const mode = entry.behaviour === 'attend' && !other ? 'idle' : entry.behaviour;
    const params: Record<string, unknown> = { mode };
    if (mode === 'chat') params.group = 'vitrine';
    if (mode === 'attend') params.object = other;
    // Up and ahead, like a sky seen through a window.
    if (mode === 'watch') params.point = [entry.at[0], 4, entry.at[1] + 6];
    clips.push({ t: 0, target: entry.id, action: 'behave', params });
  }
  const holders = entries.filter((e) => SHOWCASE_POSES[e.pose]?.phone);
  return {
    clips,
    links: holders.map((e) => ({ target: phoneOf(e.id), to: e.id, socket: 'handR', t0: -Infinity, t1: Infinity })),
    phones: holders.map((e) => phoneOf(e.id)),
  };
}
