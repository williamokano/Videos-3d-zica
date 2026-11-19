# Bíblia da história: HORA CONTADA

**HORA CONTADA.** Série vertical curta para o canal historinhas.animadas.3d ("para ver em família"). Cada episódio abre com uma regra da cidade ("Nesta cidade, todo mundo..."), e a história segue o que o público escolher nos comentários. Esta bíblia guarda o que não pode ser contradito: as regras do mundo, os personagens, as tramas paralelas prontas para usar e o cânone. O pedido do autor está, como ele escreveu, em [`roteiros/001-pedido.md`](roteiros/001-pedido.md). O visual vai para `bible.json`.

**Original, não refilmagem.** A ideia de "tempo é dinheiro" pode ser usada. Personagens, nomes, enredo, cenas e visual são nossos: nada do filme "O Preço do Amanhã" (In Time), nem cena reconhecível dele (a mãe correndo para o ônibus, briga de braço, roubo de banco, cofre de um milhão de anos).

## Premissa

Em São Paulo, todo mundo nasce com um relógio na pele do antebraço. Até os 25 anos ele marca **1 ano** e não se mexe. No dia em que a pessoa faz 25, à meia-noite, sente uma pressão no braço e o número começa a cair. Daí em diante tudo se paga em tempo: o ônibus, o pastel, o aluguel. Quando o relógio chega a zero, a pessoa morre.

**Caio** tem 24 anos e faz entregas de bicicleta. A série começa na véspera dos 25 dele, antes de ele ter que se preocupar em guardar tempo.

## Regras do mundo

1. **O relógio no braço.**
   - Fica na parte de dentro do antebraço esquerdo, como números de luz por baixo da pele. **Sugestão de visual:** algarismos brancos levemente dourados, com o formato `1a 000d 00:00:00` (anos, dias, horas:minutos:segundos). Não usar algarismos verdes em fileira, como no filme.
   - Quem tem muito tempo mostra o número inteiro: `318a 112d 07:14:22`.
   - Brilha mais forte quando o tempo é pouco (menos de um dia) e pisca nos últimos minutos.
2. **Até os 25, 1 ano parado.** O ano do braço não desce e não pode ser gasto, nem transferido. As crianças vivem repetindo isso: "tenho um ano no braço e não posso usar nada".
3. **Aos 25, a pressão.** Na meia-noite do aniversário, a pessoa sente um aperto no braço e no peito, como uma mão fechando. Dura um segundo. O relógio começa a contar para baixo e não para mais.
4. **Tempo é dinheiro.** Salário, gorjeta, preço, dívida e aluguel são em tempo. Os preços aparecem em placas e telas: "Pastel 6 min", "Passagem 11 min", "Aluguel 4 dias".
5. **O cofre.** Ninguém com juízo anda com tudo no braço.
   - O **cofre** é onde se guarda tempo fora do corpo: pelo app no celular, ligado a uma conta no banco ("Caixa do Tempo"), ou num cartão.
   - **É com o cofre que a gente comum paga** ônibus, corrida de app, entrega e mercado, encostando o celular ou o cartão na maquininha.
   - **Quem tem menos de 25** recebe o que ganha no cofre. Pode gastar dali desde cedo, mas o ano do braço continua travado.
   - Passar tempo do cofre para o braço, ou do braço para o cofre, é encostar o braço no celular ou na maquininha e confirmar.
   - **Defesa:** braço cheio na rua chama ladrão. Por isso o pobre e a classe média andam com pouco no braço, quase sempre de **manga comprida**.
6. **Os ricos andam de braço à mostra.** Décadas, séculos e alguns até milênios no braço, de manga curta, sem medo. Não se misturam com quem tem pouco. Não são vilões de desenho: só não olham para baixo.
7. **Segregação, sem muro.** Ricos, classe média e pobres moram na mesma cidade, em bairros diferentes. Cruza-se a cidade de ônibus ou de bicicleta, mas o condomínio tem portaria, o elevador de serviço é outro e ninguém de manga comprida entra na loja de vitrine sem ser olhado.
   - **Lá fora é diferente.** Dizem que nos países ricos dividiram as cidades em zonas, com pedágio de tempo para passar de uma a outra. Aqui não. É só um comentário no mundo, nunca uma cena.
8. **Inflação.** Os preços sobem aos poucos, e todo mundo percebe: "semana passada a passagem era nove minutos". De vez em quando, um episódio mostra uma placa com preço novo.
9. **Zero.** Quando o relógio chega a zero, a pessoa morre na hora, sem dor. **Família:** a morte nunca aparece. O suspense fica nos últimos segundos do número, e a cena corta antes (para a reação de quem vê, para um som, para preto).
10. **Sem crime elaborado.** Nada de assalto a banco, máfia ou golpe de cinema. A série é sobre gente comum se virando, e o fim será simples (decisão do autor).

## Tom

Drama de família com humor de rua, como uma crônica da periferia de São Paulo: gente que se ajuda, se zoa e conta minuto. A tensão vem dos números (quanto falta, quanto custa) e das escolhas, não da violência. A pobreza é mostrada com respeito, nunca como piada.

## Linguagem

- Português de São Paulo, coloquial: "mano", "tá ligado", "suave", "quebrada", "véi" (o Juninho), "meu filho" (a mãe).
- Gírias de tempo, inventadas para o mundo (usar com moderação):
  - "tá no zero" é estar sem nada;
  - "me arruma uns minutos" é pedir ajuda;
  - "braço cheio" é ter muito tempo;
  - "virar" é fazer 25 e o relógio começar ("o Caio vira amanhã").

## Estrutura de cada episódio

