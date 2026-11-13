import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import './assets';
import { createAsset, listAssets } from './assets/registry';
import { buildLocation } from './world/build';

const meshes = (o: THREE.Object3D): THREE.Mesh[] => {
  const out: THREE.Mesh[] = [];
  o.traverse((c) => void (c instanceof THREE.Mesh && out.push(c)));
  return out;
};
const size = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());

describe('scenery assets', () => {
  it('registers the new kit', () => {
    const ids = listAssets().map((a) => a.id);
    for (const id of ['light.tubeLamp', 'school.ceilingFan', 'school.speaker', 'structure.fence', 'structure.gate', 'nature.grass', 'nature.weeds', 'school.concreteTable', 'structure.canopy', 'backdrop.house', 'backdrop.skyline']) expect(ids).toContain(id);
  });

  it('a fence of any length is a handful of meshes, not one per bar', () => {
    const fence = createAsset('structure.fence', { length: 40 });
    expect(meshes(fence).length).toBeLessThanOrEqual(3);
    expect(size(fence).x).toBeCloseTo(40, 0);
    expect(size(fence).y).toBeCloseTo(1.9, 1);
  });

  it('a tube lamp hangs from its origin and lights only when asked', () => {
    const lit = createAsset('light.tubeLamp');
    const dark = createAsset('light.tubeLamp', { intensity: 0 });
    const lights = (o: THREE.Object3D) => o.children.filter((c) => c instanceof THREE.PointLight).length;
    expect([lights(lit), lights(dark)]).toEqual([1, 0]);
    expect(new THREE.Box3().setFromObject(lit).max.y).toBeLessThanOrEqual(0.001);
  });

  it('the fan turns with the time it is given, the same for the same time', () => {
    const fan = createAsset('school.ceilingFan');
    const rotor = fan.children[fan.children.length - 1];
    const animate = fan.userData.animate as (t: number) => void;
    animate(0.25);
    const a = rotor.rotation.y;
    animate(0.5);
    expect(rotor.rotation.y).not.toBe(a);
    animate(0.25);
    expect(rotor.rotation.y).toBe(a);
    expect(createAsset('school.ceilingFan', { speed: 0 }).userData.animate).toBeUndefined();
  });

  it('the gate slides open along its rail', () => {
    const gate = createAsset('structure.gate', { width: 3 });
    const channels = gate.userData.channels as Record<string, { apply(v: number): void }>;
    const leaf = gate.children[gate.children.length - 1];
    channels.open.apply(1);
    expect(leaf.position.x).toBeCloseTo(2.9);
  });

  it('grass is one mesh of many tufts, and concrete tables come in three kinds', () => {
    const grass = createAsset('nature.grass', { width: 10, depth: 10, density: 4 });
    const tufts = meshes(grass)[0] as THREE.InstancedMesh;
    expect(tufts.count).toBe(400);
    for (const params of [{ shape: 'round', seats: 'stools' }, { shape: 'round', seats: 'benches' }, { shape: 'rect', seats: 'benches' }]) {
      const table = createAsset('school.concreteTable', params);
      expect(size(table).y).toBeGreaterThan(0.7);
      expect(size(table).x).toBeGreaterThan(1.4);
    }
  });

  it('a painted skyline stands in an arc around its origin', () => {
    const skyline = createAsset('backdrop.skyline', { radius: 100, count: 8 });
    expect(skyline.children).toHaveLength(8);
    for (const card of skyline.children) expect(Math.hypot(card.position.x, card.position.z)).toBeGreaterThan(90);
  });

  it('what is walked through or under does not block the way, and moving props are listed', () => {
    const built = buildLocation({
      id: 't', name: 't', ground: { color: '#fff', size: 40 },
      rooms: [{ id: 'r', name: 'r', origin: [0, 0], size: [10, 10], outdoor: true, floorColor: '#ccc', props: [
        { asset: 'structure.canopy', pos: [5, 5], params: { length: 8 } },
        { asset: 'nature.grass', pos: [5, 5] },
        { asset: 'school.ceilingFan', pos: [5, 5], y: 2.9 },
      ] }],
    });
    expect(built.colliders).toHaveLength(0);
    expect(built.animated).toHaveLength(1);
    const fenced = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 40 }, rooms: [], props: [{ asset: 'structure.fence', pos: [0, 0], params: { length: 6 } }] });
    expect(fenced.colliders).toHaveLength(1);
  });
});

