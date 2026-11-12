import * as THREE from 'three';
import { mat, rbox } from '../assets/registry';
import { JOINTS, PARENT, type CharacterDef, type CharacterRig, type FaceParams, type Joint } from './types';

const DEG = Math.PI / 180;

/** Joint positions relative to their parent, for a 1.7 m character in a T-pose. */
const OFFSETS: Record<Joint, [number, number, number]> = {
  hips: [0, 0.9, 0], spine: [0, 0.1, 0], chest: [0, 0.16, 0], neck: [0, 0.26, 0], head: [0, 0.06, 0],
  upperArmL: [-0.19, 0.2, 0], forearmL: [-0.26, 0, 0], handL: [-0.24, 0, 0],
  upperArmR: [0.19, 0.2, 0], forearmR: [0.26, 0, 0], handR: [0.24, 0, 0],
  thighL: [-0.09, -0.02, 0], shinL: [0, -0.42, 0], footL: [0, -0.4, 0],
  thighR: [0.09, -0.02, 0], shinR: [0, -0.42, 0], footR: [0, -0.4, 0],
};

/** Limb segment from a joint toward `to`, as a capsule. */
function limb(to: [number, number, number], radius: number, color: string): THREE.Mesh {
  const end = new THREE.Vector3(...to);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.01, end.length() - radius), 4, 10), mat(color));
  mesh.position.copy(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().normalize());
  return mesh;
}

function ball(radius: number, color: string, x: number, y: number, z: number, scale: [number, number, number] = [1, 1, 1]): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), mat(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(...scale);
  return mesh;
}

/** Face drawn on a head of radius r centered on the group: eyes, brows and a mouth that follow FaceParams. */
function buildFace(r: number): { group: THREE.Group; set(face: FaceParams): void } {
  const group = new THREE.Group();
  const dark = '#2a2024';
  // Point on the front of the head for a given x and y.
  const on = (x: number, y: number, out = 0.004) => new THREE.Vector3(x, y, -Math.sqrt(Math.max(0, r * r - x * x - y * y)) - out);
  const eyeX = r * 0.36;
  const eyeY = r * 0.12;
  const eyes = [-1, 1].map((side) => {
    const eye = ball(r * 0.14, dark, 0, 0, 0, [0.8, 1, 0.5]);
    eye.position.copy(on(side * eyeX, eyeY, 0));
    group.add(eye);
    return eye;
  });
  const brows = [-1, 1].map((side) => {
    const brow = rbox(r * 0.34, r * 0.07, r * 0.06, dark, [0, 0, 0], 0.004);
    group.add(brow);
    return { brow, side };
  });
  const lips = new THREE.Mesh(new THREE.BufferGeometry(), mat('#7a3238'));
  const inside = ball(r * 0.2, '#4a1a20', 0, 0, 0);
  group.add(lips, inside);
  let drawn = '';

  return {
    group,
    set(face) {
      for (const eye of eyes) eye.scale.y = Math.max(0.08, face.eyeOpen);
      for (const { brow, side } of brows) {
        brow.position.copy(on(side * eyeX, eyeY + r * (0.34 + 0.12 * face.browLift)));
        // The inner end of each brow is the one toward the nose.
        brow.rotation.z = side * face.browTilt * 0.45;
      }
      // The mouth is rebuilt only when its shape changes visibly.
      const key = [face.mouthCurve, face.mouthOpen, face.mouthWidth].map((v) => v.toFixed(2)).join();
      if (key === drawn) return;
      drawn = key;
      const half = r * 0.3 * face.mouthWidth;
      const y0 = -r * 0.42;
      const bend = r * 0.14 * face.mouthCurve;
      const open = r * 0.26 * face.mouthOpen;
      const points = [-1, -0.5, 0, 0.5, 1].map((u) => on(u * half, y0 + bend * (u * u - 0.5) - open * (1 - u * u) * 0.5));
      lips.geometry.dispose();
      lips.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, r * 0.035, 6);
      inside.visible = face.mouthOpen > 0.06;
      inside.position.copy(on(0, y0 - bend * 0.5 - open * 0.1, -0.002));
      inside.scale.set(face.mouthWidth * 1.1, Math.max(0.05, face.mouthOpen * 1.3), 0.15);
    },
  };
}

