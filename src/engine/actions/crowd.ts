/**
 * People do not walk through each other. The action track puts each character on its own path without knowing
 * about the others; this pass, at any instant, moves apart those who are closer than two bodies. Someone walking
 * steps aside around whoever is in the way (mostly sideways, not backwards); someone standing gives a little;
 * someone sitting does not move. It is a pure function of the time, like everything on the stage, so scrubbing
 * and rendering frame by frame show the same thing, and the camera in a character's eyes follows the same place.
 */
import type { Collider } from '../world/build';
import { channelAt, evaluateLinks, placementAt, type CompiledActions } from './catalog';

/** How close two people can be, center to center, in meters (two shoulders and a little air). */
export const PERSONAL_SPACE = 0.58;
/** Walking past someone, people keep a little more room. */
export const PASSING_SPACE = 0.75;
/** Body radius kept clear of walls when someone is moved aside. */
const BODY = 0.22;

interface Body {
  id: string;
  x: number;
  y: number;
  z: number;
  /** How much of a push this one takes: 0 does not move. */
  give: number;
  /** Walking direction (unit), or null when still. */
  ahead: [number, number] | null;
}

const blocked = (x: number, z: number, y: number, walls: Collider[]): boolean =>
  walls.some((r) => {
    if (y >= r.y1 - 0.3 || y + 1.6 <= r.y0) return false;
    const dx = x - Math.max(r.minX, Math.min(x, r.maxX));
    const dz = z - Math.max(r.minZ, Math.min(z, r.maxZ));
    return dx * dx + dz * dz < BODY * BODY;
  });

/** The ids of the characters of a compiled episode. */
export function charactersOf(compiled: CompiledActions): string[] {
  return Object.entries(compiled.initial).filter(([, channels]) => 'gait' in channels && 'stride' in channels).map(([id]) => id);
}

/**
 * How far each character is moved aside at time t, [dx, dz] by id. Only those moved are listed.
 * `walls` are the location's colliders, so nobody is pushed into a wall.
 */
export function crowdAt(compiled: CompiledActions, ids: string[], t: number, walls: Collider[] = []): Map<string, [number, number]> {
  const riding = new Set(evaluateLinks(compiled, t).map((l) => l.target));
  const bodies: Body[] = [];
  for (const id of ids) {
    if (riding.has(id)) continue;
    const { pos, yaw } = placementAt(compiled, id, t);
    const sitting = channelAt(compiled, id, 'sit', t) > 0.3;
    const gait = channelAt(compiled, id, 'gait', t);
    const a = (yaw * Math.PI) / 180;
    bodies.push({
      id, x: pos[0], y: pos[1], z: pos[2],
      give: sitting ? 0 : gait > 0.05 ? 1 : 0.35,
      ahead: gait > 0.05 ? [-Math.sin(a), -Math.cos(a)] : null,
    });
  }
  const solid = walls.filter((w) => !w.door);
  const moved = new Map<string, [number, number]>();
  // Two passes settle a small knot of three or four people.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < bodies.length; i++) {
      for (let k = i + 1; k < bodies.length; k++) {
        const [a, b] = [bodies[i], bodies[k]];
        if (Math.abs(a.y - b.y) > 1 || a.give + b.give === 0) continue;
        let [dx, dz] = [b.x - a.x, b.z - a.z];
        const d = Math.hypot(dx, dz);
        const space = a.ahead || b.ahead ? PASSING_SPACE : PERSONAL_SPACE;
        if (d >= space) continue;
        if (d < 1e-4) [dx, dz] = [1, 0];
        else [dx, dz] = [dx / d, dz / d];
        // Ease in, so a body coming closer is moved gently and never jumps.
        const overlap = space - d;
        const push = overlap * (overlap / space) ** 0.25;
        const share = (body: Body, sign: number): [number, number] => {
          let [px, pz] = [dx * sign, dz * sign];
          if (body.ahead) {
            // Walking: go round, not back. Keep the sideways part of the push and a little of the rest.
            const along = px * body.ahead[0] + pz * body.ahead[1];
            px -= 0.8 * along * body.ahead[0];
            pz -= 0.8 * along * body.ahead[1];
            const n = Math.hypot(px, pz);
            // Straight into someone: the two step to opposite sides of the line between them.
            if (n < 0.2) [px, pz] = [-dz * sign, dx * sign];
            else [px, pz] = [px / n, pz / n];
          }
          const amount = (push * body.give) / (a.give + b.give);
          return [px * amount, pz * amount];
        };
        for (const [body, sign] of [[a, -1], [b, 1]] as const) {
          if (!body.give) continue;
          const [px, pz] = share(body, sign);
          if (blocked(body.x + px, body.z + pz, body.y, solid)) continue;
          body.x += px;
          body.z += pz;
          const was = moved.get(body.id) ?? [0, 0];
          moved.set(body.id, [was[0] + px, was[1] + pz]);
        }
      }
    }
  }
  return moved;
}
