---
name: publicar
description: Preparar o pacote de lançamento de um episódio já renderizado — capa marcante (um plano feito para a capa, não um quadro do vídeo), arte de horário e arte de "já saiu" para story, legenda do Instagram/TikTok com hashtags, título e descrição do YouTube com capítulos, comentário fixado, textos dos stories e checklist. Use quando o autor pedir para lançar, publicar, postar ou preparar a capa/legenda de um episódio.
---

# Publicar um episódio

Você prepara tudo o que o autor precisa para postar um episódio pronto. Postar ou agendar de verdade é da skill `agendar`, e só depois de um "pode" explícito.

## 0. Ler antes

- **Canal:** `canal/identidade.md` (tom, bio, hashtags do canal, estilo do comentário fixado, grade do perfil) e `canal/marca.json` (cores, fontes, logo, selo de cada série). O canal é **historinhas.animadas.3d** e tem várias séries: a identidade do canal vale para todas, e o selo da série entra só nas artes daquela série.
- **Série:** `series/<s>/biblia.md` (regras, duração máxima, tom; a da série manda sobre a do canal), `bible.json`, `roteiros/<nnn>-roteiro.md` e o `roteiros/<nnn>-marcado.md` (tempos reais de cada cena e fala, para os capítulos).
- **Vídeo:** `out/<s>/ep<nnn>/<s>-ep<nnn>.mp4` (o render final, com voz e sons). Confira com `ffprobe` a duração, 1080×1920 e a faixa de áudio. Acima do limite da bíblia (DAVI: 3:00, por causa do Instagram), **pare e avise**: não dá para postar.
- Data, horário e plataformas: se não estiverem na conversa nem em `series/<s>/publicacao.md`, faça **uma** pergunta curta. Nunca invente data, hora, título ou número.

## 1. A capa (o item mais importante)

A capa **não é um quadro do vídeo**. É um plano feito para ela, no momento mais forte do episódio, e precisa parar o dedo na grade do perfil.

1. **Escolha o momento** pelo `-marcado.md`: a virada, o rosto mais carregado de emoção, o contraste de escala (o Golias de baixo para cima, o Davi pequeno), a luz mais bonita. Prefira um instante sem fala, porque o `look` desenha a legenda no quadro. Se não houver, escolha um instante entre duas falas.
2. **Faça o plano** com câmera livre, em tamanho cheio:
   ```
   npm run look -- --series <s> --ep <n> --t <s> --scale 1 --view x,y,z:lx,ly,lz:fov --out <pasta>
   ```
   - Teste 3 ou 4 câmeras de uma vez (`--view` repetido) e monte uma folha de contato para escolher.
   - Ângulos que funcionam:
     - de baixo para cima, para heróis e gigantes;
     - rosto de 3/4 com o olhar para fora do quadro;
     - silhueta contra a luz;
     - os dois personagens em escalas diferentes.
   - Confira para que lado o personagem está virado: o rosto tem que aparecer.
   - Nada de câmera dentro de parede, pano ou gente (as lições de câmera de `tasks/lessons.md` valem aqui).
   - O assunto fica no terço de cima ou no meio, porque o título vai embaixo.
3. **Componha** com `scripts/capa.py`. Ele cuida de cor, vinheta, degradê, título, selo e marca do canal, e respeita as zonas:
   ```
   python3 scripts/capa.py capa --fundo <plano.png> --titulo "O ESCOLHIDO" --tag "EPISÓDIO 1" --serie <s> --zonas -o series/<s>/publicacao/ep<nnn>/capa_ep<nnn>.png
   ```
   - Título com **até ~14 letras**: o nome do episódio, em caixa alta. A pergunta-gancho vai em `--sub`, com até 28 caracteres, se ajudar.
   - Abra o `-zonas.png` e confira:
     - nenhum texto no vermelho (14% de cima, 20% de baixo, 12% da direita);
     - o título dentro do quadrado azul, o recorte 1:1 do perfil.
   - Abra a capa em tamanho de celular (540×960) e julgue de verdade: o rosto lê? O título lê? Para o dedo?
   - Se ficar fraca, refaça o plano. Não aceite a primeira.
