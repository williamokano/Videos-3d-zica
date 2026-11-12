import type { ActionClip } from '../actions/catalog';
import type { LineVoice } from '../audio/voice';
import type { CastMember } from '../character/cast';
import type { Prop } from '../world/types';
import type { CameraKey } from './camera';

/** Something an episode brings into the location: a phone, a bag. Same as a location prop, placed in location coordinates. */
export interface EpisodeProp extends Omit<Prop, 'repeat' | 'pos'> {
  id: string;
  /** [x, z] in location coordinates (default [0, 0], for things that start in a pocket). */
  pos?: [number, number];
  /** Starts in the pocket of this cast member, out of sight until taken out with pickUp. */
  pocketOf?: string;
}

/** An episode: which location it plays in and its timeline tracks. Lives in series/<series>/episodes. */
export interface Episode {
  episode: number;
  title: string;
  /** Location id (file name in world/). */
  location: string;
  /** Length in seconds. */
  duration: number;
  camera: CameraKey[];
  /** Characters in the episode and where each one starts. */
  cast?: CastMember[];
  /** Things this episode adds to the location. */
  props?: EpisodeProp[];
  /** What happens to interactive objects: doors opening, cars driving, items picked up. */
  actions?: ActionClip[];
  /**
   * Stretches taken out of the finished video, [from, to] in seconds: jump cuts, e.g. over a long walk. The
   * episode still happens in full (everything stays continuous), only the picture and sound skip them.
   */
  cuts?: [number, number][];
  /**
   * Things that compile but look wrong, found by the director: someone standing still for a while with nothing to
   * do. Shown in the studio and in `npm run roteiro`.
   */
  warnings?: string[];
  /** Spoken lines with their voices, for making the takes (`npm run voz`). Filled in by scripts. */
  lines?: LineVoice[];
}

/** Whether a time falls in a jump cut, and where the cut ends. */
export function cutAt(episode: Pick<Episode, 'cuts'>, t: number): [number, number] | undefined {
  return episode.cuts?.find(([from, to]) => t >= from && t < to);
}

/** Time in the finished video for a time of the episode (a time inside a cut goes to where the cut is). */
export function finalTime(episode: Pick<Episode, 'cuts'>, t: number): number {
  let out = t;
  for (const [from, to] of episode.cuts ?? []) if (t > from) out -= Math.min(t, to) - from;
  return out;
}

export function frameCount(episode: Episode, fps: number): number {
  return Math.round(episode.duration * fps);
}

/** Time of a frame. Rendering and scrubbing both go through frames, so they always agree. */
export function frameTime(frame: number, fps: number): number {
  return frame / fps;
}
