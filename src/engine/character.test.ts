import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import './actions/builtin';
import './actions/character';
import { compileActions, evaluateActions, type ActionClip } from './actions/catalog';
import './assets/building';
import './assets/nature';
import './assets/school';
import { buildBody } from './character/body';
import { buildCharacter } from './character/cast';
import { NO_VISEMES, VISEMES, VISEME_NAMES, blink, locomotionPose, mouthOpenOf, resolveFace, splitGaze, visemeTrack, walkPose } from './character/motion';
import { mapBones, retarget } from './character/retarget';
import { JOINTS, PARENT, type CharacterDef, type Joint } from './character/types';
import { buildLocation } from './world/build';
import { stepBob, evaluateCamera, validateCamera, type CameraKey } from './timeline/camera';
import { buildCast, cameraStage, compileEpisode } from './timeline/stage';
import type { Episode } from './timeline/episode';
import { buildNav, findPath } from './world/nav';
import type { Location } from './world/types';

const ana: CharacterDef = { id: 'ana', name: 'Ana' };

describe('motion', () => {
  it('gives the same pose for the same inputs', () => {
    expect(locomotionPose(3.2, 1, 0.37)).toEqual(locomotionPose(3.2, 1, 0.37));
  });

  it('swings opposite legs and arms, and repeats every cycle', () => {
    const pose = walkPose(0.25);
    expect(pose.joints.thighL![0]).toBeGreaterThan(20);
    expect(pose.joints.thighR![0]).toBeLessThan(-20);
    expect(pose.joints.upperArmL![0]).toBeLessThan(0);
    expect(walkPose(1.25).joints.thighL![0]).toBeCloseTo(pose.joints.thighL![0]);
  });

  it('blinks briefly, at moments set by the seed', () => {
    const samples = Array.from({ length: 2000 }, (_, i) => blink(i / 100, 7));
    const shut = samples.filter((v) => v > 0).length / samples.length;
    expect(Math.max(...samples)).toBeGreaterThan(0.9);
    expect(shut).toBeGreaterThan(0.02);
    expect(shut).toBeLessThan(0.08);
    expect(samples).not.toEqual(Array.from({ length: 2000 }, (_, i) => blink(i / 100, 8)));
  });

  it('mixes expressions over the neutral face', () => {
    expect(resolveFace({}, 0, 0).eyeOpen).toBe(1);
    expect(resolveFace({ happy: 1 }, 0, 0).mouthCurve).toBe(1);
    expect(resolveFace({ happy: 0.5 }, 0, 0).mouthCurve).toBeCloseTo(0.5);
    expect(resolveFace({ happy: 1 }, 1, 0).eyeOpen).toBe(0);
    expect(resolveFace({}, 0, 0.6).mouthOpen).toBe(0.6);
  });

  it('shapes the mouth for speech on top of the expression', () => {
    const smiling = resolveFace({ happy: 1 }, 0, 0);
    const saying = resolveFace({ happy: 1 }, 0, 0, { U: 1 });
    expect(saying.mouthCurve).toBe(smiling.mouthCurve);
    expect(saying.mouthRound).toBe(VISEMES.U.mouthRound);
    expect(saying.mouthWidth).toBeLessThan(smiling.mouthWidth);
    expect(resolveFace({}, 0, 0, { A: 0.5 }).mouthOpen).toBeCloseTo(VISEMES.A.mouthOpen / 2);
    expect(resolveFace({}, 0, 0, { F: 1 }).teeth).toBe(1);
    // No shape at all leaves the face as the expression has it.
    expect(resolveFace({ happy: 1 }, 0, 0, NO_VISEMES)).toEqual(smiling);
  });

  it('puts the eyes where they are told to look', () => {
    expect(resolveFace({}, 0, 0, {}, { x: 0.4, y: -0.2 })).toMatchObject({ gazeX: 0.4, gazeY: -0.2 });
  });

  it('shares a look between the eyes and the head', () => {
    for (const [yaw, pitch] of [[0, 0], [10, -5], [-30, 20], [75, 40], [-75, -40]]) {
      const { head, eyes } = splitGaze(yaw, pitch);
      // The eyes turn by what the head leaves: together they are the look asked for.
      expect(head.yaw + eyes.x * 30).toBeCloseTo(yaw);
      expect(head.pitch + eyes.y * 22).toBeCloseTo(pitch);
      expect(Math.abs(eyes.x)).toBeLessThanOrEqual(0.6 + 1e-9);
      expect(Math.abs(eyes.y)).toBeLessThanOrEqual(12 / 22 + 1e-9);
    }
    // A small look is mostly the eyes' share growing with it; a large one is mostly the head.
    expect(splitGaze(10, 0).eyes.x).toBeGreaterThan(0);
    expect(splitGaze(75, 0).head.yaw).toBe(57);
  });
});

