import type { FaceParams, HandShape, Joint, Pose } from './types';
import { JOINTS } from './types';

/** Motions are pure functions: the same inputs always give the same pose, so any frame can be drawn on its own. */

const ARM_DOWN = 78;

/** Standing still, breathing. */
export function idlePose(t: number): Pose {
  const breath = Math.sin((t * Math.PI * 2) / 4);
  return {
    lift: 0,
    joints: {
      chest: [-1.2 * breath, 0, 0],
      head: [0.8 * breath, 0, 0],
      upperArmL: [0, 0, ARM_DOWN - breath],
      upperArmR: [0, 0, -ARM_DOWN + breath],
      forearmL: [0, -10, 0],
      forearmR: [0, 10, 0],
    },
  };
}

/**
 * Walk cycle. `stride` counts cycles (two steps each) and comes from the distance covered, so the feet
 * keep up with the ground. `run` blends from walking (0) to running (1).
 */
export function walkPose(stride: number, run = 0): Pose {
  const mix = (a: number, b: number) => a + (b - a) * run;
  const angle = stride * Math.PI * 2;
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const thigh = mix(26, 42) * s;
  // The knee folds while its leg swings forward.
  const kneeL = 4 + mix(50, 85) * Math.max(0, c);
  const kneeR = 4 + mix(50, 85) * Math.max(0, -c);
  const arm = mix(22, 45) * s;
  const elbow = mix(18, 75);
  const lean = -mix(2, 12);
  return {
    // Lowest when a foot lands, highest in mid-step.
    lift: (mix(0.02, 0.045) * (Math.cos(2 * angle) - 1)) / 2,
    joints: {
      hips: [0, -4 * s, 0],
      spine: [lean, 0, 0],
      chest: [0, 9 * s, 0],
      head: [-lean * 0.6, -5 * s, 0],
      thighL: [thigh, 0, 0],
      thighR: [-thigh, 0, 0],
      shinL: [-kneeL, 0, 0],
      shinR: [-kneeR, 0, 0],
      footL: [-(thigh - kneeL) * 0.6, 0, 0],
      footR: [-(-thigh - kneeR) * 0.6, 0, 0],
      upperArmL: [-arm, 0, ARM_DOWN],
      upperArmR: [arm, 0, -ARM_DOWN],
      forearmL: [0, -(elbow - 8 * s), 0],
      forearmR: [0, elbow + 8 * s, 0],
    },
  };
}

export function blendPose(a: Pose, b: Pose, w: number): Pose {
  const joints: Pose['joints'] = {};
  for (const j of JOINTS as readonly Joint[]) {
    const ja = a.joints[j] ?? [0, 0, 0];
    const jb = b.joints[j] ?? [0, 0, 0];
    joints[j] = [ja[0] + (jb[0] - ja[0]) * w, ja[1] + (jb[1] - ja[1]) * w, ja[2] + (jb[2] - ja[2]) * w];
  }
  return { joints, lift: a.lift + (b.lift - a.lift) * w };
}

/** Body pose from the locomotion channels: gait 0 stands, 1 walks, 2 runs. */
export function locomotionPose(t: number, gait: number, stride: number): Pose {
  if (gait <= 0.001) return idlePose(t);
  return blendPose(idlePose(t), walkPose(stride, Math.max(0, Math.min(1, gait - 1))), Math.min(1, gait));
}

const add = (pose: Pose, joint: Joint, x: number): [number, number, number] => {
  const [a, b, c] = pose.joints[joint] ?? [0, 0, 0];
  return [a + x, b, c];
};