describe('vehicles', () => {
  const channelsOf = (o: THREE.Object3D) => o.userData.channels as Record<string, { value: number; apply(v: number): void }>;
  const seatsOf = (o: THREE.Object3D) => o.children.filter((c) => c.name.startsWith('seat.')).map((c) => c.name.slice(5));

  it('the police car is the car with a light bar that flashes with the clock, only with the siren on', () => {
    const car = createAsset('vehicle.policeCar');
    expect(Object.keys(channelsOf(car))).toEqual(expect.arrayContaining(['frontLeft.open', 'travel', 'siren']));
    expect(seatsOf(car)).toEqual(['driver', 'passenger', 'rearLeft', 'rearRight']);
    const animate = car.userData.animate as (t: number) => void;
    const lit = () => meshes(car).filter((m) => m.material instanceof THREE.MeshBasicMaterial).length;
    animate(0.05);
    expect(lit()).toBe(0);
    channelsOf(car).siren.apply(1);
    const seen = new Set<number>();
    for (let t = 0; t < 1; t += 1 / 30) {
      animate(t);
      seen.add(lit());
    }
    // Sometimes one lamp is lit, sometimes none; never both at once.
    expect([...seen].sort()).toEqual([0, 1]);
    animate(0.3);
    const first = lit();
    animate(0.3);
    expect(lit()).toBe(first);
  });

  it('the bus has a door at the front and one at the back, a driver seat and passenger seats', () => {
    const bus = createAsset('vehicle.bus');
    expect(Object.keys(channelsOf(bus))).toEqual(expect.arrayContaining(['frontDoor.open', 'rearDoor.open', 'travel']));
    expect(seatsOf(bus)).toEqual(['driver', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']);
    expect(size(bus).z).toBeGreaterThan(10);
    expect(size(bus).y).toBeGreaterThan(3);
  });

  it('the bicycle rolls and can be sat on', () => {
    const bike = createAsset('vehicle.bicycle');
    expect(seatsOf(bike)).toEqual(['driver']);
    const wheel = bike.children[0];
    channelsOf(bike).travel.apply(1);
    expect(wheel.rotation.x).not.toBe(0);
  });

  it('a vehicle of an episode is animated as an interactive object', async () => {
    const { buildProp } = await import('./world/build');
    const car = buildProp({ id: 'viatura', asset: 'vehicle.policeCar', pos: [0, 0] });
    expect(car.kind).toBe('vehicle');
    expect(typeof car.tick).toBe('function');
    expect(car.channels.siren).toBe(0);
  });
});

describe('street kit', () => {
  const channelsOf = (o: THREE.Object3D) => o.userData.channels as Record<string, { value: number; apply(v: number): void }>;
  const litOf = (o: THREE.Object3D) => meshes(o).filter((m) => m.material instanceof THREE.MeshBasicMaterial).length;

  it('registers the kit', () => {
    const ids = listAssets().map((a) => a.id);
    for (const id of ['street.lightPole', 'street.trafficLight', 'street.sign', 'street.cone', 'street.barrier', 'street.trashBin', 'street.busStop', 'street.crosswalk', 'street.manhole', 'item.radio', 'vehicle.policeCar', 'vehicle.bus', 'vehicle.bicycle']) expect(ids).toContain(id);
  });

  it('a street lamp goes on and off, and a failing one flickers with the clock', () => {
    const pole = createAsset('street.lightPole');
    expect(litOf(pole)).toBe(1);
    channelsOf(pole).on.apply(0);
    expect(litOf(pole)).toBe(0);
    expect(pole.userData.animate).toBeUndefined();
    const failing = createAsset('street.lightPole', { flicker: 1 });
    const seen = new Set<number>();
    for (let t = 0; t < 3; t += 1 / 30) {
      (failing.userData.animate as (t: number) => void)(t);
      seen.add(litOf(failing));
    }
    expect([...seen].sort()).toEqual([0, 1]);
  });

  it('a traffic light shows one lamp at a time, by its state or by the clock', () => {
    const light = createAsset('street.trafficLight', { cycle: 1 });
    for (const state of [0, 1, 2]) {
      channelsOf(light).state.apply(state);
      expect(litOf(light)).toBe(1);
    }
    channelsOf(light).state.apply(3);
    expect(litOf(light)).toBe(0);
    (light.userData.animate as (t: number) => void)(7);
    expect(litOf(light)).toBe(1);
  });

  it('barriers come in three kinds, the bus stop has seats, and what lies on the ground is walked over', () => {
    for (const kind of ['wood', 'steel', 'plastic']) {
      const barrier = createAsset('street.barrier', { kind });
      expect(size(barrier).x).toBeGreaterThan(1.4);
      expect(size(barrier).y).toBeGreaterThan(0.8);
    }
    expect(createAsset('street.busStop').children.filter((c) => c.name.startsWith('seat.'))).toHaveLength(3);
    expect(size(createAsset('street.cone')).y).toBeCloseTo(0.75, 1);
    const built = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 40 }, rooms: [], props: [
      { asset: 'street.crosswalk', pos: [0, 0] }, { asset: 'street.manhole', pos: [3, 0] }, { asset: 'street.barrier', pos: [8, 0] },
    ] });
    expect(built.colliders).toHaveLength(1);
  });
});
