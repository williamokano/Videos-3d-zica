# Para continuar (estado em 2026-11-15)

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
- **Token do YouTube vence por volta de 24/11** (app OAuth em "Testing"). Para emitir outro: URL de autorização com `client_id` da conexão, `redirect_uri=http://localhost`, `access_type=offline`, `prompt=consent` e os escopos `youtube.upload youtube.force-ssl yt-analytics.readonly`; o autor manda o endereço de retorno e o client secret; troca em `https://oauth2.googleapis.com/token` e `edit_connection` com o `refresh_token`. Os eps. do Selado que falharam em 16/11 (12:00 e 18:00) só voltam à fila com o "pode" do autor.

### Episódio 5, "De herói a ameaça": A FAZER
- Bíblia (`series/davi-e-golias/biblia.md`, tabela de episódios e cânone):
  - o povo canta "Saul matou os seus milhares, e Davi os seus dez milhares";
  - o Jônatas dá ao Davi manto, espada, arco e cinto e faz aliança com ele (18:1-4);
  - o Saul ouve a canção e passa a invejar (18:6-9);
  - numa noite, enquanto o Davi toca a harpa, o Saul atira a lança, e o Davi se desvia (18:10-11);
  - fim da temporada.
- `series/davi-e-golias/episodes/005.ts` existe, mas é a versão antiga ("Dez milhares"): ainda mostra a pedra, a queda e a espada, que agora são do ep. 4. Reescreva pelo `roteiros/005-roteiro.md` (v2), sem repetir o ep. 4. O ep. 4 termina com Israel descendo o monte e o narrador: "No próximo episódio: de herói a ameaça."
- Fluxo:
  1. Use a skill `write-episode`. Grave `roteiros/005-pedido.md`, depois `005-roteiro.md`. Implemente `episodes/005.ts` (skill `direct-actions`) e rode `npm run roteiro`.
  2. Faça a prévia muda com `npm run render -- --series davi-e-golias --ep 5 --scale 1 --no-audio --out out/davi-e-golias/ep005/davi-e-golias-ep005-previa.mp4` e ponha em `Videos Curtos/Davi/ep05/previa.mp4` + `roteiro.md` no NAS.
  3. Espere a revisão do autor. Só depois rode `npm run voz` e o render final, nesta ordem: NAS, `publicar` e, com "pode", `agendar`.
- Personagens novos com nome (Jônatas já tem ficha; as mulheres que cantam são figurantes) ganham ficha (`create-character`). Quem fala e não tem voz passa pelo teste de voz com o autor. Para figurantes, prefira vozes já `aprovada`s em `canal/vozes.json` que não falam no mesmo episódio.
- A lança do Saul (18:11): o Davi se desvia, e a série corta no som (ponta solta na bíblia).
- Limite de 3:00 (Instagram); mire em ~2:40.

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
