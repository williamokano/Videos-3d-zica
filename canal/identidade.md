# Identidade do canal — historinhas.animadas.3d

O canal é a casa de todas as séries animadas feitas com a nossa engine 3D. **DAVI** é a primeira, não a única: a marca fala de *contar histórias*, e cada série entra embaixo dela com um selo próprio. Os valores de máquina (cores, fontes, caminhos) estão em [`marca.json`](marca.json); a arte é refeita por [`estudio/arte.py`](estudio/arte.py) a partir das fotos que [`estudio/posar.mjs`](estudio/posar.mjs) tira dos personagens na engine.

## Nome e posicionamento

- **Perfil:** @historinhas.animadas.3d
- **Nome de exibição:** historinhas animadas 3D
- **Em uma linha:** grandes histórias, em episódios curtos de animação 3D, para ver em família.
- **Assinatura (tagline):** *Grandes histórias, pequenas telas.*
- **Conceito visual:** **a hora da história.** Noite azul, uma lua de lanterna e um livro aberto de onde os personagens saem. Tudo desenhado em *cel*, como a engine renderiza: cor chapada, uma faixa de sombra, contorno de tinta e uma espessura 3D que desce para a direita.
- **Para quem:** crianças e famílias (assistir junto) e adultos que gostam de uma boa história. O tom é caloroso, nunca infantilizado.

## Bio do Instagram

```
Histórias animadas em 3D para ver em família 📖
Grandes histórias em episódios curtos
Agora: DAVI, coragem e destino
Toda semana uma nova 👇
```

- **138 caracteres** contados com as quebras de linha (140 se o Instagram contar cada emoji como 2). O limite é 150.
- Plano das linhas: 1) o que é o canal, 2) a promessa (curto e bom), 3) **a linha que muda**: a série do momento, 4) a chamada, apontando para o link.
- No máximo dois emojis. Quando a série mudar, troque só a linha 3 (ex.: `Agora: CÉU VERMELHO, um mistério na escola`) e confira de novo a contagem.

## Descrição longa (YouTube, TikTok, "sobre")

> **historinhas animadas 3D** conta grandes histórias em episódios curtos de animação, feitos para caber no celular e para ver em família.
>
> Cada série é uma história completa, contada em capítulos de até três minutos, com personagens que você vai reconhecer de um episódio para o outro. Começamos com **DAVI — Uma história de coragem e destino**, a jornada do jovem pastor de Belém até o vale de Elá, fiel ao texto de 1 Samuel. Depois vêm outras: histórias da Bíblia, aventuras e mistérios.
>
> Tudo é feito por nós, numa engine 3D própria: roteiro, cenários, personagens, câmera e som.
>
> Episódio novo toda semana. Siga e conte nos comentários qual história você quer ver depois.

## Tom de voz

- **Quem fala:** um contador de histórias à beira da fogueira. Caloroso, curioso, com um sorriso no canto da boca; nunca locutor de comercial.
- **Pessoa:** "você" e "a gente". Frases curtas. Português do Brasil do dia a dia, sem gíria que envelhece.
- **Legendas:** começam no momento da história (uma pergunta ou uma imagem), não em "Novo episódio!". Ex.: *"Sete irmãos passaram diante do profeta. Nenhum era o escolhido. Quem faltava?"*
- **Bíblia e fé:** com respeito e sem sermão. Citamos o versículo quando ele é o centro da cena (1 Samuel 17:45, por exemplo) e deixamos a história falar. Nunca ironizamos o texto.
- **Comentários:** responder chamando pelo nome, com uma frase e, quando cabe, uma pergunta de volta. Discussão religiosa ou política: agradecer e não entrar no debate. Sem emoji em excesso (no máximo um por resposta).
- **Crianças no público:** nada de medo gratuito na arte ou nas chamadas, mesmo quando a série for de suspense. O suspense mora no episódio, não na capa.

## Paleta

