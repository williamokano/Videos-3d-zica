import * as THREE from 'three';
import { OFFSETS, type Joint, type Pose } from './types';

/**
 * Arm reach on the standard skeleton. Everything here is in the character's own frame, in meters of the
 * standard 1.7 m body: origin at the feet, facing -z.
 */

const DEG = Math.PI / 180;
const euler = new THREE.Euler();
const turn = (pose: Pose, joint: Joint): THREE.Quaternion => {
  const [x, y, z] = pose.joints[joint] ?? [0, 0, 0];
  return new THREE.Quaternion().setFromEuler(euler.set(x * DEG, y * DEG, z * DEG));
};
const degrees = (q: THREE.Quaternion): [number, number, number] => {
  const e = new THREE.Euler().setFromQuaternion(q);
  return [e.x / DEG, e.y / DEG, e.z / DEG];
};

export type Side = 'L' | 'R';

/** Shoulder position and chest orientation for a pose. */
function shoulder(pose: Pose, side: Side): { at: THREE.Vector3; chest: THREE.Quaternion } {
  const at = new THREE.Vector3(0, pose.lift, 0);
  const q = new THREE.Quaternion();
  for (const joint of ['hips', 'spine', 'chest'] as const) {
    at.add(new THREE.Vector3(...OFFSETS[joint]).applyQuaternion(q));
    q.multiply(turn(pose, joint));
  }
  at.add(new THREE.Vector3(...OFFSETS[`upperArm${side}`]).applyQuaternion(q));
  return { at, chest: q };
}

/** Where the wrist is in a pose. */
export function wristPosition(pose: Pose, side: Side): THREE.Vector3 {
  const { at, chest } = shoulder(pose, side);
  const upper = chest.clone().multiply(turn(pose, `upperArm${side}`));
  const fore = upper.clone().multiply(turn(pose, `forearm${side}`));
  return at
    .add(new THREE.Vector3(...OFFSETS[`forearm${side}`]).applyQuaternion(upper))
    .add(new THREE.Vector3(...OFFSETS[`hand${side}`]).applyQuaternion(fore));
}

/**
 * Two-bone IK: the pose with one arm bent so the wrist is at `target`, or as close as the arm gets.
 * The elbow goes down and a little out and back, like a relaxed arm. When the arm alone is short, the
 * body helps: it leans forward and turns that shoulder toward the point.
 */
export function reachPose(pose: Pose, side: Side, target: THREE.Vector3): Pose {
  const sign = side === 'R' ? 1 : -1;
  const arm = Math.abs(OFFSETS[`forearm${side}`][0]) + Math.abs(OFFSETS[`hand${side}`][0]);
  const short = target.distanceTo(shoulder(pose, side).at) - arm;
  if (short > 0) {
    const help = Math.min(1, short / 0.28);
    const [sx, sy, sz] = pose.joints.spine ?? [0, 0, 0];
    const [cx, cy, cz] = pose.joints.chest ?? [0, 0, 0];
    pose = { lift: pose.lift, joints: { ...pose.joints, spine: [sx - 25 * help, sy, sz], chest: [cx, cy + sign * 30 * help, cz] } };
  }
  const { at, chest } = shoulder(pose, side);
  const axis = new THREE.Vector3(sign, 0, 0);
  const l1 = Math.abs(OFFSETS[`forearm${side}`][0]);
  const l2 = Math.abs(OFFSETS[`hand${side}`][0]);
  const to = target.clone().sub(at);
  const d = THREE.MathUtils.clamp(to.length(), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.002);
  const n = to.lengthSq() > 1e-8 ? to.normalize() : new THREE.Vector3(0, -1, 0);
  const cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos));
  const pole = new THREE.Vector3(sign * 0.35, -1, 0.45);
  pole.addScaledVector(n, -pole.dot(n));
  if (pole.lengthSq() < 1e-6) pole.set(sign, 0, 0);
  pole.normalize();
  const elbow = at.clone().addScaledVector(n, l1 * cos).addScaledVector(pole, l1 * sin);
  const wrist = at.clone().addScaledVector(n, d);

  const upperDir = elbow.clone().sub(at).normalize().applyQuaternion(chest.clone().invert());
  const upper = new THREE.Quaternion().setFromUnitVectors(axis, upperDir);
  const foreDir = wrist.sub(elbow).normalize().applyQuaternion(chest.clone().multiply(upper).invert());
  const fore = new THREE.Quaternion().setFromUnitVectors(axis, foreDir);
  return { lift: pose.lift, joints: { ...pose.joints, [`upperArm${side}`]: degrees(upper), [`forearm${side}`]: degrees(fore) } };
}

/**
 * How far to turn the wrist around the forearm, in degrees, so that the palm faces `toward` (a direction in
 * the character's frame) as well as it can. With no turn, the palm faces down in the T-pose.
 */
export function palmToward(pose: Pose, side: Side, toward: THREE.Vector3): number {
  const forearm = shoulder(pose, side).chest.multiply(turn(pose, `upperArm${side}`)).multiply(turn(pose, `forearm${side}`));
  const local = toward.clone().applyQuaternion(forearm.invert());
  // Turned by a around the arm, the palm faces (0, -cos a, -sin a).
  return Math.atan2(-local.z, -local.y) / DEG;
}

/** Which way the palm faces in a pose, in the character's frame. */
export function palmNormal(pose: Pose, side: Side): THREE.Vector3 {
  const hand = shoulder(pose, side).chest.multiply(turn(pose, `upperArm${side}`)).multiply(turn(pose, `forearm${side}`)).multiply(turn(pose, `hand${side}`));
  return new THREE.Vector3(0, -1, 0).applyQuaternion(hand);
}
