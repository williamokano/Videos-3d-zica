import * as THREE from 'three';
import type { InteractiveObject } from '../world/build';
import { buildBody } from './body';
import { EXPRESSIONS, blink, locomotionPose, resolveFace } from './motion';
import type { CharacterDef, CharacterRig } from './types';

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
}

/** Meters covered by one walk cycle of a 1.7 m character. */
const STRIDE = 1.5;

/**
 * Put a character in the scene as an interactive object. Its channels are x, y, z, yaw, `stride` (walk cycles
 * covered), `gait` (0 stands, 1 walks, 2 runs), `talk` (mouth held open by speech) and one `expr.<name>` weight
 * per expression. `rig` replaces the built-in body, e.g. by a loaded GLB.
 */
export function buildCharacter(member: CastMember, def: CharacterDef, rig: CharacterRig = buildBody(def)): InteractiveObject {
  const id = member.id ?? member.character;
  const object = new THREE.Group();
  object.name = id;
  object.add(rig.object);
  const names = Object.keys(EXPRESSIONS);
  const state: Record<string, number> = {
    x: member.at[0], y: member.elevation ?? 0, z: member.at[1], yaw: member.yaw ?? 0,
    stride: 0, gait: 0, talk: 0,
    ...Object.fromEntries(names.map((n) => [`expr.${n}`, 0])),
  };
  // Each character blinks at its own moments.
  const seed = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

  const tick = (t: number): void => {
    object.position.set(state.x, state.y, state.z);
    object.rotation.y = THREE.MathUtils.degToRad(state.yaw);
    rig.applyPose(locomotionPose(t, state.gait, state.stride));
    const expressions = Object.fromEntries(names.map((n) => [n, state[`expr.${n}`]]));
    const closed = blink(t, seed);
    rig.setFace(resolveFace(expressions, closed, state.talk), { blink: closed, talk: state.talk, expressions });
  };
  tick(0);

  return {
    id,
    kind: 'character',
    channels: { ...state },
    traits: { strideLength: (STRIDE * (def.height ?? 1.7)) / 1.7, expressions: names },
    object,
    set: (channel, value) => {
      if (channel in state) state[channel] = value;
    },
    position: () => [state.x, state.y, state.z],
    tick,
  };
}
