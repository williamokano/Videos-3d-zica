import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { group, mat, rbox, registerAsset, setChannels, type AssetChannels } from './registry';

const WHEEL_R = 0.33;
const DOOR_ANGLE = THREE.MathUtils.degToRad(62);
const glass = new THREE.MeshStandardMaterial({ color: '#9fd0ee', transparent: true, opacity: 0.4, roughness: 0.1 });
/** Glass seen from both sides: a flat pane has no back. */
const sideGlassMaterial = new THREE.MeshStandardMaterial({ color: '#9fd0ee', transparent: true, opacity: 0.4, roughness: 0.1, side: THREE.DoubleSide });

function wheel(x: number, z: number): THREE.Group {
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.22, 20), mat('#22242a'));
  tyre.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.24, 12), mat('#c9ccd3'));
  hub.rotation.z = Math.PI / 2;
  // Spokes make the spin visible.
  const g = group(tyre, hub, rbox(0.25, 0.3, 0.06, '#8d919b', [0, 0, 0], 0.01), rbox(0.25, 0.06, 0.3, '#8d919b', [0, 0, 0], 0.01));
  g.position.set(x, WHEEL_R, z);
  return g;
}

/** A flat slab between two points of a side view ([z, y]), `wide` across the car and `thick`: slanted glass, a pillar. */
function slab(wide: number, thick: number, from: [number, number], to: [number, number], x: number, material: THREE.Material): THREE.Mesh {
  const [dz, dy] = [to[0] - from[0], to[1] - from[1]];
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(wide, thick, Math.hypot(dz, dy), 2, Math.min(wide, thick) * 0.3), material);
  mesh.position.set(x, (from[1] + to[1]) / 2, (from[0] + to[0]) / 2);
  mesh.rotation.x = Math.atan2(-dy, dz);
  return mesh;
}

/** A flat piece of glass standing along the car, from its outline in a side view ([z, y] points). */
function sideGlass(outline: [number, number][]): THREE.Mesh {
  const shape = new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(z, y)));
  const pane = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateY(-Math.PI / 2), sideGlassMaterial);
  pane.userData.noShadow = true;
  return pane;
}

// Side view of the body, as [z, y]: the car faces -z.
const SILL = 0.33;
const BELT = 0.95;
const ROOF = 1.56;
/** Where the windscreen starts and ends, and the rear window. Both lean in toward the roof. */
const SCREEN: [[number, number], [number, number]] = [[-0.86, BELT], [-0.3, ROOF]];
const REAR: [[number, number], [number, number]] = [[1.26, BELT], [0.98, ROOF]];
const HALF = 0.85;

/**
 * Car facing -z (driver on the left, -x). Made of blocks, with the windscreen and the rear window leaning in.
 * Channels: `<door>.open` from 0 to 1 for frontLeft, frontRight, rearLeft and rearRight, and `travel` (meters
 * rolled, turns the wheels). Seats are named anchors (`seat.driver`, `seat.passenger`, `seat.rearLeft`,
 * `seat.rearRight`) for characters to sit on. `userData.parts` says where each door is hinged and how far it
 * swings, so actions know what a door sweeps.
 */
