import { direct } from '../../../src/engine/timeline/direct';
import { IRMAOS, LINHA, TOPO, atentos, encolhem, filaDeIsrael, filaFilisteia, ids, rodaDaFogueira } from '../cena';

/*
 * Episódio 1, "Cinco pedras". Roteiro de trabalho em series/davi-e-golias/roteiros/001-roteiro.md (as cenas
 * abaixo têm os mesmos números); regras da história em series/davi-e-golias/biblia.md.
 *
 * Sem áudio por enquanto (pedido do autor): as falas não têm voz gravada e duram o que o texto pede.
 *
 * O Golias desafia Israel pelo 40º dia. Davi chega com comida para os irmãos, ouve a recompensa, leva bronca do
 * Eliabe, convence o Saul, recusa a armadura, pega cinco pedras no riacho, responde ao gigante e solta a pedra.
 * Corta com a pedra no ar.
 */

const fila = filaDeIsrael();
const filisteus = filaFilisteia();
const fogueira = rodaDaFogueira('fogueira', [-10, -39.5], 501);
const tropa = ids(fila);
// Quem fala na fila: dois da frente, perto dos irmãos, e um de trás, que corre contar ao rei.
const S1 = 'israel-6';
const S2 = 'israel-5';
const S3 = 'israel-12';

/** Onde o Davi entra no acampamento, pela trilha que vem do norte (de Belém). */
const TRILHA: [number, number] = [-9, -60];