| Cor | Hex | Papel |
|---|---|---|
| Noite | `#161B3D` | Fundo de toda arte do canal (degradê até `#2A3373` no centro) |
| Creme | `#FFF4E0` | Títulos e texto; a página do livro (sombra `#F2D9B1`) |
| Lanterna | `#FFB627` | Destaque: a lua, números, estrelas, a palavra que importa (sombra `#E8901A`) |
| Coral | `#FF5E5B` | O selo **3D** e as chamadas (siga, novo); a capa do livro (sombra `#D93F4C`) |
| Tinta | `#0D1028` | Contorno e espessura 3D de tudo, como o traço cel da engine |

Regras: o fundo é sempre Noite; creme e lanterna são para ler; coral é raro (um elemento por peça). As cores de cada série ficam **dentro** do selo da série e da capa, nunca no perfil nem nos destaques do canal.

## Fontes

| Uso | Fonte | Arquivo | Licença |
|---|---|---|---|
| Marca e títulos do canal | **Fredoka** Bold / SemiBold | `fontes/Fredoka-Bold.ttf`, `fontes/Fredoka-SemiBold.ttf` | SIL OFL 1.1 (`fontes/OFL-Fredoka.txt`) |
| Texto, legenda na arte, chamadas | **Nunito** ExtraBold / Medium | `fontes/Nunito-ExtraBold.ttf`, `fontes/Nunito-Medium.ttf` | SIL OFL 1.1 (`fontes/OFL-Nunito.txt`) |
| Título da série DAVI | **Cinzel** ExtraBold / SemiBold | `fontes/Cinzel-ExtraBold.ttf`, `fontes/Cinzel-SemiBold.ttf` | SIL OFL 1.1 (`fontes/OFL-Cinzel.txt`) |

As três vêm do repositório google/fonts (github.com/google/fonts, pastas `ofl/fredoka`, `ofl/nunito`, `ofl/cinzel`), baixadas em 14/11/2026 como fontes variáveis e fixadas nos pesos acima com `fonttools varLib.instancer`. A OFL permite usar, modificar e embutir; não permite vender a fonte sozinha. Mantenha os `OFL-*.txt` junto dos `.ttf`.

## Marca (logo) e perfil

- **`logo.png`** (PNG transparente): *historinhas* em creme sobre *animadas* em lanterna, com o selo **3D** coral inclinado. Contorno e espessura em Tinta.
  - Sempre sobre fundo escuro (Noite ou uma cena escura). Sobre foto clara, ponha atrás uma faixa Noite com 85% de opacidade.
  - Não recolorir, não esticar, não girar, não tirar o contorno. Largura mínima: 360 px num 1080.
  - Respiro em volta: pelo menos a altura do selo 3D.
- **`perfil.png`** (1080×1080): o monograma **h** saindo de um livro aberto, na frente da lua de lanterna, com o selo **3D**. Lê-se a 110 px (veja `perfil-preview.png`: círculo de 110 e 320 px, e no modo escuro). Tudo o que importa está dentro do círculo central.
- **Monograma "h + 3D":** é a marca curta, para marca d'água no canto do vídeo (canto de cima à direita, 90 px, 70% de opacidade) e para o destaque "Sobre".

## Séries embaixo do canal

- **O canal é a moldura, a série é o quadro.** O perfil, os destaques do canal e o banner usam só a paleta do canal. Cada série tem um **selo** (plaqueta com o nome dela) na fonte e nas cores dela, mas com o mesmo contorno de tinta e a mesma espessura do canal, para parecer da mesma família.
- **Selo DAVI (`selo-serie-davi.png`):** plaqueta de terra `#3B1F14` com fio dourado, **DAVI** em Cinzel ExtraBold dourado `#E0A84E` e "CORAGEM E DESTINO" em Cinzel SemiBold creme. Vai nas capas da série, no canto de cima à esquerda, logo abaixo da zona de 14%.
- **Na tela de abertura do episódio** continua a abertura da série ("DAVI — Uma história de coragem e destino", da bíblia); o canal aparece só como o monograma no canto e no cartão final ("siga @historinhas.animadas.3d").
- **Série nova:** escolha uma fonte de título com a cara dela e uma cor de destaque (e um fundo do selo), registre em `marca.json` → `series.<id>`, e faça o selo com a mesma função de `estudio/arte.py`. Ex.: *ceu-vermelho* poderia ter um selo vermelho-alerta com uma fonte condensada.

