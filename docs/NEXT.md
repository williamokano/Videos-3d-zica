# Como continuar

Estado em 2026-11-12. Plano geral em [PLAN.md](PLAN.md).

## Para retomar

```sh
npm install
npm run typecheck && npm test   # 58 testes
npm run dev                     # estúdio em http://localhost:5173
```

Leia antes: `README.md`, `docs/PLAN.md`, as skills em `.claude/skills/` (`build-location`, `direct-actions`, `create-character`), `src/engine/world/types.ts` (mundo), `src/engine/actions/catalog.ts` (ações) e `src/engine/character/types.ts` (personagem).

A série `demo-acoes` (`?series=demo-acoes`) usa tudo o que existe: os três tipos de porta, carro, item pegável, dois personagens paramétricos e um GLB, câmera em primeira e terceira pessoa, porta aberta com a mão, cabeça acompanhando o carro que chega, caixa carregada até o banco do carro e personagem dirigindo.

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

## Próximo: Fase 3b

**API de direção em código** (`ana.walkTo(...)`, `ana.say(...)`) que gera `cast`, `actions` e `camera`, com tempos encadeados em vez de `t` escrito à mão. Montar o episódio de demonstração mostrou o custo do `t` manual: cada ajuste de posição desloca tudo o que vem depois. Decisão que falta do autor: episódio escrito em TypeScript, ou JSON com `after: <id da ação anterior>` no lugar de `t`.

Decisões já tomadas para depois: voz pela ElevenLabs em `tts` ou `sts`, idioma original pt-BR com dublagem configurada na bíblia. O canal `talk` do personagem já existe para o lip-sync da Fase 4.

## Limitações conhecidas

- Personagens não desviam uns dos outros, nem de móveis e carros; só de paredes, corrimãos e vãos sem piso.
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
- "Copiar minha visão como keyframe" não grava no arquivo; é preciso colar no JSON do episódio.
- Na visão geral do subsolo o fundo fica laranja chapado (céu sem o chão).
- O formato 9:16 está como padrão na bíblia e não foi confirmado pelo autor.

## Como conferir mudanças visuais

O Chromium headless já vem instalado (`require('playwright')`, lançar com `--use-gl=swiftshader --enable-unsafe-swiftshader`). `window.__studio` expõe `setMode`, `setLevel`, `focusRoom`, `walk.placeAt(x, z, elevation, yaw)`, `camera`, `orbit`, `timeline.seek(frame)`, `interactives`, `cast`, `actionsError` (ações e câmera) e `toggleNearestDoor()`. Para um close de um personagem: `orbit.target` na posição dele, `camera.position` à frente, `orbit.update()`.
