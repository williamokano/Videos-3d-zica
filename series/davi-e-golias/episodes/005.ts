import type { CastMember } from '../../../src/engine/character/cast';
import { direct } from '../../../src/engine/timeline/direct';
import { figurante, ids } from '../cena';

/*
 * Episódio 5, "De herói a ameaça". Roteiro de trabalho em series/davi-e-golias/roteiros/005-roteiro.md (v3; as cenas
 * abaixo têm os mesmos números); regras da história em series/davi-e-golias/biblia.md.
 *
 * Gibeá (world/gibea.json, gerado por world/gerar-gibea.py): a estrada chega pelo oeste ao portão; dentro, a praça
 * da festa; no lado norte da praça, o palácio, com a porta e a janela do salão do trono dando para ela.
 *
 * A história pula de dia e de noite e entre a praça e o salão. Quem aparece em mais de um lugar tem uma entrada no
 * elenco para cada um ("saul" no trono, "saul-praca", "saul-janela"; "davi" na praça, "davi-salao"), já posta lá.
 *
 * Eixos: x leste, z sul. yaw 0 olha para o norte, 90 para o oeste, 180 para o sul, -90 para o leste.
 */

// ---- Onde fica cada coisa (world/gerar-gibea.py) ----
/** O trono e o banco do Davi, no salão (o mesmo salão dos eps. 1 e 2, com o canto noroeste em [0, -36]). */
const TRONO: [number, number] = [7, -33.78];
const DIANTE: [number, number] = [7, -28.3];
/** A porta do salão e a janela, na parede sul (z = -14), dando para a praça. */
const PORTA: [number, number] = [7, -14];
const JANELA: [number, number] = [11.6, -14];
/** A frente do palácio, na praça, onde o rei para ao chegar. */
const FRENTE: [number, number] = [7, -11.6];
/** O portão da cidade, no lado oeste da praça; a estrada chega por ali, em z = 3. */
const PORTAO: [number, number] = [-10, 3];
/** Por cima do ombro do Davi sentado no banco, de onde se vê o arremesso; a lança passa por ali e vai além. */
const OMBRO: [number, number, number] = [7.28, 1.22, -28.4];
/** O comprimento da lança do rei. */
const LANCA = 2.4;
/** O meio da praça, onde as mulheres dançam. */
const PRACA: [number, number] = [6, 2];

/** Onde o Davi para diante do rei, e onde o Jônatas chega para vestir nele o manto. */
const DAVI_FRENTE: [number, number] = [FRENTE[0] - 0.2, FRENTE[1] + 2.1];
const PERTO: [number, number] = [DAVI_FRENTE[0] + 0.62, DAVI_FRENTE[1] + 0.12];
/** O meio dos dois, para a câmera. */
const MEIO: [number, number] = [(DAVI_FRENTE[0] + PERTO[0]) / 2, (DAVI_FRENTE[1] + PERTO[1]) / 2];

const rumo = (from: [number, number], to: [number, number]): number => (Math.atan2(-(to[0] - from[0]), -(to[1] - from[1])) * 180) / Math.PI;

// ---- O povo ----
const ROUPAS = ['#c45a7a', '#d9a23a', '#5a8ac4', '#e0d6c0', '#8a4fa8', '#b8644a'];
const LENCOS = ['#f0e6d0', '#c4503a', '#f0e6d0', '#3a6a8a', '#e0c27a', '#efe3c8'];
/** As mulheres que dançam com tamborins, em roda no meio da praça. */
const mulheres: CastMember[] = [[-3, -1.6], [-1.6, 1.8], [0.4, -2.6], [1.8, 1.4], [3.4, -1.2], [-0.4, 3.6]].map(([dx, dz], i) => ({
  id: `mulher-${i + 1}`, character: 'mulher', at: [PRACA[0] + dx, PRACA[1] + dz] as [number, number], yaw: 90,
  look: { name: 'Mulher', wear: [{ id: 'robe', color: ROUPAS[i], accent: '#e0c27a' }, { id: 'headwrap', color: LENCOS[i] }, 'sandals'] },
}));
/** Gente comum: túnica e lenço, sem capacete. */
const gente = (id: string, at: [number, number], yaw: number, seed: number, name: string): CastMember => {
  const m = figurante(id, 'soldado', at, yaw, seed, name);
  return { ...m, look: { ...m.look, wear: [{ id: 'tunic', color: ROUPAS[seed % ROUPAS.length], accent: '#4b3a2a' }, { id: 'headwrap', color: LENCOS[(seed + 2) % LENCOS.length] }, 'sandals'] } };
};
/** O povo em volta da praça, olhando para o portão. */
const povo: CastMember[] = ([[-4, -8], [0, -8.6], [15, -8], [18, -5], [20, 4], [19, 9], [12, 13], [6, 13.6], [-1, 12.5], [-6, 9]] as [number, number][])
  .map((at, i) => gente(`povo-${i + 1}`, at, rumo(at, PORTAO), 300 + i * 11, 'Morador'));