describe('speech', () => {
  const weights = (text: string, u: number) => visemeTrack(text)(u);
  const total = (text: string, u: number) => VISEME_NAMES.reduce((sum, name) => sum + weights(text, u)[name], 0);
  const steps = Array.from({ length: 201 }, (_, i) => i / 200);

  it('gives the same shapes for the same text and moment, closed at both ends', () => {
    expect(weights('Olá, tudo bem?', 0.37)).toEqual(weights('Olá, tudo bem?', 0.37));
    expect(weights('Olá, tudo bem?', 0)).toEqual(NO_VISEMES);
    expect(weights('Olá, tudo bem?', 1)).toEqual(NO_VISEMES);
  });

  it('never opens more than one whole shape at a time', () => {
    for (const u of steps) {
      expect(total('De repente o céu ficou vermelho!', u)).toBeLessThanOrEqual(1 + 1e-9);
      expect(total('De repente o céu ficou vermelho!', u)).toBeGreaterThanOrEqual(0);
    }
  });

  it('follows the letters: each vowel its shape, accents and case aside', () => {
    const strongest = (text: string) => VISEME_NAMES.filter((name) => steps.some((u) => weights(text, u)[name] > 0.9));
    expect(strongest('aaa')).toEqual(['A']);
    expect(strongest('ÉÍ')).toEqual(['E']);
    expect(strongest('ó')).toEqual(['O']);
    expect(strongest('uuu')).toEqual(['U']);
    expect(strongest('fff')).toEqual(['F']);
    expect(strongest('vovô')).toEqual(['O', 'F']);
  });

  it('closes the mouth for m, b and p and for a pause', () => {
    expect(steps.every((u) => total('mmm bbb ppp', u) === 0)).toBe(true);
    // Between the two words the mouth shuts.
    expect(Math.min(...steps.slice(60, 140).map((u) => total('aaaa. aaaa', u)))).toBeLessThan(0.05);
    expect(Math.max(...steps.map((u) => total('aaaa. aaaa', u)))).toBeGreaterThan(0.95);
  });

  it('opens the mouth by what the shapes open', () => {
    expect(mouthOpenOf(NO_VISEMES)).toBe(0);
    expect(mouthOpenOf({ A: 1 })).toBe(VISEMES.A.mouthOpen);
    expect(mouthOpenOf({ A: 0.5, U: 0.5 })).toBeCloseTo((VISEMES.A.mouthOpen + VISEMES.U.mouthOpen) / 2);
  });

  it('is what the action "say" writes, ending with the mouth closed', () => {
    const who = buildCharacter({ character: 'ana', at: [0, 0] }, ana);
    const compiled = compileActions([{ t: 1, target: 'ana', action: 'say', params: { text: 'Uau, você viu o fogo?' } }], [who]);
    const end = 1 + compiled.clips[0].duration;
    const at = (t: number) => evaluateActions(compiled, t).ana;
    const seen = new Set<string>();
    for (let t = 1; t < end; t += 0.02) {
      for (const name of VISEME_NAMES) if (at(t)[`vis.${name}`] > 0.6) seen.add(name);
      expect(at(t).talk).toBeCloseTo(mouthOpenOf(Object.fromEntries(VISEME_NAMES.map((n) => [n, at(t)[`vis.${n}`]]))));
    }
    expect([...seen].sort()).toEqual(['A', 'E', 'F', 'O', 'U']);
    for (const name of VISEME_NAMES) expect(at(end + 0.5)[`vis.${name}`]).toBe(0);
    expect(at(end + 0.5).talk).toBe(0);
  });
});

