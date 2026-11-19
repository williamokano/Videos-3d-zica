# DAVI — série em 5 episódios: bíblia visual e "O escolhido"

Orientações do autor em `series/davi-e-golias/roteiros/orientacoes-do-autor.md`; texto do episódio 1 em `roteiros/o-escolhido-pedido.md`. Decisões do autor (2026-11-14): ele aceitou as sugestões. Golias com 3 a 3,2 m (humano, mas a diferença tem que impressionar), Davi castanho-avermelhado ondulado, o Samuel diz "É este" (Deus não fala), a frase do coração (16:7), a abertura com os anciãos tremendo (16:4) e o gancho final com o Saul atormentado.

**Como retomar:** leia este arquivo, `git status`, `npm run typecheck && npm test`, e continue do primeiro item sem marcar. Sem áudio.

## 1. Bíblia visual dos personagens
- [x] Davi, Golias e Saul refeitos pelas referências (`series/davi-e-golias/referencias/`)
- [x] Novos: Samuel, Jessé, os irmãos que faltam (Natanael, Radai, Ozém, Eliú) e um ancião de Belém
- [x] Folha de personagens (frente, costas, rosto) para o autor aprovar: `series/davi-e-golias/referencias/folhas/` (`npm run vitrine -- --folha <id>`)

## 1b. Roteiros
- [x] Roteiros de trabalho dos episódios 2 a 5 com os ajustes aceitos pelo autor (`roteiros/00{2..5}-roteiro.md`); bíblia da série reescrita para os 5 episódios

## 2. Kit novo
- [x] Ovelhas (rebanho que pasta e anda), harpa (lira) na mão, chifre de azeite, lamparina de barro com luz
- [x] Ação de ungir (o óleo derramado sobre a cabeça)

## 3. Lugares
- [x] Belém: colinas com pasto e pedra para sentar, portão e ruas, a casa de Jessé por dentro (noite, lamparinas)

## 4. Episódio "O escolhido"
- [x] Roteiro de trabalho com as sugestões aceitas, até 2:40
- [x] Episódio na engine, prévia sem som, varredura do vídeo inteiro (2:32)

## Revisão
(preencher no fim)

## 5. Depois de "O escolhido" (em ordem)
- [ ] Palácio do Saul (salão do trono com colunas, tochas, trono, janela) e episódio 2
- [x] Episódio 3 a partir do 003.ts atual (montagem dos 40 dias, abertura com narrador, Saul reconhece o Davi), cortado na saída da tenda (ver seção 11)
- [x] Episódio 4 (publicado) (armadura, riacho, confronto, queda, silêncio e grito) a partir do resto do 003.ts e do começo do 005.ts
- [ ] Episódio 5 (cidade, Jônatas na praça, janela do palácio, a lança)
- [ ] Tela de abertura da série em todos

## 6. Ajustes do autor em "O escolhido" (2026-11-14, ele assistiu a prévia: "99%")
Texto do autor guardado em `series/davi-e-golias/roteiros/001-ajustes.md`.
- [x] Davi toca harpa sentado em nada; os anciãos também sentam em nada: sentar em algo de verdade (pedra-assento, banco de pedra)
- [x] Uma ovelha do rebanho afunda na terra (rebanho em encosta): cada ovelha no chão sob ela
- [x] O filho mais perto do baú se sobrepõe ao baú: tirar o baú do caminho
- [x] Câmera que acompanha: quando o Samuel anda, câmera mais afastada que gira e se move para manter ele em quadro (nada de plano travado com gente saindo)
- [x] Samá correndo para chamar o Davi: em vez de terceira pessoa de videogame, câmera semifixa de longe, que acompanha e vai na direção dele; a cena não pode perder o foco das pessoas
- [x] Câmeras menos coladas em geral
- [x] Nuvens no céu
- [x] Casa de Jessé menos "moderna": paredes irregulares de pedra e barro, porta e janela de madeira antiga, sem esquadro perfeito
- [x] Fogo das fogueiras mais vivo e chama da lamparina melhor
- [x] Unção: câmera colada demais e o Davi ajoelhado mal se vê; plano mais aberto, de lado, com uma pequena rotação em volta dos dois
- [x] Cenas de duas pessoas: pegar as duas meio de lado, com uma pequena rotação em volta delas

