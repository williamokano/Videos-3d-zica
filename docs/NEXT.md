# Como continuar

Estado em 2026-11-12. Plano geral em [PLAN.md](PLAN.md).

## Objetivo

Deixar o motor pronto antes de produzir episódios. Só depois disso a série começa a ser gerada, e o primeiro episódio é o roteiro do autor em [`series/ceu-vermelho/roteiros/001.md`](../series/ceu-vermelho/roteiros/001.md), guardado como ele escreveu, com as indicações de direção.

- `series/ceu-vermelho/episodes/001.ts` é a implementação atual desse roteiro e serve de teste do motor. O autor deu play no estúdio e aprovou o que viu, com algumas poucas melhorias que ainda não detalhou (perguntar quando for a hora; não são o foco agora).
- Conforme o motor melhora (tarefas abaixo), o episódio 1 é refeito a partir do roteiro, não remendado.
- O papel do motor, nas palavras do autor: "auxiliar o usuário como se ele fosse o diretor". O mundo tem que ser vivo mesmo onde o roteiro não descreve ações (direção de figurantes).
- "Pronto" inclui o que um episódio publicável precisa: visual (tarefas 1 a 10), voz e sons (tarefa 11).

## Para retomar

```sh
npm install
npm run typecheck && npm test   # 143 testes
npm run dev                     # estúdio em http://localhost:5173
                                # vitrine de personagens em http://localhost:5173/?vitrine=personagens
                                # vitrine de assets em http://localhost:5173/?vitrine=assets
```

Leia antes: `README.md`, `docs/PLAN.md`, as skills em `.claude/skills/` (`build-location`, `direct-actions`, `create-character`), `src/engine/world/types.ts` (mundo), `src/engine/actions/catalog.ts` (ações) e `src/engine/character/types.ts` (personagem).

A série `ceu-vermelho` tem o primeiro episódio de verdade. A série `demo-acoes` (`?series=demo-acoes`) usa tudo o que existe: os três tipos de porta, carro, item pegável, dois personagens paramétricos e um GLB, câmera em primeira e terceira pessoa, porta aberta com a mão, cabeça acompanhando o carro que chega, caixa carregada até o banco do carro e personagem dirigindo.

## Feito

- Fase 1: formato do mundo, kit de assets, bíblia com regras de ambiente, estúdio navegável.
- Fase 1b: níveis, escadas, folhas de porta, luz interna, trilha de câmera, timeline por frame, visão no formato final.
- Fase 1c: sistema de ações. Objetos com canais, catálogo de ações, trilha `actions` no episódio, portas `swing` / `sliding` / `rollup` que bloqueiam a passagem, carro, itens pegáveis.
- Fase 2: personagem.
  - Esqueleto padrão de 17 juntas em T-pose (`src/engine/character/types.ts`); poses são rotações a partir dela.
  - Corpo cartoon paramétrico (`body.ts`) e rosto com olhos, sobrancelhas e boca.
  - Movimentos como funções puras (`motion.ts`): parado respirando, andar, correr; piscar automático; cinco expressões.
  - Mapa de caminhada (`src/engine/world/nav.ts`): grade sobre pisos e escadas, A*, caminho endireitado.
  - Ações `walkTo`, `turnTo`, `express`. `walkTo` recusa atravessar porta que estará fechada quando o personagem chegar.
  - GLB (`glb.ts`, `retarget.ts`): ossos achados pelo nome, pose transferida pela rotação de cada junta, rosto por morph targets se o modelo tiver.
  - Episódio ganhou `cast`. `buildCast` e `compileEpisode` (`src/engine/timeline/stage.ts`) são usados pelo estúdio e pelos testes.

