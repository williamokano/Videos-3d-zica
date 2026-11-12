/**
 * Sounds of the world: a phone buzzing, a door, the murmur of a class. A series names its sounds in the bible
 * (`audio.sounds`) and episodes play them by name (`d.sound`). A sound is either made by the provider from a
 * description, or a file taken from a library with a permissive license (CC0 and the like), kept with where it
 * came from and under which license.
 *
 * Files live in series/<series>/audio/sons/. A made sound is <name>-<key>.mp3, the key coming from what was
 * asked, so changing the description makes a new file and the old one is not used any more.
 */

export interface SoundDef {
  /** What the provider makes, described in English (works best), e.g. "smartphone vibrating twice on a wooden desk". */
  prompt?: string;
  /** Or a file in audio/sons/, e.g. "porta-rangendo.ogg", from a library with a permissive license. */
  file?: string;
  /** For a file: its license ("CC0-1.0", "CC-BY-4.0"...), where it came from, and who made it (for credits). */
  license?: string;
  source?: string;
  author?: string;
  /** For a made sound: its length in seconds (0.5 to 22; default: the provider chooses). */
  duration?: number;
  /** For a made sound: 0 to 1, how literally the description is followed (default 0.5). */
  influence?: number;
  /** Made to loop seamlessly (ambience). */
  loop?: boolean;
  /** Loudness, 0 to 1 and over (default 1). */
  volume?: number;
}

/** A sound played in an episode, as kept in its compiled events. */
export interface SoundCue {
  name: string;
  /** Seconds from the start of the episode. */
  t: number;
  volume: number;
  /** For a looping sound: how long it plays. Otherwise the file plays once, to its end. */
  length?: number;
  /** Seconds to fade in and out (looping sounds). */
  fade: number;
}

function hash(text: string): string {
  let a = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) a = Math.imul(a ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return a.toString(16).padStart(8, '0');
}

/** The file of a sound, inside audio/sons/. */
export function soundFile(name: string, def: SoundDef): string {
  if (def.file) return def.file;
  if (!def.prompt) throw new Error(`O som "${name}" precisa de "prompt" (para gerar) ou de "file" (um arquivo baixado).`);
  return `${name}-${hash(JSON.stringify([def.prompt, def.duration ?? null, def.influence ?? null, Boolean(def.loop)]))}.mp3`;
}

/** A license that lets the series use a file without asking: the file can go in a published video. */
export const PERMISSIVE_LICENSES = ['CC0-1.0', 'CC-BY-4.0', 'CC-BY-3.0', 'Pixabay', 'Mixkit', 'Kenney-CC0'];
