import { describe, expect, it } from 'vitest';
import { channelAt, type CompiledActions } from './actions/catalog';
import { buildCharacter } from './character/cast';
import { DAY, HOUR, YEAR, clockAt, formatClock, parseClock } from './character/clock';
import type { CharacterDef } from './character/types';
import { direct, resolveScript, type Director } from './timeline/direct';
import { buildCast, compileEpisode } from './timeline/stage';
import { buildLocation } from './world/build';

describe('clock on the arm', () => {
  const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 40 }, rooms: [] } as never);
  const defs: CharacterDef[] = [
    { id: 'caio', name: 'Caio', clock: { left: '0001:000:00:00:00', running: false } },
    { id: 'rosa', name: 'Rosa', clock: { left: '0000:002:02:17:40' } },
    { id: 'juninho', name: 'Juninho', clock: { left: '0000:009:14:40:51' } },
    { id: 'bia', name: 'Bia' },
  ];
  const cast = [
    { character: 'caio', at: [0, 0] as [number, number] },
    { character: 'rosa', at: [2, 0] as [number, number] },
    { character: 'juninho', at: [4, 0] as [number, number] },
    { character: 'bia', at: [6, 0] as [number, number] },
  ];
  const play = (script: (d: Director) => void): CompiledActions => {
    const episode = resolveScript(direct({ episode: 1, title: 't', location: 't', cast }, (d) => {
      d.camera.cut({ pos: [3, 1.6, 6], lookAt: [3, 1.2, 0] });
      script(d);
    }), location, defs);
    return compileEpisode(episode, location, buildCast(episode, defs));
  };
  const left = (compiled: CompiledActions, id: string, t: number): number => clockAt(channelAt(compiled, id, 'clock', t), channelAt(compiled, id, 'clock.rate', t), t);

  it('reads and writes balances as the arm shows them', () => {
    expect(formatClock(YEAR)).toBe('0001:000:00:00:00');
    expect(formatClock(318 * YEAR + 112 * DAY + 7 * HOUR + 14 * 60 + 22)).toBe('0318:112:07:14:22');
    expect(parseClock('0000:002:02:17:40')).toBe(2 * DAY + 2 * HOUR + 17 * 60 + 40);
    expect(parseClock('01:10:00')).toBe(HOUR + 600);
    expect(formatClock(-5)).toBe('0000:000:00:00:00');
    expect(() => parseClock('2 dias')).toThrow(/AAAA:DDD/);
  });

  it('counts down by itself, second by second, and an arm under 25 stays at one year', () => {
    const compiled = play((d) => d.wait(10));
    expect(left(compiled, 'rosa', 0)).toBe(parseClock('0000:002:02:17:40'));
    expect(formatClock(left(compiled, 'rosa', 3.4))).toBe('0000:002:02:17:36');
    expect(left(compiled, 'caio', 9)).toBe(YEAR);
  });

  it('starts at 25 without a jump in the numbers, and from there goes down', () => {
    const compiled = play((d) => {
      d.wait(5);
      d.actor('caio').clock({ run: true });
      d.wait(5);
    });
    expect(left(compiled, 'caio', 4.99)).toBe(YEAR);
    expect(left(compiled, 'caio', 5)).toBe(YEAR);
    expect(left(compiled, 'caio', 7)).toBeCloseTo(YEAR - 2);
    expect(formatClock(left(compiled, 'caio', 5.5))).toBe('0000:364:23:59:59');
  });

  it('pays and receives over the step, and refuses what the arm does not have', () => {
    const compiled = play((d) => {
      d.wait(1);
      d.actor('rosa').clock({ add: '-01:00:00' });
      d.wait(1);
    });
    const pay = compiled.clips.find((c) => c.action === 'clock')!;
    expect(pay.duration).toBeCloseTo(1.2);
    expect(left(compiled, 'rosa', 3)).toBeCloseTo(parseClock('0000:002:01:17:40') - 3);
    expect(() => play((d) => d.actor('rosa').clock({ add: '-0000:003:00:00:00' }))).toThrow(/não há tanto no braço/);
    expect(() => play((d) => d.actor('caio').clock({ add: -60 }))).toThrow(/cofre/);
  });

  it('passes time from one arm to the other, and never from or to an arm under 25', () => {
    const amount = parseClock('1:00:00:00');
    const compiled = play((d) => {
      d.actor('juninho').transfer('rosa', '1:00:00:00');
      d.wait(1);
    });
    const end = compiled.clips.find((c) => c.action === 'transfer')!.duration + 0.5;
    expect(left(compiled, 'rosa', end)).toBeCloseTo(parseClock('0000:002:02:17:40') + amount - end);
    expect(left(compiled, 'juninho', end)).toBeCloseTo(parseClock('0000:009:14:40:51') - amount - end);
    // Halfway, part has gone over: it is a flow, not a jump.
    const half = left(compiled, 'rosa', 1.5) - parseClock('0000:002:02:17:40');
    expect(half).toBeGreaterThan(0.2 * amount);
    expect(half).toBeLessThan(0.8 * amount);
    expect(() => play((d) => d.actor('rosa').transfer('caio', 60))).toThrow(/parado/);
    expect(() => play((d) => d.actor('rosa').transfer('bia', 60))).toThrow(/não tem relógio/);
  });

  it('jumps in time: every running clock goes down together, and the one under 25 does not move', () => {
    const compiled = play((d) => {
      d.wait(1);
      d.passTime('1:00:00:00');
      d.wait(1);
    });
    const end = compiled.clips.filter((c) => c.action === 'clock').map((c) => c.t + c.duration);
    expect(end).toEqual([2.5, 2.5]);
    expect(left(compiled, 'rosa', 3)).toBeCloseTo(parseClock('0000:001:02:17:40') - 3);
    expect(left(compiled, 'juninho', 3)).toBeCloseTo(parseClock('0000:008:14:40:51') - 3);
    expect(left(compiled, 'caio', 3)).toBe(YEAR);
  });

  it('turns the inside of the forearm up to read it or show it, and back down with lower', () => {
    const compiled = play((d) => {
      d.actor('caio').showArm('self');
      d.actor('rosa').showArm('out');
      d.wait(1);
      d.actor('caio').lower();
    });
    const lower = compiled.clips.find((c) => c.action === 'lower')!;
    expect(channelAt(compiled, 'caio', 'showArmL', 0.9)).toBe(1);
    expect(channelAt(compiled, 'caio', 'reachL', 0.9)).toBe(1);
    expect(channelAt(compiled, 'rosa', 'showArmL.out', 0.9)).toBe(1);
    expect(channelAt(compiled, 'caio', 'showArmL', lower.t + lower.duration)).toBe(0);
    // Reading it, the eyes go down to the arm.
    expect(compiled.gazes.some((g) => g.target === 'caio' && Array.isArray(g.at) && g.at[1] < 1.2)).toBe(true);
  });

  it('sets the balance at the start of a scene, and an episode gives a cast member its own', () => {
    const compiled = play((d) => {
      d.wait(2);
      d.actor('rosa').clock({ set: '0000:000:00:00:30' });
      d.wait(1);
    });
    expect(left(compiled, 'rosa', 2)).toBeCloseTo(30);
    expect(left(compiled, 'rosa', 12)).toBeCloseTo(20);
    expect(left(compiled, 'rosa', 40)).toBe(0);
    const vera = buildCharacter({ character: 'vera', at: [0, 0], clock: { left: '0318:112:07:14:22' } }, { id: 'vera', name: 'Vera' });
    expect(vera.channels.clock).toBe(parseClock('0318:112:07:14:22'));
    expect(vera.channels['clock.rate']).toBe(1);
  });
});
