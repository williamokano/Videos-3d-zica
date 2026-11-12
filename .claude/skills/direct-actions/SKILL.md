---
name: direct-actions
description: Fazer coisas acontecerem num episódio — personagem andar, correr, virar, mudar de expressão, abrir porta com a mão, pegar e largar objetos, sentar no carro; portas (de abrir, de correr, de enrolar), carro andando; câmera cinematográfica, em primeira pessoa ou em terceira pessoa. Use quando o usuário pedir uma ação num objeto do cenário, um plano de câmera ou um novo tipo de ação.
---

# Dirigir ações

Uma ação é dado do episódio, não código de um mapa. O episódio (`series/<série>/episodes/<n>.json`) tem uma trilha `actions`; cada item aponta para um objeto do local pelo id e para uma ação do catálogo:

```json
{ "t": 4.6, "duration": 1.2, "target": "porta-casa", "action": "open", "params": { "from": "inside" } }
```

- `t`: segundo em que começa. `duration`: opcional, cada ação tem a sua padrão. `ease`: `inOut` (padrão), `linear`, `in`, `out`.
- O valor de cada objeto em qualquer instante é função pura da trilha, então o scrub da timeline mostra o mesmo que tocar do início.

## Objetos que aceitam ações

Um objeto precisa de `id` no arquivo do local (único no local). Cada um expõe canais numéricos que as ações animam.

| Objeto | Como declarar | Tipo | Canais |
|---|---|---|---|
| Porta | `id` na abertura com `leaf`; `leaf.kind`: `swing` (padrão), `sliding`, `rollup` | `door` | `open` de 0 a 1 |
| Carro | prop `vehicle.car` com `id` | `vehicle` | `frontLeft.open`, `frontRight.open`, `rearLeft.open`, `rearRight.open`, `travel`, `x`, `y`, `z`, `yaw` |
| Item pegável | prop com `id` e `"pickable": true` | `item` | `x`, `y`, `z`, `yaw`, `held` |
| Qualquer prop com `id` | — | `prop` | `x`, `y`, `z`, `yaw` |
| Personagem | entrada em `cast` no episódio (skill `create-character`) | `character` | `x`, `y`, `z`, `yaw`, `stride`, `gait`, `talk`, `expr.<nome>`, `crouch`, `sit`, `attached`, `carryL`/`carryR`, `reachL`/`reachR` (+ `.x`, `.y`, `.z`) |

`x`, `y`, `z` são coordenadas do local (não da área). `yaw` é em graus, igual ao `rot`. O carro olha para -z com `rot: 0`; o motorista fica à esquerda.

## Catálogo

O catálogo está em `src/engine/actions/builtin.ts` e `src/engine/actions/character.ts`; leia os `registerAction(...)` antes de usar ou criar uma ação. `by` é o id de um personagem do elenco que faz a ação com a mão.

| Ação | Vale para | Parâmetros |
|---|---|---|
| `open` | porta, veículo | `part` (qual porta do carro), `amount` (0 a 1), `from` (`inside` ou `outside`), `by`, `hand` |
| `close` | porta, veículo | `part`, `by`, `hand` |
| `drive` | veículo | `path` (pontos `[x, z]`), `speed` (m/s, padrão 6), `reverse` |
| `moveTo` | prop, item, veículo | `to` (`[x, z]`), `y`, `yaw` |
| `pickUp` | item | `by` (quem pega; fica segurando) ou `to` (`[x, y, z]`, sem personagem); `hand` (`left` ou `right`) |
| `putDown` | item | `at` (`[x, y, z]`) ou `on` + `seat` (assento de um objeto, ex.: banco do carro; o item passa a ir junto) |
| `set` | qualquer | `channel`, `value` |
| `walkTo` | personagem | `to` (`[x, z]`) ou `door` (id de uma porta: para diante dela, ao alcance da maçaneta), `elevation` (piso de destino, se mudar de nível), `speed` (m/s, padrão 1.4; a partir de 3 corre) |
| `turnTo` | personagem | `to` (`[x, z]` para onde virar) ou `yaw` |
| `sit` | personagem | `on` (id do objeto com assentos, ex.: o carro), `seat` (`driver`, `passenger`, `rearLeft`, `rearRight`; padrão `driver`) |
| `standUp` | personagem | `to` (`[x, z]` ao lado, onde fica de pé), `yaw` |
| `express` | personagem | `expression` (`neutral`, `happy`, `sad`, `angry`, `surprised`, `scared`), `amount` |

## Regras

