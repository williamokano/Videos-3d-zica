import '../actions/builtin';
import '../actions/character';
import { channelAt, compileActions, evaluateActions, evaluateLinks, placementAt, type CompiledActions } from '../actions/catalog';
import { buildCharacter } from '../character/cast';
import type { CharacterDef, CharacterRig } from '../character/types';
import { clearFraction, type BuiltLocation, type InteractiveObject } from '../world/build';
import { buildNav, findPath } from '../world/nav';
import type { CameraStage } from './camera';
import type { Episode } from './episode';

/** Build the characters of an episode. `rigs` gives ready-made bodies by character id (loaded GLBs). */
export function buildCast(episode: Episode, characters: CharacterDef[], rigs: Record<string, CharacterRig> = {}): InteractiveObject[] {
  return (episode.cast ?? []).map((member) => {
    const def = characters.find((c) => c.id === member.character);
    if (!def) throw new Error(`Personagem "${member.character}" não existe na pasta characters da série.`);
    return buildCharacter(member, def, rigs[def.id]);
  });
}

/** Compile an episode's action track against its location and cast. */
export function compileEpisode(episode: Episode, built: BuiltLocation, cast: InteractiveObject[]): CompiledActions {
  const nav = cast.length ? buildNav(built) : undefined;
  return compileActions(episode.actions ?? [], [...built.interactives, ...cast], {
    findPath: nav && ((from, to, elevation) => findPath(nav, from, to, elevation)),
  });
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
      const seated = 0.8 * (character.traits.bodyScale ?? 1) * channelAt(compiled, id, 'sit', t);
      return { pos, yaw, eyeHeight: (character.traits.eyeHeight ?? 1.6) - seated };
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
    const object = objects.get(id)!;
    for (const [channel, value] of Object.entries(channels)) object.set(channel, value);
  }
  // Anything that rides at some point is placed every time, so letting go puts it back where its channels say.
  for (const id of new Set(compiled.links.map((l) => l.target))) {
    const { pos, yaw } = placementAt(compiled, id, t);
    const rider = objects.get(id)!;
    rider.set('x', pos[0]);
    rider.set('y', pos[1]);
    rider.set('z', pos[2]);
    rider.set('yaw', yaw);
  }
  for (const object of objects.values()) object.tick?.(t);
  // Hands move with the pose, so what they hold is placed after the bodies.
  for (const link of evaluateLinks(compiled, t)) {
    const socket = objects.get(link.to)?.socket?.(link.socket);
    if (socket) objects.get(link.target)!.follow?.(socket, link.weight ? channelAt(compiled, link.target, link.weight, t) : 1);
  }
}
