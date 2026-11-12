/** Camera track: keyframes over time. The pose at any instant is a pure function of the track, the stage and t. */

export type Vec3 = [number, number, number];

/**
 * How the camera is held during a shot:
 * - `cinematic`: placed by hand with `pos` and `lookAt`.
 * - `fpv`: in the eyes of a character.
 * - `third_person`: behind and above a character, following them.
 */
export type CameraMode = 'cinematic' | 'fpv' | 'third_person';

export interface CameraKey {
  /** Seconds from the start of the episode. */
  t: number;
  /** Cinematic shots: where the camera is. */
  pos?: Vec3;
  /** Cinematic shots: the point it looks at. */
  lookAt?: Vec3;
  /** Vertical field of view in degrees. */
  fov?: number;
  /** Hard cut: jump to this key instead of moving from the previous one. A cut starts a new shot. */
  cut?: boolean;
  /** Mode of the shot this key starts (first key or a cut). Default "cinematic". */
  mode?: CameraMode;
  /** fpv and third_person: id of the cast member the camera is attached to. */
  follow?: string;
  /** third_person: meters behind the character (default 3). */
  distance?: number;
  /** third_person: meters above the character's eyes (default 0.5). */
  height?: number;
  /** fpv and third_person: look up (positive) or down, in degrees (default 0). */
  pitch?: number;
}

export interface CameraPose {
  pos: Vec3;
  lookAt: Vec3;
  fov: number;
  mode: CameraMode;
  /** Cast member the camera is attached to, when the mode is not cinematic. */
  follow?: string;
}

/** Where a character is at some time. */
export interface CameraSubject {
  /** Feet: [x, y, z]. */
  pos: Vec3;
  /** Heading in degrees: 0 faces north (-z), 90 west (-x). */
  yaw: number;
  eyeHeight: number;
}

/** What attached shots need to know about the scene. */
export interface CameraStage {
  subject(id: string, t: number): CameraSubject | undefined;
  /** How much of the straight line from `from` to `to` is free, from 0 to 1. */
  clear?(from: Vec3, to: Vec3): number;
}

const DEFAULT_FOV = 50;
const FPV_FOV = 70;
const DEFAULT_DISTANCE = 3;
const DEFAULT_HEIGHT = 0.5;
/** The third-person camera turns with the character's average heading over this many seconds. */
const TURN_LAG = 0.6;
/** Kept between the third-person camera and whatever is behind it. */
const WALL_MARGIN = 0.25;

/** Cubic Hermite between a and b, with tangents taken from the neighbouring keys of the same shot. */
function hermite(prev: CameraKey, a: CameraKey, b: CameraKey, next: CameraKey, t: number, pick: (k: CameraKey) => Vec3): Vec3 {
  const dt = b.t - a.t;
  const u = (t - a.t) / dt;
  const u2 = u * u;
  const u3 = u2 * u;
  const out: Vec3 = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const p0 = pick(a)[i];
    const p1 = pick(b)[i];
    const m0 = prev === a ? (p1 - p0) / dt : (p1 - pick(prev)[i]) / (b.t - prev.t);
    const m1 = next === b ? (p1 - p0) / dt : (pick(next)[i] - p0) / (next.t - a.t);
    out[i] = (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * dt * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * dt * m1;
  }
  return out;
}

/** First key of the shot that key `i` belongs to. */
function shotStart(keys: CameraKey[], i: number): CameraKey {
  while (i > 0 && !keys[i].cut) i--;
  return keys[i];
}

/**
 * Check a camera track before using it. Throws with a message that names the keyframe when a shot
 * misses what its mode needs.
 */
export function validateCamera(keys: CameraKey[], castIds: string[] = []): void {
  if (!keys.length) throw new Error('A trilha de câmera não tem keyframes.');
  keys.forEach((key, i) => {
    const fail = (message: string): never => {
      throw new Error(`Câmera, keyframe ${i + 1} (aos ${key.t}s): ${message}`);
    };
    if (i > 0 && key.t < keys[i - 1].t) fail('os keyframes precisam estar em ordem de tempo.');
    const starts = i === 0 || key.cut;
    if (!starts && (key.mode || key.follow)) fail('"mode" e "follow" só podem mudar num corte; adicione "cut": true.');
    const shot = shotStart(keys, i);
    const mode = shot.mode ?? 'cinematic';
    if (mode === 'cinematic') {
      if (shot.follow) fail('"follow" só vale com "mode": "fpv" ou "third_person".');
      if (!key.pos || !key.lookAt) fail('plano cinematic precisa de "pos" e "lookAt".');
    } else {
      if (mode !== 'fpv' && mode !== 'third_person') fail(`"mode" precisa ser cinematic, fpv ou third_person, não "${mode}".`);
      if (!shot.follow) fail(`plano ${mode} precisa de "follow" com o id de um personagem do elenco.`);
      if (!castIds.includes(shot.follow!)) fail(`"${shot.follow}" não está no elenco. Elenco: ${castIds.join(', ') || 'vazio'}.`);
    }
  });
}