registerAsset('vehicle.car', 'Carro de quatro portas, de frente para -z; portas e rodas animáveis por ações (params: color)', (p) => {
  const color = String(p.color ?? '#d94f3d');
  const dark = '#2b2e36';
  const paint = mat(color);
  const car = group(
    rbox(1.66, 0.2, 4.1, dark, [0, 0.38, 0], 0.05),
    // Bonnet and boot, up to the belt line the doors end at.
    rbox(HALF * 2, BELT - 0.43, 1.26, color, [0, (BELT + 0.43) / 2, -1.48], 0.08),
    rbox(HALF * 2, BELT - 0.43, 0.86, color, [0, (BELT + 0.43) / 2, 1.68], 0.08),
    rbox(1.6, 0.07, REAR[1][0] - SCREEN[1][0] + 0.1, color, [0, ROOF, (REAR[1][0] + SCREEN[1][0]) / 2], 0.03),
    rbox(1.5, 0.3, 0.2, dark, [0, 0.8, -0.74], 0.04),
    // Bumpers, lights and grille.
    rbox(1.76, 0.16, 0.14, dark, [0, 0.5, -2.08], 0.05),
    rbox(1.76, 0.16, 0.14, dark, [0, 0.5, 2.08], 0.05),
    rbox(0.86, 0.14, 0.05, dark, [0, 0.78, -2.11], 0.02),
  );
  for (const x of [-0.6, 0.6]) car.add(rbox(0.32, 0.14, 0.05, '#fff2b8', [x, 0.8, -2.11], 0.02), rbox(0.32, 0.12, 0.05, '#c0271b', [x, 0.82, 2.11], 0.02));
  // Slanted glass front and back, with a pillar on each side of it; a straight pillar between the doors.
  for (const [from, to] of [SCREEN, REAR]) {
    const pane = slab(1.5, 0.025, from, to, 0, glass);
    pane.userData.noShadow = true;
    car.add(pane);
    for (const x of [-0.78, 0.78]) car.add(slab(0.08, 0.08, from, to, x, paint));
  }
  for (const x of [-0.78, 0.78]) car.add(rbox(0.07, ROOF - BELT, 0.08, color, [x, (ROOF + BELT) / 2, 0.2], 0.02));
  const steering = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 20), mat('#15161a'));
  steering.position.set(-0.4, 0.98, -0.5);
  steering.rotation.x = -0.35;
  car.add(steering);

  const seats: [string, number, number][] = [['driver', -0.4, -0.1], ['passenger', 0.4, -0.1], ['rearLeft', -0.4, 0.8], ['rearRight', 0.4, 0.8]];
  for (const [name, x, z] of seats) {
    car.add(rbox(0.56, 0.14, 0.5, '#4a4f5c', [x, 0.49, z], 0.04), rbox(0.56, 0.6, 0.12, '#4a4f5c', [x, 0.82, z + 0.3], 0.04));
    const anchor = new THREE.Object3D();
    anchor.name = `seat.${name}`;
    anchor.position.set(x, 0.56, z);
    car.add(anchor);
  }

  const channels: AssetChannels = {};
  const parts: Record<string, { hinge: [number, number]; length: number; side: number; angle: number }> = {};
  // Doors fill the side between bonnet and boot, flush with them. Each is hinged at its front edge.
  const [first, middle, last] = [SCREEN[0][0] + 0.02, 0.2, REAR[0][0] - 0.02];
  const THICK = 0.08;
  const doors: [string, number, number, number][] = [
    ['frontLeft', -1, first, middle - first - 0.02], ['frontRight', 1, first, middle - first - 0.02],
    ['rearLeft', -1, middle, last - middle], ['rearRight', 1, middle, last - middle],
  ];
  for (const [name, side, zFront, length] of doors) {
    const hinge = new THREE.Group();
    hinge.position.set(side * (HALF - THICK / 2), 0, zFront);
    // The window follows the slant of the glass next to it. In the door's own frame, z runs from the hinge back.
    const front = zFront < 0;
    const lean = (at: [[number, number], [number, number]]): number => at[1][0] - zFront;
    const window = sideGlass(front
      ? [[0, BELT], [length, BELT], [length, ROOF - 0.04], [lean(SCREEN) + 0.04, ROOF - 0.04]]
      : [[0, BELT], [length, BELT], [lean(REAR) - 0.04, ROOF - 0.04], [0, ROOF - 0.04]]);
    hinge.add(
      rbox(THICK, BELT - SILL, length, color, [0, (BELT + SILL) / 2, length / 2], 0.025),
      window,
      rbox(0.03, 0.04, 0.14, '#d0d4dc', [side * (THICK / 2 + 0.01), BELT - 0.12, length - 0.16], 0.01),
    );
    // A mirror on each front door.
    if (front) hinge.add(rbox(0.14, 0.09, 0.07, color, [side * 0.1, BELT + 0.07, 0.14], 0.02));
    car.add(hinge);
    channels[`${name}.open`] = { value: 0, apply: (v) => (hinge.rotation.y = side * DOOR_ANGLE * v) };
    parts[name] = { hinge: [hinge.position.x, zFront], length, side, angle: DOOR_ANGLE };
  }
  car.userData.parts = parts;

  const wheels = [wheel(-0.79, -1.35), wheel(0.79, -1.35), wheel(-0.79, 1.35), wheel(0.79, 1.35)];
  car.add(...wheels);
  channels.travel = { value: 0, apply: (v) => wheels.forEach((w) => (w.rotation.x = -v / WHEEL_R)) };
  return setChannels(car, channels);
}, 'vehicle');
