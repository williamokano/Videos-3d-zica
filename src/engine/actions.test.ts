import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import './actions/builtin';
import { compileActions, evaluateActions, type ActionClip, type ActionTarget } from './actions/catalog';
import './assets/building';
import './assets/nature';
import './assets/school';
import './assets/vehicles';
import type { CharacterDef } from './character/types';
import type { Episode } from './timeline/episode';
import { buildCast, compileEpisode } from './timeline/stage';
import { buildLocation, resolveCollisions } from './world/build';
import type { Location } from './world/types';

const door: ActionTarget = { id: 'porta', kind: 'door', channels: { open: 0 }, traits: { opensFrom: 'both' } };
const exit: ActionTarget = { id: 'saida', kind: 'door', channels: { open: 0 }, traits: { opensFrom: 'inside' } };
const car: ActionTarget = {
  id: 'carro', kind: 'vehicle', traits: {},
  channels: { x: 0, y: 0, z: 0, yaw: -90, travel: 0, 'frontLeft.open': 0 },
};
const box: ActionTarget = { id: 'caixa', kind: 'item', channels: { x: 1, y: 0, z: 1, yaw: 0, held: 0 }, traits: { pickable: true } };
const targets = [door, exit, car, box];
const at = (clips: ActionClip[], t: number) => evaluateActions(compileActions(clips, targets), t);

describe('actions', () => {
  it('gives each channel as a pure function of time', () => {
    const clips: ActionClip[] = [
      { t: 5, duration: 1, target: 'porta', action: 'close' },
      { t: 1, duration: 2, target: 'porta', action: 'open', ease: 'linear' },
    ];
    expect(at(clips, 0).porta.open).toBe(0);
    expect(at(clips, 2).porta.open).toBeCloseTo(0.5);
    expect(at(clips, 4).porta.open).toBe(1);
    expect(at(clips, 5.5).porta.open).toBeCloseTo(0.5);
    expect(at(clips, 99).porta.open).toBe(0);
  });

  it('refuses to open a door from the wrong side', () => {
    const open = (params?: Record<string, unknown>) => () => compileActions([{ t: 0, target: 'saida', action: 'open', params }], targets);
    expect(open()).toThrow(/só abre por dentro; informe "from"/);
    expect(open({ from: 'outside' })).toThrow(/só abre por dentro/);
    expect(open({ from: 'inside' })).not.toThrow();
  });

  it('explains what is wrong with a clip', () => {
    const compile = (clip: ActionClip) => () => compileActions([clip], targets);
    expect(compile({ t: 0, target: 'porta', action: 'voar' })).toThrow(/ação desconhecida/);
    expect(compile({ t: 0, target: 'nada', action: 'open' })).toThrow(/objeto não encontrado/);
    expect(compile({ t: 0, target: 'porta', action: 'drive', params: { path: [[1, 1]] } })).toThrow(/vale para vehicle/);
    expect(compile({ t: 0, target: 'porta', action: 'open', params: { amout: 1 } })).toThrow(/parâmetro desconhecido "amout"/);
    expect(compile({ t: 0, target: 'carro', action: 'open' })).toThrow(/informe "part".*frontLeft/);
    expect(compile({ t: 0, target: 'carro', action: 'open', params: { part: 'teto' } })).toThrow(/não tem o canal "teto.open"/);
  });

  it('refuses two actions on the same channel at the same time', () => {
    const clips: ActionClip[] = [
      { t: 0, duration: 2, target: 'porta', action: 'open' },
      { t: 1, duration: 2, target: 'porta', action: 'close' },
    ];
    expect(() => compileActions(clips, targets)).toThrow(/ainda está em uso/);
  });

  it('drives a vehicle along a path from where it stands', () => {
    const clips: ActionClip[] = [{ t: 0, duration: 4, target: 'carro', action: 'drive', ease: 'linear', params: { path: [[10, 0], [10, -10]] } }];
    const start = at(clips, 0.2).carro;
    // Leaves roughly along its own heading (the curve may swing a little wide before a turn).
    expect(Math.abs(start.yaw + 90)).toBeLessThan(6);
    const end = at(clips, 4).carro;
    expect([end.x, end.z]).toEqual([10, -10]);
    // Ends heading north after a left turn, and the wheels rolled the whole way.
    expect(Math.abs(end.yaw)).toBeLessThan(3);
    expect(end.travel).toBeGreaterThan(18);
    const mid = at(clips, 2).carro;
    expect(mid.x).toBeGreaterThan(5);
    expect(mid.yaw).toBeGreaterThan(-90);
    expect(mid.yaw).toBeLessThan(0);
  });

  it('derives the duration of a drive from its speed', () => {
    const compiled = compileActions([{ t: 0, target: 'carro', action: 'drive', params: { path: [[12, 0]], speed: 4 } }], targets);
    expect(compiled.clips[0].duration).toBeCloseTo(3);
  });

  it('carries a pickable item and puts it down', () => {
    const clips: ActionClip[] = [
      { t: 0, duration: 1, target: 'caixa', action: 'pickUp', params: { to: [1, 1.1, 1] } },
      { t: 2, duration: 1, target: 'caixa', action: 'putDown', params: { at: [4, 0.5, 2] } },
    ];
    expect(at(clips, 1.5).caixa).toMatchObject({ y: 1.1, held: 1 });
    expect(at(clips, 3).caixa).toMatchObject({ x: 4, y: 0.5, z: 2, held: 0 });
    expect(() => compileActions([{ t: 0, target: 'carro', action: 'pickUp', params: { to: [0, 0, 0] } }], targets)).toThrow(/vale para item/);
  });
});

