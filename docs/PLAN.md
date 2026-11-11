# Plano do motor

Motor para criar vídeos curtos em 3D a partir de texto. A LLM descreve e dirige; o motor constrói e renderiza.

## Princípio

O vídeo é uma função determinística: **(mundo + roteiro + tempo t) → frame**. Tudo é dado versionado no git e o motor só interpreta. Isso dá timeline navegável, render reproduzível e direção por código.

## Stack

- TypeScript + Three.js no navegador, Vite.
- Render final: Chromium headless frame a frame + ffmpeg → MP4 (formato definido na bíblia; padrão 1080×1920, 30 fps).

## Camadas

1. **Bíblia da série** (`series/<série>/bible.json`): regras de mundo com validade por episódio (`from` / `until`), idioma original, idiomas de dublagem, formato e configuração de áudio.
2. **Mundo persistente** (`series/<série>/world/*.json`): local → áreas → objetos. Cresce por patches incrementais, como o mapa de um jogo. Se a série não tem nenhum local, a LLM pergunta onde é o primeiro cenário.
3. **Kit de assets** (`src/engine/assets`): geradores paramétricos registrados num catálogo para reuso; importação de GLB.
4. **Personagens**: esqueleto humanoide padrão, corpo paramétrico cartoon, rosto com blendshapes (piscar automático, expressões, visemas), biblioteca de movimentos com transições e IK nas mãos. Um personagem pode ser trocado por um GLB desde que o esqueleto seja mapeado para o padrão; sem blendshapes de rosto no GLB, ele perde expressões e lip-sync.
5. **Direção por código**: API de alto nível (`ana.walkTo(...)`, `ana.say(...)`, `camera.mode('fpv', ana)`) compilada numa timeline de trilhas e clipes.
6. **Câmera**: flag por plano — `fpv`, `third_person` ou `cinematic`.
7. **Estúdio**: viewport navegável, timeline com scrub, mapa visto de cima com personagens e câmera, preview do que a câmera vê.
8. **Skills** (`.claude/skills`): bíblia, construir local, criar asset, criar personagem, escrever episódio, renderizar — sempre consultando o catálogo antes de criar algo novo.

## Áudio e idiomas

- Provedor: ElevenLabs. Cada fala tem um id estável e um modo:
  - `tts`: áudio gerado a partir do texto.
  - `sts`: speech-to-speech sobre a narração gravada pelo autor, preservando a entonação.
- Lip-sync e legendas precisam de tempos por palavra. No `tts` eles vêm junto com a geração; no `sts` a gravação é transcrita/alinhada para obtê-los (por isso o transcript é baixado e guardado junto do áudio).
- Idioma original e idiomas de dublagem ficam na bíblia. Cada idioma tem seu próprio texto, áudio e alinhamento por fala.
- A duração das falas muda por idioma, então a timeline é compilada por idioma: mesma direção, tempos derivados do áudio daquele idioma.
- Os endpoints exatos da ElevenLabs serão confirmados na documentação na fase de fala.

## Fases

| Fase | Entrega | Estado |
|---|---|---|
| 1 | Formato do mundo, kit básico, bíblia com regras de ambiente, estúdio navegável, escola de exemplo | feito |
| 2 | Personagem: rig, locomoção no navmesh, rosto com piscar e expressões; importação de GLB | |
| 3 | API de direção, timeline no estúdio, câmeras FPV / terceira pessoa | |
| 4 | Fala: TTS e STS, alinhamento, lip-sync, dublagem, render para MP4 | |
| 5 | Skills e catálogo de reuso; episódio piloto de ponta a ponta | |
| 6 | Mais biblioteca: carros, prédios, casas, animações, pegar e segurar com IK | |