/** O exército voltando: atrás do rei, em duas filas pela estrada. O Davi vem no meio deles. */
const MARCHA_X = -12.5;
const marcha: CastMember[] = Array.from({ length: 8 }, (_, k) => figurante(`marcha-${k + 1}`, 'soldado', [MARCHA_X - 7.5 - Math.floor(k / 2) * 1.9, 3 + (k % 2 ? 1 : -1)], -90, 410 + k * 13, 'Soldado'));
/** Onde cada soldado para na praça: em duas filas, ao longo do lado oeste, de frente para o palácio. */
const PARADA: [number, number][] = marcha.map((_, k) => [-5 + (k % 4) * 1.6, -4.2 + Math.floor(k / 4) * 1.6]);

export default direct(
  {
    episode: 5,
    title: 'De herói a ameaça',
    location: 'gibea',
    cast: [
      // ---- A praça, de dia (cenas 2 a 4) ----
      { id: 'saul-praca', character: 'saul', at: [MARCHA_X + 1.5, 2.2], yaw: -90 },
      { id: 'abner', character: 'abner', at: [MARCHA_X + 1.3, 4.0], yaw: -90 },
      {
        id: 'davi', character: 'davi', at: [MARCHA_X - 3.2, 3.0], yaw: -90,
        // O que o Jônatas vai dar: o manto, o cinto e a espada na bainha aparecem nele quando os recebe.
        look: { wear: [{ id: 'tunic', color: '#a88a62', accent: '#6b5236' }, 'sandals', 'shepherdBag', { id: 'cloak', color: '#2f56a8', accent: '#d9b04a', hidden: true }, { id: 'sash', color: '#2f56a8', accent: '#d9b04a', hidden: true }, { id: 'scabbard', hidden: true }] },
      },
      { id: 'eliabe', character: 'eliabe', at: [MARCHA_X - 5.2, 2.0], yaw: -90 },
      { id: 'sama', character: 'sama', at: [MARCHA_X - 5.4, 4.0], yaw: -90 },
      {
        id: 'jonatas', character: 'jonatas', at: [10.2, -10.2], yaw: rumo([10.2, -10.2], PORTAO),
        // A bainha vazia aparece quando ele tira a espada para dar ao Davi.
        look: { wear: [{ id: 'tunic', color: '#ece4cf', accent: '#2f56a8' }, { id: 'cloak', color: '#2f56a8', accent: '#d9b04a' }, { id: 'sash', color: '#2f56a8', accent: '#d9b04a' }, 'sandals', 'scabbard', { id: 'scabbardEmpty', hidden: true }] },
      },
      { id: 'menino', character: 'mulher', at: [-4.5, 6.4], yaw: rumo([-4.5, 6.4], PORTAO), look: { name: 'Menino', height: 1.25, build: 0.8, hairStyle: 'curly', hair: '#2b1d16', lips: '#b8705a', wear: [{ id: 'tunic', color: '#d9c49a', accent: '#8a6a3a' }, 'sandals'] } },
      ...mulheres,
      ...povo,
      ...marcha,
      // ---- O salão, à noite (cenas 1, 5 e 6) ----
      { id: 'saul', character: 'saul', at: TRONO, yaw: 180, seated: 0.64 },
      { id: 'saul-janela', character: 'saul', at: [JANELA[0], JANELA[1] - 0.75], yaw: 180 },
      { id: 'abner-salao', character: 'abner', at: [PORTA[0] - 0.4, PORTA[1] - 1.2], yaw: 180 },
      gente('servo', [4.2, -24.5], 120, 81, 'Servo'),
      {
        id: 'davi-salao', character: 'davi', at: [PORTA[0], PORTA[1] - 8.6], yaw: 0,
        // Já com o manto azul do Jônatas.
        look: { wear: [{ id: 'tunic', color: '#a88a62', accent: '#6b5236' }, 'sandals', { id: 'cloak', color: '#2f56a8', accent: '#d9b04a' }, { id: 'sash', color: '#2f56a8', accent: '#d9b04a' }] },
      },
    ],
    props: [
      ...mulheres.map((m, i) => ({ id: `tamborim-${i + 1}`, asset: 'arms.tambourine', pos: m.at, pickable: true })),
      // O que o Jônatas dá: o manto e o cinto que ele está usando (soltos quando os tira), a espada da bainha dele e o arco.
      { id: 'manto', asset: 'arms.cloth', pos: [0, 0], pocketOf: 'jonatas', params: { kind: 'cloak', color: '#2f56a8', accent: '#d9b04a' } },
      { id: 'cinto', asset: 'arms.cloth', pos: [0, 0], pocketOf: 'jonatas', params: { kind: 'sash', color: '#2f56a8', accent: '#d9b04a' } },
      { id: 'espada', asset: 'arms.sword', pos: [0, 0], pocketOf: 'jonatas', params: { length: 0.8 } },
      { id: 'arco', asset: 'arms.bow', pos: [0, 0], pocketOf: 'jonatas' },
      // A lança do rei e a harpa do Davi.
      { id: 'lanca', asset: 'arms.spear', pos: [TRONO[0] - 0.5, TRONO[1] + 0.3], params: { length: LANCA }, pickable: true },
      { id: 'harpa', asset: 'arms.lyre', pos: [0, 0], pocketOf: 'davi-salao' },
    ],
  },
  (d) => {
    const [saulP, abner, davi, eliabe, sama, jonatas, menino] = ['saul-praca', 'abner', 'davi', 'eliabe', 'sama', 'jonatas', 'menino'].map((id) => d.actor(id));
    const [saul, saulJ, abnerS, servo, daviS] = ['saul', 'saul-janela', 'abner-salao', 'servo', 'davi-salao'].map((id) => d.actor(id));

    /** Um som de fundo (ambiente ou música) de `from` até agora, com entrada e saída suaves. */
    const ambiente = (name: string, from: number, volume?: number) => {
      const end = d.now;
      d.at(from);
      d.sound(name, { length: end - from, fade: 0.8, ...(volume !== undefined ? { volume } : {}) });
      d.at(end);
    };

    // ---- O mundo vivo desde o primeiro quadro ----
    for (const id of ['amanhecer', 'entardecer', 'fim-de-tarde', 'luz-de-ela']) d.world.rule(id, false, { duration: 0 });
    // A cena 1 é de noite, no salão.
    d.world.rule('noite', true, { duration: 0 });
    for (const id of ids(mulheres)) d.actor(id).behave('chat', { group: 'mulheres', mood: 'happy' });
    for (const id of ids(povo)) d.actor(id).behave('watch', { point: [PORTAO[0], 1.6, PORTAO[1]], mood: 'happy' });
    for (const id of ids(marcha)) d.actor(id).behave('idle', { mood: 'happy' });
    for (const a of [saulP, abner, davi, eliabe, sama]) a.behave('idle', { mood: 'calm' });
    jonatas.behave('watch', { point: [PORTAO[0], 1.6, PORTAO[1]], mood: 'calm' });
    menino.behave('watch', { point: [PORTAO[0], 1.3, PORTAO[1]], mood: 'happy' });
    saulJ.behave('idle', { mood: 'calm' });
    abnerS.behave('idle', { mood: 'calm' });
    servo.behave('idle', { mood: 'worried' });
    daviS.behave('idle', { mood: 'calm' });
    saul.behave('attend', { object: 'banco-davi', mood: 'worried' });
    // Fora de quadro, cada um pega o que vai segurar: os tamborins, a lança do rei, a harpa.
    mulheres.forEach((m, i) => d.background(() => d.actor(m.id!).pickUp(`tamborim-${i + 1}`, { hand: 'right', duration: 0.3 })));
    d.background(() => daviS.pickUp('harpa', { hand: 'left', duration: 0.3 }));
    saul.pickUp('lanca', { hand: 'right', duration: 0.3 });

    // ---- 1. Gancho (0:00) ----
    // [Sugestão aceita] Escuro. Uma harpa toca baixinho. O rei no trono, a lança em pé na mão, olhando fixo para a
    // frente, para onde alguém toca. A câmera chega perto; de lado, a mão aperta o cabo, com o rosto dele em cima.
    d.at(0);
    saul.behave('watch', { point: [DIANTE[0], 1.0, DIANTE[1] - 0.7], mood: 'calm' });
    saul.express('angry', { amount: 0.8 });
    d.camera.cut({ pos: [TRONO[0] + 0.5, 1.15, TRONO[1] + 3.6], lookAt: [TRONO[0] - 0.1, 1.35, TRONO[1]], fov: 40 });
    d.camera.moveTo({ pos: [TRONO[0] + 0.35, 1.25, TRONO[1] + 2.6], lookAt: [TRONO[0] - 0.1, 1.4, TRONO[1]], fov: 38 });
    d.sound('harpa-pastor', { length: 3.6, fade: 0.4 });
    d.sound('tensao-saul');
    d.wait(1.7);
    d.camera.cut({ pos: [TRONO[0] + 0.45, 1.35, TRONO[1] + 1.9], lookAt: [TRONO[0] - 0.12, 1.3, TRONO[1] + 0.15], fov: 38 });
    saul.hand('fist', { hand: 'right', duration: 0.9 });
    d.wait(1.2);

    // ---- Abertura ----
    d.world.rule('noite', false, { duration: 0 });
    d.camera.cut({ pos: [PRACA[0] + 6, 3.2, PRACA[1] + 9], lookAt: [PORTAO[0], 2.4, PORTAO[1]], fov: 44 });
    d.sound('titulo-impacto');
    d.titleCard({ title: 'DAVI', subtitle: 'Uma história de coragem e destino', episode: 'Episódio 5 · De herói a ameaça' }, { duration: 3.4 });

    // ---- 2. A volta (0:05) ----
    // O exército entra pelo portão: o rei e o Abner na frente, o Davi no meio dos soldados, sem armadura.
    let cena = d.now;
    d.sound('marcha-exercito', { length: 22, fade: 1.5 });
    const chega = d.together(
      () => saulP.walkTo(FRENTE, { speed: 1.6, via: [[PORTAO[0] - 2, PORTAO[1] - 0.6], [PORTAO[0] + 3, PORTAO[1] - 1.4]] }),
      () => abner.walkTo([FRENTE[0] + 2.2, FRENTE[1] + 0.2], { speed: 1.6, via: [[PORTAO[0] - 2, PORTAO[1] + 1], [PORTAO[0] + 3, PORTAO[1] + 0.4]] }),
      () => davi.walkTo([1.5, -3.2], { speed: 1.3, via: [[PORTAO[0] - 2, PORTAO[1]], [PORTAO[0] + 3, PORTAO[1]]] }),
      // A tropa e os irmãos vêm atrás, no passo deles: a cena não espera por eles.
      () => {
        d.background(() => eliabe.walkTo([-2.4, -1.4], { speed: 1.3, via: [[PORTAO[0] - 2, PORTAO[1] - 0.8], [PORTAO[0] + 3, PORTAO[1] - 0.8]] }));
        d.background(() => sama.walkTo([-1.0, -0.6], { speed: 1.3, via: [[PORTAO[0] - 2, PORTAO[1] + 0.8], [PORTAO[0] + 3, PORTAO[1] + 0.8]] }));
        marcha.forEach((m, k) => d.background(() => d.actor(m.id!).walkTo(PARADA[k], { speed: 1.3, via: [[PORTAO[0] - 2, PORTAO[1] + (k % 2 ? 1 : -1)], [PORTAO[0] + 3, PORTAO[1] + (k % 2 ? 1 : -1)]] })));
      },
      () => {
        // [GANCHO] De dentro da praça, por trás das mulheres que dançam, a tropa entrando pelo portão.
        d.wait(0.6);
        for (const id of ids(mulheres)) d.actor(id).behave('watch', { point: [PORTAO[0], 1.6, PORTAO[1]], mood: 'happy' });
        for (const id of ids(mulheres)) d.background(() => d.do(id, 'move', { name: 'dance' }, { duration: 0.8 }));
        d.sound('festa-tamborins', { length: 30, fade: 1 });
        // Do alto, por cima das mulheres que dançam: a tropa entrando pelo portão.
        d.camera.cut({ pos: [PRACA[0] + 4.5, 3.0, PRACA[1] + 6.5], lookAt: [PORTAO[0] + 2, 1.2, PORTAO[1]], fov: 40 });
        d.wait(0.5);
        d.actor('povo-9').say('É ele! O rapaz do gigante!', { tone: 'animado', gesture: 0.6 });
        // O menino corre ao encontro do Davi.
        d.background(() => menino.runTo([-3.2, 1.4], { speed: 2.6 }));
        d.camera.track('davi', { from: [-1.2, 1.6, 6.5], to: [0.2, 1.6, 5.2], duration: 4, fov: 40 });
        menino.behave('attend', { object: 'davi', mood: 'happy' });
        davi.express('happy', { amount: 0.3 });
        // As mulheres cantam para o rei que chega.
        d.camera.cut({ pos: [PRACA[0] - 5.0, 1.7, PRACA[1] + 5.6], lookAt: [PRACA[0], 1.45, PRACA[1]], fov: 38 });
        d.actor('mulher-2').say('Saul derrotou os seus milhares...', { tone: 'animado', gesture: 0 });
        d.actor('mulher-4').say('...e Davi, os seus dez milhares!', { tone: 'animado', gesture: 0 });
        // O rei acena sem entender; ao lado, o Abner entende e olha de lado para ele. A câmera vai com os dois.
        d.camera.track('abner', { from: [9.0, 1.85, -1.6], to: [9.4, 1.85, -3.0], duration: 4.4, fov: 38 });
        d.do('saul-praca', 'move', { name: 'cheer', amount: 0.45 }, { duration: 0.7 });
        abner.lookAt('saul-praca', { duration: 0.6 });
        abner.express('sad', { amount: 0.35 });
        d.wait(1.6);
        d.do('saul-praca', 'move', { name: 'cheer', amount: 0 }, { duration: 0.6 });
        abner.lookAhead({ duration: 0.6 });
        // [Liberdade] No meio da tropa, os irmãos veem o povo cercar o caçula.
        for (const id of ids(mulheres)) d.actor(id).behave('attend', { object: 'davi', mood: 'happy' });
        d.camera.cut({ pos: [0.9, 1.75, 1.7], lookAt: [-1.7, 1.55, -1.0], fov: 36 });
        sama.lookAt('davi', { duration: 0.4 });
        sama.say('Olha lá o caçula, Eliabe.', { tone: 'animado', to: eliabe, gesture: 0.4 });
        eliabe.lookAt('davi', { duration: 0.4 });
        eliabe.say('Tô vendo.', { tone: 'bravo', gesture: 0 });
        eliabe.lookAhead({ duration: 0.6 });
      },
    );
    for (const id of ['eliabe', 'sama']) d.actor(id).behave('attend', { object: 'davi', mood: id === 'sama' ? 'happy' : 'calm' });
    ambiente('marcha-exercito', cena, 0.0001);

    // ---- 3. "Ficas na minha casa" (0:38) ----
    // Na frente do palácio, o rei chama o Davi. O povo abre caminho.
    d.waitFor(chega);
    saulP.behave('idle', { mood: 'calm' });
    saulP.turnTo(onde('davi'));
    d.camera.cut({ pos: [FRENTE[0] - 2.4, 1.7, FRENTE[1] + 5.6], lookAt: [FRENTE[0], 1.5, FRENTE[1] + 1], fov: 42 });
    saulP.say('Davi.', { tone: 'firme', to: davi, gesture: 0.3 });
    // O povo abre caminho; a câmera vai com o Davi até a frente do palácio.
    const vem = davi.walkTo(DAVI_FRENTE, { speed: 1.35 });
    d.at(vem.start);
    d.camera.track('davi', { from: [0.2, 1.75, -1.0], to: [2.2, 1.75, -4.2], duration: (vem.end - vem.start) / 2, fov: 40 });
    // No meio do caminho, de frente: o Davi vindo, o povo atrás dele.
    d.background(() => {
      d.wait((vem.end - vem.start) / 2);
      d.camera.track('davi', { from: [FRENTE[0] + 0.6, 1.8, FRENTE[1] + 0.9], to: [FRENTE[0] + 0.4, 1.8, FRENTE[1] + 0.7], duration: (vem.end - vem.start) / 2, fov: 38 });
    });
    for (const id of ['povo-1', 'povo-2', 'mulher-3']) d.actor(id).behave('attend', { object: 'davi', mood: 'happy' });
    d.waitFor(vem);
    davi.turnTo(onde('saul-praca'));
    davi.behave('attend', { object: 'saul-praca', mood: 'calm' });
    saulP.behave('attend', { object: 'davi', mood: 'calm' });
    d.conversa([
      ['saul-praca', 'De hoje em diante, ficas na minha casa. Não voltas mais para as ovelhas do teu pai.', { tone: 'firme' }],
      ['davi', 'Teu servo fará o que o rei mandar.'],
    ]);
    // A mão no ombro. [GANCHO] O povo grita o nome do Davi; a mão para; o sorriso fica, os olhos não.
    saulP.pointAt([FRENTE[0] - 0.4, 1.4, FRENTE[1] + 2.0], { hand: 'right', duration: 2.4 });
    d.background(() => {
      d.wait(0.5);
      d.actor('povo-3').say('Davi! Davi!', { tone: 'grito', gesture: 0.8 });
    });
    d.background(() => {
      for (const id of ids(povo)) d.background(() => d.do(id, 'move', { name: 'cheer', amount: 0.8 }, { duration: 0.6 }));
    });
    d.camera.cut({ pos: [FRENTE[0] + 0.35, 1.95, FRENTE[1] + 1.7], lookAt: [FRENTE[0], 1.9, FRENTE[1]], fov: 34 });
    saulP.express('happy', { amount: 0.25 });
    d.wait(1.6);
    saulP.express('angry', { amount: 0.3, duration: 1.2 });
    d.wait(1.0);

    // ---- 4. Jônatas (0:52) ----
    // À beira da praça, o filho do rei observa o Davi. Ele se aproxima.
    saulP.behave('attend', { object: 'jonatas', mood: 'calm' });
    jonatas.behave('attend', { object: 'davi', mood: 'calm' });
    // Visto do oeste: a janela do salão (com o rei da noite lá dentro) fica fora do quadro.
    d.camera.cut({ pos: [FRENTE[0] - 1.0, 1.75, FRENTE[1] + 3.2], lookAt: [onde('jonatas')[0], 1.6, onde('jonatas')[1]], fov: 36 });
    const vai = jonatas.walkTo([FRENTE[0] + 1.6, FRENTE[1] + 2.4], { speed: 1.0 });
    d.waitFor(vai);
    jonatas.turnTo(onde('davi'));
    davi.turnTo(onde('jonatas'));
    davi.behave('attend', { object: 'jonatas', mood: 'calm' });
    d.conversa([
      ['jonatas', 'Foste tu que enfrentaste Golias?'],
      ['davi', 'Foi o Senhor quem me deu a vitória.', { tone: 'firme' }],
    ]);
    // Ele tira o próprio manto e põe nos ombros do Davi.
    d.camera.cut({ pos: [MEIO[0] - 0.4, 1.6, MEIO[1] + 3.6], lookAt: [MEIO[0], 1.3, MEIO[1]], fov: 40 });
    jonatas.express('happy', { amount: 0.4 });
    d.do('manto', 'doff', { wear: 'cloak' });
    // Um passo até o Davi, para alcançar os ombros dele.
    jonatas.walkTo(PERTO, { speed: 0.8 });
    jonatas.turnTo(onde('davi'));
    d.do('manto', 'don', { on: 'davi', wear: 'cloak' });
    // Os dois estão perto: a conversa vira plano de lado, e o lado é o da praça (do outro está o rei).
    d.conversa([
      ['davi', 'Esse é o manto do príncipe.', { tone: 'surpreso' }],
      ['jonatas', 'Fica com ele. E com isto também.'],
    ], { side: -1 });
    // A espada, o cinto, o arco: um de cada vez. O Davi segura sem saber onde pôr as mãos.
    d.camera.cut({ pos: [MEIO[0] + 0.5, 1.5, MEIO[1] + 3.0], lookAt: [MEIO[0], 1.2, MEIO[1]], fov: 38 });
    d.do('espada', 'draw', { by: 'jonatas', from: 'jonatas' });
    jonatas.lower({ duration: 0.6 });
    d.do('espada', 'give', { to: 'davi' });
    davi.putAway('espada', { duration: 0.6 });
    d.do('davi', 'set', { channel: 'wear.scabbard', value: 1 }, { duration: 0 });
    d.background(() => {
      d.wait(0.4);
      davi.say('Eu sou filho de um pastor, Jônatas.', { to: jonatas, gesture: 0 });
    });
    d.do('cinto', 'doff', { wear: 'sash' });
    d.do('cinto', 'don', { on: 'davi', wear: 'sash' });
    jonatas.pickUp('arco', { hand: 'right', duration: 0.6 });
    d.do('arco', 'give', { to: 'davi' });
    jonatas.say('E eu, de um rei. Hoje isso não importa.', { to: davi, gesture: 0 });
    // [GANCHO] Órbita curta em volta dos dois.
    d.camera.orbit({ center: [MEIO[0], 1.55, MEIO[1]], radius: 3.0, height: 0.2, from: -25, to: 25, duration: 8, fov: 38 });
    jonatas.say('A partir de hoje, és meu irmão. Eu te amo como à minha própria vida.', { tone: 'firme', to: davi, gesture: 0.4 });
    davi.express('happy', { amount: 0.4 });
    // No alto da porta, no fundo do quadro, o rei vê o filho dar o manto real ao pastor.
    d.camera.cut({ pos: [FRENTE[0] - 1.6, 1.75, FRENTE[1] + 1.7], lookAt: [FRENTE[0], 1.85, FRENTE[1]], fov: 34 });
    saulP.lookAt(davi, { duration: 0.6 });
    saulP.express('angry', { amount: 0.4 });
    d.wait(1.8);
    ambiente('festa-tamborins', cena, 0.5);

    // ---- 5. A janela (1:22) ----
    // Noite. O rei, sozinho à janela do salão. Lá embaixo, as fogueiras e o povo ainda cantando.
    cena = d.now;
    d.world.rule('noite', true, { duration: 0 });
    for (const id of ids(mulheres)) d.actor(id).behave('chat', { group: 'mulheres', mood: 'happy' });
    saulJ.behave('watch', { point: [PRACA[0], 0.8, PRACA[1]], mood: 'calm' });
    d.camera.cut({ pos: [JANELA[0] - 0.4, 2.1, JANELA[1] - 1.55], lookAt: [PRACA[0] + 3, 0.4, PRACA[1] + 2], fov: 46 });
    d.sound('fogueira-noite', { length: 30, fade: 1 });
    d.actor('mulher-1').say('Saul derrotou os seus milhares...', { tone: 'animado', gesture: 0 });
    d.actor('mulher-5').say('...e Davi, os seus dez milhares!', { tone: 'animado', gesture: 0 });
    // Agora ele entende. Do lado de fora da janela, o rosto do rei.
    d.camera.cut({ pos: [JANELA[0] + 0.15, 1.85, JANELA[1] + 1.4], lookAt: [JANELA[0], 1.85, JANELA[1] - 0.75], fov: 32 });
    saulJ.express('angry', { amount: 0.3, duration: 1 });
    saulJ.say('Dez milhares? E a mim... apenas milhares?', { tone: 'baixo', gesture: 0 });
    // [GANCHO] O Abner entra pela porta grande.
    const entra = abnerS.walkTo([JANELA[0] - 2.0, JANELA[1] - 2.3], { speed: 1.1 });
    d.waitFor(entra);
    abnerS.turnTo(onde('saul-janela'));
    saulJ.turnTo(onde('abner-salao'));
    abnerS.behave('attend', { object: 'saul-janela', mood: 'calm' });
    saulJ.behave('attend', { object: 'abner-salao', mood: 'worried' });
    d.conversa([
      ['abner-salao', 'Majestade. O povo pede o rapaz na praça.'],
      ['saul-janela', 'Deram a ele dez milhares. O que mais lhe falta? Só o reino.', { tone: 'bravo' }],
    ]);
    // Silêncio. O Abner não responde.
    d.wait(1.2);
    d.conversa([
      ['saul-janela', 'Abner. De hoje em diante, os teus olhos nele.', { tone: 'firme' }],
      ['abner-salao', 'Sim, majestade.'],
    ]);
    // O rosto do rei na janela, de fora, de perto (o rosto inteiro, não só os olhos).
    saulJ.turnTo(180);
    saulJ.behave('watch', { point: [PRACA[0], 0.8, PRACA[1]], mood: 'worried' });
    d.camera.cut({ pos: [JANELA[0] + 0.1, 1.85, JANELA[1] + 1.3], lookAt: [JANELA[0], 1.8, JANELA[1] - 0.75], fov: 30 });
    d.wait(2.2);
    ambiente('palacio-noite', cena, 0.6);

    // ---- 6. A lança (1:55) ----
    // Outra noite. O salão quase sem luz. O rei, no trono, encolhido: o espírito mau, só no comportamento.
    cena = d.now;
    d.camera.cut({ pos: [TRONO[0] + 2.2, 2.4, TRONO[1] + 6.5], lookAt: [TRONO[0], 1.2, TRONO[1]], fov: 42 });
    d.do('saul', 'move', { name: 'cower', amount: 0.8 }, { duration: 1 });
    saul.express('scared', { amount: 0.5 });
    d.sound('tensao-saul');
    d.wait(0.8);
    servo.say('O rei está mal de novo. Chamem o Davi.', { tone: 'preocupado', gesture: 0.4 });
    // O rei, sozinho com a canção na cabeça. [Liberdade]
    d.background(() => {
      d.wait(1.2);
      saul.say('Dez milhares...', { tone: 'baixo', gesture: 0 });
    });
    // O Davi entra com a harpa, ainda com o manto azul do Jônatas.
    d.sound('porta-madeira-passos');
    const harpista = d.background(() => daviS.walkTo(DIANTE, { speed: 1.1 }));
    d.camera.track('davi-salao', { from: [TRONO[0] + 3.8, 1.7, -21.5], to: [TRONO[0] + 3.8, 1.75, -25.0], duration: 4.5, fov: 44 });
    d.waitFor(harpista);
    daviS.sit('banco-davi', 'seat');
    daviS.behave('attend', { object: 'saul', mood: 'calm' });
    d.do('davi-salao', 'move', { name: 'strum' }, { duration: 0.6 });
    const harpa = d.now;
    // O Davi tocando, como no ep. 2: de frente, do lado do trono, de corpo inteiro no banco, com a harpa.
    d.camera.cut({ pos: [DIANTE[0] + 1.5, 1.35, DIANTE[1] - 3.6], lookAt: [DIANTE[0], 0.75, DIANTE[1] - 0.7], fov: 42 });
    d.wait(2.2);
    // O mesmo travelling do ep. 2, do Davi até o rei. Mas agora o Saul não fecha os olhos: olha fixo para o Davi.
    d.camera.cut({ pos: [TRONO[0] + 1.3, 1.2, TRONO[1] + 6.4], lookAt: [TRONO[0], 1.0, TRONO[1] + 4.6], fov: 42 });
    d.camera.moveTo({ pos: [TRONO[0] + 1.0, 1.45, TRONO[1] + 2.8], lookAt: [TRONO[0], 1.5, TRONO[1]], fov: 40 });
    d.do('saul', 'move', { name: 'cower', amount: 0 }, { duration: 1.5 });
    saul.express('scared', { amount: 0 });
    saul.behave('watch', { point: [DIANTE[0], 1.1, DIANTE[1] - 0.7], mood: 'calm' });
    d.wait(2.4);
    // A mão aperta a lança: o mesmo plano do gancho, o rosto em cima e a mão no cabo embaixo.
    d.camera.cut({ pos: [TRONO[0] + 0.45, 1.35, TRONO[1] + 1.9], lookAt: [TRONO[0] - 0.12, 1.3, TRONO[1] + 0.15], fov: 38 });
    saul.hand('fist', { hand: 'right', duration: 1.0 });
    d.wait(0.8);
    // [GANCHO, pico] O rosto do rei, de perto.
    d.camera.cut({ pos: [TRONO[0] + 0.45, 1.65, TRONO[1] + 2.0], lookAt: [TRONO[0], 1.55, TRONO[1]], fov: 32 });
    saul.express('angry', { amount: 0.6, duration: 0.8 });
    saul.say('Vou cravar o Davi na parede.', { tone: 'baixo', gesture: 0 });
    // A música para. O Davi levanta os olhos.
    d.do('davi-salao', 'move', { name: 'strum', amount: 0 }, { duration: 0.4 });
    ambiente('harpa-pastor', harpa, 0.55);
    d.camera.cut({ pos: [DIANTE[0] + 0.7, 1.3, DIANTE[1] - 3.1], lookAt: [DIANTE[0], 0.95, DIANTE[1] - 0.7], fov: 34 });
    daviS.behave('attend', { object: 'saul', mood: 'worried' });
    daviS.lookAt('saul', { duration: 0.4 });
    d.wait(0.6);
    // O rei se levanta, com a lança. O rosto do Davi muda.
    // De lado, longe da linha entre os dois: o Davi fica fora do caminho da câmera.
    d.camera.cut({ pos: [TRONO[0] + 2.8, 1.55, TRONO[1] + 2.2], lookAt: [TRONO[0], 1.6, TRONO[1] + 0.5], fov: 40 });
    saul.standUp([TRONO[0], TRONO[1] + 0.9], { yaw: 180, duration: 0.9 });
    d.camera.cut({ pos: [DIANTE[0] - 0.5, 1.35, DIANTE[1] - 3.0], lookAt: [DIANTE[0], 1.05, DIANTE[1] - 0.7], fov: 30 });
    daviS.express('scared', { amount: 0.75, duration: 0.3 });
    d.wait(0.6);
    // [GANCHO, pico] O arremesso, do lugar do Davi: por cima do ombro dele, o rei arremessa e a lança vem direto na
    // lente, em câmera lenta. Corta antes de ela chegar: ninguém vê o que ela acerta (18:11).
    d.camera.cut({ pos: OMBRO, lookAt: [TRONO[0], 1.6, TRONO[1] + 0.9], fov: 42 });
    // A mão solta acima do ombro direito do rei (o mesmo ponto que o "throw" usa). A lança vem entre a lente e a
    // cabeça do Davi, rente aos dois: em diagonal, com a haste à vista, ela lê como lança, e não se vê onde acaba.
    const escala = 1.95 / 1.7;
    const mao: [number, number, number] = [TRONO[0] - 0.25 * escala, 1.85 * escala, TRONO[1] + 0.9 + 0.3 * escala];
    const RENTE: [number, number, number] = [OMBRO[0] - 0.12, OMBRO[1] + 0.1, OMBRO[2]];
    const rumoRente = [RENTE[0] - mao[0], RENTE[1] - mao[1], RENTE[2] - mao[2]];
    const ateRente = Math.hypot(...rumoRente);
    const alem: [number, number, number] = [mao[0] + rumoRente[0] * 1.4, mao[1] + rumoRente[1] * 1.4, mao[2] + rumoRente[2] * 1.4];
    const VELOCIDADE = 9;
    const arremesso = d.do('lanca', 'throw', { to: alem, speed: VELOCIDADE, arc: 0, tip: true }, { ease: 'linear' });
    // O ponto que voa é o pé da lança; a ponta vai LANCA metros à frente. Corta quando a ponta está a 0,5 m de passar.
    const solta = arremesso.start + 0.45;
    const corte = solta + Math.max(0.05, ateRente - LANCA - 0.5) / VELOCIDADE;
    d.slowMo(solta - 0.05, corte, 5);
    d.at(corte);
    d.sound('lanca-parede');
    // O rei, depois do arremesso, ofegante, olhando para onde ela foi. O alvo fica fora do quadro.
    d.camera.cut({ pos: [TRONO[0] + 1.9, 1.62, TRONO[1] + 3.2], lookAt: [TRONO[0], 1.6, TRONO[1] + 0.9], fov: 34 });
    d.camera.moveTo({ pos: [TRONO[0] + 1.5, 1.62, TRONO[1] + 2.6], lookAt: [TRONO[0], 1.62, TRONO[1] + 0.9], fov: 32 });
    saul.express('angry', { amount: 0.5, duration: 0.6 });
    // O braço do arremesso volta devagar para o lado do corpo.
    d.waitFor(arremesso);
    d.do('saul', 'move', { name: 'throw', amount: 0 }, { duration: 1.2 });
    ambiente('palacio-noite', cena, 0.4);

    // ---- 7. Fim (2:25) ----
    d.sound('musica-saul', { length: 18, fade: 1.5 });
    d.narrate('Davi havia derrotado o gigante de Israel. Mas agora teria que enfrentar algo muito mais próximo. A inveja de um rei.');
    d.wait(0.6);
    const cartao = d.endCard({
      title: 'Você fugia do palácio ou ficava com o rei?',
      options: [{ label: 'FUGIR', icon: '🏃' }, { label: 'FICAR', icon: '👑' }],
      cta: 'Comenta FUGIR ou FICAR 👇 e marca quem tá esperando a segunda temporada',
    }, { duration: 7.5 });
    d.at(cartao.start + 0.4);
    d.narrate('Você fugia do palácio, ou ficava com o rei? Comenta aí. A segunda temporada vem aí.');
    d.waitFor(cartao);

    /** Onde alguém está agora, no chão: para virar para ele ou mirar a câmera nele. */
    function onde(id: string): [number, number] {
      const [x, , z] = d.where(id);
      return [x, z];
    }
  },
);
