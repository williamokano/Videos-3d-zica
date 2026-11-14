/**
 * Time in the finished video, against time in the episode: jump cuts (`cuts`, [from, to]) are taken out and slow
 * motion (`slow`, [from, to, factor]) is stretched. Shared by render.mjs, mix.mjs and roteiro.mjs; the same rule as
 * finalTime in src/engine/timeline/episode.ts.
 */

/** A function from a time of the episode to its time in the finished video. */
export function finalOf({ cuts = [], slow = [] } = {}) {
  return (t) => {
    let out = t;
    for (const [a, b] of cuts) if (t > a) out -= Math.min(t, b) - a;
    for (const [a, b, k] of slow) if (t > a) out += (k - 1) * (Math.min(t, b) - a);
    return out;
  };
}

/**
 * The frames to draw, as frame numbers of the episode (n / fps is the time), from frame `first` to `last`, every
 * `step`: frames in a jump cut stay out, and in slow motion each frame is drawn `factor` times, a fraction apart.
 */
export function frameList({ cuts = [], slow = [] } = {}, fps, first, last, step = 1) {
  const frames = [];
  for (let n = first; n < last; n += step) {
    const t = n / fps;
    if (cuts.some(([a, b]) => t >= a && t < b)) continue;
    const s = slow.find(([a, b]) => t >= a - 1e-9 && t < b - 1e-9);
    if (!s) {
      frames.push(n);
      continue;
    }
    for (let k = 0; k < s[2]; k++) frames.push(n + (k * step) / s[2]);
  }
  return frames;
}
