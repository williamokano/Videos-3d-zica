# Assets e o que cada um faz

Gerado por `npm run assets` a partir do catálogo do motor. Não edite à mão.

Todo asset com `id` no local (ou em `props` do episódio) também aceita `moveTo` (levar a outro ponto) e `set` (qualquer canal). Os que não têm ação própria são cenário.

## backdrop

### `backdrop.house`

Casa simples de bairro, para preencher o outro lado da rua: sobrado ou térrea, telhado, porta, janelas, às vezes caixa d'água; a frente olha para +z (params: seed, floors, width, depth)

- Cenário: sem ação própria.

### `backdrop.skyline`

Fundo de cidade pintado: cartões com fachadas de prédios e casas em arco ao redor da origem, para a distância aonde ninguém vai (params: radius, count, height — do cartão, em metros —, arc e start em graus, haze de 0 a 1 — quanto mais longe, maior —, tall — 1 para prédios altos —, seed)

- Cenário: sem ação própria.

## item

### `item.box`

Caixa de papelão pequena, boa para ser carregada (params: size, color)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")
- **knockOver / setUpright**: derrubar e pôr de pé

### `item.phone`

Celular com tela que mostra um app (mensageiro); pegável; a tela vem dos eventos do episódio (params: color)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")
- **raise / lower**: levar à frente do rosto ou do peito
- **screen**: mensagens, digitando, tela acesa ou apagada
- Canais: `network`

### `item.radio`

Rádio comunicador de mão (PX): corpo, antena, visor e botão de falar; pegável (params: color)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")
- **raise / lower**: levar à frente do rosto ou do peito

## light

### `light.ceilingLamp`

Luminária de teto com luz própria; posicione com y perto do teto (params: color, intensity, range)

- **switch**: liga e desliga
- Canais: `on`

### `light.tubeLamp`

Luminária de barra (calha com duas lâmpadas tubulares), de teto, como em sala de aula; a origem é no teto e o comprimento vai ao longo de x (params: length, color, intensity — 0 para a lâmpada aparecer acesa sem somar luz à cena —, range)

- **switch**: liga e desliga
- Canais: `on`

## nature

### `nature.bush`

Arbusto baixo (params: seed)

- Cenário: sem ação própria.

### `nature.grass`

Grama baixa: tufos espalhados num retângulo centrado na origem, sobre o chão (params: width, depth, density — tufos por m² —, height, seed)

- Cenário: sem ação própria.

### `nature.tree`

Árvore de copa arredondada (params: seed, height)

- Cenário: sem ação própria.

### `nature.weeds`

Moita de mato alto, para pé de cerca, canto de muro e rachadura de calçada (params: seed, height, spread)

- Cenário: sem ação própria.

## school

### `school.bench`

Banco de pátio, com três lugares para sentar (left, middle, right); quem senta fica de frente para -z

- **sit / standUp**: lugares: left, middle, right
- **knockOver / setUpright**: derrubar e pôr de pé

### `school.blackboard`

Quadro-negro de parede, verde como nas escolas públicas, com giz (params: width)

- Cenário: sem ação própria.

### `school.ceilingFan`

Ventilador de teto com haste, girando sozinho; a origem é no teto (params: blades — 3 ou 4 —, speed em voltas por segundo, 0 para parado, drop — comprimento da haste —, color)

- **switch**: liga e desliga
- Canais: `on`

### `school.concreteTable`

Mesa de concreto de pátio de escola pública, com os bancos junto (params: shape — "round" ou "rect" —, seats — "stools" banquinhos redondos ou "benches" bancos em arco/retos —, color, top — cor do tampo e dos assentos)

- **sit / standUp**: lugares: s1, s2, s3, s4
- **putDown (com "on")**: onde pôr coisas: top

### `school.desk`

Carteira escolar brasileira: mesa individual de madeira com vão embaixo para cadernos, e cadeira (params: color da cadeira)

- **sit / standUp**: lugares: chair
- **putDown (com "on")**: onde pôr coisas: top
- **knockOver / setUpright**: derrubar e pôr de pé

