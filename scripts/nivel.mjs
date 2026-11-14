#!/usr/bin/env node
/**
 * Bring the voice takes of a series to one loudness, so no character sounds louder or quieter than another.
 *
 *   npm run nivelar -- --series davi-e-golias          # levels the takes not yet levelled
 *   npm run nivelar -- --series davi-e-golias --again  # measures and levels all of them again
 *
 * Each take is measured (EBU R128 integrated loudness) and given one fixed gain to reach TARGET, with a peak
 * limiter. A fixed gain does not change the length nor the timing of the letters, so the mouths stay in sync.
 * The take's .json records the level it was brought to; `npm run voz` levels new takes the same way.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Loudness of speech in the mix, in LUFS. */
export const TARGET = -18;

/** Integrated loudness of an audio file in LUFS, or undefined when too short or silent to measure. */
export function loudness(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const found = [...r.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
  const value = found ? Number(found[1]) : NaN;
  return Number.isFinite(value) && value > -70 ? value : undefined;
}

/** Levels one mp3 in place. Returns the gain applied in dB (0 when it could not be measured). */
export function levelFile(file, target = TARGET) {
  const measured = loudness(file);
  if (measured === undefined) return 0;
  const gain = Math.max(-20, Math.min(20, target - measured));
  const out = `${file}.nivel.mp3`;
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:level=false`, '-c:a', 'libmp3lame', '-q:a', '2', out]);
  if (r.status !== 0) throw new Error(`O ffmpeg não conseguiu nivelar ${file}: ${r.stderr}`);
  renameSync(out, file);
  return gain;
}

/** Levels a take (mp3 + json) and records it in the json. */
export function levelTake(mp3, target = TARGET) {
  const gain = levelFile(mp3, target);
  const json = mp3.replace(/\.mp3$/, '.json');
  if (existsSync(json)) {
    const data = JSON.parse(readFileSync(json, 'utf8'));
    writeFileSync(json, `${JSON.stringify({ ...data, level: target }, null, 1)}\n`);
  }
  return gain;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--series');
  const series = i >= 0 ? args[i + 1] : undefined;
  if (!series) {
    console.error('Uso: npm run nivelar -- --series <id> [--again]');
    process.exit(1);
  }
  const again = args.includes('--again');
  const voz = join('series', series, 'audio', 'voz');
  let done = 0;
  for (const name of readdirSync(voz).filter((f) => f.endsWith('.mp3')).sort()) {
    const json = join(voz, name.replace(/\.mp3$/, '.json'));
    if (!again && existsSync(json) && JSON.parse(readFileSync(json, 'utf8')).level === TARGET) continue;
    const gain = levelTake(join(voz, name));
    console.log(`${name}  ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB`);
    done++;
  }
  console.log(`${done} falas niveladas em ${TARGET} LUFS.`);
}