export default direct(
  {
    episode: 1,
    title: 'Cinco pedras',
    location: 'vale-de-ela',
    cast: [
      { character: 'golias', at: [0, 18], yaw: 0 },
      { character: 'escudeiro', at: [-1.4, 16.6], yaw: 0 },
      { character: 'davi', at: TRILHA, yaw: 180 },
      { character: 'guarda', at: [-14.6, -40.6], yaw: -110 },
      { character: 'sama', at: [...IRMAOS.sama], yaw: 180 },
      { character: 'eliabe', at: [...IRMAOS.eliabe], yaw: 180 },
      { character: 'abinadabe', at: [...IRMAOS.abinadabe], yaw: 180 },
      { character: 'saul', at: [0, -47.5], yaw: 180, seated: 0.2 },
      { character: 'abner', at: [1.8, -46.5], yaw: 200 },
      ...fila,
      ...fogueira,
      ...filisteus,
    ],
    props: [
      { id: 'lanca-golias', asset: 'arms.spear', pos: [0.45, 17.7], params: { length: 3.6 }, pickable: true },
      { id: 'escudo-golias', asset: 'arms.shield', pos: [-1.05, 16.3], params: { kind: 'tower', size: 1.25 }, pickable: true },
      { id: 'cajado', asset: 'arms.staff', pos: [TRILHA[0] + 0.45, TRILHA[1] + 0.3], pickable: true },
      { id: 'cesto', asset: 'ancient.basket', pos: [TRILHA[0] - 0.4, TRILHA[1] + 0.3], params: { bread: 1 }, pickable: true },
      { id: 'funda', asset: 'arms.sling', pos: [0, 0], pocketOf: 'davi' },
      // As cinco pedras lisas, na beira do riacho.
      ...[[-2.1, -2.15], [-1.85, -2.05], [-1.6, -2.15], [-1.4, -2.25], [-1.95, -2.3]].map(([x, z], i) => ({
        id: `pedra${i + 1}`, asset: 'arms.stone', pos: [x, z] as [number, number], pickable: true,
      })),
    ],
  },
  (d) => {
    const golias = d.actor('golias');
    const escudeiro = d.actor('escudeiro');
    const davi = d.actor('davi');
    const guarda = d.actor('guarda');
    const [sama, eliabe, abinadabe] = [d.actor('sama'), d.actor('eliabe'), d.actor('abinadabe')];
    const [saul, abner] = [d.actor('saul'), d.actor('abner')];
    const [s1, s2, s3] = [d.actor(S1), d.actor(S2), d.actor(S3)];

    // ---- O mundo vivo desde o primeiro quadro ----
    atentos(d, [...tropa, 'sama', 'eliabe', 'abinadabe'], 'golias', 'worried');
    atentos(d, ids(filisteus), 'golias', 'happy');
    for (const id of ids(fogueira)) d.actor(id).behave('chat', { group: 'fogueira', mood: 'worried' });
    guarda.behave('idle');
    saul.behave('idle', { mood: 'worried' });
    abner.behave('attend', { object: 'saul' });
    escudeiro.behave('attend', { object: S1 });
    golias.behave('attend', { object: S1, mood: 'happy' });
    davi.behave('idle');
    // Enquanto a câmera está no vale, o Davi pega o cajado e o cesto na trilha.
    d.background(() => {
      davi.pickUp('cajado', { hand: 'left' });
      davi.pickUp('cesto', { hand: 'right' });
    });

    // ---- 1. O desafio (0:00) ----
    // Rente ao chão do vale; uma pedrinha treme a cada passo. A câmera sobe pelo corpo até o rosto, que já grita.
    d.camera.cut({ pos: [1.3, 0.3, 8.6], lookAt: [0.2, 0.25, 12.5], fov: 50, shake: 0.35 });
    d.together(
      () => {
        escudeiro.pickUp('escudo-golias', { hand: 'left' });
        escudeiro.walkTo([-1.4, 10.8], { speed: 1.1 });
      },
      () => {
        golias.pickUp('lanca-golias', { hand: 'right' });
        d.background(() => golias.say('Escolham um homem! E que ele desça até mim!', { tone: 'grito', gesture: 0.4 }));
        golias.walkTo([0, 12.6], { speed: 1.1 });
        d.camera.moveTo({ pos: [1.9, 1.7, 8.0], lookAt: [0, 2.2, 12.6], fov: 50, shake: 0.2 });
      },
    );
    d.camera.moveTo({ pos: [1.6, 2.3, 8.4], lookAt: [0, 2.95, 12.6], fov: 48, shake: 0 });
    golias.behave('attend', { object: S1, mood: 'happy' });
    escudeiro.behave('attend', { object: S1 });

    // Contraplano: a fila de Israel na beira do monte, que recua toda junta.
    d.camera.cut({ pos: [9.5, TOPO + 1.9, -28.5], lookAt: [1, TOPO + 1.2, -36], fov: 45 });
    encolhem(d, tropa, 1);
    d.wait(0.6);
    d.camera.moveTo({ pos: [-4, TOPO + 1.8, -30], lookAt: [-6, TOPO + 1.4, -36], fov: 42 });
    s1.say('Quarenta dias. Toda manhã ele desce.', { tone: 'sussurro', to: S2, gesture: 0.1 });
    s2.say('E toda tarde de novo.', { tone: 'sussurro', to: S1, gesture: 0.1 });
    s1.say('Olha aquilo. Bronze da cabeça aos pés.', { tone: 'sussurro', gesture: 0.1 });

    // ---- 2. A aposta e o pastor (0:15) ----
    d.camera.cut({ pos: [-2.4, 0.9, 7.4], lookAt: [0, 3.3, 12.6], fov: 55 });
    golias.say('Se ele me vencer, nós seremos escravos de vocês. Se eu vencer... vocês serão nossos!', { tone: 'grito', gesture: 0.6 });
    d.do('golias', 'move', { name: 'cheer', amount: 0.8 }, { duration: 0.5 });
    // Corte para a trilha atrás do acampamento: um rapaz ruivo sobe com o cesto. O eco chega até ele.
    d.background(() => {
      d.wait(1.2);
      d.camera.cut({ pos: [-5.6, TOPO + 1.4, -52.5], lookAt: [-9.2, TOPO + 1.1, -57], fov: 46 });
      davi.walkTo([-9.6, -54], { speed: 1.3 });
      davi.lookAt([0, 3, 12], { duration: 0.5 });
      d.wait(0.8);
      davi.lookAhead({ duration: 0.3 });
    });
    golias.say('Hoje eu desafio o exército de Israel!', { tone: 'laughs', gesture: 0.3 });
    d.do('golias', 'move', { name: 'cheer', amount: 0 }, { duration: 0.6 });
    d.wait(3.4);

    // ---- 3. O acampamento (0:32) ----
    // Ele não se assusta: aperta o passo, entre as tendas, até o guarda das bagagens.
    d.camera.thirdPerson(davi, { distance: 3.4, height: 0.3, fov: 50 });
    // [Liberdade] Na fogueira, os soldados falam do gigante enquanto o Davi passa.
    d.background(() => {
      d.wait(1.5);
      d.actor('fogueira-1').say('Toda manhã é isso. Ele grita, e a gente treme.', { tone: 'cansado', gesture: 0.4 });
      d.actor('fogueira-2').say('E o rei? Não faz nada?', { gesture: 0.5 });
      d.actor('fogueira-3').say('O rei tá na tenda. Faz quarenta dias que tá na tenda.', { tone: 'sussurro', gesture: 0.3 });
    });
    davi.walkTo([-12.3, -41.4], { speed: 1.6 });
    davi.turnTo([-14.6, -40.6]);
    guarda.lookAt(davi, { duration: 0.4 });
    d.camera.cut({ pos: [-10.2, TOPO + 1.55, -38.9], lookAt: [-13.6, TOPO + 1.35, -41.4], fov: 42 });
    davi.say('Guarda isso pra mim? É dos filhos de Jessé, de Belém.', { to: guarda });
    davi.putDown('cesto', [-12.85, TOPO + 0.02, -41.75]);
    guarda.say('Mais comida? Põe ali. Teus irmãos tão na linha de frente.', { tone: 'cansado', to: davi });
    davi.say('O que foi aquele grito?', { to: guarda });
    guarda.say('Vai lá ver. Mas não vai muito pra frente, não.', { to: davi, gesture: 0.5 });
    guarda.behave('attend', { object: 'davi' });

    // ---- 4. Os irmãos (0:50) ----
    d.camera.thirdPerson(davi, { distance: 3.2, height: 0.2, fov: 54, shake: 0.3 });
    const corrida = davi.runTo([4.4, -LINHA - 2.1], { speed: 3.6 });
    d.at(corrida.end - 2.6);
    davi.say('Eliabe! Abinadabe! Samá!', { tone: 'animado', gesture: 0 });
    d.waitFor(corrida);
    davi.behave('idle');
    d.camera.cut({ pos: [7.8, TOPO + 1.5, -38.6], lookAt: [3.6, TOPO + 1.4, -36.4], fov: 44 });
    d.together(() => sama.turnTo([4.4, -38]), () => eliabe.turnTo([4.4, -38]), () => abinadabe.turnTo([4.4, -38]));
    for (const irmao of ['sama', 'eliabe', 'abinadabe']) d.actor(irmao).behave('attend', { object: 'davi' });
    davi.say('Paz pra vocês!', { gesture: 0.6 });
    sama.say('Davi? O que você tá fazendo aqui?', { tone: 'surprised', to: davi });
    davi.say('O pai mandou grão e pão. E dez queijos pro comandante de vocês. Ele quer um sinal de que vocês tão bem.', { to: sama, gesture: 0.5 });
    abinadabe.say('Diz pra ele que a gente tá vivo. Por enquanto.', { tone: 'ironico', to: davi });

    // O grito do Golias corta a conversa. A fila recua; dois soldados largam a posição e correm para trás.
    d.camera.cut({ pos: [1.5, 1.2, 8.0], lookAt: [0, 3.1, 12.6], fov: 40 });
    golias.say('Ninguém?! Israel inteiro e nenhum homem?!', { tone: 'grito', gesture: 0.5 });
    d.camera.cut({ pos: [4.8, TOPO + 1.55, -40.6], lookAt: [4.4, TOPO + 1.45, -37.6], fov: 40 });
    encolhem(d, [...tropa, 'sama', 'eliabe', 'abinadabe'], 1);
    d.background(() => {
      d.actor('israel-8').runTo([12.5, -43], { speed: 3.2 });
      d.actor('israel-8').behave('watch', { point: [0, 3, 12], mood: 'scared' });
    });
    d.background(() => {
      d.wait(0.3);
      d.actor('israel-9').runTo([15, -44], { speed: 3.4 });
      d.actor('israel-9').behave('watch', { point: [0, 3, 12], mood: 'scared' });
    });
    davi.lookAt([0, 3, 12], { duration: 0.6 });
    d.wait(1.6);

    // ---- 5. A recompensa (1:15) ----
    encolhem(d, [...tropa, 'sama', 'eliabe', 'abinadabe'], 0);
    d.camera.cut({ pos: [1.2, TOPO + 1.5, -40.2], lookAt: [3.2, TOPO + 1.45, -36.6], fov: 42 });
    davi.lookAt(s1, { duration: 0.4 });
    s1.say('Viu aquele homem? Ele sobe pra afrontar Israel. O rei prometeu: quem matar o gigante fica rico.', { to: davi });
    s2.say('Casa com a filha do rei.', { to: davi });
    s1.say('E a casa do pai dele nunca mais paga imposto.', { to: davi });
    davi.say('O que vão dar pra quem matar esse filisteu e tirar essa vergonha de Israel?', { to: s1 });
    s1.say('Acabei de dizer.', { tone: 'ironico', to: davi });
    d.camera.moveTo({ pos: [3.4, TOPO + 1.6, -40.2], lookAt: [4.4, TOPO + 1.5, -37.4], fov: 34 });
    davi.say('E quem é esse filisteu, pra desafiar o exército do Deus vivo?', { tone: 'firme', gesture: 0.4 });

    // Silêncio na fila. O Eliabe vem por trás do irmão. [Liberdade: no texto ele só fala.]
    d.wait(0.8);
    eliabe.walkTo([4.0, -36.6], { speed: 1.6 });
    eliabe.turnTo([4.4, -37.6]);
    eliabe.express('angry');
    d.camera.cut({ pos: [6.6, TOPO + 1.6, -38.8], lookAt: [4.2, TOPO + 1.5, -37.1], fov: 40 });
    eliabe.say('O que você tá fazendo aqui? E as poucas ovelhas, deixou com quem no deserto?', { tone: 'bravo', to: davi, gesture: 0.7 });
    eliabe.say('Eu te conheço. Conheço teu orgulho. Você veio pra ver a guerra.', { tone: 'bravo', to: davi, gesture: 0.5 });
    davi.say('E o que foi que eu fiz agora? Foi só uma pergunta.', { to: eliabe });
    eliabe.express('neutral');
    eliabe.behave('attend', { object: 'davi', mood: 'worried' });

    // Davi se solta e vai até outro soldado.
    d.camera.cut({ pos: [-1.2, TOPO + 1.6, -40.8], lookAt: [-2.4, TOPO + 1.4, -37.6], fov: 44 });
    const ate3 = davi.walkTo([-2.4, -38.6], { speed: 1.4 });
    d.at(ate3.start + 0.8);
    s2.say('Deixa o menino, Eliabe.', { tone: 'cansado', gesture: 0.3 });
    d.waitFor(ate3);
    davi.turnTo([-3.3, -37.4]);
    s3.turnTo([-2.4, -38.6]);
    davi.say('E você? O que o rei vai dar?', { to: s3 });
    s3.say('O mesmo que te disseram, rapaz. Por quê? Tá pensando em ir?', { to: davi });
    // Ele olha bem para o Davi e sai correndo para a tenda do rei.
    d.background(() => {
      s3.runTo([1.4, -43.6], { speed: 3.2 });
      s3.turnTo([0, -47]);
      s3.behave('attend', { object: 'saul' });
    });
    d.wait(1.2);

    // ---- 6. A tenda do rei (1:38) ----
    // O Davi segue o soldado. Lá dentro, o rei espera, cansado.
    d.background(() => {
      davi.walkTo([0, -42.6], { speed: 1.6 });
      davi.walkTo([0, -44.3], { speed: 1.1 });
      davi.behave('attend', { object: 'saul' });
    });
    d.camera.cut({ pos: [0.7, TOPO + 1.25, -48.8], lookAt: [0, TOPO + 1.1, -43.5], fov: 46 });
    saul.say('Quarenta dias, Abner.', { tone: 'cansado' });
    abner.say('E nenhum homem desceu, majestade.', { to: saul });
    d.waitFor(d.now + 1.2);
    saul.lookAt(davi, { duration: 0.6 });
    abner.say('Majestade, esse é o rapaz que anda perguntando sobre a recompensa.', { to: saul, gesture: 0.4 });
    abner.behave('attend', { object: 'davi' });
    davi.say('Que ninguém perca a coragem por causa dele. Eu vou lutar com esse filisteu.', { tone: 'decidido', to: saul });
    abner.say('Ele é pastor, majestade.', { tone: 'ironico', to: saul });
    saul.say('Você não consegue enfrentar esse homem. Você é um rapaz. Ele é guerreiro desde menino.', { tone: 'cansado', to: davi });

    // A órbita lenta em volta dos dois enquanto o Davi conta do leão e do urso.
    const historia = d.now;
    d.camera.orbit({ center: [0, TOPO + 1.05, -45.9], radius: 3.6, height: 0.5, from: 120, to: 215, duration: 18, fov: 42 });
    davi.say('Eu cuido das ovelhas do meu pai. Uma vez veio um leão e levou um cordeiro.', { to: saul, gesture: 0.5 });
    davi.say('Eu fui atrás, bati nele e tirei o cordeiro da boca dele. Ele veio pra cima de mim. Eu peguei pela juba e matei.', { to: saul, gesture: 0.8 });
    davi.say('Matei leão. Matei urso. Esse filisteu vai ser como um deles.', { to: saul, gesture: 0.5 });
    davi.say('O Senhor que me livrou do leão e do urso vai me livrar desse filisteu também.', { tone: 'firme', to: saul, gesture: 0.3 });
    d.waitFor(historia + 18);

    // Silêncio. Lá fora, de longe, o Golias grita de novo. Saul e Abner se olham.
    d.camera.cut({ pos: [-1.6, TOPO + 1.3, -44.0], lookAt: [0.9, TOPO + 1.1, -47], fov: 40 });
    golias.say('Israel! Eu ainda tô esperando!', { tone: 'grito' });
    d.together(() => saul.lookAt(abner, { duration: 0.5 }), () => abner.lookAt(saul, { duration: 0.5 }));
    d.wait(0.8);
    saul.lookAt(davi, { duration: 0.5 });
    saul.say('Vá. E que o Senhor esteja com você.', { to: davi });

    // ---- 7. A armadura (2:05) ----
    // Câmera fixa, de frente, como um quadro.
    d.camera.cut({ pos: [0.3, TOPO + 1.3, -41.2], lookAt: [0.2, TOPO + 1.05, -45], fov: 40 });
    saul.standUp([0.7, -46.6]);
    saul.walkTo([0.55, -45.2], { speed: 1 });
    saul.turnTo([0, -44.3]);
    saul.behave('attend', { object: 'davi', mood: 'worried' });
    // [Liberdade] As falas do Saul enquanto veste o Davi.
    saul.say('Meu capacete.', { to: davi, gesture: 0 });
    saul.pointAt(davi, { duration: 0.8 });
    d.do('davi', 'set', { channel: 'wear.bronzeHelmet', value: 1 }, { duration: 0 });
    saul.say('E a minha couraça.', { to: davi, gesture: 0 });
    saul.pointAt(davi, { duration: 0.8 });
    d.do('davi', 'set', { channel: 'wear.scaleArmor', value: 1 }, { duration: 0 });
    // Tudo grande demais: ele tenta dar dois passos. [Liberdade: o soldado na porta segura a risada.]
    davi.express('surprised', { amount: 0.6 });
    d.background(() => {
      d.wait(0.6);
      s3.express('happy');
    });
    davi.walkTo([-0.9, -43.6], { speed: 0.55 });
    davi.turnTo([0.55, -45.2]);
    davi.say('Não dá. Eu nunca usei isso. Não consigo nem andar.', { to: saul, gesture: 0.6 });
    s3.express('neutral');
    // Ele tira o capacete e a couraça e devolve ao rei.
    d.do('davi', 'set', { channel: 'wear.bronzeHelmet', value: 0 }, { duration: 0 });
    d.wait(0.5);
    d.do('davi', 'set', { channel: 'wear.scaleArmor', value: 0 }, { duration: 0 });
    davi.express('neutral');
    saul.say('Vai assim?', { tone: 'preocupada', to: davi });
    davi.say('Eu sempre fui assim.', { to: saul });

    // ---- 8. O riacho (2:22) ----
    // Grua alta: o vale inteiro, os dois exércitos e o Davi pequeno, descendo sozinho.
    const descida = d.background(() => {
      davi.walkTo([0, -40.5], { speed: 1.8 });
      davi.walkTo([-1.8, -2.7], { speed: 2.6 });
      davi.turnTo(180);
    });
    d.wait(2.4);
    d.camera.cut({ pos: [26, 24, 12], lookAt: [0, 4, -14], fov: 50 });
    d.wait(1);
    // [Liberdade] Na fila, alguém vê o rapaz descendo.
    d.actor('israel-2').say('Olha! Tem alguém descendo!', { tone: 'urgente', gesture: 0.5 });
    d.actor('israel-3').say('É um menino. Sem armadura!', { tone: 'nervoso', gesture: 0.4 });
    d.wait(0.6);
    d.camera.moveTo({ pos: [12, 8, 2], lookAt: [-1, 3, -10], fov: 46 });
    d.camera.cut({ pos: [7.2, TOPO + 1.6, -31.5], lookAt: [4.6, TOPO + 1.4, -35.8], fov: 40 });
    for (const irmao of ['sama', 'eliabe', 'abinadabe']) d.actor(irmao).behave('attend', { object: 'davi', mood: 'scared' });
    abinadabe.say('Ele vai mesmo?', { to: eliabe });
    eliabe.say('Esse menino nunca escutou ninguém.', { tone: 'bravo' });
    d.camera.cut({ pos: [1.6, 0.9, 8.6], lookAt: [0, 3, 12.6], fov: 44 });
    golias.say('Cadê o homem de Israel?', { tone: 'grito', gesture: 0.4 });
    d.camera.cut({ pos: [5.6, TOPO + 1.5, -38.5], lookAt: [4.0, TOPO + 1.5, -36], fov: 36 });
    eliabe.say('Davi! Davi, volta!', { tone: 'grito', gesture: 0.8 });
    d.waitFor(descida);

    // Ele se ajoelha e escolhe as pedras, uma a uma.
    d.camera.cut({ pos: [-0.2, 0.15, -1.0], lookAt: [-1.8, -0.25, -2.4], fov: 46 });
    d.do('davi', 'move', { name: 'kneel' }, { duration: 0.8 });
    const conta = ['Uma.', 'Duas.', 'Três.', 'Quatro.', 'Cinco.'];
    for (let i = 1; i <= 5; i++) {
      davi.pickUp(`pedra${i}`, { hand: 'right' });
      // [Liberdade] Ele conta baixinho.
      d.background(() => davi.say(conta[i - 1], { tone: 'sussurro', gesture: 0 }));
      davi.putAway(`pedra${i}`);
      if (i === 3) {
        d.background(() => {
          d.actor('filisteu-6').say('Olha lá! Mandaram um menino!', { tone: 'laughs', gesture: 0.6 });
          d.actor('filisteu-4').say('Com um pau de pastor!', { tone: 'laughs', gesture: 0.6 });
        });
      }
      if (i === 2) d.camera.cut({ pos: [-3.6, 0.6, -0.8], lookAt: [-1.8, -0.2, -2.4], fov: 40 });
    }
    d.do('davi', 'move', { name: 'kneel', amount: 0 }, { duration: 0.8 });
    davi.behave('attend', { object: 'golias' });

    // ---- 9. Frente a frente (2:40) ----
    // Ele atravessa o riacho e vai na direção do gigante.
    d.camera.cut({ pos: [9, 1.2, 3], lookAt: [0, 1.8, 7], fov: 50 });
    davi.walkTo([0, 3.2], { speed: 1.4 });
    golias.lookAt(davi, { duration: 0.5 });
    escudeiro.lookAt(davi, { duration: 0.5 });
    d.camera.orbit({ center: [0, 1.6, 7.6], radius: 9.5, height: 0.2, from: 250, to: 300, duration: 22, fov: 46 });
    const face = d.now;
    golias.say('Isso? Eu sou algum cachorro, pra você vir atrás de mim com um pedaço de pau?', { tone: 'laughs', to: davi, gesture: 0.5 });
    golias.say('Que os meus deuses te amaldiçoem! Vem cá, menino. Vou dar a tua carne pros pássaros e pros bichos do campo.', { tone: 'bravo', to: davi, gesture: 0.6 });
    d.camera.cut({ pos: [-1.2, 1.6, -0.4], lookAt: [0.1, 1.45, 3.2], fov: 38 });
    davi.say('Você vem com espada, lança e escudo. Eu venho em nome do Senhor dos Exércitos, o Deus de Israel, que você desafiou.', { tone: 'firme', to: golias, gesture: 0.4 });
    davi.say('Hoje o Senhor vai te entregar na minha mão. E a terra inteira vai saber que existe Deus em Israel.', { tone: 'firme', to: golias, gesture: 0.4 });
    d.camera.cut({ pos: [4.5, 0.7, 1.5], lookAt: [0, 1.5, 3.2], fov: 44 });
    davi.say('E todo mundo aqui vai saber que o Senhor não salva com espada nem com lança. Porque a batalha é do Senhor!', { tone: 'grito', to: golias, gesture: 0.7 });
    void face;

    // O Golias levanta a lança e começa a andar; o chão treme a cada passo.
    d.camera.cut({ pos: [-1.5, 0.5, 1.6], lookAt: [0, 2.6, 10], fov: 50, shake: 0.6 });
    // [Liberdade] Do outro monte, os filisteus gritam o nome dele.
    d.background(() => {
      d.wait(0.6);
      d.actor('filisteu-5').say('Golias! Golias!', { tone: 'grito', gesture: 0.6 });
      d.actor('filisteu-7').say('Golias!', { tone: 'grito', gesture: 0.6 });
    });
    for (const id of ids(filisteus)) d.background(() => d.do(id, 'move', { name: 'cheer', amount: 0.9 }, { duration: 0.6 }));
    golias.walkTo([0, 9.2], { speed: 1.1 });
    golias.behave('attend', { object: 'davi', mood: 'calm' });

    // ---- 10. A pedra (3:05) ----
    // Davi larga o cajado e corre na direção do gigante, com a funda na mão.
    davi.putDown('cajado', [0.5, 0.02, 3.4]);
    davi.pickUp('funda', { hand: 'right' });
    d.do('funda', 'set', { channel: 'loaded', value: 1 }, { duration: 0 });
    d.do('davi', 'move', { name: 'sling' }, { duration: 0.4 });
    const giro = d.do('funda', 'set', { channel: 'spin', value: 10 }, { duration: 4.6, ease: 'linear' });
    d.camera.thirdPerson(davi, { distance: 2.6, height: -0.2, fov: 58, shake: 0.35 });
    d.at(giro.start);
    davi.runTo([0, 3.6], { speed: 1.6 });
    // Cortes rápidos: a fila prende a respiração, o Eliabe fecha os olhos, o Golias ergue a lança.
    d.camera.cut({ pos: [3.4, TOPO + 1.5, -39.6], lookAt: [3.2, TOPO + 1.4, -36.2], fov: 46 });
    d.wait(0.8);
    d.camera.cut({ pos: [5.2, TOPO + 1.75, -37.4], lookAt: [4.0, TOPO + 1.7, -36.6], fov: 30 });
    eliabe.express('scared');
    eliabe.say('Senhor...', { tone: 'sussurro', gesture: 0 });
    d.camera.cut({ pos: [-2.2, 0.6, 5.6], lookAt: [0, 3.4, 9.2], fov: 46, shake: 0.15 });
    d.do('golias', 'move', { name: 'cheer', amount: 0.5 }, { duration: 0.5 });
    d.waitFor(giro);
    d.do('davi', 'move', { name: 'sling', amount: 0 }, { duration: 0.2 });

    // Davi solta. Câmera lenta, seguindo a pedra no ar até um instante antes da testa.
    const tiro = d.do('pedra1', 'throw', { hit: 'golias', with: 'funda', speed: 0.75, arc: 0.4 }, { ease: 'linear' });
    d.at(tiro.start);
    d.camera.cut({ pos: [1.3, 2.0, 2.8], lookAt: [0, 2.05, 5.0], fov: 40 });
    d.at(tiro.start + 8);
    d.camera.moveTo({ pos: [1.5, 2.6, 6.6], lookAt: [0, 2.9, 8.6], fov: 34 });
    d.at(tiro.start + 2.2);
    d.endCard({
      title: 'Você descia no vale no lugar do Davi?',
      options: [{ label: 'DESCIA', icon: '🪨' }, { label: 'FICAVA', icon: '🛡️' }],
      cta: 'Comenta DESCIA ou FICAVA 👇 e marca o amigo que sempre duvida de você',
    }, { duration: 6 });
    d.at(tiro.start + 2.2);
    d.narrate('Um rapaz, uma funda e cinco pedras. Você descia no vale no lugar do Davi... ou ficava na fila com o exército? Comenta aí. E marca aquele amigo que sempre duvida de você.');
  },
);
