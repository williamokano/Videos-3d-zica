# Tarefa 4 do motor: mãos com dedos

Plano aprovado em 2026-11-12. A primeira parte está no commit `a2f70c4` (feito pelo autor); o resto ainda não foi commitado.

- [x] Formas de mão, geometria (`mitten` e `fingers`), canais `handL.<pose>` / `handR.<pose>`
- [x] Mão fecha no que carrega e abre ao gesticular; item fica na palma
- [x] Giro do pulso (`palmToward`) e pose `hold` para o que é levantado
- [x] Ações `pointAt` e `hand`, e métodos no roteiro
- [x] Vitrine: menu "Mãos", pose "Apontar", tipo de mão
- [x] Encaixe do celular na mão, conferido em primeira pessoa no episódio 1
- [x] Testes: `src/engine/fingers.test.ts`
- [x] Registro: `docs/NEXT.md`, skills `create-character` e `direct-actions`

## Revisão

- `npm run typecheck` limpo; `npm test` com 112 testes (101 de antes mais 11).
- Vitrine: as poses nos dois tipos de mão (suave e cel), o celular levantado de frente, por cima do ombro e pelos olhos, palco com todos falando.
- Episódio 1 pela câmera: os três momentos com celular (herói duas vezes, professor) e uma fala. A tela fica inteira e legível; o polegar fica na borda de baixo.
- `demo-acoes`: os dois episódios compilam sem erro. Não olhei imagens da caixa nem da porta.
- Mudanças em relação ao plano, depois de ver as imagens: mãos reduzidas (estavam grandes); pose nova `hold`, porque com `grip` os dedos atravessavam o celular; celular segurado pela base, porque o polegar cobria as mensagens.
- Não feito: "Apontar" e `chat` não foram vistos em imagem depois dos últimos ajustes; a pose `type` não foi vista em imagem.

Próxima: tarefa 5, cabelo com volume e ficha mais configurável (ver `docs/NEXT.md`).
