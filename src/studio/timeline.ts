import type { Episode } from '../engine/timeline/episode';
import { frameCount } from '../engine/timeline/episode';

/** Transport bar: play/pause, frame stepping and a scrubber. Time always snaps to whole frames. */
export class TimelineBar {
  readonly element = document.createElement('div');
  frame = 0;
  playing = false;
  private readonly frames: number;
  private readonly slider = document.createElement('input');
  private readonly label = document.createElement('span');
  private readonly playButton = document.createElement('button');
  private carry = 0;

  constructor(
    episode: Episode,
    private readonly fps: number,
    private readonly onChange: () => void,
  ) {
    this.frames = frameCount(episode, fps);
    this.element.className = 'timeline';

    const button = (text: string, title: string, action: () => void) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.title = title;
      b.onclick = action;
      return b;
    };
    this.playButton.title = 'Tocar / pausar (espaço)';
    this.playButton.onclick = () => this.toggle();

    const track = document.createElement('div');
    track.className = 'track';
    this.slider.type = 'range';
    this.slider.min = '0';
    this.slider.max = String(this.frames);
    this.slider.step = '1';
    this.slider.oninput = () => {
      this.playing = false;
      this.seek(Number(this.slider.value));
    };
    track.append(this.slider);
    for (const key of episode.camera) {
      const mark = document.createElement('i');
      mark.title = `Keyframe de câmera em ${key.t}s${key.cut ? ' (corte)' : ''}`;
      mark.style.left = `${(key.t / episode.duration) * 100}%`;
      if (key.cut) mark.className = 'cut';
      track.append(mark);
    }

    this.element.append(
      button('⏮', 'Voltar ao início', () => this.seek(0)),
      button('◀', 'Frame anterior (,)', () => this.seek(this.frame - 1)),
      this.playButton,
      button('▶', 'Próximo frame (.)', () => this.seek(this.frame + 1)),
      track,
      this.label,
    );

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === ',') this.seek(this.frame - 1);
      else if (e.key === '.') this.seek(this.frame + 1);
    });
    this.refresh();
  }

  get time(): number {
    return this.frame / this.fps;
  }

  toggle(): void {
    if (!this.playing && this.frame >= this.frames) this.frame = 0;
    this.playing = !this.playing;
    this.carry = 0;
    this.refresh();
  }

  seek(frame: number): void {
    this.frame = Math.max(0, Math.min(this.frames, Math.round(frame)));
    this.refresh();
    this.onChange();
  }

  /** Advance playback by real elapsed time, landing on whole frames. */
  update(dt: number): void {
    if (!this.playing) return;
    this.carry += dt * this.fps;
    const step = Math.floor(this.carry);
    if (!step) return;
    this.carry -= step;
    if (this.frame + step >= this.frames) this.playing = false;
    this.seek(this.frame + step);
  }

  private refresh(): void {
    this.slider.value = String(this.frame);
    this.playButton.textContent = this.playing ? '⏸' : '⏵';
    const t = this.time;
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = (t % 60).toFixed(2).padStart(5, '0');
    this.label.textContent = `${mm}:${ss} · frame ${this.frame} / ${this.frames} · ${this.fps} fps`;
  }
}
