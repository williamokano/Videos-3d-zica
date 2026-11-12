import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import './actions/builtin';
import './actions/character';
import { compileActions, evaluateActions, type ActionClip } from './actions/catalog';
import './assets';
import { buildBody } from './character/body';
import { buildCharacter } from './character/cast';
import { palmNormal, palmToward, reachPose } from './character/ik';
import { HAND_POSES, HAND_POSE_NAMES, RELAXED_HAND, carryPose, idlePose, resolveHand } from './character/motion';
import type { CharacterDef } from './character/types';
import { applyStage } from './timeline/stage';
import { buildProp } from './world/build';

const ana: CharacterDef = { id: 'ana', name: 'Ana' };

describe('hand shapes', () => {
  it('is relaxed without any pose, and mixes poses over that', () => {
    expect(resolveHand({})).toEqual(RELAXED_HAND);
    expect(resolveHand({ fist: 1 })).toEqual(HAND_POSES.fist);
    expect(resolveHand({ fist: 0.5 }).fingers).toBeCloseTo((RELAXED_HAND.fingers + 1) / 2);
    expect(resolveHand({ point: 1 })).toMatchObject({ index: 0, fingers: 1 });
    expect(resolveHand({ nope: 1 })).toEqual(RELAXED_HAND);
  });

  it('taps the thumb while typing, and nothing else', () => {
    const at = (t: number) => resolveHand({ type: 1 }, t);
    const thumbs = Array.from({ length: 60 }, (_, i) => at(i / 30).thumb);
    expect(Math.max(...thumbs) - Math.min(...thumbs)).toBeGreaterThan(0.2);
    expect(at(0.3)).toEqual(at(0.3));
    expect(at(0.3).fingers).toBe(at(1.1).fingers);
    for (const v of thumbs) expect(v >= 0 && v <= 1).toBe(true);
  });
});

describe('wrist', () => {
  it('turns the palm to where it is asked, for either arm', () => {
    const toFace = new THREE.Vector3(0, 0.25, 1).normalize();
    for (const side of ['L', 'R'] as const) {
      for (const point of [[0.05, 1.4, -0.36], [0.08, 1.2, -0.3], [0.3, 1.0, -0.4]]) {
        const x = side === 'R' ? point[0] : -point[0];
        const pose = reachPose(carryPose(idlePose(0), side, 1), side, new THREE.Vector3(x, point[1], point[2]));
        const turned = { lift: pose.lift, joints: { ...pose.joints, [`hand${side}`]: [palmToward(pose, side, toFace), 0, 0] } };
        // Only a turn around the forearm is free, so the palm gets as close as that allows: always much closer than before.
        expect(palmNormal(turned, side).dot(toFace)).toBeGreaterThan(0.4);
        expect(palmNormal(turned, side).dot(toFace)).toBeGreaterThan(palmNormal(pose, side).dot(toFace));
      }
    }
  });
});

describe('hands of the body', () => {
  it('builds both kinds without a browser, with a palm, and takes every pose', () => {
    for (const hands of ['mitten', 'fingers'] as const) {
      const rig = buildBody({ ...ana, hands });
      for (const name of [undefined, ...HAND_POSE_NAMES]) rig.setHands!(resolveHand(name ? { [name]: 1 } : {}), resolveHand(name ? { [name]: 1 } : {}, 0.4));
      rig.applyPose(idlePose(0));
      rig.object.updateMatrixWorld(true);
      const numbers: number[] = [];
      rig.joint('handR')!.traverse((o) => numbers.push(...o.getWorldPosition(new THREE.Vector3()).toArray()));
      expect(numbers.every(Number.isFinite)).toBe(true);
      // The palm is in the hand: a few centimeters past the wrist.
      const wrist = rig.joint('handR')!.getWorldPosition(new THREE.Vector3());
      const far = rig.palm!('R').getWorldPosition(new THREE.Vector3()).distanceTo(wrist);
      expect(far).toBeGreaterThan(0.03);
      expect(far).toBeLessThan(0.09);
    }
  });

  it('has more parts with fingers than as a mitten', () => {
    const count = (hands: 'mitten' | 'fingers'): number => {
      let n = 0;
      buildBody({ ...ana, hands }).joint('handR')!.traverse((o) => {
        if (o instanceof THREE.Mesh) n++;
      });
      return n;
    };
    expect(count('mitten')).toBe(5);
    expect(count('fingers')).toBe(15);
  });
});

