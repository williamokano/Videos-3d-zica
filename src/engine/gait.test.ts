import { describe, expect, it } from 'vitest';
import { legPose, odometer, STANCE, WALK_OFFSETS } from './assets/gait';

describe('four-legged walk', () => {
  const [length, cycle] = [0.84, 0.9];
  // Where a foot is along the ground when the body has walked `d` meters: the hip moves with the body.
  const foot = (d: number, leg: number) => d + length * Math.sin(legPose(d / cycle, leg, length, cycle).angle);

  it('keeps a planted hoof still on the ground while the body walks', () => {
    for (let leg = 0; leg < 4; leg++) {
      for (let d = 0; d < 3; d += 0.01) {
        const pose = legPose(d / cycle, leg, length, cycle);
        const next = legPose((d + 0.01) / cycle, leg, length, cycle);
        if (pose.planted && next.planted) expect(Math.abs(foot(d + 0.01, leg) - foot(d, leg))).toBeLessThan(1e-6);
        if (pose.planted) expect(pose.lift).toBe(0);
      }
    }
  });

  it('lifts each foot and brings it forward, one leg after the other in a lateral sequence', () => {
    // Hind left, then fore left, hind right, fore right: a quarter of a cycle apart.
    const order = [2, 0, 3, 1].map((leg) => WALK_OFFSETS[leg]);
    expect(order).toEqual([0, 0.25, 0.5, 0.75]);
    const swing = legPose(STANCE + (1 - STANCE) / 2, 2, length, cycle);
    expect(swing.planted).toBe(false);
    expect(swing.lift).toBeGreaterThan(0.08);
    // Never fewer than two feet on the ground at once.
    for (let p = 0; p < 1; p += 0.01) expect([0, 1, 2, 3].filter((leg) => legPose(p, leg, length, cycle).planted).length).toBeGreaterThanOrEqual(2);
  });

  it('measures the distance travelled, frame after frame or out of order', () => {
    // Stands for a second, then walks at 1 m/s.
    const at = (t: number): [number, number] => [Math.max(0, t - 1), 0];
    const travelled = odometer(at);
    expect(travelled(0.5)).toBe(0);
    expect(travelled(3)).toBeCloseTo(2);
    expect(travelled(2)).toBeCloseTo(1);
    // The phase follows distance, so it never races when the speed changes late in an episode.
    const late = odometer((t): [number, number] => [t < 100 ? 0 : (t - 100) ** 2, 0]);
    expect(late(100.1) - late(100)).toBeLessThan(0.02);
  });
});
