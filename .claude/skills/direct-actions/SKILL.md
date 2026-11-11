---
name: direct-actions
description: Fazer coisas acontecerem num episódio — abrir e fechar portas (de abrir, de correr, de enrolar), abrir porta de carro, andar de carro, pegar e largar objetos. Use quando o usuário pedir uma ação num objeto do cenário ou um novo tipo de ação.
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

`x`, `y`, `z` são coordenadas do local (não da área). `yaw` é em graus, igual ao `rot`. O carro olha para -z com `rot: 0`; o motorista fica à esquerda.

## Catálogo

O catálogo está em `src/engine/actions/builtin.ts`; leia os `registerAction(...)` antes de usar ou criar uma ação.

| Ação | Vale para | Parâmetros |
|---|---|---|
| `open` | porta, veículo | `part` (qual porta do carro), `amount` (0 a 1), `from` (`inside` ou `outside`) |
| `close` | porta, veículo | `part` |
| `drive` | veículo | `path` (pontos `[x, z]`), `speed` (m/s, padrão 6), `reverse` |
| `moveTo` | prop, item, veículo | `to` (`[x, z]`), `y`, `yaw` |
| `pickUp` | item | `to` (`[x, y, z]`, onde o item fica seguro) |
| `putDown` | item | `at` (`[x, y, z]`) |
| `set` | qualquer | `channel`, `value` |

## Regras

- Porta com `opensFrom` `inside` ou `outside` só abre por aquele lado: `open` exige `from`, e o lado errado é erro de compilação. "Dentro" é a área que declara a abertura.
- Porta fechada bloqueia a passagem. De enrolar libera quando quase toda aberta; as outras, da metade em diante.
- Duas ações não podem mexer no mesmo canal ao mesmo tempo.
- `drive` parte de onde o carro está e sai na direção em que ele aponta. Ponha o primeiro ponto do caminho à frente do carro.
- `leaf.open` é o estado inicial da porta (0 a 1). Estado inicial diferente por episódio se faz com uma ação em `t: 0` e `duration: 0`.
- Sem personagens ainda (Fase 2): `pickUp` leva o item a um ponto dado em `to`, e ninguém aparece abrindo a porta. Quando houver personagem, o ponto passa a ser a mão.

## Criar uma ação ou um objeto novo

- Ação nova: `registerAction` em `src/engine/actions/`, declarando `appliesTo`, `params` e os canais que move. Ela deve servir a qualquer mapa.
- Objeto com partes móveis: no asset, chame `setChannels(obj, { nome: { value, apply } })` e registre o `kind` (quarto argumento de `registerAsset`). Veja `src/engine/assets/vehicles.ts`.
- Tipo novo de porta: `kind` em `DoorLeaf` (`src/engine/world/types.ts`) e o desenho em `src/engine/world/doors.ts`.

## Conferir

1. `npm test` e `npm run typecheck`. Os testes compilam as ações de todos os episódios de todas as séries contra o local de cada um.
2. No estúdio (`npm run dev`), as ações aparecem como barras azuis na timeline e em "Ações do episódio" no painel; um erro de compilação aparece ali em vermelho.
3. Tire screenshots na visão Câmera em instantes antes, durante e depois de cada ação (`window.__studio.timeline.seek(frame)`) e olhe as imagens.
4. A série `demo-acoes` (`?series=demo-acoes`) mostra todas as ações do catálogo; use como exemplo.
