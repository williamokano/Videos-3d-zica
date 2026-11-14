# Assets e o que cada um faz

Gerado por `npm run assets` a partir do catálogo do motor. Não edite à mão.

Todo asset com `id` no local (ou em `props` do episódio) também aceita `moveTo` (levar a outro ponto) e `set` (qualquer canal). Os que não têm ação própria são cenário.

## ancient

### `ancient.banner`

Estandarte: vara alta fincada num monte de pedras, com um pano que tremula sozinho. `shape`: "hang" (pano pendurado de uma travessa, 0,8 × 1,1 m) ou "pennant" (flâmula comprida voando da vara) (params: height — da vara —, color, trim — cor das faixas —, shape, seed)

- Cenário: sem ação própria.

### `ancient.basket`

Cesto de vime redondo e baixo (50 cm), com pães redondos dentro (params: bread — quantos pães, 0 para vazio —, size — escala —, color)

- **knockOver / setUpright**: derrubar e pôr de pé

### `ancient.basketGroup`

Cestos de vime trançado de tamanhos diferentes (um alto de alças, um largo e baixo, um pequeno...), juntos no chão sem se encostar; um com lã crua e outro com grão. `fill`: "mixed" (padrão), "wool", "grain" ou "none" (params: count — 3 —, spread — raio do grupo, 0,5 —, fill, seed)

- Cenário: sem ação própria.

### `ancient.boulder`

Rochedo grande com pedras menores no pé, para os montes (params: size — largura, 2,2 m —, seed, color)

- Cenário: sem ação própria.

### `ancient.brazier`

Braseiro: bacia de bronze sobre três pernas (85 cm até a borda), cheia de brasas, com fogo que treme sozinho. Com `intensity` maior que 0 ilumina de verdade, quente e tremendo (alcance 9 m; `shadow: 1` para sombra) (params: intensity, shadow, range, size — escala —, seed)

- Cenário: sem ação própria.

### `ancient.campfire`

Fogueira: roda de pedras, lenha em pirâmide, brasas e chamas que tremem sozinhas com o tempo. `pot: 1` põe um tripé com uma panela de barro pendurada sobre o fogo. Com `intensity` maior que 0 ilumina de verdade, tremendo (use em poucas, à noite) (params: size — escala —, lit — 0 para só cinzas e lenha —, pot, intensity, seed)

- Cenário: sem ação própria.

### `ancient.cart`

Carroça de duas rodas de madeira, de boi, de frente para -z: a lança desce até o chão com a canga na ponta. Com `load`, sacos deitados na caixa (params: load — quantos sacos, 0 a 6 —, color)

- Cenário: sem ação própria.

### `ancient.cheese`

Queijos: uma trouxinha de pano amarrada no alto, do tamanho de levar no braço, ou (`wrapped: 0`) o pano aberto com os queijos redondos empilhados (params: count — queijos, 10 —, wrapped, color — do pano)

- **knockOver / setUpright**: derrubar e pôr de pé

### `ancient.chest`

Baú de madeira com cintas de bronze, a frente (fechadura) para +z; a tampa abre para trás (canal `open`) e em cima se põem coisas (`top`) (params: width, color)

- **open / close**: o objeto inteiro
- **putDown (com "on")**: onde pôr coisas: top
- Canais: `open`

### `ancient.cityGate`

Portão de cidade de pedra: duas torres com ameias e, entre elas, uma passagem em arco com as folhas de madeira abertas para dentro; a frente (fora da cidade) olha para +z. Passa-se pelo arco ao longo de z; o asset não bloqueia nada: ponha `ancient.wall` dos lados (params: opening — largura do arco —, height — das torres —, color, seed)

- Cenário: sem ação própria.

### `ancient.column`

Coluna grossa de pedra rebocada, com base em degraus e capitel largo de volutas (diâmetro 60 cm) (params: height — 4,5 —, radius — 0,3 —, color — do reboco —, trim — da base e do capitel)

- Cenário: sem ação própria.

### `ancient.cushion`

Almofada de chão, quadrada e fofa com borlas nos cantos, ou um rolo para encostar (params: shape — "square" ou "bolster" —, color, trim, size — escala)

