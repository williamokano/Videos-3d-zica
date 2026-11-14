# Lições

- **Não presumir o cronograma de produção do autor.** Sugeri começar a produzir episódios antes do motor estar pronto; o objetivo dele é o contrário: motor pronto primeiro, episódios depois. Antes de recomendar uma ordem de trabalho, conferir o objetivo registrado em `docs/NEXT.md` ("Objetivo") e, se não houver, perguntar.
- **Guardar o texto original de quem pede, não só a implementação.** O roteiro do episódio 1 ficou só na conversa; a versão em código perdia as indicações de direção. Roteiros e pedidos longos do autor vão para o repositório como ele escreveu (ex.: `series/<série>/roteiros/`).
- **Nunca editar código servido pelo Vite durante um render.** A edição recarregou a página e cortou o vídeo. O render agora ignora mudanças de arquivo, mas a regra vale para qualquer processo que esteja usando o servidor de desenvolvimento.
- **Duração do episódio não é meta do motor nem das skills.** Cortei trechos (corte seco) para encurtar o episódio 1 sem o autor pedir. O limite de tempo, quando houver, é decidido ao criar cada episódio. O que vale sempre: nenhum trecho longo sem nada acontecendo (sem fala, som ou ação que prenda). Encher o vazio com som, figurantes e pequenas ações antes de pensar em cortar.
- **Assistir o vídeo antes de dizer que está pronto.** Entreguei o episódio conferindo só quadros escolhidos por mim e medidas de áudio; o autor achou gente atravessando gente, celular cortado, o protagonista olhando para o nada e um banco fora de lugar. Antes de entregar: varrer o MP4 inteiro (um quadro a cada 3 s numa folha só) e conferir os momentos de cada fala e de cada leitura de celular.
- **Tremor de câmera é tempero, não regra.** Pus `shake` 0.35 na abertura e o autor achou que chacoalhava demais. Tremor fica entre 0.03 e 0.15, só em corrida ou passo de gigante, e por pouco tempo.
- **Câmera não entra em cenário fechado nem atravessa pano ou parede.** A órbita dentro da tenda passou pelo pano e tapou tudo. Em lugar fechado, filme pela abertura (de fora para dentro, por cima do ombro) e confira cada quadro do movimento, não só o começo e o fim.
- **No vídeo vertical o campo lateral é estreito.** Órbita em volta do meio de duas pessoas perde as duas. Deixe as pessoas na linha do olhar da câmera (uma atrás da outra) e gire pouco.
- **Com ajudantes trabalhando, nunca `git add -A` numa pasta que eles mexem.** Um commit meu levou o trabalho pela metade de outro agente (e um teste temporário dele). Adicione os arquivos pelo nome, ou confira `git show --stat` antes de seguir.
- **Câmera de cinema acompanha o personagem.** Plano travado com gente saindo de quadro e terceira pessoa "de videogame" incomodaram o autor. Quem anda é seguido por uma câmera mais afastada que gira e desliza para mantê-lo em quadro; conversa de duas pessoas, de lado, com pequena rotação; nada colado no rosto.
- **Quem senta, senta em algo.** Sentar com `seated` sem um banco, pedra ou trono embaixo fica flutuando. Ponha o assento no lugar.

## Câmera que segue quem se move (ep. 1 de Davi)

- `twoShot` é calculado com as posições do começo do plano. Se um dos dois vai andar (levantar, dar a volta), use um plano fixo de um lugar fora do caminho dos dois, e confira os quadros do começo, meio e fim.
- Antes de pôr alguém encostado perto de uma porta, veja para que lado e até onde a folha abre (`doors.ts`: dobradiça no começo da abertura).

- **Diálogo no centro do quadro.** O Instagram corta as beiradas do vertical: os dois personagens de um diálogo ficam no terço central, nunca um deles na borda. Prefira um plano sobre o ombro de quem fala, alinhado com o outro, a um plano de lado que abre os dois para as pontas. Confira no `look` antes de seguir.

- **Rosto em repouso não pode parecer medo.** Olho redondo com branco em volta da íris e boca reta (que vista de baixo vira um arco para baixo) leem como susto. O neutro tem um leve sorriso e a pálpebra encostada na íris; o humor "worried" é para tensão de verdade, não para quem só está ouvindo ou tocando.
- **Voz: ouvir o sotaque e o eco.** Algumas vozes brasileiras puxam para o português de Portugal em certas falas, e o tom "sussurro" deixa a voz com cara de eco. Prefira vozes da biblioteca marcadas como brasileiras com muito uso, e tons como "nervoso" no lugar do sussurro.
- **Falas não se atropelam.** Uma caminhada que não está em `d.background` empurra a fala seguinte para o fim dela; confira sobreposições antes de renderizar.
- **Voz: ouvir o caráter, não só o sotaque.** Uma voz brasileira limpa ainda pode soar como locutor de rádio (o Adriano no guarda do ep. 2). Antes de escalar uma voz nova, gere uma fala de teste no tom da cena e ouça se ela soa como gente daquela história. As notas ficam em `canal/vozes.md`; leia antes de escolher.
