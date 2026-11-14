import { describe, expect, it } from 'vitest';
import { placementAt } from './actions/catalog';
import type { CharacterDef } from './character/types';
import { direct, resolveScript } from './timeline/direct';
import { buildCast, compileEpisode } from './timeline/stage';
import { buildLocation } from './world/build';
import { terrainHeight } from './world/terrain';
import type { Location, Terrain } from './world/types';

const terrain: Terrain = {
  hills: [{ at: [0, -30], radius: [40, 14], height: 8, top: 0.4 }, { at: [0, 0], radius: [60, 6], height: -1, top: 0.5 }],
  walkable: [{ origin: [-10, -36], size: [20, 40] }],
};
const loc: Location = {
  id: 't', name: 't', ground: { color: '#a89060', size: 120 }, terrain, rooms: [],
  props: [{ asset: 'nature.bush', pos: [5, -30] }],
};

describe('terrain', () => {
  it('a flat top is flat, the slope falls smoothly and a hollow digs below 0', () => {
    expect(terrainHeight(terrain, 0, -30)).toBeCloseTo(8, 5);
    expect(terrainHeight(terrain, 10, -30)).toBeCloseTo(8, 5);
    expect(terrainHeight(terrain, 0, 0)).toBeCloseTo(-1, 5);
    const down = [-24, -22, -20, -18].map((z) => terrainHeight(terrain, 0, z));
    for (let i = 1; i < down.length; i++) expect(down[i]).toBeLessThan(down[i - 1]);
    expect(terrainHeight(undefined, 3, 4)).toBe(0);
  });

  it('props stand on the ground under them', () => {
    const built = buildLocation(loc);
    const bush = built.exterior.children.find((o) => o.name !== 'terrain')!;
    expect(bush.position.y).toBeCloseTo(8, 3);
    expect(built.groundAt(0, -30)).toBeCloseTo(8, 5);
  });

  it('the cast starts on the ground and walks down the hill with its feet on it', () => {
    const built = buildLocation(loc);
    const defs: CharacterDef[] = [{ id: 'davi', name: 'Davi' }];
    const episode = resolveScript(direct({ episode: 1, title: 't', location: 't', cast: [{ character: 'davi', at: [0, -30], yaw: 180 }] }, (d) => {
      d.camera.cut({ pos: [10, 10, 0], lookAt: [0, 0, -15] });
      d.actor('davi').walkTo([0, 0]);
    }), built, defs);
    expect(episode.cast![0].elevation).toBeCloseTo(8, 2);
    const compiled = compileEpisode(episode, built, buildCast(episode, defs));
    const end = episode.duration - 1;
    for (let t = 0; t <= end; t += 0.5) {
      const { pos } = placementAt(compiled, 'davi', t);
      expect(Math.abs(pos[1] - built.groundAt(pos[0], pos[2]))).toBeLessThan(0.12);
    }
    expect(placementAt(compiled, 'davi', end).pos[1]).toBeCloseTo(-1, 1);
  });

  it('something spread over a slope (a flock) knows the ground under each part', () => {
    const built = buildLocation({ ...loc, props: [{ asset: 'ancient.flock', pos: [0, -22], params: { count: 6, width: 8, depth: 6 } }] });
    const flock = built.exterior.children.find((o) => o.userData.followsGround)!;
    const ground = flock.userData.ground as (x: number, z: number) => number;
    for (const [x, z] of [[0, 0], [3, 2], [-3, -2]]) {
      expect(ground(x, z) + flock.position.y).toBeCloseTo(built.groundAt(x, -22 + z), 3);
    }
  });

  it('something slid up a slope stays on the ground', () => {
    const built = buildLocation(loc);
    const defs: CharacterDef[] = [{ id: 'davi', name: 'Davi' }];
    const episode = resolveScript(direct({ episode: 1, title: 't', location: 't', cast: [{ character: 'davi', at: [3, 0], yaw: 0 }], props: [{ id: 'caixa', asset: 'item.box', pos: [0, 0] }] }, (d) => {
      d.camera.cut({ pos: [10, 10, 0], lookAt: [0, 0, -15] });
      d.do('caixa', 'moveTo', { to: [0, -28] }, { duration: 6, ease: 'linear' });
    }), built, defs);
    const compiled = compileEpisode(episode, built, buildCast(episode, defs));
    for (const t of [0, 2, 4, 6]) {
      const { pos } = placementAt(compiled, 'caixa', t);
      expect(pos[1]).toBeCloseTo(built.groundAt(pos[0], pos[2]), 2);
    }
  });
});
