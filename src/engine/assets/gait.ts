/**
 * How a four-legged animal walks (the donkey, the sheep): pure functions, so any frame can be drawn on its own.
 *
 * The walk of a donkey, a horse or a sheep is a four-beat lateral sequence: hind left, fore left, hind right, fore
 * right, each a quarter of the cycle after the one before. Each foot spends most of the cycle on the ground (the
 * stance), and there it must move backwards under the body exactly as fast as the body moves forwards, or the hoof
 * slides. The rest of the cycle (the swing) it comes forward lifted.
 *
 * Legs are given in the order the assets build them: fore left, fore right, hind left, hind right (facing -z,
 * left is -x).
 */

/** Where in the cycle each leg starts, in the order fore left, fore right, hind left, hind right. */
export const WALK_OFFSETS = [0.25, 0.75, 0, 0.5] as const;
/** Part of the cycle a foot is on the ground. Walking animals keep each foot down a little over half the time. */
export const STANCE = 0.62;

export interface LegPose {
  /** Swing of the leg at the hip, radians: positive brings the foot forward (toward -z). */
  angle: number;
  /** How far the foot is lifted off the ground, in meters. */
  lift: number;
  /** Whether the foot is on the ground. */
  planted: boolean;
}

/**
 * The pose of one leg at `phase` (cycles walked so far, any real number) for a leg `length` meters from hip to
 * ground and a cycle that covers `cycle` meters. `leg` is the index in the order above.
 */
export function legPose(phase: number, leg: number, length: number, cycle: number, liftHeight = length * 0.12): LegPose {
  const p = (((phase + WALK_OFFSETS[leg]) % 1) + 1) % 1;
  const reach = (cycle * STANCE) / 2;
  let ahead: number;
  let lift = 0;
  if (p < STANCE) {
    // On the ground: from `reach` ahead of the hip to `reach` behind, as fast as the body goes.
    ahead = reach - cycle * p;
  } else {
    const u = (p - STANCE) / (1 - STANCE);
    ahead = -reach + 2 * reach * (1 - Math.cos(Math.PI * u)) / 2;
    lift = liftHeight * Math.sin(Math.PI * u);
  }
  return { angle: Math.asin(Math.max(-0.95, Math.min(0.95, ahead / length))), lift, planted: p < STANCE };
}

/**
 * Meters travelled from time 0 to t by something whose place on the ground at any time is `at(t)`, summed in short
 * steps. Remembers where it got to, so asking for each frame in turn costs only the stretch since the last one.
 */
export function odometer(at: (t: number) => [number, number], step = 0.05): (t: number) => number {
  let last = { t: 0, distance: 0, place: at(0) };
  return (t: number) => {
    if (t < last.t) last = { t: 0, distance: 0, place: at(0) };
    let { t: u, distance, place } = last;
    while (u < t) {
      const next = Math.min(t, u + step);
      const there = at(next);
      distance += Math.hypot(there[0] - place[0], there[1] - place[1]);
      [u, place] = [next, there];
    }
    last = { t, distance, place };
    return distance;
  };
}
