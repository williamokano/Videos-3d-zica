import type { CastMember } from '../../../src/engine/character/cast';
import { direct, type Director } from '../../../src/engine/timeline/direct';
import { IRMAOS, LINHA, TOPO, atentos, filaDeIsrael, filaFilisteia, ids, reforcoDeIsrael } from '../cena';

/*
 * Episódio 4, "O gigante". Roteiro de trabalho em series/davi-e-golias/roteiros/004-roteiro.md (as cenas abaixo têm
 * os mesmos números); regras da série em series/davi-e-golias/biblia.md. Lugar: world/vale-de-ela.json.
 *
 * Sem áudio por enquanto: as falas duram o que o texto pede.
 *
 * 1 Samuel 17:38-54. O Saul veste o Davi com o capacete, a couraça e a espada; ele não consegue andar e tira tudo.
 * Cinco pedras lisas no riacho, para o alforje. O Golias desce com o escudeiro na frente, despreza e amaldiçoa;
 * "Tu vens contra mim com espada, lança e escudo...". O gigante avança, o Davi corre ao encontro dele, gira a funda
 * e solta: a pedra crava na testa e o gigante cai de rosto em terra. Silêncio. O Davi tira a espada do Golias da
 * bainha; o golpe fica fora do quadro. Os filisteus fogem; um soldado grita, e Israel inteiro desce o monte.
 *
 * O Davi aparece em dois lugares: "davi" na boca da tenda do rei, "davi-vale" já descendo o monte.
 */

type V3 = [number, number, number];

/** A voz de um figurante que fala, por cima da ficha de soldado. */
const voz = (m: CastMember, id: string | undefined): CastMember => (id ? { ...m, look: { ...m.look, voice: { id } } } : m);
// Os figurantes que falam, com vozes já aprovadas pelo autor e que não falam neste episódio (canal/vozes.json):
// Guilherme (o Samá não fala aqui), Arnold, Papai Noel e Manoel Lopes (o Samuel não aparece). O soldado 6 era o
// Lax no ep. 3, mas o Lax é a voz do Abinadabe, que fala neste episódio.
const fila = filaDeIsrael().map((m) =>
  voz(m, { 'israel-2': 'GnDrTQvdzZ7wqAKfLzVQ', 'israel-6': 'ZYCQDYoXnl78dNdU6JeG', 'israel-4': 'mBxe7tYxRAMLpIP3fPEp' }[m.id!]),
);
const reforco = reforcoDeIsrael();
const filisteus = filaFilisteia().map((m) => voz(m, { 'filisteu-6': 'zoe2cQFqDDW4DteHDEWI' }[m.id!]));
const tropa = ids(fila);
const irmaos = ['sama', 'eliabe', 'abinadabe'];
/** O soldado que grita sozinho depois do silêncio, no vão do meio da fila. */
const GRITO = 'israel-6';

/** A boca da tenda do rei (como no fim do ep. 3): o rei de um lado, o Davi do outro. */
const REI: [number, number] = [-0.6, -40.2];
const DIANTE: [number, number] = [0.22, -40.2];
/** O riacho no fundo do vale: as cinco pedras na margem de cá. */
const MARGEM: [number, number] = [-1.8, -2.5];
const PEDRAS: [number, number][] = [[-2.15, -2.05], [-1.9, -1.95], [-1.62, -2.05], [-1.42, -2.15], [-1.98, -2.2]];
/** Onde o Davi para e onde o gigante chega. */
const PARADA: [number, number] = [0, 1.7];
const GOLIAS0: [number, number] = [0, 13.2];
const GOLIAS1: [number, number] = [0, 12.0];
/** Onde o Davi corre e solta a pedra; onde o gigante está quando ela chega. */
const TIRO: [number, number] = [0, 4.9];
const GOLIAS2: [number, number] = [0, 10.6];

/** Direção (yaw) de quem vai de `a` para `b`: 0 olha para o norte (-z), 90 para o oeste (-x). */
const rumo = (a: [number, number], b: [number, number]) => (Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) * 180) / Math.PI;

/**
 * Por cima do ombro de `de`, olhando para `para`: a câmera fica atrás e um pouco ao lado de quem está de costas,
 * mais alta que a cabeça dele, mirando entre os dois, mais perto de quem está de frente.
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

/** As roupas do Davi, com as do rei (grandes demais) escondidas até o Saul vesti-lo. */
const daviWear = (rei: boolean) => [
  { id: 'tunic', color: '#a88a62', accent: '#6b5236' },
  { id: 'sash', color: '#6b5236' },
  'sandals',
  'shepherdBag',
  ...(rei
    ? [{ id: 'scaleArmor', hidden: true, size: 1.16 }, { id: 'bronzeHelmet', hidden: true, size: 1.22 }, { id: 'scabbard', hidden: true, size: 1.45 }]
    : []),
];

/** Uma nuvem de poeira no chão do vale: os passos do gigante, a queda. */
const poeira = (id: string, at: [number, number], size: number, seed: number) => ({ id, asset: 'nature.dust', pos: at, params: { size, seed } });

