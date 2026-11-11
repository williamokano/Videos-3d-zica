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

- **Visão geral**: arraste para girar, roda do mouse aproxima, botão direito desloca.
- **Andar (FPV)**: clique no cenário para olhar com o mouse, WASD anda, Shift corre, setas viram.
- **Bíblia**: liga e desliga cada regra ativa para comparar o cenário com e sem ela.
- **Áreas**: leva a câmera até cada área do local.

## Onde fica cada coisa

| Caminho | Conteúdo |
|---|---|
| `series/<série>/bible.json` | Bíblia: regras de mundo, idiomas, formato, áudio |
| `series/<série>/world/*.json` | Locais (formato em `src/engine/world/types.ts`) |
| `src/engine/assets` | Catálogo de assets paramétricos |
| `src/engine/world` | Construção do local, paredes, aberturas, colisão |
| `src/studio` | Página 3D |

## Convenções do mundo

- Metros; +x leste, +z sul, +y cima.
- Móveis usados por uma pessoa olham para -z; assets de parede têm as costas em z = 0 e olham para +z.
- Uma porta declarada numa parede também abre a parede da área vizinha na mesma linha.
