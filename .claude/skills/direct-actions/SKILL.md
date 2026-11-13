---
name: direct-actions
description: Dirigir um episódio — roteiro em código; personagem andar, falar com voz (ElevenLabs) e tom, narrador, sons e ambiente, olhar, abrir porta com a mão, pegar e guardar objetos, sentar; figurantes com vida própria (grupos conversando, prestando atenção, humor, transe); celular com tela de mensagens e queda de sinal; regras do mundo mudando no meio do episódio (céu, rede); portas e carro; câmera cinematográfica, em primeira ou terceira pessoa; render para MP4. Use quando o usuário descrever uma cena, pedir uma ação, um plano de câmera, um figurante ou um novo tipo de ação.
---

# Dirigir ações

Uma ação é dado do episódio, não código de um mapa.

## Roteiro em código (o jeito preferido)

Escreva o episódio como roteiro em `series/<série>/episodes/<n>.ts`. O roteiro diz o que acontece, em ordem; os tempos saem sozinhos, porque cada passo começa onde o anterior terminou e a duração de cada um vem do mundo (uma caminhada dura o que o caminho pede).

```ts
import { direct } from '../../../src/engine/timeline/direct';

export default direct(
  { episode: 2, title: 'Ana sai de casa', location: 'rua', cast: [{ character: 'ana', at: [12.6, 1.2], yaw: 180 }] },
  (d) => {
    const ana = d.actor('ana');
    d.camera.cut({ pos: [13.4, 1.6, 7], lookAt: [12.4, 1.1, 3] });
    ana.walkTo({ door: 'porta-casa' });
    ana.open('porta-casa');
    d.camera.thirdPerson(ana);
    ana.walkTo([17.75, 4.7]);
    ana.pickUp('caixa');
  },
);
```

| Chamada | O que faz |
|---|---|
| `ana.walkTo(ponto, { via: [[x, z], [x, z, nível]] })` | `via`: pontos por onde passar sem parar, ex.: forçar a escada de dentro em vez da de emergência |
| `ana.walkTo`, `runTo`, `turnTo`, `express`, `lookAt`, `lookAhead`, `pickUp`, `putDown`, `open`, `close`, `sit`, `standUp` | um passo do personagem: começa agora e o relógio vai para o fim dele. Devolve `{ start, end }` |
| `d.do(alvo, ação, params, { duration, ease })` | qualquer ação do catálogo em qualquer objeto, ex.: `d.do('carro', 'drive', { path })` |
| `d.wait(s)`, `d.at(t)`, `d.now` | espera, leva o relógio a um tempo, lê o relógio |
| `d.together(() => ..., () => ...)` | coisas ao mesmo tempo; o relógio vai para o fim da mais longa |
| `d.background(() => ...)` | algo que acontece enquanto o roteiro segue; o relógio não anda. Devolve `{ start, end }` |
| `d.waitFor(passo ou tempo)` | espera até lá, se ainda não passou |
| `ana.pointAt(beto)` | aponta para um personagem, um objeto por id ou um ponto: braço estendido, indicador esticado, olha para lá e recolhe. `{ hand, duration }`; o alvo precisa estar à frente |
| `ana.hand('fist')` | pose de mão até outra: `grip`, `point`, `fist`, `open`, `hold`, `type` (polegar digitando no celular) ou `relaxed`. `{ hand: 'left' \| 'right' \| 'both' }`. Segurar algo e gesticular ao falar já mudam a mão sozinhos |
| `ana.say('texto', { to: beto, tone: 'sussurro', gesture: 0.3 })` | fala na voz da ficha: dura o que a gravação durar e a boca segue a voz letra por letra. Sem gravação ainda, dura conforme o texto. `tone` é a entonação (não vai para a legenda); `gesture` de 0 a 1 é quanto as mãos acompanham. Ver "Voz e som" |
| `d.narrate('texto')` | o narrador fala (voz `audio.narrator` da bíblia), sem corpo |
| `d.sound('nome', { volume, length, fade })` | toca um som de `audio.sounds` da bíblia agora; não gasta tempo. Som em loop (ambiente) toca por `length` s |
| `d.cutOut(de, até)` | corte seco: o trecho fica no episódio mas sai do vídeo. Só quando o autor pedir; nunca para encurtar por conta própria |
| `ana.behave(modo, opções)` | o que o personagem faz sozinho daqui em diante (figurantes); não gasta tempo. Ver "Figurantes" |
| `ana.pickUp('celular')`, `raise('eyes' ou 'chest')`, `lower()`, `putAway('celular')` | tira do bolso (ou pega), levanta para ler, abaixa, guarda no bolso |
| `d.phone('celular')` | a tela de um celular: `setup({...})`, `receive(texto)`, `send(texto)`, `typing(true)`, `open(chat)`, `screen(false)`, `network(false)`. Acontecem na hora |
| `d.world.rule('id', true, { duration })` | faz uma regra da bíblia entrar (ou sair) aos poucos, ex.: o céu ficando vermelho |
| `d.world.network(false)` | cai o sinal de todos os celulares |
| `d.camera.cut({ pos, lookAt, fov })` | corta para uma câmera posta à mão |
| `d.camera.moveTo({ pos, lookAt })` | dentro do plano atual: a câmera se move e chega aqui agora |
| `d.camera.fpv(ana)`, `d.camera.thirdPerson(ana, { distance, height })` | corta para a câmera presa ao personagem |

