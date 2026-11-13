import { listActions, type ActionDef } from '../actions/catalog';
import { assetKind, createAsset, listAssets } from './registry';

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

/** An action that makes sense for an asset, and what it does there. */
export interface AssetAction {
  action: string;
  /** What it moves on this asset: parts, seats, what is switched. */
  what: string;
}

/** Places that are for putting things on, not for sitting. */
const SURFACES = /^(top|inside|shelf\d*)$/;
/** Channels that say where an object is; `moveTo`, `drive` and falling over move them. */
const PLACEMENT = ['x', 'y', 'z', 'yaw', 'lean', 'leanTo'];

/**
 * The actions that make sense for an asset, worked out from what the asset has: channels, places to sit or to
 * put things, whether it is a vehicle, a loose thing, something carried. `uses` lists the channels and places
 * those actions account for, so a test can tell when an asset has something no action reaches.
 */
export function assetActions(id: string): { actions: AssetAction[]; uses: string[]; channels: string[]; places: string[] } {
  const asset = createAsset(id);
  const kind = assetKind(id);
  const channels = Object.keys((asset.userData.channels ?? {}) as Record<string, unknown>);
  const places: string[] = [];
  asset.traverse((o) => void (o !== asset && o.name.startsWith('seat.') && places.push(o.name.slice(5))));
  const actions: AssetAction[] = [];
  const uses: string[] = [];
  const add = (action: string, what: string, used: string[]) => {
    actions.push({ action, what });
    uses.push(...used);
  };

  const opening = channels.filter((c) => c === 'open' || c.endsWith('.open'));
  if (opening.length) {
    const parts = opening.filter((c) => c !== 'open').map((c) => c.slice(0, -5));
    add('open / close', parts.length ? `partes: ${parts.join(', ')}` : 'o objeto inteiro', opening);
  }
  const switches = channels.filter((c) => ['on', 'siren', 'lights'].includes(c));
  if (switches.length) add('switch', switches.map((c) => ({ on: 'liga e desliga', siren: 'giroflex ("what": "siren")', lights: 'faróis ("what": "lights")' })[c]).join('; '), switches);
  if (channels.includes('state')) add('signal', 'red, yellow, green, off', ['state']);
  if (kind === 'vehicle') add('drive', `anda por um caminho${channels.includes('steer') ? ', virando as rodas da frente' : ''}`, ['travel', 'steer']);
  const seats = places.filter((n) => !SURFACES.test(n));
  if (seats.length) add('sit / standUp', `lugares: ${seats.join(', ')}`, seats);
  const surfaces = places.filter((n) => SURFACES.test(n));
  if (surfaces.length) add('putDown (com "on")', `onde pôr coisas: ${surfaces.join(', ')}`, surfaces);
  if (id.startsWith('item.')) add('pickUp / putDown / putAway', 'pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")', []);
  if (id === 'item.phone' || id === 'item.radio') add('raise / lower', 'levar à frente do rosto ou do peito', []);
  if (kind === 'phone') add('screen', 'mensagens, digitando, tela acesa ou apagada', ['network']);
  if (asset.userData.loose) add('knockOver / setUpright', 'derrubar e pôr de pé', []);
  if (asset.userData.gate) uses.push('open');
  return { actions, uses: [...uses, ...PLACEMENT], channels, places };
}
