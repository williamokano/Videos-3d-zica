---
name: write-episode
description: Escrever ou revisar o roteiro de um episódio de série curta vertical (falas, ações, ganchos, fim em suspense, cartão final e chamada para comentar), a partir da ideia do autor, dos comentários do público e da bíblia da série. Use quando o autor pedir um episódio novo, quiser ajuda com a história, mandar um texto de roteiro para melhorar, ou pedir para continuar a série pelo que os comentários disseram.
---

# Escrever um episódio

O autor dirige; você é o roteirista que ajuda. O roteiro sai em texto para ele ler e mudar, e depois vira código com a skill `direct-actions`.

## 0. Antes de escrever

1. Leia, na pasta da série:
   - `biblia.md`: premissa, regras do mundo, personagens (como cada um fala, o que quer, o que nunca faz), pontas soltas e o cânone (fatos que não podem ser contraditos).
   - `roteiros/`: os episódios anteriores (o `-roteiro.md` de cada um e o texto original do autor).
   - `publico.md`, se existir: comentários, teorias, opção vencedora do cartão final.
2. Guarde o pedido do autor como ele escreveu em `roteiros/<nnn>-pedido.md` antes de mexer (lição do projeto: o texto original vale tanto quanto a implementação).
3. Se faltar algo que muda a história (quem é o vilão, se alguém morre, a resposta de um mistério), pergunte. O resto, decida e marque como sugestão.

A duração do episódio não é regra desta skill: o autor decide ao criar cada episódio. O que vale sempre é **nunca deixar um trecho parado** (veja "Ritmo").

## 1. Estrutura

| Parte | O que precisa ter |
|---|---|
| **Gancho (0–3 s)** | Já no primeiro quadro algo está errado: uma imagem estranha, uma fala em perigo, uma pergunta. Nada de título ou recapitulação antes. |
| **Situação (até ~12 s)** | Quem é, onde está, o que pode perder. Quem chega agora entende sem ter visto o episódio anterior. A recapitulação, se houver, vem depois do gancho, em uma frase. |
| **Escalada** | Cada cena piora a anterior: o relógio encurta, mais gente é afetada, uma saída fecha. Uma variável por vez. |
| **Pico** | A cerca de 75–90% do episódio, não no último segundo. |
| **Fim em suspense** | Corta na pergunta, nunca na resposta, um instante antes do que parece seguro. |
| **Cartão final + narrador** | A pergunta para o público (ver seção 5). |

### Ganchos e laços abertos

- **Um gancho a cada 10–20 s**: informação nova, virada, alguém chega, o celular vibra, um som, uma mudança de lugar. Marque cada um no roteiro com **[GANCHO]** e o tempo aproximado.
- **Laços em cascata**: abra a pergunta B antes de fechar a A. Nunca fique sem nenhum laço aberto.
- **Ironia dramática**: o público sabe de algo que o personagem não sabe (uma mensagem que não parece do pai, uma regra da bíblia que ele está quebrando). Funciona melhor que surpresa para prender e gera comentário.
- **Plano que quase dá certo**: o plano parece funcionar e algo falha. Dá uma batida de tensão sem precisar de ação grande.

## 2. Diálogo

- Toda fala avança o conflito ou mostra quem o personagem é. Se não faz nenhum dos dois, corte.
- Falas curtas, uma ideia cada. Interrupções e frases cortadas no lugar de discurso.
- Subtexto: o personagem age, nega ou desvia; quase nunca diz o que sente.
- **Teste da voz**: cubra o nome; dá para saber quem falou? Use o "como fala" da bíblia (gíria do protagonista, o formal do professor, o "olha..." da amiga).
- **Tom** entre parênteses vira a entonação da voz e não aparece na legenda: `(sussurro)`, `(nervoso)`, `(grito)`, `(transe)`, `(bravo)`, `(preocupada)`, `(firme)`, `(decidido)`, `(cansado)`, `(assustado)`, `(irônico)`. Qualquer outro tom em inglês também serve (`laughs`, `sighs`). Lista em `TONES` (`src/engine/audio/voice.ts`).
- Mensagem de celular e texto na tela também são fala: use para revelar o que ninguém diria em voz alta.
- Palavrão e gíria são do autor: use quando ele usar, sem suavizar e sem exagerar.

