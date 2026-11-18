# Bíblia da história — DAVI

**DAVI — Uma história de coragem e destino.** Primeira temporada em cinco episódios curtos, de 1 Samuel 16 a 18:11. Esta bíblia guarda só o que não pode ser contradito e as liberdades que a série toma. O visual (céu, cor, estilo) está em `bible.json`. As orientações do autor estão, como ele escreveu, em [`roteiros/orientacoes-do-autor.md`](roteiros/orientacoes-do-autor.md), e as imagens de referência em `referencias/`.

| Ep. | Título | História | Meta |
|---|---|---|---|
| 1 | O escolhido | Samuel unge Davi na casa de Jessé | 2:35 |
| 2 | O rei e o pastor | Saul atormentado; Davi entra na corte com a harpa | 2:30 |
| 3 | Quarenta dias | Golias desafia Israel; Davi chega e convence o Saul | 2:40 |
| 4 | O gigante | A armadura, as pedras, o confronto, o silêncio e o grito | 2:40 |
| 5 | De herói a ameaça | O povo celebra, o Jônatas faz aliança, o Saul inveja e atira a lança | 2:40 |

**Cronologia cinematográfica.** Os capítulos 16 e 17 contam a relação entre Davi e Saul de maneiras diferentes. A série segue uma ordem só: a unção, depois a entrada na corte e depois a batalha. O Davi vai e volta entre a corte e as ovelhas (17:15). Por isso o Saul já o conhece no vale, e a pergunta "de quem é filho esse rapaz?" (17:55) não aparece.

## Regras do mundo

1. **Fiel ao texto, com liberdade criativa.** Nada contradiz a Bíblia, e o que cada um diz e faz no texto acontece. Pode-se acrescentar:
   - conversa entre personagens que o texto põe na cena (os irmãos, os soldados, o Abner, os servos);
   - pequenos gestos e reações (um olhar, uma mão no ombro);
   - figurantes e detalhes de lugar.

   Não se acrescentam fatos novos que mudem a história: nada de morte, milagre ou motivo que o texto não tenha. Toda liberdade fica marcada **[Liberdade]** no roteiro, para o autor decidir. Os diálogos cotidianos são dramatização, não transcrição.
2. **Tratamento:**
   - **Formal** ("tu", "vós", "teu servo") nas falas célebres e de cerimônia, na forma tradicional que o público conhece. Exemplos: "Escolhei entre vós um homem!" e a resposta do Davi, que é sempre "Tu vens contra mim com espada, lança e escudo; eu, porém, vou contra ti em nome do Senhor dos Exércitos".
   - **Natural**, em português do Brasil, no dia a dia (entre irmãos, entre soldados).
   - **Sem exagerar nas falas religiosas:** as frases bíblicas importantes ficam, e o resto é fala de gente.
3. **Deus não aparece e não fala.** Não há voz do céu, luz sobrenatural ou milagre visível. O "É este" da unção sai da boca do Samuel. O "espírito mau" que atormenta o Saul aparece só no comportamento dele. A fé aparece no que o Davi diz e faz.
4. **Tom:** épico histórico, contido. Começa contemplativo, cresce em tensão e culmina em cenas de grande impacto. Pode ter humor leve (a armadura que não serve), nunca deboche do texto.
5. **Davi não é super-herói:** é um jovem comum, com coragem, habilidade com a funda e convicção. **Golias não é monstro:** é um guerreiro humano, enorme e experiente. **O medo dos soldados** é o coração do drama.
6. **Violência:** sem sangue na tela. A pedra acertando e a queda do Golias podem ser mostradas. A espada e a cabeça ficam fora do quadro: corte antes do golpe e planos do peito para cima. A lança do Saul (ep. 5): o arremesso aparece, vindo na direção da câmera, do lugar do Davi; o que ela acerta, não. Corta antes, e o impacto é só som (decisão do autor, 2026-11-18).
7. **Escala:** o Golias tem 3,1 m (decisão do autor, entre 3 e 3,2 m). Todo plano com ele e outra pessoa mostra a diferença.
8. **Duração:** no máximo 3:00 por episódio (Instagram), com meta de 2:40.
9. **Estrutura de cada episódio:**
   - gancho em 0–5 s;
   - contexto até 35 s;
   - desenvolvimento até 1:50;
   - clímax até 2:35;
   - desfecho e gancho para o próximo nos últimos 5–10 s.

   Nunca abrir com "Há três mil anos...".
