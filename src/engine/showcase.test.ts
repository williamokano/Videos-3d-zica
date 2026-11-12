import { describe, expect, it } from 'vitest';
import './actions/character';
import { BEHAVIOURS } from './actions/ambient';
import { compileActions, gazeAt, headAngles } from './actions/catalog';
import './assets';
import { buildCharacter } from './character/cast';
import { SHOWCASE_BEHAVIOURS, SHOWCASE_POSES, SHOWCASE_YAW, STOOL, phoneOf, poseChannels, showcaseLayout, stageTrack, type StageEntry } from './character/showcase';
import type { CharacterDef } from './character/types';
import { applyStage } from './timeline/stage';
import { buildProp } from './world/build';

const def: CharacterDef = { id: 'ana', name: 'Ana' };
const character = (id: string, at: [number, number] = [0, 0]) => buildCharacter({ id, character: 'ana', at, yaw: SHOWCASE_YAW }, def);

describe('showcase layout', () => {
  it('centers the rows on the origin without overlap', () => {
    for (const count of [1, 5, 8, 9, 10, 16, 21]) {
      const places = showcaseLayout(count);
      expect(places).toHaveLength(count);
      const front = places.slice(0, 8).map((p) => p[0]);
      expect(Math.min(...front) + Math.max(...front)).toBeCloseTo(0);
      const depths = places.map((p) => p[1]);
      expect(Math.min(...depths) + Math.max(...depths)).toBeCloseTo(0);
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) expect(Math.hypot(places[i][0] - places[j][0], places[i][1] - places[j][1])).toBeGreaterThan(1);
      }
    }
  });

  it('never puts somebody right behind somebody else of the next row', () => {
    for (const count of [9, 10, 11, 16, 24]) {
      const places = showcaseLayout(count);
      for (let i = 8; i < count; i++) {
        for (let j = Math.floor(i / 8) * 8 - 8; j < Math.floor(i / 8) * 8; j++) expect(Math.abs(places[i][0] - places[j][0]), `${count}: ${i} atrás de ${j}`).toBeGreaterThan(0.5);
      }
    }
  });

  it('puts the first row in front', () => {
    const places = showcaseLayout(10);
    expect(places[0][1]).toBeGreaterThan(places[9][1]);
  });
});

describe('showcase poses', () => {
  const ana = character('ana');

  it('only write channels a character has, with finite values, the same for the same time', () => {
    for (const pose of Object.keys(SHOWCASE_POSES)) {
      const channels = poseChannels(pose, 2.37, ana.traits, 5);
      for (const [channel, value] of Object.entries(channels)) {
        expect(ana.channels, `${pose}: ${channel}`).toHaveProperty([channel]);
        expect(Number.isFinite(value), `${pose}: ${channel}`).toBe(true);
      }
      expect(poseChannels(pose, 2.37, ana.traits, 5)).toEqual(channels);
      const ambient = SHOWCASE_POSES[pose].ambient?.(2.37, 5);
      if (ambient) expect(Object.values(ambient).filter((v) => typeof v === 'number').every(Number.isFinite)).toBe(true);
    }
  });

  it('go back to rest when the pose changes', () => {
    expect(poseChannels('idle', 3, ana.traits)).toMatchObject({ sit: 0, y: 0, crouch: 0, gait: 0, reachR: 0 });
    expect(poseChannels('nope', 3, ana.traits)).toEqual(poseChannels('idle', 3, ana.traits));
  });

  it('walk and run in place, keeping the feet moving with the time', () => {
    const [a, b] = [poseChannels('walk', 1, ana.traits), poseChannels('walk', 2, ana.traits)];
    expect(a.gait).toBe(1);
    expect(b.stride).toBeGreaterThan(a.stride);
    expect(poseChannels('run', 1, ana.traits).gait).toBe(2);
  });

  it('sit on the stool', () => {
    expect(poseChannels('sit', 0, ana.traits)).toMatchObject({ sit: 1, seat: STOOL, y: STOOL });
  });

  it('talk with a mouth that moves', () => {
    const mouths = Array.from({ length: 40 }, (_, i) => poseChannels('talk', i / 10, ana.traits, 3).talk);
    expect(Math.max(...mouths) - Math.min(...mouths)).toBeGreaterThan(0.3);
  });
});

