import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { group, mat, place, rbox, registerAsset, setChannels, type AssetChannels } from './registry';

const WHEEL_R = 0.33;
const DOOR_ANGLE = THREE.MathUtils.degToRad(62);
const glass = new THREE.MeshStandardMaterial({ color: '#9fd0ee', transparent: true, opacity: 0.4, roughness: 0.1 });
/** Glass seen from both sides: a flat pane has no back. */
const sideGlassMaterial = new THREE.MeshStandardMaterial({ color: '#9fd0ee', transparent: true, opacity: 0.4, roughness: 0.1, side: THREE.DoubleSide });

/** A wheel standing on the ground at (x, z), turning around the x axis. Any size: a car's, a bus's. */
function wheel(x: number, z: number, radius = WHEEL_R, width = 0.22): THREE.Group {
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 20), mat('#22242a'));
  tyre.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, width + 0.02, 12), mat('#c9ccd3'));
  hub.rotation.z = Math.PI / 2;
  // Spokes make the spin visible.
  const g = group(tyre, hub, rbox(width + 0.03, radius * 0.9, 0.06, '#8d919b', [0, 0, 0], 0.01), rbox(width + 0.03, 0.06, radius * 0.9, '#8d919b', [0, 0, 0], 0.01));
  g.position.set(x, radius, z);
  // It rolls about its axle whichever way it is steered.
  g.rotation.order = 'YXZ';
  return g;
}


/**
 * What makes a vehicle move like one: `travel` (meters rolled) turns the wheels, and `steer` (degrees, positive
 * to the left) turns the front ones. `drive` writes both.
 */
const rolling = (wheels: THREE.Object3D[], radius: number, front: THREE.Object3D[] = []): AssetChannels => ({
  travel: { value: 0, apply: (v) => wheels.forEach((w) => (w.rotation.x = -v / radius)) },
  ...(front.length ? { steer: { value: 0, apply: (v: number) => front.forEach((w) => (w.rotation.y = THREE.MathUtils.degToRad(v))) } } : {}),
});

/**
 * Headlights and tail lights that can be switched (`lights`, 0 or 1): lit, they glow; they do not light the scene.
 * `at` are the lamps as [x, y, z, width, color].
 */