/** Bend the knees and lean forward to reach something low. `amount` goes from 0 (standing) to 1 (squatting). */
export function crouchPose(pose: Pose, amount: number): Pose {
  if (amount <= 0.001) return pose;
  const thigh = 75 * amount;
  const knee = 120 * amount;
  const rad = Math.PI / 180;
  // Hips come down by what the folded legs lose in height, so the feet stay on the ground.
  const lift = 0.42 * Math.cos(thigh * rad) + 0.4 * Math.cos((knee - thigh) * rad) - 0.82;
  const joints = { ...pose.joints };
  for (const side of ['L', 'R'] as const) {
    joints[`thigh${side}`] = add(pose, `thigh${side}`, thigh);
    joints[`shin${side}`] = add(pose, `shin${side}`, -knee);
    joints[`foot${side}`] = add(pose, `foot${side}`, knee - thigh);
  }
  joints.spine = add(pose, 'spine', -32 * amount);
  joints.head = add(pose, 'head', 14 * amount);
  return { joints, lift: pose.lift + lift };
}

/** Seated, with the origin of the character on the seat: thighs forward, back a little reclined. */
export function sitPose(pose: Pose, amount: number): Pose {
  if (amount <= 0.001) return pose;
  const seated: Pose = {
    lift: -0.82,
    joints: {
      ...pose.joints,
      hips: [0, 0, 0], spine: [12, 0, 0],
      thighL: [82, 0, 0], thighR: [82, 0, 0],
      shinL: [-70, 0, 0], shinR: [-70, 0, 0],
      footL: [-12, 0, 0], footR: [-12, 0, 0],
    },
  };
  return blendPose(pose, seated, amount);
}

/**
 * Riding a bicycle: sitting forward over the handlebars, the legs going round with the pedals. `turns` is how many
 * times the pedals have gone round; the two legs are half a turn apart.
 */
export function ridePose(pose: Pose, amount: number, turns: number): Pose {
  if (amount <= 0.001) return pose;
  const leg = (phase: number): { thigh: [number, number, number]; shin: [number, number, number] } => {
    const a = (turns + phase) * Math.PI * 2;
    // The knee comes up as the pedal goes over the top and the leg stretches as it goes down.
    return { thigh: [62 + 26 * Math.sin(a), 0, 0], shin: [-(78 + 30 * Math.sin(a + 0.9)), 0, 0] };
  };
  const [left, right] = [leg(0), leg(0.5)];
  const riding: Pose = {
    lift: pose.lift,
    joints: { ...pose.joints, spine: [30, 0, 0], chest: [8, 0, 0], head: [-22, 0, 0], thighL: left.thigh, shinL: left.shin, thighR: right.thigh, shinR: right.shin, footL: [10, 0, 0], footR: [10, 0, 0] },
  };
  return blendPose(pose, riding, amount);
}

/** Hold something in front of the body with one hand: elbow at the side, forearm forward. */
export function carryPose(pose: Pose, side: 'L' | 'R', amount: number): Pose {
  if (amount <= 0.001) return pose;
  const sign = side === 'R' ? 1 : -1;
  const held: Pose = {
    lift: pose.lift,
    joints: { ...pose.joints, [`upperArm${side}`]: [0, 0, -sign * 80], [`forearm${side}`]: [0, sign * 88, 0] },
  };
  return blendPose(pose, held, amount);
}

