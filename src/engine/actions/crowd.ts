/**
 * People do not walk through each other. The action track puts each character on its own path without knowing
 * about the others; this pass, at any instant, shifts whoever is walking sideways around whoever is in the way.
 *
 * It is a pure function of the time, like everything on the stage, so scrubbing and rendering frame by frame show
 * the same thing. It is also a smooth one: every term below changes gradually as people move, with no either/or
 * decision anywhere, because a decision that flips from one frame to the next shows as a body jumping. That rules
 * out the obvious ways of doing this (push the pair apart, try the other side if a wall is there).
 *
 * - Only someone walking moves, and only sideways: they keep their pace along the path. Standing and sitting
 *   people stay where the script put them; they are what walkers go round.
 * - A walker passes on their own right of someone straight ahead, so two people coming at each other each step
 *   to their right, as people do.
 * - Who is behind does not count: the one in front does not make room for the one following.
 * - Nobody is shifted further than the room there is to the nearest wall.
 */
import type { Collider } from '../world/build';
import { channelAt, evaluateLinks, placementAt, type CompiledActions } from './catalog';

/** How close two people can be, center to center, in meters (two shoulders and a little air). */
export const PERSONAL_SPACE = 0.58;
/** Walking past someone, people keep a little more room. */
export const PASSING_SPACE = 0.75;
/** Body radius kept clear of walls when someone is shifted. */
const BODY = 0.25;
/** The most a walker is shifted off their path. */
const MAX_SHIFT = 0.6;
/** How far ahead a walker starts to step aside, in meters (about two steps). */
const AHEAD = 1.5;

const smooth = (u: number): number => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

interface Body {
  id: string;
  x: number;
  y: number;
  z: number;
  /** 0 standing still, up to 1 walking: how much of a shift this one takes. */
  walking: number;
  /** Unit vectors of the body: where it faces, and its right. */
  ahead: [number, number];
  right: [number, number];
}

/** Distance from a point to the nearest wall at body height (0 inside one). */
function roomAround(x: number, z: number, y: number, walls: Collider[]): number {
  let nearest = Infinity;
  for (const r of walls) {
    if (y >= r.y1 - 0.3 || y + 1.6 <= r.y0) continue;
    const dx = x - Math.max(r.minX, Math.min(x, r.maxX));
    const dz = z - Math.max(r.minZ, Math.min(z, r.maxZ));
    nearest = Math.min(nearest, Math.hypot(dx, dz));
  }
  return nearest;
}

/** The ids of the characters of a compiled episode. */
export function charactersOf(compiled: CompiledActions): string[] {
  return Object.entries(compiled.initial).filter(([, channels]) => 'gait' in channels && 'stride' in channels).map(([id]) => id);
}

/** Seconds each side of an instant over which the shift is averaged, and how many instants are looked at. */
const BLUR = 0.24;
const TAPS = 7;

/**
 * How far each character is shifted off its path at time t, [dx, dz] by id. Only those shifted are listed.
 * `walls` are the location's colliders, so nobody is shifted into a wall.
 *
 * The shift is the average of what the instants around t ask for (nearer ones weighing more): when someone
 * crosses right in front of a walker, the side to pass on changes, and the average turns that change into a
 * step taken over a moment instead of a jump.
 */
export function crowdAt(compiled: CompiledActions, ids: string[], t: number, walls: Collider[] = []): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  let total = 0;
  for (let k = 0; k < TAPS; k++) {
    const u = (k / (TAPS - 1)) * 2 - 1;
    const weight = 1 - Math.abs(u) * 0.8;
    total += weight;
    for (const [id, [dx, dz]] of shiftsAt(compiled, ids, Math.max(0, t + u * BLUR), walls)) {
      const sum = out.get(id) ?? [0, 0];
      out.set(id, [sum[0] + dx * weight, sum[1] + dz * weight]);
    }
  }
  for (const [id, [dx, dz]] of out) {
    if (Math.hypot(dx, dz) / total < 0.002) out.delete(id);
    else out.set(id, [dx / total, dz / total]);
  }
  return out;
}

/** What one instant asks for, before averaging. */
function shiftsAt(compiled: CompiledActions, ids: string[], t: number, walls: Collider[]): Map<string, [number, number]> {
  const riding = new Set(evaluateLinks(compiled, t).map((l) => l.target));
  const bodies: Body[] = [];
  for (const id of ids) {
    if (riding.has(id)) continue;
    const { pos, yaw } = placementAt(compiled, id, t);
    const sitting = channelAt(compiled, id, 'sit', t);
    const a = (yaw * Math.PI) / 180;
    bodies.push({
      id, x: pos[0], y: pos[1], z: pos[2],
      // The gait eases in and out with the first and last steps, and so does the shift.
      walking: Math.min(1, channelAt(compiled, id, 'gait', t)) * (1 - smooth(sitting * 2)),
      ahead: [-Math.sin(a), -Math.cos(a)],
      right: [Math.cos(a), -Math.sin(a)],
    });
  }
  const solid = walls.filter((w) => !w.door);
  const shifted = new Map<string, [number, number]>();
  for (const me of bodies) {
    if (me.walking <= 0.001) continue;
    let shift = 0;
    for (const other of bodies) {
      if (other === me || Math.abs(other.y - me.y) > 1) continue;
      const [dx, dz] = [other.x - me.x, other.z - me.z];
      const along = dx * me.ahead[0] + dz * me.ahead[1];
      const side = dx * me.right[0] + dz * me.right[1];
      if (along >= AHEAD || along <= -PASSING_SPACE || Math.abs(side) >= PASSING_SPACE) continue;
      // How far to the side the two have to be to pass: it grows from two steps away until they are level...
      const apart = PASSING_SPACE * smooth(1 - (along > 0 ? along / AHEAD : -along / PASSING_SPACE));
      const short = Math.max(0, apart - Math.abs(side));
      // ...counting whoever is ahead or level. Someone behind going the same way is following, and is not made
      // room for; someone behind after crossing paths counts until the two are clear of each other...
      const sameWay = other.walking * Math.max(0, me.ahead[0] * other.ahead[0] + me.ahead[1] * other.ahead[1]);
      const inFront = sameWay * smooth((along + 0.35) / 0.35) + (1 - sameWay) * smooth((along + PASSING_SPACE) / 0.3);
      // ...and away from the side the other is on; straight ahead counts as on the left, so pass on the right.
      const away = -Math.tanh((side - 0.12) / 0.12);
      // Two walkers share the room (each most of it, since both are moving); a walker goes all the way round someone standing.
      const part = 1 - 0.2 * other.walking;
      shift += short * inFront * away * part;
    }
    // A soft limit, and no further than the room to the nearest wall.
    const room = Math.max(0, roomAround(me.x, me.z, me.y, solid) - BODY);
    const limit = Math.min(MAX_SHIFT, room);
    const amount = limit * Math.tanh(shift / Math.max(limit, 1e-6)) * me.walking;
    if (Math.abs(amount) > 0.002) shifted.set(me.id, [me.right[0] * amount, me.right[1] * amount]);
  }
  return shifted;
}
