# Todo asset com as ações que fazem sentido, e janelas de verdade

Meta do autor (2026-11-13): "terminar todos os assets com ações que façam sentido". Depois: "as janelas são só buracos, faça janelas de verdade, vários estilos (persianas, de correr...), pegue alguma comum pra escola. Quando o limite chegar você reseta sozinho".

**Como retomar (para mim, se a sessão travar):** leia este arquivo, rode `git status` e `npm run typecheck && npm test`, e continue do primeiro item sem marcar. Cada item termina com teste, conferência em imagem (`npm run vitrine`, `npm run look`), commit e push, sem coautoria. Marque o item aqui no mesmo commit.

## 1. Ações genéricas que faltam
- [x] `open` / `close` valem para qualquer objeto com canal `open` ou `<parte>.open` (portão, gaveta, armário)
- [x] `switch`: liga e desliga o que tem canal de ligar (luminárias, poste, ventilador, giroflex, faróis)
- [x] `signal`: semáforo por nome (vermelho, amarelo, verde, apagado)
- [x] `knockOver` / `standUpright`: derrubar e levantar um objeto (cone, cavalete, lixeira, carteira)
- [x] Assento com direção própria (quem senta olha para onde o assento manda)

## 2. Assets que ficam sem ação hoje
- [x] Luminárias (`light.ceilingLamp`, `light.tubeLamp`) e ventilador: canal `on`
- [x] Carro, viatura e ônibus: faróis (`lights`); rodas da frente viram (`steer`) ao dirigir
- [x] Mesas de concreto, carteira e mesa do professor: lugares para sentar; gavetas da mesa do professor abrem
- [x] Armários do corredor: portas abrem, uma a uma
- [x] Estante, caixotes, mesa, lixeira: lugares para pôr coisas (`putDown` com `on`)
- [x] Portão: abrir e fechar pelo catálogo, e bloquear a passagem fechado

## 3. Pessoa no veículo
- [x] Motorista com as mãos no volante
- [x] Bicicleta: pose de pedalar com as pernas girando conforme anda e mãos no guidão

## 4. Janelas de verdade
- [ ] Janela como parte da abertura (`frame` no opening): de correr, basculante, veneziana/persiana, de abrir, fixa
- [ ] Canal `open` na janela, para o episódio abrir e fechar
- [ ] Escola com a janela comum de escola pública (basculante de ferro com vidro) e a cantina com de correr

## 5. Fecho
- [ ] Tabela "asset → ações" na skill, gerada do catálogo, e um teste que falha se um asset com canais não tiver ação que os mova
- [ ] `docs/NEXT.md`, revisão aqui embaixo
