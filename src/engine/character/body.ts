import * as THREE from 'three';
import { mat, rbox } from '../assets/registry';
import { JOINTS, OFFSETS, PARENT, type CharacterDef, type CharacterRig, type FaceParams, type HandShape, type Joint } from './types';

const DEG = Math.PI / 180;

/** Limb segment from a joint toward `to`, as a capsule. */
function limb(to: [number, number, number], radius: number, color: string): THREE.Mesh {
  const end = new THREE.Vector3(...to);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.01, end.length() - radius), 4, 10), mat(color));
  mesh.position.copy(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().normalize());
  return mesh;
}

function ball(radius: number, color: string, x: number, y: number, z: number, scale: [number, number, number] = [1, 1, 1]): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 22), mat(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(...scale);
  return mesh;
}

/** A color made darker (k below 1) or lighter. */
const shade = (color: string, k: number): string => `#${new THREE.Color(color).multiplyScalar(k).getHexString()}`;
const blend = (a: string, b: string, w: number): string => `#${new THREE.Color(a).lerp(new THREE.Color(b), w).getHexString()}`;

const clamp = (v: number, low: number, high: number): number => Math.max(low, Math.min(high, v));

/** Columns of the mouth, from one corner (-1) to the other (1). */
const MOUTH_U = Array.from({ length: 15 }, (_, i) => -1 + (2 * i) / 14);

/**
 * A band of the mouth lying on the head: two rows of points, one above the other, joined into a surface.
 * Its points move with the face and the surface is never rebuilt.
 */
function band(color: string): { mesh: THREE.Mesh; set(x: number[], top: number[], bottom: number[], on: (x: number, y: number, out: number) => THREE.Vector3, out: number): void } {
  const n = MOUTH_U.length;
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(n * 6), 3);
  const normal = new THREE.BufferAttribute(new Float32Array(n * 6), 3);
  const index: number[] = [];
  // Wound to face out of the head (-z).
  for (let i = 0; i < n - 1; i++) index.push(i, i + 1, n + i, i + 1, n + i + 1, n + i);
  geometry.setAttribute('position', position);
  geometry.setAttribute('normal', normal);
  geometry.setIndex(index);
  const mesh = new THREE.Mesh(geometry, mat(color));
  // The points move, so the box they were made with says nothing.
  mesh.frustumCulled = false;
  const out = new THREE.Vector3();
  return {
    mesh,
    set(x, top, bottom, on, lift) {
      for (let i = 0; i < n; i++) {
        for (const [row, y] of [top[i], bottom[i]].entries()) {
          const point = on(x[i], y, lift);
          position.setXYZ(row * n + i, point.x, point.y, point.z);
          out.copy(point).normalize();
          normal.setXYZ(row * n + i, out.x, out.y, out.z);
        }
      }
      position.needsUpdate = normal.needsUpdate = true;
    },
  };
}

