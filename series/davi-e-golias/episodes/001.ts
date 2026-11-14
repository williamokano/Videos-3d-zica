import type { CastMember } from '../../../src/engine/character/cast';
import { direct } from '../../../src/engine/timeline/direct';

/*
 * Episódio 1, "O escolhido". Roteiro de trabalho em series/davi-e-golias/roteiros/001-roteiro.md (as cenas abaixo
 * têm os mesmos números); regras da série em series/davi-e-golias/biblia.md. Lugar: world/belem.json (gerado por
 * world/gerar-belem.py).
 *
 * Sem áudio por enquanto: as falas não têm voz gravada e duram o que o texto pede.
 *
 * Samuel chega a Belém e os anciãos tremem. O Davi toca harpa no pasto. À noite, na casa de Jessé, os sete filhos
 * passam diante do Samuel e nenhum é o escolhido. Mandam buscar o caçula; o Samuel o unge. O Saul, sozinho no
 * escuro, é atormentado.
 *
 * A história pula de lugar: quem aparece em mais de um tem uma entrada no elenco para cada um, já posta lá
 * ("davi" no pasto, "davi-casa" chegando à casa; "sama" na casa, "sama-campo" correndo para o pasto).
 */

/** Altura do topo do morro da cidade (gerar-belem.py: TOPO). */
const TOPO = 10;
/** A casa de Jessé por dentro: x de 8 a 17, z de -36 a -29.5; a porta no meio da parede sul, em x = 12.5. */
/** Onde o Samuel fica diante dos filhos, e a fila deles, de oeste para leste, por ordem de idade. */
const FRENTE_Z = -32.2;
const FILA_Z = -31.0;
const FILHOS = ['eliabe', 'abinadabe', 'sama', 'natanael', 'radai', 'ozem', 'eliu'];
const FILA_X = [8.9, 9.85, 10.8, 11.75, 13.25, 14.2, 15.15];
const NOMES: Record<string, string> = { eliabe: 'Eliabe', abinadabe: 'Abinadabe', sama: 'Samá', natanael: 'Natanael', radai: 'Radai', ozem: 'Ozém', eliu: 'Eliú' };
/** Onde o Davi se senta, ao lado da pedra dele no pasto (gerar-belem.py: PEDRA_DAVI). */
const ASSENTO: [number, number] = [-32.9, 34.6];

const anciao = (n: number, at: [number, number], seed: number): CastMember => ({
  id: `anciao-${n}`, character: 'anciao', at, yaw: 180, seated: 0.42,
  look: { name: `Ancião ${n}`, hair: ['#d8d2c8', '#bdb6aa', '#e6e1d8'][seed % 3], beard: (['full', 'full', 'goatee'] as const)[seed % 3] },
});