4. **Imagem gerada por IA**, a partir do render como quadro-chave: só se o autor pedir. Custa créditos e precisa manter os personagens fiéis às folhas de `referencias/folhas/`.

## 2. Artes de story

Use o mesmo plano da capa, ou outro plano forte do episódio:

- **Arte de horário (antes da estreia):**
  ```
  python3 scripts/capa.py horario ... --quando "SÁBADO · 19H"
  ```
- **Arte "já saiu":**
  ```
  python3 scripts/capa.py story ... --quando "JÁ SAIU · NOVO EPISÓDIO"
  ```

Grave as duas em `series/<s>/publicacao/ep<nnn>/` (`arte_horario_ep<nnn>.png` e `arte_story_ep<nnn>.png`).

## 3. Textos (`series/<s>/publicacao/ep<nnn>/textos.md`)

Escreva no tom do canal (`canal/identidade.md`) e da série. É uma história bíblica: respeitosa, sem sermão e sem deboche.

- **Legenda do Instagram e do TikTok:**
  - a primeira linha é o gancho (aparece antes do "mais");
  - um resumo curto, sem entregar a virada;
  - a pergunta do cartão final do episódio, com as mesmas palavras ("Comenta FELIZ ou INVEJA 👇");
  - "siga para o próximo", só se o autor tiver definido;
  - as hashtags do canal mais as da série, de 5 a 8 no total.
- **YouTube Shorts:**
  - título com até 70 caracteres (conte);
  - descrição com o resumo nas primeiras linhas;
  - os **capítulos** `0:00 ...`, com os tempos reais do `-marcado.md`;
  - as hashtags.
- **Comentário fixado:**
  - 2 opções, cada uma com uma **resposta-semente** (uma resposta curta do próprio canal, para abrir o fio);
  - até ~220 caracteres e de 1 a 3 linhas;
  - entrega algo que a legenda não dá: o versículo de onde a cena vem (ex.: 1 Samuel 16:7), um detalhe histórico ou uma curiosidade da produção;
  - termina com uma pergunta fácil;
  - sem spoiler da virada nem do gancho final;
  - nada inventado (fato, número ou link que o autor não deu).
- **Texto de cada story:**
  - uma linha, **até 60 caracteres** (conte);
  - uma pergunta ou dúvida que dá curiosidade sem entregar nada;
  - o de antes da estreia é diferente do de depois;
  - não repete o que a arte já diz.
- **Checklist:**
  - vídeo 1080×1920 com áudio e duração dentro do limite;
  - capa e artes prontas, com as zonas conferidas;
  - legenda revisada e hashtags;
  - comentário fixado escolhido, com o lembrete de fixá-lo logo depois de postar;
  - horário definido;
  - cartão final e pergunta presentes no vídeo;
  - créditos das músicas, se alguma for CC-BY (`series/<s>/audio/sons/CREDITOS.md`; CC0 não exige crédito).

## 4. Entrega

- Grave tudo em `series/<s>/publicacao/ep<nnn>/`.
- **Cole na resposta** os textos prontos para copiar, cada um num bloco de código, com a contagem de caracteres onde há limite.
- Dê o caminho completo da capa, das artes e do vídeo, com `! xdg-open <caminho>` para abrir.
- Diga em uma frase qual plano virou capa e por quê.
- Feche oferecendo ajustes e a skill `agendar`.

## Regras

- Não publique, agende, comente nem fixe nada. Isso é da `agendar`, com confirmação.
- Fiel à Bíblia também nos textos: nada que o episódio e o texto bíblico não digam.
- Toda arte passa pelas zonas (`--zonas`) e por um olhar em tamanho de celular antes de ser entregue.
- Uma arte por série segue a identidade do canal: as capas de séries diferentes precisam conviver na mesma grade.
