import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import './assets';
import { createAsset, listAssets } from './assets/registry';
import { evaluateActions } from './actions/catalog';
import './actions/character';
import { direct, resolveScript } from './timeline/direct';
import { buildCast, compileEpisode } from './timeline/stage';
import { buildLocation } from './world/build';
import type { Prop } from './world/types';

const size = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
const place = (props: Prop[]) => buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 80 }, rooms: [], props });
/** Whether a point on the ground is inside some collider. */
const blocked = (built: ReturnType<typeof place>, x: number, z: number) => built.colliders.some((c) => !c.disabled && x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ);

describe('ancient kit', () => {
  it('every asset builds with its defaults and stands on the ground', () => {
    // Things that hang have their origin where they hang from (the episode sets their height): they hang below it.
    const hanging = ['ancient.hangingCloth', 'ancient.herbBundle'];
    const ids = listAssets().map((a) => a.id).filter((id) => id.startsWith('ancient.'));
    expect(ids.length).toBeGreaterThanOrEqual(39);
    for (const id of hanging) {
      const box = new THREE.Box3().setFromObject(createAsset(id));
      expect(box.max.y, id).toBeLessThan(0.05);
      expect(box.min.y, id).toBeLessThan(-0.3);
    }
    for (const id of ids.filter((id) => !hanging.includes(id))) {
      const box = new THREE.Box3().setFromObject(createAsset(id));
      expect(box.min.y, id).toBeGreaterThan(-0.25);
      expect(box.min.y, id).toBeLessThan(0.05);
    }
  });

  it('the city gate lets people through the arch but not through its towers', () => {
    const built = place([{ asset: 'ancient.cityGate', pos: [0, 0] }]);
    expect(blocked(built, 0, 0)).toBe(false);
    expect(blocked(built, 0, 1)).toBe(false);
    expect(blocked(built, 4, 0)).toBe(true);
    expect(blocked(built, -4, 0)).toBe(true);
  });

  it('the inside of the royal tent is free to walk, its walls are not', () => {
    const built = place([{ asset: 'ancient.royalTent', pos: [0, 0], params: { width: 7, depth: 6 } }]);
    expect(blocked(built, 0, 0)).toBe(false);
    expect(blocked(built, 1.5, -1.5)).toBe(false);
    expect(blocked(built, 0, -3)).toBe(true);
    expect(blocked(built, 3.5, 0)).toBe(true);
  });

  it('stream, pebbles and rug are walked on; rocks, tents and walls block', () => {
    expect(place([{ asset: 'ancient.stream', pos: [0, 0] }, { asset: 'ancient.pebbles', pos: [0, 5] }, { asset: 'ancient.rug', pos: [5, 5] }]).colliders).toHaveLength(0);
    expect(place([{ asset: 'ancient.boulder', pos: [0, 0] }, { asset: 'ancient.tent', pos: [10, 0] }, { asset: 'ancient.wall', pos: [20, 0] }]).colliders).toHaveLength(3);
  });

  it('fire, banners, the stream and the donkey move by themselves', () => {
    for (const id of ['ancient.campfire', 'ancient.banner', 'ancient.stream', 'ancient.hitchedDonkey', 'ancient.royalTent']) {
      expect(typeof createAsset(id).userData.animate, id).toBe('function');
    }
    expect(createAsset('ancient.campfire', { lit: 0 }).userData.animate).toBeUndefined();
    const fire = createAsset('ancient.campfire', { intensity: 3 });
    const light = (o: THREE.Object3D) => {
      let found: THREE.PointLight | undefined;
      o.traverse((c) => void (c instanceof THREE.PointLight && (found = c)));
      return found;
    };
    expect(light(createAsset('ancient.campfire'))).toBeUndefined();
    (fire.userData.animate as (t: number) => void)(1.3);
    expect(light(fire)!.intensity).toBeGreaterThan(2);
  });

  it('sizes follow the params', () => {
    expect(size(createAsset('ancient.wall', { length: 12 })).x).toBeCloseTo(12, 0);
    expect(size(createAsset('ancient.stream', { length: 20, width: 2 })).x).toBeGreaterThan(19.9);
    expect(size(createAsset('ancient.jar', { size: 1 })).y).toBeCloseTo(0.94, 1);
    expect(size(createAsset('ancient.palm', { height: 8, seed: 2 })).y).toBeGreaterThan(7);
    const chest = createAsset('ancient.chest');
    (chest.userData.channels as Record<string, { apply(v: number): void }>).open.apply(1);
    expect(size(chest).y).toBeGreaterThan(0.8);
  });

  it('sheep, the flock and the heifer stand on the ground and live by themselves', () => {
    const anim = (o: THREE.Object3D) => o.userData.animate as (t: number) => void;
    for (const id of ['ancient.sheep', 'ancient.flock', 'ancient.heifer']) expect(typeof createAsset(id).userData.animate, id).toBe('function');
    // A sheep is about 0.75 m to the back and grazes: its head goes down to the grass and up again.
    const sheep = createAsset('ancient.sheep', { seed: 3 });
    const heads = Array.from({ length: 60 }, (_, i) => {
      anim(sheep)(i * 0.5);
      return new THREE.Box3().setFromObject(sheep.children[1], true).min.y;
    });
    expect(Math.min(...heads)).toBeLessThan(0.08);
    expect(Math.max(...heads)).toBeGreaterThan(0.3);
    expect(size(sheep).y).toBeGreaterThan(0.65);
    expect(size(sheep).y).toBeLessThan(0.95);
    // Two sheep of different seeds do not graze in step.
    const other = createAsset('ancient.sheep', { seed: 4 });
    anim(sheep)(7);
    anim(other)(7);
    expect(sheep.children[1].matrix.equals(other.children[1].matrix)).toBe(false);
    // The heifer: 1.2 m at the shoulder, its tail swishes, the rope reaches the ground.
    const heifer = createAsset('ancient.heifer');
    expect(size(heifer).y).toBeGreaterThan(1.2);
    expect(size(heifer).y).toBeLessThan(1.6);
    const tail = () => heifer.children.at(-1)!.rotation.z;
    const tails = [0.5, 1.4, 2.3, 3.1, 4.4].map((t) => (anim(heifer)(t), tail()));
    expect(new Set(tails.map((v) => v.toFixed(4))).size).toBeGreaterThan(1);
    expect(new THREE.Box3().setFromObject(createAsset('ancient.heifer', { rope: 1 })).min.z).toBeLessThan(new THREE.Box3().setFromObject(heifer).min.z - 0.4);
  });

  it('a flock is walked through, wanders inside its area and never in step', () => {
    expect(place([{ asset: 'ancient.flock', pos: [0, 0], params: { count: 30 } }]).colliders).toHaveLength(0);
    expect(place([{ asset: 'ancient.sheep', pos: [0, 0] }, { asset: 'ancient.heifer', pos: [5, 0] }]).colliders).toHaveLength(2);
    const [width, depth, count] = [10, 6, 20];
    const flock = createAsset('ancient.flock', { count, width, depth, seed: 5 });
    const bodies = flock.children.find((c) => c instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
    expect(bodies.count).toBe(count);
    const m = new THREE.Matrix4();
    const where = (t: number) => {
      (flock.userData.animate as (t: number) => void)(t);
      return Array.from({ length: count }, (_, i) => new THREE.Vector3().setFromMatrixPosition((bodies.getMatrixAt(i, m), m)));
    };
    const start = where(0);
    let moved = 0;
    for (let t = 0; t < 300; t += 3.7) {
      const now = where(t);
      for (const p of now) {
        expect(Math.abs(p.x)).toBeLessThan(width / 2 - 0.5);
        expect(Math.abs(p.z)).toBeLessThan(depth / 2 - 0.5);
      }
      moved = Math.max(moved, ...now.map((p, i) => p.distanceTo(start[i])));
      // No two sheep on top of each other.
      for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) expect(now[i].distanceTo(now[j])).toBeGreaterThan(0.9);
    }
    expect(moved).toBeGreaterThan(0.3);
    // A pure function of the time: the same t draws the same flock.
    expect(where(42.5)).toEqual(where(42.5));
  });

  it('an oil lamp flickers, and lights only when asked', () => {
    const light = (o: THREE.Object3D) => {
      let found: THREE.PointLight | undefined;
      o.traverse((c) => void (c instanceof THREE.PointLight && (found = c)));
      return found;
    };
    expect(light(createAsset('ancient.oilLamp'))).toBeUndefined();
    expect(light(createAsset('ancient.lampStand'))).toBeUndefined();
    const lamp = createAsset('ancient.oilLamp', { intensity: 2 });
    expect(light(lamp)!.distance).toBe(6);
    expect(light(lamp)!.decay).toBe(2);
    expect(light(lamp)!.castShadow).toBe(false);
    expect(light(createAsset('ancient.oilLamp', { intensity: 2, shadow: 1 }))!.castShadow).toBe(true);
    const values = [0.1, 0.4, 0.9].map((t) => ((lamp.userData.animate as (t: number) => void)(t), light(lamp)!.intensity));
    expect(new Set(values).size).toBe(3);
    for (const v of values) expect(v).toBeGreaterThan(1.5);
    // On its stand the lamp is up at hand height; on a shelf, at the height the prop is put.
    const stand = createAsset('ancient.lampStand', { intensity: 2 });
    expect(light(stand)!.getWorldPosition(new THREE.Vector3()).y).toBeGreaterThan(1);
    expect(size(createAsset('ancient.oilLamp')).x).toBeLessThan(0.15);
  });

  it('the palace: torch on the wall, brazier, column and a throne to sit on', () => {
    const light = (o: THREE.Object3D) => {
      let found: THREE.PointLight | undefined;
      o.traverse((c) => void (c instanceof THREE.PointLight && (found = c)));
      return found;
    };
    for (const id of ['ancient.wallTorch', 'ancient.brazier']) {
      expect(light(createAsset(id)), id).toBeUndefined();
      const lit = createAsset(id, { intensity: 3 });
      const values = [0.2, 0.7].map((t) => ((lit.userData.animate as (t: number) => void)(t), light(lit)!.intensity));
      expect(values[0], id).not.toBeCloseTo(values[1]);
      expect(light(createAsset(id, { intensity: 3, shadow: 1 }))!.castShadow, id).toBe(true);
    }
    // The torch hangs on a wall: its back at z = 0, it reaches out toward +z.
    const torch = new THREE.Box3().setFromObject(createAsset('ancient.wallTorch'));
    expect(torch.min.z).toBeGreaterThan(-0.05);
    expect(torch.max.z).toBeGreaterThan(0.15);
    expect(size(createAsset('ancient.column')).y).toBeCloseTo(4.5, 1);
    expect(size(createAsset('ancient.column', { height: 3 })).y).toBeCloseTo(3, 1);
    expect(size(createAsset('ancient.brazier')).y).toBeGreaterThan(0.85);

    // Someone walks to the throne and sits on it, facing -z like the throne.
    const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 40 }, rooms: [{ id: 'r', name: 'r', origin: [0, 0], size: [12, 12], outdoor: true, floorColor: '#ccc', props: [{ id: 'trono', asset: 'ancient.throne', pos: [6, 6] }] }] });
    const throne = location.interactives.find((o) => o.id === 'trono')!;
    expect(Object.keys(throne.traits.sockets ?? {})).toContain('seat.throne');
    const saul = { id: 'saul', name: 'Saul' };
    const episode = resolveScript(direct({ episode: 1, title: 't', location: 't', cast: [{ character: 'saul', at: [6, 4.6], yaw: 180 }] }, (d) => {
      d.camera.cut({ pos: [6, 3, 12], lookAt: [6, 1, 6] });
      d.do('saul', 'sit', { on: 'trono', seat: 'throne' });
    }), location, [saul]);
    const compiled = compileEpisode(episode, location, buildCast(episode, [saul]));
    const end = evaluateActions(compiled, episode.duration).saul;
    expect(end.sit).toBeCloseTo(1);
    expect(end.attached).toBe(1);
    expect(compiled.links).toEqual([expect.objectContaining({ target: 'saul', to: 'trono', socket: 'seat.throne' })]);
    // The seat is on the cushion, the throne's own front.
    const [, y, , facing] = throne.traits.sockets!['seat.throne'];
    expect(y).toBeCloseTo(0.57, 2);
    expect(facing).toBe(0);
  });

  it('the house: a mud bench and a stool to sit on, at the heights asked', () => {
    const seats = (o: THREE.Object3D) => {
      const found: Record<string, THREE.Object3D> = {};
      o.traverse((c) => void (c.name.startsWith('seat.') && (found[c.name] = c)));
      return found;
    };
    // A seat every 0.6 m or so along the bench, on its top, whoever sits facing out from the wall (+z).
    const bench = seats(createAsset('ancient.mudBench'));
    expect(Object.keys(bench).sort()).toEqual(['seat.seat1', 'seat.seat2', 'seat.seat3', 'seat.top']);
    expect(Object.keys(seats(createAsset('ancient.mudBench', { length: 3.6 })))).toHaveLength(7);
    for (const name of ['seat.seat1', 'seat.seat2', 'seat.seat3']) {
      expect(bench[name].position.y).toBeCloseTo(0.42);
      expect(bench[name].position.z).toBeGreaterThan(0.1);
      expect(bench[name].position.z).toBeLessThan(0.4);
      expect(THREE.MathUtils.radToDeg(bench[name].rotation.y)).toBeCloseTo(180);
    }
    expect(bench['seat.seat1'].position.x).toBeLessThan(bench['seat.seat2'].position.x);
    expect(seats(createAsset('ancient.mudBench', { height: 0.5 }))['seat.seat1'].position.y).toBeCloseTo(0.5);
    // Against the wall: its back at z = 0, its size what was asked.
    const box = new THREE.Box3().setFromObject(createAsset('ancient.mudBench', { length: 3 }));
    expect(box.max.x - box.min.x).toBeCloseTo(3, 1);
    expect(box.min.z).toBeGreaterThan(-0.02);
    expect(box.max.z).toBeLessThan(0.52);
    expect(box.max.y).toBeCloseTo(0.42, 1);
    const stool = createAsset('ancient.stool');
    expect(seats(stool)['seat.seat'].position.y).toBeCloseTo(0.35);
    expect(size(stool).y).toBeCloseTo(0.36, 1);
    expect(seats(createAsset('ancient.woodTable'))['seat.top'].position.y).toBeCloseTo(0.624, 2);
    expect(seats(createAsset('ancient.woodTable', { cloth: 1 }))['seat.top'].position.y).toBeGreaterThan(0.627);

    // Someone walks up to the bench and sits on its second seat, facing out into the room.
    const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 40 }, rooms: [{ id: 'r', name: 'r', origin: [0, 0], size: [12, 12], outdoor: true, floorColor: '#ccc', props: [{ id: 'banco', asset: 'ancient.mudBench', pos: [6, 6] }] }] });
    const jesse = { id: 'jesse', name: 'Jessé' };
    const episode = resolveScript(direct({ episode: 1, title: 't', location: 't', cast: [{ character: 'jesse', at: [6, 7.2], yaw: 0 }] }, (d) => {
      d.camera.cut({ pos: [6, 3, 12], lookAt: [6, 1, 6] });
      d.do('jesse', 'sit', { on: 'banco', seat: 'seat2' });
    }), location, [jesse]);
    const compiled = compileEpisode(episode, location, buildCast(episode, [jesse]));
    expect(evaluateActions(compiled, episode.duration).jesse.sit).toBeCloseTo(1);
    expect(compiled.links).toEqual([expect.objectContaining({ target: 'jesse', to: 'banco', socket: 'seat.seat2' })]);
  });

  it('the house: sizes follow the params', () => {
    expect(size(createAsset('ancient.plankShelf', { length: 1.6 })).x).toBeCloseTo(1.6, 1);
    expect(size(createAsset('ancient.post')).y).toBeCloseTo(2.7, 1);
    expect(size(createAsset('ancient.post', { height: 2 })).y).toBeCloseTo(2, 1);
    expect(size(createAsset('ancient.post', { radius: 0.2 })).x).toBeGreaterThan(size(createAsset('ancient.post')).x + 0.1);
    const table = size(createAsset('ancient.woodTable', { width: 2, depth: 0.8 }));
    expect(table.x).toBeCloseTo(2, 1);
    expect(table.z).toBeCloseTo(0.8, 1);
    const cloth = size(createAsset('ancient.hangingCloth', { width: 1, length: 1.8 }));
    expect(cloth.x).toBeGreaterThan(1);
    expect(cloth.x).toBeLessThan(1.2);
    expect(cloth.y).toBeCloseTo(1.88, 1);
    const niche = size(createAsset('ancient.wallNiche', { width: 0.4, height: 0.6, item: 'none' }));
    expect(niche.y).toBeCloseTo(0.6, 2);
    expect(niche.x).toBeCloseTo(0.46, 1);
    // The ladder: its top at the height asked against the wall (z = 0), its feet out at the lean.
    const ladder = new THREE.Box3().setFromObject(createAsset('ancient.ladder', { height: 3, lean: 20 }));
    expect(ladder.max.y).toBeCloseTo(3, 1);
    expect(ladder.min.z).toBeGreaterThan(-0.02);
    const run = 3 * Math.tan(THREE.MathUtils.degToRad(20));
    expect(ladder.max.z).toBeGreaterThan(run);
    expect(ladder.max.z).toBeLessThan(run + 0.12);
    expect(new THREE.Box3().setFromObject(createAsset('ancient.ladder', { lean: 5 })).max.z).toBeLessThan(0.35);
    // Seeded groups: as many pieces as asked, and another seed lays them out otherwise.
    expect(createAsset('ancient.potteryGroup', { count: 9 }).children).toHaveLength(9);
    expect(createAsset('ancient.basketGroup', { count: 5 }).children).toHaveLength(5);
    expect(createAsset('ancient.herbBundle', { count: 4 }).children).toHaveLength(5);
    const spot = (seed: number) => createAsset('ancient.potteryGroup', { seed }).children[1].position.toArray();
    expect(spot(1)).toEqual(spot(1));
    expect(spot(1)).not.toEqual(spot(2));
    // Wall pieces have their back at z = 0 and come out toward +z.
    for (const id of ['ancient.plankShelf', 'ancient.hangingCloth', 'ancient.wallNiche']) {
      const box = new THREE.Box3().setFromObject(createAsset(id));
      expect(box.min.z, id).toBeGreaterThan(-0.03);
      expect(box.max.z, id).toBeGreaterThan(0.05);
    }
    // Nothing on the shelf hangs off it.
    const shelf = new THREE.Box3().setFromObject(createAsset('ancient.plankShelf', { length: 0.8, count: 9 }));
    expect(shelf.max.x - shelf.min.x).toBeLessThan(0.82);
  });

  it('the house: a post blocks with its trunk, wall and hanging things do not block', () => {
    const post = place([{ asset: 'ancient.post', pos: [0, 0] }]);
    expect(blocked(post, 0, 0)).toBe(true);
    expect(blocked(post, 0.35, 0)).toBe(false);
    expect(blocked(post, 0, 0.35)).toBe(false);
    expect(place([{ asset: 'ancient.hangingCloth', pos: [0, 0], y: 2 }, { asset: 'ancient.herbBundle', pos: [3, 0], y: 2.4 }, { asset: 'ancient.plankShelf', pos: [6, 0], y: 1.5 }, { asset: 'ancient.wallNiche', pos: [9, 0], y: 1.1 }]).colliders).toHaveLength(0);
    expect(place([{ asset: 'ancient.mudBench', pos: [0, 0] }, { asset: 'ancient.woodTable', pos: [5, 0] }, { asset: 'ancient.potteryGroup', pos: [10, 0] }]).colliders).toHaveLength(3);
  });

  it('the house: cloth and herbs sway by themselves, a lamp in a niche flickers', () => {
    const anim = (o: THREE.Object3D) => o.userData.animate as (t: number) => void;
    const cloth = createAsset('ancient.hangingCloth');
    const fabric = cloth.children[0] as THREE.Mesh;
    const at = (t: number) => (anim(cloth)(t), Array.from(fabric.geometry.attributes.position.array));
    const [a, b] = [at(0.4), at(1.9)];
    expect(a).not.toEqual(b);
    // It sways out from the wall, never into it.
    for (let t = 0; t < 12; t += 0.7) {
      at(t);
      expect(new THREE.Box3().setFromObject(fabric).min.z).toBeGreaterThan(0);
    }
    const herbs = createAsset('ancient.herbBundle');
    const swing = (t: number) => (anim(herbs)(t), herbs.children[1].rotation.z);
    expect(swing(0.3)).not.toBeCloseTo(swing(1.7));
    expect(Math.abs(swing(5))).toBeLessThan(0.1);
    expect(typeof createAsset('ancient.wallNiche').userData.animate).toBe('function');
    expect(createAsset('ancient.wallNiche', { item: 'jug' }).userData.animate).toBeUndefined();
    for (const id of ['ancient.mudBench', 'ancient.stool', 'ancient.post', 'ancient.ladder']) expect(createAsset(id).userData.animate, id).toBeUndefined();
  });
});