function buildHair(style: CharacterDef['hairStyle'], color: string, r: number): THREE.Object3D {
  const g = new THREE.Group();
  if (style === 'none') return g;
  // A cap over the top and back of the head, tipped back to leave the face free.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(color));
  cap.rotation.x = 0.55;
  g.add(cap);
  if (style === 'long') g.add(rbox(r * 1.8, r * 1.7, r * 0.6, color, [0, -r * 0.5, r * 0.78], r * 0.28));
  if (style === 'bun') g.add(ball(r * 0.36, color, 0, r * 0.95, r * 0.45));
  return g;
}

/** The built-in cartoon body: rigid segments on the standard skeleton. */
export function buildBody(def: CharacterDef): CharacterRig {
  const scale = (def.height ?? 1.7) / 1.7;
  const wide = def.build ?? 1;
  const skin = def.skin ?? '#e8b88f';
  const shirt = def.shirt ?? '#3d7dd9';
  const pants = def.pants ?? '#34405a';
  const root = new THREE.Group();
  root.scale.setScalar(scale);

  const joints = {} as Record<Joint, THREE.Group>;
  for (const name of JOINTS) {
    const joint = new THREE.Group();
    joint.name = name;
    joint.position.set(...OFFSETS[name]);
    joints[name] = joint;
    (PARENT[name] ? joints[PARENT[name]!] : root).add(joint);
  }

  joints.hips.add(rbox(0.3 * wide, 0.2, 0.19 * wide, pants, [0, 0.02, 0], 0.07));
  joints.spine.add(rbox(0.29 * wide, 0.2, 0.18 * wide, shirt, [0, 0.07, 0], 0.07));
  joints.chest.add(rbox(0.36 * wide, 0.28, 0.2 * wide, shirt, [0, 0.12, 0], 0.09), limb([0, 0.07, 0], 0.045, skin).translateY(0.24));
  for (const side of ['L', 'R'] as const) {
    const x = side === 'L' ? -1 : 1;
    joints[`upperArm${side}`].add(limb([x * 0.26, 0, 0], 0.055 * wide, shirt));
    joints[`forearm${side}`].add(limb([x * 0.24, 0, 0], 0.045 * wide, skin));
    joints[`hand${side}`].add(ball(0.055, skin, x * 0.05, 0, 0, [1.2, 0.8, 1]));
    joints[`thigh${side}`].add(limb([0, -0.42, 0], 0.075 * wide, pants));
    joints[`shin${side}`].add(limb([0, -0.4, 0], 0.06 * wide, pants));
    joints[`foot${side}`].add(rbox(0.1, 0.08, 0.24, def.shoes ?? '#2b2e36', [0, -0.02, -0.05], 0.035));
  }

  // The head keeps its size when the body is scaled down, which is what makes a child read as a child.
  const r = (0.115 * (def.headScale ?? 1.3)) / Math.sqrt(scale);
  const head = new THREE.Group();
  head.position.y = r * 0.9;
  const face = buildFace(r);
  head.add(ball(r, skin, 0, 0, 0), face.group, buildHair(def.hairStyle ?? 'short', def.hair ?? '#3b2a20', r));
  joints.head.add(head);

  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
  });

  return {
    object: root,
    applyPose(pose) {
      for (const name of JOINTS) {
        const [x, y, z] = pose.joints[name] ?? [0, 0, 0];
        joints[name].rotation.set(x * DEG, y * DEG, z * DEG);
      }
      joints.hips.position.y = OFFSETS.hips[1] + pose.lift;
    },
    setFace: (params) => face.set(params),
    eyeHeight: scale * (1.48 + r * 1.02),
    hideHead: (hidden) => {
      head.visible = !hidden;
    },
    joint: (name) => joints[name],
  };
}