- **knockOver / setUpright**: derrubar e pôr de pé

### `ancient.dryBush`

Arbusto seco de encosta: galhos finos marrons e poucas folhas cinza-esverdeadas; bloqueia a passagem (params: size — 0,9 m —, seed)

- Cenário: sem ação própria.

### `ancient.flock`

Rebanho de ovelhas espalhado num retângulo (width × depth, centrado na origem). Cada ovelha pasta no seu ritmo e vai andando devagar pelo pasto, para e anda de novo, virando para onde vai e mexendo as pernas; nunca sai da área nem esbarra na outra. Pisa-se no meio delas. Barato: 30 ovelhas são quatro malhas (params: count — 14 —, width — 12 —, depth — 8 —, color — da lã —, face, seed)

- Cenário: sem ação própria.

### `ancient.groundShields`

Escudos redondos de couro com borda e umbo de bronze, no chão (não na mão). `arrange`: "mixed" (dois apoiados um no outro e o resto empilhado), "stack" (pilha) ou "lean" (fileira inclinada para trás, para encostar em tenda, suporte ou pedra) (params: count, arrange, color, rim, seed)

- Cenário: sem ação própria.

### `ancient.hangingCloth`

Pano de lã tecido e listrado (faixas de outra cor perto das pontas, franja embaixo) pendurado numa vara presa em duas cavilhas na parede; balança de leve sozinho. Costas em z = 0, olha para +z; a origem é a vara: ponha na altura com `y` (1,8 m para um pano, a altura do vão para cortina). Serve de cortina numa porta: não bloqueia a passagem (params: width — 0,7 —, length — 1,2 —, color — "linen", "brown", "dark" ou uma cor —, stripe — cor das listras —, seed)

- Cenário: sem ação própria.

### `ancient.heifer`

Novilha (vaca nova), de frente para -z, 1,2 m na cernelha, com cabresto. Mexe a cauda, as orelhas e a cabeça sozinha com o tempo. `rope: 1` põe a corda de puxar pendurada do cabresto até o chão, para alguém levar pelo caminho (`moveTo`) (params: color — do pelo, castanho claro —, rope, seed)

- Cenário: sem ação própria.

### `ancient.herbBundle`

Maços de ervas secas pendurados de cabeça para baixo numa cordinha esticada, para debaixo de uma viga; balançam de leve sozinhos. A origem é a corda, ao longo de x: ponha na altura com `y` (logo abaixo da viga). Não bloqueia a passagem (params: count — 3 —, seed)

- Cenário: sem ação própria.

### `ancient.hitchedDonkey`

Jumento parado, de frente para -z, amarrado pelo cabresto a uma estaca; mexe a cauda, as orelhas e a cabeça sozinho. `load: 1` põe manta e alforjes no lombo (params: color, load, tied — 0 sem estaca —, seed)

- Cenário: sem ação própria.

### `ancient.house`

Casa de pedra e barro de teto plano com terraço e mureta, porta baixa e janelinhas como vãos escuros, pontas das vigas aparecendo; a frente (porta) olha para +z. Pelo `seed` muda cor, altura, escada de fora até o terraço, quartinho ou cabana de ramos no terraço (params: width, depth, height, seed, stair — 0 ou 1 —, color)

- Cenário: sem ação própria.

### `ancient.jar`

Jarro de barro. `shape`: "storage" (talha alta de gargalo com colar e duas alças, para grão, azeite ou água) ou "pitcher" (jarra de uma alça). Com `count` maior que 1, um grupo de jarros de alturas diferentes (params: shape, size — altura em metros, 0,75 a talha e 0,3 a jarra —, count, color, seed)

- **knockOver / setUpright**: derrubar e pôr de pé

### `ancient.ladder`

Escada de mão rústica: dois varões tortos e degraus de galho amarrados com corda, encostada. O alto encosta na parede em z = 0 e os pés ficam para +z (a escada olha para +z; quem sobe olha para -z). Para subir ao terraço ou ao sótão (params: height — altura do alto, 2,6 —, lean — inclinação em graus, 15 —, color, seed)

- Cenário: sem ação própria.

### `ancient.lampStand`

