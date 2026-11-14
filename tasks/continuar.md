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

### Episódio 4, "O gigante" (a luta): ESPERANDO A REVISÃO DO AUTOR
- Já na main (merge `f480acf` da branch `worktree-agent-ab28c9c39b577f3e5`; `npm test` e `npm run typecheck` passando):
  - os movimentos da luta no motor (`lumber`, `stagger`, armadura com `size`, `don`/`doff`, alforje, funda com `whirl`, pedra com rastro, poeira, `draw`, câmera lenta `d.slowMo`), com testes em `src/engine/fight.test.ts`;
  - `episodes/004.ts`, `roteiros/004-pedido.md`, `004-roteiro.md` e `004-marcado.md`.
- `0a56949`: as vozes dos figurantes que falam e a trilha.
  - Vozes, todas já aprovadas pelo autor: israel-2 = Guilherme, israel-6 = Arnold, israel-4 = Papai Noel, filisteu-6 = Manoel Lopes.
  - Trilha: as músicas CC0 de sempre, mais 11 efeitos novos em `bible.json` (armadura, riacho, pedras, funda, pedra voando, impacto, queda, espada, golpe, fuga, exército correndo), **ainda não gerados**.
- Prévia muda nova, renderizada da main com `--no-audio`: `Videos Curtos/Davi/ep04/previa.mp4` no NAS.
- Próximos passos:
  1. **O autor revisa a prévia.** Não gere áudio antes: os créditos da ElevenLabs são caros e o roteiro pode mudar.
  2. Com a aprovação, rode `npm run voz -- --series davi-e-golias --ep 4`: 26 falas (~1.030 caracteres) e os 11 efeitos. As falas saem niveladas.
  3. Rode `npm run render -- --series davi-e-golias --ep 4`. Confira:
     - loudness em torno de -14 LUFS;
     - nenhum silêncio longo, exceto o silêncio de propósito depois da queda;
     - falas sem sobreposição.
  4. Ponha no NAS `Videos Curtos/Davi/ep04/`: `final.mp4`, `roteiro.md` e `publicacao/` (capa, story, `textos.md`), seguindo a skill `publicar`. Tire a `previa.mp4`.
  5. Publique ou agende só com o "pode" do autor (skill `agendar`). Até agora foi só no YouTube williamokano.
  6. Atualize as fichas (`## Arco na série`, `## Cânone`, `profile.episodes`) de Davi, Golias, Saul, Eliabe, Abinadabe e Abner.
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
