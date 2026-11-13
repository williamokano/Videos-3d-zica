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