## 7. Segunda rodada de ajustes em "O escolhido" (texto em roteiros/001-ajustes.md)
- [x] A novilha entra no degrau do portão: parar antes
- [x] Plano por cima dos ombros mais alto
- [x] Conversa Samá e Davi: o Davi de frente, os dois no quadro
- [x] Ritmo menos seco: o Samuel examina cada filho com mais calma (e o Jessé apresenta), até 2:50
- [x] O Davi chega acanhado ("Mandaste me chamar, pai?"), o Samuel diz "Aproxima-te", examina o Davi em silêncio, e só então "É este"
- [x] O azeite cai na cabeça do Davi, não ao lado

## 8. A casa de Jessé como casa israelita (terceira rodada; referências em referencias/casa/)
- [x] Paredes de pedra de campo arredondada com barro nas juntas, reboco gasto em partes, sem esquadro
- [x] Teto de vigas de madeira roliça com caniço/ramos por cima (nada de laje), postes de madeira segurando a viga
- [x] Mobília da época: banco de barro encostado na parede, prateleira de tábua com potes, banquinhos de palha, mó de pedra, cestos, panos listrados pendurados, nichos na parede, escada de mão, ervas secas
- [x] Casa menor e apertada; luz natural do fim da tarde entrando pela porta e pela janela (e pelas frestas do teto)
- [x] Cena: Samuel sentado num banco baixo, Jessé diante dele, os filhos entrando um por um pela porta; o Davi chega das colinas com a roupa de pastor (contraste com os irmãos)

## 9. Áudio do ep. 1 (próxima sessão)

- [ ] `npm run voz -- --series davi-e-golias --ep 1 --dry`: listar falas e custo, mostrar ao autor antes de gerar.
- [ ] Sons de cada cena: vento e anciãos no portão, ovelhas e harpa no campo, casa (passos, porta, fogo), sala do Saul (braseiro, eco).
- [ ] Efeitos nos acontecimentos: chifre, azeite, ajoelhar, o grito do Saul.
- [ ] Música orquestral (de fora do motor) e conferir que 2:46 ainda cabe em 3:00 com as vozes reais.

## 10. Episódio 2 — O rei e o pastor

- [x] Palácio do Saul em Gibeá (gerar-belem.py): salão do trono 14×22 com colunas, tochas, braseiros, trono, porta grande, janela para a praça; pátio de entrada com portão, palmeiras e poço; o trono continua onde o ep. 1 filma o Saul.
- [x] Crista a leste para os filisteus marchando contra o céu.
- [x] `episodes/002.ts`: 2:09.5, com tela de abertura, cartão final e chamada para o ep. 3.
- [x] Planos na linha dos dois (formato vertical), por cima do ombro e alto; nada de twoShot com gente andando.
- [ ] Revisão do autor.
- [ ] Vozes (servo, guardas, mensageiro precisam de voz na ficha / look.voice).
- [x] O jumento desliza sem mexer as pernas: já mexia; agora anda em quatro tempos sem deslizar (item 4 da seção 13). O cabrito fica no terreiro.

## 11. Episódio 3 — Quarenta dias

- [x] Roteiro v4 (`roteiros/003-roteiro.md`): desafio, 40 dias, o Jessé manda a comida (Belém), acampamento, recompensa, bronca do Eliabe, Saul, leão e urso, "Vai"; termina com o Davi olhando o vale.
- [x] Canto de Belém no vale (`gerar-vale.py`), com a casa de Jessé dividida com `gerar-belem.py` (`world/casa_jesse.py`; belem.json sai idêntico).
- [x] `episodes/003.ts` reescrito: 2:43.9 sem vozes; planos por cima do ombro, altos, quem fala no meio do quadro; nada dentro da tenda.
- [ ] Revisão do autor.
- [ ] Vozes que faltam: Golias, Abner, guarda das bagagens (fichas) e os soldados 6, 12 e da fogueira 2 (figurantes da ficha soldado, sem voz; precisam de look.voice ou de voz na ficha soldado).

## 12. Episódio 4 — O gigante — PUBLICADO (pelo autor, 2026-11-17) (pedido de 2026-11-14: "bastante ênfase nas animações da luta")