Candeia acesa num suporte. `kind`: "wood" (pé de madeira de três pernas, 1,1 m), "stone" (coluna baixa de pedra, 90 cm) ou "shelf" (prateleira de parede com mão-francesa: costas em z = 0, olha para +z; a origem é o tampo, ponha na altura com `y`). Mesma luz da `ancient.oilLamp` (params: kind, intensity, shadow, range, color — da madeira ou da pedra —, seed)

- Cenário: sem ação própria.

### `ancient.lowTable`

Mesa baixa de madeira (35 cm, para comer sentado no chão), com jarra, copos e uma tigela de frutas em cima; põe-se coisas em `top` (params: width, depth, jar — 0 ou 1 —, cups, fruit — 0 ou 1 —, color)

- **putDown (com "on")**: onde pôr coisas: top

### `ancient.mudBench`

Banco baixo de barro (tijolo de barro rebocado) encostado na parede, de bordas arredondadas e irregulares, feito à mão, com pedras aparecendo no pé. Costas em z = 0, a frente olha para +z: ponha rente à parede. Assentos `seat1`, `seat2`, ... a cada ~0,6 m ao longo dele (quem senta olha para +z, para fora da parede) e `top` no meio, para pôr coisas (params: length — 2 —, height — 0,42 —, depth — 0,45 —, color — do reboco —, seed)

- **sit / standUp**: lugares: seat1, seat2, seat3
- **putDown (com "on")**: onde pôr coisas: top

### `ancient.oilLamp`

Candeia de barro: pires com o bico beliscado para a frente (-z), pavio e chama que tremula sozinha (13 cm). Com `intensity` maior que 0 acende uma luz quente de verdade, de alcance curto (6 m), para interior à noite; `shadow: 1` faz essa luz projetar sombra (mais caro) (params: intensity, shadow, range, size — escala —, color — do barro —, seed)

- Cenário: sem ação própria.

### `ancient.oliveTree`

Oliveira: tronco retorcido de vários troncos enroscados e copa larga verde-prateada; só o tronco bloqueia a passagem (params: height — 3,5 —, seed)

- Cenário: sem ação própria.

### `ancient.palm`

Tamareira: tronco anelado levemente curvo, coroa de folhas compridas caindo e cachos de tâmaras (params: height — 6 —, seed)

- Cenário: sem ação própria.

### `ancient.pebbles`

Seixos lisos de riacho espalhados num retângulo centrado na origem; pisa-se neles (params: width, depth, density — por m² —, seed)

- Cenário: sem ação própria.

### `ancient.plankShelf`

Prateleira de uma tábua rústica sobre duas cavilhas na parede, com potes, tigelas, jarrinhas e uma jarra de barro escolhidos pelo `seed`. Costas em z = 0, olha para +z; a origem é o tampo da tábua: ponha na altura com `y` (1,5 m numa sala). Não bloqueia a passagem (params: length — 1,2 —, count — quantas peças, 5 —, color — da madeira —, seed)

- **putDown (com "on")**: onde pôr coisas: top

### `ancient.post`

Esteio de tronco de árvore bruto, que segura a viga do teto: torto, mais fino em cima, com nós e um toco de galho, o topo cortado reto. Bloqueia só o tronco (params: height — 2,7 —, radius — 0,11 —, color, seed)

- Cenário: sem ação própria.

### `ancient.potteryGroup`

Grupo de vasilhas de barro para o chão ou um banco: talha de guardar, panela de cozinhar, tigelas empilhadas, jarra de alça e jarrinhas, em vermelhos e marrons de barro um pouco diferentes. Arrumadas pelo `seed` sem se encostar (params: count — 7 —, spread — raio do grupo, 0,6 —, seed)

- Cenário: sem ação própria.

### `ancient.quern`

Moinho de mão (mó de sela): pedra de baixo comprida e côncava no chão, ao longo de x, com a pedra de cima em forma de pão atravessada nela, grãos espalhados, farinha no chão e uma tigela com farinha na ponta. Quem mói ajoelha do lado -x (params: bowl — 0 ou 1 —, color — da pedra —, seed)

- Cenário: sem ação própria.

### `ancient.rock`

Pedra solta irregular, de terra clara, meio enterrada (params: size — largura em metros, 0,6 —, seed, color)

