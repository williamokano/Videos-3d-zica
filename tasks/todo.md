# Kit de rua, polícia e veículos

Pedido do autor em 2026-11-13: "pode começar, vai comitando e dando push e se travar faz um mecanismo pra resetar sozinho".

**Como retomar (para mim, se a sessão travar):** leia este arquivo, rode `git status` e `npm run typecheck && npm test`, e continue do primeiro item sem marcar. Cada item termina com teste, conferência na vitrine (`npm run look` não serve para vitrine; use a página `?vitrine=assets` ou um episódio de `demo-acoes`), commit e push, sem coautoria. Marque o item aqui no mesmo commit.

## 1. Roupas e acessórios no personagem
- [x] `wear` na ficha: peças presas ao corpo (boné, quepe, colete, mochila, bag de entrega, cinto com coldre e rádio, distintivo)
- [x] Fichas de exemplo em `demo-acoes`: policial e entregador; vitrine de personagens mostrando
- [x] Testes e skill `create-character`

## 2. Base de veículos
- [ ] Extrair do carro uma base comum (rodas, portas por canal, assentos, faróis)
- [ ] Viatura: pintura, giroflex que pisca com o tempo do episódio, rádio no painel
- [ ] Ônibus com porta na frente e atrás (canais), assentos
- [ ] Bicicleta (e a pessoa sentada nela)
- [ ] Testes, vitrine de assets, skill `direct-actions`

## 3. Rádio
- [ ] `item.radio`: rádio PX de mão, pegável
- [ ] Voz por rádio: `say(..., { filter: 'radio' })` e `d.narrate`, aplicado na mixagem e no estúdio
- [ ] Testes e skill

## 4. Kit de rua
- [ ] Poste de luz (com luz), semáforo, placa, ponto de ônibus
- [ ] Cone, cavalete de madeira, barreira de aço, lixeira
- [ ] Faixa de pedestre e bueiro (no chão, por onde se passa)
- [ ] Rua da `demo-acoes` usando o kit; skill `build-location`

## 5. Fecho
- [ ] `docs/NEXT.md` atualizado, revisão aqui embaixo
