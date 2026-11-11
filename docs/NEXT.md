# Como continuar

Estado em 2026-11-11. Plano geral em [PLAN.md](PLAN.md).

## Para retomar

```sh
npm install
npm run typecheck && npm test   # 25 testes
npm run dev                     # estúdio em http://localhost:5173
```

Leia antes: `README.md`, `docs/PLAN.md`, as skills em `.claude/skills/` (`build-location`, `direct-actions`), `src/engine/world/types.ts` (formato do mundo) e `src/engine/actions/catalog.ts` (formato das ações).

## Feito

- Fase 1: formato do mundo, kit de assets, bíblia com regras de ambiente, estúdio navegável.
- Fase 1b: níveis, escadas, folhas de porta, luz interna, trilha de câmera, timeline por frame, visão no formato final, skill `build-location`.
- Fase 1c: sistema de ações.
  - Objetos interativos com canais: portas (`swing`, `sliding`, `rollup`), carro (`vehicle.car`, quatro portas e rodas), itens pegáveis, qualquer prop com `id`.
  - Catálogo em `src/engine/actions/builtin.ts`: `open`, `close`, `drive`, `moveTo`, `pickUp`, `putDown`, `set`.
  - Trilha `actions` no episódio, compilada com erros claros e avaliada como função pura do tempo.
  - Porta fechada bloqueia a passagem; `opensFrom` é validado ao compilar.
  - Estúdio: aplica os canais a cada frame, mostra as ações na timeline e no painel, tecla E abre porta na visão Andar, seletor de série e episódio.
  - Série `demo-acoes` com um episódio que usa todas as ações. Skill `direct-actions`.
  - Na escola, a porta da escadaria começa fechada e abre aos 8,8 s do episódio 1; a de emergência abre no fim. `leaf.open` mudou de graus para 0 a 1.

## Próximo: Fase 2 (personagem)

Só começa com confirmação do autor. Decisões já tomadas: estilo cartoon, troca por GLB possível, voz pela ElevenLabs em `tts` ou `sts`, idioma original pt-BR com dublagem configurada na bíblia.

O que as ações já deixam pronto para o personagem:

- `pickUp` leva o item a um ponto fixo (`to`) e liga o canal `held`. Com personagem, o ponto vira a mão: aceitar `by: <personagem>` e prender o item ao osso da mão.
- O carro tem âncoras nomeadas `seat.driver`, `seat.passenger`, `seat.rearLeft`, `seat.rearRight` para sentar o personagem.
- `open` exige `from` em porta que só abre por um lado. Com personagem, deduzir o lado pela posição de quem abre.
- A posição de cada objeto interativo sai de `InteractiveObject.position()`; serve para o personagem andar até a porta antes de abrir.

## Limitações conhecidas

- Colisão só com paredes, corrimãos e portas fechadas; móveis e carros são atravessáveis.
- O carro não vira as rodas da frente nas curvas, e o porta-malas não abre.
- A curva do `drive` pode abrir um pouco para fora antes de uma virada fechada.
- A escada de emergência tem 15 degraus porque vence os 3 m do porão.
- "Copiar minha visão como keyframe" não grava no arquivo; é preciso colar no JSON do episódio.
- Na visão geral do subsolo o fundo fica laranja chapado (céu sem o chão).
- O formato 9:16 está como padrão na bíblia e não foi confirmado pelo autor.

## Como conferir mudanças visuais

O Chromium headless já vem instalado (`require('playwright')`, lançar com `--use-gl=swiftshader --enable-unsafe-swiftshader`). `window.__studio` expõe `setMode`, `setLevel`, `focusRoom`, `walk.placeAt(x, z, elevation, yaw)`, `camera`, `timeline.seek(frame)`, `interactives`, `actionsError` e `toggleNearestDoor()`.
