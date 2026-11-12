#!/usr/bin/env node
/**
 * The script of an episode as it plays, for reading and editing: every line, message, sound and action of the
 * main character at its time, with the pauses between lines marked.
 *
 *   npm run roteiro -- --series ceu-vermelho --ep 1
 *
 * Writes series/<series>/roteiros/<nnn>-marcado.md (and prints where). The file is generated: edit the lines
 * in the episode script (or tell Claude what to change) and run it again.
 *
 * Options:
 *   --series <id>, --ep <n>
 *   --who <id,id>   whose actions to list besides lines (default: the first cast member, the protagonist)
 *   --all           every action of everyone (long)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

const time = (t) => `${String(Math.floor(t / 60)).padStart(1, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const VERBS = {
  walkTo: (p) => (p.door ? `anda até a porta ${p.door}` : `anda até [${p.to?.map((v) => v.toFixed(1))}]`),
  turnTo: () => 'vira',
  lookAt: (p) => (p.object ? `olha para ${p.object}` : p.point ? 'olha para um ponto' : 'olha para a frente'),
  pickUp: (p) => `pega ${p.item ?? 'o item'}`,
  putAway: () => 'guarda no bolso',
  raise: () => 'levanta o celular para ler',
  lower: () => 'abaixa o celular',
  open: (p) => `abre ${p.part ?? ''}`.trim(),
  close: () => 'fecha',
  sit: (p) => `senta em ${p.on}`,
  standUp: () => 'levanta',
  pointAt: () => 'aponta / toca',
  express: (p) => `faz cara de ${p.expression}`,
  hand: (p) => `mão: ${p.pose}`,
  behave: (p) => `passa a: ${p.mode}${p.mood ? ` (${p.mood})` : ''}`,
};

const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
try {
  const library = await server.ssrLoadModule('/src/tools/library.ts');
  const series = option('series', library.seriesIds()[0]);
  const { episode, characters } = library.loadEpisode(series, option('ep') ? Number(option('ep')) : undefined);
  const cast = episode.cast ?? [];
  const nameOf = (id) => {
    if (id === 'world') return 'Narrador';
    const m = cast.find((c) => (c.id ?? c.character) === id);
    return (m?.look?.name ?? characters.find((c) => c.id === m?.character)?.name ?? id).toUpperCase();
  };
  const who = new Set((option('who') ?? (cast[0]?.id ?? cast[0]?.character ?? '')).split(','));
  const all = args.includes('--all');

  const cuts = episode.cuts ?? [];
  // Times as in the finished video: jump cuts taken out.
  const final = (t) => cuts.reduce((out, [a, b]) => (t > a ? out - (Math.min(t, b) - a) : out), t);
  const rows = [];
  for (const [a, b] of cuts) rows.push({ t: a, end: a, text: `✂ **corte seco** (${(b - a).toFixed(1)} s de caminhada saem do vídeo)` });
  for (const clip of episode.actions ?? []) {
    const p = clip.params ?? {};
    const end = clip.t + (clip.duration ?? 0);
    if (clip.action === 'say' || clip.action === 'narrate') {
      rows.push({ t: clip.t, end, line: true, text: `**${nameOf(clip.target)}**${p.tone ? ` (${p.tone})` : ''}: ${p.text}${p.take ? '' : ' ⚠ sem gravação'}` });
    } else if (clip.action === 'screen' && p.event === 'message') {
      rows.push({ t: clip.t, end, text: `📱 ${p.data.from === 'me' ? 'Fernando envia' : 'chega'}: "${p.data.text}"` });
    } else if (clip.action === 'sound') {
      rows.push({ t: clip.t, end, text: `🔊 ${p.name}${p.length ? ` (${Math.round(p.length)} s)` : ''}` });
    } else if (clip.action === 'set' && clip.target === 'world') {
      rows.push({ t: clip.t, end, text: `🌍 ${p.channel} → ${p.value}${clip.duration ? ` em ${clip.duration} s` : ''}` });
    } else if (clip.action === 'endCard') {
      rows.push({ t: clip.t, end, text: `🟥 cartão final: "${p.card.title}" — ${p.card.options.map((o) => o.label).join(' / ')} — ${p.card.cta ?? ''}` });
    } else if (clip.action === 'pickUp' && who.has(p.by)) {
      rows.push({ t: clip.t, end, text: `*${nameOf(p.by)} pega ${clip.target}*` });
    } else if (clip.action === 'putAway') {
      rows.push({ t: clip.t, end, text: `*guarda ${clip.target}*` });
    } else if (VERBS[clip.action] && (all || who.has(clip.target)) && !(clip.action === 'lookAt' && !all)) {
      rows.push({ t: clip.t, end, text: `*${nameOf(clip.target)} ${VERBS[clip.action]({ ...p, item: clip.target })}*` });
    }
  }
  for (const key of episode.camera) {
    if (key.cut || key.fov !== undefined) rows.push({ t: key.t, end: key.t, text: `🎥 ${key.cut ? `corte: ${key.mode ?? 'câmera'}` : ''}${key.fov !== undefined ? ` fov ${key.fov}` : ''}`.trim() });
  }
  rows.sort((a, b) => a.t - b.t);
  // Whatever happens inside a cut is not seen.
  const visible = rows.filter((r) => r.text.startsWith('✂') || !cuts.some(([a, b]) => r.t > a && r.t < b));
  for (const r of visible) [r.t, r.end] = [final(r.t), final(r.end)];
  const length = final(episode.duration);

  // Silences between lines longer than this are marked: where the episode can drag.
  const out = [`# Episódio ${episode.episode} — ${episode.title} (marcado)`, '', `Gerado por \`npm run roteiro\` a partir de \`series/${series}/episodes/\`. Duração: ${time(length)}. Tempos já sem os cortes secos.`, '', 'Pausas sem fala de 3 s ou mais aparecem como ⏸.', '', ...(episode.warnings?.length ? ['## Avisos', '', ...episode.warnings.map((w) => `- ⚠ ${w}`), ''] : [])];
  let lastLineEnd = 0;
  for (const row of visible) {
    if (row.line) {
      const gap = row.t - lastLineEnd;
      if (gap >= 3) out.push(`- ⏸ **${gap.toFixed(1)} s sem fala**`);
      lastLineEnd = Math.max(lastLineEnd, row.end);
    }
    out.push(`- \`${time(row.t)}\` ${row.text}`);
  }
  const gap = length - lastLineEnd;
  if (gap >= 3) out.push(`- ⏸ **${gap.toFixed(1)} s sem fala até o fim**`);
  const file = resolve('series', series, 'roteiros', `${String(episode.episode).padStart(3, '0')}-marcado.md`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${out.join('\n')}\n`);
  console.log(file);
} finally {
  await server.close();
}