- Fase 3 (primeira parte): direção.
  - Câmera presa ao personagem (`src/engine/timeline/camera.ts`): `mode` no keyframe que começa o plano, `fpv` ou `third_person`, com `follow`. A terceira pessoa chega mais perto em vez de atravessar parede; em `fpv` a cabeça do personagem some da imagem.
  - Vínculos (`Link` em `src/engine/actions/catalog.ts`): um objeto vai junto com outro. `placementAt` dá a posição de qualquer objeto em qualquer instante, seguindo o que o carrega. `applyStage` (`src/engine/timeline/stage.ts`) põe a cena inteira num instante.
  - IK de dois ossos no braço (`src/engine/character/ik.ts`), com o tronco ajudando quando o braço não chega; poses de agachar, sentar e carregar (`motion.ts`).
  - `pickUp` / `putDown` com a mão, `open` / `close` com `by`, `walkTo` com `door`, `sit` / `standUp`. O carro ganhou altura para caber a cabeça de quem senta.

  - Olhar: `lookAt` vira a cabeça para um objeto (acompanhando) ou um ponto; `gazeAt` em `catalog.ts` dá o ângulo em qualquer instante, e a câmera `fpv` segue a cabeça.

  - Direção em código (`src/engine/timeline/direct.ts`): o episódio pode ser um roteiro `series/<série>/episodes/<n>.ts`. `resolveScript` roda o roteiro contra o local e devolve um `Episode` com todos os tempos calculados. O estúdio e os testes aceitam `.json` e `.ts`.

- Fase 4 (parte sem voz): render e o que o primeiro episódio pediu.
  - Render para MP4 (`scripts/render.mjs`, `npm run render`): o estúdio tem um modo `?render` que só mostra a câmera do episódio; um Chrome sem janela desenha frame a frame e o ffmpeg codifica. `--step` faz uma prévia rápida.
  - Estado do mundo (`buildWorld` em `stage.ts`): objeto `world` com `network` e `rule.<id>`; as regras da bíblia entram aos poucos no meio do episódio.
  - Objetos do episódio (`props` no episódio), bolso (`pocketOf`), `raise` / `lower` / `putAway`.
  - Celular (`src/engine/assets/items.ts`, `src/engine/ui/phone.ts`): tela desenhada pelo motor a partir de eventos; mensageiro com rolagem, "digitando", sem rede e `onNetworkError`.
  - Fala muda (`say`): boca e mãos mexem, a fala vira legenda e fica registrada para a voz.
  - Figurantes (`src/engine/actions/ambient.ts`, ação `behave`): conversa em grupo, prestar atenção, olhar fixo, escrever, ficar parado.
  - Móveis bloqueiam o caminho a pé. Elenco com `look` (uma ficha, várias aparências) e `seated`.
  - Episódio 1 de `ceu-vermelho` (`series/ceu-vermelho/episodes/001.ts`): 2 min 15 s em primeira pessoa, 15 personagens.

- Vitrine de personagens (tarefa 1): `?vitrine=personagens&series=<id>`, na mesma aplicação do estúdio (`src/studio/entry.ts` escolhe entre `main.ts` e `showcase.ts`).
  - É um palco sem cenário que usa o mesmo caminho do episódio (`buildCharacter`, `compileActions`, `applyStage`), então o que se vê nela é o que sai no vídeo.
  - `src/engine/character/showcase.ts`: disposição em fileiras (`showcaseLayout`), poses em loop (`SHOWCASE_POSES`) e a trilha do palco (`stageTrack`: um `behave` por personagem e o celular na mão).
  - `headAngles` (`src/engine/actions/catalog.ts`) é a conta do olhar, agora usada pelo `gazeAt` e pela vitrine.
  - Menu: expressão e intensidade, pose, comportamento de figurante, olhar, aparência na hora, figurantes por `extraLook`, regras da bíblia. A aparência ajustada não é gravada; o JSON aparece para copiar.

- Rosto expressivo (tarefa 2), em `src/engine/character/body.ts` (`buildFace`) e `motion.ts`:
  - Olhos com branco, íris (cor em `eyes` na ficha), pupila, brilho e pálpebras que giram sobre o globo, com uma linha de cílios. Sobrancelhas grossas na cor do cabelo, nariz, orelhas. Boca com lábios, dentes e língua, numa malha cujos pontos se movem sem recriar a geometria.
  - `FaceParams` ganhou `gazeX` / `gazeY`, `lidTilt`, `mouthRound` e `teeth`. As cinco expressões foram reajustadas.
  - Formas de boca da fala em `VISEMES` (`A`, `E`, `O`, `U`, `F`; boca fechada é a ausência delas). `visemeTrack(texto)` tira as formas das letras do texto, e `say` escreve os canais `vis.<forma>` do personagem, além de `talk`. Figurantes em `chat` falam frases de `SMALL_TALK` (`actions/ambient.ts`), que ninguém ouve.
  - `splitGaze` divide o olhar: os olhos cobrem a primeira parte do ângulo e a cabeça o resto; a soma é o olhar pedido, então a câmera em primeira pessoa não mudou. Figurantes têm pequenos desvios de olhos (`dart` em `Ambient`).
  - Na vitrine: menu "Boca" segura uma forma, "Falar" diz uma frase de teste, e a cor dos olhos entra na aparência.

