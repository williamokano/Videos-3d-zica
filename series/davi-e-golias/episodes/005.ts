import type { CastMember } from '../../../src/engine/character/cast';
import { direct } from '../../../src/engine/timeline/direct';
import { IRMAOS, LINHA, TOPO, atentos, filaDeIsrael, filaFilisteia, ids } from '../cena';

/*
 * Episódio 2, "Dez milhares". Roteiro de trabalho em series/davi-e-golias/roteiros/005-roteiro.md (as cenas
 * abaixo têm os mesmos números); regras da história em series/davi-e-golias/biblia.md.
 *
 * Sem áudio por enquanto (pedido do autor): as falas não têm voz gravada e duram o que o texto pede.
 *
 * A pedra acerta, o Golias cai, os filisteus fogem e Israel persegue. O Saul pergunta de quem o Davi é filho;
 * o Jônatas dá a ele o manto e as armas. Na volta, as mulheres cantam "dez milhares", e o Saul passa a olhar o
 * Davi com desconfiança.
 *
 * A história pula de lugar e de dia (o vale, a tenda no fim da tarde, a cidade dias depois). Quem aparece em
 * mais de um lugar tem uma entrada no elenco para cada um ("davi", "davi-tenda", "davi-cidade"), já posta lá.
 */

const fila = filaDeIsrael();
const filisteus = filaFilisteia();
const tropa = ids(fila);

/** A cidade da volta (world/gerar-vale.py: CIDADE), com o portão a oeste da praça. */
const CIDADE: [number, number] = [175, 0];
const PORTAO_X = CIDADE[0] - 14;
const c = (dx: number, dz: number): [number, number] => [CIDADE[0] + dx, CIDADE[1] + dz];

/** O povo da cidade: mulheres que dançam com tamborins e gente nas ruas. */
const mulheres: CastMember[] = [[-6, -3.2], [-4.2, 3.4], [-2.6, -4.2], [-1.2, 3], [0.4, -3.6]].map(([dx, dz], i) => ({
  id: `mulher-${i + 1}`, character: 'mulher', at: c(dx, dz), yaw: 90,
  look: { name: `Mulher ${i + 1}`, wear: [{ id: 'robe', color: ['#c45a7a', '#d9a23a', '#5a8ac4', '#e0d6c0', '#8a4fa8'][i], accent: '#e0c27a' }, { id: 'headwrap', color: ['#f0e6d0', '#c4503a', '#f0e6d0', '#3a6a8a', '#e0c27a'][i] }, 'sandals'] },
}));
const povo: CastMember[] = [[2, -7.2], [4.5, -7.6], [7, -7.2], [2.5, 7.4], [5, 7.8], [7.5, 7.2], [9.5, -6.8], [10, 6.8]].map(([dx, dz], i) => ({
  id: `povo-${i + 1}`, character: i % 3 === 0 ? 'guarda' : i % 3 === 1 ? 'mulher' : 'soldado', at: c(dx, dz), yaw: 90,
  look: { name: `Morador ${i + 1}` },
}));
/** O exército voltando em marcha pela estrada, atrás do rei e do Davi. */
const marcha: CastMember[] = [0, 1, 2, 3, 4, 5].map((k) => ({
  id: `marcha-${k + 1}`, character: 'soldado', at: [PORTAO_X - 22 - Math.floor(k / 2) * 1.8, k % 2 ? 1 : -1] as [number, number], yaw: -90,
  look: { name: `Soldado ${k + 1}` },
}));

