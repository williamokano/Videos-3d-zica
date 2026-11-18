import { describe, expect, it } from 'vitest';
import { channelAt, evaluateLinks } from './actions/catalog';
import type { CharacterDef } from './character/types';
import { SLING_RATE, motionSeed, MOVES, idlePose, walkPose } from './character/motion';
import { direct, resolveScript, type Director } from './timeline/direct';
import { finalTime } from './timeline/episode';
import { buildCast, compileEpisode } from './timeline/stage';
import { buildLocation } from './world/build';
// @ts-expect-error: a plain JS module shared with the scripts.
import { finalOf, frameList } from '../../scripts/tempo.mjs';

/** The actions and moves of the fight in DAVI ep. 4: armour, sling, stone, fall, sword, slow motion. */
describe('the fight', () => {
  const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 60 }, rooms: [{ id: 'r', name: 'r', origin: [-10, -20], size: [20, 30], floorColor: '#ccc', outdoor: true }] });
  const defs: CharacterDef[] = [
    { id: 'davi', name: 'Davi', wear: ['tunic', 'shepherdBag', { id: 'bronzeHelmet', hidden: true, size: 1.2 }] },
    { id: 'saul', name: 'Saul', height: 1.95 },
    { id: 'golias', name: 'Golias', height: 3.1, wear: ['tunic', 'scabbard', { id: 'scabbardEmpty', hidden: true }, { id: 'foreheadStone', hidden: true }] },
  ];
  const play = (props: object[], script: (d: Director) => void) => {
    const episode = resolveScript(direct({
      episode: 1, title: 't', location: 't',
      cast: [{ character: 'davi', at: [0, 0], yaw: 0 }, { character: 'saul', at: [0, 0.6], yaw: 0 }, { character: 'golias', at: [0, -10], yaw: 180 }],
      props: props as never,
    }, (d) => {
      d.camera.cut({ pos: [8, 3, -6], lookAt: [0, 1, -6] });
      script(d);
    }), location, defs);
    return { episode, compiled: compileEpisode(episode, location, buildCast(episode, defs)) };
  };

  it('walking heavy keeps the steps shorter and the arms out; staggering bends the knees', () => {
    const walking = walkPose(0.25);
    const heavy = MOVES.lumber(walking, 1, 0);
    expect(Math.abs(heavy.joints.thighL![0])).toBeLessThan(Math.abs(walking.joints.thighL![0]));
    expect(heavy.joints.upperArmR![2]).toBeGreaterThan(walking.joints.upperArmR![2]);
    const reeling = MOVES.stagger(idlePose(0), 1, 0.7);
    expect(reeling.lift).toBeLessThan(-0.01);
    expect(reeling.joints.head![0]).toBeLessThan(-10);
  });

  it('a helmet goes on someone, and comes off over the head into the hand', () => {
    const { compiled } = play([{ id: 'capacete', asset: 'arms.helmet', pos: [0, 0], pocketOf: 'saul' }], (d) => {
      d.actor('saul').pickUp('capacete');
      d.do('capacete', 'don', { on: 'davi', wear: 'bronzeHelmet' });
      d.do('capacete', 'doff', { wear: 'bronzeHelmet' });
    });
    const [don, doff] = ['don', 'doff'].map((a) => compiled.clips.find((c) => c.action === a)!);
    expect(channelAt(compiled, 'davi', 'wear.bronzeHelmet', don.t + don.duration)).toBe(1);
    expect(evaluateLinks(compiled, don.t + don.duration).find((l) => l.target === 'capacete')).toMatchObject({ to: 'davi', socket: 'pocket' });
    // Mid-way the hands are up over the head.
    expect(channelAt(compiled, 'davi', 'reachR.y', doff.t + doff.duration * 0.6)).toBeGreaterThan(1.9);
    const end = doff.t + doff.duration;
    expect(channelAt(compiled, 'davi', 'wear.bronzeHelmet', end)).toBe(0);
    expect(evaluateLinks(compiled, end).find((l) => l.target === 'capacete')).toMatchObject({ to: 'davi', socket: 'handR' });
    expect(channelAt(compiled, 'davi', 'carryR', end)).toBeCloseTo(1);
  });

  it('what is put on shows on the body only when the hand gets there, never in the hand and on the body at once', () => {
    // The last thing done with the piece: nothing after it to hide a value read at the wrong time (DAVI ep. 5).
    const { compiled } = play([{ id: 'capacete', asset: 'arms.helmet', pos: [0, 0], pocketOf: 'saul' }, { id: 'funda', asset: 'arms.sling', pos: [0, 0], pocketOf: 'davi' }, { id: 'pedra', asset: 'arms.stone', pos: [0, 0], pocketOf: 'davi' }], (d) => {
      d.actor('saul').pickUp('capacete');
      d.do('capacete', 'don', { on: 'davi', wear: 'bronzeHelmet' });
      d.actor('davi').pickUp('funda', { hand: 'right', bag: true });
      d.actor('davi').pickUp('pedra', { hand: 'left', bag: true });
      d.do('funda', 'load', { with: 'pedra' });
    });
    const don = compiled.clips.find((c) => c.action === 'don')!;
    for (const u of [0.05, 0.3, 0.6]) {
      expect(channelAt(compiled, 'davi', 'wear.bronzeHelmet', don.t + don.duration * u), `aos ${u}`).toBe(0);
      expect(evaluateLinks(compiled, don.t + don.duration * u).find((l) => l.target === 'capacete')).toMatchObject({ to: 'saul' });
    }
    expect(channelAt(compiled, 'davi', 'wear.bronzeHelmet', don.t + don.duration)).toBe(1);
    const load = compiled.clips.find((c) => c.action === 'load')!;
    expect(channelAt(compiled, 'funda', 'loaded', load.t + load.duration * 0.1)).toBe(0);
    expect(channelAt(compiled, 'funda', 'loaded', load.t + load.duration)).toBe(1);
  });

  it('stones go in the bag; one goes in the sling, which spins over the head in step with the hand', () => {
    const { compiled } = play([
      { id: 'funda', asset: 'arms.sling', pos: [0, 0], pocketOf: 'davi' },
      { id: 'pedra', asset: 'arms.stone', pos: [0, 0], pocketOf: 'davi' },
    ], (d) => {
      const davi = d.actor('davi');
      davi.pickUp('funda', { hand: 'right', bag: true });
      davi.pickUp('pedra', { hand: 'left', bag: true });
      d.do('funda', 'load', { with: 'pedra' });
      d.do('funda', 'whirl', {}, { duration: 2, ease: 'linear' });
      d.do('pedra', 'throw', { hit: 'golias', with: 'funda', stick: true }, { ease: 'linear' });
    });
    const bag = compiled.clips.find((c) => c.action === 'pickUp' && c.target === 'pedra')!;
    // The hand goes to the left hip, where the bag is.
    expect(channelAt(compiled, 'davi', 'reachL.x', bag.t + bag.duration / 2)).toBeLessThan(-0.15);
    const load = compiled.clips.find((c) => c.action === 'load')!;
    expect(channelAt(compiled, 'funda', 'loaded', load.t + load.duration)).toBe(1);
    expect(evaluateLinks(compiled, load.t + load.duration).find((l) => l.target === 'pedra')?.socket).toBe('pocket');
    const whirl = compiled.clips.find((c) => c.action === 'whirl')!;
    const t = whirl.t + 1.3;
    expect(channelAt(compiled, 'funda', 'overhead', t)).toBe(1);
    expect(channelAt(compiled, 'funda', 'spin', t)).toBeCloseTo(SLING_RATE * (t + motionSeed('davi')), 3);
    expect(channelAt(compiled, 'davi', 'move.sling', t)).toBeCloseTo(1);
    const throwing = compiled.clips.find((c) => c.action === 'throw')!;
    const end = throwing.t + throwing.duration;
    // The trail shows in flight; after the stone goes, the sling hangs again with no stone in it.
    expect(channelAt(compiled, 'pedra', 'trail', throwing.t + throwing.duration * 0.8)).toBeGreaterThan(0.5);
    expect(channelAt(compiled, 'funda', 'overhead', end)).toBe(0);
    expect(channelAt(compiled, 'funda', 'loaded', end)).toBe(0);
    expect(Number.isInteger(channelAt(compiled, 'funda', 'spin', end))).toBe(true);
    // Stuck: it ends with the one it hit, out of sight.
    expect(evaluateLinks(compiled, end + 0.01).find((l) => l.target === 'pedra')).toMatchObject({ to: 'golias', socket: 'pocket' });
  });

  it('the sword comes out of the sheath of the one lying down, into the hand, and up', () => {
    const { compiled } = play([{ id: 'espada', asset: 'arms.sword', pos: [0, 0], pocketOf: 'davi', params: { length: 0.95 } }], (d) => {
      d.do('golias', 'fall', {}, { ease: 'linear' });
      const lying = d.where('golias');
      d.actor('davi').walkTo([lying[0] + 0.95, lying[2] + 0.4]);
      d.actor('davi').turnTo([lying[0], lying[2]]);
      d.do('espada', 'draw', { by: 'davi', from: 'golias' });
    });
    const draw = compiled.clips.find((c) => c.action === 'draw')!;
    const end = draw.t + draw.duration;
    expect([channelAt(compiled, 'golias', 'wear.scabbard', end), channelAt(compiled, 'golias', 'wear.scabbardEmpty', end)]).toEqual([0, 1]);
    expect(evaluateLinks(compiled, end).find((l) => l.target === 'espada')).toMatchObject({ to: 'davi', socket: 'handR' });
    expect(channelAt(compiled, 'davi', 'reachR.y', end)).toBeGreaterThan(1.8);
    // Bent down for the hilt on the way.
    expect(channelAt(compiled, 'davi', 'crouch', draw.t + draw.duration * 0.32)).toBeGreaterThan(0.2);
  });

  it('slow motion stretches the video, and nobody may speak in it', () => {
    const { episode } = play([], (d) => {
      d.wait(1);
      d.slowMo(1, 2, 4);
      d.wait(2);
    });
    expect(episode.slow).toEqual([[1, 2, 4]]);
    expect(finalTime(episode, 3)).toBeCloseTo(6);
    expect(finalOf(episode)(1.5)).toBeCloseTo(3);
    const frames: number[] = frameList(episode, 30, 0, 90);
    expect(frames.length).toBe(60 + 30 * 4);
    expect(frames[31]).toBeCloseTo(30.25);
    expect(() => play([], (d) => {
      d.slowMo(0, 2, 3);
      d.actor('davi').say('Agora!');
    })).toThrow(/ninguém fala em câmera lenta/);
    expect(() => play([], (d) => d.slowMo(0, 1, 2.5))).toThrow(/inteiro/);
  });
});