- Gancho em 0–3 s, sempre no formato **"Nesta cidade, todo mundo..."** (ou "Nesta cidade, quando você..."), dito pelo narrador por cima de uma imagem que mostra a regra.
- Tela de abertura "HORA CONTADA" com o número e o título do episódio, depois do gancho.
- Duração de 2 a 3 minutos (Instagram corta em 3:00).
- Pico entre 75% e 90%. O fim corta na pergunta, com o cartão final e o narrador.
- Legendas embutidas sempre.

## Câmera

Terceira pessoa, cinematográfica (lições em `tasks/lessons.md`).

- **O braço é o plano mais importante da série.** Close no antebraço, com o número legível no terço central do quadro, em todo momento de dinheiro ou de virada.
- Na rua, a câmera segue o Caio de bicicleta, mais afastada e deslizando.
- Os bairros ricos, em planos largos e limpos, de baixo. A quebrada, na altura dos olhos, com gente e movimento ao redor.

## Lugares

Bairros inventados; a cidade é São Paulo.

- **Jardim Esperança** (zona leste), onde o Caio mora:
  - rua de ladeira com casas de bloco sem reboco, lajes, fios, um bar, a padaria;
  - a casa da família: cozinha pequena e a laje, de onde se vê a cidade à noite.
- **Centro / avenida:**
  - o farol (semáforo) onde as crianças pedem minutos;
  - o ponto de ônibus com a placa de preço;
  - a lanchonete de onde saem as entregas, com placa de preços em minutos.
- **Alto das Torres**, o bairro rico:
  - prédios altos de vidro, portaria com cancela, árvores podadas;
  - gente de manga curta com séculos no braço.
- Reaproveitar do motor: a rua, o ônibus, a viatura, a bicicleta, a bag de entrega, o celular e a escola (séries `ceu-vermelho`, `demo-acoes` ep. 3 e o Selado).

## Personagens

A ficha completa de cada um vai para `characters/<id>.md` e `characters/<id>.json` (skill `create-character`). Todos os nomes são **sugestão**: o autor pode trocar.

| Quem | Aparência | Como fala | O que quer | Nunca |
|---|---|---|---|---|
| **Caio Mendes**, 24 (vira 25 no ep. 1), entregador de bicicleta | magro, moreno, cabelo crespo baixo, moletom cinza de manga comprida, bag de entrega vermelha nas costas | rápido, brincalhão, "mano", "suave"; quando o assunto é sério, fala pouco | que a mãe pare de se matar de trabalhar; "guardar tempo pra viver depois" | rouba; pede tempo emprestado a rico |
| **Dona Rosa**, mãe, 49 | baixa, cabelo preso, uniforme de diarista, sempre de manga comprida | "meu filho", prática, muda de assunto quando o assunto é ela | que os filhos não passem pelo que ela passa | mostra o braço; aceita ajuda sem brigar |
| **Bia**, irmã, 10 | trancinhas, camiseta da escola | esperta, pergunta tudo ("quanto custa um ano?") | ter 25 logo para "poder usar" o ano dela | fica quieta |
| **Juninho**, melhor amigo, 27 | forte, boné, camisa de time, dirige para aplicativo | "véi", zoeiro, conta tudo em minuto ("isso aí é meia hora de corrida") | arrumar um carro próprio | deixa um amigo na mão |
| **Dona Vera Albuquerque**, cliente rica do Alto das Torres | cabelo grisalho bem cortado, vestido de linho sem manga, `318a` no braço | educada e distante; fala com o Caio sem olhar para ele | que nada mude | dá gorjeta de mais de um minuto |
| **Menino do farol**, ~15 | camiseta larga, chinelo | rápido, respondão, engraçado | uns minutos para comer | se faz de coitado |

## Tramas paralelas prontas (para usar quando o público não decidir)

Cada uma rende de um a três episódios e conversa com as regras acima. Nenhuma é cânone até entrar num episódio.

1. **A passagem subiu.** A tarifa vai de 11 para 14 minutos de um dia para o outro. A quebrada se junta para dividir corridas, e o Juninho vira a "van" do bairro.
2. **O golpe do cofre.** A Dona Rosa recebe uma mensagem "do banco" pedindo para confirmar o cofre. O Caio percebe a tempo, ou não. É golpe de celular, nada de assalto.
3. **O agiota de minuto.** O "Seu Nonato" do bar empresta tempo a juros por hora. Alguém da família pega e a dívida cresce sozinha no braço.
4. **A bombinha da Bia.** A Bia tem asma, e o remédio dobra de preço. Quanto custa um mês de remédio contra uma semana de aluguel?
5. **O filho da Dona Vera.** O Rodrigo tem 24, como o Caio, e vai virar com 50 anos de herança no braço. Uma amizade improvável entre os dois, mostrando os dois lados da cidade.
6. **A vaquinha da quebrada.** Alguém do bairro está perto do zero, e a rua inteira faz uma vaquinha de minutos, cada um encostando o braço na maquininha do bar.
7. **O emprego no Alto das Torres.** A Dona Vera oferece ao Caio um trabalho fixo de motorista, que paga bem e o obriga a ver de perto como os ricos vivem.
8. **O ano da Bia.** A Bia quer "vender" o ano dela, que não pode ser usado. Alguém na internet diz que compra. É mentira, claro, e é uma lição sobre golpe.

## Pontas soltas (não responder sem decidir com o autor)

- **O pai do Caio e da Bia.** Não aparece. **Sugestão:** foi embora trabalhar fora e mandava tempo, até parar de mandar. Não zerou. Assim o tom fica de família, e o público teoriza.
- Quanto, exatamente, a Dona Rosa tem no braço, e desde quando ela esconde isso.
- O que o Caio faz com o cofre na meia-noite dos 25 (pergunta do ep. 1 ao público).

## Cânone

| Ep. | Fato fixo |
|---|---|
| — | (preencher quando cada episódio for aprovado) |
