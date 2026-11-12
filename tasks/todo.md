# Tarefa 10 do motor: carros melhores

Pedido do autor em 2026-11-12. A tarefa 9 está no commit `580cad8`, enviado. Esta ainda não foi commitada.

- [x] Carro em blocos com para-brisa e vidro traseiro inclinados (`src/engine/assets/vehicles.ts`)
- [x] Portas alinhadas com a lataria e com os vidros
- [x] Quem está no arco da porta sai da frente antes de ela se mover (`outOfTheWay` em `actions/builtin.ts`)
- [x] Testes: `src/engine/car.test.ts`
- [x] Registro: `docs/NEXT.md`

## Revisão

- `npm run typecheck` limpo; `npm test` com 143 testes (136 de antes mais 7).
- Vitrine de assets: o carro de lado e de três quartos de frente, nos dois estilos, e com duas portas abertas.
- `demo-acoes`, episódio 1, visto de cima do lado da personagem em oito instantes: ela abre a porta de trás, põe a caixa, dá um passo para fora e a porta fecha na frente dela; depois abre a da frente.
- Não conferido: o carro por trás em imagem (capturado, não olhado); a personagem sentada dirigindo; render em vídeo; o episódio 2 da `demo-acoes` (não usa carro).
- Fora desta tarefa, anotado em "Limitações conhecidas": rodas da frente não viram, porta-malas não abre, `sit` não confere a porta, braços não seguram o volante.

Próxima: tarefa 11, voz, só com a confirmação do autor.
