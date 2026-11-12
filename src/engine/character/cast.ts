import * as THREE from 'three';
import type { Ambient } from '../actions/ambient';
import type { InteractiveObject } from '../world/build';
import { buildBody } from './body';
import { reachPose, wristPosition, type Side } from './ik';
import { EXPRESSIONS, blink, carryPose, crouchPose, locomotionPose, resolveFace, sitPose } from './motion';
import type { CharacterDef, CharacterRig, Joint } from './types';

/** A character placed in an episode. */
export interface CastMember {
  /** Name used by actions. Defaults to the character id. */
  id?: string;
  /** Character file name in series/<series>/characters. */
  character: string;
  /** Where they start: [x, z] in location coordinates. */
  at: [number, number];
  /** Floor height where they start (default 0). */
  elevation?: number;
  /** Heading in degrees: 0 faces north, 90 west. */
  yaw?: number;
  /** Changes to the character file for this cast member, so one file serves many extras: skin, hair, height... */
  look?: Partial<CharacterDef>;
  /** Starts sitting on something this high above the floor (a chair seat is about 0.46), at `at`. `standUp` gets them up. */
  seated?: number;
}

/** Meters covered by one walk cycle of a 1.7 m character. */
const STRIDE = 1.5;

/**
 * Put a character in the scene as an interactive object. Its channels are x, y, z, yaw, `stride` (walk cycles
 * covered), `gait` (0 stands, 1 walks, 2 runs), `talk` (mouth held open by speech), one `expr.<name>` weight
 * per expression, and the body channels: `crouch`, `sit`, `attached` (how much it rides on a seat), and for each
 * hand `carryL` / `carryR` (holding something) and `reachL` / `reachR` with `.x`, `.y`, `.z` (hand going to a point
 * of the location, or of the body itself when `.local` is 1). `look.yaw` and `look.pitch` turn the head from the body, in degrees. `rig` replaces the built-in body, e.g. by a loaded GLB.
 */
export function buildCharacter(member: CastMember, def: CharacterDef, rig: CharacterRig = buildBody(def)): InteractiveObject {
  const id = member.id ?? member.character;
  const object = new THREE.Group();
  object.name = id;
  object.add(rig.object);
  const names = Object.keys(EXPRESSIONS);
  const state: Record<string, number> = {
    x: member.at[0], y: (member.elevation ?? 0) + (member.seated ?? 0), z: member.at[1], yaw: member.yaw ?? 0,
    // `seat` is how far above the floor the seat under the character is.
    stride: 0, gait: 0, talk: 0, gesture: 0, crouch: 0, sit: member.seated ? 1 : 0, seat: member.seated ?? 0, attached: 0, 'look.yaw': 0, 'look.pitch': 0,
    carryL: 0, carryR: 0,
    reachL: 0, 'reachL.x': 0, 'reachL.y': 0, 'reachL.z': 0, 'reachL.local': 0,
    reachR: 0, 'reachR.x': 0, 'reachR.y': 0, 'reachR.z': 0, 'reachR.local': 0,
    ...Object.fromEntries(names.map((n) => [`expr.${n}`, 0])),
  };
  const scale = (def.height ?? 1.7) / 1.7;
  // Each character blinks at its own moments.
  const seed = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

  let ambient: Ambient | undefined;
  const hand = new THREE.Vector3();

  const tick = (t: number): void => {
    object.position.set(state.x, state.y, state.z);
    object.rotation.y = THREE.MathUtils.degToRad(state.yaw);
    object.updateMatrixWorld();
    let pose = sitPose(crouchPose(locomotionPose(t, state.gait, state.stride), state.crouch), state.sit);
    for (const side of ['L', 'R'] as Side[]) {
      pose = carryPose(pose, side, state[`carry${side}`]);
      const reach = state[`reach${side}`];
      if (reach <= 0.001 && state[`carry${side}`] <= 0.001) {
        // A free hand does what the body does by itself: arms crossed, a hand that talks, writing on the board.
        const sign = side === 'R' ? 1 : -1;
        const toward = (x: number, y: number, z: number, weight: number): void => {
          if (weight > 0.001) pose = reachPose(pose, side, wristPosition(pose, side).lerp(hand.set(x, y, z), weight));
        };
        toward(-sign * 0.1, side === 'R' ? 1.15 : 1.1, side === 'R' ? -0.16 : -0.2, ambient?.cross ?? 0);
        const talking = Math.max(ambient?.[`gesture${side}`] ?? 0, side === 'R' ? state.gesture : state.gesture * 0.6);
        toward(sign * 0.21, 1.07 + 0.07 * Math.sin(t * 5.5 + seed + sign), -0.28 + 0.04 * Math.cos(t * 4.1 + seed), talking);
        if (side === 'R') toward(0.1 + 0.16 * Math.sin(t * 1.2 + seed), 1.5 + 0.05 * Math.sin(t * 7.5), -0.44, ambient?.write ?? 0);
      }
      if (reach <= 0.001) continue;
      // The hand leaves from where the pose has it and goes straight to the point.
      // The point is given in the location, or on the character's own body (already in its frame and size).
      const point = new THREE.Vector3(state[`reach${side}.x`], state[`reach${side}.y`], state[`reach${side}.z`]);
      // A place on the body goes down with it when the character sits or crouches.
      const target = state[`reach${side}.local`] > 0.5 ? point.setY(point.y + pose.lift) : object.worldToLocal(point).divideScalar(scale);
      pose = reachPose(pose, side, wristPosition(pose, side).lerp(target, reach));
    }
    // The neck takes part of the turn and the head the rest.
    const [yaw, pitch] = [state['look.yaw'], state['look.pitch']];
    if (yaw || pitch) {
      const turned = (joint: Joint, share: number): [number, number, number] => {
        const [x, y, z] = pose.joints[joint] ?? [0, 0, 0];
        return [x + pitch * share, y + yaw * share, z];
      };
      pose = { lift: pose.lift, joints: { ...pose.joints, neck: turned('neck', 0.4), head: turned('head', 0.6) } };
    }
    if (ambient) {
      const add = (joint: Joint, x: number, z: number): [number, number, number] => {
        const [a, b, c] = pose.joints[joint] ?? [0, 0, 0];
        return [a + x, b, c + z];
      };
      const sway = ambient.sway * 1.6 * (1 - state.sit);
      pose = { lift: pose.lift, joints: { ...pose.joints, hips: add('hips', 0, sway), spine: add('spine', 0, -sway), head: add('head', -9 * ambient.nod, 0) } };
    }
    rig.applyPose(pose);
    const expressions = Object.fromEntries(names.map((n) => [n, Math.max(state[`expr.${n}`], ambient?.expressions[n] ?? 0)]));
    const closed = blink(t, seed);
    const talk = Math.max(state.talk, ambient?.talk ?? 0);
    rig.setFace(resolveFace(expressions, closed, talk), { blink: closed, talk, expressions });
  };
  tick(0);

  return {
    id,
    kind: 'character',
    channels: { ...state },
    traits: { strideLength: STRIDE * scale, bodyScale: scale, eyeHeight: rig.eyeHeight, expressions: names },
    object,
    set: (channel, value) => {
      if (channel in state) state[channel] = value;
    },
    position: () => [state.x, state.y, state.z],
    tick,
    ambient: (values) => {
      ambient = values;
    },
    socket: (name) => rig.joint((name === 'pocket' ? 'thighR' : name) as Joint),
    firstPerson: (on) => {
      if (rig.hideHead) rig.hideHead(on);
      else rig.object.visible = !on;
    },
  };
}
