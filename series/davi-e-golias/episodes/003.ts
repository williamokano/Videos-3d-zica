import { direct, type Director } from '../../../src/engine/timeline/direct';
import { IRMAOS, LINHA, TOPO, atentos, encolhem, filaDeIsrael, filaFilisteia, ids, rodaDaFogueira } from '../cena';

/*
 * Episódio 3, "Quarenta dias". Roteiro de trabalho em series/davi-e-golias/roteiros/003-roteiro.md (as cenas
 * abaixo têm os mesmos números); regras da série em series/davi-e-golias/biblia.md. Lugar: world/vale-de-ela.json
 * (gerado por world/gerar-vale.py), que tem também um canto de Belém com a casa de Jessé.
 *
 * Sem áudio por enquanto: as falas duram o que o texto pede.
 *
 * O Golias desafia Israel por quarenta dias. O Jessé manda o Davi com comida para os irmãos. O Davi chega ao
 * acampamento, ouve o gigante e a recompensa, pergunta "quem é esse filisteu?", leva bronca do Eliabe e é levado
 * ao Saul, que o reconhece. O leão e o urso. "Vai, e que o Senhor esteja contigo." O Davi olha o vale lá de cima.
 *
 * Quem aparece em dois lugares tem uma entrada no elenco para cada um ("davi" no vale, "davi-belem" em casa).
 */

type V3 = [number, number, number];

const fila = filaDeIsrael();
const filisteus = filaFilisteia();
const fogueira = rodaDaFogueira('fogueira', [-10, -39.5], 501);
const tropa = ids(fila);
// Quem fala na fila: dois do lado do vão do meio, perto dos irmãos; o de trás (S2) corre contar ao rei.
const S1 = 'israel-6';
const S2 = 'israel-12';
// Os dois da ponta, que largam a fila quando o gigante grita.
const FOGEM = ['israel-8', 'israel-9'];

/** O canto de Belém (gerar-vale.py: BELEM): o canto noroeste da casa de Jessé; o terreiro fica ao sul. */
const BX = -200;
const BZ = -160;
/** A tenda do rei (gerar-vale.py: TENDA): de 10 x 8, aberta para o sul em z = -41. O rei fica na boca dela. */
const REI: [number, number] = [-0.9, -40.2];
const DIANTE_DO_REI: [number, number] = [0.9, -40.2];
/** Onde o Davi aparece, no fim da trilha que vem do norte, e onde fica o guarda das bagagens. */
const TRILHA: [number, number] = [-10.9, -45.2];
const BAGAGEM: [number, number] = [-12.4, -41.6];

/** Direção (yaw) de quem vai de `a` para `b`: 0 olha para o norte (-z), 90 para o oeste (-x). */
const rumo = (a: [number, number], b: [number, number]) => (Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) * 180) / Math.PI;

/**
 * Por cima do ombro de `de`, olhando para `para`: a câmera fica atrás e um pouco ao lado de quem está de costas,
 * mais alta que a cabeça dele, mirando entre os dois, mais perto de quem está de frente. Os dois ficam perto do
 * meio do quadro vertical.
 */
function ombro(d: Director, de: string, para: string, o: { back?: number; side?: number; up?: number; aim?: number; mix?: number } = {}): { pos: V3; lookAt: V3 } {
  const { back = 2.0, side = 0.55, up = 2.0, aim = 1.4, mix = 0.2 } = o;
  const a = d.where(de);
  const b = d.where(para);
  const len = Math.hypot(a[0] - b[0], a[2] - b[2]) || 1;
  const ux = (a[0] - b[0]) / len;
  const uz = (a[2] - b[2]) / len;
  const pos: V3 = [a[0] + ux * back - uz * side, a[1] + up, a[2] + uz * back + ux * side];
  const lookAt: V3 = [b[0] + (a[0] - b[0]) * mix, b[1] + aim, b[2] + (a[2] - b[2]) * mix];
  return { pos, lookAt };
}

/** O mesmo plano, chegando um pouco mais perto: para a câmera nunca ficar parada. */
const perto = (s: { pos: V3; lookAt: V3 }, k = 0.15): { pos: V3; lookAt: V3 } => ({
  pos: [s.pos[0] + (s.lookAt[0] - s.pos[0]) * k, s.pos[1], s.pos[2] + (s.lookAt[2] - s.pos[2]) * k],
  lookAt: s.lookAt,
});

