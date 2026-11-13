/**
 * The sound of an episode: every voice take and every sound at its time, mixed and brought to a loudness fit for
 * social video (−14 LUFS), as a WAV. Used by render.mjs; on its own:
 *
 *   node scripts/mix.mjs --series ceu-vermelho --ep 1        (goes to the episode's folder: scripts/paths.mjs)
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * What plays when, from an episode resolved by src/tools/library.ts. Lines without a take are silent (and reported).
 * Times are shifted by `from` and cut at `to`.
 */
export function cuesOf({ series, bible, episode, soundFile, filters = {} }, from = 0, to = episode.duration) {
  const root = resolve('series', series, 'audio');
  const cuts = episode.cuts ?? [];
  // Jump cuts: times move to where they land in the finished video; a sound that starts inside a cut starts
  // partway in, where the cut ends.
  const final = (t) => cuts.reduce((out, [a, b]) => (t > a ? out - (Math.min(t, b) - a) : out), t);
  const place = (t0) => {
    const cut = cuts.find(([a, b]) => t0 >= a && t0 < b);
    return { t: final(t0) - final(from), skip: cut ? cut[1] - t0 : 0 };
  };
  const span = final(to) - final(from);
  const cues = [];
  const silent = [];
  for (const clip of episode.actions ?? []) {
    const { t, skip } = place(clip.t);
    if (clip.action === 'say' || clip.action === 'narrate') {
      const take = clip.params?.take;
      if (!take) {
        silent.push(`${clip.target}: ${clip.params?.text}`);
        continue;
      }
      if (t + take.duration <= 0 || t >= span) continue;
      // A voice over a radio or a phone: the take is clean, the filter is put on here.
      cues.push({ file: join(root, 'voz', `${take.key}.mp3`), t, skip, volume: 1, voice: true, filter: filters[clip.params.filter]?.ffmpeg });
    } else if (clip.action === 'sound') {
      const def = bible.audio?.sounds?.[clip.params.name];
      if (!def || t >= span) continue;
      // A looping sound plays until its end, as moved by the cuts.
      const length = clip.params.length === undefined ? undefined : final(clip.t + clip.params.length) - final(clip.t) - skip;
      if (length !== undefined && (length <= 0 || t + length <= 0)) continue;
      cues.push({ file: join(root, 'sons', soundFile(clip.params.name, def)), t, skip, volume: (clip.params.volume ?? def.volume ?? 1), length, fade: clip.params.fade ?? 0, loop: def.loop });
    }
  }
  const lost = cues.filter((c) => !existsSync(c.file));
  if (lost.length) throw new Error(`Faltam arquivos de áudio (rode "npm run voz"):\n${lost.map((c) => `  ${c.file}`).join('\n')}`);
  return { cues, silent };
}

function run(args) {
  return new Promise((ok, fail) => {
    const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'inherit', 'pipe'] });
    let err = '';
    ffmpeg.stderr.on('data', (d) => (err += d));
    ffmpeg.on('error', () => fail(new Error('Não achei o ffmpeg.')));
    ffmpeg.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg falhou ao mixar o áudio:\n${err.slice(-1500)}`))));
  });
}

/**
 * Mix cues into a WAV of `length` seconds. Sounds under the voices are lowered while someone speaks (ducking),
 * then the whole is brought to −14 LUFS with peaks under −1.5 dBTP.
 */
export async function mix(cues, length, out) {
  const inputs = [];
  const voices = [];
  const beds = [];
  cues.forEach((c, i) => {
    if (c.loop && c.length) inputs.push('-stream_loop', '-1');
    inputs.push('-i', c.file);
    const delay = Math.max(0, Math.round(c.t * 1000));
    // A cue that starts before the stretch being mixed starts partway in.
    const into = (c.skip ?? 0) + Math.max(0, -c.t);
    const skip = into > 0 ? `atrim=start=${into.toFixed(3)},asetpts=PTS-STARTPTS,` : '';
    const span = c.length ? `atrim=0:${(c.length - Math.max(0, -c.t)).toFixed(3)},` : '';
    const fade = c.length && c.fade ? `afade=t=in:d=${c.fade},afade=t=out:st=${Math.max(0, c.length - c.fade).toFixed(3)}:d=${c.fade},` : '';
    const through = c.filter ? `${c.filter},` : '';
    const chain = `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,${skip}${span}${fade}${through}volume=${c.volume},adelay=${delay}:all=1,apad[c${i}]`;
    (c.voice ? voices : beds).push({ i, chain });
  });
  const parts = [...voices, ...beds].map((x) => x.chain);
  const silence = `anullsrc=r=48000:cl=stereo,atrim=0:${length.toFixed(3)}`;
  const all = (list, name) => (list.length ? `${list.map((x) => `[c${x.i}]`).join('')}amix=inputs=${list.length}:normalize=0:duration=longest[${name}]` : `${silence}[${name}]`);
  parts.push(all(voices, 'vo'), all(beds, 'fx'));
  // Voices lead; the rest ducks under them.
  parts.push('[vo]asplit=2[vo1][key]', '[fx][key]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[fxd]');
  parts.push(`[vo1][fxd]amix=inputs=2:normalize=0:duration=longest,atrim=0:${length.toFixed(3)},acompressor=threshold=0.1:ratio=3:attack=5:release=120,loudnorm=I=-14:TP=-1.5:LRA=11[out]`);
  await run(['-y', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';'), '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', out]);
}

/** Join a video and its sound without touching the picture. */
export function mux(video, audio, out) {
  return run(['-y', '-loglevel', 'error', '-i', video, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
}

/** Load an episode and what mixing it needs, through a Vite server. */
export async function episodeAudio(server, series, ep) {
  const library = await server.ssrLoadModule('/src/tools/library.ts');
  const { soundFile } = await server.ssrLoadModule('/src/engine/audio/sound.ts');
  const { VOICE_FILTERS } = await server.ssrLoadModule('/src/engine/audio/voice.ts');
  const id = series ?? library.seriesIds()[0];
  const { bible, episode } = library.loadEpisode(id, ep);
  return { series: id, bible, episode, soundFile, filters: VOICE_FILTERS };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
  };
  const { createServer } = await import('vite');
  const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  try {
    const data = await episodeAudio(server, option('series'), option('ep') ? Number(option('ep')) : undefined);
    const { cues, silent } = cuesOf(data);
    for (const s of silent) console.warn(`Sem gravação: ${s}`);
    const { episodeFile, episodeFolder } = await import('./paths.mjs');
    const { mkdirSync } = await import('node:fs');
    const folder = episodeFolder(data.series, data.episode.episode, { dir: option('dir'), output: data.bible.output });
    mkdirSync(folder, { recursive: true });
    const out = resolve(option('out', join(folder, episodeFile(data.series, data.episode.episode, 'wav'))));
    const cut = (data.episode.cuts ?? []).reduce((sum, [a, b]) => sum + b - a, 0);
    await mix(cues, data.episode.duration - cut, out);
    console.log(out);
  } finally {
    await server.close();
  }
}
