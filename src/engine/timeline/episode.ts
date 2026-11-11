import type { CameraKey } from './camera';

/** An episode: which location it plays in and its timeline tracks. Lives in series/<series>/episodes. */
export interface Episode {
  episode: number;
  title: string;
  /** Location id (file name in world/). */
  location: string;
  /** Length in seconds. */
  duration: number;
  camera: CameraKey[];
}

export function frameCount(episode: Episode, fps: number): number {
  return Math.round(episode.duration * fps);
}

/** Time of a frame. Rendering and scrubbing both go through frames, so they always agree. */
export function frameTime(frame: number, fps: number): number {
  return frame / fps;
}