function stage(clips: ActionClip[]) {
  const who = buildCharacter({ character: 'ana', at: [0, 0] }, ana);
  const other = buildCharacter({ id: 'beto', character: 'ana', at: [1, -3] }, ana);
  const phone = buildProp({ id: 'celular', asset: 'item.phone', pickable: true, pos: [0, 0] });
  const all = [who, other, phone];
  const compiled = compileActions(clips, all, {}, { links: [{ target: 'celular', to: 'ana', socket: 'pocket', t0: -Infinity, t1: Infinity }] });
  const objects = new Map(all.map((o) => [o.id, o]));
  return { who, phone, compiled, channel: (name: string, t: number) => evaluateActions(compiled, t).ana?.[name] ?? 0, at: (t: number) => applyStage(compiled, objects, t) };
}

describe('holding', () => {
  it('keeps what is held in the palm, and behind a phone raised to be read', () => {
    const s = stage([
      { t: 0, target: 'celular', action: 'pickUp', params: { by: 'ana' } },
      { t: 1, target: 'ana', action: 'raise' },
    ]);
    s.at(2.5);
    const palm = s.who.socket!('handR')!.getWorldPosition(new THREE.Vector3());
    const phone = s.phone.object.getWorldPosition(new THREE.Vector3());
    // The palm is against the back of the phone, at its base, so the thumb stays off what is on the screen.
    expect(Math.abs(palm.y - phone.y)).toBeLessThan(0.03);
    expect(Math.hypot(palm.x - phone.x, palm.z - phone.z)).toBeLessThan(0.04);
    // The character faces -z: the palm is on the far side of the phone from the face.
    expect(palm.z).toBeLessThan(phone.z + 0.02);
    expect(phone.y).toBeGreaterThan(1.2);
  });
});

describe('pointing', () => {
  it('stretches the arm toward the target with the index out, looks at it, and comes back', () => {
    const s = stage([{ t: 1, target: 'ana', action: 'pointAt', params: { object: 'beto' }, duration: 2 }]);
    expect(s.channel('handR.point', 2)).toBe(1);
    expect(s.channel('reachR', 2)).toBe(1);
    s.at(2);
    const shoulder = new THREE.Vector3(0.19, 1.36, 0);
    const palm = s.who.socket!('handR')!.getWorldPosition(new THREE.Vector3());
    const target = new THREE.Vector3(1, s.who.traits.eyeHeight!, -3);
    expect(palm.clone().sub(shoulder).normalize().dot(target.sub(shoulder).normalize())).toBeGreaterThan(0.95);
    expect(s.compiled.gazes[0]).toMatchObject({ target: 'ana', at: 'beto' });
    expect(s.channel('handR.point', 3.5)).toBe(0);
    expect(s.channel('reachR', 3.5)).toBe(0);
  });

  it('uses the hand on the side of the target, or the one asked for', () => {
    const left = stage([{ t: 0, target: 'ana', action: 'pointAt', params: { point: [-2, 1.2, -2] } }]);
    expect(left.channel('reachL', 0.8)).toBe(1);
    expect(left.channel('reachR', 0.8)).toBe(0);
    const asked = stage([{ t: 0, target: 'ana', action: 'pointAt', params: { point: [-2, 1.2, -2], hand: 'right' } }]);
    expect(asked.channel('reachR', 0.8)).toBe(1);
  });

  it('explains what cannot be pointed at', () => {
    expect(() => stage([{ t: 0, target: 'ana', action: 'pointAt', params: { object: 'ana' } }])).toThrow(/si mesmo/);
    expect(() => stage([{ t: 0, target: 'ana', action: 'pointAt', params: {} }])).toThrow(/"object" ou "point"/);
    expect(() => stage([{ t: 0, target: 'ana', action: 'pointAt', params: { point: [0, 1.4, 3] } }])).toThrow(/atrás/);
  });
});

describe('hand poses by name', () => {
  it('holds a pose until another, on one hand or both', () => {
    const s = stage([
      { t: 0, target: 'ana', action: 'hand', params: { pose: 'fist' } },
      { t: 2, target: 'ana', action: 'hand', params: { pose: 'open', hand: 'left' } },
      { t: 4, target: 'ana', action: 'hand', params: { pose: 'relaxed' } },
    ]);
    expect([s.channel('handL.fist', 1), s.channel('handR.fist', 1)]).toEqual([1, 1]);
    expect([s.channel('handL.fist', 3), s.channel('handL.open', 3), s.channel('handR.fist', 3)]).toEqual([0, 1, 1]);
    for (const name of HAND_POSE_NAMES) expect(s.channel(`handL.${name}`, 5) + s.channel(`handR.${name}`, 5)).toBe(0);
  });

  it('lists the poses when asked for one that does not exist', () => {
    expect(() => stage([{ t: 0, target: 'ana', action: 'hand', params: { pose: 'tchau' } }])).toThrow(/relaxed, grip, point, fist, open, hold, type/);
  });
});
