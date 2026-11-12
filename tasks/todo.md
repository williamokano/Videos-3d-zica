# Tarefa 9 do motor: vitrine de assets

Pedido do autor em 2026-11-12. A tarefa 8 está no commit `6b962fd`, enviado. Esta ainda não foi commitada.

- [x] `src/engine/assets/showcase.ts`: grupos, disposição em fila, ações por tipo, faixa de cada canal
- [x] `src/studio/assets-showcase.ts`: página `?vitrine=assets`, com seleção, canais, ações, estilo, pessoa de escala
- [x] Navegação entre estúdio e as duas vitrines
- [x] Testes: `src/engine/assets-showcase.test.ts`
- [x] Registro: `docs/NEXT.md`, `README.md`, skill `build-location`
- [x] Tarefa nova registrada: carros melhores (tarefa 10 em `docs/NEXT.md`, com as palavras do autor); voz virou a 11

## Revisão

- `npm run typecheck` limpo; `npm test` com 136 testes (132 de antes mais 4).
- Olhado em imagem: o carro selecionado com o painel (canais, lugares, ação escolhida) e o grupo Escola inteiro.
- Testado pela página: seleção por clique (armários), controle de porta pelo painel, e o controle acompanhando um valor posto por fora.
- Capturados mas não olhados: grupos Depósito, Itens e Natureza; o carro só com as portas abertas.
- Não conferido: "Animar os canais"; estilo suave nesta página.

Próxima: tarefa 10, carros melhores (ver `docs/NEXT.md`).
