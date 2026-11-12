import { listActions, type ActionDef } from '../actions/catalog';
import { listAssets } from './registry';

/**
 * The showcase of assets: everything in the kit, by group, side by side on an empty stage, to look at each
 * one and move its channels outside an episode.
 */

export interface AssetGroup {
  /** The part of the asset ids before the dot: "vehicle", "school", "item"... */
  id: string;
  assets: { id: string; description: string; kind: string }[];
}

/** The kit by group, groups and assets in alphabetical order. */
export function assetGroups(): AssetGroup[] {
  const groups = new Map<string, AssetGroup>();
  for (const asset of listAssets()) {
    const id = asset.id.split('.')[0];
    if (!groups.has(id)) groups.set(id, { id, assets: [] });
    groups.get(id)!.assets.push(asset);
  }
  return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id)).map((g) => ({ ...g, assets: g.assets.sort((a, b) => a.id.localeCompare(b.id)) }));
}

/** Where each thing stands on a row centered on the origin, given how wide each is: its x, with `gap` between neighbours. */
export function rowLayout(widths: number[], gap = 0.8): number[] {
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, widths.length - 1);
  let left = -total / 2;
  return widths.map((w) => {
    const x = left + w / 2;
    left += w + gap;
    return x;
  });
}

/** The actions of the catalog that fit an object of a kind ("vehicle", "item", "prop"...). */
export function actionsFor(kind: string): ActionDef[] {
  return listActions().filter((a) => a.appliesTo.includes('*') || a.appliesTo.includes(kind));
}

/** The range a channel's slider covers. Most channels go from 0 to 1; a few are known to be something else. */
export function channelRange(channel: string): [number, number, number] {
  if (channel === 'travel') return [0, 20, 0.05];
  if (channel === 'network') return [-1, 1, 1];
  return [0, 1, 0.01];
}
