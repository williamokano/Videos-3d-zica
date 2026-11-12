import { describe, expect, it } from 'vitest';
import './actions/builtin';
import './actions/character';
import './actions/phone';
import './assets';
import { listAssets } from './assets/registry';
import { actionsFor, assetGroups, channelRange, rowLayout } from './assets/showcase';
import { buildProp } from './world/build';

describe('asset showcase', () => {
  it('groups the whole kit by the first part of the id, in order', () => {
    const groups = assetGroups();
    expect(groups.flatMap((g) => g.assets).length).toBe(listAssets().length);
    expect(groups.map((g) => g.id)).toEqual([...groups.map((g) => g.id)].sort());
    for (const group of groups) for (const asset of group.assets) expect(asset.id.startsWith(`${group.id}.`)).toBe(true);
    expect(groups.find((g) => g.id === 'vehicle')!.assets.map((a) => a.id)).toContain('vehicle.car');
  });

  it('lays things out in a row centered on the origin, a gap apart', () => {
    expect(rowLayout([])).toEqual([]);
    expect(rowLayout([2])).toEqual([0]);
    const xs = rowLayout([2, 1, 4], 0.5);
    expect(xs[0] - 1).toBeCloseTo(-(xs[2] + 2));
    // Right edge of one to left edge of the next.
    expect(xs[1] - 0.5 - (xs[0] + 1)).toBeCloseTo(0.5);
    expect(xs[2] - 2 - (xs[1] + 0.5)).toBeCloseTo(0.5);
  });

  it('lists the actions that fit each kind', () => {
    const ids = (kind: string) => actionsFor(kind).map((a) => a.id);
    expect(ids('vehicle')).toEqual(expect.arrayContaining(['open', 'close', 'drive', 'set']));
    expect(ids('item')).toEqual(expect.arrayContaining(['pickUp', 'putDown', 'set']));
    expect(ids('prop')).not.toContain('drive');
    expect(ids('prop')).not.toContain('walkTo');
  });

  it('builds every asset of the kit as an object with its channels', () => {
    for (const asset of listAssets()) {
      const object = buildProp({ id: asset.id, asset: asset.id, pos: [0, 0] });
      for (const name of Object.keys(object.object.userData.channels ?? {})) {
        const [low, high, step] = channelRange(name);
        expect(low < high && step > 0, `${asset.id}: ${name}`).toBe(true);
        object.set(name, high);
        object.set(name, low);
      }
    }
    const car = buildProp({ id: 'c', asset: 'vehicle.car', pos: [0, 0] });
    expect(Object.keys(car.object.userData.channels)).toEqual(expect.arrayContaining(['frontLeft.open', 'travel']));
    expect(channelRange('frontLeft.open')).toEqual([0, 1, 0.01]);
  });
});
