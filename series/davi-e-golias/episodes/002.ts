import type { CastMember } from '../../../src/engine/character/cast';
import { direct } from '../../../src/engine/timeline/direct';
import type { WearSpec } from '../../../src/engine/character/wear';
import { figurante } from '../cena';

/*
 * Episódio 2, "O rei e o pastor". Roteiro de trabalho em series/davi-e-golias/roteiros/002-roteiro.md (as cenas
 * abaixo têm os mesmos números); regras da série em series/davi-e-golias/biblia.md. Lugar: world/belem.json
 * (gerado por world/gerar-belem.py), que tem também o palácio do Saul em Gibeá e a crista dos filisteus.
 *
 * Sem áudio por enquanto: as falas duram o que o texto pede.
 *
 * O Saul, atormentado no escuro, ouve de um servo que há em Belém um jovem que toca harpa. O Jessé manda o Davi
 * com o jumento carregado. A harpa acalma o rei, que faz do Davi seu escudeiro. Ao amanhecer, um mensageiro:
 * os filisteus se reúnem em Socó.
 *
 * Quem aparece em mais de um lugar tem uma entrada no elenco para cada um ("davi" no salão, "davi-belem" em casa,
 * "davi-patio" no pátio do palácio).
 */

/** Altura do topo do morro de Belém (gerar-belem.py: TOPO). */
const TOPO = 10;
/** O salão do trono (gerar-belem.py: SALAO): x de 93 a 107, z de -104 a -82; o trono no fundo, a porta ao sul. */
const TRONO: [number, number] = [100, -101.78];
/** Onde o Davi para diante do rei, logo à frente do banco baixo (100, -97). */
const DIANTE: [number, number] = [100, -96.3];
/** Onde quem se ajoelha diante do trono fica. */
const AJOELHA: [number, number] = [100.5, -99.3];
/** A crista onde o exército filisteu aparece contra o céu. */
const CRISTA: [number, number] = [170, -60];

/** O servo do rei, os guardas e o mensageiro: gente comum, de túnica, sem armadura. */
const gente = (id: string, at: [number, number], yaw: number, seed: number, name: string, tunic: string, extra: WearSpec[] = []): CastMember => {
  const m = figurante(id, 'soldado', at, yaw, seed, name);
  return { ...m, look: { ...m.look, wear: [{ id: 'tunic', color: tunic, accent: '#4b3a2a' }, ...extra, 'sandals'] } };
};
const guarda = (id: string, at: [number, number], yaw: number, seed: number, name: string): CastMember => figurante(id, 'soldado', at, yaw, seed, name);
/** Os filisteus marchando na crista, em duas fileiras. */
const marcha: CastMember[] = Array.from({ length: 12 }, (_, i) => {
  const fileira = i % 2;
  const at: [number, number] = [CRISTA[0] - 22 - Math.floor(i / 2) * 2.2 - fileira * 1.1, CRISTA[1] + fileira * 1.6];
  return figurante(`marcha-${i + 1}`, 'filisteu', at, -90, 601 + i * 7, `Filisteu ${i + 1}`);
});