describe('face', () => {
  it('builds without a browser and takes any face, eyes shut or wide, mouth in every shape', () => {
    const rig = buildBody({ ...ana, eyes: '#3a6ea5' });
    for (const name of [undefined, ...VISEME_NAMES]) {
      for (const eyeOpen of [0, 1, 1.4]) {
        const face = { ...resolveFace({ scared: 0.5 }, 0, 0, name ? { [name]: 1 } : {}, { x: 1, y: -1 }), eyeOpen };
        rig.setFace(face, { blink: 0, talk: 0, expressions: {}, visemes: {} });
      }
    }
    const numbers: number[] = [];
    rig.object.traverse((o) => {
      if (o instanceof THREE.Mesh) numbers.push(...o.geometry.attributes.position.array, ...o.position.toArray());
    });
    expect(numbers.every(Number.isFinite)).toBe(true);
  });
});

describe('body', () => {
  it('stands on the ground at the height asked for, arms out in the T-pose', () => {
    const rig = buildBody({ ...ana, height: 1.3 });
    rig.applyPose({ joints: {}, lift: 0 });
    const box = new THREE.Box3().setFromObject(rig.object);
    expect(box.min.y).toBeCloseTo(0, 1);
    expect(box.max.y).toBeGreaterThan(1.2);
    expect(box.max.y).toBeLessThan(1.5);
    const hand = rig.joint('handL')!.getWorldPosition(new THREE.Vector3());
    expect(hand.x).toBeLessThan(-0.4);
  });

  it('lowers the arms and steps forward when walking', () => {
    const rig = buildBody(ana);
    rig.applyPose(walkPose(0.25));
    rig.object.updateWorldMatrix(true, true);
    const at = (j: Joint) => rig.joint(j)!.getWorldPosition(new THREE.Vector3());
    expect(at('handL').y).toBeLessThan(1.1);
    // The character faces -z: the left foot is ahead, the right one behind.
    expect(at('footL').z).toBeLessThan(-0.15);
    expect(at('footR').z).toBeGreaterThan(0.1);
  });
});

describe('retargeting', () => {
  /** A skeleton like an imported one: other bone names, and bone axes that match nothing. */
  function foreignSkeleton(): THREE.Group {
    const reference = buildBody(ana);
    reference.applyPose({ joints: {}, lift: 0 });
    reference.object.updateWorldMatrix(true, true);
    const names: Record<Joint, string> = {
      hips: 'mixamorig:Hips', spine: 'mixamorig:Spine', chest: 'mixamorig:Spine2', neck: 'mixamorig:Neck', head: 'mixamorig:Head',
      upperArmL: 'mixamorig:LeftArm', forearmL: 'mixamorig:LeftForeArm', handL: 'mixamorig:LeftHand',
      upperArmR: 'mixamorig:RightArm', forearmR: 'mixamorig:RightForeArm', handR: 'mixamorig:RightHand',
      thighL: 'mixamorig:LeftUpLeg', shinL: 'mixamorig:LeftLeg', footL: 'mixamorig:LeftFoot',
      thighR: 'mixamorig:RightUpLeg', shinR: 'mixamorig:RightLeg', footR: 'mixamorig:RightFoot',
    };
    const root = new THREE.Group();
    const bones = {} as Record<Joint, THREE.Bone>;
    JOINTS.forEach((j, i) => {
      const bone = new THREE.Bone();
      bone.name = names[j];
      bones[j] = bone;
      const parent = PARENT[j] ? bones[PARENT[j]!] : root;
      parent.add(bone);
      // Same place as the standard joint, but with arbitrary axes.
      parent.updateWorldMatrix(true, false);
      bone.position.copy(parent.worldToLocal(reference.joint(j)!.getWorldPosition(new THREE.Vector3())));
      bone.quaternion.setFromEuler(new THREE.Euler(i * 0.7, i * 1.3 + 0.4, i * 0.5 - 1));
    });
    return root;
  }

  it('finds bones by their common names', () => {
    const bones = mapBones(foreignSkeleton());
    expect(JOINTS.filter((j) => !bones[j])).toEqual([]);
    expect(bones.forearmL!.name).toBe('mixamorig:LeftForeArm');
    expect(() => mapBones(foreignSkeleton(), { head: 'Cabeca' })).toThrow(/Osso "Cabeca"/);
  });

  it('puts every joint of a foreign skeleton where the built-in body has it', () => {
    const model = foreignSkeleton();
    const driven = retarget(model, mapBones(model));
    const reference = buildBody(ana);
    const pose = locomotionPose(1.3, 2, 0.31);
    driven.applyPose(pose);
    reference.applyPose(pose);
    model.updateWorldMatrix(true, true);
    reference.object.updateWorldMatrix(true, true);
    for (const j of JOINTS) {
      const got = driven.joint(j)!.getWorldPosition(new THREE.Vector3());
      const want = reference.joint(j)!.getWorldPosition(new THREE.Vector3());
      expect(got.distanceTo(want), j).toBeLessThan(1e-4);
    }
  });
});