describe('interactive objects', () => {
  const location: Location = {
    id: 't', name: 't', ground: { color: '#fff', size: 50 },
    rooms: [{
      id: 'sala', name: 'sala', origin: [0, 0], size: [4, 4], floorColor: '#fff',
      openings: [{ id: 'porta', wall: 's', type: 'door', at: 2, width: 1, leaf: { kind: 'rollup' } }],
      props: [{ id: 'caixa', pickable: true, asset: 'item.box', pos: [1, 1] }],
    }],
    props: [{ id: 'carro', asset: 'vehicle.car', pos: [10, 10], rot: 90 }],
  };

  it('lists doors and props with an id, with their channels', () => {
    const built = buildLocation(location);
    const byId = Object.fromEntries(built.interactives.map((o) => [o.id, o]));
    expect(byId.porta).toMatchObject({ kind: 'door', channels: { open: 0 }, traits: { doorKind: 'rollup' } });
    expect(byId.caixa).toMatchObject({ kind: 'item', channels: { x: 1, z: 1, held: 0 } });
    expect(byId.carro.kind).toBe('vehicle');
    expect(Object.keys(byId.carro.channels)).toEqual(expect.arrayContaining(['frontLeft.open', 'rearRight.open', 'travel', 'x', 'z', 'yaw']));
    byId.carro.set('x', 3);
    expect(byId.carro.object.position.x).toBe(3);
  });

  it('blocks the doorway until the door is open enough', () => {
    const built = buildLocation(location);
    const porta = built.interactives.find((o) => o.id === 'porta')!;
    const through = () => resolveCollisions(2, 3.95, 0.3, built.colliders)[1];
    expect(through()).not.toBeCloseTo(3.95);
    porta.set('open', 0.5);
    expect(through()).not.toBeCloseTo(3.95);
    porta.set('open', 1);
    expect(through()).toBeCloseTo(3.95);
  });

  it('rejects repeated ids', () => {
    const twice: Location = { ...location, props: [{ id: 'caixa', asset: 'item.box', pos: [0, 0] }] };
    expect(() => buildLocation(twice)).toThrow(/Id repetido/);
  });
});

describe('series data', () => {
  const json = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

  for (const series of readdirSync('series')) {
    const dir = `series/${series}/episodes`;
    for (const file of readdirSync(dir)) {
      it(`compiles the actions of ${series} episode ${file}`, () => {
        const episode = json<Episode>(`${dir}/${file}`);
        const built = buildLocation(json<Location>(`series/${series}/world/${episode.location}.json`));
        const folder = `series/${series}/characters`;
        const defs = existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.json')).map((f) => json<CharacterDef>(`${folder}/${f}`)) : [];
        const compiled = compileEpisode(episode, built, buildCast(episode, defs));
        for (const clip of compiled.clips) expect(clip.t + clip.duration).toBeLessThanOrEqual(episode.duration);
      });
    }
  }
});