function lamps(parent: THREE.Object3D, at: [number, number, number, number, string][]): AssetChannels {
  const made = at.map(([x, y, z, w, color]) => {
    const [bright, dim] = [new THREE.MeshBasicMaterial({ color }), mat(`#${new THREE.Color(color).multiplyScalar(0.72).getHexString()}`)];
    const mesh = rbox(w, 0.14, 0.05, color, [x, y, z], 0.02);
    mesh.userData.noShadow = true;
    parent.add(mesh);
    return { mesh, bright, dim };
  });
  return { lights: { value: 0, apply: (v) => made.forEach(({ mesh, bright, dim }) => (mesh.material = v > 0.5 ? bright : dim)) } };
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
registerAsset('vehicle.car', 'Carro de quatro portas, de frente para -z; portas e rodas animáveis por ações (params: color)', (p) => buildCar(String(p.color ?? '#d94f3d')).car, 'vehicle');

/** The car, in a color: the base of every car-sized vehicle. `doors` gives the doors their own color (a livery). */
function buildCar(color: string, doorColor = color): { car: THREE.Group; channels: AssetChannels } {
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
  const lights = lamps(car, [[-0.6, 0.8, -2.11, 0.32, '#fff2b8'], [0.6, 0.8, -2.11, 0.32, '#fff2b8'], [-0.6, 0.82, 2.11, 0.32, '#e0271b'], [0.6, 0.82, 2.11, 0.32, '#e0271b']]);
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
    car.add(rbox(0.56, 0.14, 0.5, '#4a4f5c', [x, 0.49, z], 0.04), rbox(0.56, 0.6, 0.12, '#4a4f5c', [x, 0.82, z + 0.3], 0.04),
      // The driver holds the wheel.
      place(name, x, 0.56, z, 0, name === 'driver' ? { hands: [[-0.55, 0.98, -0.48], [-0.25, 0.98, -0.48]] } : {}));
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
      rbox(THICK, BELT - SILL, length, doorColor, [0, (BELT + SILL) / 2, length / 2], 0.025),
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
  Object.assign(channels, rolling(wheels, WHEEL_R, wheels.slice(0, 2)), lights);
  setChannels(car, channels);
  return { car, channels };
}

/** A lamp that is seen lit (it gives no light to the scene): on or off by showing one of two materials. */
function beacon(w: number, h: number, d: number, on: string, pos: [number, number, number]): { mesh: THREE.Mesh; lit(yes: boolean): void } {
  const [bright, dim] = [new THREE.MeshBasicMaterial({ color: on }), mat(`#${new THREE.Color(on).multiplyScalar(0.35).getHexString()}`)];
  const mesh = rbox(w, h, d, on, pos, Math.min(w, h, d) * 0.3);
  mesh.material = dim;
  mesh.userData.noShadow = true;
  return { mesh, lit: (yes) => (mesh.material = yes ? bright : dim) };
}

registerAsset(
  'vehicle.policeCar',
  'Viatura de polícia: o carro com pintura, giroflex no teto e rádio no painel. Canal `siren` (0 ou 1) liga o giroflex, que pisca com o tempo do episódio; portas e rodas como no carro (params: color, doors — cor das portas —, stripe)',
  (p) => {
    const { car, channels } = buildCar(String(p.color ?? '#f2f3f5'), String(p.doors ?? '#1f2a3d'));
    const stripe = String(p.stripe ?? '#e9b13a');
    // A stripe along the bonnet and the boot, and the light bar across the roof.
    car.add(rbox(HALF * 2 + 0.01, 0.07, 1.2, stripe, [0, 0.7, -1.48], 0.02), rbox(HALF * 2 + 0.01, 0.07, 0.8, stripe, [0, 0.7, 1.68], 0.02));
    car.add(rbox(1.1, 0.05, 0.3, '#2b2e36', [0, ROOF + 0.06, 0.25], 0.02));
    const [red, blue] = [beacon(0.48, 0.12, 0.24, '#ff2d2d', [-0.28, ROOF + 0.14, 0.25]), beacon(0.48, 0.12, 0.24, '#2d6bff', [0.28, ROOF + 0.14, 0.25])];
    car.add(red.mesh, blue.mesh, rbox(0.08, 0.1, 0.22, '#e9ecef', [0, ROOF + 0.14, 0.25], 0.02));
    // The radio on the dashboard, with its handset on a coiled cord.
    car.add(rbox(0.2, 0.07, 0.12, '#15171b', [0.05, 0.98, -0.78], 0.015), rbox(0.05, 0.09, 0.04, '#22262e', [0.2, 1.0, -0.74], 0.012), rbox(0.14, 0.012, 0.012, '#3d424c', [0.13, 0.97, -0.72], 0.004));
    let siren = 0;
    channels.siren = { value: 0, apply: (v) => (siren = v) };
    // Red and blue take turns, each with a double flash, as a real light bar does.
    car.userData.animate = (t: number) => {
      const on = siren > 0.5;
      const phase = (t * 2.2) % 1;
      const flash = (from: number) => on && phase >= from && phase < from + 0.5 && Math.floor((phase - from) * 8) % 2 === 0;
      red.lit(flash(0));
      blue.lit(flash(0.5));
    };
    setChannels(car, channels);
    return car;
  },
  'vehicle',
);

registerAsset(
  'vehicle.bus',
  'Ônibus urbano, de frente para -z, com porta na frente e atrás do lado direito (canais `frontDoor.open` e `rearDoor.open`, de 0 a 1), banco do motorista (`driver`) e bancos de passageiro (`p1` a `p8`); rodas giram com `travel` (params: color, stripe)',
  (p) => {
    const color = String(p.color ?? '#e8eaee');
    const stripe = String(p.stripe ?? '#2f6fc4');
    const [W, L, FLOOR, TOP] = [2.5, 10.4, 0.42, 3.05];
    const [half, front] = [W / 2, -L / 2];
    const R = 0.48;
    const bus = group(
      rbox(W - 0.1, 0.24, L - 0.2, '#2b2e36', [0, FLOOR - 0.02, 0], 0.05),
      // Roof, front, back and the left side whole; the right side is in pieces around the two doors.
      rbox(W, 0.12, L, color, [0, TOP, 0], 0.05),
      rbox(W, 1.0, 0.1, color, [0, FLOOR + 0.6, front + 0.05], 0.04),
      rbox(W, TOP - FLOOR, 0.1, color, [0, (TOP + FLOOR) / 2, -front - 0.05], 0.04),
      rbox(0.08, 0.95, L - 0.2, color, [-half + 0.04, FLOOR + 0.55, 0], 0.03),
      rbox(0.085, 0.3, L - 0.2, stripe, [-half + 0.04, FLOOR + 0.5, 0], 0.02),
      rbox(0.08, 0.35, L - 0.2, color, [-half + 0.04, TOP - 0.2, 0], 0.03),
      // The destination sign above the windscreen, bumpers and lights.
      rbox(1.7, 0.26, 0.06, '#15171b', [0, TOP - 0.28, front - 0.01], 0.02),
      rbox(W + 0.04, 0.2, 0.14, '#2b2e36', [0, FLOOR + 0.04, front - 0.02], 0.05),
      rbox(W + 0.04, 0.2, 0.14, '#2b2e36', [0, FLOOR + 0.04, -front + 0.02], 0.05),
    );
    const lights = lamps(bus, [[-0.85, FLOOR + 0.36, front - 0.01, 0.36, '#fff2b8'], [0.85, FLOOR + 0.36, front - 0.01, 0.36, '#fff2b8'], [-0.85, FLOOR + 0.5, -front + 0.01, 0.3, '#e0271b'], [0.85, FLOOR + 0.5, -front + 0.01, 0.3, '#e0271b']]);
    const pane = (w: number, h: number, d: number, at: [number, number, number]) => {
      const mesh = rbox(w, h, d, '#9fd0ee', at, 0.01);
      mesh.material = sideGlassMaterial;
      mesh.userData.noShadow = true;
      return mesh;
    };
    // Windscreen, rear window and the long window of the left side.
    bus.add(pane(W - 0.16, 1.25, 0.04, [0, FLOOR + 1.75, front + 0.04]), pane(W - 0.3, 0.9, 0.04, [0, FLOOR + 1.9, -front - 0.04]), pane(0.03, 1.1, L - 0.6, [-half + 0.03, FLOOR + 1.6, 0]));
    for (let z = front + 1.2; z < -front - 0.3; z += 1.3) bus.add(rbox(0.09, 1.15, 0.08, color, [-half + 0.04, FLOOR + 1.6, z], 0.02));

    // The right side: wall and window between the doors and around them.
    const DOOR_W = 1.15;
    const doorsAt: [string, number][] = [['frontDoor', front + 0.25], ['rearDoor', 1.6]];
    const solid: [number, number][] = [[front + 0.25 + DOOR_W, 1.6], [1.6 + DOOR_W, -front - 0.1]];
    for (const [from, to] of solid) {
      const [mid, len] = [(from + to) / 2, to - from];
      bus.add(
        rbox(0.08, 0.95, len, color, [half - 0.04, FLOOR + 0.55, mid], 0.03), rbox(0.085, 0.3, len, stripe, [half - 0.04, FLOOR + 0.5, mid], 0.02),
        rbox(0.08, 0.35, len, color, [half - 0.04, TOP - 0.2, mid], 0.03), pane(0.03, 1.1, len, [half - 0.03, FLOOR + 1.6, mid]),
      );
    }
    bus.add(rbox(0.08, TOP - FLOOR, 0.25, color, [half - 0.04, (TOP + FLOOR) / 2, front + 0.125], 0.03));
    const channels: AssetChannels = {};
    for (const [name, z0] of doorsAt) {
      bus.add(rbox(0.08, 0.3, DOOR_W, color, [half - 0.04, TOP - 0.17, z0 + DOOR_W / 2], 0.02));
      // Two leaves that fold in, each turning on its outer edge.
      const leaves = [0, 1].map((k) => {
        const hinge = new THREE.Group();
        hinge.position.set(half - 0.05, 0, z0 + k * DOOR_W);
        const dir = k ? -1 : 1;
        hinge.add(rbox(0.05, 1.0, DOOR_W / 2 - 0.02, stripe, [0, FLOOR + 0.52, (dir * DOOR_W) / 4], 0.015), pane(0.03, 1.25, DOOR_W / 2 - 0.06, [0, FLOOR + 1.7, (dir * DOOR_W) / 4]));
        bus.add(hinge);
        return { hinge, dir };
      });
      channels[`${name}.open`] = { value: 0, apply: (v) => leaves.forEach(({ hinge, dir }) => (hinge.rotation.y = dir * v * 1.45)) };
    }

    // Driver on the left at the front; passengers in pairs along the left side, facing forward.
    const chair = (name: string, x: number, z: number) => {
      bus.add(rbox(0.46, 0.1, 0.44, '#3f6aa8', [x, FLOOR + 0.52, z], 0.03), rbox(0.46, 0.62, 0.08, '#3f6aa8', [x, FLOOR + 0.86, z + 0.24], 0.03));
      bus.add(place(name, x, FLOOR + 0.57, z, 0, name === 'driver' ? { hands: [[x - 0.2, FLOOR + 1.0, z - 0.42], [x + 0.2, FLOOR + 1.0, z - 0.42]] } : {}));
    };
    chair('driver', -0.72, front + 1.0);
    const wheelAt = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20), mat('#15161a'));
    wheelAt.position.set(-0.72, FLOOR + 1.02, front + 0.55);
    wheelAt.rotation.x = -0.9;
    bus.add(wheelAt, rbox(0.9, 0.5, 0.25, '#2b2e36', [-0.6, FLOOR + 0.7, front + 0.3], 0.04));
    for (let i = 0; i < 8; i++) chair(`p${i + 1}`, i % 2 ? -0.38 : -0.92, front + 2.6 + Math.floor(i / 2) * 1.15);
    // Grab rails along the aisle.
    bus.add(rbox(0.03, 0.03, L - 2.4, '#d9b04a', [0.2, TOP - 0.45, 0.6], 0.01));

    const wheels = [wheel(-half + 0.2, front + 2.0, R, 0.3), wheel(half - 0.2, front + 2.0, R, 0.3), wheel(-half + 0.2, -front - 2.6, R, 0.3), wheel(half - 0.2, -front - 2.6, R, 0.3)];
    bus.add(...wheels);
    Object.assign(channels, rolling(wheels, R, wheels.slice(0, 2)), lights);
    return setChannels(bus, channels);
  },
  'vehicle',
);

