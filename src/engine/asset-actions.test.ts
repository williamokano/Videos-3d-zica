import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import './assets';
import { createAsset } from './assets/registry';
import { evaluateActions, placementAt } from './actions/catalog';
import type { CharacterDef } from './character/types';
import { direct, resolveScript, type Director } from './timeline/direct';
import { applyStage, buildCast, compileEpisode } from './timeline/stage';
import { buildLocation } from './world/build';
import type { Prop } from './world/types';

const ana: CharacterDef = { id: 'ana', name: 'Ana' };

/** A flat yard with some props, and a script played on it. */
function play(props: Prop[], script: (d: Director) => void, at: [number, number] = [5, 5]) {
  const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 60 }, rooms: [{ id: 'r', name: 'r', origin: [0, 0], size: [20, 20], outdoor: true, floorColor: '#ccc', props }] });
  const episode = resolveScript(direct({ episode: 1, title: 't', location: 't', cast: [{ character: 'ana', at, yaw: 0 }] }, (d) => {
    d.camera.cut({ pos: [5, 3, 12], lookAt: [5, 1, 5] });
    script(d);
  }), location, [ana]);
  const cast = buildCast(episode, [ana]);
  const compiled = compileEpisode(episode, location, cast);
  const objects = new Map([...location.interactives, ...cast].map((o) => [o.id, o]));
  return {
    episode, compiled, location, objects,
    value: (id: string, channel: string, t = episode.duration) => evaluateActions(compiled, t)[id]?.[channel] ?? compiled.initial[id]?.[channel],
    show: (t = episode.duration) => applyStage(compiled, objects, t, location.colliders),
  };
}

