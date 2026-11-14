import { direct } from '../../../src/engine/timeline/direct';

/**
 * A luta, peça por peça: o banco das ações de Davi e Golias, num pátio plano, para ver cada pose de frente, de
 * 3/4 e de lado (`npm run look -- --series demo-acoes --ep 6 --view ...`). Um rapaz de túnica de manga curta com a
 * armadura grande demais anda pesado, tira o capacete e a couraça, guarda uma pedra no alforje, põe outra na funda,
 * gira a funda acima da cabeça e solta; a pedra voa com rastro e crava na testa do gigante, que cambaleia e cai de
 * rosto, levantando poeira; o rapaz tira a espada da bainha dele e a ergue. Os tempos de cada parte estão em
 * `PARTES`, para o look.
 */

const DAVI = { x: 12, z: 5 };
/** O gigante, de frente para o rapaz, longe o bastante para a pedra voar. */
const GOLIAS: [number, number] = [12, 12.5];

export default direct(
  {
    episode: 6,
    title: 'A luta, peça por peça',
    location: 'patio',
    cast: [
      {
        id: 'davi', character: 'ana', at: [DAVI.x, DAVI.z], yaw: 180,
        look: {
          name: 'Davi', height: 1.72, skin: '#c99068', shirt: '#c99068', pants: '#c99068', shoes: '#c99068', hair: '#6e3b22', hairStyle: 'curly', beard: 'stubble',
          wear: [{ id: 'tunic', color: '#a88a62', accent: '#6b5236' }, 'sandals', 'shepherdBag', { id: 'scaleArmor', size: 1.18 }, { id: 'bronzeHelmet', size: 1.22 }, { id: 'scabbard', size: 1.45 }],
        },
      },
      {
        id: 'golias', character: 'gari', at: GOLIAS, yaw: 0,
        look: {
          name: 'Golias', height: 3.1, build: 1.35, headScale: 1.75, skin: '#b98a62', shirt: '#b98a62', pants: '#b98a62', shoes: '#b98a62', hair: '#22160f', hairStyle: 'long', beard: 'full',
          wear: [{ id: 'tunic', color: '#5a3a22' }, 'scaleArmor', 'greaves', 'bronzeHelmet', 'sandals', 'scabbard', { id: 'scabbardEmpty', hidden: true }, { id: 'foreheadStone', hidden: true }],
        },
      },
    ],
    props: [
      { id: 'capacete', asset: 'arms.helmet', pos: [0, 0], pocketOf: 'davi', params: { size: 0.19 } },
      { id: 'couraca', asset: 'arms.armor', pos: [0, 0], pocketOf: 'davi', params: { size: 0.5 } },
      { id: 'pedra-chao', asset: 'arms.stone', pos: [DAVI.x + 0.35, DAVI.z + 4.6], pickable: true },
      { id: 'funda', asset: 'arms.sling', pos: [0, 0], pocketOf: 'davi' },
      { id: 'pedra', asset: 'arms.stone', pos: [0, 0], pocketOf: 'davi' },
      { id: 'espada', asset: 'arms.sword', pos: [0, 0], pocketOf: 'davi', params: { length: 0.95 } },
      { id: 'poeira', asset: 'nature.dust', pos: [GOLIAS[0], GOLIAS[1] - 1.2], params: { size: 1.6 } },
    ],
  },
  (d) => {
    const davi = d.actor('davi');
    const golias = d.actor('golias');
    golias.behave('attend', { object: 'davi' });
    davi.behave('attend', { object: 'golias' });
    d.camera.cut({ pos: [DAVI.x + 4, 1.8, DAVI.z + 9], lookAt: [DAVI.x, 1.2, DAVI.z + 2], fov: 50 });

    // 1. Andar pesado, com a armadura grande demais.
    d.do('davi', 'move', { name: 'lumber' }, { duration: 0.4 });
    davi.walkTo([DAVI.x, DAVI.z + 3.6], { speed: 0.7 });
    // 2. Tirar o capacete e a couraça, e largar no chão.
    d.do('capacete', 'doff', { wear: 'bronzeHelmet' });
    davi.putDown('capacete', [DAVI.x + 0.5, 0, DAVI.z + 3.9]);
    d.do('couraca', 'doff', { wear: 'scaleArmor' });
    davi.putDown('couraca', [DAVI.x - 0.5, 0, DAVI.z + 3.9]);
    d.do('davi', 'move', { name: 'lumber', amount: 0 }, { duration: 0.4 });
    d.do('davi', 'set', { channel: 'wear.scabbard', value: 0 }, { duration: 0 });
    // 3. Uma pedra do chão para o alforje.
    davi.walkTo([DAVI.x, DAVI.z + 4.2], { speed: 1 });
    d.do('davi', 'move', { name: 'kneel' }, { duration: 0.6 });
    davi.pickUp('pedra-chao', { hand: 'right' });
    davi.putAway('pedra-chao', { bag: true });
    d.do('davi', 'move', { name: 'kneel', amount: 0 }, { duration: 0.6 });
    // 4. A funda e a pedra do alforje; a pedra na bolsinha.
    davi.pickUp('funda', { hand: 'right', bag: true });
    davi.pickUp('pedra', { hand: 'left', bag: true });
    d.do('funda', 'load', { with: 'pedra' });
    // 5. Girar acima da cabeça e soltar: a pedra crava na testa.
    d.do('funda', 'whirl', {}, { duration: 3, ease: 'linear' });
    const tiro = d.do('pedra', 'throw', { hit: 'golias', with: 'funda', speed: 14, stick: true }, { ease: 'linear' });
    d.background(() => {
      d.wait(0.9);
      d.do('davi', 'move', { name: 'sling', amount: 0 }, { duration: 0.3 });
    });
    d.waitFor(tiro);
    d.do('golias', 'set', { channel: 'wear.foreheadStone', value: 1 }, { duration: 0 });
    // 6. O gigante cambaleia e cai de rosto, levantando poeira.
    golias.behave('none');
    d.do('golias', 'move', { name: 'stagger' }, { duration: 0.5 });
    d.wait(1.4);
    d.together(
      () => d.do('golias', 'fall', {}, { ease: 'linear', duration: 1.5 }),
      () => d.do('golias', 'move', { name: 'stagger', amount: 0 }, { duration: 0.8 }),
      () => {
        d.wait(1.3);
        d.do('poeira', 'set', { channel: 'puff', value: 1 }, { duration: 2.6, ease: 'out' });
      },
    );
    // 7. A espada da bainha dele, erguida.
    davi.putAway('funda', { bag: true });
    const caido = d.where('golias');
    davi.walkTo([caido[0] - 1.0, caido[2] - 0.4], { speed: 1.6 });
    davi.turnTo([caido[0], caido[2]]);
    d.do('espada', 'draw', { by: 'davi', from: 'golias' });
    d.wait(1.5);
  },
);
