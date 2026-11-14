import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CharacterDef } from './character/types';

/** Every character of every series, with its folder. */
const all = readdirSync('series').flatMap((series) => {
  const dir = join('series', series, 'characters');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => ({ series, dir, def: JSON.parse(readFileSync(join(dir, f), 'utf8')) as CharacterDef }));
});
const voices = JSON.parse(readFileSync('canal/vozes.json', 'utf8')).vozes as { id: string; status: string }[];

describe('fichas dos personagens', () => {
  it('todo personagem diz o seu papel em profile.role', () => {
    for (const { series, def } of all) expect(def.profile?.role, `${series}/${def.id}`).toMatch(/^(protagonista|principal|secundario|figurante)$/);
  });

  it('todo personagem que não é figurante tem a ficha .md com quem é', () => {
    for (const { series, dir, def } of all) {
      if (def.profile?.role === 'figurante') continue;
      const file = join(dir, `${def.id}.md`);
      expect(existsSync(file), `${series}/${def.id}: falta ${file}`).toBe(true);
      expect(readFileSync(file, 'utf8'), `${series}/${def.id}`).toMatch(/^## Quem é/m);
    }
  });

  it('a folha de referência citada existe', () => {
    for (const { series, def } of all) if (def.profile?.sheet) expect(existsSync(join('series', series, def.profile.sheet)), `${series}/${def.id}`).toBe(true);
  });

  it('nenhum personagem usa voz vetada pelo autor', () => {
    const vetoed = new Set(voices.filter((v) => v.status === 'vetada').map((v) => v.id));
    for (const { series, def } of all) expect(vetoed.has(def.voice?.id ?? ''), `${series}/${def.id} usa voz vetada (canal/vozes.json)`).toBe(false);
  });
});
