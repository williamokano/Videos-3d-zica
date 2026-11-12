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
- `hairStyle`: `short`, `long`, `bun`, `none`. `build` alarga ou afina o corpo (padrão 1). `headScale` muda o tamanho da cabeça (padrão 1.3).
- Dê a cada personagem uma cor de roupa própria; é o que o distingue de longe num vídeo vertical.

## Modelo GLB

Ponha o arquivo ao lado do JSON e aponte para ele:

```json
{ "id": "robo", "name": "Robô", "height": 1.8, "glb": "robo.glb" }
```

- O modelo precisa ter esqueleto (skinned) e estar em T-pose. Os eixos dos ossos não importam.
- Os ossos são achados pelo nome (padrão Mixamo e variações comuns). Se algum faltar, o erro diz qual; informe em `bones`, por exemplo `{ "upperArmL": "Braco_E" }`.
- `facing`: `"+z"` (padrão do glTF) ou `"-z"`, o lado para onde o modelo olha no arquivo.
- Rosto: só funciona se o modelo tiver morph targets. Ligue em `morphs`, por exemplo `{ "blink": "eyesClosed", "happy": "smile", "talk": "jawOpen" }`. Sem isso o personagem não pisca, não muda de expressão e não terá lip-sync. Avise o autor.

## Colocar no episódio

No arquivo do episódio, `cast` diz quem aparece e onde começa:

```json
"cast": [{ "character": "ana", "at": [12.6, 1.2], "elevation": 0, "yaw": 180 }]
```

`at` é `[x, z]` no local; `yaw` 0 olha para o norte, 90 para o oeste. O `id` no elenco é o do personagem, a não ser que se dê outro (útil para dois figurantes iguais). O que o personagem faz vem da trilha de ações (skill `direct-actions`): `walkTo`, `turnTo`, `express`.

## Movimentos e expressões novos

- Movimentos são funções puras em `src/engine/character/motion.ts`: recebem tempo ou distância e devolvem uma pose (rotação de cada junta a partir da T-pose). Um movimento novo entra ali e serve a todos os personagens.
- Expressões ficam em `EXPRESSIONS`, no mesmo arquivo. Existem: `happy`, `sad`, `angry`, `surprised`, `scared`. Confira antes de criar outra.

## Conferir

1. `npm test` e `npm run typecheck`.
2. No estúdio, o painel lista o elenco; clicar leva a câmera até o personagem. Tire screenshots de corpo inteiro parado, andando, e do rosto com cada expressão usada.
3. Olhe as imagens: pés no chão, braços para baixo, rosto visível sob o cabelo, personagem olhando para onde anda.