export default direct(
  {
    episode: 2,
    title: 'O rei e o pastor',
    location: 'belem',
    cast: [
      // O salão do trono.
      { character: 'saul', at: TRONO, yaw: 180, seated: 0.64 },
      guarda('guarda-1', [97.3, -99.6], -90, 21, 'Guarda 1'),
      guarda('guarda-2', [102.7, -99.6], 90, 34, 'Guarda 2'),
      guarda('soldado-1', [97.2, -89.3], -120, 47, 'Soldado 1'),
      guarda('soldado-2', [97.6, -90.3], -20, 58, 'Soldado 2'),
      guarda('porta-1', [97.0, -85.6], -90, 63, 'Guarda da porta 1'),
      guarda('porta-2', [103.0, -85.6], 90, 72, 'Guarda da porta 2'),
      gente('servo', [104.2, -95.6], 120, 81, 'Servo', '#c9b896', [{ id: 'headwrap', color: '#e2d6b8' }]),
      { character: 'davi', at: [100, -85.4], yaw: 0 },
      // Belém, de manhã.
      { id: 'davi-belem', character: 'davi', at: [14.2, -23.9], yaw: -150 },
      { character: 'jesse', at: [17.4, -26.6], yaw: 60 },
      { character: 'eliabe', at: [8.6, -28.6], yaw: -135 },
      // O pátio do palácio, ao amanhecer.
      { id: 'davi-patio', character: 'davi', at: [100, -80.6], yaw: 180 },
      guarda('sentinela-1', [97.4, -80.4], 180, 91, 'Sentinela 1'),
      guarda('sentinela-2', [102.6, -80.4], 180, 99, 'Sentinela 2'),
      gente('mensageiro', [100.4, -66.5], 0, 107, 'Mensageiro', '#a89470'),
      // A crista.
      ...marcha,
    ],
    props: [
      { id: 'jarro', asset: 'ancient.jar', pos: [0, 0], pocketOf: 'saul', pickable: true },
      { id: 'harpa', asset: 'arms.lyre', pos: [0, 0], pocketOf: 'davi' },
      { id: 'harpa-belem', asset: 'arms.lyre', pos: [0, 0], pocketOf: 'davi-belem' },
      { id: 'harpa-patio', asset: 'arms.lyre', pos: [0, 0], pocketOf: 'davi-patio' },
      // O jumento carregado (pão e vinho nos alforjes) e o cabrito, no terreiro de Jessé.
      { id: 'jumento', asset: 'ancient.hitchedDonkey', pos: [16.4, -25.0], rot: 90, params: { load: 1, tied: 0 } },
      { id: 'cabrito', asset: 'ancient.sheep', pos: [18.0, -24.3], rot: 70, params: { seed: 11, color: '#5a4636', face: '#2b2119' } },
      { id: 'pao', asset: 'ancient.basket', pos: [18.3, -26.0], params: { bread: 1 } },
      ...marcha.map((m, i) => ({ id: `lanca-${i + 1}`, asset: 'arms.spear', pos: [0, 0] as [number, number], pocketOf: m.id!, params: { length: 2.6 } })),
    ],
  },
  (d) => {
    const saul = d.actor('saul');
    const davi = d.actor('davi');
    const servo = d.actor('servo');
    const [daviB, jesse, eliabe, daviP, mensageiro] = [d.actor('davi-belem'), d.actor('jesse'), d.actor('eliabe'), d.actor('davi-patio'), d.actor('mensageiro')];
    const guardas = ['guarda-1', 'guarda-2', 'porta-1', 'porta-2'];

    // ---- O mundo vivo desde o primeiro quadro ----
    d.world.rule('amanhecer', false, { duration: 0 });
    d.world.rule('entardecer', false, { duration: 0 });
    d.world.rule('noite', true, { duration: 0 });
    saul.behave('idle', { mood: 'scared' });
    for (const id of guardas) d.actor(id).behave('attend', { object: 'saul', mood: 'worried' });
    d.actor('soldado-1').behave('chat', { group: 'soldados', mood: 'worried' });
    d.actor('soldado-2').behave('chat', { group: 'soldados', mood: 'worried' });
    servo.behave('attend', { object: 'saul', mood: 'worried' });
    davi.behave('idle');
    daviB.behave('attend', { object: 'jesse' });
    jesse.behave('attend', { object: 'davi-belem' });
    eliabe.behave('watch', { point: [13.5, TOPO + 1.2, -26.5], mood: 'calm' });
    daviP.behave('idle', { mood: 'calm' });
    for (const id of ['sentinela-1', 'sentinela-2']) d.actor(id).behave('idle');
    mensageiro.behave('idle');
    for (const m of marcha) d.actor(m.id!).behave('idle', { mood: 'calm' });
    // Fora de quadro: o jarro na mão do rei, as harpas nas mãos dos Davis, as lanças nas mãos dos filisteus.
    d.background(() => saul.pickUp('jarro', { hand: 'right' }));
    d.background(() => davi.pickUp('harpa', { hand: 'left' }));
    d.background(() => daviB.pickUp('harpa-belem', { hand: 'left' }));
    d.background(() => daviP.pickUp('harpa-patio', { hand: 'left' }));
    marcha.forEach((m, i) => d.background(() => d.actor(m.id!).pickUp(`lanca-${i + 1}`, { hand: 'right' })));

    // ---- 1. O rei no escuro (0:00) ----
    // [GANCHO] Um jarro voa e se quebra contra a parede. O Saul, de lado, no trono.
    d.camera.cut({ pos: [103.6, 1.75, -97.6], lookAt: [99.6, 1.35, -102.2], fov: 46 });
    d.wait(0.8);
    d.do('saul', 'move', { name: 'cower', amount: 0.3 }, { duration: 0.3 });
    d.do('jarro', 'throw', { to: [95.6, 1.3, -103.4], arc: 0.4 }, { duration: 0.9, ease: 'linear' });
    // O braço volta para o braço do trono.
    d.background(() => d.do('saul', 'move', { name: 'throw', amount: 0 }, { duration: 0.8 }));
    // Os guardas se encolhem.
    for (const id of guardas) d.background(() => d.do(id, 'move', { name: 'cower', amount: 0.5 }, { duration: 0.35 }));
    // O salão inteiro, escuro, o rei pequeno lá no fundo.
    d.camera.cut({ pos: [100, 3.6, -85.2], lookAt: [100, 1.4, -101.5], fov: 44, shake: 0.08 });
    d.camera.moveTo({ pos: [100, 3.2, -88.5], lookAt: [100, 1.4, -101.5], fov: 42, shake: 0 });
    saul.express('angry', { amount: 0.7 });
    saul.say('Fechem as portas! Quem está aí?!', { tone: 'grito', gesture: 0.6 });
    // O guarda do lado do trono, baixo, sem se mexer.
    // Por cima do ombro do guarda, o rei.
    d.camera.cut({ pos: [95.8, 1.8, -98.0], lookAt: [99.6, 1.3, -101.4], fov: 46 });
    d.camera.moveTo({ pos: [96.0, 1.78, -98.3], lookAt: [99.6, 1.3, -101.4], fov: 44 });
    for (const id of guardas) d.background(() => d.do(id, 'move', { name: 'cower', amount: 0 }, { duration: 0.6 }));
    d.actor('guarda-1').say('Ninguém, meu senhor. Não há ninguém.', { tone: 'sussurro', to: saul, gesture: 0 });
    // [Liberdade] Lá atrás, junto da coluna, dois soldados trocam um olhar.
    d.camera.cut({ pos: [99.6, 1.75, -91.6], lookAt: [97.3, 1.5, -89.7], fov: 46 });
    d.camera.moveTo({ pos: [99.4, 1.75, -91.4], lookAt: [97.3, 1.5, -89.7], fov: 44 });
    d.actor('soldado-2').say('De novo. Todas as noites.', { tone: 'sussurro', to: 'soldado-1', gesture: 0 });
    // A tela de abertura, por cima do salão visto do alto.
    d.camera.cut({ pos: [104.6, 5.2, -84.0], lookAt: [99.8, 1.2, -98], fov: 48 });
    d.camera.moveTo({ pos: [103.8, 4.6, -86.0], lookAt: [99.8, 1.2, -99], fov: 46 });
    // O servo sai de trás da coluna e vem devagar até o trono, já durante a tela de abertura.
    const servoVem = d.background(() => {
      servo.walkTo(AJOELHA, { speed: 1.05 });
      servo.turnTo(0);
    });
    d.titleCard({ title: 'DAVI', subtitle: 'Uma história de coragem e destino', episode: 'Episódio 2 · O rei e o pastor' }, { duration: 3.6 });

    // ---- 2. O conselho (0:20) ----
    // A câmera passa a acompanhar o servo.
    d.camera.track('servo', { from: [98.6, 1.8, -92.0], to: [98.2, 1.8, -95.0], duration: Math.max(1.5, servoVem.end - d.now), fov: 44 });
    d.waitFor(servoVem.end);
    d.do('servo', 'move', { name: 'kneel' }, { duration: 0.9 });
    saul.lookAt(servo, { duration: 0.6 });
    // Os dois de lado, a câmera girando devagar: o rei no trono, o servo de joelhos.
    d.camera.cut({ pos: [98.0, 1.6, -97.0], lookAt: [100.4, 1.0, -100.4], fov: 52 });
    d.camera.moveTo({ pos: [98.2, 1.58, -97.4], lookAt: [100.4, 1.0, -100.4], fov: 48 });
    servo.say('Meu senhor. Um espírito mau te atormenta. Deixa que procuremos alguém que saiba tocar harpa. Quando a música tocar, tu ficarás melhor.', { tone: 'cuidadoso', to: saul, gesture: 0.3 });
    saul.express('angry', { amount: 0.2 });
    saul.say('Encontrem esse homem. E tragam-no a mim.', { tone: 'cansado', to: servo, gesture: 0.2 });
    servo.say('Há um jovem em Belém. Filho de Jessé. Sabe tocar.', { to: saul, gesture: 0.3 });
    // O rosto do rei, que levanta os olhos.
    d.camera.cut({ pos: [100.9, 1.55, -99.9], lookAt: [100, 1.5, -101.8], fov: 38 });
    d.camera.moveTo({ pos: [100.75, 1.55, -100.3], lookAt: [100, 1.5, -101.8], fov: 34 });
    saul.lookAt([100.5, 1.9, -97], { duration: 0.6 });
    servo.say('É valente. Sabe guerrear. É sábio nas palavras e de boa aparência. E o Senhor está com ele.', { to: saul, gesture: 0.2 });
    // [GANCHO]
    saul.lookAt(servo, { duration: 0.4 });
    saul.say('Tragam-no.', { tone: 'firme', to: servo, gesture: 0.3 });
    // O servo se levanta e sai de perto do trono (fora de quadro).
    d.background(() => {
      d.do('servo', 'move', { name: 'kneel', amount: 0 }, { duration: 0.8 });
      servo.walkTo([95.3, -95.2], { speed: 1 });
      servo.turnTo(-100);
    });

    // ---- 3. A partida (0:55) ----
    // Belém, de manhã. Grua descendo do telhado de Jessé até o terreiro, onde o jumento já está carregado.
    d.world.rule('noite', false, { duration: 0 });
    d.camera.cut({ pos: [22, TOPO + 8, -22], lookAt: [13, TOPO, -28], fov: 55 });
    d.camera.moveTo({ pos: [21.0, TOPO + 2.8, -22.8], lookAt: [15.6, TOPO + 1.1, -25.4], fov: 46 });
    jesse.walkTo([15.5, -26.2], { speed: 0.8 });
    jesse.lookAt([16.4, TOPO + 1.1, -25.0], { duration: 0.5 });
    // [Liberdade] O pai ajeita a carga e fala com o filho de lado, sem olhar para ele.
    // Por cima do ombro do pai, o Davi de frente.
    d.camera.cut({ pos: [17.4, TOPO + 2.05, -27.9], lookAt: [14.2, TOPO + 1.35, -23.9], fov: 44 });
    d.camera.moveTo({ pos: [17.2, TOPO + 2.0, -27.7], lookAt: [14.2, TOPO + 1.35, -23.9], fov: 40 });
    jesse.lookAt(daviB, { duration: 0.4 });
    daviB.turnTo([15.5, -26.2]);
    jesse.say('O rei mandou te chamar. Leva isto como presente. E fala pouco.', { tone: 'firme', to: daviB, gesture: 0.4 });
    daviB.say('Sim, pai.', { to: jesse, gesture: 0 });
    jesse.express('happy', { amount: 0.3 });
    jesse.say('E volta pras ovelhas quando ele te deixar.', { to: daviB, gesture: 0.3 });
    // O Davi leva o jumento para a estrada. O Eliabe, da porta, olha. [Liberdade]
    // Por trás do Eliabe, que olha do canto da casa; a câmera acompanha o Davi saindo com o jumento.
    d.camera.track('davi-belem', { from: [6.9, TOPO + 1.95, -30.4], to: [6.9, TOPO + 2.0, -30.6], duration: 7.5, fov: 50 });
    eliabe.express('angry', { amount: 0.45 });
    const vai = d.background(() => daviB.walkTo([2.0, -22.8], { speed: 1.2 }));
    d.background(() => {
      d.wait(0.6);
      d.do('jumento', 'moveTo', { to: [3.2, -22.8], yaw: 70 }, { duration: vai.end - vai.start - 0.6, ease: 'linear' });
    });
    d.wait(3.2);
    eliabe.behave('watch', { point: [3, TOPO + 1.2, -22.6], mood: 'calm' });
    // [Liberdade] O primogênito, entre os dentes.
    eliabe.say('Agora toca pro rei.', { tone: 'irônico', gesture: 0 });
    d.at(Math.min(vai.end, d.now + 2.4));

    // ---- 4. Diante do rei (1:15) ----
    // Noite outra vez. As portas abertas; o Davi entra, pequeno entre as colunas. Plano largo do alto, do fundo.
    d.world.rule('noite', true, { duration: 0 });
    saul.behave('attend', { object: 'davi', mood: 'worried' });
    for (const id of guardas) d.actor(id).behave('attend', { object: 'davi', mood: 'calm' });
    d.actor('soldado-1').behave('attend', { object: 'davi', mood: 'calm' });
    d.actor('soldado-2').behave('attend', { object: 'davi', mood: 'calm' });
    d.camera.cut({ pos: [101.6, 5.4, -100.6], lookAt: [100, 1.0, -84.0], fov: 50 });
    const entra = davi.walkTo(DIANTE, { speed: 1.1 });
    // [Liberdade] O guarda da porta anuncia.
    d.actor('porta-1').say('O rapaz de Belém, meu senhor.', { to: saul, gesture: 0.2 });
    d.at(entra.start + 3.0);
    // De lado, por trás das colunas, a câmera acompanha o Davi pelo tapete.
    d.camera.track('davi', { from: [105.6, 1.7, -92.0], to: [105.6, 1.75, -95.5], duration: 5, fov: 44 });
    d.at(entra.end - 4.0);
    saul.lookAt(davi, { duration: 0.6 });
    saul.say('Qual é o teu nome, jovem?', { to: davi, gesture: 0.2 });
    d.waitFor(entra);
    davi.behave('attend', { object: 'saul', mood: 'worried' });
    // Os dois de lado: o rei no trono, o rapaz em pé.
    // Por cima do ombro do Davi, alto, o rei no trono.
    d.camera.cut({ pos: [101.2, 1.8, -93.2], lookAt: [100, 1.3, -99.5], fov: 46 });
    d.camera.moveTo({ pos: [101.0, 1.8, -93.6], lookAt: [100, 1.3, -99.5], fov: 44 });
    davi.say('Davi, filho de Jessé, meu senhor.', { tone: 'tímido', to: saul, gesture: 0 });
    saul.say('Disseram-me que sabes tocar.', { tone: 'desconfiado', to: davi, gesture: 0.2 });
    davi.say('Sim, meu senhor.', { to: saul, gesture: 0 });
    // O Davi se senta no banco baixo e começa a tocar.
    davi.sit('banco-davi', 'seat');
    d.do('davi', 'move', { name: 'strum' }, { duration: 0.6 });
    // [GANCHO] Travelling lento do Davi até o rei.
    d.camera.cut({ pos: [101.3, 1.2, -95.4], lookAt: [100, 1.0, -97.2], fov: 42 });
    d.camera.moveTo({ pos: [101.0, 1.45, -99.0], lookAt: [100, 1.5, -101.8], fov: 40 });
    d.wait(1.5);
    // As mãos dele soltam os braços do trono; a respiração acalma.
    d.do('saul', 'move', { name: 'cower', amount: 0 }, { duration: 1.5 });
    saul.behave('attend', { object: 'davi', mood: 'calm' });
    saul.express('happy', { amount: 0.15 });
    d.wait(1.3);
    // Os guardas se entreolham, surpresos.
    d.camera.cut({ pos: [99.9, 1.75, -97.6], lookAt: [97.3, 1.6, -99.6], fov: 40 });
    d.actor('guarda-1').lookAt('guarda-2', { duration: 0.5 });
    d.actor('guarda-1').express('surprised', { amount: 0.5 });
    d.wait(1.1);
    // O rosto do rei, em paz por um instante. Contraplano: o Davi, concentrado na música.
    d.camera.cut({ pos: [100.7, 1.6, -100.1], lookAt: [100, 1.5, -101.8], fov: 36 });
    d.narrate('Um rei que perdera a paz.');
    d.camera.cut({ pos: [100.6, 1.25, -98.6], lookAt: [100, 1.05, -97.0], fov: 36 });
    d.narrate('Um jovem que não sabia o que o esperava.');
    // A música termina. O Saul abre os olhos e fica olhando o Davi.
    d.do('davi', 'move', { name: 'strum', amount: 0 }, { duration: 0.6 });
    d.camera.cut({ pos: [100.9, 1.9, -94.4], lookAt: [100, 1.3, -100.5], fov: 46 });
    d.camera.moveTo({ pos: [100.8, 1.85, -94.8], lookAt: [100, 1.3, -100.5], fov: 42 });
    saul.express('happy', { amount: 0 });
    saul.lookAt(davi, { duration: 0.5 });
    davi.lookAt(saul, { duration: 0.5 });
    d.wait(0.8);
    saul.say('Fica comigo. Serás meu escudeiro.', { tone: 'firme', to: davi, gesture: 0.3 });
    // O Davi se levanta e se ajoelha.
    davi.standUp([100, -96.2], { yaw: 0 });
    d.do('davi', 'move', { name: 'kneel' }, { duration: 1 });
    d.wait(0.8);

    // ---- 5. A ameaça (2:05) ----
    // Amanhecer. O pátio do palácio. O Davi sai e olha o horizonte.
    d.world.rule('noite', false, { duration: 0 });
    d.world.rule('amanhecer', true, { duration: 0 });
    d.camera.cut({ pos: [101.6, 1.7, -76.2], lookAt: [100, 1.4, -80.6], fov: 44 });
    daviP.lookAt([100, 3.0, -50], { duration: 0.8 });
    d.wait(0.8);
    // [GANCHO] O mensageiro, coberto de poeira, entra correndo pelo portão.
    d.camera.track('mensageiro', { from: [104.6, 1.6, -78.0], to: [104.2, 1.6, -78.6], duration: 5.5, fov: 42 });
    const corre = mensageiro.runTo([100.5, -78.6], { speed: 4.0 });
    for (const id of ['sentinela-1', 'sentinela-2', 'davi-patio']) d.actor(id).behave('attend', { object: 'mensageiro', mood: 'worried' });
    d.at(corre.end - 1.0);
    mensageiro.say('Os filisteus!', { tone: 'grito', gesture: 0.4 });
    d.waitFor(corre);
    d.camera.cut({ pos: [105.4, 1.85, -81.5], lookAt: [100.6, 1.45, -78.6], fov: 44 });
    mensageiro.say('Estão reunindo seus homens em Socó!', { tone: 'sem fôlego', to: 'sentinela-2', gesture: 0.6 });
    // Os soldados correm para dentro, chamar o rei. [Liberdade]
    d.background(() => d.actor('sentinela-1').runTo([99.0, -84.5], { speed: 3.4 }));
    d.background(() => d.actor('sentinela-2').runTo([101.0, -84.5], { speed: 3.4 }));
    daviP.express('surprised', { amount: 0.4 });
    d.wait(0.6);
    // O horizonte: na crista, uma fileira de lanças avançando contra o céu.
    d.camera.cut({ pos: [146, d.ground(146, -51) + 0.5, -51], lookAt: [143, d.ground(143, -60) + 2.4, -60], fov: 50 });
    marcha.forEach((m, i) => d.background(() => d.actor(m.id!).walkTo([m.at[0] + 16, m.at[1]], { speed: 0.9 + (i % 3) * 0.03 })));
    d.camera.moveTo({ pos: [147, d.ground(147, -52) + 0.5, -52], lookAt: [149, d.ground(149, -60) + 2.4, -60], fov: 46 });
    d.narrate('Enquanto Davi aprendia a servir ao rei, uma ameaça se aproximava de Israel. Uma ameaça que faria até os mais valentes tremerem.');
    d.wait(0.4);
    d.endCard({
      title: 'Você teria coragem de tocar para um rei assim?',
      options: [{ label: 'TOCAVA', icon: '🎶' }, { label: 'FUGIA', icon: '🚪' }],
      cta: 'Comenta TOCAVA ou FUGIA 👇 e marca quem ia tremer na frente do rei',
    }, { duration: 6 });
    d.at(d.now - 6);
    d.narrate('No próximo episódio: quarenta dias.');
  },
);