/** A thick eyebrow lying along x: thinner toward the ear (the end on the `side` of the face), a little arched. */
function browGeometry(r: number, side: number): THREE.BufferGeometry {
  const length = r * 0.42;
  const radius = r * 0.062;
  const geometry = new THREE.CapsuleGeometry(radius, length - 2 * radius, 4, 12).rotateZ(Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) / (length / 2);
    const thin = 1 - 0.5 * ((u * side + 1) / 2);
    position.setXYZ(i, position.getX(i), position.getY(i) * thin + r * 0.05 * (1 - u * u), position.getZ(i) * thin * 0.7);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Face on a head of radius r centered on the group, looking at -z: eyes with a white, an iris that moves and
 * lids that close, thick brows, a nose, ears and a mouth with teeth and a tongue. All of it follows FaceParams.
 */
function buildFace(r: number, colors: { skin: string; hair: string; eyes: string }): { group: THREE.Group; set(face: FaceParams): void } {
  const group = new THREE.Group();
  // Point on the front of the head for a given x and y, `out` meters off the skin.
  const on = (x: number, y: number, out = 0): THREE.Vector3 => {
    const flat = Math.min(x * x + y * y, r * r * 0.98);
    return new THREE.Vector3(x, y, -Math.sqrt(r * r - flat)).multiplyScalar(1 + out / r);
  };
  const forward = new THREE.Vector3(0, 0, -1);
  /** Put something on the head at (x, y), turned so that its own -z points out of the head there. */
  const seat = (object: THREE.Object3D, x: number, y: number): void => {
    object.position.copy(on(x, y));
    object.quaternion.setFromUnitVectors(forward, object.position.clone().normalize());
  };

  // ---- Eyes ----
  const eyeX = r * 0.37;
  const eyeY = r * 0.1;
  // Half width and half height of the white, how far it is sunk into the head, and how thick it is.
  const [ex, ey, sunk, deep] = [r * 0.2, r * 0.23, r * 0.03, r * 0.075];
  const irisR = r * 0.118;
  const eyes = [-1, 1].map((side) => {
    const eye = new THREE.Group();
    seat(eye, side * eyeX, eyeY);
    const white = ball(1, '#f6f2ea', 0, 0, sunk, [ex, ey, deep]);
    // Iris, pupil and the light on them, moving together over the white.
    const iris = new THREE.Group();
    iris.add(
      ball(irisR, colors.eyes, 0, 0, 0, [1, 1, 0.08]),
      ball(irisR * 0.5, '#120d0c', 0, 0, -r * 0.006, [1, 1, 0.1]),
      ball(r * 0.026, '#ffffff', -r * 0.04, r * 0.045, -r * 0.012, [1, 1, 0.3]),
    );
    // Lids: half shells in the color of the skin that turn over the eyeball, the upper one down and the lower
    // one up. Seen from the front, the edge of each is an arc from one corner of the eye to the other.
    const lids = new THREE.Group();
    lids.position.z = sunk;
    lids.scale.set(ex * 1.07, ey * 1.07, deep * 1.65);
    const lid = (from: number): THREE.Mesh => new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, from, Math.PI / 2), mat(colors.skin));
    const [upper, lower] = [lid(0), lid(Math.PI / 2)];
    // Lashes: a dark line along the edge of the upper lid, which is also what shows of a closed eye.
    upper.add(new THREE.Mesh(new THREE.TorusGeometry(1.01, 0.045, 6, 24, Math.PI).rotateX(-Math.PI / 2), mat('#2a1c18')));
    lids.add(upper, lower);
    eye.add(white, iris, lids);
    // No shadows inside the eye: a lid would darken the white under it.
    eye.traverse((o) => {
      o.userData.noShadow = true;
    });
    // And no outline (see engine/style.ts) on the small parts of the face: it would bury them.
    eye.userData.noOutline = true;
    group.add(eye);
    return { side, iris, upper, lower };
  });

  // ---- Brows, nose, ears ----
  const browColor = shade(colors.hair, 0.55);
  const brows = [-1, 1].map((side) => {
    const brow = new THREE.Mesh(browGeometry(r, side), mat(browColor));
    brow.userData.noOutline = true;
    group.add(brow);
    return { brow, side };
  });
  const nose = ball(r * 0.09, shade(colors.skin, 0.9), 0, 0, 0, [1, 0.85, 1]);
  nose.position.copy(on(0, -r * 0.17));
  // A small bump: outlined, it would read as a ring in the middle of the face.
  nose.userData.noOutline = true;
  group.add(nose);
  for (const side of [-1, 1]) group.add(ball(r * 0.19, colors.skin, side * r * 0.98, -r * 0.02, r * 0.06, [0.4, 1, 0.75]));

  // ---- Mouth ----
  const inside = band('#3a1318');
  const tongue = band('#c2606a');
  const teeth = band('#f4f0e8');
  // Teeth sit in the shade of the face; a little light of their own keeps them white.
  teeth.mesh.material = new THREE.MeshStandardMaterial({ color: '#f4f0e8', emissive: '#f4f0e8', emissiveIntensity: 0.3, roughness: 0.6 });
  const lipColor = blend(colors.skin, '#93323c', 0.6);
  const [upperLip, lowerLip] = [band(lipColor), band(lipColor)];
  for (const part of [inside, tongue, teeth, upperLip, lowerLip]) {
    part.mesh.userData.noOutline = true;
    group.add(part.mesh);
  }
  let drawn = '';

  return {
    group,
    set(face) {
      // How far each lid is turned back from the front of the eye, in degrees. They meet a little below the
      // middle; wide open they clear the white.
      const open = Math.max(0, face.eyeOpen);
      const upperTurn = open <= 1 ? -12 + 62 * open : Math.min(88, 50 + (open - 1) * 100);
      const lowerTurn = open <= 1 ? -12 - 46 * open : Math.max(-88, -58 - (open - 1) * 70);
      for (const { side, iris, upper, lower } of eyes) {
        // The inner end of each lid is the one toward the nose.
        upper.rotation.set(upperTurn * DEG, 0, side * face.lidTilt * 0.3);
        lower.rotation.set(lowerTurn * DEG, 0, 0);
        // The character's left is -x. Each eye sits on the side of a round head, so it is turned a little toward the nose to look ahead.
        const x = -clamp(face.gazeX, -1, 1) * (ex - irisR * 0.75) - side * r * 0.03;
        const y = clamp(face.gazeY, -1, 1) * (ey - irisR * 0.85);
        iris.position.set(x, y, sunk - deep * Math.sqrt(Math.max(0.1, 1 - (x / ex) ** 2 - (y / ey) ** 2)) - r * 0.004);
      }
      for (const { brow, side } of brows) {
        seat(brow, side * eyeX * 1.02, eyeY + r * (0.36 + 0.13 * face.browLift));
        // The inner end of each brow is the one toward the nose.
        brow.rotateZ(side * face.browTilt * 0.45);
        brow.translateZ(-r * 0.02);
      }

      // The mouth is redrawn only when its shape changes visibly.
      const key = [face.mouthCurve, face.mouthOpen, face.mouthWidth, face.mouthRound, face.teeth].map((v) => v.toFixed(3)).join();
      if (key === drawn) return;
      drawn = key;
      const round = clamp(face.mouthRound, 0, 1);
      const half = r * 0.3 * face.mouthWidth * (1 - 0.3 * round);
      const y0 = -r * 0.47;
      const bend = r * 0.14 * face.mouthCurve;
      // Closed, a dark line is left between the lips.
      const gap = Math.max(r * 0.012, r * 0.3 * face.mouthOpen);
      // A round mouth opens as much up as down, and its sides are rounder.
      const up = 0.3 + 0.2 * round;
      const power = 1 - 0.5 * round;
      const lip = r * 0.032 * (1 + 0.5 * round);
      const tongueUp = clamp((face.mouthOpen - 0.35) * 2, 0, 1);
      const x = MOUTH_U.map((u) => u * half);
      const rows = MOUTH_U.map((u) => {
        const middle = y0 + bend * (u * u - 0.5);
        const span = Math.max(0, 1 - u * u);
        const shape = span ** power;
        const [top, bottom] = [middle + gap * up * shape, middle - gap * (1 - up) * shape];
        // Lips come to a point at the corners.
        const thick = lip * (0.15 + 0.85 * Math.sqrt(span));
        return {
          top, bottom,
          teeth: top - Math.min(top - bottom, r * 0.11 * clamp(face.teeth, 0, 1)),
          tongue: bottom + (top - bottom) * 0.4 * tongueUp * span,
          above: top + thick,
          below: bottom - thick * 1.25,
        };
      });
      const row = (name: keyof (typeof rows)[number]): number[] => rows.map((v) => v[name]);
      inside.set(x, row('top'), row('bottom'), on, 0.0025);
      tongue.set(x, row('tongue'), row('bottom'), on, 0.0032);
      teeth.set(x, row('top'), row('teeth'), on, 0.004);
      upperLip.set(x, row('above'), row('top'), on, 0.005);
      lowerLip.set(x, row('bottom'), row('below'), on, 0.005);
      tongue.mesh.visible = tongueUp > 0.01;
      teeth.mesh.visible = face.teeth > 0.02 && face.mouthOpen > 0.04;
    },
  };
}

