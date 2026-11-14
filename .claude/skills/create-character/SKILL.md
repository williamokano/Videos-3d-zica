---
name: create-character
description: Criar ou ajustar um personagem de uma série — corpo cartoon paramétrico ou modelo GLB — e colocá-lo num episódio. Use quando o usuário descrever uma pessoa nova, pedir mudança de aparência, ou quiser trocar um personagem por um modelo 3D.
---

# Criar um personagem

Um personagem é dado da série: `series/<série>/characters/<id>.json`, no formato `CharacterDef` de `src/engine/character/types.ts`. Todo personagem, feito aqui ou importado, é movido pelo mesmo esqueleto padrão (17 juntas, em T-pose, olhando para -z), então qualquer movimento serve para qualquer personagem.

## A ficha: dois arquivos por personagem

Todo personagem que não é figurante tem uma ficha em dois arquivos, e ela manda sobre qualquer roteiro (mudar só com o autor):

- **`characters/<id>.json`**: o que é fixo e o código lê, sem interpretar: a aparência, a voz e o `profile` (`CharacterProfile` em `src/engine/character/types.ts`):
  ```json
  "profile": { "role": "principal", "age": "idoso", "origin": "Belém de Judá", "family": { "filho-caçula": "davi" },
               "sources": ["1 Samuel 17:12-20"], "episodes": [1, 2, 3], "sheet": "referencias/folhas/jesse.png",
               "voiceChosen": { "by": "autor", "date": "2026-11-14", "note": "entre 5 amostras" } }
  ```
  `role`: `protagonista`, `principal`, `secundario` ou `figurante`. Figurante (soldado, aluno, povo) só tem o `role` e não tem `.md`.
- **`characters/<id>.md`**: o que precisa ser lido e interpretado, nesta ordem: `## Quem é`, `## Personalidade`, `## Como fala`, `## Rosto e corpo` (expressões que combinam e as que o autor vetou), `## O que quer`, `## Nunca`, `## Arco na série` (uma linha por episódio), `## Cânone` (fatos fixos), `## Voz` (qual e por quê). Comece pela tabela de personagens da `biblia.md` e pelo que o autor disse.

Nada fixo vai só no `.md` (idade, família, episódios, voz): o que o código pode precisar ler fica no JSON. `src/engine/fichas.test.ts` confere que todo personagem tem `role`, que todo não figurante tem o `.md` e que ninguém usa voz vetada.

Ao fim de cada episódio, atualize o `## Arco na série`, o `## Cânone` e o `episodes` de quem apareceu.

## Antes de começar

- Veja os personagens que a série já tem. Se a pessoa já existe, edite o arquivo; não crie outro.
- Pergunte só o que não dá para decidir: idade aproximada (define a altura) e o traço que o autor considera marcante. O resto, decida e conte o que decidiu.

## Corpo paramétrico

```json
{ "id": "ana", "name": "Ana", "height": 1.65, "skin": "#d9a27c", "hair": "#2c1d18", "hairStyle": "long", "shirt": "#e0a030", "pants": "#3b4a6b", "shoes": "#f2f2f2" }
```

- `height` em metros: adulto 1.6 a 1.85, criança 1.1 a 1.4. A cabeça não encolhe junto, o que faz a criança parecer criança.
- `hands`: `mitten` (padrão, polegar e um bloco de dedos) ou `fingers` (cinco dedos). Use `fingers` em quem aparece com a mão em close, como o personagem da câmera em primeira pessoa.
- `eyes`: cor dos olhos (padrão castanho-escuro). As sobrancelhas saem da cor do cabelo.
- `hairStyle`: `short`, `buzz` (raspado), `fringe` (franja de lado), `mohawk` (moicano), `curly` (cacheado curto), `curlyLong` (cachos até o ombro), `afro`, `puffs` (dois pompons), `bob` (até o queixo), `long`, `ponytail` (rabo de cavalo), `pigtails` (maria-chiquinha), `bun` (coque), `none`.
- `hair`: qualquer cor; as prontas estão em `HAIR_COLORS` (`src/engine/character/extras.ts`): loiro `#d9b25f`, ruivo `#b5471f`, castanho `#4a3020`, azul `#2f6fd6`, verde `#2f9e5b`, roxo `#8a4fc7`, rosa `#e86aa6`. `hairStreak`: cor de uma mecha.
- Rosto: `headShape` (`round`, `oval`, `wide`), `eyeSize` (0.8 a 1.2), `nose` (`round`, `small`, `long`, `wide`), `lips` (cor).
- `beard`: `none`, `stubble`, `mustache`, `goatee`, `full`, na cor do cabelo. `glasses`: `none`, `round`, `square`, com `glassesColor`.
- Figurantes: `extraLook(semente)` em `src/engine/character/extras.ts` sorteia pele, cabelo, rosto, altura e óculos; `{ adult: true }` permite barba.
- `build` alarga ou afina o corpo (padrão 1). `headScale` muda o tamanho da cabeça (padrão 1.3).
- Dê a cada personagem uma cor de roupa própria; é o que o distingue de longe num vídeo vertical.

