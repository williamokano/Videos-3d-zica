import { describe, expect, it } from 'vitest';
import { DEFAULT_ENVIRONMENT, activeRules, resolveEnvironment, type Bible } from './bible';
import { resolveCollisions } from './world/build';
import type { Room } from './world/types';
import { roomOpenings, roomWalls, splitWall } from './world/walls';

const bible: Bible = {
  series: 't', title: 't', language: 'pt-BR', dubbing: [],
  format: { width: 1080, height: 1920, fps: 30 },
  audio: { provider: 'elevenlabs', defaultMode: 'tts' },
  rules: [
    { id: 'red', description: '', from: 2, until: null, effects: { environment: { skyTop: '#f00' } } },
    { id: 'night', description: '', from: 3, until: 4, effects: { environment: { sunIntensity: 0.2 } } },
  ],
};

describe('bible', () => {
  it('applies rules only inside their episode range', () => {
    expect(activeRules(bible, 1)).toHaveLength(0);
    expect(activeRules(bible, 2).map((r) => r.id)).toEqual(['red']);
    expect(activeRules(bible, 4).map((r) => r.id)).toEqual(['red', 'night']);
    expect(activeRules(bible, 5).map((r) => r.id)).toEqual(['red']);
  });

  it('overrides only the fields a rule names', () => {
    const env = resolveEnvironment(activeRules(bible, 3));
    expect(env.skyTop).toBe('#f00');
    expect(env.sunIntensity).toBe(0.2);
    expect(env.skyHorizon).toBe(DEFAULT_ENVIRONMENT.skyHorizon);
  });
});

describe('walls', () => {
  const span = { axis: 'x' as const, center: 0, from: 0, to: 10 };

  it('leaves a door gap with a lintel above it', () => {
    const pieces = splitWall(span, 3, [{ from: 4, to: 5, type: 'door' }]);
    expect(pieces.map((p) => [p.from, p.to, p.y0, p.y1])).toEqual([
      [0, 4, 0, 3],
      [4, 5, 2.1, 3],
      [5, 10, 0, 3],
    ]);
  });

  it('fills a window with sill, glass and lintel', () => {
    const kinds = splitWall(span, 3, [{ from: 2, to: 4, type: 'window' }]).filter((p) => p.from === 2);
    expect(kinds.map((p) => [p.kind, p.y0, p.y1])).toEqual([
      ['wall', 2.1, 3],
      ['wall', 0, 0.9],
      ['glass', 0.9, 2.1],
    ]);
  });

  it('opens the neighbouring room wall for a door declared on the shared boundary', () => {
    const a: Room = { id: 'a', name: 'a', origin: [0, 0], size: [4, 4], floorColor: '#fff', openings: [{ wall: 's', type: 'door', at: 2, width: 1 }] };
    const b: Room = { id: 'b', name: 'b', origin: [0, 4], size: [4, 4], floorColor: '#fff' };
    const openings = [a, b].flatMap(roomOpenings);
    const north = roomWalls(b, openings).filter((p) => p.axis === 'x' && p.center < 4.5);
    expect(north.some((p) => p.from === 1.5 && p.to === 2.5 && p.y0 === 2.1)).toBe(true);
    expect(north.some((p) => p.y0 === 0 && p.from < 2 && p.to > 2)).toBe(false);
  });
});

describe('collisions', () => {
  const wall = [{ minX: 0, maxX: 10, minZ: -0.1, maxZ: 0.1 }];

  it('keeps a walker out of a wall and leaves free positions alone', () => {
    const [, z] = resolveCollisions(5, 0.2, 0.3, wall);
    expect(z).toBeCloseTo(0.4);
    expect(resolveCollisions(5, 2, 0.3, wall)).toEqual([5, 2]);
  });
});
