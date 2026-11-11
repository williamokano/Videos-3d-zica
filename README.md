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
- **Andar**: clique no cenário para olhar com o mouse, WASD anda, Shift corre, setas viram. Sobe e desce escadas.
- **Câmera**: mostra o que a câmera do episódio vê, no formato final do vídeo.
- **Timeline**: espaço toca e pausa, `,` e `.` andam um frame, a barra leva a qualquer frame. Nas visões Geral e Andar, o trajeto da câmera aparece no cenário e a prévia fica no canto.
- **Copiar minha visão como keyframe**: gera o keyframe da visão atual, no tempo atual, para colar no arquivo do episódio.
- **Bíblia**: liga e desliga cada regra ativa para comparar o cenário com e sem ela.
- **Áreas**: leva a câmera até cada área do local.

## Onde fica cada coisa

| Caminho | Conteúdo |
|---|---|
| `series/<série>/bible.json` | Bíblia: regras de mundo, idiomas, formato, áudio |
| `series/<série>/world/*.json` | Locais (formato em `src/engine/world/types.ts`) |
| `series/<série>/episodes/*.json` | Episódios: local, duração e trilha de câmera |
| `src/engine/assets` | Catálogo de assets paramétricos |
| `src/engine/world` | Construção do local: paredes, aberturas, níveis, escadas, colisão |
| `src/engine/timeline` | Trilha de câmera e tempo por frame |
| `.claude/skills` | Skills que ensinam a LLM a usar o motor |
| `src/studio` | Página 3D |

## Convenções do mundo

- Metros; +x leste, +z sul, +y cima.
- Móveis usados por uma pessoa olham para -z; assets de parede têm as costas em z = 0 e olham para +z.
- Uma porta declarada numa parede também abre a parede da área vizinha na mesma linha e no mesmo nível.
- Escadas são descritas de cima para baixo; o motor fura os pisos que elas atravessam.
