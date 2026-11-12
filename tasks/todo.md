# Tarefa 8 do motor: grande-angular e granulado

Pedido do autor em 2026-11-12 ("próxima"). A tarefa 7 está no commit `f2eda3d`, enviado. Esta ainda não foi commitada.

- [x] `lens` nos keyframes de câmera e nas chamadas do roteiro (`timeline/camera.ts`, `timeline/direct.ts`)
- [x] `grain` no `grade` da bíblia
- [x] Os dois no passe de imagem (`src/engine/grade.ts`)
- [x] Exemplo no episódio 1: a lente abre na corrida final
- [x] Testes: `src/engine/lens.test.ts`, `grade.test.ts`
- [x] Registro: `docs/NEXT.md`, `README.md`, skill `direct-actions`

## Revisão

- `npm run typecheck` limpo; `npm test` com 132 testes (129 de antes mais 3).
- Episódio 1 pela câmera: quatro instantes da corrida final com a lente abrindo (os armários curvam), e dois instantes sem lente, iguais a antes.
- Granulado conferido com `grain: 0.5` posto na bíblia só para a captura e retirado depois.
- Não conferido: render em vídeo com lente ou granulado, e o tempo de render; lente em plano `cinematic` e `third_person` (só nos testes).

Próxima: tarefa 9, vitrine para os outros assets (ver `docs/NEXT.md`).
