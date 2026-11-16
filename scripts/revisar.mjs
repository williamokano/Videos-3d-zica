#!/usr/bin/env node
/**
 * Review an episode before rendering: lines over each other, dead stretches, the camera inside a wall or a
 * person, whoever speaks out of the picture, at the edge or hidden, people inside each other, censorship that
 * ends before the cut. Times are those of the finished video.
 *
 *   npm run revisar -- --series davi-e-golias --ep 5
 *
 * Options:
 *   --series <id>, --ep <n>
 *   --so <check,check>   only these checks (ids in src/engine/review.ts, REVIEW_CHECKS)
 *   --sem-notas          leave the notes out
 *
 * Exits with 1 when there is an error (✖), so it can gate a render.
 */
import { createServer } from 'vite';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
let failed = false;
try {
  const library = await server.ssrLoadModule('/src/tools/library.ts');
  const { reviewEpisode, reviewReport, REVIEW_CHECKS } = await server.ssrLoadModule('/src/engine/review.ts');
  const { buildLocation } = await server.ssrLoadModule('/src/engine/world/build.ts');
  const series = option('series', library.seriesIds()[0]);
  const { episode, characters, location, bible } = library.loadEpisode(series, option('ep') ? Number(option('ep')) : undefined);
  const only = option('so')?.split(',');
  for (const id of only ?? []) if (!REVIEW_CHECKS[id]) throw new Error(`Checagem "${id}" não existe. Checagens: ${Object.keys(REVIEW_CHECKS).join(', ')}.`);
  let findings = reviewEpisode(episode, buildLocation(location), characters, bible);
  if (only) findings = findings.filter((f) => only.includes(f.check));
  if (args.includes('--sem-notas')) findings = findings.filter((f) => f.level !== 'nota');
  const count = (level) => findings.filter((f) => f.level === level).length;
  console.log(`Episódio ${episode.episode} — ${episode.title} (${series})`);
  for (const line of reviewReport(episode, findings)) console.log(line);
  console.log(findings.length ? `\n${count('erro')} erro(s), ${count('aviso')} aviso(s), ${count('nota')} nota(s).` : 'Nada a apontar.');
  failed = count('erro') > 0;
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