- Contorno e luz em faixas (tarefa 3), em `src/engine/style.ts`:
  - A bíblia escolhe o estilo: `"style": { "look": "cel", "outline": 0.01, "bands": 3 }`. Sem `style`, a série é `soft` (o visual de antes). `ceu-vermelho` está em `cel`; `demo-acoes` em `soft`.
  - `applyStyle(raiz, estilo)` é uma passada sobre a cena já montada: nada que monta a cena sabe de estilo. Pode ser chamada de novo (troca de estilo, personagem reconstruído); voltar para `soft` devolve os materiais originais.
  - Faixas: cada `MeshStandardMaterial` vira `MeshToonMaterial` da mesma cor. A rampa só tem faixas no lado que olha para a luz; o lado de trás fica escuro, senão toda lâmpada ilumina o teto em que está pendurada e os interiores lavam.
  - Contorno: casca invertida, com a espessura em metros na cena (os vértices são empurrados pela normal vista pela câmera).
  - O casco do cenário (caixas e planos de quina viva: paredes, pisos, tetos, folhas de porta) fica como foi montado, sem faixas e sem contorno, como um fundo pintado atrás de personagens em cel. Com faixas, as lâmpadas desenhavam arcos grandes nas paredes.
  - Sem contorno: vidros, telas (`MeshBasicMaterial`), e o que tiver `userData.noOutline` nele ou acima (olhos, sobrancelhas, nariz e boca).
  - O estúdio e a vitrine têm "Estilo" no painel para comparar; a vitrine ajusta espessura e faixas e mostra o trecho para colar na bíblia.

- Mãos com dedos (tarefa 4):
  - `buildHand` em `character/body.ts`: palma, polegar e dedos que dobram. A ficha escolhe `hands`: `mitten` (padrão: polegar e um bloco de dedos, para ler de longe) ou `fingers` (cinco dedos, para a mão em close). O `heroi` usa `fingers`.
  - Poses em `HAND_POSES` (`character/motion.ts`): `grip`, `point`, `fist`, `open`, `hold` (espalmada atrás de algo fino, polegar na borda) e `type`. Mão relaxada é a ausência delas. Canais `handL.<pose>` / `handR.<pose>`.
  - Sozinha, a mão fecha no que carrega, abre ao gesticular na fala, e com algo levantado (`raise`) vira a palma para o rosto (`palmToward` em `character/ik.ts`) e passa a `hold`.
  - O que a mão segura fica na palma (`rig.palm`), não no pulso. O celular é segurado pela base (`userData.grip` em `assets/items.ts`), para o polegar não cobrir as mensagens em primeira pessoa.
  - Ações novas: `pointAt` (aponta para objeto ou ponto, olha e recolhe) e `hand` (pose por nome). No roteiro: `ana.pointAt(alvo)`, `ana.hand('fist')`.
  - Vitrine: menu "Mãos", pose "Apontar", tipo de mão na aparência.

