import type { ActionClip } from '../actions/catalog';
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
}

export function frameCount(episode: Episode, fps: number): number {
  return Math.round(episode.duration * fps);
}

/** Time of a frame. Rendering and scrubbing both go through frames, so they always agree. */
export function frameTime(frame: number, fps: number): number {
  return frame / fps;
}
