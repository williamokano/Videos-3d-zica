import { describe, expect, it } from 'vitest';
import { DEFAULT_ENVIRONMENT, activeRules, resolveEnvironment, type Bible } from './bible';
import { evaluateCamera, type CameraKey } from './timeline/camera';
import { resolveCollisions } from './world/build';
import { subtractRects } from './world/rect';
import { layoutStairs, partHeight } from './world/stairs';
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
  const wall = [{ minX: 0, maxX: 10, minZ: -0.1, maxZ: 0.1, y0: 0, y1: 3 }];

  it('keeps a walker out of a wall and leaves free positions alone', () => {
    const [, z] = resolveCollisions(5, 0.2, 0.3, wall);
    expect(z).toBeCloseTo(0.4);
    expect(resolveCollisions(5, 2, 0.3, wall)).toEqual([5, 2]);
  });

  it('ignores walls on another storey', () => {
    expect(resolveCollisions(5, 0.2, 0.3, wall, -3)).toEqual([5, 0.2]);
    expect(resolveCollisions(5, 0.2, 0.3, wall, 3)).toEqual([5, 0.2]);
  });
});

describe('levels', () => {
  it('only cuts walls for openings on the same floor height', () => {
    const upper: Room = { id: 'u', name: 'u', origin: [0, 0], size: [4, 4], floorColor: '#fff', openings: [{ wall: 'n', type: 'door', at: 2, width: 1 }] };
    const lower: Room = { ...upper, id: 'l', elevation: -3, openings: [] };
    const north = roomWalls(lower, [upper, lower].flatMap(roomOpenings)).filter((p) => p.axis === 'x' && p.center < 1);
    expect(north).toHaveLength(1);
  });

  it('cuts a hole out of a floor', () => {
    const rects = subtractRects({ minX: 0, maxX: 10, minZ: 0, maxZ: 10 }, [{ minX: 2, maxX: 4, minZ: 3, maxZ: 6 }]);
    const area = rects.reduce((sum, r) => sum + (r.maxX - r.minX) * (r.maxZ - r.minZ), 0);
    expect(area).toBeCloseTo(100 - 6);
  });
});

describe('stairs', () => {
  const layout = layoutStairs({
    id: 'u', top: [10, 1], elevation: 0, width: 1, tread: 0.25,
    path: [{ flight: 'e', drop: 1.5 }, { landing: 'uturn', side: 's', depth: 1.2, gap: 0.2 }, { flight: 'w', drop: 1.5 }],
  });

  const round = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 1000) / 1000 : v]));

  it('lays out a U-shaped stair that returns beside the first flight', () => {
    const [down, landing, back] = layout.parts;
    expect(round(down.rect)).toEqual({ minX: 10, maxX: 12, minZ: 0.5, maxZ: 1.5 });
    expect(round(landing.rect)).toEqual({ minX: 12, maxX: 13.2, minZ: 0.5, maxZ: 2.7 });
    expect(round(back.rect)).toEqual({ minX: 10, maxX: 12, minZ: 1.7, maxZ: 2.7 });
    expect([layout.top, landing.yStart, layout.bottom]).toEqual([0, -1.5, -3]);
    expect(round(layout.well)).toEqual({ minX: 10, maxX: 13.2, minZ: 0.5, maxZ: 2.7 });
    expect(round(layout.entry)).toEqual({ axis: 'z', line: 10, from: 0.5, to: 1.5 });
  });

  it('gives the walking height along a flight', () => {
    expect(partHeight(layout.parts[0], 11, 1)).toBeCloseTo(-0.75);
    expect(partHeight(layout.parts[2], 11, 2.2)).toBeCloseTo(-2.25);
  });
});

describe('camera track', () => {
  const keys: CameraKey[] = [
    { t: 0, pos: [0, 0, 0], lookAt: [0, 0, -1] },
    { t: 2, pos: [4, 0, 0], lookAt: [4, 0, -1], fov: 30 },
    { t: 4, pos: [9, 9, 9], lookAt: [0, 0, 0], cut: true },
  ];

  it('passes through keyframes and moves between them', () => {
    expect(evaluateCamera(keys, 0).pos).toEqual([0, 0, 0]);
    expect(evaluateCamera(keys, 1).pos[0]).toBeCloseTo(2);
    expect(evaluateCamera(keys, 1).fov).toBeCloseTo(40);
    expect(evaluateCamera(keys, 2).pos).toEqual([4, 0, 0]);
  });

  it('holds the shot until a cut, then jumps', () => {
    expect(evaluateCamera(keys, 3.9).pos).toEqual([4, 0, 0]);
    expect(evaluateCamera(keys, 4).pos).toEqual([9, 9, 9]);
    expect(evaluateCamera(keys, 99).pos).toEqual([9, 9, 9]);
  });
});