describe('actions that fit every asset', () => {
  it('open and close work on a gate, a drawer and a locker door, and say which parts there are', () => {
    const props: Prop[] = [
      { id: 'portao', asset: 'structure.gate', pos: [10, 10] },
      { id: 'mesa', asset: 'school.teacherDesk', pos: [3, 3] },
      { id: 'armarios', asset: 'school.lockers', pos: [15, 3], params: { count: 3 } },
    ];
    const s = play(props, (d) => {
      d.do('portao', 'open');
      d.do('mesa', 'open', { part: 'drawer1' });
      d.do('armarios', 'open', { part: 'door2' });
      d.do('mesa', 'close', { part: 'drawer1' });
    });
    expect(s.value('portao', 'open')).toBe(1);
    expect(s.value('mesa', 'drawer1.open')).toBe(0);
    expect(s.value('armarios', 'door2.open')).toBe(1);
    expect(s.value('armarios', 'door1.open')).toBe(0);
    expect(() => play(props, (d) => void d.do('armarios', 'open'))).toThrow(/door1, door2, door3/);
    expect(() => play(props, (d) => void d.do('mesa', 'open', { part: 'tampa' }))).toThrow(/tampa/);
  });

  it('a closed gate stops whoever walks through it, and an open one lets them by', () => {
    const gate: Prop[] = [{ id: 'portao', asset: 'structure.gate', pos: [5, 8], params: { width: 3 } }];
    expect(() => play(gate, (d) => void d.actor('ana').walkTo([5, 11]))).toThrow(/portao.*fechada/);
    const s = play(gate, (d) => {
      d.do('portao', 'open');
      d.actor('ana').walkTo([5, 11]);
    });
    expect(placementAt(s.compiled, 'ana', s.episode.duration).pos[2]).toBeCloseTo(11);
    // In the scene, the opening stops blocking once the gate is open.
    const collider = s.location.colliders.find((c) => c.door === 'portao')!;
    s.show(0);
    expect(collider.disabled).toBeFalsy();
    s.show();
    expect(collider.disabled).toBe(true);
  });

  it('switch turns on and off whatever can be: a lamp, a fan, a light bar, headlights', () => {
    const props: Prop[] = [
      { id: 'lampada', asset: 'light.tubeLamp', pos: [3, 3], y: 2.9 },
      { id: 'ventilador', asset: 'school.ceilingFan', pos: [6, 3], y: 2.9 },
      { id: 'viatura', asset: 'vehicle.policeCar', pos: [12, 12] },
      { id: 'cone', asset: 'street.cone', pos: [16, 16] },
    ];
    const s = play(props, (d) => {
      d.do('lampada', 'switch', { on: false });
      d.do('ventilador', 'switch', { on: false });
      d.do('viatura', 'switch', { on: true });
      d.do('viatura', 'switch', { on: true, what: 'lights' });
    });
    expect([s.value('lampada', 'on'), s.value('ventilador', 'on'), s.value('viatura', 'siren'), s.value('viatura', 'lights')]).toEqual([0, 0, 1, 1]);
    expect(() => play(props, (d) => void d.do('cone', 'switch', { on: true }))).toThrow(/nada para ligar/);
    // Off, the tubes are dark and give no light.
    s.show();
    const lamp = s.objects.get('lampada')!.object;
    expect(lamp.children.filter((c) => c instanceof THREE.PointLight && c.intensity > 0)).toHaveLength(0);
  });

  it('signal sets a traffic light by name', () => {
    const props: Prop[] = [{ id: 'semaforo', asset: 'street.trafficLight', pos: [3, 3] }, { id: 'cone', asset: 'street.cone', pos: [8, 8] }];
    expect(play(props, (d) => void d.do('semaforo', 'signal', { to: 'green' })).value('semaforo', 'state')).toBe(2);
    expect(() => play(props, (d) => void d.do('semaforo', 'signal', { to: 'azul' }))).toThrow(/azul.*red, yellow, green, off/);
    expect(() => play(props, (d) => void d.do('cone', 'signal', { to: 'red' }))).toThrow(/não é um semáforo/);
  });

  it('knocking something over lays it on its side, away from whoever pushes, and it can be stood up again', () => {
    const props: Prop[] = [{ id: 'cone', asset: 'street.cone', pos: [5, 4.2] }];
    const s = play(props, (d) => void d.do('cone', 'knockOver', { by: 'ana' }));
    expect(s.value('cone', 'lean')).toBe(90);
    // Ana is south of the cone, so it falls north.
    expect(Math.abs(s.value('cone', 'leanTo')!)).toBeLessThan(1);
    s.show();
    const cone = s.objects.get('cone')!.object;
    const top = new THREE.Vector3(0, 0.7, 0).applyQuaternion(cone.quaternion);
    expect(top.z).toBeLessThan(-0.6);
    expect(Math.abs(top.y)).toBeLessThan(0.05);
    expect(() => play([{ id: 'cone', asset: 'street.cone', pos: [15, 15] }], (d) => void d.do('cone', 'knockOver', { by: 'ana' }))).toThrow(/leve-o até lá/);
    const back = play(props, (d) => {
      d.do('cone', 'knockOver', { toward: 90 });
      d.do('cone', 'setUpright');
    });
    expect(back.value('cone', 'lean')).toBe(0);
  });

  it('a seat can face its own way: around a table, everybody looks at the middle', () => {
    const props: Prop[] = [{ id: 'mesa', asset: 'school.concreteTable', pos: [5, 5], rot: 30 }];
    for (const seat of ['s1', 's2', 's3', 's4']) {
      const s = play(props, (d) => void d.actor('ana').sit('mesa', seat), [5, 6.2]);
      const { pos, yaw } = placementAt(s.compiled, 'ana', s.episode.duration);
      const a = (yaw * Math.PI) / 180;
      // One step the way she faces brings her closer to the middle of the table.
      const before = Math.hypot(pos[0] - 5, pos[2] - 5);
      const after = Math.hypot(pos[0] - Math.sin(a) * 0.5 - 5, pos[2] - Math.cos(a) * 0.5 - 5);
      expect(before).toBeCloseTo(0.92, 1);
      expect(after).toBeLessThan(before - 0.45);
    }
  });

  it('driving turns the front wheels into the curve', () => {
    const s = play([{ id: 'carro', asset: 'vehicle.car', pos: [3, 15], rot: -90 }], (d) => void d.do('carro', 'drive', { path: [[10, 15], [14, 10]], speed: 5 }));
    const steer = [0.2, 0.5, 0.8].map((u) => s.value('carro', 'steer', u * s.episode.duration)!);
    expect(Math.max(...steer.map(Math.abs))).toBeGreaterThan(3);
    expect(s.value('carro', 'steer')).toBeCloseTo(0, 1);
  });
});

