/**
 * The series on disk, as data: bibles, locations, characters, episodes and voice takes. Used by the command-line
 * tools (`npm run voz`, `npm run roteiro`, the audio of `npm run render`), which load it through Vite.
 */
import '../engine/assets';
import type { Take } from '../engine/audio/voice';
import type { Bible } from '../engine/bible';
import type { CharacterDef } from '../engine/character/types';
import { isScript, resolveScript, type EpisodeScript } from '../engine/timeline/direct';
import type { Episode } from '../engine/timeline/episode';
import { buildLocation } from '../engine/world/build';
import type { Location } from '../engine/world/types';

const bibles = import.meta.glob<Bible>('/series/*/bible.json', { eager: true, import: 'default' });
const locations = import.meta.glob<Location>('/series/*/world/*.json', { eager: true, import: 'default' });
const episodes = import.meta.glob<Episode | EpisodeScript>('/series/*/episodes/*.{json,ts}', { eager: true, import: 'default' });
const characters = import.meta.glob<CharacterDef>('/series/*/characters/*.json', { eager: true, import: 'default' });
const takeFiles = import.meta.glob<Take>('/series/*/audio/voz/*.json', { eager: true, import: 'default' });

const inSeries = <T>(files: Record<string, T>, series: string): T[] =>
  Object.entries(files).filter(([path]) => path.startsWith(`/series/${series}/`)).map(([, v]) => v);

/** The takes of a series, by key. */
export function takesOf(series: string): Record<string, Take> {
  return Object.fromEntries(inSeries(takeFiles, series).map((t) => [t.key, t]));
}

export function seriesIds(): string[] {
  return Object.values(bibles).map((b) => b.series);
}

/** An episode with every time worked out, and what it needs around it. */
export function loadEpisode(series: string, number?: number): { bible: Bible; episode: Episode; characters: CharacterDef[]; location: Location } {
  const bible = Object.values(bibles).find((b) => b.series === series);
  if (!bible) throw new Error(`Série "${series}" não encontrada. Séries: ${seriesIds().join(', ')}.`);
  const all = inSeries(episodes, series).sort((a, b) => a.episode - b.episode);
  const source = number === undefined ? all[0] : all.find((e) => e.episode === number);
  if (!source) throw new Error(`A série "${series}" não tem o episódio ${number}.`);
  const location = inSeries(locations, series).find((l) => l.id === source.location);
  if (!location) throw new Error(`O cenário "${source.location}" não existe em series/${series}/world/.`);
  const defs = inSeries(characters, series);
  const episode = isScript(source) ? resolveScript(source, buildLocation(location), defs, bible, takesOf(series)) : source;
  return { bible, episode, characters: defs, location };
}