## Grade do feed (capas)

O feed mistura séries, então a coerência vem da **moldura**, não da cena:

1. **Capa = um plano feito para a capa**, com o personagem grande, rosto no terço de cima e fundo escuro ou de pôr do sol.
2. **Título em cima, faixa fixa:** número e título do episódio em **Fredoka Bold creme com contorno de tinta**, centrado, entre 18% e 34% da altura. Na grade do perfil (3:4) o Instagram corta as pontas de cima e de baixo do 9:16; o título e o rosto ficam no miolo de 3:4.
3. **Selo da série** em cima à esquerda; **número do episódio** em lanterna (ex.: `EP 2`), sempre no mesmo lugar.
4. **Moldura:** um filete Noite de 24 px nas bordas da capa (some no reels, mas na grade amarra as séries).
5. Evitar duas capas vizinhas com a mesma cor dominante; alternar cena clara e escura quando der.
6. A cada 6–9 posts, um **post do canal** (bastidores, enquete "qual a próxima história?") na paleta pura, para a grade respirar.

Zonas: nada de texto nos 14% de cima nem nos 20% de baixo do 9:16, e 6% de margem nas laterais.

## Destaques (`destaques/`)

Ícones 1080×1920 com o desenho no círculo central (é o que o Instagram mostra). Nomes sugeridos para o destaque, curtos:

| Arquivo | Nome no Instagram | Conteúdo |
|---|---|---|
| `1-episodios.png` | Episódios | todos os episódios, em ordem |
| `2-bastidores.png` | Bastidores | engine, making of, antes e depois |
| `3-personagens.png` | Personagens | as folhas de personagem, de todas as séries |
| `4-davi.png` | DAVI | só a série DAVI (um destaque por série) |
| `5-proximas-historias.png` | Próximas | enquetes e anúncios do que vem |
| `6-sobre.png` | Sobre | a apresentação (`banner-apresentacao.png`) e como acompanhar |

Ordem no perfil: Sobre, Episódios, a série do momento, Personagens, Bastidores, Próximas.

## Post de apresentação

`banner-apresentacao.png` (1080×1920): a marca, a promessa e personagens de duas séries (DAVI e *ceu-vermelho*) em pé no mesmo livro aberto, com o selo DAVI como "agora em cartaz". Serve de primeiro story fixado e, recortado em 4:5, de primeiro post.

## Hashtags

- **Canal (sempre, as mesmas 5):** `#historinhasanimadas #animação3d #históriaanimada #historinhas #desenhoanimado`
- **DAVI (acrescentar):** `#Davi #DaviEGolias #HistóriasBíblicas #AnimaçãoBíblica #1Samuel`
- No máximo 10 por post (as 5 do canal + até 5 da série). Na legenda, no fim, depois de uma linha em branco.

## Comentário fixado (padrão)

Uma pergunta que puxa resposta, uma linha de contexto e a chamada; até 3 linhas, um emoji no máximo:

```
Se você estivesse no lugar do Davi, teria ido até o vale? 👇
Parte 3, "Quarenta dias", chega na próxima semana.
Siga @historinhas.animadas.3d para não perder.
```

Para o canal (posts que não são de série): *"Qual história você quer ver animada depois? Conta aqui que a gente lê todas."*

## Frequência de postagem (sugestão)

*Sugestão para validar com os números das primeiras semanas:*

- **Episódio:** 1 por semana, sempre no mesmo dia e hora (ex.: sábado às 10:00, horário de Brasília, quando as famílias estão juntas). Se a produção permitir, 2 por semana (quarta 19:00 e sábado 10:00).
- **Stories:** no dia do episódio (contagem, "já saiu", enquete) e 1 de bastidores no meio da semana.
- **Post do canal:** 1 a cada 2–3 semanas (enquete da próxima história, folha de personagem, bastidores).
- **Entre temporadas:** não sumir; manter 1 post por semana de bastidores ou trechos.
