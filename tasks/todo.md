# Tarefa 6 do motor: cor da imagem

O autor pediu como efeito (2026-11-12): "essa parte do céu vermelho eu usei apenas como referência, não sei se vou continuar nessa linha". Feito genérico, sem depender dessa história. Ainda sem commit. A tarefa 5 está no commit `1c76b8d` (local, sem push).

- [x] `Grade` na bíblia: da série (`grade`) ou de uma regra (`effects.grade`), com `resolveGrade`
- [x] `GradePass` (`src/engine/grade.ts`), aplicado no quadro da câmera do episódio e na vitrine
- [x] Regra `ceu-vermelho` usando o efeito, como exemplo
- [x] Testes: `src/engine/grade.test.ts`
- [x] Registro: `docs/NEXT.md`, `README.md`

## Revisão

- `npm run typecheck` limpo; `npm test` com 124 testes (120 de antes mais 4).
- Episódio 1 pela câmera em oito instantes: neutro antes da regra, tingindo junto com o céu, e tingido depois. Na visão geral do estúdio, só o quadro da câmera do episódio é corrigido.
- Render completo: 44 s (38 s antes). Dois quadros tirados do vídeo conferidos, um antes e um depois da regra.
- Não conferido: a vitrine com a regra ligada (capturada, não olhada); `grade` no nível da série (só nos testes).

Próxima: tarefa 7, tela final interativa (ver `docs/NEXT.md`).