- Cenário: sem ação própria.

### `ancient.royalTent`

Tenda do rei, um pavilhão: paredes de pano atrás e dos lados, teto de duas águas, sem parede na frente (+z), com sanefa de franjas, cortinas presas nos cantos da frente e um galhardete no alto que tremula. Por dentro só se vê pano: monte o interior com tapete, almofadas, baú e mesa. Não bloqueia a passagem (params: width, depth, height — da cumeeira —, color, trim — cor da sanefa e das faixas)

- Cenário: sem ação própria.

### `ancient.rug`

Tapete tecido, com barra de outra cor, losangos no meio e franjas nas pontas (ao longo de z); pisa-se nele (params: width, depth, color, trim, seed)

- Cenário: sem ação própria.

### `ancient.sack`

Saco de grão de pano grosso, amarrado na boca (70 cm em pé). Com `count` maior que 1 vira uma pilha de sacos deitados, como a carga do acampamento (params: count, arrange — "pile" deitados em pirâmide ou "standing" em pé lado a lado —, seed)

- **knockOver / setUpright**: derrubar e pôr de pé

### `ancient.seatStone`

Pedra baixa de topo chato, para sentar: o banco dos anciãos no portão, a pedra do pastor no campo. Lugar "seat" no topo (params: height — altura do assento, 0,45 —, width, seed, color)

- **sit / standUp**: lugares: seat

### `ancient.sheep`

Ovelha de lã fofa, cara e pernas escuras, de frente para -z, 75 cm até o lombo. Pasta sozinha com o tempo: baixa a cabeça até o capim e mordisca, levanta e olha em volta, mexe as orelhas; cada `seed` pasta num ritmo seu e tem tamanho e tom de lã um pouco diferentes (params: seed, color — da lã —, face — da cara e das pernas)

- Cenário: sem ação própria.

### `ancient.spearRack`

Suporte de lanças: travessa sobre dois cavaletes em X, com lanças encostadas dos dois lados, ao longo de x (params: count — lanças —, color — da madeira)

- Cenário: sem ação própria.

### `ancient.stool`

Banquinho baixo de assento de palha trançada (35 cm): quatro pés de madeira com travessas e o assento de tiras de palha em quadrados um dentro do outro, com o X das emendas. De frente para -z como os móveis. Assento `seat` (params: height — 0,35 —, width — 0,36 —, color — da madeira)

- **sit / standUp**: lugares: seat

### `ancient.stream`

Riacho raso ao longo de x: água azul meio transparente que brilha e corre (para +x), leito de pedras lisas, margens de cascalho e capim verde. Plano: ponha no fundo do vale, onde o chão é reto; pisa-se nele (params: length, width — da água —, curve — quanto a linha se afasta do eixo, em metros —, bends — quantas curvas —, bank — largura de cada margem —, seed)

- Cenário: sem ação própria.

### `ancient.tent`

Tenda de soldado. `style`: "ridge" (duas abas até o chão, 2,4 × 3 m, 1,75 m de altura) ou "long" (tenda comprida de teto inclinado sobre varas, com toldo na frente, 4,2 × 4,2 m). Fechada atrás, aberta na frente (+z), com abas presas para trás, cordas e estacas (params: style, color — "linen", "brown", "dark", "striped" ou uma cor —, stripes — número de listras —, stripe — cor das listras —, size — escala, 1 = normal)

- Cenário: sem ação própria.

### `ancient.throne`

Trono de madeira da Idade do Ferro, de frente para -z: espaldar alto com crista, braços entalhados terminando em volutas, pés de pata, almofada e um escabelo (banquinho de pés) na frente. Assento `throne` para `sit` (params: color — da madeira —, trim — dos detalhes, dourado —, cushion — cor da almofada)

- **sit / standUp**: lugares: throne

### `ancient.wall`

Trecho de muralha de pedra ao longo de x, com ameias, base mais larga e pedras aparentes (params: length, height, thickness, color, seed)

- Cenário: sem ação própria.

### `ancient.wallNiche`