## Modelo GLB

Ponha o arquivo ao lado do JSON e aponte para ele:

```json
{ "id": "robo", "name": "Robô", "height": 1.8, "glb": "robo.glb" }
```

- O modelo precisa ter esqueleto (skinned) e estar em T-pose. Os eixos dos ossos não importam.
- Os ossos são achados pelo nome (padrão Mixamo e variações comuns). Se algum faltar, o erro diz qual; informe em `bones`, por exemplo `{ "upperArmL": "Braco_E" }`.
- `facing`: `"+z"` (padrão do glTF) ou `"-z"`, o lado para onde o modelo olha no arquivo.
- Rosto: só funciona se o modelo tiver morph targets. Ligue em `morphs`, por exemplo `{ "blink": "eyesClosed", "happy": "smile", "talk": "jawOpen" }`. As formas de boca da fala também podem ser ligadas, como `"vis.A"`, `"vis.E"`, `"vis.O"`, `"vis.U"` e `"vis.F"`; sem elas a boca só abre e fecha por `talk`. Sem isso o personagem não pisca, não muda de expressão e não terá lip-sync. Avise o autor.

## Colocar no episódio

No arquivo do episódio, `cast` diz quem aparece e onde começa:

```json
"cast": [{ "character": "ana", "at": [12.6, 1.2], "elevation": 0, "yaw": 180 }]
```

`at` é `[x, z]` no local; `yaw` 0 olha para o norte, 90 para o oeste. O `id` no elenco é o do personagem, a não ser que se dê outro (útil para dois figurantes iguais). O que o personagem faz vem da trilha de ações (skill `direct-actions`): `walkTo`, `turnTo`, `express`.

## Movimentos e expressões novos

- Movimentos são funções puras em `src/engine/character/motion.ts`: recebem tempo ou distância e devolvem uma pose (rotação de cada junta a partir da T-pose). Um movimento novo entra ali e serve a todos os personagens.
- Poses em loop da vitrine ficam em `SHOWCASE_POSES` (`src/engine/character/showcase.ts`). Um movimento novo ganha uma entrada ali para poder ser conferido.
- Expressões ficam em `EXPRESSIONS`, no mesmo arquivo de movimentos. Existem: `happy`, `sad`, `angry`, `surprised`, `scared`. Confira antes de criar outra. Uma expressão diz só o que muda do rosto neutro (`FaceParams` em `types.ts`): olhos, sobrancelhas, pálpebras, boca e dentes.
- Formas de boca da fala ficam em `VISEMES`, também em `motion.ts`.
- Poses de mão ficam em `HAND_POSES`, no mesmo arquivo: `grip`, `point`, `fist`, `open`, `hold`, `type`.

## Estilo da série

Se a bíblia tem `"style": { "look": "cel" }`, o personagem ganha luz em faixas e contorno (`src/engine/style.ts`). Peças pequenas do rosto ficam sem contorno por `userData.noOutline`; marque assim qualquer detalhe novo que o contorno enterraria. Confira o personagem nos dois estilos pelo menu "Estilo" da vitrine.

## Conferir