### `school.lockers`

Fileira de armários de corredor; cada porta abre (canais `door1.open`, `door2.open`... da esquerda para a direita de quem olha) (params: count)

- **open / close**: partes: door1, door2, door3, door4, door5, door6
- Canais: `door1.open`, `door2.open`, `door3.open`, `door4.open`, `door5.open`, `door6.open`

### `school.speaker`

Caixinha de som de parede, das que dão o sinal e os avisos; costas em z = 0, virada para +z e um pouco para baixo (params: color)

- Cenário: sem ação própria.

### `school.teacherDesk`

Mesa do professor: mesa de escritório simples de 1,20 × 0,70, cadeira (lugar `chair`), tampo (`top`) e duas gavetas que abrem (canais `drawer1.open` em cima e `drawer2.open` embaixo)

- **open / close**: partes: drawer1, drawer2
- **sit / standUp**: lugares: chair
- **putDown (com "on")**: onde pôr coisas: top
- Canais: `drawer1.open`, `drawer2.open`

## storage

### `storage.crates`

Pilha de caixotes de madeira (params: seed)

- **putDown (com "on")**: onde pôr coisas: top

### `storage.shelf`

Estante de depósito com caixas (params: seed, width)

- **putDown (com "on")**: onde pôr coisas: shelf1, shelf2, shelf3

## street

### `street.barrier`

Barreira de bloqueio, ao longo de x: "wood" (cavalete de madeira listrado), "steel" (grade de aço de contenção, das de evento e obra) ou "plastic" (barreira plástica laranja e branca) (params: kind, length, color)

- **knockOver / setUpright**: derrubar e pôr de pé

### `street.busStop`

Ponto de ônibus coberto, aberto para +z (a rua): cobertura, fundo, banco com lugares para sentar (left, middle, right) e placa (params: width, color)

- **sit / standUp**: lugares: left, middle, right

### `street.cone`

Cone de trânsito laranja com faixas brancas; dê `id` e `pickable` para alguém carregar (params: height, color)

- **knockOver / setUpright**: derrubar e pôr de pé

### `street.crosswalk`

Faixa de pedestre pintada no chão: listras ao longo de x, atravessando z (params: width — largura da faixa —, length — a largura da rua que ela cruza)

- Cenário: sem ação própria.

### `street.lightPole`

Poste de luz de rua: poste alto com um braço para +z e a luminária na ponta. Canal `on` (0 ou 1) acende; `flicker: 1` faz a lâmpada falhar de vez em quando (params: height, reach, color — da luz —, intensity — 0 para aparecer aceso sem iluminar —, flicker, wires — 1 para a cruzeta de fios no alto)

- **switch**: liga e desliga
- Canais: `on`

### `street.manhole`

Tampa de bueiro redonda no chão, ou boca de lobo ("grate") junto ao meio-fio (params: kind — "round" ou "grate")

- Cenário: sem ação própria.

### `street.sign`

Placa de trânsito num poste, virada para +z (params: kind — "stop" (PARE), "noParking", "speed" com `text` para o número, "crossing" (travessia de pedestre), "name" (nome de rua, com `text`) —, text, height)

- Cenário: sem ação própria.

### `street.trafficLight`

Semáforo de poste, virado para +z. Canal `state`: 0 vermelho, 1 amarelo, 2 verde, 3 apagado; `cycle: 1` faz ele trocar sozinho com o tempo (params: height, cycle)

- **signal**: red, yellow, green, off
- Canais: `state`

### `street.trashBin`

Lixeira de rua num poste, das de calçada (params: color)

- **putDown (com "on")**: onde pôr coisas: inside

## structure

### `structure.canopy`

Passarela coberta: telhado sobre duas fileiras de pilares, ao longo de x, para ligar dois prédios; passa-se por baixo (params: length, width, height, color — do telhado —, posts — cor dos pilares)

- Cenário: sem ação própria.

### `structure.fence`

Cerca de escola, um trecho ao longo de x: mureta de concreto com gradil de barras em cima, ou alambrado (params: length, height, style — "bars" ou "mesh" —, color, base — altura da mureta, 0 para sem)