const hash = (a: number, b: number): number => {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** Automatic blinking: 0 open, 1 shut. One blink somewhere in every window of a few seconds, set by the seed. */
export function blink(t: number, seed: number): number {
  const WINDOW = 3.4;
  const LENGTH = 0.16;
  const k = Math.floor(t / WINDOW);
  const start = k * WINDOW + hash(k, seed) * (WINDOW - LENGTH);
  const u = (t - start) / LENGTH;
  return u <= 0 || u >= 1 ? 0 : 1 - Math.abs(u * 2 - 1);
}

export const NEUTRAL_FACE: FaceParams = {
  eyeOpen: 1, browLift: 0, browTilt: 0, mouthCurve: 0, mouthOpen: 0, mouthWidth: 1, mouthRound: 0, teeth: 0, gazeX: 0, gazeY: 0, lidTilt: 0,
};

const face = (changes: Partial<FaceParams>): FaceParams => ({ ...NEUTRAL_FACE, ...changes });

/** The expression catalog. Check here before adding one. */
export const EXPRESSIONS: Record<string, FaceParams> = {
  happy: face({ eyeOpen: 0.82, browLift: 0.3, mouthCurve: 1, mouthOpen: 0.3, mouthWidth: 1.15, teeth: 0.9 }),
  sad: face({ eyeOpen: 0.75, browLift: 0.1, browTilt: -0.8, lidTilt: -0.7, mouthCurve: -0.8, mouthWidth: 0.9 }),
  angry: face({ eyeOpen: 0.72, browLift: -0.5, browTilt: 0.9, lidTilt: 0.9, mouthCurve: -0.5, mouthWidth: 0.95 }),
  surprised: face({ eyeOpen: 1.3, browLift: 0.9, mouthCurve: 0, mouthOpen: 0.8, mouthWidth: 0.7, mouthRound: 0.6, teeth: 0.2 }),
  scared: face({ eyeOpen: 1.35, browLift: 0.7, browTilt: -0.6, lidTilt: -0.3, mouthCurve: -0.4, mouthOpen: 0.5, mouthWidth: 0.85, teeth: 0.6 }),
  // Hypnotized: eyes a little too open, nothing else on the face, the jaw let go a little.
  trance: face({ eyeOpen: 1.22, browLift: 0.12, mouthCurve: -0.05, mouthOpen: 0.06, mouthWidth: 0.92 }),
};

/** Mouth shapes of speech. A closed mouth (rest, and the sounds M, B, P) is the absence of all of them. */
export const VISEME_NAMES = ['A', 'E', 'O', 'U', 'F'] as const;
export type Viseme = (typeof VISEME_NAMES)[number];
export type VisemeWeights = Record<Viseme, number>;

type MouthShape = Pick<FaceParams, 'mouthOpen' | 'mouthWidth' | 'mouthRound' | 'teeth'>;

export const VISEMES: Record<Viseme, MouthShape> = {
  A: { mouthOpen: 0.75, mouthWidth: 1, mouthRound: 0, teeth: 0.45 },
  E: { mouthOpen: 0.34, mouthWidth: 1.22, mouthRound: 0, teeth: 0.9 },
  O: { mouthOpen: 0.62, mouthWidth: 0.7, mouthRound: 0.8, teeth: 0.1 },
  U: { mouthOpen: 0.3, mouthWidth: 0.55, mouthRound: 1, teeth: 0 },
  // Upper teeth on the lower lip.
  F: { mouthOpen: 0.16, mouthWidth: 0.95, mouthRound: 0, teeth: 1 },
};

export const NO_VISEMES: VisemeWeights = { A: 0, E: 0, O: 0, U: 0, F: 0 };

/** How open the mouth is for a mix of shapes, 0 to 1: what a face with a single "talk" control can show of them. */
export function mouthOpenOf(visemes: Partial<VisemeWeights>): number {
  return VISEME_NAMES.reduce((sum, name) => sum + (visemes[name] ?? 0) * VISEMES[name].mouthOpen, 0);
}

const smooth = (u: number): number => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

interface Phone {
  shape: Viseme | null;
  weight: number;
  /** In units of one vowel. */
  length: number;
}

const VOWELS: Record<string, Viseme> = { a: 'A', e: 'E', i: 'E', y: 'E', o: 'O', u: 'U' };

const plainLetter = (ch: string): string => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * The mouth for one letter: vowels open it, F and V bite the lip, M, B and P close it, other consonants take the
 * shape of a vowel next to them ("borrowed"), punctuation is a breath. Spaces and the rest make no sound.
 */
export function letterSound(ch: string): { shape: Viseme | null; weight: number; length: number; borrowed?: true } | null {
  const c = plainLetter(ch);
  if (VOWELS[c]) return { shape: VOWELS[c], weight: 1, length: 1 };
  if (c === 'f' || c === 'v') return { shape: 'F', weight: 1, length: 0.7 };
  if (c === 'm' || c === 'b' || c === 'p') return { shape: null, weight: 0, length: 0.6 };
  if (/[a-z0-9]/.test(c)) return { shape: null, weight: 0.45, length: 0.45, borrowed: true };
  if (/[.,;:!?…—-]/.test(c)) return { shape: null, weight: 0, length: 1.6 };
  return null;
}

/** Give each borrowed consonant the shape of the nearest open vowel. */
export function lendShapes<T extends { shape: Viseme | null; weight: number; borrowed?: true }>(phones: T[]): T[] {
  const vowelNear = (i: number): Viseme => {
    for (const k of [i + 1, i + 2, i - 1, i - 2]) if (phones[k]?.weight === 1 && phones[k].shape && phones[k].shape !== 'F') return phones[k].shape!;
    return 'E';
  };
  phones.forEach((p, i) => {
    if (p.borrowed) p.shape = vowelNear(i);
  });
  return phones;
}

/** The sounds of a text, one per letter. */
function phonesOf(text: string): Phone[] {
  const closed = (length: number): Phone => ({ shape: null, weight: 0, length });
  const sounds: (Phone & { borrowed?: true })[] = [closed(0.6)];
  // Words run into each other.
  for (const ch of text) {
    const sound = letterSound(ch);
    if (sound) sounds.push({ ...sound });
  }
  sounds.push(closed(0.8));
  return lendShapes(sounds);
}

const tracks = new Map<string, (u: number) => VisemeWeights>();

/**
 * The mouth shapes of a line of speech: a function of how far along the line is (0 to 1) that gives the weight
 * of each shape. It follows the letters of the text, so the mouth says what is written even without a voice.
 * The mouth is closed at both ends.
 */
export function visemeTrack(text: string): (u: number) => VisemeWeights {
  const known = tracks.get(text);
  if (known) return known;
  const phones = phonesOf(text);
  const starts: number[] = [];
  let total = 0;
  for (const phone of phones) {
    starts.push(total);
    total += phone.length;
  }
  let last: { u: number; weights: VisemeWeights } | undefined;
  const track = (u: number): VisemeWeights => {
    if (last?.u === u) return last.weights;
    const weights = { ...NO_VISEMES };
    if (u > 0 && u < 1) {
      const at = u * total;
      let i = phones.length - 1;
      while (i > 0 && starts[i] > at) i--;
      // Each sound comes in over the first half of its time, as the one before goes out.
      const into = smooth((at - starts[i]) / phones[i].length / 0.5);
      const [now, before] = [phones[i], phones[i - 1]];
      if (now.shape) weights[now.shape] += now.weight * into;
      if (before?.shape) weights[before.shape] += before.weight * (1 - into);
    }
    last = { u, weights };
    return weights;
  };
  tracks.set(text, track);
  return track;
}

/** How far the eyes turn by themselves, in degrees, and the turn that puts the iris at the edge of the eye. */
const EYE_REACH = { yaw: 18, pitch: 12 };
const EYE_EDGE = { yaw: 30, pitch: 22 };

/**
 * Share a look between the eyes and the head. `yaw` and `pitch` are how far the look is from straight ahead,
 * in degrees. The eyes take the first part and the neck the rest, so the two together always add up to the look.
 */
export function splitGaze(yaw: number, pitch: number): { head: { yaw: number; pitch: number }; eyes: { x: number; y: number } } {
  const part = (angle: number, reach: number): number => Math.max(-reach, Math.min(reach, angle * 0.4));
  const [eyeYaw, eyePitch] = [part(yaw, EYE_REACH.yaw), part(pitch, EYE_REACH.pitch)];
  return { head: { yaw: yaw - eyeYaw, pitch: pitch - eyePitch }, eyes: { x: eyeYaw / EYE_EDGE.yaw, y: eyePitch / EYE_EDGE.pitch } };
}

/**
 * Face from expression weights, a blink amount, how open speech holds the mouth, the mouth shapes of speech
 * and where the eyes look. Speech shapes the mouth on top of the expression: who talks smiling keeps smiling.
 */
export function resolveFace(
  weights: Record<string, number>,
  blinkAmount: number,
  talk: number,
  visemes: Partial<VisemeWeights> = {},
  eyes: { x: number; y: number } = { x: 0, y: 0 },
): FaceParams {
  const face = { ...NEUTRAL_FACE };
  for (const [name, w] of Object.entries(weights)) {
    const e = EXPRESSIONS[name];
    if (!e || !w) continue;
    for (const key of Object.keys(face) as (keyof FaceParams)[]) face[key] += (e[key] - NEUTRAL_FACE[key]) * w;
  }
  face.eyeOpen *= 1 - blinkAmount;
  const speaking = Math.min(1, VISEME_NAMES.reduce((sum, name) => sum + (visemes[name] ?? 0), 0));
  if (speaking > 0.001) {
    const shape = { mouthOpen: 0, mouthWidth: 0, mouthRound: 0, teeth: 0 };
    for (const name of VISEME_NAMES) {
      for (const key of Object.keys(shape) as (keyof MouthShape)[]) shape[key] += ((visemes[name] ?? 0) / speaking) * VISEMES[name][key];
    }
    face.mouthOpen += (shape.mouthOpen - face.mouthOpen) * speaking;
    face.mouthRound += (shape.mouthRound - face.mouthRound) * speaking;
    face.teeth = Math.max(face.teeth, shape.teeth * speaking);
    // The width of a smile stays; the shape narrows or widens it.
    face.mouthWidth *= 1 + (shape.mouthWidth - 1) * speaking;
  }
  face.mouthOpen = Math.max(face.mouthOpen, talk);
  face.gazeX = eyes.x;
  face.gazeY = eyes.y;
  return face;
}

/** A hand nobody is using: fingers a little bent. */
export const RELAXED_HAND: HandShape = { thumb: 0.25, index: 0.3, fingers: 0.4, spread: 0 };

/** The hand pose catalog. Check here before adding one. A relaxed hand is the absence of all of them. */
export const HAND_POSES: Record<string, HandShape> = {
  /** Closed around something held. */
  grip: { thumb: 0.55, index: 0.55, fingers: 0.65, spread: 0 },
  point: { thumb: 0.85, index: 0, fingers: 1, spread: 0 },
  fist: { thumb: 1, index: 1, fingers: 1, spread: 0 },
  open: { thumb: 0, index: 0, fingers: 0.05, spread: 1 },
  /** Flat behind something thin held up to be read, the thumb over its edge. */
  hold: { thumb: 0.7, index: 0.1, fingers: 0.14, spread: 0.2 },
  /** Holding a phone with the thumb tapping on it. */
  type: { thumb: 0.8, index: 0.1, fingers: 0.14, spread: 0.2 },
};

export const HAND_POSE_NAMES = Object.keys(HAND_POSES);

/** Hand from pose weights. In "type" the thumb taps, at a pace set by the time. */
export function resolveHand(weights: Record<string, number>, t = 0): HandShape {
  const hand = { ...RELAXED_HAND };
  for (const [name, w] of Object.entries(weights)) {
    const pose = HAND_POSES[name];
    if (!pose || !w) continue;
    for (const key of Object.keys(hand) as (keyof HandShape)[]) hand[key] += (pose[key] - RELAXED_HAND[key]) * w;
  }
  const tapping = weights.type ?? 0;
  if (tapping > 0) hand.thumb += (0.2 * Math.sin(t * 17) - 0.15) * Math.min(1, tapping);
  for (const key of Object.keys(hand) as (keyof HandShape)[]) hand[key] = Math.max(0, Math.min(1, hand[key]));
  return hand;
}
