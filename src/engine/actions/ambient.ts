/**
 * Life for characters nobody is directing: people in a group taking turns to talk, listeners looking at whoever
 * speaks, a nod, arms crossed for a while, a smile. A behaviour is set once (action `behave`) and from then on
 * what the character does at any instant is a pure function of the time and of its id, so every frame can be
 * drawn on its own and two characters never move in step.
 */

import { VISEME_NAMES, mouthOpenOf, visemeTrack } from '../character/motion';

export type Vec3 = [number, number, number];

/** A behaviour in effect from t0 until the character's next one. */
export interface Behaviour {
  target: string;
  t0: number;
  /** "chat", "attend", "watch", "write", "idle" or "none". */
  mode: string;
  /** chat: who talks with whom. Characters with the same group take turns. */
  group?: string;
  /** attend: what is being paid attention to. */
  object?: string;
  /** watch, trance: the point being stared at. */
  point?: Vec3;
  /** How the character feels: "calm" (default), "worried", "scared" or "happy". */
  mood?: Mood;
}

export type Mood = 'calm' | 'worried' | 'scared' | 'happy';
export const MOODS: Record<Mood, string> = {
  calm: 'calmo: rosto neutro, sorri de vez em quando, raramente',
  worried: 'preocupado: sobrancelhas tensas, boca para baixo, às vezes assustado',
  scared: 'assustado: olhos arregalados, quase o tempo todo',
  happy: 'alegre: sorri bastante',
};

export const BEHAVIOURS: Record<string, string> = {
  chat: 'conversa em grupo: quem tem o mesmo "group" se reveza falando, os outros olham para quem fala',
  attend: 'presta atenção em "object" (o professor, o quadro), com desvios de olhar de vez em quando',
  watch: 'fica olhando fixo para "point" (o céu pela janela), assustado',
  trance: 'em transe: olhar parado em "point", olhos mais abertos, rosto sem expressão, quase sem piscar; não reage a nada',
  write: 'escreve numa superfície à frente (quadro) com a mão direita',
  idle: 'parado e vivo: olha em volta, muda o peso de perna, cruza os braços',
  none: 'sem comportamento de fundo',
};

/** Where an undirected head goes: to something, or to an angle from the body (degrees: yaw left, pitch up). */
export type GazeSpec = { at: string | Vec3 } | { yaw: number; pitch: number } | null;

export interface Ambient {
  /** Mouth, 0 to 1. */
  talk: number;
  /** Arms crossed, 0 to 1. */
  cross: number;
  /** A hand talking, 0 to 1. */
  gestureL: number;
  gestureR: number;
  /** Right hand writing ahead, 0 to 1. */
  write: number;
  /** Head nodding, -1 to 1. */
  nod: number;
  /** Weight from one leg to the other, -1 to 1. */
  sway: number;
  expressions: Record<string, number>;
  /** Mouth shapes of speech, by name (see VISEMES in character/motion.ts). */
  visemes: Record<string, number>;
  /** Eyes wandering inside the face: [to the left, up], each about -0.3 to 0.3. */
  dart: [number, number];
  /** 0 to 1: how much the blinking is held back (a fixed stare). */
  stare: number;
  /** Head: going from `from` to `to`, `blend` of the way there. */
  gaze: { from: GazeSpec; to: GazeSpec; blend: number };
}

/** A body doing nothing by itself. */
export const NO_AMBIENT: Ambient = { talk: 0, cross: 0, gestureL: 0, gestureR: 0, write: 0, nod: 0, sway: 0, expressions: {}, visemes: {}, dart: [0, 0], stare: 0, gaze: { from: null, to: null, blend: 1 } };

