import { describe, expect, it } from 'vitest';
import { ambientAt, type Behaviour } from './actions/ambient';

describe('ambientAt', () => {
  it('never crosses the arms while saying a line, nor just before or after it', () => {
    const behaviours = [{ target: 'pai', t0: 0, mode: 'attend' }] as Behaviour[];
    const times = Array.from({ length: 2000 }, (_, i) => i * 0.1);
    // Somewhere in 200 s the arms cross by themselves.
    const crossing = times.filter((t) => ambientAt(behaviours, 'pai', t).cross > 0.5);
    expect(crossing.length).toBeGreaterThan(0);
    const t = crossing[0];
    const lines = [{ type: 'line', target: 'pai', t: t - 1, data: { duration: 2 } }];
    for (const at of [t - 1.2, t, t + 1.2]) expect(ambientAt(behaviours, 'pai', at, lines).cross).toBe(0);
    // Someone else's line does not stop him.
    expect(ambientAt(behaviours, 'pai', t, [{ ...lines[0], target: 'filho' }]).cross).toBeGreaterThan(0.5);
  });
});
