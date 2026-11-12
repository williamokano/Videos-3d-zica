---
name: build-location
description: Criar ou ampliar um cenário 3D (local) de uma série — salas, andares, porão, escadas, portas, janelas, móveis e luzes. Use quando o usuário descrever um lugar novo ou pedir mais detalhe em um lugar existente.
---

# Construir um local

Um local é dado da série, não código do motor: um arquivo `series/<série>/world/<local>.json` no formato de `src/engine/world/types.ts`. O motor (`src/engine`) só interpreta. Se o que o usuário pediu não cabe no formato, amplie o motor de forma genérica e depois descreva o lugar em dados; nunca escreva geometria de um lugar específico dentro do motor.

## Antes de começar

- Se a série não tem nenhum local, pergunte onde é o primeiro cenário.
- Se o local já existe, edite o arquivo: acrescente ou ajuste, não recrie. O mapa cresce como o de um jogo.
- Pergunte só o que muda a planta (onde fica a entrada, para onde dá uma porta). O resto, decida e conte o que decidiu.

## Formato

Metros; +x leste, +z sul, +y cima. Direções: `n` = -z, `s` = +z, `e` = +x, `w` = -x.

- **Área** (`rooms`): retângulo com `origin` (canto noroeste), `size`, cores, e `elevation` (altura do piso: 0 térreo, negativo porão, positivo andar de cima). `outdoor: true` tira paredes e teto.
- **Aberturas** (`openings`): porta ou janela numa parede, com `at` medido a partir da ponta oeste (paredes n/s) ou norte (paredes e/w). Uma abertura também corta a parede da área vizinha na mesma linha e no mesmo nível, então declare cada porta uma vez só.
- **Folha de porta** (`leaf`): sem ela a porta é um vão livre. `kind` é `swing` (de abrir, padrão), `sliding` (de correr; `slide` diz para que ponta) ou `rollup` (de enrolar, de loja). `opensFrom: "inside"` é porta de emergência (abre para fora, com barra); "dentro" é a área que declara a abertura. `open` é o estado inicial, de 0 (fechada) a 1 (aberta); `angle` é o ângulo máximo da porta de abrir. Porta fechada bloqueia a passagem. Dê um `id` à abertura para os episódios poderem abrir e fechar a porta (skill `direct-actions`).
- **Escadas** (`stairs`): descritas de cima para baixo. `top` é o centro da borda superior do primeiro lance. O `path` alterna lances (`{ "flight": "e", "drop": 1.5 }`) e patamares (`straight`, `uturn` com `side`, `corner` com `side`). O motor abre o buraco nos pisos e tetos que a escada atravessa e põe corrimão e guarda-corpo.
- **Objetos** (`props`): `asset` do catálogo, `pos` relativo à origem da área, `y` acima do piso, `rot` em graus, `repeat` para grades. Com `id`, o objeto pode ser animado por ações do episódio; `pickable: true` permite pegá-lo.

## Regras de modelagem

- Uma escada precisa de uma área em cada ponta: no topo, piso livre antes da borda `top`; embaixo, uma área na `elevation` de chegada cobrindo a planta da escada.
- Para um vão de escada interno, empilhe duas áreas com a mesma planta (uma por nível). O motor fura o piso de cima.
- Áreas vizinhas encostam: a borda de uma é a borda da outra. Áreas de níveis diferentes podem ocupar a mesma planta.
- Subsolo não recebe sol: coloque `light.ceilingLamp` com `y` perto do teto.
- Móveis usados por uma pessoa olham para -z com `rot: 0`; assets de parede têm as costas em z = 0 e olham para +z.
- Deixe corredores livres de pelo menos 1 m entre móveis e nas portas.

## Assets

Consulte o catálogo antes de criar: os ids e descrições estão nos `registerAsset(...)` de `src/engine/assets/`. Se faltar algo, crie um asset paramétrico e reutilizável ali (com `rbox` para bordas arredondadas), não uma peça única para este lugar.

## Conferir

1. `npm test` e `npm run typecheck`.
2. Abra o estúdio (`npm run dev`) e tire screenshots com o Chromium headless: visão geral, cada nível, e o caminho a pé pelas portas e escadas novas. `window.__studio` expõe `setMode`, `setLevel`, `focusRoom` e `walk.placeAt(x, z, elevation, yaw)`. Na visão Andar, a tecla E abre e fecha a porta mais próxima.
3. Olhe as imagens: paredes sem vão errado, móveis virados para o lado certo, nada atravessando parede, escada chegando no piso.

## Estilo da série

Com `"style": { "look": "cel" }` na bíblia (`src/engine/style.ts`), os assets arredondados do kit ganham luz em faixas e contorno; paredes, pisos e tetos ficam como estão. Um asset novo deve usar `mat()` e `rbox()` de `src/engine/assets/registry.ts`: uma caixa de quina viva (`BoxGeometry`) é tratada como casco e fica sem contorno. Confira o local nos dois estilos pelo "Estilo" do painel do estúdio.
