import * as THREE from 'three';
import { group, mat, rbox, registerAsset, setChannels, type AssetChannels } from './registry';

const WHEEL_R = 0.33;
const DOOR_ANGLE = THREE.MathUtils.degToRad(62);
const glass = new THREE.MeshStandardMaterial({ color: '#9fd0ee', transparent: true, opacity: 0.4, roughness: 0.1 });

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

/**
 * Car facing -z (driver on the left, -x). Channels: `<door>.open` from 0 to 1 for frontLeft, frontRight,
 * rearLeft and rearRight, and `travel` (meters rolled, turns the wheels). Seats are named anchors
 * (`seat.driver`, `seat.passenger`, `seat.rearLeft`, `seat.rearRight`) for characters to sit on.
 */
registerAsset('vehicle.car', 'Carro de quatro portas, de frente para -z; portas e rodas animáveis por ações (params: color)', (p) => {
  const color = String(p.color ?? '#d94f3d');
  const dark = '#2b2e36';
  const car = group(
    rbox(1.7, 0.2, 4.2, dark, [0, 0.4, 0], 0.05),
    rbox(1.7, 0.45, 1.3, color, [0, 0.72, -1.45], 0.08),
    rbox(1.7, 0.45, 0.9, color, [0, 0.72, 1.65], 0.08),
    rbox(1.62, 0.08, 2.06, color, [0, 1.56, 0.2], 0.03),
    rbox(1.5, 0.28, 0.22, dark, [0, 0.8, -0.68], 0.04),
    rbox(1.3, 0.1, 0.05, '#fff2b8', [0, 0.78, -2.1], 0.02),
    rbox(1.3, 0.1, 0.05, '#c0271b', [0, 0.78, 2.1], 0.02),
  );
  for (const x of [-0.78, 0.78]) for (const z of [-0.78, 0.2, 1.18]) car.add(rbox(0.07, 0.7, 0.07, color, [x, 1.23, z], 0.02));
  for (const z of [-0.8, 1.2]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.64, 0.03), glass);
    pane.position.set(0, 1.22, z);
    pane.userData.noShadow = true;
    car.add(pane);
  }
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
  const doors: [string, number, number, number][] = [
    ['frontLeft', -1, -0.76, 0.96], ['frontRight', 1, -0.76, 0.96], ['rearLeft', -1, 0.22, 0.96], ['rearRight', 1, 0.22, 0.96],
  ];
  for (const [name, side, zFront, length] of doors) {
    // Hinged at the front edge; the rear edge swings away from the body.
    const hinge = new THREE.Group();
    hinge.position.set(side * 0.86, 0, zFront);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.6, length - 0.12), glass);
    pane.position.set(0, 1.22, length / 2);
    pane.userData.noShadow = true;
    hinge.add(
      rbox(0.07, 0.62, length - 0.02, color, [0, 0.61, length / 2], 0.02),
      pane,
      rbox(0.03, 0.04, 0.14, '#d0d4dc', [side * 0.045, 0.82, length - 0.16], 0.01),
    );
    car.add(hinge);
    channels[`${name}.open`] = { value: 0, apply: (v) => (hinge.rotation.y = side * DOOR_ANGLE * v) };
  }

  const wheels = [wheel(-0.82, -1.35), wheel(0.82, -1.35), wheel(-0.82, 1.35), wheel(0.82, 1.35)];
  car.add(...wheels);
  channels.travel = { value: 0, apply: (v) => wheels.forEach((w) => (w.rotation.x = -v / WHEEL_R)) };
  return setChannels(car, channels);
}, 'vehicle');
