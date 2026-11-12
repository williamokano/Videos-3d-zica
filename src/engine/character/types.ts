/**
 * Characters. Every character, built here or imported from a GLB, is driven through the same standard
 * skeleton: the joints below, at rest in a T-pose, facing -z with the left arm along -x.
 */

export const JOINTS = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'upperArmL', 'forearmL', 'handL', 'upperArmR', 'forearmR', 'handR',
  'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR',
] as const;

export type Joint = (typeof JOINTS)[number];

export const PARENT: Record<Joint, Joint | null> = {
  hips: null, spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck',
  upperArmL: 'chest', forearmL: 'upperArmL', handL: 'forearmL',
  upperArmR: 'chest', forearmR: 'upperArmR', handR: 'forearmR',
  thighL: 'hips', shinL: 'thighL', footL: 'shinL',
  thighR: 'hips', shinR: 'thighR', footR: 'shinR',
};

/** Joint positions relative to their parent, for a 1.7 m character in a T-pose. */
export const OFFSETS: Record<Joint, [number, number, number]> = {
  hips: [0, 0.9, 0], spine: [0, 0.1, 0], chest: [0, 0.16, 0], neck: [0, 0.26, 0], head: [0, 0.06, 0],
  upperArmL: [-0.19, 0.2, 0], forearmL: [-0.26, 0, 0], handL: [-0.24, 0, 0],
  upperArmR: [0.19, 0.2, 0], forearmR: [0.26, 0, 0], handR: [0.24, 0, 0],
  thighL: [-0.09, -0.02, 0], shinL: [0, -0.42, 0], footL: [0, -0.4, 0],
  thighR: [0.09, -0.02, 0], shinR: [0, -0.42, 0], footR: [0, -0.4, 0],
};

/**
 * A pose: rotation of each joint from the T-pose, as [x, y, z] degrees applied in the joint's parent frame
 * (x pitches forward, y turns left, z rolls), and how far the hips rise from standing.
 */
export interface Pose {
  joints: Partial<Record<Joint, [number, number, number]>>;
  lift: number;
}

/** What the face shows. Neutral is eyeOpen 1 and the rest near 0. */
export interface FaceParams {
  /** 0 closed, 1 normal, above 1 wide open. */
  eyeOpen: number;
  /** -1 lowered to 1 raised. */
  browLift: number;
  /** 1 angry (inner ends down) to -1 worried (inner ends up). */
  browTilt: number;
  /** -1 frown to 1 smile. */
  mouthCurve: number;
  /** 0 closed to 1 wide open. */
  mouthOpen: number;
  mouthWidth: number;
}

/** Character file in series/<series>/characters/<id>.json. */
export interface CharacterDef {
  id: string;
  name: string;
  /** Height in meters (default 1.7). */
  height?: number;
  /** Head size relative to a realistic one (default 1.3, the cartoon look). */
  headScale?: number;
  /** Body width factor (default 1). */
  build?: number;
  skin?: string;
  hair?: string;
  hairStyle?: 'short' | 'long' | 'bun' | 'none';
  shirt?: string;
  pants?: string;
  shoes?: string;
  /**
   * Replace the built-in body by a model: file name of a GLB next to this file. The model must be skinned
   * and stand in a T-pose. Without face morph targets it has no expressions and no lip-sync.
   */
  glb?: string;
  /** GLB only: standard joint → bone name, for bones the automatic matching misses. */
  bones?: Partial<Record<Joint, string>>;
  /** GLB only: which way the model faces in its file (default "+z", the glTF convention). */
  facing?: '+z' | '-z';
  /** GLB only: face channel ("blink", "talk" or an expression name) → morph target name. */
  morphs?: Record<string, string>;
}

/** What drives a character body, whatever it is made of. */
export interface CharacterRig {
  object: import('three').Object3D;
  applyPose(pose: Pose): void;
  /** `blink` and `talk` go from 0 to 1; `expressions` are weights by name. */
  setFace(face: FaceParams, raw: { blink: number; talk: number; expressions: Record<string, number> }): void;
  /** Height of the eyes above the feet when standing, in meters. */
  eyeHeight: number;
  /** Hide the head so a camera can sit in it. Bodies that cannot do it are hidden whole in first person. */
  hideHead?(hidden: boolean): void;
  /** A standard joint, e.g. to put something in a hand. */
  joint(name: Joint): import('three').Object3D | undefined;
}
