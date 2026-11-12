# Tarefa 4 do motor: mãos com dedos

Plano aprovado em 2026-11-12. Trabalho interrompido no meio (limite de uso); nada desta tarefa foi commitado.

- [x] Formas de mão: `HandShape`, `HAND_POSES`, `resolveHand` (`character/motion.ts`), canais `handL.<pose>` / `handR.<pose>`
- [x] Geometria: `buildHand` em `character/body.ts`, tipos `mitten` (padrão) e `fingers`; `heroi` com `fingers`
- [x] Mão fecha sozinha no que carrega e abre ao gesticular (`character/cast.ts`); soquete da mão passou a ser a palma
- [x] Giro do pulso: `palmToward` em `character/ik.ts` (conta conferida em números: a palma vira para o rosto)
- [x] Ações `pointAt` e `hand` (`actions/character.ts`) e métodos no roteiro (`timeline/direct.ts`)
- [x] Vitrine: menu "Mãos", pose "Apontar", tipo de mão na aparência
- [ ] Encaixe do celular na mão (`userData.grip` em `assets/items.ts`): ainda com o valor de quando o soquete era o pulso. Conferir em primeira pessoa: tela inteira e legível, polegar na frente, dedos atrás
- [ ] Conferir em imagem: mãos depois da redução de tamanho, estilo cel, palco, "Falar" e `chat`
- [ ] Testes novos (`resolveHand`, `palmToward`, `buildBody` com os dois tipos, `pointAt`, `hand`, item na palma)
- [ ] Episódio 1 pela câmera (herói e professor com o celular) e `demo-acoes` (caixa, porta)
- [ ] Render e tempo (36 s antes)
- [ ] Registro: `docs/NEXT.md`, skills `create-character` e `direct-actions`

Estado na interrupção: `npm run typecheck` limpo; os 101 testes existentes passavam antes da redução do tamanho da mão (não rodei de novo depois).