10. **Identidade:** tela de abertura "DAVI — Uma história de coragem e destino", com o número e o título do episódio, por cima da primeira cena, depois do gancho. Legendas embutidas sempre.
11. **Narração:** voz masculina grave, pouca. Os personagens contam a história.

## Câmera

Terceira pessoa e cinematográfica; nada de primeira pessoa nesta série.

- **Golias:** sempre de baixo para cima.
- **Davi:** na altura dos olhos.
- **Grua:** para mostrar o vale inteiro e o tamanho das coisas.
- **Órbita lenta e curta:** em volta de quem conversa num momento importante, com os dois na linha da câmera (no vertical o campo lateral é estreito).
- **Câmera na mão:** nas corridas, com tremor leve (0.1). Tremor forte só por instantes.
- **Câmera lenta:** só para a pedra.
- **Cortes rápidos:** entre reações no pico.
- **Lugar fechado:** a câmera não entra nem atravessa pano ou parede. Filma pela abertura.

## Lugares

Cenários bem detalhados, com vida e som próprios:

- **Belém** (eps. 1, 2 e 3; no ep. 3, um canto de Belém dentro de `vale-de-ela.json`, com a mesma casa de Jessé, gerada por `world/casa_jesse.py`):
  - colinas de pasto com rebanho e pedras;
  - o portão onde ficam os anciãos;
  - casas de pedra e barro;
  - a casa de Jessé por dentro, à noite, com lamparinas de barro e mesa baixa.
- **Palácio do Saul em Gibeá** (eps. 2 e 5):
  - salão do trono de pedra com colunas, tochas, trono, porta grande e uma janela para a praça;
  - pátio de entrada.
- **Vale de Elá** (eps. 3 e 4):
  - dois montes frente a frente, de terra clara com arbustos secos, pedras grandes e oliveiras esparsas;
  - um vale largo no meio, com um riacho raso de pedras lisas e capim verde nas margens;
  - neblina baixa de manhã e luz dourada à tarde.
- **Fila de batalha de Israel:** na beira do monte, com escudos redondos, lanças, estandartes e soldados de túnica e couro.
- **Acampamento de Israel:**
  - tendas de pano cru e marrom, carroças, burros, fogueiras, sacos de grão, jarros;
  - o guarda das bagagens.
- **Tenda do rei Saul:** tapetes, almofadas, baús, mesa baixa com jarra, lança e luz entrando pela abertura.
- **Monte dos filisteus:** com as tendas deles, os estandartes e os soldados de capacete de penacho.
- **Gibeá, a cidade do rei** (ep. 5, `world/gibea.json`): a estrada, o portão de pedra, a praça da festa com casas de terraço, palmeiras, um poço e fogueiras; no lado norte, o palácio, com o mesmo salão do trono dos eps. 1 e 2, agora com a porta e uma janela dando para a praça.

## Personagens

A ficha completa de cada um está em `characters/<id>.md` (personalidade, como fala, arco, cânone, voz) e `characters/<id>.json` (aparência, voz e dados fixos em `profile`), com a folha aprovada em `referencias/folhas/`. Não mude sem o autor. A tabela abaixo é o resumo.

