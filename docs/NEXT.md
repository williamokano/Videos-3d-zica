# Como continuar

Estado em 2026-11-12. Plano geral em [PLAN.md](PLAN.md).

## Para retomar

```sh
npm install
npm run typecheck && npm test   # 39 testes
npm run dev                     # estúdio em http://localhost:5173
```

Leia antes: `README.md`, `docs/PLAN.md`, as skills em `.claude/skills/` (`build-location`, `direct-actions`, `create-character`), `src/engine/world/types.ts` (mundo), `src/engine/actions/catalog.ts` (ações) e `src/engine/character/types.ts` (personagem).

A série `demo-acoes` (`?series=demo-acoes`) usa tudo o que existe: os três tipos de porta, carro, item pegável, dois personagens paramétricos e um GLB.

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

## Próximo: Fase 3 (direção)

Só começa com confirmação do autor. O que falta, em ordem sugerida:

1. **Câmera presa ao personagem**: flag por plano, `fpv` (na cabeça), `third_person` (atrás, acompanhando) e `cinematic` (a de hoje). A junta `head` e a posição do personagem já estão acessíveis.
2. **Personagem usando as mãos e o corpo**:
   - `pickUp` com `by: <personagem>`: prender o item à junta `handR` (`CharacterRig.joint`) enquanto `held` for 1.
   - Abrir porta: andar até a porta (`InteractiveObject.position()`), deduzir `from` pelo lado em que o personagem está, estender o braço.
   - Sentar no carro: âncoras `seat.driver` etc. já existem no asset; falta a pose sentada e prender o personagem à âncora.
   - Para o braço alcançar um ponto, IK de dois ossos no braço (ombro, cotovelo, mão).
3. **Olhar**: cabeça e olhos acompanhando um alvo (`lookAt` de personagem).
4. **API de direção em código** (`ana.walkTo(...)`, `ana.say(...)`) que gera `cast`, `actions` e `camera`, com tempos encadeados em vez de `t` escrito à mão.

Decisões já tomadas para depois: voz pela ElevenLabs em `tts` ou `sts`, idioma original pt-BR com dublagem configurada na bíblia. O canal `talk` do personagem já existe para o lip-sync da Fase 4.

## Limitações conhecidas

- Personagens não desviam uns dos outros, nem de móveis e carros; só de paredes, corrimãos e vãos sem piso.
- O caminho a pé faz quinas secas (o corpo vira suave, a trajetória não).
- O mapa de caminhada cobre a planta das áreas mais 6 m em volta; fora disso `walkTo` não acha caminho.
- Pés podem afundar ou flutuar um pouco em escadas: a altura segue o degrau, mas não há IK nos pés.
- O rosto do GLB depende de morph targets; o modelo de teste (`robo.glb`) não tem.
- O carro não vira as rodas da frente nas curvas, e o porta-malas não abre. A curva do `drive` pode abrir um pouco para fora antes de uma virada fechada.
- "Copiar minha visão como keyframe" não grava no arquivo; é preciso colar no JSON do episódio.
- Na visão geral do subsolo o fundo fica laranja chapado (céu sem o chão).
- O formato 9:16 está como padrão na bíblia e não foi confirmado pelo autor.

## Como conferir mudanças visuais

O Chromium headless já vem instalado (`require('playwright')`, lançar com `--use-gl=swiftshader --enable-unsafe-swiftshader`). `window.__studio` expõe `setMode`, `setLevel`, `focusRoom`, `walk.placeAt(x, z, elevation, yaw)`, `camera`, `orbit`, `timeline.seek(frame)`, `interactives`, `cast`, `actionsError` e `toggleNearestDoor()`. Para um close de um personagem: `orbit.target` na posição dele, `camera.position` à frente, `orbit.update()`.
