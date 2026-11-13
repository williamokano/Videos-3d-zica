# Voz, episódio 1 refeito e skills de roteiro

Pedido do autor em 2026-11-12 (texto guardado em `series/ceu-vermelho/roteiros/001-v2.md`).

## Ferramentas para enxergar a cena
- [x] `npm run look`: desenha instantes do episódio pela câmera do episódio ou por uma câmera livre (`--view pos:alvo:fov:andar`)

## Voz (tarefa 11)
- [x] Ficha com `voice` (id ElevenLabs) e bíblia com `audio.model`, `audio.narrator`
- [x] `npm run voz`: lê as falas do roteiro, gera o que falta (eleven_v3, com tempos por letra), cache por conteúdo em `series/<série>/audio/`
- [x] `say` usa a duração real e os tempos por letra para a boca; `tone` vira tag do v3 (sussurro, nervoso, grito) sem ir para a legenda
- [x] `d.narrate(texto)`: narrador sem corpo
- [x] Sons: `d.sound(nome)` com efeitos gerados (notificação do celular, burburinho) e cache
- [x] Render mistura e normaliza o áudio e junta ao vídeo; o estúdio toca as falas
- [x] Testes

## Movimento
- [x] Curvas do caminho suaves (pesquisa sobre como as pessoas fazem curvas)
- [x] Balanço de cabeça ao andar, também na primeira pessoa (pesquisa)
- [x] Mão do aluno da frente atravessando o cabelo no começo do episódio

## Bíblia e figurantes
- [x] Regra do transe: quem fixa o olhar no céu fica parado olhando, olhos mais abertos, sem expressão, murmurando
- [x] Comportamento `trance`. Olhar a parede em vez da janela: `watch`/`trance` só viram a cabeça (75°), então quem olha o céu agora levanta, vai até a janela e se vira antes (no roteiro; regra escrita na `direct-actions`)
- [x] Figurantes com cara neutra ou preocupada na maior parte; poucos sorrindo

## Episódio 1 refeito
- [x] Roteiro novo com ganchos, a partir do texto do autor (`roteiros/001-roteiro.md`)
- [x] Três salas com alunos e três professores; descida coordenada
- [x] Zoom maior no celular
- [x] Professor atravessando a parede no porão: o trajeto novo para na frente da porta, do lado de dentro (conferido de cima em cinco instantes)
- [x] Exportar o roteiro com marcações de ação e pausa (`npm run roteiro`)

## Skills
- [x] `write-episode`: roteiro de episódio curto em série, com ganchos e fim em suspense
- [x] Atualizar `direct-actions` (voz, narrador, sons, transe)

## Revisão

- `npm run typecheck` limpo; `npm test` com 153 testes (144 de antes, ajustados, mais os de voz, sons e cortes).
- Episódio 1 renderizado com som: 3 min 09 s, −14,6 LUFS, nenhum silêncio de 1,5 s ou mais. 36 falas e 7 sons gerados (~1.000 créditos da ElevenLabs no total), 4 sons CC0 do Kenney.
- Conferido em quadros (`npm run look`): sala vermelha, alunos na janela em transe, corredor com a professora e o Roberto, celular legível com zoom 38, porão, cartão final, rostos neutros e preocupados, o transe de frente, a aluna da frente com as mãos no lugar.
- Não conferido: o vídeo inteiro assistido de ponta a ponta (só quadros e medidas de áudio), o lip-sync em movimento, o estúdio tocando o som no navegador.

## Correções depois de o autor assistir (2026-11-12)

- [x] Gente entrando uma na outra: desvio entre pessoas no motor (`actions/crowd.ts`), usado pela cena e pela câmera; teste em `crowd.test.ts`
- [x] Celular fora do quadro: a estimativa do item na mão levantada estava 5 cm abaixo do real (medido no navegador); a câmera não inclina para baixo ao ler
- [x] Olhar para ninguém: o corpo vira junto quando o alvo do olhar ou da fala está além do pescoço (`faceFor` em `direct.ts`); no roteiro, olhares que ficavam presos durante caminhadas e pontos de olhar com a altura do térreo no porão
- [x] Banco: virou móvel do depósito no cenário, com outro ao lado, encostados na parede fora do caminho
- [x] Conferido varrendo o vídeo final inteiro (um quadro a cada 3 s) e os instantes de cada fala do Fernando e de cada leitura do celular. Resta: Lucas passa rente à carteira do Fernando aos 0:24 (ele senta ao lado; achei natural).

## Tremor ao sair da sala e cenário (2026-11-13)

- [x] Tremor em torno de 0:53: vinha do desvio entre pessoas (não de corte seco, que o episódio não tem). Medido: saltos de até 80 cm por quadro. Refeito sem decisões que alternam; agora o maior passo de lado é de 6 cm por quadro, conferido em todos os quadros nos testes
- [x] Outras salas saindo cedo demais: a sala 2 começa a sair aos 12 s e a sala 1 aos 24 s (antes, 5 s e 20 s), com a fila mais apertada
- [x] Luminárias de barra (4 por sala), 2 ventiladores de teto e caixinha de som acima do quadro, nas três salas
- [x] Cerca em volta da escola com portão, grama baixa, mato
- [x] Passarela coberta da porta do pátio até a cantina (janelas e porta de correr fechada), mesas de concreto de três tipos
- [x] Fundo: rua, calçada, casas em 3D em volta e cidade pintada em dois anéis
- Conferido em quadros (vista aérea, sala, janela, pátio, portão, céu vermelho) e na varredura do vídeo. Não conferido: a cantina por dentro (está vazia de propósito) e o cenário em tomadas do alto, onde os cartões do fundo aparecem como placas.