| Quem | Aparência | Como fala | O que quer | Nunca |
|---|---|---|---|---|
| **Davi**, pastor, 17–20 anos | castanho-avermelhado em cachos curtos, porte atlético, túnica de pastor em tons de terra, bolsa e cajado | direto, curioso, frases curtas; fala de Deus como de alguém que conhece | servir; que alguém defenda a honra de Deus | se gaba; age como guerreiro experiente; demonstra medo do gigante |
| **Golias**, filisteu de Gate | 3,1 m, barba e cabelo escuros, couraça de escamas de bronze, caneleiras, capacete | grita, debocha, ri | humilhar Israel | leva o Davi a sério |
| **Saul**, rei | 1,95 m, barba escura, manto real roxo e vermelho com dourado, coroa | formal; atormentado; depois desconfiado e ciumento | manter o reino e a paz da própria cabeça | desce ao vale |
| **Samuel**, profeta | idoso, barba e cabelo brancos, roupa simples | pouco, firme, com autoridade natural | cumprir o que o Senhor manda | se impressiona com aparência |
| **Jessé**, pai | idoso, barba grisalha, manto marrom e lenço | prático, orgulhoso dos mais velhos | o bem dos filhos | — |
| **Eliabe**, primogênito | alto, forte, túnica azul | bravo, seco, mandão | ser o escolhido; que o caçula volte para as ovelhas | elogia o irmão em voz alta |
| **Abinadabe**, **Samá**, **Natanael**, **Radai**, **Ozém**, **Eliú**, os outros irmãos | túnicas de cores próprias | Abinadabe irônico; Samá mais leve | — | — |
| **Abner**, comandante | couraça, barba | prático, curto, "majestade" | servir o rei | contradiz o rei de frente |
| **Jônatas**, filho do Saul | túnica branca e manto azul | calmo, sincero, poucas palavras | a amizade do Davi | tem inveja do Davi |
| **Servo do Saul**, **guardas**, **anciãos de Belém**, **guarda das bagagens**, **escudeiro do Golias**, **soldados**, **povo** | — | — | — | — |

## Pontas soltas (segunda temporada)

- A lança do Saul: o Davi se desvia (18:11), mas a série corta antes de ela chegar, no som do impacto.
- A amizade com o Jônatas, a perseguição do Saul, a fuga do Davi, a recusa dele em matar o rei e a coroação.

## Cânone

| Ep. | Fato fixo |
|---|---|
| 1 | Samuel vai a Belém; os anciãos temem. Os sete filhos de Jessé passam diante dele e nenhum é escolhido ("o Senhor olha para o coração"). Mandam buscar o caçula no campo; o Samuel o unge no meio dos irmãos. O Eliabe fica ofendido. O Saul, sozinho, é atormentado. |
| 2 | Um servo indica o Davi ("valente, sábio nas palavras, o Senhor está com ele"). O Jessé o manda com presentes. A harpa acalma o Saul, que faz do Davi seu escudeiro. Os filisteus se reúnem em Socó. |
| 3 | O Golias desafia Israel por 40 dias. O Jessé manda o Davi com grão, pães e dez queijos (ele deixa as ovelhas com um guarda e leva o jumento). O Davi chega, ouve o desafio e a recompensa, pergunta "quem é esse filisteu?", leva bronca do Eliabe, e um soldado conta ao Saul. O Saul o reconhece como seu escudeiro; o leão e o urso. "Vai, e que o Senhor esteja contigo." O cajado do Davi fica com a carga, no acampamento. |
| 4 | A armadura recusada, as cinco pedras, "Tu vens contra mim...". A pedra acerta a testa e o Golias cai de rosto. Silêncio. A espada (fora do quadro). Os filisteus fogem; Israel grita e persegue. |
| 5 | O povo canta "Saul derrotou os seus milhares, e Davi, os seus dez milhares". O Jônatas dá ao Davi manto, espada, arco e cinto e faz aliança. O Saul ouve a canção e passa a invejar. Numa noite, enquanto o Davi toca, o Saul atira a lança. Fim da temporada. |
