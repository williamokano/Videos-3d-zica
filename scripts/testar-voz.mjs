#!/usr/bin/env node
/**
 * Try voices for a character before casting one: the same line said by several voices, for the author to pick.
 * Nothing in the series changes; the chosen voice goes into the character's sheet by hand (or by Claude).
 *
 *   # 1. Look for candidates in the ElevenLabs library (announcer and advertising voices are left out):
 *   npm run testar-voz -- --buscar --genero male --idade middle_aged
 *
 *   # 2. Say one line with each candidate (ids from the search, "owner/voice" for one not yet in the account):
 *   npm run testar-voz -- --series davi-e-golias --personagem guarda --texto "Na linha de frente." --tom cansado \
 *     --vozes "abc123/ZYCQDYoXnl78dNdU6JeG:arnold,mBxe7tYxRAMLpIP3fPEp:papai-noel"
 *
 *   # Or take the character's first line in an episode, with its tone:
 *   npm run testar-voz -- --series davi-e-golias --personagem golias --ep 4 --vozes ...
 *
 * The samples go to out/<series>/vozes/<character>/<n>-<name>.mp3 at the loudness of a finished video
 * (-14 LUFS: the takes sit at -18 before the mix, and the mix is raised to -14), so they sound as they will in
 * the episode. The character's current voice, if it has one, is sampled too, first, for comparison.
 *
 * Options:
 *   --buscar                 list library candidates instead (with --idioma pt, --sotaque brazilian, --genero, --idade)
 *   --series, --personagem   whose voice is being chosen
 *   --texto, --tom           the line and its tone (as in a `say`); or --ep <n> for the character's first line there
 *   --vozes                  comma list of voice[:name]; "owner/voice[:name]" adds a library voice to the account
 *   --saida <dir>            where to write (default out/<series>/vozes/<character>)
 *
 * The key is read from ELEVEN_API_KEY (or ELEVENLABS_API_KEY) and is never written anywhere.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { levelFile } from './nivel.mjs';

/** Loudness of the finished videos (scripts/mix.mjs loudnorm). */
const VIDEO_LOUDNESS = -14;
/** Library voices made for selling or announcing: they sound like radio, not like people in a story. */
const ANNOUNCER = /announc|advert|commercial|radio|hyped|promo|sales|locut/i;

/** What the author already said about each voice (canal/vozes.json): vetoed ones stay out. */
const known = new Map(existsSync('canal/vozes.json') ? JSON.parse(readFileSync('canal/vozes.json', 'utf8')).vozes.map((v) => [v.id, v]) : []);

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const apiKey = process.env.ELEVEN_API_KEY ?? process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('Falta a chave da ElevenLabs: defina ELEVEN_API_KEY no ambiente.');
  process.exit(1);
}