describe('walking', () => {
  // Two rooms side by side with a door between them, and a wall in the way of the straight line.
  const location: Location = {
    id: 't', name: 't', ground: { color: '#fff', size: 60 },
    rooms: [
      { id: 'a', name: 'a', origin: [0, 0], size: [6, 6], floorColor: '#fff', openings: [{ id: 'porta', wall: 'e', type: 'door', at: 5, width: 1, leaf: {} }] },
      { id: 'b', name: 'b', origin: [6, 0], size: [6, 6], floorColor: '#fff' },
    ],
  };
  const built = buildLocation(location);
  const nav = buildNav(built);
  const stage = () => {
    const world = buildLocation(location);
    const walker = buildCharacter({ character: 'ana', at: [1, 1], yaw: 180 }, ana);
    const worldNav = buildNav(world);
    const compile = (clips: ActionClip[]) =>
      compileActions(clips, [...world.interactives, walker], { findPath: (from, to, elevation) => findPath(worldNav, from, to, elevation) });
    return { compile, walker };
  };

  it('goes around the wall and through the door', () => {
    const path = findPath(nav, [1, 0, 1], [11, 1], 0)!;
    expect(path.doors.map((d) => d.id)).toEqual(['porta']);
    // Longer than the straight line, because the door is at the far end of the wall.
    expect(path.length).toBeGreaterThan(Math.hypot(10, 0) + 2);
    expect(path.points.some(([x, , z]) => Math.abs(x - 6) < 0.1 && Math.abs(z - 5) < 0.4)).toBe(true);
    expect(path.points.at(-1)).toEqual([11, 0, 1]);
  });

  it('finds no way into a place with no door', () => {
    const sealed: Location = { ...location, rooms: [{ ...location.rooms[0], openings: [] }, location.rooms[1]] };
    expect(findPath(buildNav(buildLocation(sealed)), [1, 0, 1], [11, 1], 0)).toBeNull();
  });

  it('refuses to walk through a door that is still closed', () => {
    const { compile } = stage();
    const walk: ActionClip = { t: 2, target: 'ana', action: 'walkTo', params: { to: [11, 1] } };
    expect(() => compile([walk])).toThrow(/a porta "porta" está fechada quando o personagem chega nela/);
    expect(() => compile([walk, { t: 3, duration: 1, target: 'porta', action: 'open' }])).not.toThrow();
    // Opening too late is caught as well.
    expect(() => compile([walk, { t: 9, duration: 1, target: 'porta', action: 'open' }])).toThrow(/está fechada/);
  });

  it('moves the character along the way, facing where it goes, with the feet keeping up', () => {
    const { compile } = stage();
    const compiled = compile([
      { t: 0, duration: 0, target: 'porta', action: 'open' },
      { t: 1, target: 'ana', action: 'walkTo', ease: 'linear', params: { to: [11, 1] } },
    ]);
    const walk = compiled.clips.find((c) => c.action === 'walkTo')!;
    expect(walk.duration).toBeGreaterThan(8);
    const mid = evaluateActions(compiled, 1 + walk.duration * 0.25).ana;
    expect(mid.gait).toBe(1);
    // Heading south-east toward the door: between south (180) and east (270).
    expect(mid.yaw).toBeGreaterThan(180);
    expect(mid.yaw).toBeLessThan(270);
    const end = evaluateActions(compiled, 99).ana;
    expect([end.x, end.z, end.gait]).toEqual([11, 1, 0]);
    expect(end.stride).toBeCloseTo((walk.duration * 1.4) / 1.5, 1);
  });

  it('takes the stairs down to the basement of the school', () => {
    const escola = JSON.parse(readFileSync('series/ceu-vermelho/world/escola.json', 'utf8')) as Location;
    const path = findPath(buildNav(buildLocation(escola)), [12, 0, 1.5], [12, -2], -3)!;
    expect(path).not.toBeNull();
    expect(path.doors[0].id).toBe('porta-escadaria');
    expect(path.points.at(-1)![1]).toBeCloseTo(-3);
    // No jumps: height changes a little at a time.
    for (let i = 1; i < path.points.length; i++) expect(Math.abs(path.points[i][1] - path.points[i - 1][1])).toBeLessThan(0.25);
  });
});