const hash = (a: number, b: number): number => {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return v - Math.floor(v);
};
const seedOf = (text: string): number => [...text].reduce((sum, ch, i) => sum + ch.charCodeAt(0) * (i + 1), 0) % 9973;
const smooth = (u: number): number => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};
/** 0 → 1 → 0 across a window, with soft ends. */
const bell = (u: number, edge = 0.18): number => Math.min(smooth(u / edge), smooth((1 - u) / edge));
/** Window number and progress within it, for windows of `length` seconds shifted by the seed. */
const windowAt = (t: number, length: number, seed: number): { k: number; u: number; into: number } => {
  const x = t / length + hash(seed, length);
  const k = Math.floor(x);
  return { k, u: x - k, into: (x - k) * length };
};

/** What extras say to each other: nobody hears it, the mouths only need something to shape. Each lasts about a turn. */
const SMALL_TALK = [
  'pois é, eu falei pra ela ontem',
  'não, mas olha só o que aconteceu',
  'você viu aquilo? foi muito bom',
  'eu acho que vai dar tudo certo',
  'ah, para, não acredito nisso',
  'depois a gente vê isso com calma',
];

const TURN = 2.8;

/** Who speaks in a group during turn k: nobody now and then. */
function speakerOf(members: string[], group: string, k: number): string | undefined {
  const g = seedOf(group);
  if (members.length < 2 || hash(k, g) < 0.1) return undefined;
  return members[Math.floor(hash(k + 0.5, g + 3) * members.length) % members.length];
}

/** The behaviour of each character at time t. */
export function behaviourAt(behaviours: Behaviour[], id: string, t: number): Behaviour | undefined {
  let found: Behaviour | undefined;
  for (const b of behaviours) if (b.target === id && b.t0 <= t && (!found || b.t0 >= found.t0)) found = b;
  return found && found.mode !== 'none' ? found : undefined;
}

