/**
 * Where the tools write. Everything an episode produces goes in its own folder:
 *
 *   <base>/<series>/ep001/<series>-ep001.mp4          the finished video (npm run render)
 *   <base>/<series>/ep001/<series>-ep001-previa.mp4   previews: smaller, a stretch, or an animatic
 *   <base>/<series>/ep001/<series>-ep001.wav          the sound alone (node scripts/mix.mjs)
 *   <base>/<series>/ep001/quadros/                    pictures of instants (npm run look)
 *
 * <base> is, in this order: --dir <folder>, the VIDEOS_OUT environment variable, "output" in the series'
 * bible.json, or out/ in the project. "~" at the start is the home folder.
 */
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const expand = (path) => (path.startsWith('~') ? join(homedir(), path.slice(1)) : path);

/** The folder of an episode's outputs. `dir` is the --dir option, `output` the bible's. */
export function episodeFolder(series, episode, { dir, output } = {}) {
  const base = dir ?? process.env.VIDEOS_OUT ?? output ?? 'out';
  return resolve(expand(base), series, `ep${String(episode).padStart(3, '0')}`);
}

/** File name of an episode's output, e.g. ceu-vermelho-ep001.mp4 or ceu-vermelho-ep001-previa.mp4. */
export function episodeFile(series, episode, extension, suffix = '') {
  return `${series}-ep${String(episode).padStart(3, '0')}${suffix}.${extension}`;
}
