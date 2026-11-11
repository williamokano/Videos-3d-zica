# Como continuar

Estado em 2026-11-11. Branch: `claude/youtube-video-3d-framework-4qaz31`. Plano geral em [PLAN.md](PLAN.md).

## Para retomar

```sh
npm install
npm run typecheck && npm test   # 21 testes
npm run dev                     # estúdio em http://localhost:5173
```

Leia antes: `README.md`, `docs/PLAN.md`, `.claude/skills/build-location/SKILL.md` e `src/engine/world/types.ts` (formato do mundo).

## Feito

- Fase 1: formato do mundo, kit de assets, bíblia com regras de ambiente, estúdio navegável.
- Fase 1b: níveis, escadas, folhas de porta, luz interna, trilha de câmera, timeline por frame, visão no formato final, skill `build-location`.
- Fase 1c: sistema de ações. Portas `swing`, `sliding` e `rollup` com colisão quando fechadas e regra de `opensFrom`; `vehicle.car` com portas, porta-malas, rodas e âncoras; props com id que se movem e se prendem a âncoras; catálogo de ações (`open`, `close`, `move`, `attach`, `detach`, `set`); trilha de ações no episódio; skill `write-episode`.

## Próximo: Fase 2 (personagem)

Só começa com confirmação do autor. Decisões já tomadas: estilo cartoon, troca por GLB possível, voz pela ElevenLabs em `tts` ou `sts`, idioma original pt-BR com dublagem configurada na bíblia.

O sistema de ações já deixa os ganchos:

- Personagem vira um `Interactive` com pose, canais (expressão, piscar, boca) e âncoras (`hand.r`, `hand.l`).
- "Pegar algo" = animação de alcançar + `attach` do item em `<personagem>.hand.r`.
- "Andar de carro" = `attach` do personagem em `<carro>.seat.driver` com pose sentada + `move` do carro.
- "Ir até a porta e abrir" = locomoção até a porta + `open` com `from` calculado pelo lado em que o personagem está.

## Limitações conhecidas

- Colisão só com paredes e corrimãos; móveis são atravessáveis.
- `detach` exige dizer onde o objeto é colocado (`at`); ele não cai sozinho onde estava.
- Objetos em movimento não colidem com nada; o caminho do `move` é responsabilidade de quem escreve o episódio.
- A porta de correr é de uma folha só.
- A escada de emergência tem 15 degraus porque vence os 3 m do porão.
- O estúdio abre a primeira série e o primeiro episódio que encontra; não há seletor.
- "Copiar minha visão como keyframe" não grava no arquivo; é preciso colar no JSON do episódio.
- Na visão geral do subsolo o fundo fica laranja chapado (céu sem o chão).
- O formato 9:16 está como padrão na bíblia e não foi confirmado pelo autor.

## Como conferir mudanças visuais

O Chromium headless já vem instalado (`require('playwright')`, lançar com `--use-gl=swiftshader --enable-unsafe-swiftshader`). `window.__studio` expõe `setMode`, `setLevel`, `focusRoom`, `walk.placeAt(x, z, elevation, yaw)`, `camera` e `timeline.seek(frame)`.
