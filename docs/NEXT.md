# Como continuar

Estado em 2026-11-11. Branch: `claude/youtube-video-3d-framework-4qaz31`. Plano geral em [PLAN.md](PLAN.md).

## Para retomar

```sh
npm install
npm run typecheck && npm test   # 13 testes
npm run dev                     # estúdio em http://localhost:5173
```

Leia antes: `README.md`, `docs/PLAN.md`, `.claude/skills/build-location/SKILL.md` e `src/engine/world/types.ts` (formato do mundo).

## Feito

- Fase 1: formato do mundo, kit de assets, bíblia com regras de ambiente, estúdio navegável.
- Fase 1b: níveis, escadas, folhas de porta, luz interna, trilha de câmera, timeline por frame, visão no formato final, skill `build-location`.

## Próximo: sistema de ações

Pedido do autor: ações genéricas e configuráveis em dados, não código específico de um mapa. Exemplos pedidos: abrir porta de abrir para o lado, abrir porta de correr, fechar porta de loja (de enrolar, descendo de cima para baixo), abrir porta de carro, andar de carro, pegar algo.

Proposta de desenho (ainda não implementada):

1. **Objetos interativos com estado**. Cada objeto tem um id e canais numéricos animáveis, por exemplo `open` de 0 a 1.
   - Portas: ampliar `DoorLeaf` em `src/engine/world/types.ts` com `kind: "swing" | "sliding" | "rollup"`. Hoje só existe a de dobradiça, desenhada em `doorLeaf()` de `src/engine/world/build.ts` com ângulo fixo.
   - Veículos: asset de carro com portas (canal `open` por porta), rodas e assentos nomeados; posição e direção animáveis ao longo de um caminho.
   - Itens pegáveis: prop marcado como pegável, com ponto de pega.
2. **Trilha de ações no episódio**. Em `src/engine/timeline/episode.ts`, acrescentar `actions: [{ t, duration, target, action, params }]`. Avaliar como função pura do tempo, igual a `evaluateCamera` em `src/engine/timeline/camera.ts`: dado `t`, devolver o valor de cada canal de cada objeto. Nada de estado acumulado, para o scrub funcionar em qualquer frame.
3. **Catálogo de ações**. Registro parecido com o de assets (`src/engine/assets/registry.ts`): cada ação declara em que tipo de objeto vale, seus parâmetros e como mexe nos canais. É o que torna as ações configuráveis e reutilizáveis.
4. **Regras**. Porta fechada bloqueia passagem (colisor ligado ao canal `open`); `opensFrom` é validado ao compilar a ação, com erro claro se alguém tenta abrir pelo lado errado.
5. **Estúdio**. `buildLocation` precisa devolver os objetos interativos por id para o estúdio aplicar os canais a cada frame; a timeline ganha marcadores das ações.
6. **Skill**. Criar skill de ações (ou ampliar `build-location`) explicando o catálogo e a trilha.

Depende de personagem e fica só preparado até a Fase 2: a mão pegando o objeto, o personagem sentado no carro, o personagem indo até a porta.

## Depois

Fase 2 (personagem) só começa com confirmação do autor. Decisões já tomadas: estilo cartoon, troca por GLB possível, voz pela ElevenLabs em `tts` ou `sts`, idioma original pt-BR com dublagem configurada na bíblia.

## Limitações conhecidas

- Colisão só com paredes e corrimãos; móveis são atravessáveis.
- Portas não abrem nem bloqueiam; `opensFrom` é só dado.
- A escada de emergência tem 15 degraus porque vence os 3 m do porão.
- O estúdio abre a primeira série e o primeiro episódio que encontra; não há seletor.
- "Copiar minha visão como keyframe" não grava no arquivo; é preciso colar no JSON do episódio.
- Na visão geral do subsolo o fundo fica laranja chapado (céu sem o chão).
- O formato 9:16 está como padrão na bíblia e não foi confirmado pelo autor.

## Como conferir mudanças visuais

O Chromium headless já vem instalado (`require('playwright')`, lançar com `--use-gl=swiftshader --enable-unsafe-swiftshader`). `window.__studio` expõe `setMode`, `setLevel`, `focusRoom`, `walk.placeAt(x, z, elevation, yaw)`, `camera` e `timeline.seek(frame)`.