- Os passos de um mesmo personagem são um depois do outro; para dois personagens ao mesmo tempo use `together` ou `background`.
- Chamadas de câmera não andam o relógio. Para um corte no meio de uma ação longa: `d.background(() => { d.wait(1); d.camera.cut(...); })` antes da ação.
- A duração do episódio é o fim da última coisa mais 1 s (`tail`), a não ser que o cabeçalho dê `duration`.
- O resultado é o mesmo dado de um episódio em JSON; tudo o que vem abaixo (catálogo, regras, câmera) vale igual. Erro no roteiro aparece em vermelho no painel do estúdio e falha em `npm test`.
- O episódio 1 de `demo-acoes` mostra as ações; o episódio 1 de `ceu-vermelho` é um episódio inteiro em primeira pessoa, com turma de figurantes, celular e mudança do céu. Use como exemplo.

### Elenco e objetos do episódio

No cabeçalho do roteiro:

- `cast`: cada entrada tem `character` (arquivo em `characters/`), `at`, `yaw` e, opcionalmente, `id` (para usar a mesma ficha várias vezes), `look` (muda a ficha só para esse membro: pele, cabelo, altura, `name`) e `seated` (começa sentado, a essa altura do chão; a cadeira da carteira é `DESK_SEAT.height`). `extraLook(semente)` de `src/engine/character/extras.ts` sorteia uma aparência para figurante.
- `props`: objetos que o episódio traz, no formato dos props do local, com `id`. `pocketOf: 'ana'` faz o objeto começar no bolso dela, invisível até um `pickUp`.

### Figurantes

O mundo tem que parecer vivo mesmo sem ninguém dirigido. `behave` define o que o personagem faz sozinho até o próximo `behave`; o movimento sai do tempo e do id de cada um, então ninguém se mexe igual e o scrub continua exato.

| Modo | O que faz | Opções |
|---|---|---|
| `chat` | conversa: quem tem o mesmo `group` se reveza falando (boca e mãos), os outros olham para quem fala, acenam, cruzam os braços, sorriem | `group` |
| `attend` | presta atenção em alguém ou algo, desviando o olhar de vez em quando | `object` |
| `watch` | olha fixo para um ponto, assustado | `point` |
| `trance` | em transe: olhar parado no ponto, olhos mais abertos, rosto sem expressão, quase sem piscar, corpo parado | `point` |
| `write` | escreve no quadro à frente com a mão direita | |
| `idle` | parado e vivo: olha em volta, troca o peso de perna | |
| `none` | para de se mexer sozinho | |