- Porta com `opensFrom` `inside` ou `outside` só abre por aquele lado: `open` exige `from`, e o lado errado é erro de compilação. "Dentro" é a área que declara a abertura.
- Porta fechada bloqueia a passagem. De enrolar libera quando quase toda aberta; as outras, da metade em diante.
- Duas ações não podem mexer no mesmo canal ao mesmo tempo.
- `drive` parte de onde o carro está e sai na direção em que ele aponta. Ponha o primeiro ponto do caminho à frente do carro.
- `leaf.open` é o estado inicial da porta (0 a 1). Estado inicial diferente por episódio se faz com uma ação em `t: 0` e `duration: 0`.
- `walkTo` acha o caminho sozinho: desvia de paredes, passa por portas e sobe ou desce escadas. Se uma porta do caminho estiver fechada no instante em que o personagem chega nela, é erro de compilação; abra a porta antes. Sem `duration`, o tempo sai da distância e da velocidade.
- O personagem pisca e respira sozinho; não é preciso ação para isso.
- Com `by`, o personagem estende o braço até a maçaneta ou o item (inclina o tronco e se agacha se for preciso) e a ação passa a durar 1,2 s. Ele precisa estar a até 0,8 m (para um corpo de 1,7 m); mais longe é erro de compilação com a distância. Leve-o antes com `walkTo`.
- Sequência para passar por uma porta fechada: `walkTo` com `door`, `open` com `by`, `walkTo` até o outro lado. Com `by`, o lado (`from`) sai de onde o personagem está.
- Item pego com `by` fica na mão até um `putDown`, e a mão que segura não balança ao andar. Com a direita ocupada, a próxima ação com a mão usa a esquerda.
- `sit` prende o personagem ao assento: ele vai junto quando o carro anda, e `walkTo` é recusado até um `standUp`. O personagem precisa estar a até 2,5 m do objeto; abra a porta do carro antes (`open` com `part` e `by`), parado atrás da borda traseira da porta para ela não bater nele.
- Ações com `by` usam canais do personagem (`reachR`, `crouch`...): duas ao mesmo tempo com a mesma mão dão erro de canal em uso.

## Câmera

A trilha `camera` do episódio é uma lista de keyframes. Um plano vai de um keyframe com `"cut": true` (ou do primeiro) até o próximo corte, e o modo do plano fica no keyframe que o começa:

| `mode` | O que faz | Campos |
|---|---|---|
| `cinematic` (padrão) | câmera posta à mão; entre keyframes do mesmo plano ela se move em curva suave | `pos`, `lookAt`, `fov` em cada keyframe |
| `fpv` | nos olhos do personagem, olhando para onde o corpo aponta; a cabeça dele some da imagem | `follow` (id no elenco), `fov` (padrão 70), `pitch` |
| `third_person` | atrás e acima do personagem, acompanhando; chega mais perto em vez de atravessar parede | `follow`, `distance` (padrão 3 m), `height` (padrão 0.5 m acima dos olhos), `pitch`, `fov` |

```json
{"t": 5.8, "cut": true, "mode": "third_person", "follow": "ana"},
{"t": 8.5, "cut": true, "mode": "fpv", "follow": "beto", "fov": 75}
```

- `mode` e `follow` só mudam num corte. Dentro de um plano preso, keyframes sem `cut` animam `fov`, `distance`, `height` e `pitch`.
- Plano preso não leva `pos` nem `lookAt`; plano `cinematic` exige os dois.
- Erro na trilha de câmera aparece em vermelho no painel, junto dos erros de ação.

## Criar uma ação ou um objeto novo

- Ação nova: `registerAction` em `src/engine/actions/`, declarando `appliesTo`, `params` e os canais que move. Ela deve servir a qualquer mapa.
- Objeto com partes móveis: no asset, chame `setChannels(obj, { nome: { value, apply } })` e registre o `kind` (quarto argumento de `registerAsset`). Veja `src/engine/assets/vehicles.ts`.
- Assento: um `Object3D` filho direto do asset com nome `seat.<nome>`, na altura do assento. Ele vira um lugar para `sit` e `putDown`.
- Ação em que o personagem usa a mão: `reach(...)` e `freeHand(...)` de `src/engine/actions/hands.ts`. Uma ação pode mover canais de outro objeto (`target` no write) e prender um objeto a outro (`attach` / `detach`).
- Tipo novo de porta: `kind` em `DoorLeaf` (`src/engine/world/types.ts`) e o desenho em `src/engine/world/doors.ts`.

## Conferir

1. `npm test` e `npm run typecheck`. Os testes compilam as ações de todos os episódios de todas as séries contra o local de cada um.
2. No estúdio (`npm run dev`), as ações aparecem como barras azuis na timeline e em "Ações do episódio" no painel; um erro de compilação aparece ali em vermelho.
3. Tire screenshots na visão Câmera em instantes antes, durante e depois de cada ação (`window.__studio.timeline.seek(frame)`) e olhe as imagens.
4. A série `demo-acoes` (`?series=demo-acoes`) mostra todas as ações do catálogo; use como exemplo.
