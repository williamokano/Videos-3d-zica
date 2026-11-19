# Handoff: série nova do "relógio no braço" (2026-11-19)

Leia antes de tudo, nesta ordem: este arquivo, `tasks/continuar.md`, `tasks/lessons.md` e as skills em `.claude/skills/` (`write-episode`, `build-location`, `create-character`, `direct-actions`, `publicar`, `agendar`).

## O pedido do autor, como ele escreveu

> já postei agora a pouco. O que podemos continuar fazendo de histórias agora? Continuamos com Davi? Continuamos com histórias bíblicas? Fazemos alguma coisa diferente? Tem um que eu vi que o roteiro era tipo isso "nesta cidade, todo mundo..." e tem uma história a partir disso. Isso é o gancho. Por exemplo, podemos fazer um baseado no filme in time, do Timberlake. Nesta cidade, todo mundo tem um relógio mostrando quanto tempo ele aidna tem (o relógio é incluso no braço, tipo, o próprio braço é o mostrador). O seu relógio marca 1 ano, e ele não muda. Daí contamos a história. O relógio começa a contar a partir dos 25 anos, voce sente uma rpessão, e ele começa a cair. Nesta cidade, tempo é dinheiro. Você recebe em tempo, você paga em tempo, e quando o tempo chega em 0, você morre. Acho que só pra começar está bem. Não quero pegar a história do Will que já tem mais de 25 anos, quero mostrar um pouco antes de ele ter que se preocupar com guardar dinheiro e tal. Ademais, quero que a série se passe no Brasil, etnão formas de ganhar dinheiro, entregando delivery, fazendo uber, etc. Mas o mundo em si é bem pobre, com algumas poucas exceções. Não iremos adotar o sistema de meridianos, todo mundo mora junto (ricos, pobres, classe média), embora em áreas diferentes. Vamos usar São Paulo como exemplo talvez. O que voce acha que criar essa série, fazer a bíblica, então eu reseto o contexto e começamos a produzir o primeiro episódio?

> Pra ver em família, sim, mas pode seguir com esse tema, só os bíblicos vamos fazer mais leve. Guarde essas solicitações em um arquivo de handoff, irei resetar. Me de ok

## Decisões já tomadas

- **Série nova** sobre o relógio no braço. Começar a produzir o **episódio 1** na próxima sessão.
- **Canal:** historinhas.animadas.3d, "para ver em família". O tema (o tempo zera e a pessoa morre) **pode seguir**, com o suspense no episódio e nada de morte mostrada de forma gratuita. As **séries bíblicas** ficam **mais leves**.
- **Regras do mundo, do autor:**
  - todo mundo tem um relógio no próprio braço: o antebraço é o mostrador;
  - até os 25 anos o relógio marca **1 ano** e não muda;
  - aos 25 a pessoa sente uma pressão, e o relógio **começa a cair**;
  - tempo é dinheiro: recebe-se em tempo e paga-se em tempo;
  - quando chega a 0, a pessoa morre.
- **Protagonista:** alguém **antes dos 25**, antes de ter que se preocupar em guardar tempo. **Não** é a história de alguém com mais de 25.
- **Brasil, São Paulo** (provavelmente). Formas de ganhar tempo: entregar delivery, dirigir para aplicativo etc. O mundo é **pobre**, com poucas exceções.
- **Sem fusos ou "meridianos":** ricos, classe média e pobres moram na mesma cidade, em áreas diferentes.
- **Gancho dos episódios:** o formato "Nesta cidade, todo mundo..." (ou "Nesta cidade, quando você...").

## Cuidados (do que conversamos)

- **Original, não uma refilmagem de "O Preço do Amanhã" (In Time).** A premissa de "tempo como dinheiro" pode ser usada; personagens, nomes, enredo, cenas e visual têm de ser nossos. Nada do Will, da cena da mãe e do ônibus, de cenas reconhecíveis do filme nem do sistema de fusos.
- **Motor:** a rua, o ônibus, a viatura, a bicicleta, a bag de entrega, o celular e a escola já existem (séries `ceu-vermelho`, `demo-acoes` ep. 3 e o Selado). Falta o **mostrador no braço**: números que brilham na pele do antebraço, desenhados a cada quadro, como a tela do celular (`src/engine/ui/phone.ts`). Conferir no banco de três câmeras (lição em `tasks/lessons.md`).
- **Fluxo:** `write-episode` (guardar o pedido em `series/<id>/roteiros/001-pedido.md` antes de mexer) → bíblia da série → personagens (`create-character`, com teste de voz com o autor) → lugares (`build-location`) → `episodes/001.ts` (`direct-actions`) → `npm run revisar` → prévia muda no NAS → revisão do autor → `npm run voz` → render final → `publicar` → `agendar` com "pode".
- **Ainda em aberto, a perguntar no começo:** o nome da série; o nome, a idade e a situação do protagonista; a duração do ep. 1; se o ep. 1 abre com o gancho "Nesta cidade, todo mundo...".

## Davi

- Temporada 1 completa, eps. 1 a 5 publicados (ep. 5: https://youtube.com/shorts/t9SlkPqou5I; Instagram postado pelo autor).
- A temporada 2 fica para depois, abrindo com o resultado da votação do ep. 5 (FUGIR ou FICAR) e num tom **mais leve** (decisão do autor).
- **O token do YouTube no publicador vence por volta de 24/11/2026** (app OAuth em "Testing"). Ver `tasks/continuar.md`, seção do ep. 4, para renovar.