describe('showcase stage', () => {
  const entries = (behaviour: string, pose = 'idle'): StageEntry[] => [
    { id: 'a', at: [-0.55, 0], pose, behaviour },
    { id: 'b', at: [0.55, 0], pose, behaviour },
  ];
  const cast = () => [character('a', [-0.55, 0]), character('b', [0.55, 0])];

  it('compiles every behaviour without a location', () => {
    expect(SHOWCASE_BEHAVIOURS).toEqual(Object.keys(BEHAVIOURS).filter((m) => m !== 'none'));
    for (const mode of SHOWCASE_BEHAVIOURS) {
      const track = stageTrack(entries(mode));
      const compiled = compileActions(track.clips, cast());
      expect(compiled.behaviours.map((b) => b.mode), mode).toEqual([mode, mode]);
      const gaze = gazeAt(compiled, 'a', 7.3);
      expect(Number.isFinite(gaze.yaw) && Number.isFinite(gaze.pitch), mode).toBe(true);
    }
  });

  it('leaves characters alone without a behaviour', () => {
    expect(stageTrack(entries('none')).clips).toEqual([]);
  });

  it('pays attention to the chosen character, or to a neighbour', () => {
    expect(stageTrack(entries('attend')).clips.map((c) => c.params?.object)).toEqual(['b', 'a']);
    expect(stageTrack(entries('attend'), 'b').clips.map((c) => c.params?.object)).toEqual(['b', 'a']);
    expect(stageTrack([entries('attend')[0]]).clips[0].params).toEqual({ mode: 'idle' });
  });

  it('puts a phone in the raised hand', () => {
    const track = stageTrack(entries('none', 'phone'));
    expect(track.phones).toEqual([phoneOf('a'), phoneOf('b')]);
    const people = cast();
    const phones = track.phones.map((id) => buildProp({ id, asset: 'item.phone', pickable: true, pos: [0, 0] }));
    const all = [...people, ...phones];
    const compiled = compileActions(track.clips, all, {}, { links: track.links });
    for (const [channel, value] of Object.entries(poseChannels('phone', 1, people[0].traits))) people[0].set(channel, value);
    applyStage(compiled, new Map(all.map((o) => [o.id, o])), 1);
    const phone = phones[0].object.position;
    // In front of the face: at head height, ahead of the body (which faces +z).
    expect(phone.y).toBeGreaterThan(1.2);
    expect(phone.z).toBeGreaterThan(0.2);
    expect(Math.abs(phone.x - -0.55)).toBeLessThan(0.3);
  });
});

describe('head angles', () => {
  const eye: [number, number, number] = [0, 1.6, 0];

  it('is zero for a point straight ahead', () => {
    expect(headAngles(eye, 180, [0, 1.6, 5])).toEqual({ yaw: 0, pitch: 0 });
    expect(headAngles(eye, 0, [0, 1.6, -5]).yaw).toBeCloseTo(0);
  });

  it('turns left for a point to the left and up for a point above', () => {
    // Facing +z, the character's left is +x.
    expect(headAngles(eye, 180, [3, 1.6, 3]).yaw).toBeCloseTo(45);
    expect(headAngles(eye, 180, [0, 4.6, 3]).pitch).toBeCloseTo(40);
  });

  it('stops where the neck stops', () => {
    expect(headAngles(eye, 180, [1, 1.6, -5]).yaw).toBe(75);
    expect(headAngles(eye, 180, [0, 30, 1]).pitch).toBe(40);
  });
});