Motor (cada pose nova conferida de frente, 3/4 e lado na vitrine, num personagem de manga curta):
- [x] `lumber`: andar pesado e desajeitado (armadura grande demais; passo de gigante com menos peso)
- [x] `stagger`: cambalear depois da pedra, antes de cair
- [x] Peça de roupa com `size` (a armadura do Saul fica grande no Davi; a espada arrasta)
- [x] `don` / `doff`: vestir alguém com um item (o capacete desce na cabeça) e tirar com as duas mãos; props `arms.helmet` e `arms.armor`
- [x] Alforje: `putAway` / `pickUp` com `bag` (a pedra vai para a bolsa do lado esquerdo)
- [x] Funda girando acima da cabeça (`overhead` na funda, ação `whirl` em sincronia com a mão; o braço não volta para "segurar" enquanto gira ou arremessa)
- [x] Pedra com rastro no voo
- [x] Poeira (`nature.dust`, canal `puff`): passos do gigante, impacto, queda
- [x] `draw`: tirar a espada da bainha de quem está caído e erguer
- [x] Câmera lenta de verdade: `d.slowMo(de, até, fator)` (render, mixagem e roteiro marcado)
- [x] Testes de cada um; `npm test` e `npm run typecheck`

Episódio:
- [x] `roteiros/004-pedido.md` com o pedido novo; `004-roteiro.md` v2 com a luta detalhada
- [x] `episodes/004.ts` (~2:30), `npm run roteiro`, pausas ⏸ conferidas
- [x] Golias com voz: já está no main (coordenador); nesta branch a ficha ficou como estava
- [x] Prévia muda em tamanho cheio, quadros-chave da luta conferidos e varredura inteira
- [x] Lições em `tasks/lessons.md`

- [x] Revisão do autor (prévia muda): publicado pelo autor
- [ ] Vozes dos figurantes (escolha do autor) e `npm run voz`
- [ ] Sons da luta (funda girando, impacto, queda, passos do gigante, vento) e trilha
- [ ] `005.ts` ainda mostra a pedra, a queda e a espada (é a versão antiga, "Dez milhares"): reescrever pelo `005-roteiro.md` v2

## 13. Melhorias do motor (2026-11-16, pedido: "façamos em ordem pra ver até onde dá pra ir")

- [x] 1. Revisor de episódio (`npm run revisar`): `src/engine/review.ts` puro + `scripts/revisar.mjs` + testes; rodar nos eps. 1–4 de Davi e ajustar os falsos positivos
- [x] 2. Câmera de diálogo automática (`d.conversa`, `d.camera.over`), banco em `demo-acoes` ep. 7; o `look` mostra os erros da página; corrigido o estúdio que quebrava com fala no instante 0
- [x] 3. Folha de contato automática no render (`scripts/folha.mjs`, `npm run folha`)
- [x] 4. Animais que andam: passo de quatro tempos com casco parado no apoio e fase pela distância andada (`assets/gait.ts`), no jumento e nas ovelhas; banco em `demo-acoes` ep. 8; `look --wide` não sai mais preto no primeiro quadro
- [x] 5. Dividir `assets/ancient.ts`: um arquivo por parte do kit em `assets/ancient/` (kit, camp, royal-tent, nature, town, sheep, lamps, cattle, palace, house); `ASSETS.md` e quadros do ep. 3 idênticos byte a byte
  - Achados nos eps. já publicados (1 a 4) ficam como estão, por decisão do autor (2026-11-17): o revisor vale do ep. 5 em diante.

## 14. Episódio 5 — De herói a ameaça (2026-11-18)

- [x] Roteiro v3 (`roteiros/005-roteiro.md`); decisões delegadas pelo autor: abertura com a lança, liberdades, cartão FUGIR / FICAR
- [x] Lugar novo: Gibeá (`world/gerar-gibea.py`), com o salão do trono compartilhado (`world/sala_saul.py`; `belem.json` idêntico)
- [x] Motor: `d.world.blackout`, `arms.cloth` (manto e faixa soltos), `don` de manto nos ombros e faixa na cintura
- [x] `episodes/005.ts` (2:40,5), revisor sem erros, prévia muda em tamanho cheio no NAS (`Videos Curtos/Davi/ep05/`)
- [x] Revisão do autor (prévia muda): aprovado, com ajustes (abertura, closes, harpa, arremesso na lente, "derrotou")
- [x] Vozes: Jônatas = Gabriel; mulheres = Keren e Yasmin Alves; figurantes com vozes aprovadas; `npm run voz`
- [x] Sons novos (`festa-tamborins`, `lanca-parede`) e música sob a aliança e a janela
- [x] Render final (2:50.1) e pacote de lançamento (`publicacao/ep005/`)
- [x] Publicado no YouTube em 2026-11-19: https://youtube.com/shorts/t9SlkPqou5I
- [ ] Revisor: a parede de uma janela conta como inteira (aviso falso em "fala-tapada" pela janela); conferir "a mesma pessoa duas vezes no quadro"
