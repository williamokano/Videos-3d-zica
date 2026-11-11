---
name: write-episode
description: Escrever ou ajustar um episódio — a trilha de câmera e a trilha de ações (portas abrindo, carro andando, objetos sendo presos ou soltos). Use quando o usuário descrever o que acontece numa cena ou pedir mudanças de enquadramento ou de tempo.
---

# Escrever um episódio

Um episódio é dado da série: `series/<série>/episodes/<número>.json`, no formato de `src/engine/timeline/episode.ts`. Tem `location`, `duration` (segundos), `camera` e `actions`. O estado de tudo em qualquer instante é função pura do tempo, então nunca dependa de ordem de execução: descreva o que acontece e quando.

## Câmera

Keyframes `{ t, pos, lookAt, fov?, cut? }`. Entre keyframes a câmera se move suavemente; `cut: true` faz corte seco para aquele keyframe. Altura dos olhos: cerca de 1,6 m acima do piso da área (some a `elevation`).

## Ações

`{ t, target, action, duration?, params? }`. O `target` é o id de uma porta (`leaf.id` na abertura) ou de um prop com `id` no arquivo do local. Só o que tem id pode sofrer ação; se o alvo não tem, dê um id a ele no local.

Catálogo (fonte: `registerAction(...)` em `src/engine/timeline/actions.ts`):

| Ação | O que faz | Parâmetros |
|---|---|---|
| `open` | Abre uma porta de qualquer tipo ou uma parte que abre de um objeto | `part` (ex.: `door.fl`, `trunk` num carro), `amount` 0–1, `from` (`inside` ou `outside`) |
| `close` | Fecha | `part` |
| `move` | Desloca um prop por pontos, virado para onde vai; rodas giram sozinhas | `path` `[[x, z], ...]` ou `to` `[x, z]` |
| `attach` | Prende um prop a uma âncora de outro objeto | `to` `"<id>.<âncora>"` |
| `detach` | Solta e coloca num lugar | `at` `[x, z]`, `y`, `rot` |
| `set` | Leva qualquer canal a um valor | `channel`, `to` |

O tipo da porta (de abrir, de correr, de enrolar) é propriedade da porta no local (`leaf.kind`), não da ação: `close` numa porta `rollup` é a porta de loja descendo.

Canais e âncoras de um asset estão no comentário do asset (ex.: `vehicle.car` em `src/engine/assets/vehicles.ts`: portas `door.fl/fr/rl/rr`, `trunk`; âncoras `seat.driver`, `seat.passenger`, `seat.rl`, `seat.rr`, `trunk`, `roof`).

## Regras que o compilador cobra

- Porta com `opensFrom: "inside"` só abre com `from: "inside"` (o padrão). O erro diz qual porta e por quê.
- Duas ações não podem mexer no mesmo canal ao mesmo tempo, nem mover o mesmo objeto ao mesmo tempo.
- Alvo, ação, canal ou âncora inexistente dá erro com a lista do que existe.
- Porta fechada bloqueia a passagem: abra antes de a câmera ou alguém atravessar.

## Se faltar uma ação ou um tipo de objeto

Amplie o motor de forma genérica, nunca com código de um episódio específico:

- Ação nova: `registerAction` no catálogo, compondo `ctx.channel`, `ctx.move`, `ctx.place`, `ctx.attach`.
- Objeto novo com partes móveis: um asset que exponha `userData.channels` e `userData.anchors`.

## Conferir

1. `npm test` e `npm run typecheck`.
2. No estúdio (`npm run dev`), visão Câmera, tire screenshots headless em vários tempos com `window.__studio.timeline.seek(segundos * fps)` e olhe: enquadramento, câmera sem atravessar parede ou móvel, portas abertas na hora em que são atravessadas.

## Ainda não existe

Personagens. Ações como pegar com a mão, sentar no carro ou andar até a porta dependem deles; o motor já tem as âncoras (assentos, porta-malas) onde eles vão se prender.
