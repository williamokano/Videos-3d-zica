# Tarefa 7 do motor: tela final interativa

Pedido do autor em 2026-11-12 ("sim, pode fazer"). A tarefa 6 está no commit `4247244`, enviado. Esta ainda não foi commitada.

- [x] Modelo e animação: `src/engine/ui/endcard.ts` (`endCardAt`, `endCardProblem`)
- [x] Ação `endCard` do `world` e `d.endCard(...)` no roteiro
- [x] Desenho por cima do quadro da câmera do episódio (`showEndCard` em `src/studio/main.ts`, CSS em `style.css`)
- [x] Exemplo no fim do episódio 1
- [x] Testes: `src/engine/endcard.test.ts`
- [x] Registro: `docs/NEXT.md`, skill `direct-actions`

## Revisão

- `npm run typecheck` limpo; `npm test` com 129 testes (124 de antes mais 5).
- Estúdio, visão Câmera: a tela entrando em cinco instantes. Na primeira versão o conteúdo passava do quadro; reduzi os tamanhos.
- Render dos últimos 9 s do episódio 1: um quadro do meio da tela final conferido.
- Corrigido de passagem: legenda e tela final continuavam visíveis ao sair da visão Câmera para a Geral; agora somem na troca.
- Não conferido: tela com 2 e com 6 opções; `icon` com emoji; render completo e o seu tempo.

Próxima: tarefa 8, grande-angular por plano e granulado leve opcional (ver `docs/NEXT.md`).
