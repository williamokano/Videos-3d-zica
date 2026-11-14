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
- [ ] Episódio 3 a partir do 003.ts atual (montagem dos 40 dias, abertura com narrador, Saul reconhece o Davi), cortado na saída da tenda
- [ ] Episódio 4 (armadura, riacho, confronto, queda, silêncio e grito) a partir do resto do 003.ts e do começo do 005.ts
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
- [ ] O jumento desliza sem mexer as pernas (só aparece de longe e de lado) e o cabrito fica no terreiro.
