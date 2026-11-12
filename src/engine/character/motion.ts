import type { FaceParams, Joint, Pose } from './types';
import { JOINTS } from './types';

/** Motions are pure functions: the same inputs always give the same pose, so any frame can be drawn on its own. */

const ARM_DOWN = 78;

/** Standing still, breathing. */
export function idlePose(t: number): Pose {
  const breath = Math.sin((t * Math.PI * 2) / 4);
  return {
    lift: 0,
    joints: {
      chest: [-1.2 * breath, 0, 0],
      head: [0.8 * breath, 0, 0],
      upperArmL: [0, 0, ARM_DOWN - breath],
      upperArmR: [0, 0, -ARM_DOWN + breath],
      forearmL: [0, -10, 0],
      forearmR: [0, 10, 0],
    },
  };
}

/**
 * Walk cycle. `stride` counts cycles (two steps each) and comes from the distance covered, so the feet
 * keep up with the ground. `run` blends from walking (0) to running (1).
 */
export function walkPose(stride: number, run = 0): Pose {
  const mix = (a: number, b: number) => a + (b - a) * run;
  const angle = stride * Math.PI * 2;
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const thigh = mix(26, 42) * s;
  // The knee folds while its leg swings forward.
  const kneeL = 4 + mix(50, 85) * Math.max(0, c);
  const kneeR = 4 + mix(50, 85) * Math.max(0, -c);
  const arm = mix(22, 45) * s;
  const elbow = mix(18, 75);
  const lean = -mix(2, 12);
  return {
    // Lowest when a foot lands, highest in mid-step.
    lift: (mix(0.02, 0.045) * (Math.cos(2 * angle) - 1)) / 2,
    joints: {
      hips: [0, -4 * s, 0],
      spine: [lean, 0, 0],
      chest: [0, 9 * s, 0],
      head: [-lean * 0.6, -5 * s, 0],
      thighL: [thigh, 0, 0],
      thighR: [-thigh, 0, 0],
      shinL: [-kneeL, 0, 0],
      shinR: [-kneeR, 0, 0],
      footL: [-(thigh - kneeL) * 0.6, 0, 0],
      footR: [-(-thigh - kneeR) * 0.6, 0, 0],
      upperArmL: [-arm, 0, ARM_DOWN],
      upperArmR: [arm, 0, -ARM_DOWN],
      forearmL: [0, -(elbow - 8 * s), 0],
      forearmR: [0, elbow + 8 * s, 0],
    },
  };
}

export function blendPose(a: Pose, b: Pose, w: number): Pose {
  const joints: Pose['joints'] = {};
  for (const j of JOINTS as readonly Joint[]) {
    const ja = a.joints[j] ?? [0, 0, 0];
    const jb = b.joints[j] ?? [0, 0, 0];
    joints[j] = [ja[0] + (jb[0] - ja[0]) * w, ja[1] + (jb[1] - ja[1]) * w, ja[2] + (jb[2] - ja[2]) * w];
  }
  return { joints, lift: a.lift + (b.lift - a.lift) * w };
}

/** Body pose from the locomotion channels: gait 0 stands, 1 walks, 2 runs. */
export function locomotionPose(t: number, gait: number, stride: number): Pose {
  if (gait <= 0.001) return idlePose(t);
  return blendPose(idlePose(t), walkPose(stride, Math.max(0, Math.min(1, gait - 1))), Math.min(1, gait));
}

const hash = (a: number, b: number): number => {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** Automatic blinking: 0 open, 1 shut. One blink somewhere in every window of a few seconds, set by the seed. */
export function blink(t: number, seed: number): number {
  const WINDOW = 3.4;
  const LENGTH = 0.16;
  const k = Math.floor(t / WINDOW);
  const start = k * WINDOW + hash(k, seed) * (WINDOW - LENGTH);
  const u = (t - start) / LENGTH;
  return u <= 0 || u >= 1 ? 0 : 1 - Math.abs(u * 2 - 1);
}

export const NEUTRAL_FACE: FaceParams = { eyeOpen: 1, browLift: 0, browTilt: 0, mouthCurve: 0.15, mouthOpen: 0, mouthWidth: 1 };

/** The expression catalog. Check here before adding one. */
export const EXPRESSIONS: Record<string, FaceParams> = {
  happy: { eyeOpen: 0.85, browLift: 0.3, browTilt: 0, mouthCurve: 1, mouthOpen: 0.25, mouthWidth: 1.15 },
  sad: { eyeOpen: 0.8, browLift: 0.1, browTilt: -0.8, mouthCurve: -0.8, mouthOpen: 0, mouthWidth: 0.9 },
  angry: { eyeOpen: 0.8, browLift: -0.5, browTilt: 0.9, mouthCurve: -0.5, mouthOpen: 0, mouthWidth: 0.95 },
  surprised: { eyeOpen: 1.3, browLift: 0.9, browTilt: 0, mouthCurve: 0, mouthOpen: 0.8, mouthWidth: 0.7 },
  scared: { eyeOpen: 1.35, browLift: 0.7, browTilt: -0.6, mouthCurve: -0.4, mouthOpen: 0.5, mouthWidth: 0.85 },
};

/** Face from expression weights, a blink amount and how open speech holds the mouth. */
export function resolveFace(weights: Record<string, number>, blinkAmount: number, talk: number): FaceParams {
  const face = { ...NEUTRAL_FACE };
  for (const [name, w] of Object.entries(weights)) {
    const e = EXPRESSIONS[name];
    if (!e || !w) continue;
    for (const key of Object.keys(face) as (keyof FaceParams)[]) face[key] += (e[key] - NEUTRAL_FACE[key]) * w;
  }
  face.eyeOpen *= 1 - blinkAmount;
  face.mouthOpen = Math.max(face.mouthOpen, talk);
  return face;
}