describe('characters in an episode', () => {
  it('answer to expression and turning actions', () => {
    const walker = buildCharacter({ character: 'ana', at: [0, 0] }, ana);
    const compiled = compileActions(
      [
        { t: 0, duration: 1, target: 'ana', action: 'express', params: { expression: 'happy' } },
        { t: 2, duration: 1, target: 'ana', action: 'express', params: { expression: 'scared', amount: 0.5 } },
        { t: 0, duration: 1, target: 'ana', action: 'turnTo', params: { to: [-5, 0] } },
      ],
      [walker],
    );
    expect(evaluateActions(compiled, 1).ana).toMatchObject({ 'expr.happy': 1, yaw: 90 });
    expect(evaluateActions(compiled, 3).ana).toMatchObject({ 'expr.happy': 0, 'expr.scared': 0.5 });
    expect(() => compileActions([{ t: 0, target: 'ana', action: 'express', params: { expression: 'bored' } }], [walker])).toThrow(/expressão desconhecida/);
  });
});

describe('camera attached to a character', () => {
  // Two rooms side by side, joined by a door; Ana starts in the west one facing north.
  const location: Location = {
    id: 'teste', name: 'Teste', ground: { color: '#fff', size: 60 },
    rooms: [
      { id: 'a', name: 'A', origin: [0, 0], size: [6, 6], floorColor: '#fff', openings: [{ id: 'porta', wall: 'e', type: 'door', at: 5, width: 1, leaf: {} }] },
      { id: 'b', name: 'B', origin: [6, 0], size: [6, 6], floorColor: '#fff' },
    ],
  };
  const episode = (camera: CameraKey[], actions: ActionClip[] = [], at: [number, number] = [3, 3]): Episode => ({
    episode: 1, title: 't', location: 'teste', duration: 20, camera, actions, cast: [{ character: 'ana', at }],
  });
  const stageOf = (ep: Episode) => {
    const built = buildLocation(location);
    const cast = buildCast(ep, [ana]);
    return { cast, stage: cameraStage(compileEpisode(ep, built, cast), built, cast) };
  };

  it('fpv sits in the eyes and looks where the character faces', () => {
    const ep = episode([{ t: 0, mode: 'fpv', follow: 'ana' }], [{ t: 1, duration: 1, target: 'ana', action: 'turnTo', params: { yaw: 90 } }]);
    const { cast, stage } = stageOf(ep);
    const before = evaluateCamera(ep.camera, 0.5, stage);
    expect(before).toMatchObject({ mode: 'fpv', follow: 'ana', fov: 70 });
    expect(before.pos[0]).toBe(3);
    expect(before.pos[1]).toBeCloseTo(cast[0].traits.eyeHeight!);
    expect(before.pos[1]).toBeGreaterThan(1.5);
    // It aims at a point 6 m ahead.
    expect(before.lookAt[2]).toBeCloseTo(-3);
    // After turning west, it looks along -x.
    const after = evaluateCamera(ep.camera, 5, stage);
    expect(after.lookAt[0]).toBeCloseTo(-3);
    expect(after.lookAt[2]).toBeCloseTo(3);
  });

  it('fpv bobs with the steps while walking, and keeps its aim', () => {
    const ep = episode([{ t: 0, mode: 'fpv', follow: 'ana' }], [{ t: 1, target: 'ana', action: 'walkTo', ease: 'linear', params: { to: [3, 1.5] } }], [3, 3.5]);
    const { cast, stage } = stageOf(ep);
    const heights: number[] = [];
    for (let t = 1.6; t < 2.6; t += 0.05) heights.push(evaluateCamera(ep.camera, t, stage).pos[1] - cast[0].traits.eyeHeight!);
    const range = Math.max(...heights) - Math.min(...heights);
    expect(range).toBeGreaterThan(0.015);
    expect(range).toBeLessThan(0.03);
    // Standing still, no bob.
    expect(evaluateCamera(ep.camera, 0.5, stage).pos[1]).toBeCloseTo(cast[0].traits.eyeHeight!);
    expect(stepBob({ strides: 0.3, gait: 0 })).toEqual([0, 0]);
  });

  it('third person stays behind and above, and follows the walk', () => {
    const ep = episode(
      [{ t: 0, mode: 'third_person', follow: 'ana', distance: 2 }],
      [{ t: 1, target: 'ana', action: 'walkTo', ease: 'linear', params: { to: [3, 1.5] } }],
      [3, 3.5],
    );
    const { stage } = stageOf(ep);
    const start = evaluateCamera(ep.camera, 0, stage);
    // Facing north (-z), so behind is +z.
    expect(start.pos[0]).toBeCloseTo(3);
    expect(start.pos[2]).toBeCloseTo(5.5);
    expect(start.pos[1]).toBeGreaterThan(1.9);
    const end = evaluateCamera(ep.camera, 10, stage);
    expect(end.pos[2]).toBeCloseTo(3.5);
    expect(evaluateCamera(ep.camera, 1.7, stage)).toEqual(evaluateCamera(ep.camera, 1.7, stage));
  });

  it('third person comes closer instead of going through a wall', () => {
    // 0.8 m from the south wall, back to it.
    const ep = episode([{ t: 0, mode: 'third_person', follow: 'ana', distance: 3 }], [], [3, 5.2]);
    const { stage } = stageOf(ep);
    const pose = evaluateCamera(ep.camera, 0, stage);
    expect(pose.pos[2]).toBeLessThan(5.9);
    expect(pose.pos[2]).toBeGreaterThan(5.3);
  });

  it('keeps cinematic shots as they were and switches mode only at cuts', () => {
    const ep = episode([
      { t: 0, pos: [0, 2, 0], lookAt: [3, 1, 3] },
      { t: 2, pos: [2, 2, 0], lookAt: [3, 1, 3] },
      { t: 2, cut: true, mode: 'fpv', follow: 'ana', fov: 60 },
      { t: 4, fov: 80 },
      { t: 4, cut: true, pos: [1, 1, 1], lookAt: [3, 1, 3] },
    ]);
    const { cast, stage } = stageOf(ep);
    expect(() => validateCamera(ep.camera, cast.map((c) => c.id))).not.toThrow();
    expect(evaluateCamera(ep.camera, 1, stage)).toMatchObject({ mode: 'cinematic', pos: [1, 2, 0] });
    expect(evaluateCamera(ep.camera, 3, stage)).toMatchObject({ mode: 'fpv', fov: 70 });
    expect(evaluateCamera(ep.camera, 5, stage)).toMatchObject({ mode: 'cinematic', pos: [1, 1, 1] });
  });

  it('explains what is wrong with a camera track', () => {
    expect(() => validateCamera([{ t: 0, mode: 'fpv' }], ['ana'])).toThrow(/precisa de "follow"/);
    expect(() => validateCamera([{ t: 0, mode: 'fpv', follow: 'bia' }], ['ana'])).toThrow(/"bia" não está no elenco. Elenco: ana/);
    expect(() => validateCamera([{ t: 0, pos: [0, 0, 0] }], [])).toThrow(/precisa de "pos" e "lookAt"/);
    expect(() => validateCamera([{ t: 0, pos: [0, 0, 0], lookAt: [1, 0, 0] }, { t: 1, mode: 'fpv', follow: 'ana' }], ['ana'])).toThrow(/só podem mudar num corte/);
  });

  it('hides the head of the character the camera is in', () => {
    const character = buildCharacter({ character: 'ana', at: [0, 0] }, ana);
    const visibleMeshes = () => {
      let n = 0;
      character.object.traverseVisible((o) => { if (o instanceof THREE.Mesh) n++; });
      return n;
    };
    const all = visibleMeshes();
    character.firstPerson!(true);
    expect(visibleMeshes()).toBeLessThan(all);
    character.firstPerson!(false);
    expect(visibleMeshes()).toBe(all);
  });
});
