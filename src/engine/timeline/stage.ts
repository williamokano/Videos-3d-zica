import '../actions/builtin';
import { ambientAt, behaviourAt } from '../actions/ambient';
import '../actions/character';
import '../actions/endcard';
import '../actions/phone';
import '../assets';
import { channelAt, compileActions, evaluateActions, evaluateLinks, gazeAt, placementAt, seatedDrop, type CompiledActions, type Link } from '../actions/catalog';
import * as THREE from 'three';
import { activeRules, type Bible } from '../bible';
import { buildCharacter } from '../character/cast';
import type { CharacterDef, CharacterRig } from '../character/types';
import { buildProp, clearFraction, type BuiltLocation, type InteractiveObject } from '../world/build';
import { buildNav, findPath } from '../world/nav';
import type { CameraStage } from './camera';
import type { Episode } from './episode';

/** Build the characters of an episode. `rigs` gives ready-made bodies by character id (loaded GLBs). */
export function buildCast(episode: Episode, characters: CharacterDef[], rigs: Record<string, CharacterRig> = {}): InteractiveObject[] {
  return (episode.cast ?? []).map((member) => {
    const def = characters.find((c) => c.id === member.character);
    if (!def) throw new Error(`Personagem "${member.character}" não existe na pasta characters da série.`);
    // A ready-made body (GLB) cannot take a different look.
    return buildCharacter(member, { ...def, ...member.look, id: def.id }, member.look ? undefined : rigs[def.id]);
  });
}

/** Id of the object that holds the state of the world. */
export const WORLD = 'world';

/**
 * The state of the world as an object actions can animate. Channels: `network` (1 while phones have signal)
 * and one `rule.<id>` per rule of the bible, from 0 to 1: how much the rule is in effect. A rule that holds
 * in this episode starts at 1; an episode in which it comes true starts by setting it to 0.
 */
export function buildWorld(bible?: Bible, episode = 1): InteractiveObject {
  const active = new Set(bible ? activeRules(bible, episode).map((r) => r.id) : []);
  const channels: Record<string, number> = { network: 1 };
  for (const rule of bible?.rules ?? []) channels[`rule.${rule.id}`] = active.has(rule.id) ? 1 : 0;
  const state = { ...channels };
  return {
    id: WORLD,
    kind: 'world',
    channels,
    traits: {},
    object: new THREE.Group(),
    set: (channel, value) => {
      if (channel in state) state[channel] = value;
    },
    get: (channel) => state[channel],
    position: () => [0, 0, 0],
  };
}

/** Build the things an episode adds to the location. */
export function buildProps(episode: Pick<Episode, 'props'>): InteractiveObject[] {
  return (episode.props ?? []).map((prop) => buildProp({ ...prop, pickable: prop.pickable ?? Boolean(prop.pocketOf), pos: prop.pos ?? [0, 0] }));
}

/** What rides on what before any action: things that start in a pocket. */
export function initialLinks(episode: Pick<Episode, 'props' | 'cast'>): Link[] {
  return (episode.props ?? []).filter((p) => p.pocketOf).map((p) => {
    if (!episode.cast?.some((m) => (m.id ?? m.character) === p.pocketOf)) throw new Error(`Prop "${p.id}": "${p.pocketOf}" não está no elenco do episódio.`);
    return { target: p.id, to: p.pocketOf!, socket: 'pocket', t0: -Infinity, t1: Infinity };
  });
}

/**
 * Compile an episode's action track against its location and cast. `others` are the remaining objects of
 * the scene: the world state and the episode's own props (built here when not given).
 */
export function compileEpisode(episode: Episode, built: BuiltLocation, cast: InteractiveObject[], others: InteractiveObject[] = [buildWorld(), ...buildProps(episode)]): CompiledActions {
  const nav = cast.length ? buildNav(built) : undefined;
  return compileActions(
    episode.actions ?? [],
    [...built.interactives, ...cast, ...others],
    { findPath: nav && ((from, to, elevation) => findPath(nav, from, to, elevation)) },
    { links: initialLinks(episode) },
  );
}

/** What fpv and third_person shots need: where each character is at any time, and what blocks the view. */
export function cameraStage(compiled: CompiledActions, built: BuiltLocation, cast: InteractiveObject[]): CameraStage {
  const byId = new Map(cast.map((c) => [c.id, c]));
  return {
    subject(id, t) {
      const character = byId.get(id);
      if (!character) return undefined;
      const { pos, yaw } = placementAt(compiled, id, t);
      // Seated, the eyes come down with the hips.
      return { pos, yaw, eyeHeight: (character.traits.eyeHeight ?? 1.6) - seatedDrop(compiled, id, t), head: gazeAt(compiled, id, t) };
    },
    clear: (from, to) => clearFraction(built.colliders, from, to),
  };
}

/**
 * Put every object of the scene where the action track has it at time t: channels first, then whatever
 * rides on something (a character on a car seat, an item in a hand).
 */
export function applyStage(compiled: CompiledActions, objects: Map<string, InteractiveObject>, t: number): void {
  for (const [id, channels] of Object.entries(evaluateActions(compiled, t))) {
    const object = objects.get(id);
    if (!object) continue;
    for (const [channel, value] of Object.entries(channels)) object.set(channel, value);
  }
  // Anything that rides at some point is placed every time, so letting go puts it back where its channels say.
  const links = evaluateLinks(compiled, t);
  for (const id of new Set(compiled.links.map((l) => l.target))) {
    const { pos, yaw } = placementAt(compiled, id, t);
    const rider = objects.get(id)!;
    // In a pocket, out of sight.
    rider.object.visible = links.find((l) => l.target === id)?.socket !== 'pocket';
    rider.set('x', pos[0]);
    rider.set('y', pos[1]);
    rider.set('z', pos[2]);
    rider.set('yaw', yaw);
  }
  const undirected = new Set(compiled.behaviours.map((b) => b.target));
  for (const id of undirected) objects.get(id)!.ambient?.(behaviourAt(compiled.behaviours, id, t) ? ambientAt(compiled.behaviours, id, t) : undefined);
  for (const id of new Set([...compiled.gazes.map((g) => g.target), ...undirected])) {
    const { yaw, pitch } = gazeAt(compiled, id, t);
    objects.get(id)!.set('look.yaw', yaw);
    objects.get(id)!.set('look.pitch', pitch);
  }
  for (const object of objects.values()) object.tick?.(t);
  // Hands move with the pose, so what they hold is placed after the bodies.
  for (const link of links) {
    const holder = objects.get(link.to);
    const socket = holder?.socket?.(link.socket);
    if (socket) objects.get(link.target)!.follow?.(socket, link.weight ? channelAt(compiled, link.target, link.weight, t) : 1, holder);
  }
  for (const object of objects.values()) object.present?.(compiled, t);
}
