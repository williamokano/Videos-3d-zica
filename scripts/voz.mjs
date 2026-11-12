#!/usr/bin/env node
/**
 * Make the voice takes and the sounds an episode is missing, with ElevenLabs.
 *
 *   npm run voz -- --series ceu-vermelho --ep 1            # makes what is missing
 *   npm run voz -- --series ceu-vermelho --ep 1 --dry      # only lists what would be made, and its cost in characters
 *
 * Takes are found by what they sound like (voice, model, text with its tone): a line already made costs nothing,
 * wherever it moved in the episode. Files go to series/<series>/audio/voz/<key>.mp3 + .json and
 * series/<series>/audio/sons/. Sounds with "file" in the bible are not made: they come from a sound library and
 * have to be in audio/sons/ already (see the "som" of the direct-actions skill).
 *
 * Options:
 *   --series <id>   series (default: the first one)
 *   --ep <n>        episode (default: the first one)
 *   --dry           list and estimate, make nothing
 *   --again <key>   make a take again even if it exists (another reading of the same line); repeatable
 *
 * The key is read from ELEVEN_API_KEY (or ELEVENLABS_API_KEY) and is never written anywhere.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const again = args.flatMap((a, i) => (a === '--again' ? [args[i + 1]] : []));
const dry = args.includes('--dry');
const apiKey = process.env.ELEVEN_API_KEY ?? process.env.ELEVENLABS_API_KEY;
if (!dry && !apiKey) {
  console.error('Falta a chave da ElevenLabs: defina ELEVEN_API_KEY no ambiente.');
  process.exit(1);
}

const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
let failed = false;
try {
  const library = await server.ssrLoadModule('/src/tools/library.ts');
  const voice = await server.ssrLoadModule('/src/engine/audio/voice.ts');
  const sound = await server.ssrLoadModule('/src/engine/audio/sound.ts');
  const series = option('series', library.seriesIds()[0]);
  const { bible, episode } = library.loadEpisode(series, option('ep') ? Number(option('ep')) : undefined);
  const root = resolve('series', series, 'audio');
  const voz = join(root, 'voz');
  const sons = join(root, 'sons');
  mkdirSync(voz, { recursive: true });
  mkdirSync(sons, { recursive: true });

  // ---- Voice ----
  const lines = episode.lines ?? [];
  const silent = (episode.actions ?? []).filter((c) => c.action === 'say' && !lines.some((l) => l.speaker === c.target && l.text === c.params?.text));
  for (const c of silent) console.warn(`Sem voz na ficha: ${c.target} — "${c.params.text}"`);
  const missing = lines.filter((l) => again.includes(l.key) || !existsSync(join(voz, `${l.key}.json`)));
  const chars = missing.reduce((n, l) => n + l.spoken.length, 0);
  console.log(`Episódio ${episode.episode}: ${lines.length} falas com voz, ${missing.length} a gerar (${chars} caracteres).`);
  for (const l of missing) console.log(`  ${l.key}  ${l.speaker}: ${l.spoken}`);

  // ---- Sounds ----
  const used = new Set((episode.actions ?? []).filter((c) => c.action === 'sound').map((c) => c.params.name));
  const toMake = [];
  for (const name of used) {
    const def = bible.audio?.sounds?.[name];
    const file = sound.soundFile(name, def);
    if (existsSync(join(sons, file))) continue;
    if (def.file) {
      console.error(`Falta o arquivo do som "${name}": series/${series}/audio/sons/${def.file} (baixe da fonte: ${def.source ?? 'sem fonte'}).`);
      failed = true;
    } else toMake.push({ name, def, file });
  }
  console.log(`Sons: ${used.size} usados, ${toMake.length} a gerar.`);
  for (const s of toMake) console.log(`  ${s.name}: "${s.def.prompt}"`);
  if (dry) process.exit(failed ? 1 : 0);

  for (const line of missing) {
    const take = await makeTake(line);
    const t = voice.takeFromAlignment(line.key, take.duration, take.chars, take.starts, take.ends, take.tempo);
    writeFileSync(join(voz, `${line.key}.mp3`), take.audio);
    writeFileSync(join(voz, `${line.key}.json`), `${JSON.stringify({ ...t, speaker: line.speaker, spoken: line.spoken }, null, 1)}\n`);
    console.log(`✓ ${line.speaker}: ${line.text}  (${t.duration.toFixed(2)} s, ${take.cost ?? '?'} créditos)`);
  }
  for (const s of toMake) {
    const audio = await makeSound(s.def);
    writeFileSync(join(sons, s.file), audio);
    console.log(`✓ som ${s.name} → ${s.file}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  failed = true;
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);

/** Length of an audio file in seconds. */
function durationOf(file) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return Number(probe.stdout.trim());
}

async function post(path, body) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`https://api.elevenlabs.io${path}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) return response;
    const text = await response.text();
    // Too many at once, or a hiccup: wait and try again.
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      await new Promise((ok) => setTimeout(ok, 2000 * attempt));
      continue;
    }
    throw new Error(`ElevenLabs respondeu ${response.status} em ${path}: ${text.slice(0, 400)}`);
  }
}

/** One take: the audio and when each letter is said. v3 ignores `speed`: the audio is sped up after, and the times with it. */
async function makeTake(line) {
  const { id, stability, similarity, style, speed } = line.voice;
  const settings = Object.fromEntries(Object.entries({ stability, similarity_boost: similarity, style }).filter(([, v]) => v !== undefined));
  const v3 = line.model.startsWith('eleven_v3');
  if (!v3 && speed !== undefined) settings.speed = speed;
  const response = await post(`/v1/text-to-speech/${id}/with-timestamps?output_format=mp3_44100_128`, {
    text: line.spoken,
    model_id: line.model,
    language_code: 'pt',
    ...(Object.keys(settings).length ? { voice_settings: settings } : {}),
  });
  const cost = response.headers.get('character-cost');
  const data = await response.json();
  const scratch = mkdtempSync(join(tmpdir(), 'voz-'));
  const raw = join(scratch, `${line.key}.raw.mp3`);
  writeFileSync(raw, Buffer.from(data.audio_base64, 'base64'));
  const tempo = v3 && speed !== undefined && speed !== 1 ? speed : 1;
  const done = join(scratch, `${line.key}.mp3`);
  if (tempo !== 1) {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-filter:a', `atempo=${tempo}`, '-c:a', 'libmp3lame', '-q:a', '2', done]);
    if (r.status !== 0) throw new Error('O ffmpeg não conseguiu acelerar a fala.');
  } else renameSync(raw, done);
  const a = data.alignment;
  const [audio, seconds] = [readFileSync(done), durationOf(done)];
  rmSync(scratch, { recursive: true, force: true });
  return {
    audio,
    duration: seconds * tempo,
    chars: a.characters,
    starts: a.character_start_times_seconds,
    ends: a.character_end_times_seconds,
    tempo,
    cost,
  };
}

async function makeSound(def) {
  const response = await post('/v1/sound-generation', {
    text: def.prompt,
    ...(def.duration ? { duration_seconds: def.duration } : {}),
    prompt_influence: def.influence ?? 0.5,
    ...(def.loop ? { loop: true } : {}),
  });
  return Buffer.from(await response.arrayBuffer());
}