async function api(path, init = {}) {
  const response = await fetch(`https://api.elevenlabs.io${path}`, { ...init, headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', ...init.headers } });
  if (!response.ok) throw new Error(`ElevenLabs respondeu ${response.status} em ${path}: ${(await response.text()).slice(0, 300)}`);
  return response;
}

if (args.includes('--buscar')) {
  const query = new URLSearchParams({
    page_size: '60',
    sort: 'usage_character_count_1y',
    language: option('idioma', 'pt'),
    accent: option('sotaque', 'brazilian'),
    ...(option('genero') ? { gender: option('genero') } : {}),
    ...(option('idade') ? { age: option('idade') } : {}),
  });
  const { voices } = await (await api(`/v1/shared-voices?${query}`)).json();
  const mine = new Set(((await (await api('/v1/voices')).json()).voices ?? []).map((v) => v.voice_id));
  let left = 0;
  for (const v of voices) {
    const tags = [v.name, v.descriptive, v.use_case, v.description].join(' ');
    if (ANNOUNCER.test(tags) || known.get(v.voice_id)?.status === 'vetada') {
      left++;
      continue;
    }
    const said = known.get(v.voice_id);
    console.log(`${said ? `  (${said.status}: ${said.usos.join('; ')}) ` : mine.has(v.voice_id) ? '  (na conta) ' : ''}${v.public_owner_id}/${v.voice_id}  ${v.name} · ${v.age ?? ''} ${v.descriptive ?? ''} ${v.use_case ?? ''}`);
  }
  console.log(`\n${left} vozes de locutor/anúncio ou vetadas pelo autor (canal/vozes.json) deixadas de fora.`);
  process.exit(0);
}

const series = option('series');
const who = option('personagem');
const list = option('vozes');
if (!series || !who || !list) {
  console.error('Uso: npm run testar-voz -- --series <s> --personagem <id> (--texto "..." [--tom t] | --ep <n>) --vozes "id[:nome],dono/id[:nome]"');
  process.exit(1);
}

const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
try {
  const library = await server.ssrLoadModule('/src/tools/library.ts');
  const voice = await server.ssrLoadModule('/src/engine/audio/voice.ts');
  let text = option('texto');
  let tone = option('tom');
  const { episode, characters } = library.loadEpisode(series, option('ep') ? Number(option('ep')) : undefined);
  if (!text) {
    // The first line of this character (by cast id or character) in the episode.
    const ids = new Set((episode.cast ?? []).filter((m) => (m.id ?? m.character) === who || m.character === who).map((m) => m.id ?? m.character));
    const first = (episode.actions ?? []).find((c) => c.action === 'say' && ids.has(c.target));
    if (!first) throw new Error(`"${who}" não fala no episódio ${episode.episode}: passe --texto.`);
    text = first.params.text;
    tone = tone ?? first.params.tone;
  }
  const spoken = voice.spokenText(text, tone);
  const current = characters.find((c) => c.id === who)?.voice?.id;
  const mine = new Set(((await (await api('/v1/voices')).json()).voices ?? []).map((v) => v.voice_id));
  const candidates = list.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const [ref, name] = s.split(':');
    const [owner, id] = ref.includes('/') ? ref.split('/') : [undefined, ref];
    return { owner, id, name: (name ?? id).toLowerCase().replace(/[^a-z0-9]+/g, '-') };
  });
  if (current && !candidates.some((c) => c.id === current)) candidates.unshift({ id: current, name: 'atual' });
  const vetoed = candidates.filter((c) => known.get(c.id)?.status === 'vetada');
  if (vetoed.length) throw new Error(`Vozes vetadas pelo autor (canal/vozes.json): ${vetoed.map((c) => `${known.get(c.id).nome}: ${known.get(c.id).nota}`).join(' | ')}`);

  const out = resolve(option('saida', join('out', series, 'vozes', who)));
  mkdirSync(out, { recursive: true });
  console.log(`"${spoken}" (${candidates.length} vozes, ~${spoken.length * candidates.length} caracteres)`);
  let n = 0;
  for (const c of candidates) {
    n++;
    if (!mine.has(c.id)) {
      if (!c.owner) throw new Error(`A voz ${c.id} não está na conta: passe "dono/${c.id}" (veja --buscar).`);
      await api(`/v1/voices/add/${c.owner}/${c.id}`, { method: 'POST', body: JSON.stringify({ new_name: `${c.name} (teste)` }) });
    }
    const audio = await api(`/v1/text-to-speech/${c.id}?output_format=mp3_44100_128`, { method: 'POST', body: JSON.stringify({ text: spoken, model_id: voice.DEFAULT_MODEL }) });
    const file = join(out, `${n}-${c.name}.mp3`);
    writeFileSync(file, Buffer.from(await audio.arrayBuffer()));
    levelFile(file, VIDEO_LOUDNESS);
    console.log(`✓ ${file}  (${c.id})`);
  }
  console.log('\nMande os arquivos ao autor (e copie para a pasta do episódio no NAS) e espere ele escolher. Depois registre a escolha em canal/vozes.json.');
} finally {
  await server.close();
}
