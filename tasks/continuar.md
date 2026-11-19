# Para continuar (estado em 2026-11-19)

**Próximo passo:** a série nova do relógio no braço. Leia primeiro `tasks/handoff-serie-tempo.md` (o pedido do autor como ele escreveu e as decisões).

Leia antes de tudo: `tasks/lessons.md` (todas as lições valem), `canal/vozes.json`, as skills em `.claude/skills/`
(`write-episode`, `direct-actions`, `create-character`, `publicar`, `agendar`) e as fichas em
`series/davi-e-golias/characters/*.md` e `*.json`.

Regras do autor:
- Responda sempre em português.
- Nunca ponha Co-Authored-By nem outro trailer nos commits.
- Nada é publicado, agendado, comentado ou apagado sem um "pode" do autor; o "pode" de um episódio não vale para o
  próximo.
- Não gere áudio (ElevenLabs) antes de o autor aprovar a prévia muda: os créditos são caros.
- Voz nova só depois do teste com o autor (`npm run testar-voz`, skill `create-character`, seção "Voz").
- Commit e push na `main` ao fim de cada etapa.

## DAVI (série `davi-e-golias`, canal historinhas.animadas.3d)

### Publicados (só no YouTube williamokano, como teste)
| Ep. | Link | Registro |
|---|---|---|
| 1 | https://youtube.com/shorts/A7qTFLsf5gc (versão antiga: rostos assustados, cortes secos; o NAS tem a nova) | `series/davi-e-golias/publicacao/ep001/agendamento.md` |
| 2 | https://youtube.com/shorts/uGipSarQqNI | `publicacao/ep002/agendamento.md` |
| 3 | https://youtube.com/shorts/jKsIravbVFM (com o Arnold no guarda das bagagens) | `publicacao/ep003/agendamento.md` |

O Instagram do canal ainda não está no publicador: lá a postagem é manual.

### Episódio 4, "O gigante": PUBLICADO
- Instagram (pelo autor) e YouTube: https://youtube.com/shorts/pP49s9jd09I. Registro em `series/davi-e-golias/publicacao/ep004/agendamento.md`.
- Fica como saiu: as correções que o revisor achou nele não se aplicam (decisão do autor). Valem do ep. 5 em diante.
- **Token do YouTube vence por volta de 24/11** (app OAuth em "Testing"). Para emitir outro: URL de autorização com `client_id` da conexão, `redirect_uri=http://localhost`, `access_type=offline`, `prompt=consent` e os escopos `youtube.upload youtube.force-ssl yt-analytics.readonly`; o autor manda o endereço de retorno e o client secret; troca em `https://oauth2.googleapis.com/token` e `edit_connection` com o `refresh_token`. Em 2026-11-18 o client secret guardado também foi recusado (`invalid_client`); o secret que o autor passou foi posto na conexão. Os quatro eps. do Selado que falharam (16/11 e 17/11) saíram em 2026-11-18 00:18 UTC, com o "pode" do autor: d0GVrx4x_Zg, Vxue7oSQGZs, s0fGb_4hPnQ, ZVjTh5luLqQ. O comentário do ep. 4 de Davi também foi postado.

### Episódio 5, "De herói a ameaça": PUBLICADO no YouTube (https://youtube.com/shorts/t9SlkPqou5I) e no Instagram (pelo autor), 2026-11-19
- No NAS, em `Videos Curtos/Davi/ep05/`: `final.mp4` (2:50.1, -14,2 LUFS), `roteiro.md` e `publicacao/` (capa "DE HERÓI A AMEAÇA", story, `textos.md`).
- Vozes novas aprovadas: Jônatas = Gabriel; mulheres = Keren (1º verso) e Yasmin Alves (2º). Alcione não serve para o canto (o autor), mas fica.
- Para publicar (skill `agendar`): série DAVI `220a4abec4565b436e9dc51b48f10e3d`, temporada `183c4ce9103f2b3d73d19fee029c3062`, conta YouTube williamokano `5eef6660dda51d3a36f07fc52aaad771`; `create_content` com `Videos Curtos/Davi/ep05/final.mp4` e `Videos Curtos/Davi/ep05/publicacao/capa_ep05.png`; textos de `publicacao/ep005/textos.md` (o autor escolhe o comentário fixado A ou B). Instagram, à mão pelo autor.
- **O token do YouTube vence por volta de 24/11** (app OAuth em "Testing"): ver a seção do ep. 4.
- Depois de publicar: fichas (`## Arco na série`, `## Cânone`, `profile.episodes`) e `publicacao/ep005/agendamento.md`.

