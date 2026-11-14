# Para continuar (estado em 2026-11-14, 20:10 de Brasília)

Leia antes: `tasks/lessons.md`, `canal/vozes.json` e as skills em `.claude/skills/`. Responda ao autor sempre em português. Nunca ponha Co-Authored-By nos commits. Nada é publicado, agendado, comentado ou apagado sem um "pode" do autor.

## DAVI (série `davi-e-golias`, canal historinhas.animadas.3d)

### Publicados (só no YouTube williamokano, como teste)
| Ep. | Link | Registro |
|---|---|---|
| 1 | https://youtube.com/shorts/A7qTFLsf5gc (versão antiga: rostos assustados, cortes secos; o NAS tem a nova) | `series/davi-e-golias/publicacao/ep001/agendamento.md` |
| 2 | https://youtube.com/shorts/uGipSarQqNI | `publicacao/ep002/agendamento.md` |
| 3 | https://youtube.com/shorts/jKsIravbVFM (com o Arnold no guarda das bagagens) | `publicacao/ep003/agendamento.md` |

O Instagram do canal ainda não está no publicador: lá a postagem é manual.

### Episódio 4, "O gigante" (a luta): EM REVISÃO
- O trabalho está na branch **`worktree-agent-ab28c9c39b577f3e5`** (no GitHub). Dois commits:
  - `9c74632`: movimentos novos no motor (`lumber`, `stagger`, armadura com `size`, `don`/`doff`, alforje, funda girando com `whirl`, pedra com rastro, poeira, `draw`, câmera lenta `d.slowMo`) com `src/engine/fight.test.ts`;
  - `095a598`: o episódio (`episodes/004.ts`, `roteiros/004-*.md`). O agente foi parado pelo autor (gasto de créditos) **antes de rodar `npm test` e `npm run typecheck` no fim**: rode antes de qualquer merge.
- Prévia muda (2:21.9) no NAS: `Videos Curtos/Davi/ep04/previa.mp4` e `roteiro.md`. **Esperando a revisão do autor.**
- A branch saiu de um main antigo. No merge, cuidado com o que o main mudou depois:
  - `src/engine/character/cast.ts` (braços cruzados novos, canal `line` e `tone.*` no estado);
  - `src/engine/character/motion.ts` (`TALKING_CURVE`, `resolveFace(..., line)`, viseme E mais estreito);
  - `src/engine/actions/ambient.ts` (`quietAt`, `ambientAt(..., lines)`);
  - `src/engine/character/types.ts` (`CharacterProfile`) e todas as fichas `characters/*.json` (campo `profile`);
  - `src/engine/fichas.test.ts`: personagem novo da branch precisa de `profile.role`, e não figurante precisa de `.md`.
- Depois do merge e da aprovação do autor, falta:
  1. Vozes: quem fala no ep. 4 e não tem voz passa pelo teste com o autor (`npm run testar-voz`, skill `create-character`, seção "Voz"). Mande as amostras e espere a escolha.
  2. `npm run voz -- --series davi-e-golias --ep 4` (as falas são niveladas sozinhas).
  3. Sons da luta e trilha (funda girando, impacto, queda, passos do gigante, vento, grito) em `bible.json`, como no ep. 3. Músicas CC0 em `audio/sons/CREDITOS.md`.
  4. Render final, NAS (`Videos Curtos/Davi/ep04/` com `final.mp4`, `roteiro.md`, `publicacao/`), skill `publicar` e, com "pode", skill `agendar`.
  5. Atualizar as fichas (`## Arco na série`, `## Cânone`, `profile.episodes`) de Davi, Golias, Saul, Eliabe e Abner.
- `episodes/005.ts` é a versão antiga ("Dez milhares") e ainda mostra a pedra, a queda e a espada: reescrever pelo `005-roteiro.md` v2.

### Vozes
- Estado de cada voz em `canal/vozes.json`. Vetadas (locutor ou sotaque): Adriano, Diego, Borges, Carlos.
- Em `teste` (o autor ainda não comentou): Golias (Lucas – Deep & Profound), Abner (Paulo), soldado 12 do ep. 3 (Davi Andrei).

## Selado (pasta `Videos Curtos/Bunker`, série `selado` no publicador)
- Eps. 15–22 tinham falhado no YouTube: a capa apontava para `epNN/publicacao/capa_epNN.png`, que não existe. Agora aponta para `epNN/capa_epNN.png`. Os eps. 23–25 foram cadastrados com os textos do `textos.md` de cada um.
- Agendados no YouTube williamokano (Brasília): ep. 15 em 14/11 às 20:30; ep. 16 em 14/11 às 22:00; depois 12:00 e 18:00, um por horário, até o ep. 25 em 19/11 às 12:00.
- **Conferir** se o ep. 15 (20:30) saiu com a capa. Se falhar, ver `last_error` em `list_publications` antes das 22:00.
- O Instagram contosdesobreviventes está **pausado** desde 10/11 por decisão do autor. As publicações dele ficam pendentes; não mexer.

## Avisos
- As estatísticas do YouTube não chegam: "YouTube Analytics API has not been used in project 228597281341" (403). O autor precisa ativar a API no Google Cloud Console desse projeto. Só views, likes e comentários vêm da listagem.
- O publicador não apaga vídeo já publicado. Para trocar um vídeo, o autor apaga no YouTube Studio e um conteúdo novo é criado (slug diferente, título original na publicação), como no ep. 3.
