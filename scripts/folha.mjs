#!/usr/bin/env node
/**
 * Contact sheets of a rendered episode: the whole video at a glance, to look at before saying it is done
 * (tasks/lessons.md, "Assistir o vídeo antes de dizer que está pronto").
 *
 *   <video>-folha.png        a frame every 3 s, with its time
 *   <video>-folha-falas.png  the middle of every spoken line, with its time and who speaks
 *
 * `npm run render` makes them at the end of a full render. By hand, for a video already made:
 *
 *   npm run folha -- --series davi-e-golias --ep 4               (the episode's finished video)
 *   npm run folha -- --series davi-e-golias --ep 4 --video x.mp4 (another file of the same episode)
 *
 * Options:
 *   --every <s>    seconds between frames of the first sheet (default 3)
 *   --width <px>   width of each frame (default 216)
 *   --dir <folder> base folder for the outputs, as in render.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { episodeFile, episodeFolder } from './paths.mjs';
import { finalOf } from './tempo.mjs';

const FONT = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf', '/Library/Fonts/Arial Bold.ttf'].find(existsSync);
const COLUMNS = 8;

const run = (command, args) =>
  new Promise((ok, fail) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', () => fail(new Error(`Não achei o ${command}. Instale o ffmpeg e deixe no PATH.`)));
    child.on('close', (code) => (code === 0 ? ok(out) : fail(new Error(`${command} terminou com erro (${code}): ${err.trim().split('\n').pop()}`))));
  });

const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
/** Text safe inside a drawtext option (between single quotes). */
const quoted = (text) => text.replace(/\\/g, '\\\\').replace(/'/g, '\u2019').replace(/:/g, '\\:').replace(/%/g, '\\%');

/** Seconds the video lasts. */
export async function videoLength(video) {
  return Number(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]));
}

/**
 * One sheet: the frames of `video` at `shots` ({ t, label }), in rows of COLUMNS, each with its label on it,
 * written to `out` (PNG).
 */
export async function contactSheet(video, shots, out, { width = 216 } = {}) {
  if (!shots.length) return undefined;
  const scratch = mkdtempSync(join(tmpdir(), 'folha-'));
  try {
    // One frame at a time: seeking before the input is fast and exact enough for a look.
    await Promise.all(shots.map(async ({ t, label }, i) => {
      const text = FONT ? `,drawbox=x=0:y=ih-30:w=iw:h=30:color=black@0.65:t=fill,drawtext=fontfile=${FONT}:text='${quoted(label)}':x=6:y=h-22:fontsize=14:fontcolor=white` : '';
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, t)), '-i', video, '-frames:v', '1', '-vf', `scale=${width}:-2${text}`, join(scratch, `q${String(i).padStart(4, '0')}.png`)]);
    }));
    const rows = Math.ceil(shots.length / COLUMNS);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', join(scratch, 'q%04d.png'), '-vf', `tile=${COLUMNS}x${rows}:padding=4:margin=4:color=0x202020`, '-frames:v', '1', out]);
    return out;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/**
 * Both sheets of an episode's video: every `every` seconds, and the middle of each line. `episode` (resolved, with
 * `actions`, `cuts`, `slow`) gives the lines; without it, only the first sheet is made. `from` is where the video
 * starts in the finished episode's time (a render with --from).
 */
export async function episodeSheets(video, { episode, labelOf = (c) => c.target, every = 3, width, from = 0 } = {}) {
  const length = await videoLength(video);
  const base = video.replace(/\.mp4$/, '');
  const times = [];
  for (let t = 0.5; t < length; t += every) times.push(t);
  const made = [await contactSheet(video, times.map((t) => ({ t, label: clock(t + from) })), `${base}-folha.png`, { width })];
  if (episode) {
    const final = finalOf(episode);
    const lines = (episode.actions ?? [])
      .filter((c) => c.action === 'say' || c.action === 'narrate')
      .map((c) => ({ t: (final(c.t) + final(c.t + (c.duration ?? 0))) / 2 - from, label: `${clock((final(c.t) + final(c.t + (c.duration ?? 0))) / 2)} ${labelOf(c)}` }))
      .filter(({ t }) => t >= 0 && t < length);
    made.push(await contactSheet(video, lines, `${base}-folha-falas.png`, { width }));
  }
  return made.filter(Boolean);
}

// By hand.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
  };
  const { createServer } = await import('vite');
  const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  try {
    const library = await server.ssrLoadModule('/src/tools/library.ts');
    const series = option('series', library.seriesIds()[0]);
    const { episode, characters, bible } = library.loadEpisode(series, option('ep') ? Number(option('ep')) : undefined);
    const video = resolve(option('video', join(episodeFolder(series, episode.episode, { dir: option('dir'), output: bible.output }), episodeFile(series, episode.episode, 'mp4'))));
    if (!existsSync(video)) throw new Error(`Vídeo não encontrado: ${video}. Rode "npm run render" ou passe --video.`);
    const nameOf = (id) => {
      if (id === 'world') return 'Narrador';
      const m = episode.cast?.find((c) => (c.id ?? c.character) === id);
      return m?.look?.name ?? characters.find((c) => c.id === m?.character)?.name ?? id;
    };
    const sheets = await episodeSheets(video, { episode, labelOf: (c) => nameOf(c.action === 'narrate' ? c.params?.as ?? 'world' : c.target), every: Number(option('every', 3)), width: Number(option('width', 216)) });
    for (const sheet of sheets) console.log(sheet);
  } finally {
    await server.close();
  }
}