export default direct(
  {
    episode: 1,
    title: 'O escolhido',
    location: 'belem',
    cast: [
      // O portão.
      { character: 'samuel', at: [0.4, -14.6], yaw: 0 },
      anciao(1, [-2.2, -24.3], 0),
      anciao(2, [-1.0, -24.3], 1),
      anciao(3, [1.6, -24.3], 2),
      // O pasto.
      { character: 'davi', at: ASSENTO, yaw: 40, seated: 0.55 },
      { id: 'sama-campo', character: 'sama', at: [-24, 20], yaw: 140 },
      // A casa de Jessé.
      { id: 'samuel-casa', character: 'samuel', at: [12.5, -34.6], yaw: 180 },
      { character: 'jesse', at: [10.6, -33.2], yaw: 150 },
      ...FILHOS.map((id, i): CastMember => ({ character: id, at: [FILA_X[i], FILA_Z], yaw: 0 })),
      { id: 'davi-casa', character: 'davi', at: [15.5, -27.3], yaw: 90 },
      // O canto do palácio do Saul (a sala "sala-saul", longe de tudo).
      { id: 'saul', character: 'saul', at: [100, -101.78], yaw: 180, seated: 0.64 },
    ],
    props: [
      { id: 'chifre', asset: 'arms.oilHorn', pos: [0, 0], pocketOf: 'samuel' },
      { id: 'chifre-casa', asset: 'arms.oilHorn', pos: [0, 0], pocketOf: 'samuel-casa' },
      { id: 'harpa', asset: 'arms.lyre', pos: [0, 0], pocketOf: 'davi' },
      { id: 'cajado-casa', asset: 'arms.staff', pos: [0, 0], pocketOf: 'davi-casa' },
      { id: 'novilha', asset: 'ancient.heifer', pos: [1.3, -13.8], params: { rope: 1 } },
    ],
  },
  (d) => {
    const samuel = d.actor('samuel');
    const davi = d.actor('davi');
    const [samuelC, jesse, daviC, samaC] = [d.actor('samuel-casa'), d.actor('jesse'), d.actor('davi-casa'), d.actor('sama-campo')];
    const filho = (id: string) => d.actor(id);

    // ---- O mundo vivo desde o primeiro quadro ----
    d.world.rule('noite', false, { duration: 0 });
    d.world.rule('amanhecer', false, { duration: 0 });
    for (const n of [1, 2, 3]) d.actor(`anciao-${n}`).behave('chat', { group: 'anciaos', mood: 'calm' });
    davi.behave('idle', { mood: 'calm' });
    samaC.behave('idle');
    samuelC.behave('idle');
    jesse.behave('attend', { object: 'samuel-casa' });
    for (const id of FILHOS) filho(id).behave('attend', { object: 'samuel-casa' });
    daviC.behave('idle');
    d.actor('saul').behave('idle', { mood: 'scared' });
    // Fora de quadro: o Samuel com o chifre, o Davi com a harpa.
    d.background(() => samuel.pickUp('chifre', { hand: 'right' }));
    d.background(() => {
      davi.pickUp('harpa', { hand: 'left' });
      d.do('davi', 'move', { name: 'strum' }, { duration: 0.6 });
    });

    /** A point `up` meters above the ground at [x, z]: the road to the gate climbs steeply. */
    const sobre = (x: number, z: number, up: number): [number, number, number] => [x, d.ground(x, z) + up, z];

    // ---- 1. A chegada (0:00) ----
    // Os anciãos conversam no portão; o vento levanta poeira. Depois, o chifre na mão velha e o rosto do Samuel.
    d.camera.cut({ pos: sobre(0.2, -30.5, 1.8), lookAt: sobre(0.2, -16, 1.0), fov: 50 });
    d.wait(1.5);
    // A câmera, à beira da estrada, acompanha o Samuel subindo, girando e deslizando para mantê-lo em quadro.
    d.camera.track('samuel', { from: sobre(4.6, -12.6, 1.9), to: sobre(3.8, -17.4, 2.0), duration: 3.4, fov: 38 });
    const chegada = d.together(
      () => samuel.walkTo([0.4, -21.6], { speed: 1.05 }),
      () => d.do('novilha', 'moveTo', { to: [2.1, -17.0] }, { duration: 5.0, ease: 'linear' }),
    );
    d.at(chegada.start + 3.2);
    // Os anciãos se levantam de uma vez.
    d.camera.cut({ pos: sobre(4.4, -28.6, 1.8), lookAt: sobre(-0.4, -23.2, 1.0), fov: 50 });
    for (const n of [1, 2, 3]) {
      d.actor(`anciao-${n}`).behave('watch', { point: sobre(0.4, -19, 1.6), mood: 'scared' });
      d.background(() => {
        d.wait(n * 0.15);
        d.actor(`anciao-${n}`).standUp([[-2.2, -24.3], [-1.0, -24.3], [1.6, -24.3]][n - 1].map((v, i) => v + (i === 1 ? 0.45 : 0)) as [number, number]);
      });
    }
    d.wait(0.6);
    d.actor('anciao-1').say('É o profeta.', { tone: 'assustado', gesture: 0 });
    d.actor('anciao-2').say('O que ele quer aqui?', { tone: 'sussurro', gesture: 0 });
    d.waitFor(chegada);
    samuel.behave('attend', { object: 'anciao-1' });
    d.actor('anciao-1').walkTo([-0.8, -22.9], { speed: 0.6 });
    d.actor('anciao-1').behave('attend', { object: 'samuel', mood: 'scared' });
    // Os dois de lado, a câmera girando devagar em volta deles.
    d.camera.twoShot('anciao-1', 'samuel', { duration: 8.5, swing: 18, fov: 40, side: -1 });
    d.actor('anciao-1').say('Vens em paz?', { tone: 'nervoso', to: samuel });
    samuel.say('Em paz. Vim oferecer sacrifício ao Senhor. Chamem Jessé e os filhos dele.', { tone: 'calmo', to: 'anciao-1', gesture: 0.3 });

    // A tela de abertura, por cima da imagem.
    d.camera.cut({ pos: [3, TOPO + 3.5, -2], lookAt: [0, TOPO + 3, -22], fov: 46 });
    d.titleCard({ title: 'DAVI', subtitle: 'Uma história de coragem e destino', episode: 'Episódio 1 · O escolhido' }, { duration: 3.6 });
    d.background(() => samuel.walkTo([3.2, -27], { speed: 1 }));
    d.wait(3.6);

    // ---- 2. O pastor (0:14) ----
    // Grua larga sobre as colinas e o rebanho, descendo até o rapaz na pedra. Lá longe, a cidade.
    d.camera.cut({ pos: [-52, 22, 58], lookAt: [-30, 6, 30], fov: 48 });
    d.wait(0.5);
    d.camera.moveTo({ pos: [-38.5, 8.6, 39.5], lookAt: [-31, 7.6, 30], fov: 44 });
    d.narrate('Israel tinha um rei. Um exército. Guerreiros. Mas Deus procurava algo diferente.');
    d.camera.cut({ pos: [-35.2, 7.5, 37.2], lookAt: [-32.9, 7.0, 34.6], fov: 40 });
    d.narrate('Não procurava o mais forte. Procurava aquele cujo coração ainda ninguém conhecia.');
    d.wait(0.6);

    // ---- 3. Os filhos de Jessé (0:34) ----
    // Noite. A casa de Jessé, as lamparinas acesas. Os sete filhos em fila, de túnica limpa.
    d.world.rule('noite', true, { duration: 0 });
    d.camera.cut({ pos: [16.6, TOPO + 2.4, -35.4], lookAt: [11.0, TOPO + 1.1, -31.2], fov: 50 });
    d.camera.moveTo({ pos: [16.5, TOPO + 2.35, -35.3], lookAt: [11.0, TOPO + 1.1, -31.2], fov: 50 });
    d.wait(1.0);
    d.camera.moveTo({ pos: [15.6, TOPO + 2.0, -35.2], lookAt: [10.0, TOPO + 1.2, -31.6], fov: 44 });
    samuelC.behave('attend', { object: 'jesse' });
    // O Samuel vai até o primeiro da fila; a câmera, do canto, acompanha.
    d.camera.track('samuel-casa', { from: [16.3, TOPO + 2.1, -35.3], to: [15.6, TOPO + 2.0, -35.0], duration: 4, fov: 46 });
    samuelC.walkTo([FILA_X[0], FRENTE_Z], { speed: 0.9 });
    samuelC.turnTo(180);
    samuelC.behave('attend', { object: 'eliabe' });
    d.camera.cut({ pos: [11.0, TOPO + 1.75, -34.7], lookAt: [8.9, TOPO + 1.45, -31.6], fov: 44 });
    d.camera.moveTo({ pos: [10.6, TOPO + 1.7, -34.5], lookAt: [8.9, TOPO + 1.45, -31.6], fov: 42 });
    jesse.say('Este é Eliabe. Meu primogênito.', { tone: 'orgulhoso', to: samuelC, gesture: 0.4 });
    // [Liberdade] O pai elogia o primogênito; o Samuel o olha de alto a baixo, devagar.
    jesse.say('É o mais forte de nós. Já serve no exército do rei.', { tone: 'orgulhoso', to: samuelC, gesture: 0.4 });
    samuelC.lookAt([FILA_X[0], TOPO + 1.75, FILA_Z], { duration: 0.8 });
    samuelC.lookAt([FILA_X[0], TOPO + 0.6, FILA_Z], { duration: 1.1 });
    samuelC.lookAt([FILA_X[0], TOPO + 1.7, FILA_Z], { duration: 0.9 });
    samuelC.pickUp('chifre-casa', { hand: 'right' });
    samuelC.say('Certamente este é o ungido do Senhor.', { tone: 'sussurro', gesture: 0 });
    // Ele para. Abaixa o chifre devagar.
    d.camera.track('samuel-casa', { from: [10.6, TOPO + 1.7, -34.2], to: [10.3, TOPO + 1.65, -34.0], duration: 7, fov: 38, aimHeight: -0.05 });
    d.wait(1.6);
    samuelC.say('Não. O homem vê o que está diante dos olhos. Porém o Senhor olha para o coração.', { tone: 'sussurro', gesture: 0 });
    // O Eliabe fica rígido. [Liberdade]
    filho('eliabe').express('angry', { amount: 0.5 });
    filho('eliabe').behave('watch', { point: [8.9, TOPO + 1.6, -36], mood: 'calm' });

    // Os outros, um por um. Cortes rápidos; a cada um, o Samuel balança a cabeça.
    // A câmera acompanha o Samuel ao longo da fila.
    d.camera.track('samuel-casa', { from: [13.8, TOPO + 1.9, -35.4], to: [15.6, TOPO + 1.9, -35.3], duration: 26, fov: 46 });
    for (let i = 1; i < FILHOS.length; i++) {
      const [id, x] = [FILHOS[i], FILA_X[i]];
      samuelC.walkTo([x, FRENTE_Z], { speed: i <= 2 ? 1.0 : 1.4 });
      samuelC.turnTo(180);
      samuelC.behave('attend', { object: id });
      // Os dois primeiros com calma; os outros, mais depressa, como quem já sabe a resposta.
      const calm = i <= 2 ? 1 : 0.55;
      jesse.say(NOMES[id] + '.', { to: samuelC, gesture: 0.2 });
      samuelC.lookAt([x, TOPO + 1.65, FILA_Z], { duration: 0.6 * calm });
      samuelC.lookAt([x, TOPO + 0.8, FILA_Z], { duration: 0.8 * calm });
      samuelC.lookAt([x, TOPO + 1.6, FILA_Z], { duration: 0.6 * calm });
      if (i <= 2) samuelC.say(i === 1 ? 'Também não é este.' : 'Nem este.', { gesture: 0 });
      if (i === 3) filho('sama').say('Nenhum de nós?', { tone: 'sussurro', to: 'abinadabe', gesture: 0 });
    }
    // [GANCHO] Nenhum dos sete.
    samuelC.walkTo([12.5, -33.1], { speed: 1 });
    samuelC.turnTo([10.6, -33.2]);
    samuelC.behave('attend', { object: 'jesse' });
    jesse.turnTo([12.5, -33.1]);
    d.camera.twoShot('samuel-casa', 'jesse', { duration: 9, swing: 16, fov: 42, side: 1 });
    samuelC.say('O Senhor não escolheu nenhum destes. São estes todos os teus filhos?', { to: jesse, gesture: 0.3 });
    jesse.say('Ainda falta o mais novo. Está cuidando das ovelhas.', { tone: 'hesitante', to: samuelC, gesture: 0.3 });
    filho('eliabe').say('O pastorzinho.', { tone: 'ironico', gesture: 0 });
    samuelC.say('Mande buscá-lo. Não nos sentaremos à mesa até que ele chegue.', { tone: 'firme', to: jesse, gesture: 0.3 });

    // ---- 4. O mais novo (1:30) ----
    // As colinas à noite. O Samá sobe correndo até o Davi, que toca perto da fogueira.
    // Câmera semifixa perto do Davi, que acompanha o Samá subindo a colina na direção dela.
    d.camera.track('sama-campo', { from: sobre(-39.6, 36.4, 3.0), to: sobre(-38.9, 35.8, 2.6), duration: 4.4, fov: 40 });
    davi.behave('idle', { mood: 'calm' });
    const corrida = samaC.runTo([-31.4, 33.2], { speed: 3.4 });
    d.at(corrida.end - 1.4);
    samaC.say('Davi!', { tone: 'grito', gesture: 0 });
    d.waitFor(corrida);
    samaC.turnTo(ASSENTO);
    d.do('davi', 'move', { name: 'strum', amount: 0 }, { duration: 0.4 });
    davi.lookAt(samaC, { duration: 0.4 });
    // De frente para o Davi, os dois no quadro, girando devagar.
    d.camera.twoShot('sama-campo', 'davi', { duration: 7, swing: 14, fov: 42, side: 1, height: 1.1 });
    samaC.say('O pai te chama. Agora. O profeta está lá em casa.', { tone: 'urgente', to: davi, gesture: 0.6 });
    davi.say('O profeta? Comigo?', { tone: 'surpreso', to: samaC });

    // A casa. A porta. O Davi entra com a roupa de pastor e o cajado, sem jeito, e para atrás dos irmãos.
    d.background(() => daviC.pickUp('cajado-casa', { hand: 'right' }));
    const entra = daviC.walkTo([12.5, -30.5], { speed: 0.95, via: [[12.5, -27.6]] });
    d.at(entra.start + 0.6);
    d.camera.track('davi-casa', { from: [15.6, TOPO + 2.0, -35.0], to: [15.2, TOPO + 1.9, -34.6], duration: 6, fov: 44 });
    d.at(entra.end - 2.4);
    for (const id of [...FILHOS, 'jesse']) filho(id).behave('attend', { object: 'davi-casa', mood: 'calm' });
    samuelC.behave('attend', { object: 'davi-casa' });
    d.waitFor(entra);
    daviC.behave('attend', { object: 'jesse', mood: 'worried' });
    // Por cima dos ombros dos irmãos, do alto.
    d.camera.cut({ pos: [16.4, TOPO + 2.8, -29.9], lookAt: [12.5, TOPO + 1.3, -32.0], fov: 46 });
    daviC.say('Mandaste me chamar, pai?', { tone: 'tímido', to: jesse, gesture: 0 });
    jesse.say('O profeta quer te ver.', { to: daviC, gesture: 0.3 });
    // O Samuel, de lado: chama o rapaz para perto.
    d.camera.cut({ pos: [15.6, TOPO + 1.9, -31.9], lookAt: [12.5, TOPO + 1.45, -33.0], fov: 42 });
    samuelC.say('Aproxima-te, filho.', { tone: 'calmo', to: daviC, gesture: 0.4 });
    daviC.walkTo([12.5, -31.85], { speed: 0.6 });
    daviC.turnTo(0);
    daviC.behave('attend', { object: 'samuel-casa', mood: 'worried' });
    // Longo silêncio. O Samuel o examina devagar, dando a volta nele; a câmera gira devagar em volta dos dois.
    d.camera.twoShot('samuel-casa', 'davi-casa', { duration: 9, swing: 30, fov: 44, side: 1, height: 1.3, distance: 3.2 });
    samuelC.walkTo([13.2, -31.9], { speed: 0.45 });
    samuelC.lookAt(daviC, { duration: 0.6 });
    d.wait(0.6);
    samuelC.walkTo([12.5, -32.6], { speed: 0.45 });
    samuelC.turnTo(180);
    samuelC.lookAt(daviC, { duration: 0.5 });
    d.wait(1.0);
    samuelC.say('É este.', { tone: 'sussurro', gesture: 0 });
    // O Davi olha para o pai, que faz que sim. Ele se ajoelha.
    daviC.lookAt(jesse, { duration: 0.5 });
    jesse.express('happy', { amount: 0.4 });
    d.wait(0.8);
    daviC.lookAt(samuelC, { duration: 0.4 });
    d.do('davi-casa', 'move', { name: 'kneel' }, { duration: 1 });
    // O Samuel chega perto, para alcançar a cabeça dele.
    samuelC.walkTo([12.5, -32.35], { speed: 0.4 });
    samuelC.turnTo(180);
    // De lado, aberto, a câmera girando devagar em volta dos dois: o azeite cai sobre a cabeça dele.
    d.camera.twoShot('samuel-casa', 'davi-casa', { duration: 5.5, swing: 28, fov: 44, side: 1, height: 1.2, distance: 3.4 });
    d.do('chifre-casa', 'pour', { over: 'davi-casa' }, { duration: 5 });
    // O rosto do Davi, confuso, sem colar: de frente e um pouco de lado; atrás, os irmãos.
    d.camera.cut({ pos: [14.7, TOPO + 1.15, -32.1], lookAt: [12.5, TOPO + 1.0, -31.9], fov: 40 });
    daviC.express('surprised', { amount: 0.5 });
    d.narrate('E naquele dia, enquanto todos ainda viam um pastor, Deus havia escolhido um rei.');
    d.wait(0.8);

    // ---- 5. O gancho (2:20) ----
    // Em outro lugar, o Saul sozinho no escuro, com as mãos na cabeça.
    const saul = d.actor('saul');
    d.camera.cut({ pos: [100.6, 1.5, -98.6], lookAt: [100, 1.2, -101.6], fov: 44 });
    d.do('saul', 'move', { name: 'cower', amount: 0.8 }, { duration: 0.8 });
    d.wait(1.0);
    d.camera.moveTo({ pos: [100.2, 1.35, -99.4], lookAt: [100, 1.2, -101.6], fov: 36 });
    saul.lookAt([97, 1.8, -100], { duration: 0.3 });
    saul.say('Quem está aí?', { tone: 'sussurro', gesture: 0 });
    saul.lookAt([103, 1.6, -99], { duration: 0.25 });
    saul.say('Quem está aí?!', { tone: 'grito', gesture: 0 });
    d.wait(1.2);
    d.endCard({
      title: 'Se você fosse irmão do Davi, ficaria feliz ou com inveja?',
      options: [{ label: 'FELIZ', icon: '🙌' }, { label: 'INVEJA', icon: '😒' }],
      cta: 'Comenta FELIZ ou INVEJA 👇 e marca o irmão que ia te zoar',
    }, { duration: 6 });
    d.at(d.now - 6);
    d.narrate('No próximo episódio: o rei e o pastor.');
  },
);
