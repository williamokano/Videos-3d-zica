/**
 * Sound in the studio: the voice takes and the sounds of the episode play along with the timeline. Each cue is an
 * <audio> kept in step with the timeline's time; scrubbing or pausing silences everything.
 */
export interface StudioCue {
  url: string;
  /** Seconds from the start of the episode. */
  t: number;
  volume: number;
  /** For looping sounds, how long they play. */
  length?: number;
  loop?: boolean;
  /** A voice heard through something (a radio): the band of frequencies that gets through, in Hz. */
  band?: [number, number];
}

export class StudioSound {
  muted = false;
  private readonly players = new Map<number, HTMLAudioElement>();
  private context?: AudioContext;

  constructor(private readonly cues: StudioCue[]) {}

  private player(i: number): HTMLAudioElement {
    let audio = this.players.get(i);
    if (!audio) {
      const cue = this.cues[i];
      audio = new Audio(cue.url);
      audio.loop = Boolean(cue.loop);
      audio.volume = Math.min(1, cue.volume);
      if (cue.band) this.narrow(audio, cue.band);
      this.players.set(i, audio);
    }
    return audio;
  }

  /** A rough preview of a filtered voice: only a band of frequencies gets through. The render does the real thing. */
  private narrow(audio: HTMLAudioElement, [low, high]: [number, number]): void {
    try {
      this.context ??= new AudioContext();
      const [highpass, lowpass] = [this.context.createBiquadFilter(), this.context.createBiquadFilter()];
      highpass.type = 'highpass';
      highpass.frequency.value = low;
      lowpass.type = 'lowpass';
      lowpass.frequency.value = high;
      this.context.createMediaElementSource(audio).connect(highpass).connect(lowpass).connect(this.context.destination);
    } catch {
      // Without Web Audio the voice plays unfiltered.
    }
  }

  /** Call every frame: the cues that sound at `time` play from the right point while `playing`; the rest stop. */
  sync(time: number, playing: boolean): void {
    this.cues.forEach((cue, i) => {
      const into = time - cue.t;
      const known = this.players.get(i);
      const length = cue.length ?? (known && Number.isFinite(known.duration) ? known.duration : 30);
      const on = playing && !this.muted && into >= 0 && into < length;
      if (!on) {
        if (known && !known.paused) known.pause();
        return;
      }
      const audio = this.player(i);
      if (this.context?.state === 'suspended') void this.context.resume();
      const at = audio.loop && Number.isFinite(audio.duration) ? into % audio.duration : into;
      if (audio.paused || Math.abs(audio.currentTime - at) > 0.2) audio.currentTime = at;
      if (audio.paused) void audio.play().catch(() => undefined);
    });
  }
}
