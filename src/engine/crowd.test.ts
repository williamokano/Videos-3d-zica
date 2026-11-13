import { describe, expect, it } from 'vitest';
import { PERSONAL_SPACE, charactersOf, crowdAt } from './actions/crowd';
import { placementAt } from './actions/catalog';
import type { CharacterDef } from './character/types';
import { direct, resolveScript } from './timeline/direct';
import { buildCast, compileEpisode } from './timeline/stage';
import { buildLocation } from './world/build';

describe('crowd', () => {
  const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 30 }, rooms: [{ id: 'r', name: 'r', origin: [0, 0], size: [12, 4], floorColor: '#ccc' }] });
  const defs: CharacterDef[] = [{ id: 'ana', name: 'Ana' }, { id: 'beto', name: 'Beto' }, { id: 'caio', name: 'Caio' }];

  it('people walking into each other go round, and nobody is moved when far apart', () => {
    const episode = resolveScript(direct({
      episode: 1, title: 't', location: 't',
      cast: [{ character: 'ana', at: [1, 2], yaw: -90 }, { character: 'beto', at: [11, 2], yaw: 90 }, { character: 'caio', at: [6, 3.4], seated: 0.46, yaw: 0 }],
    }, (d) => {
      d.camera.cut({ pos: [6, 5, 8], lookAt: [6, 0, 2] });
      d.together(() => d.actor('ana').walkTo([11, 2], { speed: 1.3 }), () => d.actor('beto').walkTo([1, 2], { speed: 1.3 }));
    }), location, defs);
    const cast = buildCast(episode, defs);
    const compiled = compileEpisode(episode, location, cast);
    const ids = charactersOf(compiled);
    expect(ids.sort()).toEqual(['ana', 'beto', 'caio']);
    let closest = Infinity;
    let before: Record<string, number[]> | undefined;
    for (let t = 0; t < episode.duration; t += 1 / 30) {
      const moved = crowdAt(compiled, ids, t, location.colliders);
      const at = (id: string) => {
        const { pos } = placementAt(compiled, id, t);
        const [dx, dz] = moved.get(id) ?? [0, 0];
        return [pos[0] + dx, pos[2] + dz];
      };
      const [a, b] = [at('ana'), at('beto')];
      closest = Math.min(closest, Math.hypot(a[0] - b[0], a[1] - b[1]));
      // Nobody jumps from one frame to the next: a walker covers 4 or 5 cm a frame, and the step aside adds little.
      if (before) for (const [id, now] of [['ana', a], ['beto', b]] as const) expect(Math.hypot(now[0] - before[id][0], now[1] - before[id][1])).toBeLessThan(0.08);
      before = { ana: a, beto: b };
      // Sitting, Caio never moves.
      expect(moved.get('caio')).toBeUndefined();
    }
    expect(closest).toBeGreaterThan(PERSONAL_SPACE * 0.8);
    expect(crowdAt(compiled, ids, 0, location.colliders).size).toBe(0);
  });
});
