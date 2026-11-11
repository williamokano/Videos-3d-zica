import { describe, expect, it } from 'vitest';
import type { TargetInfo } from '../world/interactive';
import { compileActions, evaluateActions, type Action } from './actions';

const targets: TargetInfo[] = [
  { id: 'door', kind: 'door', channels: { open: 0 }, anchors: [], opensFrom: 'both' },
  { id: 'exit', kind: 'door', channels: { open: 0 }, anchors: [], opensFrom: 'inside' },
  { id: 'car', kind: 'prop', channels: { 'door.fl': 0, travel: 0 }, anchors: ['trunk'], pose: { x: 0, y: 0, z: 0, rot: -90 } },
  { id: 'box', kind: 'prop', channels: {}, anchors: [], pose: { x: 5, y: 0, z: 5, rot: 0 } },
];

const at = (actions: Action[], t: number) => evaluateActions(compileActions(actions, targets), t);

describe('channels', () => {
  const actions: Action[] = [
    { t: 1, target: 'door', action: 'open', duration: 2 },
    { t: 5, target: 'door', action: 'close', duration: 1 },
  ];

  it('opens and closes a door over time, at any instant', () => {
    expect(at(actions, 0).get('door')!.channels.open).toBe(0);
    expect(at(actions, 2).get('door')!.channels.open).toBeCloseTo(0.5);
    expect(at(actions, 4).get('door')!.channels.open).toBe(1);
    expect(at(actions, 5.5).get('door')!.channels.open).toBeCloseTo(0.5);
    expect(at(actions, 9).get('door')!.channels.open).toBe(0);
  });

  it('opens a named part of an object', () => {
    const state = at([{ t: 0, target: 'car', action: 'open', duration: 1, params: { part: 'door.fl' } }], 1);
    expect(state.get('car')!.channels['door.fl']).toBe(1);
  });
});

describe('rules', () => {
  it('refuses to open an inside-only door from the outside', () => {
    expect(() => at([{ t: 0, target: 'exit', action: 'open', params: { from: 'outside' } }], 0)).toThrow(/only opens from the inside/);
    expect(() => at([{ t: 0, target: 'exit', action: 'open', params: { from: 'inside' } }], 0)).not.toThrow();
  });

  it('rejects overlapping actions on the same channel', () => {
    const actions: Action[] = [
      { t: 0, target: 'door', action: 'open', duration: 2 },
      { t: 1, target: 'door', action: 'close' },
    ];
    expect(() => at(actions, 0)).toThrow(/still being changed/);
  });

  it('names what is wrong with a bad action', () => {
    expect(() => at([{ t: 0, target: 'nope', action: 'open' }], 0)).toThrow(/unknown target/);
    expect(() => at([{ t: 0, target: 'door', action: 'fly' }], 0)).toThrow(/unknown action/);
    expect(() => at([{ t: 0, target: 'door', action: 'move', params: { to: [1, 1] } }], 0)).toThrow(/only named props/);
    expect(() => at([{ t: 0, target: 'box', action: 'attach', params: { to: 'car.hood' } }], 0)).toThrow(/no anchor "hood"/);
  });
});

describe('motion', () => {
  const drive: Action[] = [{ t: 0, target: 'car', action: 'move', duration: 4, params: { to: [10, 0] } }];

  it('moves along the path facing the way it goes, and rolls its wheels', () => {
    const mid = at(drive, 2).get('car')!;
    expect(mid.pose!.x).toBeCloseTo(5);
    expect(mid.pose!.rot).toBeCloseTo(-90);
    expect(mid.channels.travel).toBeCloseTo(5);
    expect(at(drive, 10).get('car')!.pose!.x).toBe(10);
  });

  it('continues a second move from where the first one ended', () => {
    const actions: Action[] = [...drive, { t: 5, target: 'car', action: 'move', duration: 2, params: { to: [10, -6] } }];
    const end = at(actions, 7).get('car')!;
    expect([end.pose!.x, end.pose!.z]).toEqual([10, -6]);
    expect(end.pose!.rot).toBeCloseTo(0);
    expect(end.channels.travel).toBeCloseTo(16);
  });
});

describe('attachments', () => {
  const actions: Action[] = [
    { t: 1, target: 'box', action: 'attach', params: { to: 'car.trunk' } },
    { t: 3, target: 'box', action: 'detach', params: { at: [8, 2] } },
  ];

  it('rides an anchor between attach and detach, then stays where it was put', () => {
    expect(at(actions, 0).get('box')!.attachedTo).toBeUndefined();
    expect(at(actions, 2).get('box')!.attachedTo).toBe('car.trunk');
    const after = at(actions, 4).get('box')!;
    expect(after.attachedTo).toBeUndefined();
    expect([after.pose!.x, after.pose!.z]).toEqual([8, 2]);
  });
});