export default direct(
  {
    episode: 5,
    title: 'Dez milhares',
    location: 'vale-de-ela',
    cast: [
      // O vale, de onde o episódio 1 parou.
      {
        character: 'golias', at: [0, 9.2], yaw: 0,
        // A bainha vazia aparece quando o Davi tira a espada.
        look: { wear: [{ id: 'tunic', color: '#5a3a22' }, 'scaleArmor', 'greaves', 'bronzeHelmet', 'sandals', 'scabbard', { id: 'scabbardEmpty', hidden: true }] },
      },
      { character: 'escudeiro', at: [-1.4, 10.8], yaw: 0 },
      { character: 'davi', at: [0, 3.6], yaw: 180 },
      { character: 'sama', at: [...IRMAOS.sama], yaw: 180 },
      { character: 'eliabe', at: [...IRMAOS.eliabe], yaw: 180 },
      { character: 'abinadabe', at: [...IRMAOS.abinadabe], yaw: 180 },
      { character: 'saul', at: [-0.9, -LINHA - 3.2], yaw: 180 },
      { character: 'abner', at: [0.9, -LINHA - 3.0], yaw: 180 },
      ...fila,
      ...filisteus,
      // A tenda, no fim da tarde.
      { id: 'saul-tenda', character: 'saul', at: [0, -47.5], yaw: 180, seated: 0.2 },
      { id: 'jonatas', character: 'jonatas', at: [-1.7, -47.4], yaw: 170 },
      { id: 'abner-tenda', character: 'abner', at: [1.4, -41.2], yaw: 180 },
      {
        id: 'davi-tenda', character: 'davi', at: [0.2, -40.6], yaw: 180,
        // O que o Jônatas vai dar a ele: o manto, o cinto e a espada.
        look: { wear: [{ id: 'tunic', color: '#a88a62', accent: '#6b5236' }, 'sandals', 'shepherdBag', { id: 'cloak', color: '#2f56a8', accent: '#d9b04a', hidden: true }, { id: 'sash', color: '#2f56a8', accent: '#d9b04a', hidden: true }, { id: 'scabbard', hidden: true }] },
      },
      { id: 'guarda-tenda-1', character: 'soldado', at: [-2.2, -41.6], yaw: 0, look: { name: 'Guarda' } },
      { id: 'guarda-tenda-2', character: 'soldado', at: [2.6, -42.0], yaw: 0, look: { name: 'Guarda' } },
      // A cidade, dias depois.
      { id: 'saul-cidade', character: 'saul', at: [PORTAO_X - 14, 0], yaw: -90 },
      { id: 'davi-cidade', character: 'davi', at: [PORTAO_X - 17, 0.4], yaw: -90 },
      ...marcha,
      ...mulheres,
      ...povo,
    ],
    props: [
      { id: 'funda', asset: 'arms.sling', pos: [0, 0], pocketOf: 'davi' },
      { id: 'pedra1', asset: 'arms.stone', pos: [0, 0], pocketOf: 'davi' },
      { id: 'lanca-golias', asset: 'arms.spear', pos: [0.45, 9.0], params: { length: 3.6 }, pickable: true },
      { id: 'escudo-golias', asset: 'arms.shield', pos: [-1.05, 10.6], params: { kind: 'tower', size: 1.25 }, pickable: true },
      // A espada que o Davi tira da bainha do próprio Golias (some da bainha quando aparece na mão dele).
      { id: 'espada-golias', asset: 'arms.sword', pos: [0, 0], params: { length: 0.95 }, pocketOf: 'davi' },
      { id: 'arco', asset: 'arms.bow', pos: [-1.7, -47.4], pickable: true },
      ...mulheres.map((m, i) => ({ id: `tamborim-${i + 1}`, asset: 'arms.tambourine', pos: m.at, pickable: true })),
    ],
  },
  (d) => {
    const golias = d.actor('golias');
    const escudeiro = d.actor('escudeiro');
    const davi = d.actor('davi');
    const [sama, eliabe] = [d.actor('sama'), d.actor('eliabe')];
    const [saul, abner] = [d.actor('saul'), d.actor('abner')];
    const [saulT, abnerT, daviT, jonatas] = [d.actor('saul-tenda'), d.actor('abner-tenda'), d.actor('davi-tenda'), d.actor('jonatas')];
    const [saulC, daviC] = [d.actor('saul-cidade'), d.actor('davi-cidade')];

    // ---- O mundo vivo desde o primeiro quadro ----
    d.world.rule('noite', false, { duration: 0 });
    d.world.rule('amanhecer', false, { duration: 0 });
    d.world.rule('entardecer', false, { duration: 0 });
    // O fim da tarde chega só na cena 5.
    d.world.rule('fim-de-tarde', false, { duration: 0 });
    atentos(d, [...tropa, 'sama', 'eliabe', 'abinadabe', 'saul', 'abner'], 'golias', 'worried');
    atentos(d, ids(filisteus), 'golias', 'happy');
    golias.behave('attend', { object: 'davi' });
    escudeiro.behave('attend', { object: 'davi' });
    davi.behave('attend', { object: 'golias' });
    saulT.behave('idle', { mood: 'worried' });
    jonatas.behave('attend', { object: 'saul-tenda' });
    abnerT.behave('idle');
    daviT.behave('idle');
    for (const g of ['guarda-tenda-1', 'guarda-tenda-2']) d.actor(g).behave('idle');
    saulC.behave('idle');
    daviC.behave('idle');
    for (const id of ids(marcha)) d.actor(id).behave('idle');
    for (const id of ids(povo)) d.actor(id).behave('chat', { group: 'povo', mood: 'happy' });
    for (const id of ids(mulheres)) d.actor(id).behave('chat', { group: 'mulheres', mood: 'happy' });
    // Fora de quadro, cada um pega o que vai segurar: a lança, o escudo, a funda, o arco, os tamborins.
    d.background(() => golias.pickUp('lanca-golias', { hand: 'right', duration: 0.3 }));
    d.background(() => escudeiro.pickUp('escudo-golias', { hand: 'left', duration: 0.3 }));
    d.background(() => jonatas.pickUp('arco', { hand: 'left' }));
    mulheres.forEach((m, i) => d.background(() => d.actor(m.id!).pickUp(`tamborim-${i + 1}`, { hand: 'right' })));
    davi.pickUp('funda', { hand: 'right', duration: 0.3 });
    d.do('funda', 'set', { channel: 'loaded', value: 1 }, { duration: 0 });

    // ---- 1. A pedra (0:00) ----
    // Abre onde o episódio 1 parou: câmera lenta, a pedra girando no ar.
    const tiro = d.do('pedra1', 'throw', { hit: 'golias', with: 'funda', speed: 1.4, arc: 0.4 }, { ease: 'linear' });
    d.at(0);
    d.camera.cut({ pos: [1.4, 2.4, 5.0], lookAt: [0, 2.5, 7.0], fov: 38 });
    d.at(tiro.end - 0.4);
    d.camera.moveTo({ pos: [1.5, 2.6, 6.4], lookAt: [0, 2.9, 8.6], fov: 34 });
    d.at(0.3);
    // Se FICAVA ganhar: "A maioria de vocês disse que ficava. O Davi não ficou."
    d.narrate('A maioria de vocês disse que descia. O Davi desceu.');
    d.waitFor(tiro);

    // A pedra acerta. Por trás do gigante, sem mostrar o rosto: a cabeça dá um tranco e a lança escorrega.
    d.camera.cut({ pos: [1.2, 2.2, 14.6], lookAt: [0, 2.6, 8.6], fov: 44, shake: 0.1 });
    golias.lookAt([0, 6, 9.2], { duration: 0.15 });
    golias.putDown('lanca-golias', [1.2, 0.02, 9.6]);
    d.wait(0.6);
    d.camera.moveTo({ pos: [1.2, 2.2, 14.6], lookAt: [0, 2.6, 8.6], fov: 44, shake: 0 });
    // Silêncio total. Ele balança... e cai para a frente, de cara no chão.
    d.do('golias', 'fall', {}, { ease: 'linear', duration: 1.6 });
    golias.behave('none');
    d.camera.cut({ pos: [5.5, 0.6, 5.0], lookAt: [0, 0.6, 7.6], fov: 46, shake: 0.25 });
    d.wait(0.5);
    d.camera.moveTo({ pos: [5.5, 0.6, 5.0], lookAt: [0, 0.6, 7.6], fov: 46, shake: 0 });
    // O escudeiro larga o escudo e recua.
    escudeiro.putDown('escudo-golias', [-1.45, 0.02, 10.2]);
    d.background(() => {
      escudeiro.walkTo([-3, 15], { speed: 1.2 });
      escudeiro.behave('watch', { point: [0, 0.5, 7], mood: 'scared' });
    });

    // ---- 2. O silêncio (0:12) ----
    // Grua subindo do corpo caído até os dois montes. Ninguém se mexe.
    d.camera.cut({ pos: [3, 3, 4.5], lookAt: [0, 0.4, 7.2], fov: 46 });
    d.camera.moveTo({ pos: [3, 3, 4.5], lookAt: [0, 0.4, 7.2], fov: 46 });
    d.wait(1.2);
    d.camera.moveTo({ pos: [14, 22, 14], lookAt: [0, 4, -10], fov: 52 });
    d.actor('israel-6').say('Ele... caiu?', { tone: 'sussurro', gesture: 0 });
    sama.say('Davi...', { tone: 'sussurro', gesture: 0 });

    // No vale, o Davi corre até o gigante. Não tem espada: tira a do próprio Golias da bainha.
    d.camera.cut({ pos: [-2.6, 1.1, 6.2], lookAt: [0, 0.4, 7.6], fov: 44 });
    davi.putAway('funda');
    davi.runTo([0.9, 6.6], { speed: 3.2 });
    davi.turnTo([0, 8]);
    d.do('davi', 'move', { name: 'kneel', amount: 0.7 }, { duration: 0.5 });
    // A espada saindo da bainha, o brilho do sol na lâmina.
    d.camera.cut({ pos: [2.6, 1.0, 8.2], lookAt: [0.8, 0.8, 6.6], fov: 36 });
    d.do('golias', 'set', { channel: 'wear.scabbard', value: 0 }, { duration: 0 });
    d.do('golias', 'set', { channel: 'wear.scabbardEmpty', value: 1 }, { duration: 0 });
    davi.pickUp('espada-golias', { hand: 'right' });
    d.do('davi', 'move', { name: 'kneel', amount: 0 }, { duration: 0.5 });
    davi.raise('chest');
    // Corte para o monte dos filisteus antes do golpe: o que acontece fica fora do quadro.
    d.camera.cut({ pos: [3, TOPO + 1.7, 30], lookAt: [0, TOPO + 1.3, LINHA], fov: 44 });
    filisteus.forEach((f, i) => d.background(() => {
      d.wait(0.25 * i);
      d.actor(f.id!).express('scared');
    }));
    d.wait(1.6);
    // [Liberdade] Um deles grita; no texto, eles só fogem.
    d.actor('filisteu-6').say('O campeão morreu! Fujam!', { tone: 'grito', gesture: 0.8 });
    filisteus.forEach((f, i) => d.background(() => {
      d.wait(0.15 * (i % 4));
      // Pela rua do meio do acampamento deles, entre as tendas.
      d.actor(f.id!).runTo([((i % 5) - 2) * 1.6, 50 + (i % 3) * 4], { speed: 3.6 + (i % 3) * 0.3 });
      d.actor(f.id!).behave('idle', { mood: 'scared' });
    }));
    davi.lower();

    // ---- 3. O grito de Israel (0:28) ----
    // Do outro monte, um grito enorme: o exército de Israel desce correndo para o vale.
    d.camera.cut({ pos: [6, TOPO + 1.6, -30], lookAt: [0, TOPO + 1.3, -LINHA], fov: 46 });
    d.actor('israel-2').say('Por Israel!', { tone: 'grito', gesture: 0 });
    const correm = [...tropa, 'sama', 'abinadabe'];
    for (const id of correm) d.background(() => d.do(id, 'move', { name: 'cheer' }, { duration: 0.5 }));
    d.wait(0.8);
    correm.forEach((id, i) => d.background(() => {
      d.wait(0.1 * (i % 6));
      d.do(id, 'move', { name: 'cheer', amount: 0 }, { duration: 0.3 });
      const x = -14 + (i * 28) / correm.length;
      d.actor(id).runTo([x, 30], { speed: 3.8 + (i % 4) * 0.25 });
      d.actor(id).behave('idle', { mood: 'happy' });
    }));
    // [Liberdade] Os gritos da tropa descendo.
    d.background(() => {
      d.wait(1.2);
      d.actor('israel-4').say('Atrás deles!', { tone: 'grito', gesture: 0 });
      d.actor('israel-10').say('Pelo Deus de Israel!', { tone: 'grito', gesture: 0 });
      d.wait(1.5);
      d.actor('abinadabe').say('Davi! Ele conseguiu!', { tone: 'grito', gesture: 0 });
      d.actor('israel-1').say('Não deixa nenhum escapar!', { tone: 'grito', gesture: 0 });
    });
    // A câmera corre junto com a onda de soldados descendo o monte.
    d.camera.cut({ pos: [7, TOPO + 1.4, -32], lookAt: [0, 2, -10], fov: 56, shake: 0.12 });
    d.camera.moveTo({ pos: [5, 2.2, -10], lookAt: [0, 1.2, 4], fov: 56, shake: 0.12 });
    // O Eliabe corre com eles. No meio do vale, passa pelo Davi, para e olha o irmão. [Liberdade]
    eliabe.runTo([1.8, 5.4], { speed: 3.8 });
    eliabe.turnTo([0.9, 6.6]);
    d.camera.cut({ pos: [3.6, 1.3, 3.0], lookAt: [1.3, 1.4, 6.0], fov: 38 });
    eliabe.lookAt(davi, { duration: 0.4 });
    davi.lookAt(eliabe, { duration: 0.4 });
    d.wait(1.0);
    // Ele não diz nada. Põe a mão no ombro do Davi por um instante e volta a correr.
    eliabe.pointAt(davi, { hand: 'left', duration: 1.4 });
    d.wait(0.4);
    d.background(() => {
      eliabe.runTo([3, 30], { speed: 4 });
      eliabe.behave('idle', { mood: 'happy' });
    });
    d.wait(1.2);

    // ---- 4. "De quem é filho?" (0:45) ----
    // No alto do monte, o Saul e o Abner assistem à perseguição. O Saul não tira os olhos do Davi.
    saul.lookAt(davi, { duration: 0.5 });
    abner.lookAt(davi, { duration: 0.5 });
    d.camera.cut({ pos: [-2.4, TOPO + 1.75, -37.4], lookAt: [-0.6, TOPO + 1.75, -38.7], fov: 34 });
    saul.say('Abner. De quem é filho esse rapaz?', { tone: 'firme' });
    abner.lookAt(saul, { duration: 0.4 });
    abner.say('Juro pela tua vida, majestade... não sei.', { to: saul });
    saul.say('Então descobre.', { tone: 'firme', to: abner });
    abner.behave('attend', { object: 'davi' });
    // O Saul continua olhando. Não sorri.
    d.camera.moveTo({ pos: [-2.0, TOPO + 1.8, -37.6], lookAt: [-0.7, TOPO + 1.8, -38.8], fov: 26 });
    d.wait(2.4);

    // ---- 5. Diante do rei (1:08) ----
    // Fim da tarde, a tenda do rei. O Abner entra trazendo o Davi. Só do peito para cima.
    d.world.rule('fim-de-tarde', true, { duration: 0 });
    d.camera.cut({ pos: [0.9, TOPO + 1.35, -48.8], lookAt: [0, TOPO + 1.3, -43], fov: 40 });
    d.together(
      () => abnerT.walkTo([1.3, -44.6], { speed: 1.1 }),
      () => daviT.walkTo([0, -44.3], { speed: 1.1 }),
      () => {
        d.wait(1.4);
        // Os guardas da porta desviam o olhar do que ele traz na mão.
        d.actor('guarda-tenda-1').lookAt([-6, TOPO + 1.4, -44], { duration: 0.6 });
        d.actor('guarda-tenda-2').lookAt([6, TOPO + 1.4, -44], { duration: 0.6 });
      },
    );
    saulT.lookAt(daviT, { duration: 0.5 });
    abnerT.behave('attend', { object: 'saul-tenda' });
    daviT.behave('attend', { object: 'saul-tenda' });
    d.camera.cut({ pos: [0.8, TOPO + 1.5, -46.4], lookAt: [0, TOPO + 1.4, -44.3], fov: 32 });
    abnerT.say('Majestade. O rapaz.', { to: saulT });
    d.camera.cut({ pos: [-0.6, TOPO + 1.25, -42.6], lookAt: [0, TOPO + 0.9, -47.5], fov: 34 });
    saulT.say('De quem você é filho, rapaz?', { to: daviT });
    d.camera.cut({ pos: [0.8, TOPO + 1.5, -46.4], lookAt: [0, TOPO + 1.4, -44.3], fov: 32 });
    daviT.say('Sou filho do teu servo Jessé, de Belém.', { to: saulT });
    // Atrás do Saul, um jovem guerreiro observa tudo em silêncio: o Jônatas, o filho do rei.
    jonatas.lookAt(daviT, { duration: 0.6 });
    d.camera.cut({ pos: [-0.6, TOPO + 1.6, -44.9], lookAt: [-1.7, TOPO + 1.6, -47.4], fov: 26 });
    d.wait(1.8);

    // ---- 6. Jônatas (1:30) ----
    // Ele dá um passo à frente, tira o próprio manto e põe no Davi.
    d.camera.cut({ pos: [-2.9, TOPO + 1.45, -43.6], lookAt: [-0.3, TOPO + 1.3, -44.9], fov: 42 });
    jonatas.walkTo([-0.6, -45.3], { speed: 1 });
    jonatas.turnTo([0, -44.3]);
    daviT.lookAt(jonatas, { duration: 0.4 });
    jonatas.pointAt(daviT, { hand: 'right', duration: 0.9 });
    d.do('jonatas', 'set', { channel: 'wear.cloak', value: 0 }, { duration: 0 });
    d.do('davi-tenda', 'set', { channel: 'wear.cloak', value: 1 }, { duration: 0 });
    daviT.express('surprised', { amount: 0.6 });
    daviT.say('O que é isso?', { to: jonatas });
    jonatas.say('Fica com ele. E com isso também.', { to: daviT, gesture: 0.5 });
    // A espada, o arco, o cinto.
    jonatas.pointAt(daviT, { hand: 'right', duration: 0.7 });
    d.do('jonatas', 'set', { channel: 'wear.scabbard', value: 0 }, { duration: 0 });
    d.do('jonatas', 'set', { channel: 'wear.sash', value: 0 }, { duration: 0 });
    d.do('davi-tenda', 'set', { channel: 'wear.scabbard', value: 1 }, { duration: 0 });
    d.do('davi-tenda', 'set', { channel: 'wear.sash', value: 1 }, { duration: 0 });
    jonatas.putDown('arco', [-0.25, TOPO + 0.9, -44.75]);
    daviT.pickUp('arco', { hand: 'left' });
    daviT.express('neutral');
    // Órbita lenta em volta dos dois, a luz de fim de tarde entrando pela tenda.
    d.camera.orbit({ center: [-0.3, TOPO + 1.45, -44.8], radius: 2.6, height: 0.1, from: 100, to: 160, duration: 9, fov: 38 });
    const orbita = d.now;
    jonatas.say('A partir de hoje, você é meu irmão. Eu te amo como amo a minha própria vida.', { tone: 'firme', to: daviT, gesture: 0.3 });
    d.wait(1.2);
    d.waitFor(orbita + 7);
    d.camera.cut({ pos: [-0.4, TOPO + 1.25, -42.4], lookAt: [0, TOPO + 0.95, -47.5], fov: 36 });
    saulT.say('E você não volta mais pra casa do teu pai. Agora você fica comigo.', { to: daviT });

    // ---- 7. A volta (1:55) ----
    // Dias depois. A estrada de volta, chegando a uma cidade de Israel. O exército volta em marcha.
    d.world.rule('fim-de-tarde', false, { duration: 0 });
    // Primeiro do lado de fora, com a tropa chegando; depois, de dentro da praça, por trás das mulheres que dançam.
    d.camera.cut({ pos: [PORTAO_X - 33, 2.2, 6], lookAt: [PORTAO_X - 16, 1.5, 0], fov: 44 });
    d.background(() => {
      d.wait(0.4);
      d.narrate('Dias depois, o exército voltou para casa.');
      // [Liberdade] O povo reconhece o rapaz do gigante.
      d.actor('povo-2').say('É ele! O rapaz do gigante!', { tone: 'animado', gesture: 0.6 });
      d.actor('povo-5').say('Davi! Davi!', { tone: 'grito', gesture: 0.6 });
      d.wait(0.6);
      d.actor('mulher-1').say('Saul matou os seus milhares...', { tone: 'animado', gesture: 0 });
      d.actor('mulher-2').say('...e Davi, os seus dez milhares!', { tone: 'animado', gesture: 0 });
    });
    d.together(
      () => saulC.walkTo([PORTAO_X + 6, 0], { speed: 1.3 }),
      () => daviC.walkTo([PORTAO_X + 3.2, 0.5], { speed: 1.3 }),
      ...marcha.map((m) => () => d.actor(m.id!).walkTo([m.at[0] + 18, m.at[1]], { speed: 1.3 })),
      () => {
        d.wait(5);
        d.camera.cut({ pos: [PORTAO_X + 17, 2.6, 6], lookAt: [PORTAO_X + 5, 1.4, 0], fov: 48 });
        d.wait(5);
        d.camera.moveTo({ pos: [PORTAO_X + 15, 2.4, 4.5], lookAt: [PORTAO_X + 4, 1.4, 0], fov: 44 });
      },
      () => {
        // Das casas saem as mulheres cantando e dançando, com tamborins.
        d.wait(2.5);
        for (const m of mulheres) d.actor(m.id!).behave('attend', { object: 'davi-cidade', mood: 'happy' });
        for (const m of mulheres) d.background(() => d.do(m.id!, 'move', { name: 'dance' }, { duration: 0.8 }));
        for (const p of povo) d.actor(p.id!).behave('attend', { object: 'davi-cidade', mood: 'happy' });
        for (const p of povo) d.background(() => d.do(p.id!, 'move', { name: 'cheer', amount: 0.8 }, { duration: 0.6 }));
      },
    );
    saulC.turnTo(-90);
    daviC.turnTo(-90);
    saulC.behave('idle', { mood: 'calm' });
    daviC.behave('attend', { object: 'mulher-2', mood: 'happy' });
    for (const m of marcha) d.actor(m.id!).behave('idle', { mood: 'happy' });
    d.camera.cut({ pos: [PORTAO_X + 15, 2.2, 3.6], lookAt: [PORTAO_X + 6, 1.5, 0], fov: 44 });
    d.actor('mulher-3').say('Saul matou os seus milhares... e Davi, os seus dez milhares!', { tone: 'animado', gesture: 0 });
    d.actor('mulher-4').say('Davi, os seus dez milhares!', { tone: 'animado', gesture: 0 });

    // O som da festa vai sumindo e a câmera fecha devagar no rosto do Saul.
    d.camera.cut({ pos: [PORTAO_X + 8.6, 2.05, 1.3], lookAt: [PORTAO_X + 6, 1.9, 0], fov: 40 });
    saulC.express('angry', { amount: 0.5 });
    d.camera.moveTo({ pos: [PORTAO_X + 7.4, 2.0, 0.5], lookAt: [PORTAO_X + 6, 1.9, 0], fov: 30 });
    saulC.say('Pra ele deram dez milhares. Pra mim, só milhares.', { tone: 'sussurro', gesture: 0 });
    saulC.say('O que mais falta pra ele? Só o reino.', { tone: 'sussurro', gesture: 0 });

    // ---- 8. O olhar (2:20) ----
    // O Saul vira a cabeça e olha para o Davi, que sorri para o povo sem perceber nada.
    saulC.lookAt(daviC, { duration: 0.8 });
    d.camera.cut({ pos: [PORTAO_X + 7.2, 2.15, -0.9], lookAt: [PORTAO_X + 3.2, 1.6, 0.5], fov: 34 });
    d.wait(2.6);

    d.endCard({
      title: 'Se você fosse o Davi, confiava no Saul?',
      options: [{ label: 'CONFIAVA', icon: '👑' }, { label: 'FUGIA', icon: '🏃' }],
      cta: 'Comenta CONFIAVA ou FUGIA 👇 e marca alguém que ficou com inveja de você',
    }, { duration: 6 });
    d.at(d.now - 6);
    d.narrate('Daquele dia em diante, Saul passou a olhar o Davi com desconfiança. Se você fosse o Davi... confiava no rei, ou fugia? Comenta aí. E marca aquela pessoa que ficou com inveja de você.');
  },
);
