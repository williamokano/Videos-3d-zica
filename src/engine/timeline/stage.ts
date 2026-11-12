import '../actions/builtin';
import '../actions/character';
import { compileActions, type CompiledActions } from '../actions/catalog';
import { buildCharacter } from '../character/cast';
import type { CharacterDef, CharacterRig } from '../character/types';
import type { BuiltLocation, InteractiveObject } from '../world/build';
import { buildNav, findPath } from '../world/nav';
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
