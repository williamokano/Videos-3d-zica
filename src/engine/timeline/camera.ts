/** Camera track: keyframes over time. The pose at any instant is a pure function of the track and t. */

export type Vec3 = [number, number, number];

export interface CameraKey {
  /** Seconds from the start of the episode. */
  t: number;
  pos: Vec3;
  lookAt: Vec3;
  /** Vertical field of view in degrees. */
  fov?: number;
  /** Hard cut: jump to this key instead of moving from the previous one. */
  cut?: boolean;
}

export interface CameraPose {
  pos: Vec3;
  lookAt: Vec3;
  fov: number;
}

const DEFAULT_FOV = 50;

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

export function evaluateCamera(keys: CameraKey[], t: number): CameraPose {
  if (!keys.length) throw new Error('Camera track has no keyframes.');
  const pose = (k: CameraKey): CameraPose => ({ pos: k.pos, lookAt: k.lookAt, fov: k.fov ?? DEFAULT_FOV });
  if (t <= keys[0].t) return pose(keys[0]);
  let i = keys.length - 1;
  while (keys[i].t > t) i--;
  const a = keys[i];
  const b = keys[i + 1];
  // Past the last key, or waiting for a cut: hold.
  if (!b || b.cut) return pose(a);
  const prev = i > 0 && !a.cut ? keys[i - 1] : a;
  const next = keys[i + 2] && !keys[i + 2].cut ? keys[i + 2] : b;
  const u = (t - a.t) / (b.t - a.t);
  const fa = a.fov ?? DEFAULT_FOV;
  return {
    pos: hermite(prev, a, b, next, t, (k) => k.pos),
    lookAt: hermite(prev, a, b, next, t, (k) => k.lookAt),
    fov: fa + ((b.fov ?? DEFAULT_FOV) - fa) * u,
  };
}