describe('places on assets', () => {
  const places = (id: string, params = {}) => createAsset(id, params).children.filter((c) => c.name.startsWith('seat.')).map((c) => c.name.slice(5)).sort();

  it('furniture says where to sit and where to put things', () => {
    expect(places('school.desk')).toEqual(['chair', 'top']);
    expect(places('school.teacherDesk')).toEqual(['chair', 'top']);
    expect(places('school.concreteTable')).toEqual(['s1', 's2', 's3', 's4', 'top']);
    expect(places('school.concreteTable', { seats: 'benches' })).toEqual(['b1', 'b2', 'b3', 'top']);
    expect(places('school.concreteTable', { shape: 'rect' })).toEqual(['a1', 'a2', 'b1', 'b2', 'top']);
    expect(places('storage.shelf')).toEqual(['shelf1', 'shelf2', 'shelf3']);
    expect(places('storage.crates')).toEqual(['top']);
    expect(places('street.trashBin')).toEqual(['inside']);
    expect(places('street.busStop')).toEqual(['left', 'middle', 'right']);
  });

  it('something carried can be put on a table', () => {
    const props: Prop[] = [
      { id: 'caixa', asset: 'item.box', pos: [5, 4.4], pickable: true },
      { id: 'mesa', asset: 'school.concreteTable', pos: [5.6, 5.3], params: { shape: 'rect' } },
    ];
    const s = play(props, (d) => {
      d.actor('ana').pickUp('caixa');
      d.actor('ana').putDown('caixa', { on: 'mesa', seat: 'top' });
    });
    const { pos } = placementAt(s.compiled, 'caixa', s.episode.duration);
    expect([pos[0], pos[1], pos[2]].map((v) => Math.round(v * 100) / 100)).toEqual([5.6, 0.79, 5.3]);
  });
});

describe('someone on a vehicle', () => {
  it('the driver takes the wheel on sitting and lets go on getting out; a passenger keeps the hands free', () => {
    const car: Prop[] = [{ id: 'carro', asset: 'vehicle.car', pos: [6.2, 5] }];
    const s = play(car, (d) => {
      d.actor('ana').sit('carro', 'driver');
      d.wait(1);
      d.actor('ana').standUp([4.6, 5]);
    });
    // Sitting takes a second, then a second of waiting: the middle of the wait.
    const mid = 1.5;
    expect([s.value('ana', 'reachL', mid), s.value('ana', 'reachR', mid), s.value('ana', 'holding', mid)]).toEqual([1, 1, 1]);
    // The hands are a little to each side, in front and above the seat.
    expect(s.value('ana', 'reachL.x', mid)!).toBeLessThan(s.value('ana', 'reachR.x', mid)!);
    expect(s.value('ana', 'reachL.z', mid)!).toBeLessThan(-0.3);
    expect([s.value('ana', 'reachL'), s.value('ana', 'reachR'), s.value('ana', 'holding'), s.value('ana', 'ride')]).toEqual([0, 0, 0, 0]);
    const passenger = play(car, (d) => void d.actor('ana').sit('carro', 'passenger'), [7.4, 5]);
    expect(passenger.value('ana', 'reachR')).toBe(0);
  });

  it('on a bicycle the legs go round as it rolls, and stand still when it does', () => {
    const s = play([{ id: 'bike', asset: 'vehicle.bicycle', pos: [5.6, 5], rot: -90 }], (d) => {
      d.actor('ana').sit('bike');
      d.do('bike', 'drive', { path: [[15, 5]], speed: 4 });
    });
    expect(s.value('ana', 'ride')).toBe(1);
    const knee = (t: number) => {
      s.show(t);
      return s.objects.get('ana')!.object.getObjectByName('thighL')!.rotation.x;
    };
    const [a, b, c] = [knee(1.5), knee(1.8), knee(2.1)];
    expect(new Set([a.toFixed(2), b.toFixed(2), c.toFixed(2)]).size).toBe(3);
    // Stopped at the end: the same pose a moment apart.
    expect(knee(s.episode.duration - 0.3)).toBeCloseTo(knee(s.episode.duration - 0.1), 5);
  });

  it('a hand on the wheel leaves it to do something and goes back', () => {
    const s = play([{ id: 'carro', asset: 'vehicle.car', pos: [6.2, 5] }], (d) => {
      d.do('carro', 'open', { part: 'frontLeft' });
      d.actor('ana').sit('carro', 'driver');
      d.actor('ana').close('carro', { part: 'frontLeft' });
    });
    expect(s.value('carro', 'frontLeft.open')).toBe(0);
    // Back where it was on the wheel (0.38 m in front of the seat), and still held up.
    expect(s.value('ana', 'reachR')).toBe(1);
    expect(s.value('ana', 'reachR.z')).toBeCloseTo(-0.38, 3);
    // Halfway through closing the door, it was somewhere else.
    expect(Math.abs(s.value('ana', 'reachR.x', s.episode.duration - 1.6)! - s.value('ana', 'reachR.x')!)).toBeGreaterThan(0.1);
  });
});