/** Unit vector a character looks along, tilted up by `pitch` degrees. */
function forward(yaw: number, pitch: number): Vec3 {
  const y = (yaw * Math.PI) / 180;
  const p = (pitch * Math.PI) / 180;
  return [-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)];
}

function attached(shot: CameraKey, a: CameraKey, b: CameraKey | undefined, t: number, stage: CameraStage | undefined): CameraPose {
  const mode = shot.mode!;
  const id = shot.follow!;
  const subject = stage?.subject(id, t);
  if (!subject) throw new Error(`Câmera ${mode}: personagem "${id}" não está no elenco.`);
  const u = b ? (t - a.t) / (b.t - a.t) : 0;
  const mix = (pick: (k: CameraKey) => number | undefined, fallback: number): number => {
    const from = pick(a) ?? fallback;
    return b ? from + ((pick(b) ?? fallback) - from) * u : from;
  };
  const pitch = mix((k) => k.pitch, 0);
  const eye: Vec3 = [subject.pos[0], subject.pos[1] + subject.eyeHeight, subject.pos[2]];

  if (mode === 'fpv') {
    const f = forward(subject.yaw, pitch);
    return { pos: eye, lookAt: [eye[0] + f[0], eye[1] + f[1], eye[2] + f[2]], fov: mix((k) => k.fov, FPV_FOV), mode, follow: id };
  }

  // Average the heading over the last moments so a quick turn of the body swings the camera gently.
  let yaw = 0;
  const SAMPLES = 7;
  for (let i = 0; i < SAMPLES; i++) yaw += (stage!.subject(id, Math.max(0, t - (TURN_LAG * i) / (SAMPLES - 1))) ?? subject).yaw;
  yaw /= SAMPLES;
  const distance = mix((k) => k.distance, DEFAULT_DISTANCE);
  const height = mix((k) => k.height, DEFAULT_HEIGHT);
  const back = forward(yaw, 0);
  const wanted: Vec3 = [eye[0] - back[0] * distance, eye[1] + height, eye[2] - back[2] * distance];
  // Come closer instead of going through a wall.
  const length = Math.hypot(wanted[0] - eye[0], wanted[1] - eye[1], wanted[2] - eye[2]);
  const free = (stage!.clear?.(eye, wanted) ?? 1) * length;
  const k = free >= length ? 1 : Math.max(0.1, free - WALL_MARGIN) / length;
  const pos: Vec3 = [eye[0] + (wanted[0] - eye[0]) * k, eye[1] + (wanted[1] - eye[1]) * k, eye[2] + (wanted[2] - eye[2]) * k];
  // Aim past the character, so they sit in the lower part of the frame with the way ahead in view.
  const f = forward(yaw, pitch);
  const ahead = 4;
  return {
    pos,
    lookAt: [eye[0] + f[0] * ahead, eye[1] + f[1] * ahead, eye[2] + f[2] * ahead],
    fov: mix((k) => k.fov, DEFAULT_FOV),
    mode,
    follow: id,
  };
}

/** Camera pose at time t. `stage` is needed when the track has fpv or third_person shots. */
export function evaluateCamera(keys: CameraKey[], t: number, stage?: CameraStage): CameraPose {
  if (!keys.length) throw new Error('Camera track has no keyframes.');
  let i = keys.length - 1;
  while (i > 0 && keys[i].t > t) i--;
  const a = keys[i];
  const shot = shotStart(keys, i);
  const mode = shot.mode ?? 'cinematic';
  // Before the first key, past the last one, or waiting for a cut: hold.
  const b = t > a.t && keys[i + 1] && !keys[i + 1].cut ? keys[i + 1] : undefined;
  if (mode !== 'cinematic') return attached(shot, a, b, t, stage);

  const fa = a.fov ?? DEFAULT_FOV;
  if (!b) return { pos: a.pos!, lookAt: a.lookAt!, fov: fa, mode };
  const prev = i > 0 && !a.cut ? keys[i - 1] : a;
  const next = keys[i + 2] && !keys[i + 2].cut ? keys[i + 2] : b;
  const u = (t - a.t) / (b.t - a.t);
  return {
    pos: hermite(prev, a, b, next, t, (k) => k.pos!),
    lookAt: hermite(prev, a, b, next, t, (k) => k.lookAt!),
    fov: fa + ((b.fov ?? DEFAULT_FOV) - fa) * u,
    mode,
  };
}
