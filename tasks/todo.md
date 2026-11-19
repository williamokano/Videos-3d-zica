# HORA CONTADA — o relógio no braço

Pedido e decisões do autor em `series/hora-contada/roteiros/001-pedido.md`; regras do mundo em `series/hora-contada/biblia.md`. O todo de Davi foi para `tasks/todo-davi.md`.

**Como retomar:** leia este arquivo, `git status`, `npm run typecheck && npm test`, e continue do primeiro item sem marcar. Sem áudio.

## 1. Mostrador no braço (motor)
- [x] `character/clock.ts`: ler e escrever `AAAA:DDD:HH:MM:SS`; o mostrador (números verdes na pele, por quadro, como a tela do celular)
- [x] Propriedade `clock` na ficha e no elenco (`{ left, running, arm }`); canais `clock` e `clock.rate`: o saldo conta sozinho, `saldo(t) = clock - rate * t`
- [x] Ações: `clock` (acertar o saldo num pulo de tempo, somar/tirar em pagamento, ligar aos 25), `transfer` (de um braço para o outro: queda de mão ou máquina)
- [x] Diretor: `ator.clock(...)`, `ator.transfer(...)`, `d.passTime(...)` (todos os relógios que correm descem juntos e rápido)
- [x] O mostrador gira com o pulso; a manga comprida cobre
- [x] Testes (contagem, virada aos 25 sem salto, transferência, pulo de tempo, menor de 25 não transfere)
- [x] Banco de três câmeras (frente, 3/4, lado), manga curta e comprida: `demo-acoes` ep. 9
- [x] Documentar na skill `direct-actions`

## 2. Depois
- [x] Gesto de ler/mostrar o braço (`showArm`)
- [ ] Puxar a manga; queda de mão (pose das duas mãos segurando os antebraços)
- [ ] Maquininha e o app do cofre no celular
- [ ] Fichas e teste de voz (Caio, Rosa, Bia, Juninho, Dona Vera, menino)
- [ ] Lugares: avenida com farol, Alto das Torres, Jardim Esperança, cozinha
- [ ] `series/hora-contada/episodes/001.ts`, revisar, prévia muda

## Revisão
- 2026-11-20, mostrador: o saldo é a propriedade `clock` (ficha ou elenco) e conta sozinho; as ações acertam, pagam, transferem, ligam aos 25 e pulam o tempo de todos. Tudo foi conferido no banco `demo-acoes` ep. 9: números legíveis por cima do ombro (`showArm('self')`) e de frente (`showArm('out')`), o pulo de um dia, a transferência de uma hora, a virada sem salto e a manga comprida cobrindo. Testes: `src/engine/clock.test.ts`.
- Pendente: a pose da mão no `showArm('out')` ainda dobra o pulso para trás; fica para o banco da queda de mão.
