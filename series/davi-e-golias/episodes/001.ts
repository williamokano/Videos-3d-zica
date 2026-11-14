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
/**
 * A casa de Jessé por dentro (gerar-belem.py): x de 8 a 15, z de -36 a -30.8, pequena e apertada. A porta no meio
 * da parede sul, em x = 11; o banco de barro na parede do fundo, onde o Samuel se senta.
 */
const PORTA: [number, number] = [11.0, -30.8];
const BANCO: [number, number] = [11.5, -35.5];
/** Onde cada filho para diante do Samuel. */
const DIANTE: [number, number] = [11.5, -34.25];
const FILHOS = ['eliabe', 'abinadabe', 'sama', 'natanael', 'radai', 'ozem', 'eliu'];
/** Onde cada um fica depois, encostado na parede da porta, por ordem de idade. */
const ENCOSTO: [number, number][] = [[8.8, -31.45], [9.6, -31.45], [10.35, -31.5], [12.3, -31.5], [13.0, -31.45], [13.7, -31.45], [14.4, -31.5]];
/** Na fila do lado de fora, esperando a vez, um atrás do outro. */
const FORA = (i: number): [number, number] => [11.0 + (i % 2 ? 0.45 : -0.45), -29.4 + i * 0.75];
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
      { id: 'samuel-casa', character: 'samuel', at: BANCO, yaw: 180, seated: 0.42 },
      { character: 'jesse', at: [10.4, -34.0], yaw: -40 },
      ...FILHOS.map((id, i): CastMember => ({ character: id, at: FORA(i), yaw: 0 })),
      { id: 'davi-casa', character: 'davi', at: [12.8, -28.4], yaw: 30 },
      // O canto do palácio do Saul (a sala "sala-saul", longe de tudo).
      { id: 'saul', character: 'saul', at: [100, -101.78], yaw: 180, seated: 0.64 },
    ],
    props: [
      { id: 'chifre', asset: 'arms.oilHorn', pos: [0, 0], pocketOf: 'samuel' },
      { id: 'chifre-casa', asset: 'arms.oilHorn', pos: [0, 0], pocketOf: 'samuel-casa' },
      { id: 'harpa', asset: 'arms.lyre', pos: [0, 0], pocketOf: 'davi' },
      { id: 'cajado-casa', asset: 'arms.staff', pos: [0, 0], pocketOf: 'davi-casa' },
      { id: 'novilha', asset: 'ancient.heifer', pos: [4.4, -23.0], rot: 80, params: { rope: 1 } },
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
    d.world.rule('entardecer', false, { duration: 0 });
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
    // A novilha do sacrifício já está amarrada junto do portão, no plano, esperando.
    const chegada = samuel.walkTo([0.4, -21.6], { speed: 1.05 });
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
    // Fim de tarde. A casa de Jessé, pequena: o Samuel sentado no banco baixo do fundo, o Jessé diante dele. A luz
    // do sol entra baixa pela janela e pela porta. Os filhos esperam lá fora e entram um por um.
    d.world.rule('entardecer', true, { duration: 0 });
    samuelC.behave('attend', { object: 'jesse' });
    d.camera.cut({ pos: [14.5, TOPO + 2.2, -31.3], lookAt: [10.6, TOPO + 1.0, -35.0], fov: 52 });
    d.camera.moveTo({ pos: [14.3, TOPO + 2.1, -31.5], lookAt: [10.6, TOPO + 1.0, -35.0], fov: 50 });
    d.wait(1.5);

    /** Logo depois da porta, onde o próximo espera a vez. */
    const VEZ: [number, number] = [11.0, -31.75];
    /** O próximo entra pela porta e espera a vez, enquanto o anterior ainda está diante do Samuel. */
    const naVez: Record<number, { end: number }> = {};
    const aproxima = (i: number) => {
      if (i >= FILHOS.length) return;
      naVez[i] = d.background(() => {
        filho(FILHOS[i]).walkTo(VEZ, { speed: 1.2, via: [[PORTA[0], PORTA[1] + 0.6]] });
        filho(FILHOS[i]).behave('attend', { object: 'samuel-casa' });
      });
    };
    /** Da vez, ele dá os passos até diante do Samuel e espera. */
    const entra = (i: number) => {
      const id = FILHOS[i];
      filho(id).walkTo(DIANTE, { speed: 0.9 });
      filho(id).turnTo(0);
      filho(id).behave('attend', { object: 'samuel-casa' });
    };
    /** Depois de olhado, vai se encostar na parede da porta; o seguinte já vem entrando. */
    const encosta = (i: number) => {
      d.background(() => {
        filho(FILHOS[i]).walkTo(ENCOSTO[i], { speed: 0.9 });
        filho(FILHOS[i]).turnTo(0);
        filho(FILHOS[i]).behave('attend', { object: 'samuel-casa', mood: 'calm' });
      });
    };

    // O primeiro, o Eliabe. A câmera, de dentro, acompanha ele entrando pela porta.
    d.camera.track('eliabe', { from: [8.7, TOPO + 1.75, -35.3], to: [8.8, TOPO + 1.7, -35.0], duration: 6, fov: 44 });
    // O pai já vai apresentando enquanto ele entra.
    const eliabeEntra = d.background(() => {
      filho('eliabe').walkTo(VEZ, { speed: 1.1, via: [[PORTA[0], PORTA[1] + 0.6]] });
      entra(0);
    });
    d.at(eliabeEntra.end - 2.2);
    jesse.say('Este é Eliabe. Meu primogênito.', { tone: 'orgulhoso', to: samuelC, gesture: 0.4 });
    d.waitFor(eliabeEntra);
    aproxima(1);
    samuelC.behave('attend', { object: 'eliabe' });
    // Por cima do ombro do Eliabe: o Samuel sentado olhando para ele.
    d.camera.cut({ pos: [12.35, TOPO + 1.85, -32.9], lookAt: [11.45, TOPO + 1.0, -35.5], fov: 46 });
    d.camera.moveTo({ pos: [12.2, TOPO + 1.8, -33.1], lookAt: [11.45, TOPO + 1.0, -35.5], fov: 44 });
    // [Liberdade] O pai elogia o primogênito; o Samuel o olha de alto a baixo, devagar.
    jesse.say('É o mais forte de nós. Já serve no exército do rei.', { tone: 'orgulhoso', to: samuelC, gesture: 0.4 });
    samuelC.lookAt([DIANTE[0], TOPO + 1.8, DIANTE[1]], { duration: 0.8 });
    samuelC.lookAt([DIANTE[0], TOPO + 0.6, DIANTE[1]], { duration: 1.1 });
    samuelC.lookAt([DIANTE[0], TOPO + 1.75, DIANTE[1]], { duration: 0.9 });
    samuelC.pickUp('chifre-casa', { hand: 'right' });
    samuelC.say('Certamente este é o ungido do Senhor.', { tone: 'sussurro', gesture: 0 });
    // Ele para. Abaixa o chifre devagar.
    d.camera.cut({ pos: [13.4, TOPO + 1.45, -33.4], lookAt: [11.5, TOPO + 1.05, -35.4], fov: 40 });
    d.wait(1.6);
    samuelC.say('Não. O homem vê o que está diante dos olhos. Porém o Senhor olha para o coração.', { tone: 'sussurro', gesture: 0 });
    // O Eliabe fica rígido e vai para a parede sem olhar para ninguém. [Liberdade]
    filho('eliabe').express('angry', { amount: 0.5 });
    // A câmera acompanha o rejeitado voltando para a parede, de frente para ele, do lado do banco.
    d.camera.track('eliabe', { from: [12.9, TOPO + 1.6, -35.2], to: [12.6, TOPO + 1.6, -35.1], duration: 2.6, fov: 42 });
    encosta(0);
    d.wait(1.2);
    filho('eliabe').behave('watch', { point: [8.0, TOPO + 1.6, -33], mood: 'calm' });

    // Os outros, um por um, pela porta. A câmera, do canto, acompanha cada um entrando.
    for (let i = 1; i < 4; i++) {
      const id = FILHOS[i];
      // Espera o anterior sair da frente e o próprio chegar à porta. A câmera passa a seguir quem entra.
      d.wait(0.3);
      d.waitFor(naVez[i].end);
      d.camera.track(id, { from: [9.0, TOPO + 1.7, -35.3], to: [9.2, TOPO + 1.65, -35.1], duration: 3, fov: 44 });
      entra(i);
      if (i < 3) aproxima(i + 1);
      samuelC.behave('attend', { object: id });
      jesse.say(NOMES[id] + '.', { to: samuelC, gesture: 0.2 });
      const calm = i <= 2 ? 1 : 0.55;
      samuelC.lookAt([DIANTE[0], TOPO + 1.7, DIANTE[1]], { duration: 0.6 * calm });
      samuelC.lookAt([DIANTE[0], TOPO + 0.8, DIANTE[1]], { duration: 0.8 * calm });
      samuelC.lookAt([DIANTE[0], TOPO + 1.65, DIANTE[1]], { duration: 0.6 * calm });
      if (i <= 2) samuelC.say(i === 1 ? 'Também não é este.' : 'Nem este.', { gesture: 0 });
      // Rejeitado, ele volta para a parede, cabisbaixo; a câmera vai com ele.
      filho(id).express('sad', { amount: 0.6 });
      d.camera.track(id, { from: [12.9, TOPO + 1.6, -35.2], to: [12.6, TOPO + 1.6, -35.1], duration: 2.4, fov: 42 });
      encosta(i);
      d.wait(0.9);
      if (i === 3) filho('sama').say('Nenhum de nós?', { tone: 'sussurro', to: 'abinadabe', gesture: 0 });
    }
    // Os três mais novos (antes do Davi) entram juntos; o Samuel quase não precisa olhar.
    const juntos: [number, number][] = [[10.8, -34.2], [11.5, -34.3], [12.2, -34.2]];
    d.together(...[4, 5, 6].map((i, k) => () => {
      filho(FILHOS[i]).walkTo(juntos[k], { speed: 1.1, via: [[PORTA[0], PORTA[1] + 0.6]] });
      filho(FILHOS[i]).turnTo(0);
      filho(FILHOS[i]).behave('attend', { object: 'samuel-casa' });
    }));
    jesse.say('Radai. Ozém. Eliú.', { to: samuelC, gesture: 0.3 });
    samuelC.lookAt([10.8, TOPO + 1.6, -34.2], { duration: 0.5 });
    samuelC.lookAt([12.2, TOPO + 1.6, -34.2], { duration: 0.9 });
    for (const i of [4, 5, 6]) encosta(i);
    // [GANCHO] Nenhum dos sete.
    d.wait(1.0);
    samuelC.behave('attend', { object: 'jesse' });
    // Por cima do ombro do Jessé, o Samuel sentado; a câmera chega devagar.
    {
      const [pj, ps] = [d.where(jesse), d.where(samuelC)];
      const [dx, dz] = [pj[0] - ps[0], pj[2] - ps[2]];
      const len = Math.hypot(dx, dz) || 1;
      // Atrás do Jessé, um pouco de lado, olhando o Samuel por cima do ombro dele.
      const behind = (k: number): [number, number, number] => [pj[0] + (dx / len) * k - (dz / len) * 0.35, TOPO + 1.85, pj[2] + (dz / len) * k + (dx / len) * 0.35];
      d.camera.cut({ pos: behind(0.9), lookAt: [ps[0], TOPO + 1.0, ps[2]], fov: 46 });
      d.camera.moveTo({ pos: behind(0.7), lookAt: [ps[0], TOPO + 1.0, ps[2]], fov: 42 });
    }
    samuelC.say('O Senhor não escolheu nenhum destes. São estes todos os teus filhos?', { to: jesse, gesture: 0.3 });
    jesse.say('Ainda falta o mais novo. Está cuidando das ovelhas.', { tone: 'hesitante', to: samuelC, gesture: 0.3 });
    filho('eliabe').say('O pastorzinho.', { tone: 'ironico', gesture: 0 });
    samuelC.say('Mande buscá-lo. Não nos sentaremos à mesa até que ele chegue.', { tone: 'firme', to: jesse, gesture: 0.3 });

    // ---- 4. O mais novo (1:30) ----
    // As colinas ao entardecer. O Samá sobe correndo até o Davi, que toca perto da fogueira.
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

    // A casa. A porta. O Davi entra com a roupa de pastor, o cajado e a palha das colinas, sem jeito, e para logo
    // depois da porta, entre os irmãos de túnica limpa.
    d.background(() => daviC.pickUp('cajado-casa', { hand: 'right' }));
    const chega = daviC.walkTo([11.0, -31.9], { speed: 0.9, via: [[PORTA[0], PORTA[1] + 0.8]] });
    d.at(chega.start + 0.4);
    d.camera.track('davi-casa', { from: [9.0, TOPO + 1.8, -35.4], to: [9.2, TOPO + 1.75, -35.2], duration: 6, fov: 44 });
    d.at(chega.end - 2.4);
    for (const id of [...FILHOS, 'jesse']) filho(id).behave('attend', { object: 'davi-casa', mood: 'calm' });
    samuelC.behave('attend', { object: 'davi-casa' });
    d.waitFor(chega);
    daviC.turnTo([10.4, -34.0]);
    daviC.behave('attend', { object: 'jesse', mood: 'worried' });
    // Do alto, por cima dos ombros dos irmãos.
    d.camera.cut({ pos: [14.4, TOPO + 2.55, -31.1], lookAt: [10.9, TOPO + 1.25, -33.4], fov: 48 });
    daviC.say('Mandaste me chamar, pai?', { tone: 'tímido', to: jesse, gesture: 0 });
    jesse.say('O profeta quer te ver.', { to: daviC, gesture: 0.3 });
    // O Samuel, de frente, sentado: chama o rapaz para perto.
    d.camera.cut({ pos: [11.9, TOPO + 1.45, -33.4], lookAt: [11.5, TOPO + 1.1, -35.7], fov: 40 });
    samuelC.say('Aproxima-te, filho.', { tone: 'calmo', to: daviC, gesture: 0.4 });
    daviC.walkTo(DIANTE, { speed: 0.6 });
    daviC.turnTo(0);
    daviC.behave('attend', { object: 'samuel-casa', mood: 'worried' });
    // Longo silêncio. O Samuel se levanta e o examina devagar, dando a volta nele; a câmera gira devagar.
    d.camera.twoShot('samuel-casa', 'davi-casa', { duration: 10, swing: 28, fov: 44, side: 1, height: 1.3 });
    samuelC.standUp([11.5, -35.15]);
    samuelC.walkTo([12.2, -34.0], { speed: 0.45 });
    samuelC.lookAt(daviC, { duration: 0.6 });
    d.wait(0.6);
    samuelC.walkTo([11.5, -34.8], { speed: 0.45 });
    samuelC.turnTo(180);
    samuelC.lookAt(daviC, { duration: 0.5 });
    d.wait(0.6);
    samuelC.say('É este.', { tone: 'sussurro', gesture: 0 });
    // O Davi olha para o pai, que faz que sim. Ele se ajoelha.
    daviC.lookAt(jesse, { duration: 0.5 });
    jesse.express('happy', { amount: 0.4 });
    d.wait(0.8);
    daviC.lookAt(samuelC, { duration: 0.4 });
    d.do('davi-casa', 'move', { name: 'kneel' }, { duration: 1 });
    // De lado, aberto, a câmera girando devagar em volta dos dois: o azeite cai sobre a cabeça dele.
    d.camera.twoShot('samuel-casa', 'davi-casa', { duration: 5.5, swing: 28, fov: 44, side: 1, height: 1.2 });
    d.do('chifre-casa', 'pour', { over: 'davi-casa' }, { duration: 5 });
    // O rosto do Davi, confuso, sem colar: de frente e um pouco de lado; atrás, o Samuel.
    d.camera.cut({ pos: [13.2, TOPO + 1.15, -33.0], lookAt: [11.5, TOPO + 1.0, -34.4], fov: 40 });
    daviC.express('surprised', { amount: 0.5 });
    d.narrate('E naquele dia, enquanto todos ainda viam um pastor, Deus havia escolhido um rei.');
    d.wait(0.8);

    // ---- 5. O gancho (2:20) ----
    // Em outro lugar, de noite, o Saul sozinho no escuro, com as mãos na cabeça.
    d.world.rule('entardecer', false, { duration: 0 });
    d.world.rule('noite', true, { duration: 0 });
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
