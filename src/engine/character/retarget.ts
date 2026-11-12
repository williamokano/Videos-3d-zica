import * as THREE from 'three';
import { JOINTS, PARENT, type CharacterDef, type CharacterRig, type Joint, type Pose } from './types';

const DEG = Math.PI / 180;

/** Common bone names for each standard joint, compared without case, spaces, separators or a "mixamorig" prefix. */
const ALIASES: Record<Joint, string[]> = {
  hips: ['hips', 'pelvis', 'root'],
  spine: ['spine', 'spine1', 'spine01'],
  chest: ['chest', 'spine2', 'spine02', 'upperchest'],
  neck: ['neck'],
  head: ['head'],
  upperArmL: ['upperarml', 'leftarm', 'leftupperarm', 'arml', 'lupperarm'],
  forearmL: ['forearml', 'leftforearm', 'lowerarml', 'leftlowerarm', 'lforearm'],
  handL: ['handl', 'lefthand', 'lhand'],
  upperArmR: ['upperarmr', 'rightarm', 'rightupperarm', 'armr', 'rupperarm'],
  forearmR: ['forearmr', 'rightforearm', 'lowerarmr', 'rightlowerarm', 'rforearm'],
  handR: ['handr', 'righthand', 'rhand'],
  thighL: ['thighl', 'leftupleg', 'leftupperleg', 'upperlegl', 'lthigh'],
  shinL: ['shinl', 'leftleg', 'leftlowerleg', 'lowerlegl', 'calfl', 'lcalf'],
  footL: ['footl', 'leftfoot', 'lfoot'],
  thighR: ['thighr', 'rightupleg', 'rightupperleg', 'upperlegr', 'rthigh'],
  shinR: ['shinr', 'rightleg', 'rightlowerleg', 'lowerlegr', 'calfr', 'rcalf'],
  footR: ['footr', 'rightfoot', 'rfoot'],
};

const plain = (name: string) => name.toLowerCase().replace(/mixamorig/g, '').replace(/[^a-z0-9]/g, '');

/** Match the standard joints to the bones of a model: explicit names first, then the common ones. */
export function mapBones(model: THREE.Object3D, explicit: CharacterDef['bones'] = {}): Partial<Record<Joint, THREE.Object3D>> {
  const byName = new Map<string, THREE.Object3D>();
  const byPlain = new Map<string, THREE.Object3D>();
  model.traverse((o) => {
    if (!o.name) return;
    byName.set(o.name, o);
    if (!byPlain.has(plain(o.name))) byPlain.set(plain(o.name), o);
  });
  const out: Partial<Record<Joint, THREE.Object3D>> = {};
  for (const joint of JOINTS) {
    const wanted = explicit[joint];
    if (wanted) {
      const bone = byName.get(wanted);
      if (!bone) throw new Error(`Osso "${wanted}" (para ${joint}) não existe no modelo. Ossos: ${[...byName.keys()].join(', ')}.`);
      out[joint] = bone;
      continue;
    }
    for (const alias of ALIASES[joint]) {
      const bone = byPlain.get(alias);
      if (bone) {
        out[joint] = bone;
        break;
      }
    }
  }
  return out;
}

/**
 * Drive a model's own skeleton with standard poses. The model must be in a T-pose when this is called:
 * each bone keeps its rest orientation and receives the rotation the standard joint has turned by,
 * so the bones' own axes do not matter.
 *
 * `model` is the root the bones live under, already facing -z and not yet placed in a scene;
 * `size` is the character's height relative to the standard 1.7 m.
 */
export function retarget(model: THREE.Object3D, bones: Partial<Record<Joint, THREE.Object3D>>, size = 1): Pick<CharacterRig, 'applyPose' | 'joint'> {
  model.updateWorldMatrix(true, true);
  const q = new THREE.Quaternion();
  const inModel = (o: THREE.Object3D): THREE.Quaternion => model.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(o.getWorldQuaternion(q));
  const used = JOINTS.filter((j) => bones[j]);
  const rest = new Map(used.map((j) => [j, inModel(bones[j]!)]));
  const hips = bones.hips;
  const hipsRest = hips?.position.clone();
  // Meters of the standard skeleton → units of the hips bone's parent.
  const liftScale = hips?.parent ? size / hips.parent.getWorldScale(new THREE.Vector3()).y : size;
  const total = new Map<Joint, THREE.Quaternion>();
  const euler = new THREE.Euler();

  return {
    joint: (name) => bones[name],
    applyPose(pose: Pose) {
      // How far each standard joint has turned from the T-pose, in the character's own space.
      for (const j of JOINTS) {
        const [x, y, z] = pose.joints[j] ?? [0, 0, 0];
        const local = new THREE.Quaternion().setFromEuler(euler.set(x * DEG, y * DEG, z * DEG));
        const parent = PARENT[j];
        total.set(j, parent ? total.get(parent)!.clone().multiply(local) : local);
      }
      // Parents first, so each bone can be set against where its parent has ended up.
      for (const j of used) {
        const bone = bones[j]!;
        const wanted = total.get(j)!.clone().multiply(rest.get(j)!);
        bone.parent!.updateWorldMatrix(true, false);
        bone.quaternion.copy(inModel(bone.parent!).invert().multiply(wanted));
      }
      if (hips && hipsRest) {
        const up = new THREE.Vector3(0, pose.lift * liftScale, 0);
        hips.parent!.updateWorldMatrix(true, false);
        hips.position.copy(hipsRest).add(up.applyQuaternion(inModel(hips.parent!).invert()));
      }
    },
  };
}