- Cabelo com volume e ficha mais configurável (tarefa 5), em `character/body.ts` e `character/types.ts`:
  - `hairStyle`: `short`, `buzz`, `fringe`, `mohawk`, `curly`, `curlyLong`, `afro`, `puffs`, `bob`, `long`, `ponytail`, `pigtails`, `bun`, `none` (lista em `HAIR_STYLES`). Os cacheados são bolas em anéis sobre o topo e a nuca, deixando testa e sobrancelhas livres.
  - Ficha: `headShape` (`round`, `oval`, `wide`), `eyeSize`, `nose` (`round`, `small`, `long`, `wide`), `lips` (cor), `beard` (`stubble`, `mustache`, `goatee`, `full`), `glasses` (`round`, `square`) e `glassesColor`.
  - Cores de cabelo com nome em `HAIR_COLORS` (`character/extras.ts`): pretos, castanhos, loiros, ruivos, grisalho, azul, verde, roxo, rosa. `hairStreak` põe uma mecha de outra cor: uma faixa do topo à frente, alguns cachos nos crespos, a frente do moicano. Cabelo tingido mantém a sobrancelha escura.
  - `extraLook` sorteia tudo isso, com cabelo tingido em cerca de 7% e mecha em cerca de 8%. Barba só com `{ adult: true }`; óculos em cerca de 16% das pessoas.
  - Barba e óculos ficam sem contorno no cel.
  - Vitrine: todos os campos novos na aparência.

- Cor da imagem (tarefa 6), como efeito genérico do motor:
  - `Grade` em `src/engine/bible.ts`: `tint`, `amount`, `saturation`, `contrast`, `vignette`. Neutro por padrão.
  - Pode vir da série inteira (`"grade"` na bíblia) ou de uma regra (`effects.grade`). Numa regra, entra aos poucos junto com ela, como o céu (`resolveGrade`).
  - `GradePass` (`src/engine/grade.ts`) copia o que foi desenhado no quadro da câmera do episódio e redesenha com a correção. Com a cor neutra não faz nada, e o quadro sai idêntico ao de antes. As visões livres do estúdio não são corrigidas.
  - O autor disse (2026-11-12) que o céu vermelho foi só uma referência e que talvez não siga nessa linha: o efeito não depende dessa história. A regra `ceu-vermelho` usa o efeito como exemplo; apagar o `grade` dela desliga.

- Tela final interativa (tarefa 7):
  - No roteiro: `d.endCard({ title, options: [{ label, icon?, color? }], cta? }, { duration })`. De 2 a 6 opções; sem `icon` e `color`, cada uma ganha uma letra (A, B, C...) e uma cor de `END_CARD_COLORS`. Fica 6 s por padrão, e o episódio continua por trás.
  - É a ação `endCard` do objeto `world` (`src/engine/actions/endcard.ts`). O que aparece em cada instante sai de `endCardAt` (`src/engine/ui/endcard.ts`): a imagem escurece, entra o título, depois cada opção, depois a chamada.
  - Desenhada em HTML por cima do quadro da câmera do episódio (`showEndCard` em `src/studio/main.ts`), como as legendas; o render captura junto.
  - O episódio 1 termina com uma, de exemplo. O texto das opções é meu, não do roteiro do autor: trocar ou apagar em `series/ceu-vermelho/episodes/001.ts`.

- Grande-angular e granulado (tarefa 8), no mesmo passe da cor da imagem (`src/engine/grade.ts`):
  - Lente: `lens` de 0 a 1 num keyframe de câmera, interpolada entre keyframes como o `fov`. No roteiro: `d.camera.moveTo({ fov: 76, lens: 0.7 })`, e também em `cut`, `fpv` e `thirdPerson`. O meio da imagem incha e as bordas curvam; os cantos ficam onde estão, então não sobra borda preta.
  - Granulado: `grain` de 0 a 1 no `grade` da série ou de uma regra. Muda a cada frame e é o mesmo para o mesmo frame. Nenhuma série usa por padrão.
  - No episódio 1, a lente abre de 0 a 0,7 durante a corrida final, como exemplo.

- Vitrine de assets (tarefa 9): `?vitrine=assets&grupo=<grupo>&series=<id>` (`src/studio/assets-showcase.ts`; `entry.ts` escolhe a página).
  - Os grupos saem do início do id do asset (`vehicle`, `school`, `item`, `storage`, `nature`, `structure`, `light`). Os assets do grupo ficam em fila, com uma pessoa de 1,70 m ao lado para dar a escala.
  - Selecionado um asset: descrição, tipo, medidas, um controle para cada canal (portas, rodas), os lugares (assentos) e as ações do catálogo que valem para o tipo dele. "Animar os canais" abre e fecha tudo.
  - Parte pura em `src/engine/assets/showcase.ts`: `assetGroups`, `rowLayout`, `actionsFor`, `channelRange`.
  - `window.__assets` expõe `ids()`, `select(id | null)`, `channels(id)`, `set(id, canal, valor)`, `actions(id)`, `setStyle`, `animate`, `camera`, `orbit`.