export default direct(
  {
    episode: 3,
    title: 'Quarenta dias',
    location: 'vale-de-ela',
    cast: [
      // O vale.
      { character: 'golias', at: [0, 18], yaw: 0 },
      { character: 'escudeiro', at: [-1.4, 16.6], yaw: 0 },
      // O acampamento de Israel.
      { character: 'davi', at: TRILHA, yaw: 180 },
      { character: 'guarda', at: [-14.6, -40.6], yaw: -110 },
      { character: 'sama', at: [...IRMAOS.sama], yaw: 180 },
      { character: 'eliabe', at: [...IRMAOS.eliabe], yaw: 180 },
      { character: 'abinadabe', at: [...IRMAOS.abinadabe], yaw: 180 },
      { character: 'saul', at: REI, yaw: 180 },
      { character: 'abner', at: [-2.1, -41.0], yaw: 160 },
      ...fila,
      ...fogueira,
      ...filisteus,
      // Belém, de madrugada.
      { id: 'davi-belem', character: 'davi', at: [BX + 6.4, BZ + 11.6], yaw: -130 },
      { character: 'jesse', at: [BX + 8.6, BZ + 9.8], yaw: 50 },
    ],
    props: [
      { id: 'lanca-golias', asset: 'arms.spear', pos: [0, 0], pocketOf: 'golias', params: { length: 3.6 } },
      { id: 'escudo-golias', asset: 'arms.shield', pos: [0, 0], pocketOf: 'escudeiro', params: { kind: 'tower', size: 1.25 } },
      { id: 'cajado-belem', asset: 'arms.staff', pos: [0, 0], pocketOf: 'davi-belem' },
      // O jumento carregado, em Belém e na trilha do acampamento.
      { id: 'jumento-belem', asset: 'ancient.hitchedDonkey', pos: [BX + 4.9, BZ + 12.8], rot: -120, params: { load: 1, tied: 0 } },
      { id: 'jumento', asset: 'ancient.hitchedDonkey', pos: [TRILHA[0] - 1.0, TRILHA[1] - 1.0], rot: 180, params: { load: 1, tied: 0 } },
      { id: 'queijos', asset: 'ancient.basket', pos: [BX + 9.5, BZ + 10.7], params: { bread: 1 } },
    ],
  },
  (d) => {
    const golias = d.actor('golias');
    const escudeiro = d.actor('escudeiro');
    const davi = d.actor('davi');
    const guarda = d.actor('guarda');
    const [sama, eliabe] = [d.actor('sama'), d.actor('eliabe')];
    const [saul, abner] = [d.actor('saul'), d.actor('abner')];
    const [s1, s2] = [d.actor(S1), d.actor(S2)];
    const [daviB, jesse] = [d.actor('davi-belem'), d.actor('jesse')];
    const irmaos = ['sama', 'eliabe', 'abinadabe'];
    const vale: V3 = [0, 3, 12];

    // ---- O mundo vivo desde o primeiro quadro ----
    d.world.rule('noite', false, { duration: 0 });
    d.world.rule('amanhecer', false, { duration: 0 });
    d.world.rule('entardecer', false, { duration: 0 });
    atentos(d, [...tropa, ...irmaos], 'golias', 'worried');
    atentos(d, ids(filisteus), 'golias', 'happy');
    for (const id of ids(fogueira)) d.actor(id).behave('chat', { group: 'fogueira', mood: 'worried' });
    guarda.behave('idle');
    saul.behave('watch', { point: vale, mood: 'worried' });
    abner.behave('attend', { object: 'saul', mood: 'worried' });
    escudeiro.behave('attend', { object: S1 });
    golias.behave('attend', { object: S1, mood: 'happy' });
    davi.behave('idle');
    daviB.behave('attend', { object: 'jesse' });
    jesse.behave('attend', { object: 'davi-belem' });
    // Fora de quadro: a lança na mão do gigante, o escudo na do escudeiro, o cajado na do Davi em Belém (no
    // acampamento ele fica com a carga).
    d.background(() => golias.pickUp('lanca-golias', { hand: 'right' }));
    d.background(() => escudeiro.pickUp('escudo-golias', { hand: 'left' }));
    d.background(() => daviB.pickUp('cajado-belem', { hand: 'left' }));

    // ---- 1. O desafio (0:00) ----
    // [GANCHO] Rente ao chão do vale; o gigante desce, o escudeiro na frente. A câmera sobe até o rosto, que já grita.
    d.camera.cut({ pos: [1.6, 0.35, 8.2], lookAt: [0.1, 0.6, 13.5], fov: 50, shake: 0.06 });
    d.together(
      () => escudeiro.walkTo([-1.4, 10.8], { speed: 1.1 }),
      () => {
        d.background(() => {
          d.wait(1.0);
          golias.say('Escolhei entre vós um homem! Que desça e venha lutar comigo!', { tone: 'grito', gesture: 0.5 });
        });
        golias.walkTo([0, 12.6], { speed: 1.1 });
        d.camera.moveTo({ pos: [2.0, 1.6, 7.8], lookAt: [0, 2.4, 12.6], fov: 48, shake: 0.03 });
      },
    );
    d.camera.moveTo({ pos: [1.7, 2.1, 8.2], lookAt: [0, 2.95, 12.6], fov: 46, shake: 0 });
    d.wait(0.4);
    // Contraplano: a fila de Israel na beira do monte, que recua toda junta.
    d.camera.cut({ pos: [1.5, TOPO + 1.2, -29.6], lookAt: [-1.6, TOPO + 1.4, -35.5], fov: 46 });
    encolhem(d, [...tropa, ...irmaos], 1);
    d.wait(0.7);
    d.camera.moveTo({ pos: [0.4, TOPO + 1.3, -30.6], lookAt: [-2.0, TOPO + 1.45, -35.5], fov: 42 });
    d.actor('israel-6').say('De novo ele...', { tone: 'sussurro', gesture: 0 });
    // A tela de abertura, por cima do vale visto do alto: os dois montes e o gigante pequeno no meio.
    d.camera.cut({ pos: [26, 22, -16], lookAt: [0, 2, 10], fov: 50 });
    d.camera.moveTo({ pos: [22, 17, -10], lookAt: [0, 2, 11], fov: 46 });
    encolhem(d, [...tropa, ...irmaos], 0);
    d.titleCard({ title: 'DAVI', subtitle: 'Uma história de coragem e destino', episode: 'Episódio 3 · Quarenta dias' }, { duration: 3.6 });
    // De baixo para cima, o gigante e a aposta.
    d.camera.cut({ pos: [-2.2, 0.9, 7.6], lookAt: [0, 3.2, 12.6], fov: 52 });
    d.camera.moveTo({ pos: [-1.6, 1.0, 8.4], lookAt: [0, 3.2, 12.6], fov: 50 });
    golias.say('Se ele me vencer, seremos vossos servos. Mas se eu o vencer, sereis nossos servos!', { tone: 'grito', gesture: 0.6 });
    d.do('golias', 'move', { name: 'cheer', amount: 0.8 }, { duration: 0.5 });
    d.do('golias', 'move', { name: 'cheer', amount: 0 }, { duration: 0.6 });

    // ---- 2. Quarenta dias (0:22) ----
    // Amanhecer. Do alto, o gigante desce de novo ao vale.
    d.world.rule('amanhecer', true, { duration: 0 });
    d.camera.cut({ pos: [-14, 13, -18], lookAt: [0, 1, 11], fov: 46 });
    d.background(() => golias.walkTo([0, 10.4], { speed: 0.9 }));
    d.camera.moveTo({ pos: [-11, 11.5, -14], lookAt: [0, 1.5, 11], fov: 44 });
    d.narrate('Quarenta dias, de manhã e à tarde, o gigante desceu ao vale.');
    // Na boca da tenda, o rei olha o vale, com o Abner ao lado.
    d.world.rule('amanhecer', false, { duration: 0 });
    d.camera.cut({ pos: [1.2, TOPO + 1.75, -36.6], lookAt: [-1.2, TOPO + 1.5, -40.6], fov: 42 });
    d.camera.moveTo({ pos: [0.8, TOPO + 1.7, -37.4], lookAt: [-1.2, TOPO + 1.5, -40.6], fov: 40 });
    saul.express('sad', { amount: 0.4 });
    d.wait(1.6);
    // Entardecer. O gigante ergue a lança; na fila, os soldados desviam os olhos.
    d.world.rule('entardecer', true, { duration: 0 });
    d.camera.cut({ pos: [1.8, 0.8, 5.4], lookAt: [0, 3.0, 10.4], fov: 46 });
    d.do('golias', 'move', { name: 'cheer', amount: 0.9 }, { duration: 0.6 });
    d.camera.moveTo({ pos: [1.4, 0.9, 6.0], lookAt: [0, 3.0, 10.4], fov: 44 });
    d.do('golias', 'move', { name: 'cheer', amount: 0 }, { duration: 0.6 });
    d.camera.cut({ pos: [-5.4, TOPO + 1.3, -30.4], lookAt: [-5.5, TOPO + 1.55, -35.6], fov: 42 });
    for (const id of ['israel-3', 'israel-4', 'israel-5']) d.actor(id).behave('watch', { point: [-20, TOPO, -45], mood: 'scared' });
    d.camera.moveTo({ pos: [-5.5, TOPO + 1.35, -31.2], lookAt: [-5.5, TOPO + 1.55, -35.6], fov: 40 });
    d.narrate('E nenhum homem de Israel teve coragem de responder.');
    // Noite. A roda da fogueira.
    // A noite pela metade: o céu escuro, mas os rostos na roda da fogueira ainda se veem.
    d.world.rule('entardecer', 0.35, { duration: 0 });
    d.world.rule('noite', 0.65, { duration: 0 });
    d.camera.cut({ pos: [-7.0, TOPO + 1.8, -42.0], lookAt: [-10.6, TOPO + 1.1, -38.9], fov: 46 });
    d.camera.moveTo({ pos: [-7.5, TOPO + 1.7, -41.6], lookAt: [-10.6, TOPO + 1.1, -38.9], fov: 44 });
    d.actor('fogueira-2').say('Quarenta dias... e ninguém desceu.', { tone: 'cansado', gesture: 0.3 });
    d.wait(0.6);

    // ---- 3. Belém, de madrugada (0:42) ----
    d.world.rule('noite', false, { duration: 0 });
    d.world.rule('entardecer', false, { duration: 0 });
    d.world.rule('amanhecer', true, { duration: 0 });
    // De volta ao dia, o vale fica como estava: o gigante no seu monte, a fila olhando.
    for (const id of ['israel-3', 'israel-4', 'israel-5']) d.actor(id).behave('attend', { object: 'golias', mood: 'worried' });
    d.background(() => {
      golias.walkTo([0, 13.2], { speed: 1.2 });
      golias.turnTo(0);
      golias.behave('attend', { object: S1, mood: 'happy' });
    });
    // O terreiro: o pai, o filho e o jumento carregado. Os dois de lado, no meio do quadro.
    // Por cima do ombro do Davi, o pai de frente; e o contrário para a resposta.
    const conversa = ombro(d, 'davi-belem', 'jesse');
    // Primeiro do alto, a casa e o terreiro; logo o pai de frente.
    d.camera.cut({ pos: [BX + 13.5, 6.5, BZ + 19.0], lookAt: [BX + 6.5, 1.2, BZ + 10.0], fov: 46 });
    d.camera.moveTo({ pos: [BX + 12.5, 5.0, BZ + 17.6], lookAt: [BX + 6.8, 1.2, BZ + 10.2], fov: 44 });
    jesse.lookAt('queijos', { duration: 0.4 });
    jesse.pointAt('jumento-belem', { duration: 1.0 });
    d.camera.cut(conversa);
    d.camera.moveTo(perto(conversa, 0.22));
    jesse.say('Davi. Leva este grão e estes dez pães aos teus irmãos, no acampamento.', { to: daviB, gesture: 0.4 });
    jesse.say('E estes dez queijos, ao comandante deles.', { to: daviB, gesture: 0.3 });
    jesse.say('Vê se teus irmãos estão bem. E traz-me notícia.', { tone: 'preocupada', to: daviB, gesture: 0.3 });
    const resposta = ombro(d, 'jesse', 'davi-belem', { side: -0.55 });
    d.camera.cut(resposta);
    d.camera.moveTo(perto(resposta));
    daviB.say('Deixei as ovelhas com um guarda, pai. Eu vou.', { to: jesse, gesture: 0.2 });
    // O Davi puxa o jumento e sai pela estrada; o pai fica olhando. A câmera acompanha de longe.
    const saida: [number, number] = [BX + 14.0, BZ + 24.0];
    const vai = d.background(() => {
      daviB.walkTo([BX + 6.0, BZ + 13.6], { speed: 1.2 });
      daviB.walkTo(saida, { speed: 1.3 });
    });
    d.background(() => {
      d.wait(1.6);
      d.do('jumento-belem', 'moveTo', { to: [saida[0] - 0.9, saida[1] - 1.6], yaw: rumo([BX + 4.9, BZ + 12.8], saida) }, { duration: vai.end - vai.start - 1.6, ease: 'linear' });
    });
    jesse.behave('attend', { object: 'davi-belem', mood: 'worried' });
    d.camera.track('davi-belem', { from: [BX + 2.0, 2.2, BZ + 15.0], to: [BX + 3.6, 2.4, BZ + 18.0], duration: 3.6, fov: 46 });
    d.wait(3.0);

    // ---- 4. O acampamento (0:55) ----
    d.world.rule('amanhecer', false, { duration: 0 });
    // [GANCHO] Por trás do Davi, que chega com o jumento: lá na frente, o exército sai para a fila com o grito de
    // guerra, lanças e braços para cima. (17:20-21)
    [...tropa, ...irmaos].forEach((id, i) => {
      d.background(() => {
        d.wait(0.3 + (i % 4) * 0.1);
        d.do(id, 'move', { name: 'cheer', amount: 0.9 }, { duration: 0.5 });
        d.wait(1.4);
        d.do(id, 'move', { name: 'cheer', amount: 0 }, { duration: 0.6 });
      });
    });
    const chega = d.background(() => davi.walkTo(BAGAGEM, { speed: 1.6 }));
    d.background(() => {
      d.wait(0.4);
      d.do('jumento', 'moveTo', { to: [BAGAGEM[0] - 0.6, BAGAGEM[1] - 1.7], yaw: rumo(TRILHA, BAGAGEM) }, { duration: chega.end - chega.start - 0.4, ease: 'linear' });
    });
    d.camera.track('davi', { from: [-6.4, TOPO + 2.3, -50.0], to: [-8.0, TOPO + 2.1, -46.4], duration: chega.end - d.now, fov: 50 });
    d.waitFor(chega);
    davi.turnTo([-14.6, -40.6]);
    guarda.lookAt(davi, { duration: 0.4 });
    const bagagem = ombro(d, 'davi', 'guarda');
    d.camera.cut(bagagem);
    d.camera.moveTo(perto(bagagem));
    davi.say('É pros filhos de Jessé. Onde eles estão?', { to: guarda, gesture: 0.3 });
    guarda.pointAt([3, TOPO + 1.5, -36], { duration: 0.9 });
    guarda.say('Na linha de frente.', { tone: 'cansado', to: davi, gesture: 0.3 });
    guarda.behave('attend', { object: 'davi' });
    // Ele corre até a fila. A câmera acompanha de lado, de longe.
    const atras: [number, number] = [3.3, -LINHA - 2.3];
    const corrida = d.background(() => davi.runTo(atras, { speed: 3.6 }));
    d.camera.track('davi', { from: [-14.5, TOPO + 4.6, -33.5], to: [-9.0, TOPO + 4.4, -33.0], duration: corrida.end - d.now + 0.3, fov: 46, shake: 0.05 });
    d.at(corrida.end - 1.5);
    davi.say('Eliabe! Abinadabe! Samá!', { tone: 'animado', gesture: 0 });
    d.waitFor(corrida);
    davi.behave('idle');
    // Os irmãos se viram. Por cima do ombro do Samá, o Davi de frente.
    d.together(...irmaos.map((id) => () => d.actor(id).turnTo(atras)));
    for (const id of irmaos) d.actor(id).behave('attend', { object: 'davi' });
    const irmao = ombro(d, 'sama', 'davi', { side: 0.4, mix: 0.12 });
    d.camera.cut(irmao);
    d.camera.moveTo(perto(irmao));
    sama.say('Davi?!', { tone: 'surprised', to: davi, gesture: 0.3 });
    davi.say('O pai mandou saber como estais.', { to: sama, gesture: 0.4 });

    // ---- 5. A afronta (1:12) ----
    // [GANCHO] Lá de baixo, o grito. (17:23)
    d.camera.cut({ pos: [1.4, 1.1, 8.2], lookAt: [0, 3.1, 13.2], fov: 42 });
    d.camera.moveTo({ pos: [1.2, 1.2, 8.8], lookAt: [0, 3.1, 13.2], fov: 40 });
    golias.say('Hoje eu afronto as fileiras de Israel! Dai-me um homem, e lutaremos os dois!', { tone: 'grito', gesture: 0.5 });
    // A fila inteira se encolhe; dois largam a posição e correm para trás. O Davi não se mexe. (17:24)
    d.camera.cut({ pos: [5.6, TOPO + 1.8, -42.4], lookAt: [5.0, TOPO + 1.3, -36.6], fov: 48 });
    encolhem(d, [...tropa, ...irmaos], 1);
    FOGEM.forEach((id, i) => d.background(() => {
      d.wait(0.1 + i * 0.25);
      d.actor(id).runTo([12.5 + i * 2.5, -43 - i], { speed: 3.4 });
      d.actor(id).behave('watch', { point: vale, mood: 'scared' });
    }));
    davi.lookAt(vale, { duration: 0.5 });
    d.camera.moveTo({ pos: [5.4, TOPO + 1.8, -41.8], lookAt: [5.0, TOPO + 1.3, -36.6], fov: 46 });
    d.wait(0.6);
    // Os dois soldados do lado contam da recompensa.
    encolhem(d, [...tropa, ...irmaos], 0);
    const perguntar: [number, number] = [0.0, -37.5];
    const vaiPerguntar = d.background(() => davi.walkTo(perguntar, { speed: 1.3 }));
    d.together(() => s1.turnTo(perguntar), () => s2.turnTo(perguntar));
    s1.behave('attend', { object: 'davi', mood: 'worried' });
    s2.behave('attend', { object: 'davi', mood: 'worried' });
    d.waitFor(vaiPerguntar.end - 0.8);
    davi.lookAt(s1, { duration: 0.4 });
    const recompensa = ombro(d, 'davi', S1);
    d.camera.cut(recompensa);
    d.camera.moveTo(perto(recompensa));
    s1.say('O rei vai dar riquezas a quem matar esse homem. E a filha dele em casamento.', { to: davi, gesture: 0.4 });
    s2.say('E a casa do pai dele fica livre de impostos.', { to: davi, gesture: 0.4 });
    // O Davi de frente, no meio do quadro. Enquanto ele fala, o Eliabe vem por trás.
    davi.lookAt(vale, { duration: 0.5 });
    d.camera.cut({ pos: [0.4, TOPO + 1.75, -34.7], lookAt: [0.0, TOPO + 1.45, -37.5], fov: 42 });
    d.camera.moveTo({ pos: [0.35, TOPO + 1.72, -35.1], lookAt: [0.0, TOPO + 1.45, -37.5], fov: 40 });
    const bronca: [number, number] = [1.4, -38.6];
    d.background(() => {
      d.wait(1.2);
      eliabe.express('angry');
      eliabe.walkTo(bronca, { speed: 1.5 });
      eliabe.turnTo(perguntar);
      eliabe.behave('attend', { object: 'davi', mood: 'worried' });
    });
    davi.say('Quem é esse filisteu, para afrontar os exércitos do Deus vivo?', { tone: 'firme', gesture: 0.4 });

    // ---- 6. A bronca (1:38) ----
    // [Liberdade: no texto ele só fala.] Os dois na linha da câmera: quem fala de frente, o outro de costas na borda.
    davi.turnTo(bronca);
    davi.behave('attend', { object: 'eliabe' });
    const irado = ombro(d, 'davi', 'eliabe');
    d.camera.cut(irado);
    d.camera.moveTo(perto(irado));
    eliabe.say('Por que desceste aqui? Com quem deixaste aquelas poucas ovelhas no deserto?', { tone: 'bravo', to: davi, gesture: 0.7 });
    eliabe.say('Eu conheço o teu orgulho. Vieste só pra ver a batalha.', { tone: 'bravo', to: davi, gesture: 0.5 });
    const calmo = ombro(d, 'eliabe', 'davi', { side: -0.6, mix: 0.12 });
    d.camera.cut(calmo);
    d.camera.moveTo(perto(calmo));
    davi.say('Que fiz eu agora? Foi só uma pergunta.', { to: eliabe, gesture: 0.3 });
    eliabe.express('neutral');
    // O Eliabe volta para o seu lugar na fila.
    d.background(() => {
      eliabe.walkTo([...IRMAOS.eliabe], { speed: 1.2 });
      eliabe.turnTo(180);
      eliabe.behave('attend', { object: 'golias', mood: 'worried' });
    });
    // Ele dá as costas ao irmão e pergunta de novo, ao soldado de trás. (17:30) Do vão da fila, olhando para trás.
    const outro: [number, number] = [-2.0, -38.0];
    const vira = d.background(() => davi.walkTo(outro, { speed: 1.3 }));
    d.camera.track('davi', { from: [0.6, TOPO + 1.9, -34.4], to: [-0.2, TOPO + 1.9, -34.6], duration: vira.end - d.now + 0.4, fov: 42 });
    d.waitFor(vira);
    s2.turnTo(outro);
    davi.turnTo([d.where(S2)[0], d.where(S2)[2]]);
    const soldado = ombro(d, 'davi', S2);
    d.camera.cut(soldado);
    d.camera.moveTo(perto(soldado));
    davi.say('É verdade o que dizem do rei?', { to: s2, gesture: 0.2 });
    s2.express('happy', { amount: 0.3 });
    s2.say('É. Por quê? Estás pensando em descer?', { tone: 'irônico', to: davi, gesture: 0.4 });
    s2.express('neutral');

    // ---- 7. Na tenda do rei (1:55) ----
    // [GANCHO] O soldado olha bem para o Davi e corre contar ao rei, na boca da tenda. (17:31) O Davi vai atrás.
    const recado = d.background(() => {
      s2.runTo([-3.4, -40.4], { speed: 3.0 });
      s2.turnTo(REI);
      s2.behave('attend', { object: 'saul' });
    });
    saul.behave('attend', { object: S2, mood: 'worried' });
    d.background(() => abner.turnTo([-3.4, -40.4]));
    abner.behave('attend', { object: S2 });
    const vem = d.background(() => {
      d.wait(0.8);
      davi.walkTo(DIANTE_DO_REI, { speed: 1.3 });
      davi.turnTo(REI);
      davi.behave('attend', { object: 'saul' });
    });
    // Na frente da tenda, do lado de onde o rapaz vem: o rei e o Abner de frente, e o Davi entrando no quadro.
    d.camera.cut({ pos: [3.9, TOPO + 2.1, -39.2], lookAt: [-1.0, TOPO + 1.35, -40.5], fov: 44 });
    d.camera.moveTo({ pos: [3.5, TOPO + 2.05, -39.5], lookAt: [-1.0, TOPO + 1.35, -40.5], fov: 42 });
    d.waitFor(recado);
    d.together(() => saul.turnTo(DIANTE_DO_REI), () => abner.turnTo([0, -40]));
    abner.say('Majestade, é o rapaz que anda perguntando pela recompensa.', { to: saul, gesture: 0.4 });
    d.waitFor(vem);
    saul.behave('attend', { object: 'davi', mood: 'worried' });
    abner.behave('attend', { object: 'davi' });
    s2.behave('attend', { object: 'davi' });
    // Por cima do ombro do Davi, o rei de frente.
    const rei = ombro(d, 'davi', 'saul');
    d.camera.cut(rei);
    d.camera.moveTo(perto(rei));
    saul.express('surprised', { amount: 0.5 });
    saul.say('Davi? O meu escudeiro?', { tone: 'surpreso', to: davi, gesture: 0.2 });
    saul.express('neutral');
    const servo = ombro(d, 'saul', 'davi', { back: 2.4, side: -0.6, up: 2.2, mix: 0.12 });
    d.camera.cut(servo);
    d.camera.moveTo(perto(servo));
    davi.say('Que ninguém desanime por causa desse filisteu. Teu servo irá lutar contra ele.', { tone: 'decidido', to: saul, gesture: 0.3 });
    d.camera.cut(rei);
    d.camera.moveTo(perto(rei));
    saul.say('Não podes. És apenas um jovem, e ele é guerreiro desde a juventude.', { tone: 'cansado', to: davi, gesture: 0.3 });
    // O leão e o urso: o Davi de frente, a câmera girando devagar do lado do rei.
    const p = d.where('saul');
    d.camera.orbit({ center: [(p[0] + DIANTE_DO_REI[0]) / 2 + 0.3, p[1] + 1.45, p[2]], radius: 3.8, height: 0.35, from: -60, to: -46, duration: 12, fov: 40 });
    davi.say('Quando um leão ou um urso levava uma ovelha, eu ia atrás dele e a tirava da sua boca.', { to: saul, gesture: 0.6 });
    davi.say('Teu servo matou o leão e o urso. Esse filisteu será como um deles.', { to: saul, gesture: 0.5 });
    // O Davi de perto.
    const dv = d.where('davi');
    d.camera.cut({ pos: [dv[0] - 2.1, dv[1] + 1.8, dv[2] + 0.8], lookAt: [dv[0], dv[1] + 1.45, dv[2]], fov: 40 });
    d.camera.moveTo({ pos: [dv[0] - 1.9, dv[1] + 1.78, dv[2] + 0.7], lookAt: [dv[0], dv[1] + 1.45, dv[2]], fov: 38 });
    davi.say('O Senhor, que me livrou das garras do leão e do urso, me livrará das mãos desse filisteu.', { tone: 'firme', to: saul, gesture: 0.3 });
    // Silêncio. O rei olha o Abner; o Abner não diz nada. [GANCHO]
    const silencio = { pos: [-2.8, TOPO + 1.8, -37.0] as V3, lookAt: [-1.4, TOPO + 1.5, -40.5] as V3 };
    d.camera.cut(silencio);
    d.camera.moveTo(perto(silencio, 0.12));
    d.together(() => saul.lookAt(abner, { duration: 0.5 }), () => abner.lookAt(saul, { duration: 0.5 }));
    d.wait(0.9);
    saul.lookAt(davi, { duration: 0.5 });
    d.camera.cut(rei);
    d.camera.moveTo(perto(rei, 0.2));
    d.wait(0.3);
    saul.say('Vai. E que o Senhor esteja contigo.', { to: davi, gesture: 0.2 });

    // ---- 8. A beira do vale (2:30) ----
    // O Davi vai até a beira do monte. Lá embaixo, pequeno, o gigante; ele levanta a cabeça.
    const beira: [number, number] = [0, -LINHA + 0.6];
    const desce = d.background(() => {
      davi.walkTo(beira, { speed: 1.7 });
      davi.turnTo(180);
      davi.behave('watch', { point: vale, mood: 'calm' });
    });
    saul.behave('attend', { object: 'davi', mood: 'worried' });
    d.camera.track('davi', { from: [3.0, TOPO + 2.3, -40.2], to: [1.6, TOPO + 2.2, -38.8], duration: desce.end - d.now + 0.4, fov: 44 });
    d.waitFor(desce.end - 1.2);
    golias.lookAt(davi, { duration: 0.8 });
    d.camera.cut({ pos: [0.5, 0.9, 9.6], lookAt: [0, 3.0, 13.2], fov: 42 });
    d.camera.moveTo({ pos: [0.6, 1.0, 10.2], lookAt: [0, 3.05, 13.2], fov: 40 });
    d.wait(0.9);
    d.camera.cut({ pos: [0.5, TOPO + 2.2, -38.4], lookAt: [0, 3.0, 8], fov: 46 });
    d.camera.moveTo({ pos: [0.3, TOPO + 2.0, -37.2], lookAt: [0, 3.0, 9], fov: 44 });
    d.wait(0.8);
    d.endCard({
      title: 'Se você fosse o rei, deixava o Davi ir?',
      options: [{ label: 'DEIXAVA', icon: '🪨' }, { label: 'SEGURAVA', icon: '🛡️' }],
      cta: 'Comenta DEIXAVA ou SEGURAVA 👇 e marca o amigo que encarava um gigante',
    }, { duration: 6 });
    d.at(d.now - 6);
    d.narrate('No próximo episódio: o gigante.');
  },
);