Nicho na parede: um vão raso e escuro de topo arredondado, com o peitoril de reboco e uma candeia (acesa) ou uma jarrinha dentro. É uma peça fina para pôr rente à face da parede (costas em z = 0, olha para +z, saindo um pouco da parede para se ler como nicho); a origem é o pé do nicho: ponha na altura com `y` (1,1 m). Com `intensity` a candeia ilumina de verdade (params: width — 0,35 —, height — 0,45 —, item — "lamp", "jug" ou "none" —, color — do reboco —, intensity, seed)

- Cenário: sem ação própria.

### `ancient.wallTorch`

Tocha num suporte de ferro preso na parede: costas em z = 0, olha para +z, a tocha inclinada para fora com a chama tremendo sozinha. A origem é o pé da tocha: ponha na altura com `y` (1,6 m numa sala). Com `intensity` maior que 0 ilumina de verdade, quente e tremendo (alcance 8 m; `shadow: 1` para sombra) (params: intensity, shadow, range, seed)

- Cenário: sem ação própria.

### `ancient.well`

Poço redondo de pedra, com água escura lá dentro, dois esteios e um sarilho com corda e balde (params: radius — por fora, 0,75 —, color)

- Cenário: sem ação própria.

### `ancient.woodTable`

Mesa rústica de tábuas grossas sobre dois cavaletes (62 cm, a altura de comer sentado em banquinho ou no banco de barro), as tábuas desiguais; `cloth: 1` põe um caminho de pano listrado ao longo dela, caindo nas pontas. Põe-se coisas em `top` (params: width — 1,4 —, depth — 0,6 —, height — 0,62 —, cloth — 0 ou 1 —, color — da madeira —, clothColor, stripe, seed)

- **putDown (com "on")**: onde pôr coisas: top

## arms

### `arms.armor`

Couraça de escamas de bronze, solta (a peça de roupa scaleArmor fora do corpo, para vestir com "don" e tirar com "doff"): peito, barriga e ombreiras. Pegável, pelos ombros (params: size, a largura, padrão 0.45; color)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")

### `arms.bow`

Arco de madeira com a corda, em pé; pegável, pelo meio (params: size, a altura, padrão 1.2)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")

### `arms.helmet`

Capacete de bronze redondo, com ponta e protetor de nuca, solto (o mesmo da peça de roupa bronzeHelmet, para vestir com "don" e tirar com "doff"). Pegável, pela borda (params: size, o raio da cabeça, padrão 0.16; color)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")

### `arms.lyre`

Kinnor, a lira pequena de madeira: caixa de som embaixo, dois braços que se abrem, a travessa inclinada em cima e as cordas, de frente para -z (50 cm). Pegável, pela ponta de baixo da caixa: segure na mão esquerda, ela fica de pé ao lado do corpo e inclinada para fora; com `raise` (`to: "chest"`) fica contra o peito e o braço (params: size — escala —, strings — quantas cordas, 8 —, color)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")
- **raise / lower**: levar à frente do rosto ou do peito

### `arms.oilHorn`

Chifre de carneiro com azeite de unção, tampado embaixo, a boca estreita em cima com aro de bronze (30 cm). Pegável, pelo meio: segure na mão direita. Canal `pour`: 0 em pé, 1 virado com a boca para baixo (120°, girando na mão); passando de 0,6 cai da boca um fio de azeite dourado que balança (params: stream — comprimento do fio, 0,6 m —, color — do chifre)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")
- **set**: canais: pour
- Canais: `pour`

### `arms.shield`

Escudo: redondo de couro com borda e umbo de bronze, ou o grande escudo filisteu em pé (kind: round | tower); pegável, pela alça de trás (params: kind, size em metros, color, accent)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")

### `arms.sling`

Funda de pastor: duas cordas e a bolsinha de couro, pendurada da mão. Canais: `spin` (voltas, 0 a 1 é uma volta inteira, girando num plano em pé de frente para trás), `overhead` (1: as cordas saem quase deitadas da mão e `spin` gira em volta dela, como acima da cabeça; é o que a ação `whirl` faz) e `loaded` (1 com a pedra na bolsinha). Pegável, pelas pontas das cordas

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")
- **set**: canais: spin, loaded
- **whirl**: girar acima da cabeça, no compasso da mão (depois, "throw" com "with" solta a pedra)
- Canais: `spin`, `overhead`, `loaded`

