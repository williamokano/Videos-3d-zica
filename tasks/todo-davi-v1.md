# Davi e Golias — produzir o visual dos dois episódios

Pedido do autor (2026-11-14): "pode começar produzir o necessário. Se precisar de audio, não faça, mas pode fazer o visual". Roteiros em `series/davi-e-golias/roteiros/00{1,2}-roteiro.md`, regras em `series/davi-e-golias/biblia.md`.

**Como retomar:** leia este arquivo, rode `git status` e `npm run typecheck && npm test`, e continue do primeiro item sem marcar. Cada item termina com teste, conferência em imagem, commit (sem coautoria) e o item marcado aqui no mesmo commit. **Sem áudio:** não rodar `npm run voz` nem gerar sons; as falas ficam com a duração estimada pelo texto e o render sai com `--no-audio`.

## 1. Motor: terreno com morros
- [x] `terrain` no local (morros e vales como dado: centro, raio, altura), chão com relevo, superfície de pé com altura em cada ponto
- [x] Props do local, elenco e caminhada sobem e descem o relevo sozinhos
- [x] Riacho como faixa de água no fundo do vale (asset `ancient.stream`, item 2)

## 2. Kit de época (assets `ancient.*`)
- [x] Tendas (simples e do rei), carroça, fogueira, sacos, jarros, cestos, estandarte, suporte de lanças, escudos no chão
- [x] Pedras, rochedos, oliveira, palmeira, arbustos secos, seixos do riacho
- [x] Interior da tenda do rei: tapete, almofadas, baú, mesa baixa com jarra
- [x] Cidade: casa de pedra e barro com terraço, portão de pedra, poço

## 3. Personagens de época
- [x] Roupas: túnica, manto, faixa na cabeça, sandálias, couraça de bronze, capacete de bronze, capacete filisteu de penacho, coroa, alforje de pastor
- [x] Coisas na mão: lança, escudo, espada com bainha, cajado, funda, pedra
- [x] Fichas: Davi, Golias (3 m), escudeiro, Eliabe, Abinadabe, Samá, Saul, Abner, Jônatas, guarda das bagagens, soldado, filisteu, mulher

## 4. Movimentos e ações novas
- [x] Ajoelhar, girar a funda e lançar (com a pedra voando), cair de frente, dançar com tamborim, vestir e tirar (trocar `wear` no meio do episódio)
- [x] Câmera: órbita, grua, câmera na mão (tremor), chão tremendo

## 5. Lugar e episódios
- [x] `world/vale-de-ela.json`: os dois montes, o vale, o riacho, o acampamento de Israel, a tenda do rei, o acampamento filisteu, a estrada e a cidade
- [x] `bible.json` da série (céu de manhã, cor, estilo)
- [x] `episodes/001.ts` conforme o roteiro
- [x] `episodes/002.ts` conforme o roteiro
- [x] Prévia sem som dos dois, varredura do vídeo inteiro e correções

## Revisão
- Feito em 2026-11-14. Prévias sem som em `out/davi-e-golias/ep001/` e `ep002/`. O episódio 1 tem cerca de 5 min e o 2 cerca de 2 min 15 s, com as durações estimadas pelo texto, porque não há voz gravada.
- Correções depois da primeira prévia do autor: menos tremor, câmera fora da tenda (empurra pela entrada) e descida vista do alto. As lições estão em `tasks/lessons.md`.
- Pendente: a introdução antes do Golias, a pedido do autor, com o roteiro a decidir. Áudio (vozes e sons) ainda não foi feito.
