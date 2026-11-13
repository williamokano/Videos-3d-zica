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

### Teto e parede

- A laje do teto fica 6 cm abaixo da altura da área: numa sala de 3 m, ponha luminária e ventilador com `y: 2.94`. Mais alto, ficam dentro da laje e somem.
- `light.tubeLamp`: luminária de barra. Quatro por sala (duas na frente, duas atrás). Cada luz acesa custa no desenho: deixe duas com luz (`intensity: 5`) e as outras com `intensity: 0`, que aparecem acesas sem somar luz.
- `school.ceilingFan`: gira sozinho com o tempo do episódio (`speed` em voltas por segundo, 0 para parado). Um asset que se mexe sozinho define `userData.animate = (t) => ...`; o motor chama a cada quadro.
- `school.speaker`: caixinha de som, costas na parede, acima do quadro (`y: 2.5`).

### Área externa

- `structure.fence` (`length`, `style: "bars"` ou `"mesh"`): um prop cobre um lado inteiro do terreno. `structure.gate`: portão de correr com canal `open`; dê um `id` para o episódio abrir.
- `nature.grass` (`width`, `depth`, `density`): grama baixa num retângulo; `nature.weeds`: moita de mato para pé de cerca e canto de muro.
- `school.concreteTable`: `shape: "round"` com `seats: "stools"` ou `"benches"`, ou `shape: "rect"`.
- `structure.canopy` (`length`, `width`): passarela coberta entre dois prédios; passa-se por baixo.
- Um asset por onde se passa (grama, passarela, fundo) marca `userData.passable = true` e não bloqueia o caminho. Muitas peças pequenas iguais vão num `InstancedMesh` ou numa malha só (`mergeGeometries`), não em centenas de malhas.

### Preencher o que fica além de onde se anda

Ninguém entra lá, então não se modela de verdade. Em anéis, de perto para longe:

1. **Logo depois da cerca** (onde as coisas deslizam umas contra as outras quando a câmera anda): rua e calçada como áreas `outdoor`, e `backdrop.house` (casas simples em 3D, uma por `seed`) em volta.
2. **Longe**: `backdrop.skyline`, cartões com fachadas pintadas pelo motor, em arco em volta do lugar. Use dois anéis: um a ~80 m (`haze: 0.25`) e outro a ~160 m, mais alto e mais apagado (`haze: 0.6`, `tall: 1`). Os cartões não recebem luz: a névoa, da cor do horizonte, tinge tudo, então o céu mudando de cor muda a cidade junto.
3. Quebre linhas retas longas (cerca, muro) com árvore, mato ou portão a cada 6 a 10 m, e confira o que se vê de cada janela.

Os cartões só convencem na altura dos olhos; numa tomada do alto aparecem como placas.

## Conferir

1. `npm test` e `npm run typecheck`.
2. Abra o estúdio (`npm run dev`) e tire screenshots com o Chromium headless: visão geral, cada nível, e o caminho a pé pelas portas e escadas novas. `window.__studio` expõe `setMode`, `setLevel`, `focusRoom` e `walk.placeAt(x, z, elevation, yaw)`. Na visão Andar, a tecla E abre e fecha a porta mais próxima.
3. Olhe as imagens: paredes sem vão errado, móveis virados para o lado certo, nada atravessando parede, escada chegando no piso.

## Estilo da série

Com `"style": { "look": "cel" }` na bíblia (`src/engine/style.ts`), os assets arredondados do kit ganham luz em faixas e contorno; paredes, pisos e tetos ficam como estão. Um asset novo deve usar `mat()` e `rbox()` de `src/engine/assets/registry.ts`: uma caixa de quina viva (`BoxGeometry`) é tratada como casco e fica sem contorno. Confira o local nos dois estilos pelo "Estilo" do painel do estúdio.

## Ver os assets fora de um local

`?vitrine=assets&grupo=<grupo>` mostra cada asset do kit sozinho, com uma pessoa de 1,70 m ao lado e um controle para cada canal. Confira ali um asset novo (escala, partes que se movem, os dois estilos) antes de colocá-lo num local. Pelo console: `window.__assets.select('<id>')`, `set('<id>', '<canal>', valor)`, `setStyle('cel')`.