/** What a character does by itself at time t. */
export function ambientAt(behaviours: Behaviour[], id: string, t: number): Ambient {
  const mine = behaviourAt(behaviours, id, t);
  if (!mine) return NO_AMBIENT;
  const seed = seedOf(id);
  const out: Ambient = { ...NO_AMBIENT, expressions: {}, visemes: {}, sway: Math.sin(t * 0.45 + seed) * 0.7 + Math.sin(t * 0.17 + seed * 2) * 0.3 };
  // Coming into a behaviour, things start gently.
  const settle = smooth((t - mine.t0) / 0.6);

  const long = windowAt(t, 9.5, seed + 11);
  const crossChance = { chat: 0.3, idle: 0.3, attend: 0.12, watch: 0.15, write: 0, trance: 0 }[mine.mode] ?? 0;
  if (hash(long.k, seed + 1) < crossChance) out.cross = bell(long.u, 0.07) * settle;
  const short = windowAt(t, 3.3, seed + 23);
  if (mine.mode !== 'trance' && hash(short.k, seed + 2) < 0.28) out.nod = Math.sin(short.u * Math.PI * 4) * bell(short.u, 0.25) * settle;
  const mood = windowAt(t, 5.2, seed + 37);
  const feeling = hash(mood.k, seed + 3);

  const glance = windowAt(t, 4.6, seed + 41);
  const away = (k: number): GazeSpec => ({ yaw: (hash(k, seed + 5) - 0.5) * 90, pitch: (hash(k, seed + 6) - 0.6) * 30 });
  let spec: (k: number) => GazeSpec = () => null;
  let frame = glance;

  if (mine.mode === 'chat') {
    const group = mine.group ?? '';
    const members = [...new Set(behaviours.filter((b) => b.mode === 'chat' && b.group === group).map((b) => b.target))]
      .filter((other) => behaviourAt(behaviours, other, t)?.group === group && behaviourAt(behaviours, other, t)?.mode === 'chat')
      .sort();
    const turn = windowAt(t, TURN, seedOf(group));
    const speaker = speakerOf(members, group, turn.k);
    if (speaker === id) {
      const shapes = visemeTrack(SMALL_TALK[Math.floor(hash(turn.k, seed + 16) * SMALL_TALK.length) % SMALL_TALK.length])(turn.u);
      for (const name of VISEME_NAMES) out.visemes[name] = shapes[name] * settle;
      out.talk = mouthOpenOf(shapes) * settle;
      out.cross = 0;
      if (hash(turn.k, seed + 7) < 0.65) out[hash(turn.k, seed + 8) < 0.5 ? 'gestureL' : 'gestureR'] = bell(turn.u, 0.2) * settle;
    }
    const others = members.filter((m) => m !== id);
    spec = (k) => {
      const talking = speakerOf(members, group, k);
      const pick = hash(k, seed + 9);
      if (talking && talking !== id && pick < 0.85) return { at: talking };
      if (others.length && pick < 0.93) return { at: others[Math.floor(hash(k, seed + 10) * others.length) % others.length] };
      return away(k);
    };
    frame = turn;
  } else if (mine.mode === 'attend') {
    const object = mine.object;
    spec = (k) => (hash(k, seed + 12) < 0.22 || !object ? (hash(k, seed + 13) < 0.5 ? { yaw: 0, pitch: -28 } : away(k)) : { at: object });
  } else if (mine.mode === 'watch') {
    const point = mine.point;
    spec = (k) => (point && hash(k, seed + 14) > 0.12 ? { at: point } : away(k));
    out.expressions.scared = (0.45 + 0.25 * Math.sin(t * 0.8 + seed)) * settle;
    if (feeling < 0.35) out.expressions.surprised = 0.5 * bell(mood.u) * settle;
  } else if (mine.mode === 'trance') {
    // Nothing else exists: the look does not leave the point, and the body goes still.
    const point = mine.point;
    spec = () => (point ? { at: point } : { yaw: 0, pitch: 25 });
    out.expressions.trance = settle;
    out.stare = settle;
    out.sway *= 0.15;
  } else if (mine.mode === 'write') {
    out.write = settle;
    spec = () => ({ yaw: 6, pitch: 6 });
  } else {
    spec = (k) => (hash(k, seed + 15) < 0.55 ? away(k) : null);
  }
  // Mood colors any behaviour but the stares, which have their own face.
  if (mine.mode !== 'watch' && mine.mode !== 'trance') {
    const feel = mine.mood ?? 'calm';
    const swell = bell(mood.u) * settle;
    if (feel === 'calm') {
      if (feeling < (mine.mode === 'chat' ? 0.1 : 0.05)) out.expressions.happy = 0.45 * swell;
      else if (mine.mode === 'chat' && feeling < 0.18) out.expressions.surprised = 0.35 * swell;
    } else if (feel === 'worried') {
      out.expressions.sad = (0.35 + 0.1 * Math.sin(t * 0.6 + seed)) * settle;
      if (feeling < 0.3) out.expressions.scared = 0.45 * swell;
    } else if (feel === 'scared') {
      out.expressions.scared = (0.55 + 0.2 * Math.sin(t * 0.9 + seed)) * settle;
      if (feeling < 0.3) out.expressions.surprised = 0.4 * swell;
    } else if (feel === 'happy') {
      if (feeling < 0.45) out.expressions.happy = 0.65 * swell;
    }
  }
  out.gaze = { from: spec(frame.k - 1), to: spec(frame.k), blend: smooth(frame.into / 0.45) };
  // Eyes jump to a new spot now and then, and stay there.
  const look = windowAt(t, 1.9, seed + 53);
  const spot = (k: number): [number, number] => (hash(k, seed + 17) < 0.45 ? [0, 0] : [(hash(k, seed + 18) - 0.5) * 0.6, (hash(k, seed + 19) - 0.5) * 0.4]);
  const [from, to, jump] = [spot(look.k - 1), spot(look.k), smooth(look.into / 0.12)];
  const still = 1 - out.stare;
  out.dart = [(from[0] + (to[0] - from[0]) * jump) * settle * still, (from[1] + (to[1] - from[1]) * jump) * settle * still];
  return out;
}
