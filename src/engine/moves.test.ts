import { describe, expect, it } from 'vitest';
import { channelAt, evaluateLinks, placementAt } from './actions/catalog';
import type { CharacterDef } from './character/types';
import { MOVE_NAMES, MOVES, idlePose } from './character/motion';
import { direct, resolveScript } from './timeline/direct';
import { buildCast, compileEpisode } from './timeline/stage';
import { buildLocation } from './world/build';

describe('whole-body moves', () => {
  const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 60 }, rooms: [{ id: 'r', name: 'r', origin: [-10, -20], size: [20, 30], floorColor: '#ccc', outdoor: true }] });
  const defs: CharacterDef[] = [{ id: 'davi', name: 'Davi' }, { id: 'golias', name: 'Golias', height: 3 }];

  it('every move gives a pose at any weight and time', () => {
    for (const name of MOVE_NAMES) for (const w of [0, 0.3, 1]) for (const t of [0, 1.3]) {
      const pose = MOVES[name](idlePose(t), w, t);
      expect(Number.isFinite(pose.lift)).toBe(true);
    }
  });

  it('after a throw the arm can come back down with "move" amount 0, but "move" cannot start a throw', () => {
    const script = (amount: number) => resolveScript(direct({
      episode: 1, title: 't', location: 't',
      cast: [{ character: 'davi', at: [0, 0], yaw: 0 }],
      props: [{ id: 'jarro', asset: 'item.box', pos: [0, 0], pocketOf: 'davi' }],
    }, (d) => {
      d.camera.cut({ pos: [8, 3, -6], lookAt: [0, 1, -6] });
      d.actor('davi').pickUp('jarro');
      d.do('jarro', 'throw', { to: [0, 0.5, -5] }, { ease: 'linear' });
      d.do('davi', 'move', { name: 'throw', amount }, { duration: 0.5 });
    }), location, defs);
    const episode = script(0);
    const compiled = compileEpisode(episode, location, buildCast(episode, defs));
    const thrown = compiled.clips.find((c) => c.action === 'throw')!;
    const lowered = compiled.clips.find((c) => c.action === 'move')!;
    expect(channelAt(compiled, 'davi', 'move.throw', thrown.t + thrown.duration)).toBeCloseTo(1);
    expect(channelAt(compiled, 'davi', 'move.throw', lowered.t + lowered.duration)).toBeCloseTo(0);
    expect(() => {
      const raised = script(1);
      compileEpisode(raised, location, buildCast(raised, defs));
    }).toThrow(/use a ação "throw"/);
  });

  it('a stone thrown at someone leaves the hand, flies and ends at the forehead; the one hit falls forward', () => {
    const episode = resolveScript(direct({
      episode: 1, title: 't', location: 't',
      cast: [{ character: 'davi', at: [0, 0], yaw: 0 }, { character: 'golias', at: [0, -12], yaw: 180 }],
      props: [{ id: 'pedra', asset: 'item.box', pos: [0, 0], pocketOf: 'davi' }],
    }, (d) => {
      d.camera.cut({ pos: [8, 3, -6], lookAt: [0, 1, -6] });
      const davi = d.actor('davi');
      davi.pickUp('pedra');
      d.do('davi', 'move', { name: 'sling' });
      d.wait(1);
      d.do('davi', 'move', { name: 'sling', amount: 0 }, { duration: 0.2 });
      d.do('pedra', 'throw', { hit: 'golias', speed: 10 }, { ease: 'linear' });
      d.do('golias', 'fall', {}, { ease: 'linear' });
    }), location, defs);
    const compiled = compileEpisode(episode, location, buildCast(episode, defs));
    const thrown = compiled.clips.find((c) => c.action === 'throw')!;
    const fell = compiled.clips.find((c) => c.action === 'fall')!;
    // Held before the throw, free after it.
    expect(evaluateLinks(compiled, thrown.t - 0.1).some((l) => l.target === 'pedra')).toBe(true);
    expect(evaluateLinks(compiled, thrown.t + thrown.duration).some((l) => l.target === 'pedra')).toBe(false);
    const end = placementAt(compiled, 'pedra', thrown.t + thrown.duration).pos;
    expect(end[2]).toBeCloseTo(-12 + 0.1 * (3 / 1.7), 0);
    expect(end[1]).toBeGreaterThan(2.5);
    // Golias ends face down, a body length ahead of where he stood, feet where they were.
    expect(channelAt(compiled, 'golias', 'move.fall', fell.t + fell.duration)).toBeCloseTo(1);
    const lying = placementAt(compiled, 'golias', fell.t + fell.duration).pos;
    expect(lying[2]).toBeGreaterThan(-12 + 1.4);
  });

  it('a stone in the pocket flies from the sling in the hand, and the sling is left empty', () => {
    const episode = resolveScript(direct({
      episode: 1, title: 't', location: 't',
      cast: [{ character: 'davi', at: [0, 0], yaw: 0 }, { character: 'golias', at: [0, -10], yaw: 180 }],
      props: [{ id: 'funda', asset: 'arms.sling', pos: [0, 0], pocketOf: 'davi' }, { id: 'pedra', asset: 'arms.stone', pos: [0, 0], pocketOf: 'davi' }],
    }, (d) => {
      d.camera.cut({ pos: [8, 3, -6], lookAt: [0, 1, -6] });
      d.actor('davi').pickUp('funda', { hand: 'right' });
      d.do('funda', 'set', { channel: 'loaded', value: 1 }, { duration: 0 });
      d.do('pedra', 'throw', { hit: 'golias', with: 'funda' }, { ease: 'linear' });
    }), location, defs);
    const compiled = compileEpisode(episode, location, buildCast(episode, defs));
    const thrown = compiled.clips.find((c) => c.action === 'throw')!;
    const end = thrown.t + thrown.duration;
    expect(evaluateLinks(compiled, end).some((l) => l.target === 'pedra')).toBe(false);
    expect(evaluateLinks(compiled, end).some((l) => l.target === 'funda')).toBe(true);
    expect(channelAt(compiled, 'funda', 'loaded', end)).toBe(0);
    expect(placementAt(compiled, 'pedra', end).pos[2]).toBeLessThan(-9);
  });

  it('pouring over a kneeling head takes the hand above it, and the title card takes no time', () => {
    const episode = resolveScript(direct({
      episode: 1, title: 't', location: 't',
      cast: [{ character: 'davi', at: [0, 0], yaw: 0 }, { id: 'samuel', character: 'davi', at: [0, -0.5], yaw: 180 }],
      props: [{ id: 'chifre', asset: 'item.box', pos: [0, 0], pocketOf: 'samuel' }],
    }, (d) => {
      d.camera.cut({ pos: [3, 1.6, 0], lookAt: [0, 1, 0] });
      const card = d.titleCard({ title: 'DAVI', subtitle: 'Uma história', episode: 'Episódio 1' });
      expect(d.now).toBe(card.start);
      d.actor('samuel').pickUp('chifre', { hand: 'right' });
      d.do('davi', 'move', { name: 'kneel' });
      d.do('chifre', 'pour', { over: 'davi' });
    }), location, defs.slice(0, 1));
    const compiled = compileEpisode(episode, location, buildCast(episode, defs.slice(0, 1)));
    const pour = compiled.clips.find((c) => c.action === 'pour')!;
    expect(channelAt(compiled, 'samuel', 'reachR', pour.t + pour.duration / 2)).toBeCloseTo(1);
    const above = channelAt(compiled, 'samuel', 'reachR.y', pour.t + pour.duration / 2);
    expect(above).toBeGreaterThan(1.3);
    expect(above).toBeLessThan(1.8);
    expect(compiled.clips.some((c) => c.action === 'titleCard')).toBe(true);
  });
});
