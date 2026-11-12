# Tarefa 3 do motor: contorno grosso e luz em faixas

Plano aprovado em 2026-11-12.

- [x] Estilo na bíblia: `style` e `resolveStyle`
- [x] `src/engine/style.ts`: `applyStyle` com luz em faixas e contorno por casca invertida
- [x] Rosto: detalhes marcados sem contorno
- [x] Estúdio e vitrine: aplicar o estilo e trocar pelo painel
- [x] `ceu-vermelho` em `cel`
- [x] Testes: `src/engine/style.test.ts`
- [x] Conferir com screenshots e medir o render
- [x] Registro: `docs/NEXT.md`, `README.md`, skills

## Revisão

- `npm run typecheck` limpo; `npm test` com 101 testes (93 de antes mais 8).
- Vitrine nos dois estilos: palco, corpo com celular, rosto de frente e de três quartos, `demo-acoes` com o GLB.
- Estúdio: episódio 1 pela câmera em nove instantes, nos dois estilos lado a lado; visão geral da escola e da `demo-acoes`.
- Render completo do episódio 1: 36 s antes e 36 s depois. Dois quadros tirados do vídeo conferidos.
- Mudanças em relação ao plano, feitas depois de ver as imagens:
  - A rampa de luz só tem faixas no lado que olha para a luz. Com a rampa comum do toon os interiores lavavam.
  - O casco do cenário ficou sem faixas, além de sem contorno: as lâmpadas desenhavam arcos nas paredes. O casco é reconhecido pela geometria (caixa ou plano de quina viva), sem marcação em `build.ts`.
  - Nariz sem contorno (virava um anel) e contorno padrão de 0,01 m em vez de 0,012.
  - Cores por vértice do GLB mantidas (o robô ficava branco).
- Pendências anotadas em "Limitações conhecidas": contorno do GLB de teste não aparece; faixas de várias lâmpadas se cruzam no rosto em close.
- Não conferido em imagem: a última mudança, a cabeça com mais segmentos (para o contorno não ficar facetado em close).
- O autor aprovou ("gostei bastante"). As tarefas 2 (rosto) e 3 foram num commit só, porque mexem nos mesmos arquivos.

Próxima: tarefa 4, mãos com dedos (ver `docs/NEXT.md`).
