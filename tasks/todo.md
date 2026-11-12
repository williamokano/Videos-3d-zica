# Tarefa 5 do motor: cabelo com volume e ficha mais configurável

Pedido do autor em 2026-11-12. A tarefa 4 (mãos) está nos commits `a2f70c4` e `a22253f`. Esta tarefa ainda não foi commitada.

- [x] Cabelos novos com volume: `curly`, `afro`, `bob`, `ponytail`, `fringe`, `buzz`
- [x] Ficha: `headShape`, `eyeSize`, `nose`, `lips`, `beard`, `glasses`, `glassesColor`
- [x] `extraLook` sorteando tudo (barba só com `adult`)
- [x] Vitrine: controles novos na aparência
- [x] Testes: `src/engine/look.test.ts`
- [x] Conferir em imagem e no episódio 1
- [x] Registro: `docs/NEXT.md`, skill `create-character`

## Revisão

- `npm run typecheck` limpo; `npm test` com 118 testes (112 de antes mais 6).
- Vitrine em cel: os nove cabelos de frente, de lado e por trás; as quatro barbas e os dois óculos de frente e de lado; três combinações de formato de cabeça, nariz e olhos; uma turma de 11 figurantes sorteados.
- Episódio 1 pela câmera em quatro instantes: compila sem erro e a turma aparece com os cabelos novos.
- Ajustes depois de ver as imagens: franja deitada na testa (parecia uma boina), touca por baixo do cacheado (aparecia pele entre os cachos), costeleta subindo até o cabelo, hastes dos óculos para trás e armação mais grossa.
- Não conferido: estilo suave; os controles novos do menu clicados à mão; tempo de render.

## Segunda rodada (pedido do autor: crespos femininos estranhos, mais modelos, cores e mecha)

- [x] Crespos refeitos: cachos menores e mais regulares sobre uma touca; `curly`, `afro` e o novo `curlyLong` (até o ombro)
- [x] Modelos novos: `curlyLong`, `puffs`, `pigtails`, `mohawk`
- [x] Cores com nome (`HAIR_COLORS`): loiros, ruivos, castanhos, azul, verde, roxo, rosa; no sorteio dos figurantes
- [x] Mecha (`hairStreak`), em todos os cabelos menos raspado e careca
- [x] Sobrancelha escura sob cabelo tingido
- Conferido em imagem (cel, na Maria): os seis modelos crespos e novos de frente, de lado e por trás; cinco cores; quatro mechas; turma sorteada. 120 testes.
- Não conferido: os menus "Cor pronta" e "Mecha" clicados à mão; `pigtails` e `puffs` com mecha (a mecha só pega a touca).

Próxima: tarefa 6, cor do mundo por regra da bíblia (ver `docs/NEXT.md`).