### `arms.spear`

Lança de pé: haste de madeira, ponta de ferro em folha e ponteira no pé; pegável, segurada pela haste (params: length em metros, padrão 2.4; grip, altura da mão na haste)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")

### `arms.staff`

Cajado de pastor: vara comprida com a ponta curva em gancho; pegável, pela vara (params: length, padrão 1.7)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")

### `arms.stone`

Pedra lisa de riacho, pequena, do tamanho de um ovo; pegável. Canal `trail` (0 a 1): um rastro de ar atrás dela, para o voo (o `throw` liga sozinho e vira a pedra para onde ela vai) (params: size, color)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")
- **throw**: arremessar; o rastro aparece no voo
- Canais: `trail`

### `arms.sword`

Espada reta de ferro com guarda e punho de bronze; pegável, pelo punho, com a lâmina para cima e um pouco à frente (params: length da lâmina, padrão 0.7; color)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")

### `arms.tambourine`

Tamborim (adufe): aro de madeira com pele e platinelas, em pé de frente; pegável, pelo aro de baixo (params: size, o diâmetro, padrão 0.3; color da pele)

- **pickUp / putDown / putAway**: pegar, largar e guardar no bolso (com "pickable" ou "pocketOf")

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

### `nature.dust`

Nuvem de poeira que sobe do chão: um passo pesado, um corpo que cai, um impacto. Canal `puff` de 0 (nada) a 1 (já assentou): a poeira cresce, se espalha, sobe um pouco e some. Faça com `set` de 0 a 1 em 1 a 3 s, `ease: "out"`; o mesmo prop sobe de novo voltando a 0 (params: size, o raio quando cresce, em metros, padrão 1; color; seed)

- **set**: canais: puff
- Canais: `puff`

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
- `tunic`: Túnica até o joelho, de manga curta, com cinto estreito; a saia abre ao andar e cobre o colo sentado (color, accent no cinto e na barra). Ponha `pants` e `shoes` da cor da pele para pernas de fora
- `robe`: Manto longo até os tornozelos, de mangas compridas e largas: rei, sacerdote, mulher (color, accent na barra e nos punhos)
- `cloak`: Capa sobre os ombros, caindo pelas costas até a panturrilha, presa na frente (color, accent no broche e na barra)
- `sash`: Faixa larga de pano na cintura, com a ponta caindo do lado (color, accent numa listra)
- `sandals`: Sandálias de couro: sola e tiras sobre o pé e no tornozelo. Ponha `shoes` da cor da pele (color)
- `scaleArmor`: Couraça de escamas de bronze sobre o peito e a barriga, com ombreiras (color, accent nas escamas)
- `greaves`: Caneleiras de bronze, do joelho ao tornozelo (color)
- `bronzeHelmet`: Capacete de bronze redondo, com ponta, protetor de nuca e de rosto dos lados (color, accent na borda)
- `foreheadStone`: Pedra lisa cravada na testa, logo abaixo da borda do capacete: o Golias depois da funda (color)
- `plumedHelmet`: Capacete filisteu: faixa de bronze com uma coroa de penas ou juncos em pé (color nas penas, accent na faixa)
- `crown`: Coroa simples de ouro: um aro com pontas baixas (color)
- `headband`: Faixa de pano em volta da cabeça, na testa, com o nó atrás (color)
- `headwrap`: Pano cobrindo a cabeça e caindo nas costas e dos lados, sobre o cabelo (color, accent numa faixa na testa)
- `shepherdBag`: Alforje de pastor: bolsa de couro do lado esquerdo do quadril, com a alça cruzando o peito (color, accent na tampa)
- `scabbard`: Espada embainhada no quadril esquerdo: bainha de couro e o punho à mostra (color na bainha, accent no metal)
- `scabbardEmpty`: Só a bainha no quadril esquerdo, sem a espada (depois de tirá-la) (color, accent no metal)

## Janelas (`frame` numa abertura, ou `windows` no local)

- `fixed`, `sliding`, `tilt`, `casement`, `louver`, `blinds`: todas com o canal `open`, movido por **open / close** (a `fixed` não se mexe).