/**
 * A hand at the end of an arm: palm, thumb and fingers that bend. It lies as the arm does in the T-pose: along
 * x away from the body (`side` 1 for the right arm, -1 for the left), palm down, thumb to the front (-z).
 * "mitten" has one block for the four fingers; "fingers" has each of them.
 */
function buildHand(side: number, skin: string, kind: 'mitten' | 'fingers'): { group: THREE.Group; palm: THREE.Object3D; set(shape: HandShape): void } {
  const group = new THREE.Group();
  // Modelled a little large, to be easy to read; this brings it to the size of the arm.
  group.scale.setScalar(0.84);
  group.add(rbox(0.088, 0.034, 0.082, skin, [side * 0.05, 0, 0], 0.015));
  // Where something held sits: under the middle of the palm.
  const palm = new THREE.Group();
  palm.position.set(side * 0.062, -0.022, 0);
  group.add(palm);

  /** A chain of segments, each one bending at its near end. Returns the hinges, from the base on. */
  const chain = (parent: THREE.Object3D, lengths: number[], thick: number, wide: number): THREE.Group[] => {
    const hinges: THREE.Group[] = [];
    let at = parent;
    lengths.forEach((length, i) => {
      const hinge = new THREE.Group();
      if (i > 0) hinge.position.x = side * lengths[i - 1];
      hinge.add(rbox(length + thick * 0.5, thick, wide, skin, [side * length * 0.5, 0, 0], thick * 0.45));
      at.add(hinge);
      hinges.push(hinge);
      at = hinge;
    });
    return hinges;
  };
  /** Where a finger starts, turned by `yaw` around the vertical. */
  const root = (x: number, y: number, z: number): THREE.Group => {
    const base = new THREE.Group();
    base.position.set(side * x, y, z);
    group.add(base);
    return base;
  };

  // The index is the finger next to the thumb.
  const fingers = kind === 'mitten'
    ? [{ base: root(0.09, 0, 0), hinges: [] as THREE.Group[], lengths: [0.046, 0.04], wide: 0.078, thick: 0.027, z: 0, index: false }]
    : [-1.5, -0.5, 0.5, 1.5].map((slot, i) => {
        const size = [0.95, 1, 0.94, 0.8][i];
        return { base: root(0.09, 0, slot * 0.0205), hinges: [] as THREE.Group[], lengths: [0.036 * size, 0.027 * size, 0.022 * size], wide: 0.0185, thick: 0.021, z: slot, index: i === 0 };
      });
  for (const finger of fingers) finger.hinges = chain(finger.base, finger.lengths, finger.thick, finger.wide);
  // The thumb leaves the side of the palm, forward and out, and closes down and across it.
  const thumbBase = root(0.022, -0.004, -0.036);
  const thumb = chain(thumbBase, [0.04, 0.032], 0.024, 0.024);

  return {
    group,
    palm,
    set(shape) {
      for (const finger of fingers) {
        // A mitten bends as its fingers do on average, so pointing leaves it half open.
        const curl = kind === 'mitten' ? (shape.index + shape.fingers * 3) / 4 : finger.index ? shape.index : shape.fingers;
        finger.base.rotation.y = -finger.z * 0.16 * shape.spread;
        // Bending takes the tip under the palm (-y).
        finger.hinges.forEach((hinge, i) => {
          hinge.rotation.z = -side * curl * [1.45, 1.6, 1.2][i];
        });
      }
      // Open, the thumb sticks out to the front; closed, it lies across the palm.
      thumbBase.rotation.set(0, side * (1.15 - 0.5 * shape.thumb), 0);
      thumbBase.rotateX(side * 0.3);
      thumb[0].rotation.z = -side * (0.15 + 0.55 * shape.thumb);
      thumb[1].rotation.z = -side * (0.1 + 0.9 * shape.thumb);
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
  const hands = {} as Record<'L' | 'R', ReturnType<typeof buildHand>>;
  for (const side of ['L', 'R'] as const) {
    const x = side === 'L' ? -1 : 1;
    joints[`upperArm${side}`].add(limb([x * 0.26, 0, 0], 0.055 * wide, shirt));
    joints[`forearm${side}`].add(limb([x * 0.24, 0, 0], 0.045 * wide, skin));
    hands[side] = buildHand(x, skin, def.hands ?? 'mitten');
    joints[`hand${side}`].add(hands[side].group);
    joints[`thigh${side}`].add(limb([0, -0.42, 0], 0.075 * wide, pants));
    joints[`shin${side}`].add(limb([0, -0.4, 0], 0.06 * wide, pants));
    joints[`foot${side}`].add(rbox(0.1, 0.08, 0.24, def.shoes ?? '#2b2e36', [0, -0.02, -0.05], 0.035));
  }

  // The head keeps its size when the body is scaled down, which is what makes a child read as a child.
  const r = (0.115 * (def.headScale ?? 1.3)) / Math.sqrt(scale);
  const head = new THREE.Group();
  head.position.y = r * 0.9;
  const face = buildFace(r, { skin, hair: def.hair ?? '#3b2a20', eyes: def.eyes ?? '#4a2f1d' });
  head.add(ball(r, skin, 0, 0, 0), face.group, buildHair(def.hairStyle ?? 'short', def.hair ?? '#3b2a20', r));
  joints.head.add(head);

  root.traverse((o) => {
    if (o instanceof THREE.Mesh && !o.userData.noShadow) o.castShadow = o.receiveShadow = true;
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
    setHands(left, right) {
      hands.L.set(left);
      hands.R.set(right);
    },
    palm: (side) => hands[side].palm,
  };
}