- `behave('none')` é só para o instante de uma ação dirigida (virar, andar). Logo depois, dê outro comportamento: quem para sem nenhum fica congelado. Ex.: o professor larga o giz (`none`), vira para a turma e passa a `attend` no aluno que levantou. O roteiro avisa quem fica mais de 3 s sem comportamento e sem ação (no painel do estúdio, em `npm run roteiro` e nos testes, que falham com o aviso). O personagem da câmera em primeira pessoa fica de fora.
- `behave('none')` é só para o instante de uma ação dirigida (virar, andar). Logo depois, dê outro comportamento: quem para sem nenhum fica congelado. Ex.: o professor larga o giz (`none`), vira para a turma e passa a `attend` no aluno que levantou. O roteiro avisa quem fica mais de 3 s sem comportamento e sem ação (no painel do estúdio, em `npm run roteiro` e nos testes, que falham com o aviso). O personagem da câmera em primeira pessoa fica de fora.
- `mood` em qualquer modo dá o rosto que ele mantém: `calm` (padrão: neutro, sorriso raro), `worried`, `scared`, `happy`. Ex.: `aluno.behave('chat', { group: 'g1', mood: 'worried' })`. Numa cena tensa, a maioria fica `worried`; poucos sorriem.
- `watch` e `trance` só viram a cabeça (até 75°). Para olhar uma janela que está de lado ou atrás, o personagem precisa ficar de frente: `standUp`, `walkTo` até a janela, `turnTo`, e só então `behave`.
- Uma ação dirigida vale mais que o comportamento: `lookAt` explícito manda no olhar, e a mão ocupada (carregando, levantada) não gesticula.
- Para um grupo: ponha cada um no seu lugar (`walkTo`), vire para o centro (`turnTo`) e dê `behave('chat', { group })` a todos.
- Antes de `walkTo`, quem está sentado precisa de `standUp(ponto ao lado)`.

### Celular

A tela é desenhada pelo motor (`src/engine/ui/phone.ts`) a partir dos eventos do roteiro: contato com nome grande e foto, mensagens recebidas à esquerda e enviadas à direita, caixa de digitar, mensagens novas empurrando as antigas para cima, três pontinhos de "digitando". Sem rede, o indicador de sinal vira "Sem rede", uma mensagem enviada fica marcada como não enviada, uma recebida não chega e o "digitando" some. Isso passa por `onNetworkError` do app: uma série pode registrar o seu app (`registerPhoneApp`) ou estender `MessengerApp` para mostrar a falha do seu jeito.

Para ler em primeira pessoa: `pickUp`, `raise()`, `lookAt('celular')` e aproxime com `d.camera.moveTo({ fov: 38 })` (duas chamadas com `fov` diferente, separadas por um `wait`, fazem o zoom; 38 deixa as mensagens legíveis sem cortar a tela).

## Voz e som

- **Voz de cada personagem**: `voice: { id }` na ficha (id de voz da ElevenLabs), ou em `look.voice` no elenco para um figurante falar com outra voz. O narrador é `audio.narrator` na bíblia. Modelo: `audio.model` (padrão `eleven_v3`, que entende os tons).
- **Tons**: `say(texto, { tone })`. Nomes em português em `TONES` (`src/engine/audio/voice.ts`): `sussurro`, `nervoso`, `grito`, `bravo`, `assustado`, `animado`, `triste`, `transe`, `ironico`, `cansado`, `urgente`, `preocupada`, `firme`, `decidido`. Qualquer outro vai como tag em inglês (`laughs`, `sighs`).
- **Voz por rádio, telefone ou caixa de som**: `say(texto, { filter: 'radio' })`. Filtros em `VOICE_FILTERS` (`src/engine/audio/voice.ts`): `radio` (PX, viatura), `phone`, `speaker` (caixa de som da escola, megafone), `muffled` (do outro lado da porta). A gravação é a mesma com ou sem filtro: ele entra na mixagem, então não custa nada trocar.
- **Alguém que não está em cena**: `d.narrate(texto, { as: 'pai', filter: 'radio' })` usa a voz e o nome da ficha `pai` da série, sem precisar pôr o personagem no elenco.
- **Rádio de mão**: prop `item.radio` (com `pocketOf` para começar no bolso). `pickUp`, `raise('chest')` para falar, `lower`, `putAway`, como o celular.
- **Gravações**: `npm run voz -- --series <s> --ep <n>` gera as falas que faltam e os sons gerados. Com `--dry`, só lista as falas e o custo em caracteres.
  - Cada gravação é achada pelo que ela soa (voz, modelo, texto com tom), em `series/<s>/audio/voz/<chave>.mp3` + `.json`. Mudar uma fala de lugar não custa nada; mudar o texto, o tom ou a voz gera de novo.
  - `--again <chave>` gera outra leitura da mesma fala.
  - A chave vem de `ELEVEN_API_KEY` no ambiente e nunca é escrita em arquivo.