- Carros melhores (tarefa 10), em `src/engine/assets/vehicles.ts` e `src/engine/actions/builtin.ts`:
  - O carro continua em blocos, agora com para-brisa e vidro traseiro inclinados, colunas acompanhando, vidros das portas em trapézio, para-choques, faróis e lanternas separados, grade e retrovisores.
  - As portas preenchem a lateral entre capô e porta-malas, na mesma altura e rentes à lataria.
  - `userData.parts` (e `traits.parts`) diz onde cada porta tem a dobradiça, o comprimento da folha, o lado e o ângulo.
  - `open` e `close` com `by`: se o personagem está no arco que a folha vai varrer, ele dá um passo para fora antes (`outOfTheWay`), andando, e só então a porta se move. Quem está sentado dentro não se mexe.

## Próximas tarefas, em ordem

As tarefas 1 a 10 estão feitas. Falta a 11, voz, que só começa com a confirmação do autor. O autor viu o rosto novo ("aceitável") e o cel shading ("gostei bastante"): `ceu-vermelho` fica em `cel`.

1. ~~Vitrine de personagens~~: feita. As tarefas 4 a 6 são ajustadas e conferidas nela.
2. ~~Rosto expressivo~~: feito.
3. ~~Contorno grosso e luz em faixas~~: feito.
4. ~~Mãos com dedos~~: feito.
5. ~~Cabelo com volume e ficha mais configurável~~: feito.
6. ~~Cor da imagem por regra da bíblia ou por série~~: feito, como efeito genérico.
7. ~~Tela final interativa~~: feita.
8. ~~Grande-angular por plano e granulado opcional~~: feito.
9. ~~Vitrine para os outros assets~~: feita. Só existe um veículo (`vehicle.car`); caminhão e escavadeira ainda não existem.
10. ~~Carros melhores~~: feito (pedido do autor em 2026-11-12, ver a seção abaixo).
11. **Voz**: só com confirmação do autor.

Os itens 2 a 8 vêm de uma referência de estilo que o autor mostrou; as decisões sobre o que puxar dela estão na seção seguinte.

## Referência de estilo e o que puxar dela

