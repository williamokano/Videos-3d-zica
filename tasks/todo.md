# Tarefa 1 do motor: vitrine de personagens

Plano aprovado em 2026-11-12. Endereço: `?vitrine=personagens`.

- [x] Entrada: `src/studio/entry.ts` escolhe entre estúdio e vitrine; `index.html` aponta para ela
- [x] `src/studio/ui.ts` com os controles do painel, usados pelas duas páginas
- [x] Motor: `src/engine/character/showcase.ts` (disposição, poses em loop, comportamentos, olhar)
- [x] Página: `src/studio/showcase.ts` (cena, elenco, seleção, menu, tempo, `window.__vitrine`)
- [x] Testes: `src/engine/showcase.test.ts`
- [x] Conferir com screenshots (expressões, poses, chat, olhar, aparência, céu vermelho)
- [x] Conferir que o estúdio e o render continuam iguais
- [x] Registro: `docs/NEXT.md`, `README.md`, skill `create-character`

## Revisão

- `npm run typecheck` limpo; `npm test` com 83 testes (68 de antes mais 15 da vitrine).
- Conferido em Chromium headless, olhando as imagens: palco das duas séries e de todas juntas, rosto da Maria nas cinco expressões, as oito poses em dois instantes cada, `chat` em três instantes, olhar para a câmera com a câmera de lado, aparência trocada, seis figurantes, céu vermelho, modelo GLB andando. Clique num personagem, lista de pose e controle de altura testados pela própria página.
- Estúdio abre como antes e o render de 3 s do episódio 1 saiu normal.
- Ajustes feitos depois de ver as imagens: a fileira de trás fica nos vãos da fileira da frente (os figurantes ficavam escondidos) e o enquadramento "Rosto" subiu para o centro do rosto.
- Mudanças fora da vitrine: `headAngles` extraída do `gazeAt` e `NO_AMBIENT` exportada (sem mudança de comportamento); `el`, `button` e `checkbox` saíram de `main.ts` para `ui.ts`.
- Sem commit: aguardando o autor pedir.
