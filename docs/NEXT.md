# Como continuar

Estado em 2026-11-12. Plano geral em [PLAN.md](PLAN.md).

## Para retomar

```sh
npm install
npm run typecheck && npm test   # 68 testes
npm run dev                     # estúdio em http://localhost:5173
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

## Próximo: vitrine de assets

Pedido do autor: uma página para ver e testar os assets fora de um episódio, por grupo. Começa pelos personagens; depois vale para os outros grupos (carros, caminhões, escavadeiras, móveis...).

- Abre por grupo: todos os personagens de uma série (ou de todas) lado a lado, cada um com o nome embaixo.
- Câmera livre pelo mouse (girar, aproximar, deslocar), e um clique num personagem para focar nele.
- Menu para configurar o que está selecionado (ou todos de uma vez):
  - expressão e intensidade;
  - ação ou pose em loop: parado, andar, correr, sentar, agachar, falar, cruzar os braços, gesticular, levantar o celular;
  - comportamento de figurante (`behave`) para ver como fica com o tempo correndo;
  - para onde olha (`lookAt`): a câmera, outro personagem, um ponto;
  - aparência: variar com `extraLook` e trocar pele, cabelo e altura na hora.
- Tempo correndo de verdade (respira, pisca, anda) e pausável.
- Para outros grupos, o menu mostra os canais do asset (portas, rodas, caçamba, braço da escavadeira) e as ações do catálogo que valem para ele.
- Endereço sugerido: `?vitrine=personagens` (ou `?vitrine=veiculos`), na mesma aplicação do estúdio.

Pela arquitetura atual, a página pode montar personagens com `buildCharacter` e mexer nos canais direto, sem episódio; as ações em loop saem de clipes compilados contra um mundo vazio.

## Próximo: voz

Só começa com confirmação do autor. O que falta, em ordem sugerida:

1. Áudio de cada fala pela ElevenLabs (confirmar os endpoints na documentação), em `tts` ou `sts`, com cache em arquivo e tempos por palavra. As falas já estão no episódio compilado: eventos `line` com quem fala, o texto e a duração estimada.
2. `resolveScript` recebendo o idioma e a duração real de cada fala, para a timeline sair do áudio.
3. Lip-sync por visemas no lugar da boca genérica; mixagem do áudio no render.
4. Sons do mundo (celular vibrando, burburinho da turma, passos).

Ideias que o episódio 1 deixou:

- Personagens não desviam uns dos outros: a fila funciona porque cada um sai na sua hora. Um desvio simples entre pessoas deixaria as cenas de grupo mais soltas.
- Os olhos não se mexem dentro do rosto; em primeira pessoa, de perto, faz falta.
- Mais gestos de figurante: apontar, mão na boca, mexer no próprio celular.
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
- O olhar move só a cabeça e o pescoço; os olhos não se mexem dentro do rosto.
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