- **Duração**: com a gravação, a fala dura o que ela dura e o roteiro inteiro se reacomoda (os tempos saem dos passos). Rode `npm run voz` antes do render final.
- **Sons**: `audio.sounds` na bíblia, por nome:
  - gerado pela ElevenLabs: `{ "prompt": "smartphone vibrating twice", "duration": 1.2, "loop": false, "volume": 0.8 }`, com a descrição em inglês;
  - ou um arquivo de banco com licença permissiva: `{ "file": "porta.ogg", "license": "CC0-1.0", "source": "https://...", "author": "..." }`. O arquivo fica em `series/<s>/audio/sons/` e entra em `audio/sons/CREDITOS.md`;
  - Kenney (https://kenney.nl/assets, CC0) tem pacotes de áudio (rpg-audio, interface-sounds, impact-sounds...). O botão de download pede um link assinado em `https://kenney.nl/download-link/<hex de "assets/<pacote>">`, com o cookie da página do pacote;
  - Freesound (filtrar por CC0) e Pixabay também servem, mas pedem conta.
- **Ambiente por cena**: um som em loop (`length` em segundos, `fade`) para cada lugar (burburinho da sala, passos no corredor, zumbido do porão) e um som em cada acontecimento. O render abaixa os sons enquanto alguém fala.
- **Mixagem**: `npm run render` mistura as falas e os sons nos seus tempos, a −14 LUFS, e junta ao vídeo. `--no-audio` deixa mudo; prévias com `--step` saem mudas. Sozinho: `node scripts/mix.mjs --series <s> --ep <n>`.
- **No estúdio**: as falas e os sons tocam junto com a timeline. A legenda do narrador sai sem nome.

## Episódio em JSON

Um episódio também pode ser um arquivo `<n>.json` com todos os tempos escritos à mão. O episódio tem uma trilha `actions`; cada item aponta para um objeto do local pelo id e para uma ação do catálogo:

```json
{ "t": 4.6, "duration": 1.2, "target": "porta-casa", "action": "open", "params": { "from": "inside" } }
```

- `t`: segundo em que começa. `duration`: opcional, cada ação tem a sua padrão. `ease`: `inOut` (padrão), `linear`, `in`, `out`.
- O valor de cada objeto em qualquer instante é função pura da trilha, então o scrub da timeline mostra o mesmo que tocar do início.

## Objetos que aceitam ações

Um objeto precisa de `id` no arquivo do local (único no local). Cada um expõe canais numéricos que as ações animam.

| Objeto | Como declarar | Tipo | Canais |
|---|---|---|---|
| Porta | `id` na abertura com `leaf`; `leaf.kind`: `swing` (padrão), `sliding`, `rollup` | `door` | `open` de 0 a 1 |
| Janela | `id` numa abertura `window` com `frame` (ou com `windows` no local) | `window` | `open` de 0 a 1 |
| Carro | prop `vehicle.car` com `id` | `vehicle` | `frontLeft.open`, `frontRight.open`, `rearLeft.open`, `rearRight.open`, `travel`, `x`, `y`, `z`, `yaw` |
| Viatura | prop `vehicle.policeCar` com `id` | `vehicle` | os do carro e `siren` (0 ou 1: o giroflex pisca sozinho enquanto ligado). Ligar: `d.do('viatura', 'set', { channel: 'siren', value: 1 })` |
| Ônibus | prop `vehicle.bus` com `id` | `vehicle` | `frontDoor.open`, `rearDoor.open` (portas do lado direito), `travel`; assentos `driver` e `p1` a `p8` |
| Bicicleta | prop `vehicle.bicycle` com `id` | `vehicle` | `travel`, `steer`; assento `driver` (o selim). Quem monta (`sit`) segura o guidão e pedala conforme a bicicleta anda |
| Item pegável | prop com `id` e `"pickable": true` | `item` | `x`, `y`, `z`, `yaw`, `held` |
| Celular | prop `item.phone` em `props` do episódio | `phone` | os de item e `network` (-1 segue o mundo, 0 sem sinal, 1 com sinal) |
| Mundo | sempre existe, id `world` | `world` | `network`, `rule.<id da regra>` (0 a 1) |
| Qualquer prop com `id` | — | `prop` | `x`, `y`, `z`, `yaw` |
| Personagem | entrada em `cast` no episódio (skill `create-character`) | `character` | `x`, `y`, `z`, `yaw`, `stride`, `gait`, `talk`, `expr.<nome>`, `look.yaw`, `look.pitch`, `crouch`, `sit`, `attached`, `carryL`/`carryR`, `reachL`/`reachR` (+ `.x`, `.y`, `.z`) |

`x`, `y`, `z` são coordenadas do local (não da área). `yaw` é em graus, igual ao `rot`. O carro olha para -z com `rot: 0`; o motorista fica à esquerda.

## Catálogo

O catálogo está em `src/engine/actions/builtin.ts` e `src/engine/actions/character.ts`; leia os `registerAction(...)` antes de usar ou criar uma ação. `by` é o id de um personagem do elenco que faz a ação com a mão.

| Ação | Vale para | Parâmetros |
|---|---|---|
| `open` | porta, veículo | `part` (qual porta do carro), `amount` (0 a 1), `from` (`inside` ou `outside`), `by`, `hand` |
| `close` | porta, veículo | `part`, `by`, `hand` |
| `drive` | veículo | `path` (pontos `[x, z]`), `speed` (m/s, padrão 6), `reverse` |
| `moveTo` | prop, item, veículo | `to` (`[x, z]`), `y`, `yaw` |
| `pickUp` | item | `by` (quem pega; fica segurando) ou `to` (`[x, y, z]`, sem personagem); `hand` (`left` ou `right`) |
| `putDown` | item | `at` (`[x, y, z]`) ou `on` + `seat` (assento de um objeto, ex.: banco do carro; o item passa a ir junto) |
| `set` | qualquer | `channel`, `value` |
| `walkTo` | personagem | `to` (`[x, z]`) ou `door` (id de uma porta: para diante dela, ao alcance da maçaneta), `elevation` (piso de destino, se mudar de nível), `speed` (m/s, padrão 1.4; a partir de 3 corre) |
| `turnTo` | personagem | `to` (`[x, z]` para onde virar) ou `yaw` |
| `lookAt` | personagem | `object` (id do que olhar; acompanha se ele se mexer) ou `point` (`[x, y, z]`); sem parâmetros volta a olhar para a frente |
| `sit` | personagem | `on` (id do objeto com assentos, ex.: o carro), `seat` (`driver`, `passenger`, `rearLeft`, `rearRight`; padrão `driver`) |
| `standUp` | personagem | `to` (`[x, z]` ao lado, onde fica de pé), `yaw` |
| `pointAt` | personagem | `object` ou `point`, `hand` |
| `hand` | personagem | `pose`, `hand` |
| `endCard` | `world` | `card` (`title`, `options`, `cta`) |
| `say` | personagem | `text`, `to` (com quem fala) |
| `behave` | personagem | `mode`, `group`, `object`, `point` |
| `raise` | personagem | `to` (`eyes` ou `chest`), `hand` |
| `lower` | personagem | |
| `putAway` | item, celular | |
| `screen` | celular | `event` (`setup`, `open`, `message`, `typing`, `screen`), `data` |
| `express` | personagem | `expression` (`neutral`, `happy`, `sad`, `angry`, `surprised`, `scared`), `amount` |

## Regras

- Porta com `opensFrom` `inside` ou `outside` só abre por aquele lado: `open` exige `from`, e o lado errado é erro de compilação. "Dentro" é a área que declara a abertura.
- Porta fechada bloqueia a passagem. De enrolar libera quando quase toda aberta; as outras, da metade em diante.
- Duas ações não podem mexer no mesmo canal ao mesmo tempo.
- `drive` parte de onde o carro está e sai na direção em que ele aponta. Ponha o primeiro ponto do caminho à frente do carro.
- `leaf.open` é o estado inicial da porta (0 a 1). Estado inicial diferente por episódio se faz com uma ação em `t: 0` e `duration: 0`.
- `walkTo` acha o caminho sozinho: desvia de paredes, passa por portas e sobe ou desce escadas. Se uma porta do caminho estiver fechada no instante em que o personagem chega nela, é erro de compilação; abra a porta antes. Sem `duration`, o tempo sai da distância e da velocidade.
- O personagem pisca e respira sozinho; não é preciso ação para isso.
- Com `by`, o personagem estende o braço até a maçaneta ou o item (inclina o tronco e se agacha se for preciso) e a ação passa a durar 1,2 s. Ele precisa estar a até 0,8 m (para um corpo de 1,7 m); mais longe é erro de compilação com a distância. Leve-o antes com `walkTo`.
- Sequência para passar por uma porta fechada: `walkTo` com `door`, `open` com `by`, `walkTo` até o outro lado. Com `by`, o lado (`from`) sai de onde o personagem está.
- Item pego com `by` fica na mão até um `putDown`, e a mão que segura não balança ao andar. Com a direita ocupada, a próxima ação com a mão usa a esquerda.
- `sit` prende o personagem ao assento: ele vai junto quando o carro anda, e `walkTo` é recusado até um `standUp`. O personagem precisa estar a até 2,5 m do objeto; abra a porta do carro antes (`open` com `part` e `by`), parado atrás da borda traseira da porta para ela não bater nele.
- A cabeça vira até 75° para os lados e 40° para cima ou para baixo. Quando o alvo de `lookAt` (ou o `to` de um `say`) está a mais de 70° de onde o corpo aponta, o roteiro vira o corpo junto, sozinho. Não vira se o personagem estiver andando ou sentado, e esse giro automático sai do caminho de qualquer passo que o roteiro peça depois (andar, `turnTo`).
- O olhar vale até o próximo `lookAt` do mesmo personagem, inclusive durante uma caminhada: um `lookAt` escrito na linha principal depois de um `lookAhead` dentro de um `background` faz o personagem andar olhando para trás. Ponha o olhar e o `lookAhead` na mesma sequência, antes do `walkTo`. `duration` é o tempo que a cabeça leva para chegar.
- Pontos de olhar são `[x, y, z]` com o `y` do mundo: num andar de baixo (porão em -3), some a altura do piso (`[x, PORAO + 1.2, z]`).
- Ninguém atravessa ninguém (`src/engine/actions/crowd.ts`): quem está a menos de 58 cm de outro (75 cm se um dos dois está andando) é afastado. Quem anda contorna de lado, quem está parado cede pouco, quem está sentado não se mexe, e ninguém vai para dentro de parede. Mesmo assim, evite pôr gente parada no caminho de quem anda: em primeira pessoa, passar perto demais enche a tela de cabeça.
- Móveis bloqueiam o caminho a pé pela área que ocupam na altura do corpo; objetos com `id` (que podem se mexer) não bloqueiam. Um banco com `id` (para alguém sentar) fica encostado na parede, fora de onde as pessoas passam.
- Objeto que faz parte do lugar (um banco no depósito) vai no arquivo do local, não no `props` do episódio: assim ele existe em todos os episódios e não parece cair do céu.
- Ações com `by` usam canais do personagem (`reachR`, `crouch`...): duas ao mesmo tempo com a mesma mão dão erro de canal em uso.

## Câmera

A trilha `camera` do episódio é uma lista de keyframes. Um plano vai de um keyframe com `"cut": true` (ou do primeiro) até o próximo corte, e o modo do plano fica no keyframe que o começa:

| `mode` | O que faz | Campos |
|---|---|---|
| `cinematic` (padrão) | câmera posta à mão; entre keyframes do mesmo plano ela se move em curva suave | `pos`, `lookAt`, `fov` em cada keyframe |
| `fpv` | nos olhos do personagem, olhando para onde a cabeça aponta (segue o `lookAt`); a cabeça dele some da imagem | `follow` (id no elenco), `fov` (padrão 70), `pitch` |
| `third_person` | atrás e acima do personagem, acompanhando; chega mais perto em vez de atravessar parede | `follow`, `distance` (padrão 3 m), `height` (padrão 0.5 m acima dos olhos), `pitch`, `fov` |

```json
{"t": 5.8, "cut": true, "mode": "third_person", "follow": "ana"},
{"t": 8.5, "cut": true, "mode": "fpv", "follow": "beto", "fov": 75}
```

- `mode` e `follow` só mudam num corte. Dentro de um plano preso, keyframes sem `cut` animam `fov`, `distance`, `height` e `pitch`.
- Plano preso não leva `pos` nem `lookAt`; plano `cinematic` exige os dois.
- Erro na trilha de câmera aparece em vermelho no painel, junto dos erros de ação.

## Criar uma ação ou um objeto novo

- Ação nova: `registerAction` em `src/engine/actions/`, declarando `appliesTo`, `params` e os canais que move. Ela deve servir a qualquer mapa.
- Objeto com partes móveis: no asset, chame `setChannels(obj, { nome: { value, apply } })` e registre o `kind` (quarto argumento de `registerAsset`). Veja `src/engine/assets/vehicles.ts`.
- Assento: um `Object3D` filho direto do asset com nome `seat.<nome>`, na altura do assento. Ele vira um lugar para `sit` e `putDown`.
- Ação em que o personagem usa a mão: `reach(...)` e `freeHand(...)` de `src/engine/actions/hands.ts`. Uma ação pode mover canais de outro objeto (`target` no write) e prender um objeto a outro (`attach` / `detach`).
- Tipo novo de porta: `kind` em `DoorLeaf` (`src/engine/world/types.ts`) e o desenho em `src/engine/world/doors.ts`.

## Conferir

Antes de escrever uma cena, veja o lugar: só pelo código é fácil errar para que lado fica a janela.

- `npm run look -- --series <s> --ep <n> --t 12,30` desenha esses instantes pela câmera do episódio (PNG em `out/<série>/ep001/quadros/`, ou `--out <pasta>`).
- `--view 20,9,1.6:20,0,1.5:60:0` usa uma câmera livre (posição : alvo : fov : andar). Com o andar, esconde o que está acima dele e os tetos: visão de cima, como casa de boneca. Pode repetir `--view`.
- Junte os quadros numa imagem só para comparar: `ffmpeg -i a.png -i b.png -filter_complex hstack=2 s.png`.
- Depois do render, varra o vídeo inteiro numa imagem só, um quadro a cada 3 s: `ffmpeg -i out/<s>/ep001/<s>-ep001.mp4 -vf "fps=1/3,scale=180:-1,tile=16x4" -frames:v 1 varredura.png`. Olhe cada quadro antes de dizer que está pronto.
- Problemas que só aparecem assim: alguém atravessando a câmera em primeira pessoa (gente parada no caminho de quem anda), a cabeça girando além de 75° e a câmera olhando o próprio ombro, olhar para uma parede achando que é a janela.
- `npm run roteiro -- --series <s> --ep <n>` exporta `roteiros/<nnn>-marcado.md`: cada fala, mensagem, som e ação do protagonista no seu tempo, com as pausas sem fala marcadas.

0. Para ver o resultado: `npm run previa -- --series <série> --ep <n>` (metade do tamanho) e, no fim, `npm run render -- --series <série> --ep <n>`. Tudo de um episódio vai para a pasta dele, `out/<série>/ep001/` (vídeo final, `-previa.mp4`, `quadros/` do look); `--dir <pasta>`, `VIDEOS_OUT` ou `"output"` na bíblia trocam a pasta base. Não grave nada solto em `out/` (opções no README).
1. `npm test` e `npm run typecheck`. Os testes compilam as ações de todos os episódios de todas as séries contra o local de cada um.
2. No estúdio (`npm run dev`), as ações aparecem como barras azuis na timeline e em "Ações do episódio" no painel; um erro de compilação aparece ali em vermelho.
3. Tire screenshots na visão Câmera em instantes antes, durante e depois de cada ação (`window.__studio.timeline.seek(frame)`) e olhe as imagens.
4. A série `demo-acoes` (`?series=demo-acoes`) mostra todas as ações do catálogo; use como exemplo.

## Tela final

Para fechar o episódio com uma pergunta para quem assiste:

```ts
d.endCard({
  title: 'O que você faria?',
  options: [{ label: 'Ficava no abrigo' }, { label: 'Saía para ver o céu' }],
  cta: 'Comenta aí',
}, { duration: 6 });
```

De 2 a 6 opções. Cada uma pode ter `icon` (letra, número ou emoji; padrão A, B, C...) e `color`. A tela aparece por cima da imagem, que continua por trás. O texto das opções é do autor: pergunte antes de inventar.

## Lente grande-angular

`lens` (0 a 1) em qualquer chamada de câmera distorce a imagem como uma grande-angular: `d.camera.moveTo({ fov: 76, lens: 0.7 })`. Varia entre keyframes, como o `fov`. Use em momentos de tensão (fuga, corrida), não o tempo todo: deforma o que precisa ser lido, como a tela do celular. Um `moveTo` que não repete `fov` ou `pitch` leva esses valores ao padrão; repita os do plano.