Depois do episódio 1 o autor disse: "gostei muito, mas gostaria que fosse um pouquinho melhor, mais configurável". Referência: um reel de temática parecida (https://www.instagram.com/reel/Dffe38TqD-Q/), com arte mais para cell shading e rostos mais expressivos. O vídeo não fica no repositório; baixe de novo com `yt-dlp` se precisar.

A regra: puxar as técnicas, manter a cara própria da série. Proporções e design dos personagens da referência não se copiam.

Puxar, como está nas tarefas 2 a 7:

- **Rosto** (tarefa 2). Na referência, as sobrancelhas carregam quase toda a emoção, e a boca abre em formas diferentes ao falar. Como a série é em primeira pessoa, com gente falando de frente para a câmera, é o que o espectador mais vê. As formas de boca (fechada, A, E, O, U, F/V) já servem de visemas para o lip-sync da voz.
- **Contorno** (tarefa 3): casca invertida, o mesmo mesh um pouco maior, preto, só com as faces de trás. Combina com as formas arredondadas do kit. Fora do contorno: a tela do celular e os vidros, para não perder legibilidade.
- **Luz em faixas** (tarefa 3): `MeshToonMaterial` com `gradientMap` de 3 faixas, não 2, para os interiores não ficarem chapados demais.
- **Dedos** (tarefa 4): para figurantes, polegar e um bloco de dedos estilo luva, que lê melhor de longe. Os 5 dedos completos só na mão em primeira pessoa, que aparece grande segurando o celular (na referência, o rádio aparece com o polegar por cima e os dedos por trás). Poses nomeadas: `relaxada`, `segurando`, `apontando`, `punho`, `aberta`, `digitando`. `pickUp` e `raise` fecham a mão no objeto; `say` gesticula com a mão aberta. No retarget de GLB, os dedos são opcionais.
- **Cabelo** (tarefa 5): blocos arredondados, como o crespo da referência. Também resolve a variedade dos figurantes, que hoje têm quatro cabelos.
- **Cor do mundo** (tarefa 6): na referência o vermelho contamina tudo. Hoje só o céu e a luz ambiente tingem; um ajuste de cor da imagem inteira, por regra da bíblia, deixa a mudança bem mais dramática.
- **Tela final** (tarefa 7): título e duas ou mais opções com ícone e cor, e uma chamada para comentar. É um formato genérico que puxa comentário. Fica como um recurso do roteiro (por exemplo, `d.endCard({ title, options })`), desenhado pelo motor por cima da imagem.

Puxar com moderação (tarefa 8):

- **Grande-angular / olho de peixe**: opção por plano, para momentos de tensão (a fuga, a corrida), não o tempo todo. Constante, cansa e deforma o celular, cuja tela precisa ser lida.
- **Granulado de papel**: leve ou desligado. Granulado vira chuvisco quando Instagram e TikTok recomprimem o vídeo.

## Carros melhores (tarefa 10)

Nas palavras do autor: "O que tem funciona relativamente bem, mas ele é todo quadrado, não precisa modelar com curvas, mas geralmente os vidros são angulados. As portas não estão muito bem alinhadas e na animação de teste a porta do carro fecha com a mulher e passa por ela, ela teria que ter saído da frente."

Feito. O que foi pedido, para referência:

- **Forma**: continuar em blocos, sem curvas, mas com para-brisa e vidro traseiro inclinados, e colunas acompanhando. Hoje a cabine é uma caixa reta.
- **Portas**: alinhar as folhas com a lataria (altura, espessura e vãos) e com os vidros das portas.
- **Porta que atravessa a pessoa**: na `demo-acoes`, a porta fecha passando por quem está ao lado. `close` (e `open`) com `by` precisa conferir se há um personagem no arco da folha e recusar com mensagem clara, ou o personagem precisa dar um passo para fora do arco antes. Vale também para as portas do cenário se o problema existir lá.
- Conferir na vitrine de assets (`?vitrine=assets`, grupo Veículos) e nos dois episódios da `demo-acoes`.
- Já anotado em "Limitações conhecidas": as rodas da frente não viram nas curvas, o porta-malas não abre, `sit` não confere se a porta está aberta, e sentado os braços não seguram o volante. Decidir com o autor o que disso entra.

## Vitrine de assets (tarefas 1 e 9)

Pedido do autor: uma página para ver e testar os assets fora de um episódio, por grupo. A de personagens está feita; faltam os outros grupos (tarefa 9). O que segue é o pedido completo.

- Abre por grupo: todos os personagens de uma série (ou de todas) lado a lado, cada um com o nome embaixo.
- Câmera livre pelo mouse (girar, aproximar, deslocar), e um clique num personagem para focar nele.
- Menu para configurar o que está selecionado (ou todos de uma vez):
  - expressão e intensidade;
  - ação ou pose em loop: parado, andar, correr, sentar, agachar, falar, cruzar os braços, gesticular, levantar o celular;
  - comportamento de figurante (`behave`) para ver como fica com o tempo correndo;
  - para onde olha (`lookAt`): a câmera, outro personagem, um ponto;
  - aparência: variar com `extraLook` e trocar pele, cabelo e altura na hora.
- Tempo correndo de verdade (respira, pisca, anda) e pausável.
- Para outros grupos (tarefa 9), o menu mostra os canais do asset (portas, rodas, caçamba, braço da escavadeira) e as ações do catálogo que valem para ele.
- Endereço sugerido: `?vitrine=personagens` (ou `?vitrine=veiculos`), na mesma aplicação do estúdio.

Pela arquitetura atual, a página pode montar personagens com `buildCharacter` e mexer nos canais direto, sem episódio; as ações em loop saem de clipes compilados contra um mundo vazio.

## Voz (tarefa 11)

Só começa com confirmação do autor. O que falta, em ordem sugerida:

1. Áudio de cada fala pela ElevenLabs (confirmar os endpoints na documentação), em `tts` ou `sts`, com cache em arquivo e tempos por palavra. As falas já estão no episódio compilado: eventos `line` com quem fala, o texto e a duração estimada.
2. `resolveScript` recebendo o idioma e a duração real de cada fala, para a timeline sair do áudio.
3. Lip-sync: os visemas já existem e hoje saem das letras do texto, num ritmo uniforme (`visemeTrack` em `character/motion.ts`). Com a voz, os tempos por palavra entram nessa função. Mixagem do áudio no render.
4. Sons do mundo (celular vibrando, burburinho da turma, passos).

## Ideias soltas, sem ordem

- Personagens não desviam uns dos outros: a fila do episódio 1 funciona porque cada um sai na sua hora. Um desvio simples entre pessoas deixaria as cenas de grupo mais soltas.
- Mais gestos de figurante: apontar sozinho, mão na boca, mexer no próprio celular. As mãos já permitem.
- Ligar a pose `type` sozinha quando o dono do celular envia uma mensagem (hoje o diretor usa `hand('type')`).
- Render medido numa RTX 5090: o episódio 1 (4317 frames em 1080×1920) sai em ~34 s com 8 navegadores em paralelo. Desenhar um frame leva ~3 ms; o resto do tempo é a captura em PNG e o x264. Para ir além: ler os pixels direto do WebGL em vez de capturar a tela, e codificar com NVENC.

Decisões já tomadas para depois: voz pela ElevenLabs em `tts` ou `sts`, idioma original pt-BR com dublagem configurada na bíblia. O canal `talk` do personagem já existe para o lip-sync da Fase 4.

## Limitações conhecidas

- Personagens não desviam uns dos outros nem de objetos com `id` (carro, itens); desviam de paredes, corrimãos, vãos sem piso e móveis.
- Quem está sentado numa cadeira comum fica dentro da área bloqueada pelo móvel: precisa de `standUp` para um ponto livre ao lado antes de `walkTo`.
- A legenda mostra uma fala por vez; duas falas ao mesmo tempo mostram só a primeira.
- Com a mão levantada (`raise`), o que está nela é estimado por `placementAt` para o olhar e a câmera; o objeto em si segue a mão de verdade.
- O caminho a pé faz quinas secas (o corpo vira suave, a trajetória não).
- O mapa de caminhada cobre a planta das áreas mais 6 m em volta; fora disso `walkTo` não acha caminho.
- O braço do GLB erra o alvo por alguns centímetros quando as proporções do modelo diferem do esqueleto padrão; o item segue a mão de verdade.
- A mão vai até onde a maçaneta fica com a porta fechada e não acompanha a folha enquanto ela gira. Porta de carro não tem maçaneta conhecida: a mão vai para a frente do corpo.
- `sit` não confere se a porta do carro está aberta, e o personagem atravessa a lataria se ela estiver fechada.
- Não há ação para dirigir só os olhos (olhar de lado sem virar a cabeça): eles seguem o `lookAt` junto com a cabeça.
- As formas de boca seguem as letras, não os sons: "ch", "nh" e ditongos saem aproximados, e o ritmo é uniforme até a voz dar os tempos.
- De três quartos, o olho do lado de lá passa um pouco do contorno da cabeça.
- Em `cel`, o casco do cenário não tem contorno. Um contorno por pós-processamento (detecção de bordas) resolveria as quinas vivas, se fizer falta.
- Em `cel`, num ambiente com várias lâmpadas, cada uma desenha as suas faixas, e num rosto em close elas se cruzam.
- Em `cel`, o modelo GLB de teste (`robo.glb`) recebe as faixas mas o contorno não aparece; a causa não foi investigada.
- Os figurantes do episódio 1 mudaram de cara: `extraLook` passou a sortear mais coisas, então a mesma semente dá outro visual.
- A costeleta da barba cheia é uma faixa reta, e a barba por fazer (`stubble`) quase não aparece em pele escura.
- Os óculos não têm lente; em `cel` a armação fica sem contorno.
- A cor da imagem tinge tudo o que é desenhado, inclusive a tela do celular. As legendas ficam de fora, porque são HTML por cima.
- Com a cor da imagem ligada, o render completo do episódio 1 levou 44 s (38 s antes).
- A vitrine não tem controles para a cor da imagem; ela só aparece ao ligar uma regra que a tenha.
- O texto da tela final quebra de linha um pouco diferente no estúdio e no vídeo renderizado (tamanhos de fonte arredondados em tela pequena). O que vale é o vídeo.
- A tela final não tem ícones desenhados: `icon` aceita texto ou emoji, e emoji depende da fonte da máquina que renderiza.
- Um keyframe de câmera que não repete `fov`, `pitch` ou `lens` leva esse valor de volta ao padrão: ao abrir a lente com `moveTo`, repita o `fov` do plano.
- A lente amplia o meio da imagem, que perde um pouco de nitidez com `lens` alto.
- A vitrine de assets não mostra as portas do cenário (são vãos de sala, não assets) nem deixa mudar os parâmetros de um asset (cor, tamanho).
- O passo para fora do arco da porta só vale para partes com dobradiça de veículos; as portas do cenário não conferem quem está no caminho.
- Ao sair do arco da porta, o personagem anda de costas ou de lado sem virar o corpo, e a mão vai ao ponto de antes do passo.
- Modelos GLB não têm dedos e seguram pelo pulso.
- O giro do pulso só roda em torno do antebraço: a palma chega perto da direção pedida, não exatamente nela.
- Em `cel`, os cinco dedos fechados em punho ficam carregados de contorno.
- Cilindros (pés de carteira, postes) têm quina viva nas tampas, e o contorno abre ali.
- Na vitrine, com um comportamento de figurante ligado, as poses "cruzar os braços" e "gesticular" não aparecem: as mãos livres são do comportamento.
- Na vitrine, a pose "sentar" usa um banco de 0,46 m para todos; personagens baixos ficam com os pés fora do chão.
- Sentado, os braços ficam ao lado do corpo (não seguram o volante).
- Pés podem afundar ou flutuar um pouco em escadas: a altura segue o degrau, mas não há IK nos pés.
- O rosto do GLB depende de morph targets; o modelo de teste (`robo.glb`) não tem.
- O carro não vira as rodas da frente nas curvas, e o porta-malas não abre. A curva do `drive` pode abrir um pouco para fora antes de uma virada fechada.
- "Copiar minha visão como keyframe" não grava no arquivo; é preciso colar no episódio (num roteiro, como `d.camera.cut({...})`).
- Erro num roteiro não diz a linha do arquivo, só a ação e o motivo.
- Na visão geral do subsolo o fundo fica laranja chapado (céu sem o chão).
- O formato 9:16 está como padrão na bíblia e não foi confirmado pelo autor.

## Como conferir mudanças visuais

O Chromium headless já vem instalado (`require('playwright')`, lançar com `--use-gl=swiftshader --enable-unsafe-swiftshader`). `window.__studio` expõe `setMode`, `setLevel`, `focusRoom`, `walk.placeAt(x, z, elevation, yaw)`, `camera`, `orbit`, `timeline.seek(frame)`, `interactives`, `cast`, `actionsError` (ações e câmera) e `toggleNearestDoor()`. Para um close de um personagem: `orbit.target` na posição dele, `camera.position` à frente, `orbit.update()`.

Na vitrine (`?vitrine=personagens&series=<id>`), `window.__vitrine` expõe `ids()`, `select(id | null, 'body' | 'face')`, `frame('all' | 'body' | 'face')`, `setPose`, `setBehaviour`, `setLook('free' | 'camera' | 'selected' | 'ahead')`, `setExpression(nome, intensidade)`, `setMouth('A' | 'E' | 'O' | 'U' | 'F' | '')`, `setHand('grip' | 'point' | 'fist' | 'open' | 'hold' | 'type' | '')`, `restyle(id, mudanças)`, `addExtras(id, n)`, `setStyle('soft' | 'cel', contorno, faixas)`, `setRule(id, ligada)`, `pause(segundos)`, `play()`, `camera`, `orbit`, `cast()` e `error`. Pause num instante fixo antes de cada screenshot, para a imagem não depender do relógio.