### Recursos novos do motor (use; documentados na skill `direct-actions`)
- **Entregar e vestir:**
  - `give` passa um item de uma mão para outra;
  - `don` funciona em si mesmo, para vestir com as próprias mãos;
  - `doff` tira.
- **Espada:** `draw` tira da bainha de alguém e ergue; `chop` desce num golpe até um ponto.
- **Censura:** `d.censor({ at, size, mode: 'tarja' | 'mosaico' }, { duration })` cobre um ponto da cena na imagem final.
  - Confira quadro a quadro no `final.mp4`.
  - Cubra também para onde as coisas vão.
- **Cabeça separada:** `headOff` esconde a cabeça; `ancient.severedHead` é a cabeça separada.
- **Câmera lenta:** `d.slowMo(de, até, fator)`.
- **Funda:** `arms.sling` tem o parâmetro `cord`; `whirl` gira a funda acima da cabeça; `throw` com `hit` crava na testa (use `arc` perto de 0 contra capacete).
- **Exército:** `reforcoDeIsrael()` em `cena.ts`. Numa carga, cada um corre reto no seu corredor; a checagem de multidão reprova quem se cruza.
- **Multidão gritando:** sons com `speak` na `bible.json` (uma voz como som, sem legenda); veja os `grito-ataque-*`.
- **Rostos:** o tom da fala muda o rosto (`TONE_FACES`), e o sorriso de descanso some enquanto o personagem fala.
- **Legendas dos figurantes:** "Soldado", "Guarda", sem número, a não ser quando dois do mesmo nome conversam.

### Ferramentas novas (2026-11-17; skill `direct-actions`, seção "Conferir")
- `npm run revisar -- --series <s> --ep <n>`: revisa sem renderizar (falas sobrepostas, trechos parados, câmera dentro de coisas, quem fala fora do quadro, na borda ou tapado, gente no mesmo lugar, censura curta, tremor, duração). Rode antes de toda prévia.
- `d.conversa([[a, 'fala'], [b, 'fala'], ...])` e `d.camera.over(ouve, fala)`: diálogo a dois com plano por cima do ombro e contraplano automáticos (banco em `demo-acoes` ep. 7). Use no ep. 5 (Jônatas e Davi; Saul e Abner).
- O render grava `<vídeo>-folha.png` e `<vídeo>-folha-falas.png`; `npm run folha` para vídeos já feitos.
- Jumento e ovelhas andam em quatro tempos sem deslizar (banco em `demo-acoes` ep. 8).
- Episódios já publicados não são corrigidos pelas ferramentas novas (decisão do autor); no ep. 5, rode `npm run revisar` e corrija os ✖ antes da prévia.

### Vozes
- O estado de cada voz está em `canal/vozes.json`.
- Vetadas (locutor ou sotaque): Adriano, Diego, Borges, Carlos.
- Em `teste` (o autor ainda não comentou): Golias (Lucas – Deep & Profound), Abner (Paulo), soldado 12 do ep. 3 (Davi Andrei).

## Selado (pasta `Videos Curtos/Bunker`, série `selado` no publicador)
- Eps. 15–25 agendados no YouTube williamokano, um às 12:00 e outro às 18:00 de Brasília, de 14/11 a 19/11. O ep. 15 saiu (https://youtube.com/shorts/XQASrubr5Wk).
- Se algum falhar, veja o `last_error` em `list_publications`. A causa da falha anterior era o caminho da capa: as capas ficam em `Bunker/epNN/capa_epNN.png`, sem a pasta `publicacao`.
- O Instagram contosdesobreviventes está **pausado** por decisão do autor. Não mexa.

## Avisos
- As estatísticas do YouTube não chegam: "YouTube Analytics API has not been used in project 228597281341" (403). O autor precisa ativar a API no Google Cloud Console. Por enquanto, só views, likes e comentários vêm da listagem.
- O publicador não apaga vídeo já publicado e não aceita um segundo lançamento do mesmo conteúdo. Para trocar um vídeo:
  1. o autor apaga no YouTube Studio;
  2. cria-se um conteúdo novo, com slug diferente (por exemplo, título com "(v2)");
  3. `update_publication` põe o título original. Foi feito assim no ep. 3.
