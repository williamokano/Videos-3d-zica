import { describe, expect, it } from 'vitest';
import type { CastMember } from './character/cast';
import type { CharacterDef } from './character/types';
import { reviewEpisode } from './review';
import { direct, OVER_MIN_APART, resolveScript } from './timeline/direct';
import { buildLocation } from './world/build';

describe('conversation camera', () => {
  // A room 12 x 12 with walls; people near the north wall test the camera coming in instead of going through it.
  const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 40 }, rooms: [{ id: 'r', name: 'r', origin: [0, 0], size: [12, 12], floorColor: '#ccc', wallHeight: 3 }] } as never);
  const defs: CharacterDef[] = [{ id: 'ana', name: 'Ana' }, { id: 'beto', name: 'Beto' }, { id: 'gigante', name: 'Gigante', height: 3.1 }];
  const turns = [
    ['ana', 'Uma primeira fala, para ver de onde a câmera olha.'],
    ['beto', 'A resposta, vista do outro lado.'],
    ['beto', 'E mais uma, do mesmo plano.'],
    ['ana', 'E a volta para o primeiro lado.'],
  ] as [string, string][];
  const talk = (cast: CastMember[]) => {
    const episode = resolveScript(direct({ episode: 1, title: 't', location: 't', cast }, (d) => {
      for (const m of cast) d.actor(m.id ?? m.character).behave('idle');
      d.conversa(turns.map(([who, text]) => [who === 'beto' ? cast[1].id ?? cast[1].character : who, text]));
    }), location, defs);
    const framing = reviewEpisode(episode, location, defs).filter((f) => ['fala-na-borda', 'fala-tapada', 'fala-fora-do-quadro', 'camera-dentro'].includes(f.check));
    return { episode, framing };
  };
  const pair = (a: [number, number], b: [number, number], other = 'beto'): CastMember[] => {
    const yaw = (from: [number, number], to: [number, number]) => (Math.atan2(-(to[0] - from[0]), -(to[1] - from[1])) * 180) / Math.PI;
    return [{ character: 'ana', at: a, yaw: yaw(a, b) }, { character: other, at: b, yaw: yaw(b, a) }];
  };

  for (const [name, cast] of [
    ['facing across the room', pair([4, 6], [8, 6])],
    ['along the room', pair([6, 3], [6, 8])],
    ['on a diagonal', pair([3, 3], [6.5, 7])],
    ['with a wall right behind one of them', pair([6, 0.6], [6, 3])],
    ['close together (a shot from the side)', pair([5.6, 6], [6.4, 6])],
    ['with a giant', pair([4, 6], [7, 6], 'gigante')],
  ] as [string, CastMember[]][]) {
    it(`keeps the speaker in the middle, in view and clear: ${name}`, () => {
      const { framing } = talk(cast);
      expect(framing.map((f) => f.text)).toEqual([]);
    });
  }

  it('cuts only when the speaker changes, and keeps each one on their side of the picture', () => {
    const { episode } = talk(pair([4, 6], [8, 6]));
    const shots = episode.camera.filter((k) => k.aim);
    expect(shots.map((k) => k.aim)).toEqual(['ana', 'beto', 'ana']);
    // The two shots of Ana are the same place: the camera comes back to where it was.
    expect(shots[2].pos).toEqual(shots[0].pos);
    // 180° rule: every camera on the same side of the line from Ana to Beto (here the line runs along x, at z = 6).
    expect(new Set(shots.map((k) => Math.sign(k.pos![2] - 6))).size).toBe(1);
  });

  it('says every line to the other one, in order, without overlapping', () => {
    const { episode } = talk(pair([4, 6], [8, 6]));
    const says = (episode.actions ?? []).filter((c) => c.action === 'say');
    expect(says.map((c) => c.params?.to)).toEqual(['beto', 'ana', 'ana', 'beto']);
    for (let i = 1; i < says.length; i++) expect(says[i].t).toBeGreaterThanOrEqual(says[i - 1].t + (says[i - 1].duration ?? 0));
  });

  it('refuses a conversation that is not between two people', () => {
    expect(() => resolveScript(direct({ episode: 1, title: 't', location: 't', cast: pair([4, 6], [8, 6]) }, (d) => {
      d.conversa([['ana', 'Sozinha.']]);
    }), location, defs)).toThrow(/duas pessoas/);
    expect(OVER_MIN_APART).toBeGreaterThan(1);
  });
});
