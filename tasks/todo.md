# Kit de rua, polícia e veículos

Pedido do autor em 2026-11-13: "pode começar, vai comitando e dando push e se travar faz um mecanismo pra resetar sozinho".

**Como retomar (para mim, se a sessão travar):** leia este arquivo, rode `git status` e `npm run typecheck && npm test`, e continue do primeiro item sem marcar. Cada item termina com teste, conferência na vitrine (`npm run look` não serve para vitrine; use a página `?vitrine=assets` ou um episódio de `demo-acoes`), commit e push, sem coautoria. Marque o item aqui no mesmo commit.

## 1. Roupas e acessórios no personagem
- [x] `wear` na ficha: peças presas ao corpo (boné, quepe, colete, mochila, bag de entrega, cinto com coldre e rádio, distintivo)
- [x] Fichas de exemplo em `demo-acoes`: policial e entregador; vitrine de personagens mostrando
- [x] Testes e skill `create-character`

## 2. Base de veículos
- [x] Extrair do carro uma base comum (rodas, portas por canal, assentos, faróis)
- [x] Viatura: pintura, giroflex que pisca com o tempo do episódio, rádio no painel
- [x] Ônibus com porta na frente e atrás (canais), assentos
- [x] Bicicleta (e a pessoa sentada nela)
- [x] Testes, vitrine de assets, skill `direct-actions`

## 3. Rádio
- [x] `item.radio`: rádio PX de mão, pegável
- [x] Voz por rádio: `say(..., { filter: 'radio' })` e `d.narrate`, aplicado na mixagem e no estúdio
- [x] Testes e skill

## 4. Kit de rua
- [x] Poste de luz (com luz), semáforo, placa, ponto de ônibus
- [x] Cone, cavalete de madeira, barreira de aço, lixeira
- [x] Faixa de pedestre e bueiro (no chão, por onde se passa)
- [x] Rua da `demo-acoes` usando o kit; skill `build-location`

## 5. Fecho
- [x] `docs/NEXT.md` atualizado, revisão aqui embaixo

## Revisão

- Cinco commits, todos enviados: roupas, veículos, rádio e filtros de voz, kit de rua com o episódio de demonstração, e este fecho.
- `npm run typecheck` limpo; `npm test` com 179 testes (165 antes).
- Conferido em imagem: os três personagens vestidos de frente e de costas; viatura, ônibus (portas abertas) e bicicleta na vitrine; o kit de rua na vitrine; o episódio 3 de `demo-acoes` renderizado e varrido.
- Conferido por teste e não por imagem: giroflex piscando, poste falhando, semáforo trocando.
- Não conferido: o som do filtro de rádio ouvido (só que o ffmpeg aceita a cadeia), o filtro no estúdio, e nada disso dentro de `ceu-vermelho` ainda.
