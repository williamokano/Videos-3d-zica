---
name: create-character
description: Criar ou ajustar um personagem de uma série — corpo cartoon paramétrico ou modelo GLB — e colocá-lo num episódio. Use quando o usuário descrever uma pessoa nova, pedir mudança de aparência, ou quiser trocar um personagem por um modelo 3D.
---

# Criar um personagem

Um personagem é dado da série: `series/<série>/characters/<id>.json`, no formato `CharacterDef` de `src/engine/character/types.ts`. Todo personagem, feito aqui ou importado, é movido pelo mesmo esqueleto padrão (17 juntas, em T-pose, olhando para -z), então qualquer movimento serve para qualquer personagem.

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
2. Abra a vitrine, `?vitrine=personagens&series=<série>`: todos os personagens da série lado a lado, sem precisar de episódio. Tire screenshots de corpo inteiro parado, andando, e do rosto com cada expressão usada. Pelo console: `window.__vitrine.select('<id>', 'body' | 'face')`, `setPose('walk')`, `setExpression('happy')`, `setMouth('O')`, `setBehaviour('chat')`, `setLook('camera')`, `restyle('<id>', { hairStyle: 'bun' })`, `addExtras('<id>', 6)`, `pause(<segundos>)`. `select(null)` volta a todos.
3. Para ver o personagem dentro de um episódio, o painel do estúdio lista o elenco; clicar leva a câmera até ele.
4. Olhe as imagens: pés no chão, braços para baixo, rosto visível sob o cabelo, personagem olhando para onde anda.

## Voz

- `voice: { "id": "<id da ElevenLabs>" }` na ficha. Opcional: `stability`, `similarity`, `style` (0 a 1) e `speed` (o v3 ignora a velocidade: o áudio é acelerado depois).
- Um figurante com voz própria: `look: { voice: { id } }` no elenco.
- Para achar vozes em pt-BR: `GET https://api.elevenlabs.io/v1/shared-voices?language=pt&accent=brazilian&gender=male&age=young` com o cabeçalho `xi-api-key`. As vozes da biblioteca funcionam direto pelo id.
- Vozes já usadas em `ceu-vermelho` estão nas fichas da série. Combine idade e jeito com a bíblia: adolescente com voz jovem e animada, professor com voz mais grave e firme.