- Cenário: sem ação própria.

### `structure.gate`

Portão de correr de gradil, entre dois pilares, ao longo de x; canal "open" de 0 (fechado) a 1 (aberto, a folha corre para +x) (params: width, height, color)

- **open / close**: o objeto inteiro
- Canais: `open`

### `structure.pillar`

Pilar de concreto (params: height, size)

- Cenário: sem ação própria.

## vehicle

### `vehicle.bicycle`

Bicicleta, de frente para -z: rodas giram com `travel`, e o selim é um assento (`driver`) para alguém montar (params: color)

- **drive**: anda por um caminho, virando as rodas da frente
- **sit / standUp**: lugares: driver
- **knockOver / setUpright**: derrubar e pôr de pé
- Canais: `travel`, `steer`

### `vehicle.bus`

Ônibus urbano, de frente para -z, com porta na frente e atrás do lado direito (canais `frontDoor.open` e `rearDoor.open`, de 0 a 1), banco do motorista (`driver`) e bancos de passageiro (`p1` a `p8`); rodas giram com `travel` (params: color, stripe)

- **open / close**: partes: frontDoor, rearDoor
- **switch**: faróis ("what": "lights")
- **drive**: anda por um caminho, virando as rodas da frente
- **sit / standUp**: lugares: driver, p1, p2, p3, p4, p5, p6, p7, p8
- Canais: `frontDoor.open`, `rearDoor.open`, `travel`, `steer`, `lights`

### `vehicle.car`

Carro de quatro portas, de frente para -z; portas e rodas animáveis por ações (params: color)

- **open / close**: partes: frontLeft, frontRight, rearLeft, rearRight
- **switch**: faróis ("what": "lights")
- **drive**: anda por um caminho, virando as rodas da frente
- **sit / standUp**: lugares: driver, passenger, rearLeft, rearRight
- Canais: `frontLeft.open`, `frontRight.open`, `rearLeft.open`, `rearRight.open`, `travel`, `steer`, `lights`

### `vehicle.policeCar`

Viatura de polícia: o carro com pintura, giroflex no teto e rádio no painel. Canal `siren` (0 ou 1) liga o giroflex, que pisca com o tempo do episódio; portas e rodas como no carro (params: color, doors — cor das portas —, stripe)

- **open / close**: partes: frontLeft, frontRight, rearLeft, rearRight
- **switch**: faróis ("what": "lights"); giroflex ("what": "siren")
- **drive**: anda por um caminho, virando as rodas da frente
- **sit / standUp**: lugares: driver, passenger, rearLeft, rearRight
- Canais: `frontLeft.open`, `frontRight.open`, `rearLeft.open`, `rearRight.open`, `travel`, `steer`, `lights`, `siren`

## Roupas e acessórios (`wear` na ficha do personagem)

- `cap`: Boné, com a aba para a frente (color, accent no botão de cima)
- `policeCap`: Quepe de policial: copa chata, aba curta e distintivo na frente (color, accent no distintivo)
- `helmet`: Capacete (de bicicleta ou moto aberto), com faixa embaixo (color, accent na faixa)
- `vest`: Colete por cima da camisa, tático ou refletivo: cobre o peito e a barriga (color, accent em duas faixas)
- `badge`: Distintivo no peito, do lado esquerdo (color)
- `longSleeves`: Mangas compridas: o antebraço fica da cor da camisa (color para outra cor)
- `dutyBelt`: Cinto de serviço: coldre do lado direito, rádio do lado esquerdo e fivela (color, accent na fivela)
- `backpack`: Mochila nas costas, com alças (color, accent no bolso)
- `deliveryBag`: Bag de entrega: caixa térmica grande nas costas, com alças e tampa (color, accent na tampa e na faixa)

## Janelas (`frame` numa abertura, ou `windows` no local)

- `fixed`, `sliding`, `tilt`, `casement`, `louver`, `blinds`: todas com o canal `open`, movido por **open / close** (a `fixed` não se mexe).