1. `npm test` e `npm run typecheck`.
2. Folha de personagem (frente, lado, costas e rosto, sozinho no palco): `npm run vitrine -- --folha <ficha> --series <série>`. É a referência que mantém o personagem igual em toda a série; guarde as folhas aprovadas em `series/<série>/referencias/folhas/`.
3. Abra a vitrine, `?vitrine=personagens&series=<série>`: todos os personagens da série lado a lado, sem precisar de episódio. Tire screenshots de corpo inteiro parado, andando, e do rosto com cada expressão usada. Pelo console: `window.__vitrine.select('<id>', 'body' | 'face')`, `setPose('walk')`, `setExpression('happy')`, `setMouth('O')`, `setBehaviour('chat')`, `setLook('camera')`, `restyle('<id>', { hairStyle: 'bun' })`, `addExtras('<id>', 6)`, `pause(<segundos>)`. `select(null)` volta a todos.
3. Para ver o personagem dentro de um episódio, o painel do estúdio lista o elenco; clicar leva a câmera até ele.
4. Olhe as imagens: pés no chão, braços para baixo, rosto visível sob o cabelo, personagem olhando para onde anda.

## Voz: o autor escolhe, ouvindo

Nenhuma voz nova entra num episódio sem o autor ouvir. A descrição da biblioteca engana: "Slow, Calm and Confident" já soou como locutor de rádio. Por isso:

1. Leia `canal/vozes.json`: as vozes que o autor já aprovou, as em teste e as **vetadas** (locutor, anúncio, sotaque de Portugal). Uma aprovada pouco usada pode servir; nunca uma vetada.
2. Busque candidatas: `npm run testar-voz -- --buscar --genero male --idade middle_aged` (deixa de fora locutor, anúncio e as vetadas). Prefira `narrative_story`, `conversational`, `characters_animation`; desconfie de `entertainment_tv`, `social_media`, `advertisement`.
3. Gere a mesma fala em 4 a 6 candidatas, no tom da cena:
   ```
   npm run testar-voz -- --series <s> --personagem <id> --ep <n> --vozes "dono/id:nome,id:nome,..."
   ```
   (`--ep` pega a primeira fala do personagem nesse episódio, com o tom; ou `--texto "..." --tom cansado`.) As amostras saem em `out/<s>/vozes/<id>/`, no volume do vídeo final (-14 LUFS), e a voz atual entra primeiro, para comparar. Custa poucos créditos.
4. Mande os arquivos ao autor (`SendUserFile`) e copie para o NAS, na pasta do episódio (`Videos Curtos/<Série>/epNN/vozes-<id>/`). **Espere ele escolher.**
5. Grave a escolha: `voice: { "id": ... }` no JSON (ou `look.voice` no elenco, para um figurante), `profile.voiceChosen` com `"by": "autor"`, e a voz em `canal/vozes.json` (`aprovada`, com o uso). O que ele vetar vai para lá como `vetada`, com o motivo.

Combine idade e jeito com a ficha: adolescente com voz jovem, profeta idoso com voz calma, gigante grave. Figurantes que conversam entre si precisam de vozes bem diferentes. Opcional na voz: `stability`, `similarity`, `style` (0 a 1) e `speed` (o v3 ignora a velocidade: o áudio é acelerado depois).


## Roupas e acessórios

- `wear` na ficha: lista de peças do catálogo em `src/engine/character/wear.ts`, por id, com `color` e `accent` se quiser. Peças: `cap`, `policeCap`, `helmet`, `vest` (com `accent` vira colete refletivo, sem ele é tático), `badge`, `longSleeves`, `dutyBelt`, `backpack`, `deliveryBag`.
- Exemplos em `series/demo-acoes/characters/`: `policial.json`, `entregador.json`, `gari.json`.
- As peças ficam presas às juntas, então acompanham qualquer pose. As da cabeça somem junto com ela na câmera em primeira pessoa.
- Peça nova: `registerWearable` em `wear.ts`, servindo a mais de um personagem (um colete com cor, não "o colete do fulano"). Só vale para o corpo do motor, não para GLB.
- Para ver: `npm run vitrine -- --personagens --series <série>` (e `--orbit 150` para as costas, `--id <ficha>` para um só).