export default direct(
  {
    episode: 4,
    title: 'O gigante',
    location: 'vale-de-ela',
    cast: [
      // A boca da tenda do rei.
      { character: 'davi', at: DIANTE, yaw: 90, look: { wear: daviWear(true) } },
      { character: 'saul', at: REI, yaw: -90 },
      { character: 'abner', at: [-2.3, -41.2], yaw: -60 },
      // O vale.
      { id: 'davi-vale', character: 'davi', at: [0.6, -24], yaw: 180, look: { wear: daviWear(false) } },
      {
        character: 'golias', at: GOLIAS0, yaw: 0,
        look: { wear: [{ id: 'tunic', color: '#5a3a22' }, 'scaleArmor', 'greaves', 'bronzeHelmet', 'sandals', 'scabbard', { id: 'scabbardEmpty', hidden: true }, { id: 'foreheadStone', hidden: true }] },
      },
      { character: 'escudeiro', at: [-1.2, 11.6], yaw: 0 },
      { character: 'sama', at: [...IRMAOS.sama], yaw: 180 },
      { character: 'eliabe', at: [...IRMAOS.eliabe], yaw: 180 },
      { character: 'abinadabe', at: [...IRMAOS.abinadabe], yaw: 180 },
      ...fila,
      ...reforco,
      ...filisteus,
    ],
    props: [
      // O que o rei dá ao Davi.
      { id: 'capacete', asset: 'arms.helmet', pos: [0, 0], pocketOf: 'saul', params: { size: 0.19 } },
      { id: 'couraca', asset: 'arms.armor', pos: [0, 0], pocketOf: 'saul', params: { size: 0.5 } },
      // A espada do rei: sai do Saul, passa para o Davi e vai para a bainha dele.
      { id: 'espada-saul', asset: 'arms.sword', pos: [0, 0], pocketOf: 'saul', params: { length: 0.8 } },
      // O cajado do Davi, que ficou com a carga (ep. 3), encostado na boca da tenda.
      { id: 'cajado', asset: 'arms.staff', pos: [2.0, -40.9], pickable: true },
      // No vale: o cajado na mão, a funda no alforje, as cinco pedras na margem.
      { id: 'cajado-vale', asset: 'arms.staff', pos: [0, 0], pocketOf: 'davi-vale' },
      { id: 'funda', asset: 'arms.sling', pos: [0, 0], pocketOf: 'davi-vale', params: { cord: 0.66 } },
      ...PEDRAS.map(([x, z], i) => ({ id: `pedra${i + 1}`, asset: 'arms.stone', pos: [x, z] as [number, number], pickable: true })),
      { id: 'lanca-golias', asset: 'arms.spear', pos: [0, 0], pocketOf: 'golias', params: { length: 3.6 } },
      { id: 'escudo-golias', asset: 'arms.shield', pos: [0, 0], pocketOf: 'escudeiro', params: { kind: 'tower', size: 1.25 } },
      // A espada do Golias, que o Davi tira da bainha dele.
      { id: 'espada-golias', asset: 'arms.sword', pos: [0, 0], pocketOf: 'davi-vale', params: { length: 0.95 } },
      // A cabeça do gigante depois do golpe: guardada debaixo do chão até lá, e só aparece sob mosaico.
      { id: 'cabeca-golias', asset: 'ancient.severedHead', pos: [0, 40], y: -20, params: { radius: 0.27, skin: '#b98a62', hair: '#22160f', helmet: '#b8862f' } },
      // A poeira: os passos do gigante avançando, a queda.
    poeira('passo1', [0.4, 11.7], 0.9, 1),
      poeira('passo2', [-0.4, 11.1], 0.9, 2),
      poeira('passo3', [0.4, 10.7], 1.0, 3),
      poeira('queda1', [0, 8.6], 2.4, 4),
      poeira('queda2', [0.5, 7.4], 1.8, 5),
      poeira('impacto', [0, 10.6], 0.6, 6),
    ],
  },
  (d) => {
    const davi = d.actor('davi');
    const dv = d.actor('davi-vale');
    const saul = d.actor('saul');
    const abner = d.actor('abner');
    const golias = d.actor('golias');
    const escudeiro = d.actor('escudeiro');
    const [sama, eliabe, abinadabe] = irmaos.map((id) => d.actor(id));
    const vale: V3 = [0, 3, 12];

    // ---- O mundo vivo desde o primeiro quadro ----
    for (const rule of ['noite', 'amanhecer', 'entardecer', 'fim-de-tarde']) d.world.rule(rule, false, { duration: 0 });
    atentos(d, [...tropa, ...irmaos, ...ids(reforco)], 'golias', 'worried');
    atentos(d, ids(filisteus), 'golias', 'happy');
    golias.behave('attend', { object: 'israel-6', mood: 'happy' });
    escudeiro.behave('attend', { object: 'golias' });
    saul.behave('attend', { object: 'davi', mood: 'worried' });
    abner.behave('attend', { object: 'davi' });
    davi.behave('attend', { object: 'saul' });
    dv.behave('idle');
    // Fora de quadro: a lança na mão do gigante, o escudo na do escudeiro, o cajado na do Davi no vale.
    d.background(() => golias.pickUp('lanca-golias', { hand: 'right', duration: 0.3 }));
    d.background(() => escudeiro.pickUp('escudo-golias', { hand: 'left', duration: 0.3 }));
    d.background(() => dv.pickUp('cajado-vale', { hand: 'left', duration: 0.3 }));

    /** Um som de fundo (ambiente ou música) de `from` até agora, com entrada e saída suaves. */
    const ambiente = (name: string, from: number, volume?: number) => {
      const end = d.now;
      d.at(from);
      d.sound(name, { length: end - from, fade: 0.8, ...(volume !== undefined ? { volume } : {}) });
      d.at(end);
    };
    let cena = d.now;

    // ---- 1. A armadura (0:00) ----
    // [GANCHO] O rei estende o capacete de bronze ao Davi; close de lado quando o Davi o desce sobre a cabeça.
    const cabeca = d.where('davi');
    const meio: V3 = [(REI[0] + DIANTE[0]) / 2, cabeca[1] + 1.35, DIANTE[1]];
    d.camera.cut({ pos: [meio[0] + 0.6, meio[1] + 0.35, meio[2] + 4.9], lookAt: meio, fov: 38 });
    saul.pickUp('capacete', { hand: 'right', duration: 0.5 });
    d.background(() => {
      d.wait(0.2);
      saul.say('Meu capacete.', { to: davi, gesture: 0 });
    });
    // O rei entrega; o Davi põe com as próprias mãos, por cima da cabeça.
    d.do('capacete', 'give', { to: 'davi' });
    d.camera.cut({ pos: [cabeca[0] - 0.85, cabeca[1] + 1.78, cabeca[2] + 1.45], lookAt: [cabeca[0] - 0.05, cabeca[1] + 1.76, cabeca[2]], fov: 34 });
    d.camera.moveTo({ pos: [cabeca[0] - 0.75, cabeca[1] + 1.74, cabeca[2] + 1.3], lookAt: [cabeca[0] - 0.05, cabeca[1] + 1.7, cabeca[2]], fov: 34 });
    d.sound('armadura-bronze');
    const capacete = d.do('capacete', 'don', { on: 'davi', wear: 'bronzeHelmet' }, { duration: 1.8 });
    d.background(() => {
      d.waitFor(capacete.start + 1.25);
      davi.express('sad', { amount: 0.35 });
    });
    d.wait(0.3);
    // Por cima do ombro do rei, o Davi de frente: a couraça.
    d.camera.cut({ pos: [meio[0] + 0.6, meio[1] + 0.35, meio[2] + 4.9], lookAt: meio, fov: 38 });
    d.camera.moveTo({ pos: [meio[0] + 0.5, meio[1] + 0.3, meio[2] + 4.4], lookAt: meio, fov: 38 });
    saul.pickUp('couraca', { hand: 'right', duration: 0.6 });
    d.background(() => saul.say('Minha couraça.', { to: davi, gesture: 0 }));
    d.do('couraca', 'give', { to: 'davi' });
    d.sound('armadura-bronze');
    d.do('couraca', 'don', { on: 'davi', wear: 'scaleArmor' }, { duration: 1.8 });
    saul.pickUp('espada-saul', { hand: 'right', duration: 0.6 });
    d.background(() => saul.say('Minha espada.', { to: davi, gesture: 0 }));
    d.do('espada-saul', 'give', { to: 'davi' });
    // O Davi guarda a espada na bainha da cintura.
    davi.putAway('espada-saul', { duration: 0.7 });
    d.do('davi', 'set', { channel: 'wear.scabbard', value: 1 }, { duration: 0 });
    davi.express('neutral');

    // A tela de abertura, por cima do vale lá embaixo: os dois montes e o gigante pequeno no meio.
    d.camera.cut({ pos: [24, 21, -14], lookAt: [0, 2, 10], fov: 50 });
    d.camera.moveTo({ pos: [21, 17, -9], lookAt: [0, 2, 11], fov: 46 });
    d.sound('titulo-impacto');
    d.titleCard({ title: 'DAVI', subtitle: 'Uma história de coragem e destino', episode: 'Episódio 4 · O gigante' }, { duration: 3.4 });
    d.wait(3.4);

    // Ele tenta andar: passo pesado, os braços longe do corpo, a espada do rei arrastando no chão. De frente, baixo.
    d.camera.cut({ pos: [4.6, TOPO + 0.9, -39.2], lookAt: [1.6, TOPO + 1.0, -40.0], fov: 44 });
    davi.behave('idle');
    d.do('davi', 'move', { name: 'lumber' }, { duration: 0.4 });
    const tropeca = davi.walkTo([2.4, -39.5], { speed: 0.55 });
    d.camera.moveTo({ pos: [4.4, TOPO + 0.85, -39.0], lookAt: [2.2, TOPO + 0.9, -39.6], fov: 42 });
    void tropeca;
    davi.turnTo(REI);
    davi.behave('attend', { object: 'saul' });
    // [Liberdade] O Abner segura um sorriso.
    abner.express('happy', { amount: 0.3 });
    const daviFrente = ombro(d, 'saul', 'davi', { back: 1.6, side: -1.0, up: 2.0, mix: 0.04 });
    d.camera.cut(daviFrente);
    d.camera.moveTo(perto(daviFrente));
    davi.say('Não consigo andar com isto.', { to: saul, gesture: 0.3, tone: 'cansado' });
    abner.express('neutral');
    davi.say('Não estou acostumado.', { to: saul, gesture: 0.2 });
    // Ele tira o capacete e a couraça, com as duas mãos, por cima da cabeça, e põe no chão.
    davi.behave('idle');
    d.sound('armadura-bronze');
    d.do('capacete', 'doff', { wear: 'bronzeHelmet' });
    davi.putDown('capacete', [2.75, TOPO, -39.2]);
    const tira = d.do('couraca', 'doff', { wear: 'scaleArmor' });
    d.background(() => {
      d.waitFor(tira.start + 0.5);
      d.do('davi', 'move', { name: 'lumber', amount: 0 }, { duration: 0.6 });
    });
    davi.putDown('couraca', [2.85, TOPO, -39.8]);
    davi.behave('attend', { object: 'saul' });
    // O rei, preocupado. (No corte, a espada sai do cinto do Davi.)
    const reiFrente = ombro(d, 'davi', 'saul', { back: 2.2, side: 0.5, up: 2.0, mix: 0.15 });
    d.camera.cut(reiFrente);
    d.camera.moveTo(perto(reiFrente));
    d.do('davi', 'set', { channel: 'wear.scabbard', value: 0 }, { duration: 0 });
    saul.say('Não irás sem proteção.', { tone: 'preocupado', to: davi, gesture: 0.3 });
    // O Davi pega o cajado de pastor e se vira para o rei, de frente para a câmera.
    davi.behave('idle');
    const pegaCajado = d.background(() => {
      davi.walkTo([1.75, -40.5], { speed: 1 });
      davi.pickUp('cajado', { hand: 'left' });
      davi.turnTo(REI);
      davi.behave('attend', { object: 'saul' });
    });
    d.camera.track('davi', { from: [3.6, TOPO + 1.8, -37.6], to: [3.3, TOPO + 1.75, -37.9], duration: pegaCajado.end - d.now, fov: 40 });
    d.waitFor(pegaCajado);
    const cajadoFrente = ombro(d, 'saul', 'davi', { back: 1.6, side: -1.0, up: 2.0, mix: 0.04 });
    d.camera.cut(cajadoFrente);
    d.camera.moveTo(perto(cajadoFrente));
    davi.say('Sempre fui assim, meu senhor.', { to: saul, gesture: 0.2, tone: 'firme' });
    d.wait(0.4);

    // ---- 2. O riacho (0:35) ----
    // O acampamento e o tema do escudeiro ficam na cena da armadura; daqui até o fim, o vento do vale.
    ambiente('acampamento-dia', cena);
    ambiente('musica-escudeiro', cena, 0.2);
    cena = d.now;
    // Grua por trás da fila de Israel: o Davi pequeno, descendo sozinho para o vale.
    const desce = d.background(() => {
      dv.walkTo([MARGEM[0], MARGEM[1] - 0.15], { speed: 2.4 });
      dv.turnTo(180);
    });
    d.camera.cut({ pos: [2.5, TOPO + 4.2, -41], lookAt: [0.5, 2, -16], fov: 44 });
    d.camera.moveTo({ pos: [1.8, TOPO + 6.5, -44], lookAt: [0, 0.5, -8], fov: 42 });
    d.actor('israel-2').say('Olhem! Tem alguém descendo!', { tone: 'urgente', gesture: 0.4 });
    for (const id of irmaos) d.actor(id).behave('attend', { object: 'davi-vale', mood: 'worried' });
    abinadabe.say('É o Davi.', { tone: 'assustado' });
    const irmao = { pos: [5.9, TOPO + 1.65, -32.4] as V3, lookAt: [4.4, TOPO + 1.55, -35.6] as V3 };
    d.camera.cut(irmao);
    d.camera.moveTo(perto(irmao, 0.12));
    eliabe.say('Davi! Volta!', { tone: 'grito', gesture: 0.8 });
    // Lá embaixo, o Davi chega ao riacho; a câmera acompanha de longe.
    d.camera.track('davi-vale', { from: [6.5, 3.2, -11], to: [4.5, 2.4, -7.5], duration: Math.max(1, desce.end - d.now), fov: 40 });
    d.waitFor(desce);

    // A mão escolhendo as pedras lisas, uma a uma, contando baixinho. Rente à água.
    const rio = d.now;
    dv.behave('attend', { object: 'golias' });
    const m0 = d.where('davi-vale');
    d.camera.cut({ pos: [m0[0] + 1.3, m0[1] + 1.5, m0[2] + 3.6], lookAt: [m0[0], m0[1] + 0.7, m0[2] + 0.3], fov: 40 });
    d.camera.moveTo({ pos: [m0[0] + 1.1, m0[1] + 1.35, m0[2] + 3.1], lookAt: [m0[0], m0[1] + 0.6, m0[2] + 0.35], fov: 38 });
    d.do('davi-vale', 'move', { name: 'kneel' }, { duration: 0.7 });
    const conta = ['Uma.', 'Duas.', 'Três.', 'Quatro.', 'Cinco.'];
    for (let i = 1; i <= 5; i++) {
      if (i % 2 === 1) d.sound('pedras-agua');
      dv.pickUp(`pedra${i}`, { hand: 'right', duration: 0.9 });
      // [Liberdade] Ele conta baixinho.
      d.background(() => dv.say(conta[i - 1], { tone: 'sussurro', gesture: 0 }));
      dv.putAway(`pedra${i}`, { bag: true, duration: 0.7 });
      if (i === 2) {
        // A mão de perto: a pedra na palma.
        const m = d.where('davi-vale');
        d.camera.cut({ pos: [m[0] + 0.7, m[1] + 1.15, m[2] + 1.9], lookAt: [m[0] + 0.05, m[1] + 0.5, m[2] + 0.35], fov: 34 });
      }
    }
    // Do outro lado do riacho, os filisteus riem, depois que ele termina de contar.
    {
      const f = d.where('davi-vale');
      d.camera.cut({ pos: [f[0] - 1.5, f[1] + 1.3, f[2] + 2.6], lookAt: [f[0], f[1] + 0.6, f[2] + 0.2], fov: 42 });
      d.wait(1.0);
      d.actor('filisteu-6').say('Mandaram um menino!', { tone: 'laughs', gesture: 0.6 });
    }
    d.do('davi-vale', 'move', { name: 'kneel', amount: 0 }, { duration: 0.7 });
    dv.behave('attend', { object: 'golias' });
    ambiente('riacho', rio);

    // ---- 3. Frente a frente (1:00) ----
    // Plano geral: o gigante desce com o escudeiro na frente; o Davi atravessa o riacho, pequeno.
    d.background(() => {
      escudeiro.walkTo([-1.2, 10.4], { speed: 1.0 });
      escudeiro.behave('attend', { object: 'davi-vale' });
    });
    d.background(() => {
      d.wait(0.4);
      golias.walkTo(GOLIAS1, { speed: 0.9 });
      golias.behave('attend', { object: 'davi-vale', mood: 'happy' });
    });
    const atravessa = d.background(() => {
      dv.walkTo(PARADA, { speed: 1.2 });
      dv.turnTo(GOLIAS1);
    });
    d.sound('passos-gigante');
    d.camera.cut({ pos: [1.6, 2.6, -8.5], lookAt: [0, 1.6, 8], fov: 40 });
    d.camera.moveTo({ pos: [1.3, 2.3, -6.5], lookAt: [0, 1.7, 8], fov: 40 });
    d.waitFor(atravessa);
    dv.behave('attend', { object: 'golias' });
    // [Liberdade] Lá em cima, a fila de Israel olha, sem acreditar.
    d.camera.cut({ pos: [-3.2, TOPO + 1.5, -31.6], lookAt: [-4.6, TOPO + 1.55, -35.5], fov: 40 });
    d.camera.moveTo({ pos: [-3.4, TOPO + 1.5, -32.2], lookAt: [-4.6, TOPO + 1.55, -35.5], fov: 38 });
    d.wait(1.6);
    // O gigante percebe o rapaz e ri. De baixo para cima, por cima do ombro do Davi.
    const gigante = { pos: [0.9, d.where('davi-vale')[1] + 0.9, PARADA[1] - 1.6] as V3, lookAt: [0, d.where('golias')[1] + 2.7, GOLIAS1[1]] as V3 };
    d.camera.cut({ ...gigante, fov: 44 });
    d.camera.moveTo({ pos: [0.8, gigante.pos[1], PARADA[1] - 1.2], lookAt: gigante.lookAt, fov: 43 });
    const ameaca = d.now;
    golias.say('Sou eu algum cão, para que venhas a mim com paus?', { tone: 'laughs', to: dv, gesture: 0.5 });
    // Ele olha para o céu e amaldiçoa.
    const baixo = d.where('golias');
    d.camera.cut({ pos: [1.5, baixo[1] + 0.6, baixo[2] - 4.2], lookAt: [0, baixo[1] + 2.9, baixo[2]], fov: 42 });
    d.camera.moveTo({ pos: [1.3, baixo[1] + 0.55, baixo[2] - 3.7], lookAt: [0, baixo[1] + 2.95, baixo[2]], fov: 41 });
    golias.lookAt([0, baixo[1] + 9, baixo[2] - 4], { duration: 0.5 });
    golias.say('Que os meus deuses te amaldiçoem!', { tone: 'grito', gesture: 0.6 });
    golias.lookAt(dv, { duration: 0.4 });
    golias.say('Vem! Darei a tua carne às aves do céu e aos animais do campo!', { tone: 'grito', to: dv, gesture: 0.6 });
    // O Davi para. O vento. [GANCHO] Close no Davi, na altura dos olhos.
    const p = d.where('davi-vale');
    d.camera.cut({ pos: [p[0] - 0.25, p[1] + 1.62, p[2] + 1.35], lookAt: [p[0], p[1] + 1.58, p[2]], fov: 34 });
    d.camera.moveTo({ pos: [p[0] - 0.22, p[1] + 1.61, p[2] + 1.2], lookAt: [p[0], p[1] + 1.58, p[2]], fov: 33 });
    d.wait(0.6);
    dv.say('Tu vens contra mim com espada, lança e escudo.', { tone: 'firme', to: golias, gesture: 0.25 });
    // O gigante, de baixo para cima, ouvindo.
    d.camera.cut({ pos: [-0.9, p[1] + 0.9, p[2] + 1.4], lookAt: [0, baixo[1] + 2.85, baixo[2]], fov: 40 });
    d.camera.moveTo({ pos: [-0.8, p[1] + 0.9, p[2] + 1.8], lookAt: [0, baixo[1] + 2.85, baixo[2]], fov: 38 });
    dv.say('Eu, porém, vou contra ti em nome do Senhor dos Exércitos, o Deus dos exércitos de Israel, a quem tens afrontado.', { tone: 'firme', to: golias, gesture: 0.3 });
    // Silêncio. A fila de Israel e os irmãos.
    d.camera.cut({ pos: [5.8, TOPO + 1.6, -32.6], lookAt: [3.4, TOPO + 1.55, -35.6], fov: 40 });
    d.camera.moveTo({ pos: [5.6, TOPO + 1.6, -33.0], lookAt: [3.4, TOPO + 1.55, -35.6], fov: 38 });
    d.wait(1.2);
    d.camera.cut({ pos: [p[0] + 0.3, p[1] + 1.55, p[2] + 1.15], lookAt: [p[0], p[1] + 1.58, p[2]], fov: 34 });
    dv.express('angry', { amount: 0.3, duration: 0.2 });
    dv.say('Hoje todos saberão que há um Deus em Israel!', { tone: 'grito', to: golias, gesture: 0.5 });
    dv.express('neutral', { duration: 0.3 });

    // ---- 4. A batalha (1:45) ----
    ambiente('musica-ameaca', ameaca);
    d.sound('passos-gigante');
    // O gigante passa à frente do escudeiro e avança, pesado; a cada passo, poeira e o chão treme.
    golias.behave('attend', { object: 'davi-vale', mood: 'calm' });
    escudeiro.behave('attend', { object: 'golias' });
    d.do('golias', 'move', { name: 'lumber', amount: 0.55 }, { duration: 0.4 });
    golias.express('angry', { amount: 0.6 });
    const avanca = d.background(() => golias.walkTo(GOLIAS2, { speed: 0.75 }));
    ['passo1', 'passo2', 'passo3'].forEach((id, i) => d.background(() => {
      d.wait(0.2 + i * 0.4);
      d.do(id, 'set', { channel: 'puff', value: 1 }, { duration: 1.8, ease: 'out' });
    }));
    // Rente ao chão, os pés do gigante e a poeira; tremor de passo de gigante.
    d.camera.cut({ pos: [1.7, 0.35, 6.9], lookAt: [0, 0.9, 10.2], fov: 50, shake: 0.12 });
    d.camera.moveTo({ pos: [1.6, 0.55, 6.6], lookAt: [0, 1.6, 9.8], fov: 50, shake: 0.08 });
    // O Davi larga o cajado, tira a funda do alforje e corre na direção dele.
    dv.behave('attend', { object: 'golias' });
    dv.putDown('cajado-vale', [PARADA[0] - 0.6, d.ground(PARADA[0] - 0.6, PARADA[1]), PARADA[1] + 0.2]);
    dv.pickUp('funda', { hand: 'right', bag: true, duration: 0.7 });
    const corre = d.background(() => dv.runTo(TIRO, { speed: 2.6 }));
    d.sound('tensao-saul');
    d.sound('corrida-capim', { length: corre.end - corre.start, fade: 0.3 });
    // Os pés do Davi sobre a terra, a câmera baixa correndo junto.
    d.camera.track('davi-vale', { from: [1.3, d.where('davi-vale')[1] + 0.3, PARADA[1] - 0.6], to: [1.3, d.where('davi-vale')[1] + 0.35, TIRO[1] - 0.8], duration: corre.end - corre.start, aimHeight: -1.3, fov: 50, shake: 0.1 });
    // Correndo, ele tira uma pedra do alforje e a põe na funda.
    dv.pickUp('pedra1', { hand: 'left', bag: true, duration: 0.6 });
    d.do('funda', 'load', { with: 'pedra1' }, { duration: 0.75 });
    d.waitFor(corre);
    // A funda gira acima da cabeça. De baixo, de frente, a funda contra o céu.
    const giro = d.do('funda', 'whirl', {}, { duration: 2.6, ease: 'linear' });
    d.at(giro.start);
    d.sound('funda-gira', { length: 2.6, fade: 0.2 });
    const t0 = d.where('davi-vale');
    d.camera.cut({ pos: [t0[0] + 1.5, t0[1] + 0.9, t0[2] + 2.7], lookAt: [t0[0], t0[1] + 1.65, t0[2]], fov: 44 });
    d.camera.moveTo({ pos: [t0[0] + 1.3, t0[1] + 0.85, t0[2] + 2.4], lookAt: [t0[0], t0[1] + 1.7, t0[2]], fov: 44 });
    d.waitFor(giro.start + 1.3);
    // O gigante ergue a lança e o escudo dele está com o escudeiro, lá atrás.
    d.camera.cut({ pos: [-1.6, t0[1] + 0.7, t0[2] + 1.2], lookAt: [0, d.where('golias')[1] + 2.6, GOLIAS2[1]], fov: 40, shake: 0.05 });
    d.waitFor(giro);
    d.waitFor(avanca);
    golias.behave('attend', { object: 'davi-vale', mood: 'calm' });

    // A pedra. Câmera lenta: o braço solta, a pedra voa com o rastro, a câmera vai junto até a testa.
    const tiro = d.do('pedra1', 'throw', { hit: 'golias', with: 'funda', speed: 14, arc: 0.03, stick: true }, { ease: 'linear' });
    d.background(() => {
      d.wait(0.95);
      d.do('davi-vale', 'move', { name: 'sling', amount: 0 }, { duration: 0.35 });
    });
    const solta = tiro.start + 0.45;
    d.slowMo(tiro.start + 0.25, tiro.end + 0.35, 5);
    d.at(tiro.start);
    d.sound('pedra-voa');
    const g = d.where('golias');
    const testa: V3 = [0, g[1] + 2.95, GOLIAS2[1] - 0.15];
    // Do lado do braço que gira (a direita dele, -x): o braço solta, e a câmera corre ao lado da pedra, com ela no
    // meio do quadro, até a testa. A pedra sai acima do ombro direito (como no "throw").
    const solto: V3 = [t0[0] - 0.25, t0[1] + 1.85, t0[2] + 0.3];
    d.camera.cut({ pos: [solto[0] - 2.3, solto[1] - 0.1, solto[2] - 0.7], lookAt: [t0[0], t0[1] + 1.55, t0[2] + 0.1], fov: 44 });
    d.at(solta);
    d.camera.moveTo({ pos: [solto[0] - 2.0, solto[1] + 0.05, solto[2] - 0.4], lookAt: solto, fov: 42 });
    d.at(tiro.end - 0.05);
    d.camera.moveTo({ pos: [testa[0] - 1.9, testa[1] - 0.05, testa[2] - 1.3], lookAt: testa, fov: 38 });
    // Close no gigante: os olhos se arregalam.
    d.at(tiro.end - 0.18);
    golias.express('surprised', { duration: 0.15 });
    d.waitFor(tiro);
    d.sound('impacto-testa');
    // Impacto: a pedra crava na testa, a cabeça dá um tranco.
    d.do('golias', 'set', { channel: 'wear.foreheadStone', value: 1 }, { duration: 0 });
    d.do('impacto', 'set', { channel: 'puff', value: 1 }, { duration: 0.8, ease: 'out' });
    golias.lookAt([0, g[1] + 9, GOLIAS2[1] - 2.5], { duration: 0.15 });
    d.camera.cut({ pos: [-1.2, testa[1] - 0.25, testa[2] - 2.2], lookAt: testa, fov: 36, shake: 0.15 });
    d.wait(0.35);
    d.camera.moveTo({ pos: [-1.25, testa[1] - 0.3, testa[2] - 2.35], lookAt: [0, testa[1] - 0.2, testa[2]], fov: 38, shake: 0 });
    // Ele cambaleia, a lança escapa da mão.
    d.do('golias', 'move', { name: 'lumber', amount: 0 }, { duration: 0.3 });
    d.do('golias', 'move', { name: 'stagger' }, { duration: 0.5 });
    golias.putDown('lanca-golias', [1.3, d.ground(1.3, GOLIAS2[1] + 0.3), GOLIAS2[1] + 0.3], { duration: 0.8 });
    // De lado e de longe: ele dá um passo, perde o equilíbrio e cai pesadamente de rosto no chão.
    d.camera.cut({ pos: [10, 1.6, 8.9], lookAt: [0, 1.5, 8.9], fov: 46 });
    golias.walkTo([0, GOLIAS2[1] - 0.35], { speed: 0.4 });
    d.do('golias', 'move', { name: 'stagger', amount: 0 }, { duration: 0.3 });
    const queda = d.do('golias', 'fall', {}, { ease: 'linear', duration: 1.5 });
    golias.lookAt([0, g[1] + 2, 0], { duration: 0.6 });
    d.background(() => {
      // De volta ao instante do impacto: este ramo começa depois do lookAt, que já passou do fim da queda.
      d.at(queda.end - 0.12);
      d.sound('queda-gigante');
      d.do('queda1', 'set', { channel: 'puff', value: 1 }, { duration: 3.2, ease: 'out' });
      d.do('queda2', 'set', { channel: 'puff', value: 1 }, { duration: 3.0, ease: 'out' });
      d.camera.cut({ pos: [5.6, 0.75, 6.4], lookAt: [0, 0.5, 8.7], fov: 46, shake: 0.15 });
      d.wait(0.4);
      d.camera.moveTo({ pos: [5.4, 0.85, 6.2], lookAt: [0, 0.6, 8.7], fov: 46, shake: 0 });
    });
    d.slowMo(queda.end - 0.9, queda.end + 0.3, 2);
    d.waitFor(queda.end + 0.1);
    golias.behave('none');
    golias.express('neutral');
    d.wait(1.2);

    // ---- 5. O silêncio (2:10) ----
    // Os rostos de Israel, um por um. Ninguém se mexe.
    for (const id of [...tropa, ...irmaos]) d.actor(id).behave('trance', { point: [0, 0.6, 8.7] });
    d.camera.cut({ pos: [3.6, TOPO + 1.62, -33.4], lookAt: [2.2, TOPO + 1.6, -35.5], fov: 30 });
    d.wait(1.1);
    d.camera.cut({ pos: [5.4, TOPO + 1.75, -33.6], lookAt: [4.4, TOPO + 1.72, -35.5], fov: 28 });
    d.wait(1.1);
    // O Davi corre até o gigante caído e fica de pé ao lado dele.
    dv.behave('attend', { object: 'golias' });
    const caido = d.where('golias');
    const lado: [number, number] = [caido[0] - 1.05, caido[2] - 0.35];
    const vai = d.background(() => {
      dv.runTo(lado, { speed: 3.2 });
      dv.turnTo([caido[0], caido[2] - 0.3]);
    });
    d.camera.cut({ pos: [-5.5, 1.9, 9.6], lookAt: [-0.8, 1.0, 8.2], fov: 44 });
    d.waitFor(vai);
    // A espada do Golias sai da bainha e sobe; o brilho da lâmina contra o céu. Corta antes do golpe.
    d.sound('espada-saca');
    const espada = d.do('espada-golias', 'draw', { by: 'davi-vale', from: 'golias' }, { duration: 2.4 });
    const q = d.where('davi-vale');
    d.camera.cut({ pos: [q[0] - 1.6, q[1] + 0.8, q[2] - 1.4], lookAt: [q[0] + 0.1, q[1] + 1.3, q[2] + 0.2], fov: 44 });
    d.waitFor(espada.end - 0.7);
    d.camera.moveTo({ pos: [q[0] - 1.4, q[1] + 0.6, q[2] - 1.2], lookAt: [q[0] + 0.1, q[1] + 2.0, q[2] + 0.2], fov: 44 });
    d.waitFor(espada);
    d.wait(0.2);

    // O golpe (17:51). De lado e de corpo inteiro: a espada desce, e a área do golpe fica sob uma tarja preta.
    // O gigante caiu de bruços para a frente (-z); o pescoço fica um metro à frente do quadril, rente ao chão.
    const pescoco: V3 = [caido[0], d.ground(caido[0], caido[2] - 1.0) + 0.3, caido[2] - 1.0];
    // Do outro lado do corpo caído: o Davi de frente, a espada no alto e descendo.
    d.camera.cut({ pos: [caido[0] + 3.4, pescoco[1] + 1.2, caido[2] - 2.4], lookAt: [caido[0] - 0.6, pescoco[1] + 0.6, caido[2] - 0.6], fov: 46 });
    const golpe = d.do('espada-golias', 'chop', { at: pescoco }, { duration: 0.8 });
    // A tarja vai do golpe até o corte para a cabeça no chão (golpe.end + 0.9); dali em diante, o mosaico.
    const TARJA = golpe.end + 0.9 - (golpe.start + 0.42);
    d.at(golpe.start + 0.42);
    // A tarja cobre o pescoço, o vão e a cabeça que cai logo à frente: nada do corte aparece em volta dela.
    d.censor({ at: [pescoco[0] + 0.05, pescoco[1] + 0.05, pescoco[2] - 0.45], size: 1.0, mode: 'tarja' }, { duration: TARJA });
    d.at(golpe.start + 0.55);
    d.sound('golpe-espada');
    // Debaixo da tarja, a cabeça sai do corpo e fica no chão logo à frente dele, o corte virado para o pescoço, com
    // um palmo de vão. A censura fica só nos cortes: a tarja no golpe, e depois um mosaico pequeno no vão.
    d.do('golias', 'set', { channel: 'headOff', value: 1 }, { duration: 0 });
    const R = 0.27;
    const noChao: [number, number] = [pescoco[0] + 0.12, pescoco[2] - 0.3 - R * 1.3];
    d.do('cabeca-golias', 'moveTo', { to: noChao, y: d.ground(...noChao), yaw: 90 }, { duration: 0 });
    const vao: V3 = [(pescoco[0] + noChao[0]) / 2, pescoco[1] - 0.02, (pescoco[2] + noChao[1] + R) / 2];
    d.at(golpe.start + 0.42 + TARJA);
    d.censor({ at: vao, size: 0.5, mode: 'mosaico' }, { duration: 3.4 });
    d.at(golpe.end);
    d.wait(0.9);
    // A cabeça no chão, ao lado do corpo; o Davi de pé, com a espada baixa.
    const c3: V3 = [noChao[0], d.ground(...noChao) + 0.3, noChao[1]];
    d.camera.cut({ pos: [c3[0] + 2.4, c3[1] + 1.3, c3[2] - 1.8], lookAt: [c3[0] - 0.3, c3[1], c3[2] + 0.4], fov: 44 });
    d.wait(2.2);

    // O monte dos filisteus: um recua, depois outro; em instantes todos fogem.
    d.camera.cut({ pos: [15, TOPO + 4.5, LINHA - 9], lookAt: [0, TOPO + 1.0, LINHA + 3], fov: 46 });
    d.camera.moveTo({ pos: [14, TOPO + 4.8, LINHA - 7], lookAt: [0, TOPO + 1.0, LINHA + 6], fov: 46 });
    filisteus.forEach((f, i) => d.background(() => {
      d.wait(0.12 * i);
      d.actor(f.id!).express('scared');
    }));
    d.sound('fuga-filisteus');
    d.actor('filisteu-6').walkTo([-2.2, LINHA + 1.6], { speed: 0.8 });
    filisteus.forEach((f, i) => d.background(() => {
      // Cada um com o seu corredor e a sua largada, para ninguém correr dentro do outro.
      d.wait(0.5 + 0.09 * i);
      d.actor(f.id!).runTo([((i % 9) - 4) * 1.5 + (i >= 9 ? 0.75 : 0), 50 + (i % 3) * 4], { speed: 3.6 + (i % 3) * 0.3 });
      d.actor(f.id!).behave('idle', { mood: 'scared' });
    }));
    escudeiro.behave('none');
    d.background(() => {
      escudeiro.runTo([-3, 22], { speed: 3.4 });
      escudeiro.behave('idle', { mood: 'scared' });
    });
    d.wait(1.8);

    // [GANCHO] Na fila de Israel, um soldado grita sozinho; e o exército inteiro explode e desce o monte.
    const grito = d.actor(GRITO);
    const gp = d.where(GRITO);
    d.camera.cut({ pos: [gp[0] + 0.6, gp[1] + 1.8, gp[2] + 2.7], lookAt: [gp[0], gp[1] + 1.5, gp[2]], fov: 36 });
    grito.behave('attend', { object: 'golias' });
    grito.express('neutral');
    const vitoria = d.now;
    grito.say('Israel!', { tone: 'grito', gesture: 0 });
    d.sound('grito-guerra');
    d.sound('corrida-exercito', { length: 12, fade: 1.5 });
    // Muitas vozes gritando no ataque, umas por cima das outras, em duas ondas (cada voz é um som, sem legenda).
    for (let i = 1; i <= 8; i++) {
      d.background(() => {
        d.wait(0.5 + ((i * 0.37) % 1.4));
        d.sound(`grito-ataque-${i}`);
        d.wait(2.4 + ((i * 0.53) % 1.1));
        d.sound(`grito-ataque-${((i + 3) % 8) + 1}`, { volume: 0.35 });
      });
    }
    // Todo o exército desce: a fila, os irmãos e o resto da tropa nos flancos.
    const correm = [...tropa, 'sama', 'abinadabe', 'eliabe', ...ids(reforco)];
    for (const id of correm) d.background(() => d.do(id, 'move', { name: 'cheer' }, { duration: 0.5 }));
    d.background(() => {
      d.wait(0.6);
      d.actor('israel-4').say('Atrás deles!', { tone: 'grito', gesture: 0 });
    });
    d.wait(0.9);
    correm.forEach((id, i) => d.background(() => {
      d.wait(0.08 * (i % 7));
      d.do(id, 'move', { name: 'cheer', amount: 0 }, { duration: 0.3 });
      d.actor(id).express('happy', { amount: 0.6 });
      // Cada um corre reto para a frente, no seu corredor e na velocidade do corredor: ninguém cruza o caminho de
      // ninguém. Até o meio do vale, antes do fim do cartão.
      const x0 = d.where(id)[0];
      d.actor(id).runTo([x0, 12 + (i % 4)], { speed: 4.2 + (Math.round(Math.abs(x0) / 1.1) % 3) * 0.25 });
      d.actor(id).behave('idle', { mood: 'happy' });
    }));
    // Por trás da fila, rente aos soldados e fora da tenda do rei: as costas da tropa se derramando monte abaixo. A
    // câmera sobe e mostra o vale inteiro cheio de gente correndo.
    d.camera.cut({ pos: [10, TOPO + 2.0, -38.2], lookAt: [2, TOPO - 2.5, -24], fov: 56, shake: 0.05 });
    // Os movimentos terminam antes do cartão final: o episódio acaba com ele.
    d.background(() => {
      d.wait(2.0);
      d.camera.moveTo({ pos: [6, TOPO + 11, -47], lookAt: [0, 0, -16], fov: 56 });
      d.wait(2.5);
      d.camera.moveTo({ pos: [2, TOPO + 21, -46], lookAt: [0, 0, -2], fov: 58 });
    });
    // O narrador entra depois do último grito.
    d.wait(1.2);
    d.narrate('E naquele dia, o gigante que havia aterrorizado Israel por quarenta dias caiu diante de um pastor.');
    d.wait(0.3);
    const cartao = d.endCard({
      title: 'Você ia com a armadura do rei ou só com a funda?',
      options: [{ label: 'ARMADURA', icon: '🛡️' }, { label: 'FUNDA', icon: '🪨' }],
      cta: 'Comenta ARMADURA ou FUNDA 👇 e marca quem precisa de coragem hoje',
    }, { duration: 9 });
    const fim = d.now;
    d.at(cartao.start + 0.3);
    d.narrate('Você ia com a armadura do rei, ou só com a funda? Comenta aí. No próximo episódio: de herói a ameaça.');
    // O vento do vale desde o riacho, e o tema da abertura crescendo desde o grito de Israel até o fim.
    d.at(Math.max(d.now, fim));
    ambiente('vale-vento', cena);
    ambiente('musica-abertura', vitoria);
    void sama;
    void vale;
    void rumo;
  },
);