registerAsset(
  'vehicle.bicycle',
  'Bicicleta, de frente para -z: rodas giram com `travel`, e o selim é um assento (`driver`) para alguém montar (params: color)',
  (p) => {
    const color = String(p.color ?? '#2f8f6b');
    const R = 0.34;
    const tube = (from: [number, number], to: [number, number], thick = 0.035) => slab(thick, thick, from, to, 0, mat(color));
    const ring = (z: number) => {
      const g = new THREE.Group();
      g.position.set(0, R, z);
      g.rotation.order = 'YXZ';
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(R - 0.03, 0.028, 8, 28).rotateY(Math.PI / 2), mat('#22242a'));
      g.add(tyre, rbox(0.012, (R - 0.04) * 2, 0.012, '#b9bcc2', [0, 0, 0], 0.004), rbox(0.012, 0.012, (R - 0.04) * 2, '#b9bcc2', [0, 0, 0], 0.004), rbox(0.06, 0.06, 0.06, '#8d919b', [0, 0, 0], 0.02));
      return g;
    };
    const [frontWheel, rearWheel] = [ring(-0.52), ring(0.52)];
    // Side view, as [z, y]: the diamond of the frame, the fork, the seat post and the stem.
    const [bottom, seat, head, rearHub, frontHub]: [number, number][] = [[0.06, 0.3], [0.2, 0.84], [-0.36, 0.86], [0.52, R], [-0.52, R]];
    const bike = group(
      frontWheel, rearWheel,
      tube(bottom, seat), tube(seat, head), tube(head, bottom), tube(bottom, rearHub, 0.028), tube(seat, rearHub, 0.028), tube(head, frontHub, 0.03),
      tube(seat, [0.22, 0.95], 0.028), tube(head, [-0.38, 1.02], 0.028),
      rbox(0.12, 0.05, 0.26, '#15171b', [0, 0.97, 0.24], 0.02),
      rbox(0.52, 0.03, 0.03, '#15171b', [0, 1.03, -0.39], 0.012),
      rbox(0.09, 0.035, 0.035, '#15171b', [-0.24, 1.03, -0.36], 0.014), rbox(0.09, 0.035, 0.035, '#15171b', [0.24, 1.03, -0.36], 0.014),
      // Pedals on their cranks.
      rbox(0.3, 0.03, 0.03, '#8d919b', [0, 0.3, 0.06], 0.01), rbox(0.09, 0.02, 0.07, '#15171b', [-0.17, 0.3, 0.06], 0.008), rbox(0.09, 0.02, 0.07, '#15171b', [0.17, 0.3, 0.06], 0.008),
      // Whoever rides holds the handlebars and pedals.
      place('driver', 0, 0.99, 0.24, 0, { hands: [[-0.24, 1.05, -0.36], [0.24, 1.05, -0.36]], pedals: true }),
    );
    return setChannels(bike, rolling([frontWheel, rearWheel], R, [frontWheel]));
  },
  'vehicle',
);
