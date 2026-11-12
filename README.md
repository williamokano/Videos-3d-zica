# Videos 3D Zica

Motor para criar vídeos curtos em 3D a partir de texto. Plano completo em [docs/PLAN.md](docs/PLAN.md).

## Rodar

```sh
npm install
npm run dev      # estúdio em http://localhost:5173
npm test
npm run build
```

## Estúdio

- **Geral**: arraste para girar, roda do mouse aproxima, botão direito desloca. O seletor de nível esconde o que está acima (para ver o porão).
- **Andar**: clique no cenário para olhar com o mouse, WASD anda, Shift corre, setas viram. Sobe e desce escadas. Porta fechada bloqueia; a tecla E abre e fecha a mais próxima.
- **Câmera**: mostra o que a câmera do episódio vê, no formato final do vídeo.
- **Timeline**: espaço toca e pausa, `,` e `.` andam um frame, a barra leva a qualquer frame. Nas visões Geral e Andar, o trajeto da câmera aparece no cenário e a prévia fica no canto.
- **Copiar minha visão como keyframe**: gera o keyframe da visão atual, no tempo atual, para colar no arquivo do episódio.
- **Ações**: portas, carros e itens se movem conforme a trilha `actions` do episódio. Aparecem como barras azuis na timeline e em lista no painel; clicar leva ao instante da ação.
- **Personagens**: o elenco do episódio aparece no painel; clicar leva a câmera até a pessoa. Eles andam, correm, viram e mudam de expressão pelas ações do episódio.
- **Série e episódio**: escolha no painel ou pelo endereço, `?series=<id>&ep=<número>`. A série `demo-acoes` mostra todas as ações.
- **Estilo**: troca entre o visual suave e o cel shading para comparar. O que vale no vídeo é o `style` da bíblia.
- **Bíblia**: liga e desliga cada regra ativa para comparar o cenário com e sem ela.
- **Áreas**: leva a câmera até cada área do local.

## Vitrine de personagens

`http://localhost:5173/?vitrine=personagens&series=<id>` (ou o botão "Vitrine de personagens" no estúdio) mostra os personagens de uma série lado a lado, fora de qualquer episódio. `series=*` mostra os de todas as séries.

- Clique num personagem para selecionar; "Todos" aplica o menu a todos de uma vez. "Corpo", "Rosto" e "Palco" enquadram.
- **O que faz**: expressão e intensidade, pose em loop (parado, andar, correr, sentar, agachar, falar, cruzar os braços, gesticular, levantar o celular), comportamento de figurante (`behave`) e para onde olha.
- **Aparência** (corpo paramétrico): pele, cabelo, corte, roupa, altura, corpo e cabeça mudam na hora. "Variar" sorteia um visual de figurante e "Adicionar 6 figurantes" põe variações ao lado. A vitrine não grava: o JSON resultante aparece para copiar para o arquivo do personagem.
- **Tempo**: corre de verdade (respira, pisca, anda); dá para pausar e voltar ao início.
- **Bíblia**: liga cada regra para ver os personagens sob ela (o céu vermelho).

## Onde fica cada coisa

| Caminho | Conteúdo |
|---|---|
| `series/<série>/bible.json` | Bíblia: regras de mundo, idiomas, formato, áudio, estilo (`style`: `soft` ou `cel`) e cor da imagem (`grade`: `tint`, `amount`, `saturation`, `contrast`, `vignette`, `grain`; também dentro de `effects` de uma regra) |
| `series/<série>/world/*.json` | Locais (formato em `src/engine/world/types.ts`) |
| `series/<série>/characters/*.json` | Personagens (formato em `src/engine/character/types.ts`), com GLB opcional ao lado |
| `series/<série>/episodes/*.ts` ou `*.json` | Episódios: roteiro em código (os tempos saem sozinhos) ou dado com os tempos escritos à mão |
| `src/engine/assets` | Catálogo de assets paramétricos |
| `src/engine/world` | Construção do local: paredes, aberturas, níveis, escadas, colisão, mapa de caminhada |
| `src/engine/actions` | Catálogo de ações e compilação da trilha de ações |
| `src/engine/character` | Esqueleto padrão, corpo cartoon, rosto, movimentos, importação de GLB |
| `src/engine/timeline` | Trilha de câmera e tempo por frame |
| `src/studio` | Estúdio (`main.ts`) e vitrine (`showcase.ts`); `entry.ts` escolhe pelo endereço |
| `.claude/skills` | Skills que ensinam a LLM a usar o motor |
| `src/studio` | Página 3D |

## Convenções do mundo

- Metros; +x leste, +z sul, +y cima.
- Móveis usados por uma pessoa olham para -z; assets de parede têm as costas em z = 0 e olham para +z.
- Uma porta declarada numa parede também abre a parede da área vizinha na mesma linha e no mesmo nível.
- Objetos animáveis têm `id` e canais numéricos (uma porta tem `open` de 0 a 1). Ações do catálogo movem os canais; o estado em qualquer instante é função pura do tempo.
- Personagens olham para -z; `yaw` 0 é norte e 90 é oeste. Todos usam o mesmo esqueleto padrão em T-pose.
- Escadas são descritas de cima para baixo; o motor fura os pisos que elas atravessam.

## Renderizar para MP4

```sh
npm run render -- --series ceu-vermelho --ep 1
```

Navegadores Chrome sem janela desenham o episódio frame a frame, cada um um trecho, e o ffmpeg junta tudo em `out/<série>-ep<n>.mp4`. O vídeo sai mudo. Se o render falhar, nenhum arquivo é gravado; um vídeo em `out/` está sempre completo.

| Opção | O que faz |
|---|---|
| `--series`, `--ep` | qual episódio (padrão: o primeiro) |
| `--from`, `--to` | só um trecho, em segundos |
| `--scale 0.5` | metade do tamanho, para uma prévia rápida |
| `--step 15` | desenha um frame a cada 15: uma prévia em 2 quadros por segundo, para revisar o episódio inteiro em minutos |
| `--no-subs` | sem a legenda das falas |
| `--out arquivo.mp4` | onde gravar |
| `--workers 8` | quantos navegadores desenham ao mesmo tempo, cada um um trecho do episódio (padrão: metade dos núcleos da CPU, no máximo 8) |
| `--software` | desenha na CPU mesmo havendo placa de vídeo |
| `--crf 18` | qualidade do x264 (menor é melhor) |

Precisa do `ffmpeg` no PATH e de um Chrome: o Google Chrome instalado, ou o executável apontado por `CHROME_PATH`. A primeira linha da saída diz qual placa de vídeo está sendo usada; se aparecer "SwiftShader", o desenho está na CPU.