## 3. Ritmo: nada parado

- Nenhum trecho de mais de ~3 s sem fala, som ou ação que prenda. Caminhada longa ganha conversa, um som, alguém passando, algo visto pela janela.
- Depois de exportar (`npm run roteiro`), olhe as marcas ⏸ de pausa sem fala. Cada uma precisa de um motivo: leitura do celular, tensão, uma ação que se vê. Se não tem, preencha.
- Som ambiente por cena (burburinho, passos, zumbido) e um som em cada acontecimento (celular vibrando, porta fechando) evitam o silêncio morto.
- Cortar tempo (corte seco, `d.cutOut`) só quando o autor pedir.

## 4. Furos

Antes de entregar, confira e liste o que mudou e por quê:

- Alguma regra da bíblia foi quebrada? (Ex.: o protagonista olha o céu numa série em que quem olha entra em transe.)
- Por que os personagens não fazem o óbvio (ligar, fugir, chamar alguém)? Dê um motivo dentro da história.
- O que acontece com quem ficou para trás?
- Mensagens, horários e lugares batem com os episódios anteriores?
- O fim é possível pela bíblia?

Sugestões suas que mudam o cânone (um mistério novo, uma pista) ficam marcadas como **Sugestão** para o autor aceitar ou tirar.

## 5. Fim, cartão final e comentários

- **Tipos de suspense** — varie de um episódio para o outro:
  - **decisão**: o personagem vai escolher e o público decide;
  - **revelação**: um fato muda o sentido de tudo;
  - **perigo**: corte no meio da ação;
  - **pergunta**: abre uma dúvida nova;
  - **reversão**: um aliado vira ameaça.
- **Cartão final** (`d.endCard`): título de até ~8 palavras, sobre a ação do personagem ("Você ficava ou ia atrás do seu pai?"), nunca "o que achou?".
  - De 2 a 4 opções, igualmente tentadoras e com custo, escritas em 1 a 3 palavras, com ícone e cor.
  - As mesmas palavras na tela, na fala do narrador e na legenda do post.
- **Chamada**: peça a resposta em uma palavra ("Comenta FICO ou VOU 👇") e algo para mandar a alguém ("marca o amigo que ia te ajudar a fugir"). O envio pesa para alcançar quem não segue a série.
- **Narrador** (`d.narrate`): lê a pergunta e a chamada por cima do cartão.
- **Próximo episódio**: abre com a escolha do público tendo consequência visível nos primeiros segundos ("A maioria de vocês disse…", sem porcentagem). Registre a opção vencedora em `publico.md`.

## 6. Entrega

1. `roteiros/<nnn>-roteiro.md` com:
   - cenas numeradas, com tempo aproximado;
   - falas no formato `**NOME** (tom): fala`;
   - ações em *itálico* e mensagens de celular em citação;
   - **[GANCHO]** marcados;
   - o cartão final;
   - no fim, "O que mudou e por quê" (furos corrigidos, sugestões).
2. Atualize `biblia.md`: regras novas, pontas soltas e uma linha no cânone.
3. Implemente com a skill `direct-actions` em `episodes/<n>.ts`, com os números das cenas nos comentários, e:
   - `npm run voz -- --series <s> --ep <n> --dry` para listar as falas e o custo; sem `--dry`, gera o que falta;
   - `npm run roteiro -- --series <s> --ep <n>` exporta `roteiros/<nnn>-marcado.md` com cada fala, ação, mensagem e pausa no seu tempo. É esse arquivo que o autor lê para pedir ajustes;
   - `npm run look` para ver os quadros antes de renderizar, e `npm run render` no fim.