describe('every asset has the actions that fit it', () => {
  it('no asset has a channel or a place that no action reaches', async () => {
    const { assetActions } = await import('./assets/showcase');
    const { listAssets } = await import('./assets/registry');
    const orphans: string[] = [];
    for (const { id } of listAssets()) {
      const { uses, channels, places } = assetActions(id);
      for (const name of [...channels, ...places]) if (!uses.includes(name)) orphans.push(`${id}: ${name}`);
    }
    expect(orphans).toEqual([]);
  });

  it('says what makes sense for each kind of thing', async () => {
    const { assetActions } = await import('./assets/showcase');
    const names = (id: string) => assetActions(id).actions.map((a) => a.action);
    expect(names('vehicle.policeCar')).toEqual(['open / close', 'switch', 'drive', 'sit / standUp']);
    expect(names('vehicle.bicycle')).toEqual(['drive', 'sit / standUp', 'knockOver / setUpright']);
    expect(names('street.trafficLight')).toEqual(['signal']);
    expect(names('street.cone')).toEqual(['knockOver / setUpright']);
    expect(names('school.lockers')).toEqual(['open / close']);
    expect(names('school.teacherDesk')).toEqual(['open / close', 'sit / standUp', 'putDown (com "on")']);
    expect(names('item.radio')).toEqual(['pickUp / putDown / putAway', 'raise / lower']);
    expect(names('nature.tree')).toEqual([]);
    expect(assetActions('school.lockers').actions[0].what).toContain('door1');
  });

  it('only loose things fall over', () => {
    const props: Prop[] = [{ id: 'poste', asset: 'street.lightPole', pos: [5, 4.2] }];
    expect(() => play(props, (d) => void d.do('poste', 'knockOver', { by: 'ana' }))).toThrow(/não é um objeto solto/);
    const bike = play([{ id: 'bike', asset: 'vehicle.bicycle', pos: [5, 4.2] }], (d) => void d.do('bike', 'knockOver', { toward: 90 }));
    expect(bike.value('bike', 'lean')).toBe(90);
  });
});

describe('falling the right way', () => {
  it('a bicycle and a barrier fall across their narrow side, however they are turned', () => {
    for (const rot of [0, 90, 215]) {
      const s = play([{ id: 'bike', asset: 'vehicle.bicycle', pos: [5, 8], rot }, { id: 'cavalete', asset: 'street.barrier', pos: [10, 8], rot }], (d) => {
        d.do('bike', 'knockOver');
        d.do('cavalete', 'knockOver');
      });
      const off = (id: string) => ((((s.value(id, 'leanTo')! - rot) % 180) + 180) % 180);
      // The bicycle is long front to back: it falls to its side. The barrier is long side to side: it falls forward.
      expect(off('bike')).toBeCloseTo(90);
      expect(off('cavalete') % 180).toBeCloseTo(0);
      // Lying down, nothing of it is under the ground.
      s.show();
      for (const id of ['bike', 'cavalete']) expect(new THREE.Box3().setFromObject(s.objects.get(id)!.object).min.y).toBeGreaterThan(-0.06);
    }
  });
});
