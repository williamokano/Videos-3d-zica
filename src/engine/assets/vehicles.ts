import * as THREE from 'three';
import { group, mat, rbox, registerAsset } from './registry';

const WHEEL_R = 0.33;

/*
 * The car faces -z. Left (driver) side is -x.
 * Channels: door.fl, door.fr, door.rl, door.rr (0 closed – 1 open), trunk, travel (meters rolled).
 * Anchors: seat.driver, seat.passenger, seat.rl, seat.rr, trunk, roof.
 */
registerAsset('vehicle.car', 'Carro de passeio com 4 portas que abrem, porta-malas e rodas que giram (params: color)', (p) => {
  const color = String(p.color ?? '#3f7fd1');
  const dark = '#2a2d34';
  const glassMat = new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.45, roughness: 0.1 });
  const car = group(
    rbox(1.74, 0.5, 4.2, color, [0, 0.6, 0], 0.12),
    rbox(1.6, 0.12, 4.3, dark, [0, 0.33, 0], 0.05),
    // Pillars and roof; the side glass belongs to the doors.
    rbox(1.5, 0.06, 2.0, color, [0, 1.42, 0.25], 0.03),
    rbox(1.5, 0.55, 0.06, color, [0, 1.12, 1.28], 0.02),
    rbox(0.5, 0.1, 0.06, '#fff6c9', [-0.55, 0.68, -2.1], 0.02),
    rbox(0.5, 0.1, 0.06, '#fff6c9', [0.55, 0.68, -2.1], 0.02),
    rbox(0.5, 0.1, 0.06, '#d94b4b', [-0.55, 0.68, 2.1], 0.02),
    rbox(0.5, 0.1, 0.06, '#d94b4b', [0.55, 0.68, 2.1], 0.02),
    // Seats.
    rbox(0.5, 0.5, 0.5, dark, [-0.4, 0.75, -0.15], 0.05),
    rbox(0.5, 0.5, 0.5, dark, [0.4, 0.75, -0.15], 0.05),
    rbox(1.4, 0.5, 0.5, dark, [0, 0.75, 0.85], 0.05),
  );
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.6, 0.04), glassMat);
  windshield.position.set(0, 1.12, -0.82);
  windshield.rotation.x = 0.35;
  windshield.userData.noShadow = true;
  car.add(windshield);

  const channels: Record<string, { initial: number; set(v: number): void }> = {};
  const anchors: Record<string, THREE.Object3D> = {};

  const wheels: THREE.Object3D[] = [];
  for (const x of [-0.82, 0.82]) {
    for (const z of [-1.35, 1.35]) {
      const wheel = new THREE.Group();
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.24, 20), mat(dark));
      tyre.rotation.z = Math.PI / 2;
      wheel.add(tyre, rbox(0.26, 0.34, 0.08, '#c9ced6', [0, 0, 0], 0.02));
      wheel.position.set(x, WHEEL_R, z);
      wheels.push(wheel);
      car.add(wheel);
    }
  }
  channels.travel = { initial: 0, set: (meters) => wheels.forEach((w) => (w.rotation.x = -meters / WHEEL_R)) };

  // Doors hinge at their front edge and swing away from the body.
  const door = (name: string, side: -1 | 1, zFront: number, length: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.88, 0, zFront);
    const panel = rbox(0.05, 0.48, length - 0.03, color, [0, 0.62, length / 2], 0.02);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, length - 0.08), glassMat);
    glass.position.set(-side * 0.04, 1.13, length / 2);
    glass.userData.noShadow = true;
    pivot.add(panel, glass, rbox(0.03, 0.03, 0.14, '#d0d4dc', [side * 0.03, 0.78, length - 0.2], 0.01));
    car.add(pivot);
    channels[name] = { initial: 0, set: (open) => (pivot.rotation.y = side * open * 1.15) };
  };
  door('door.fl', -1, -0.8, 1.05);
  door('door.fr', 1, -0.8, 1.05);
  door('door.rl', -1, 0.27, 1.0);
  door('door.rr', 1, 0.27, 1.0);

  const lid = new THREE.Group();
  lid.position.set(0, 0.86, 1.3);
  lid.add(rbox(1.6, 0.05, 0.78, color, [0, 0, 0.39], 0.02));
  car.add(lid);
  channels.trunk = { initial: 0, set: (open) => (lid.rotation.x = -open * 1.2) };

  const anchor = (name: string, x: number, y: number, z: number) => {
    const point = new THREE.Object3D();
    point.position.set(x, y, z);
    car.add(point);
    anchors[name] = point;
  };
  anchor('seat.driver', -0.4, 1.0, -0.15);
  anchor('seat.passenger', 0.4, 1.0, -0.15);
  anchor('seat.rl', -0.4, 1.0, 0.85);
  anchor('seat.rr', 0.4, 1.0, 0.85);
  anchor('trunk', 0, 0.5, 1.7);
  anchor('roof', 0, 1.45, 0.25);

  car.userData.channels = channels;
  car.userData.anchors = anchors;
  return car;
});
