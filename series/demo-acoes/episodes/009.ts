import { direct } from '../../../src/engine/timeline/direct';

/**
 * O relógio no braço (série hora-contada), num pátio plano, para ver de frente, de 3/4 e de lado
 * (`npm run look -- --series demo-acoes --ep 9 --view ...`). Quatro pessoas lado a lado:
 * - o rapaz de manga curta, com 2 dias no braço, vira o antebraço para ler (`showArm('self')`);
 * - a rica, com séculos, estende o braço para mostrar (`showArm('out')`);
 * - a mulher de manga comprida, que cobre o relógio;
 * - o menino de menos de 25, com 1 ano parado.
 * Depois o tempo pula um dia (os números correm), a rica passa uma hora ao rapaz e o menino faz 25.
 * Os tempos de cada parte estão em `PARTES`, para o look.
 */

export const PARTES = { parados: 1, lendo: 3.5, pulo: 6, transferencia: 9.5, virada: 13.5 };

const Z = 6;

export default direct(
  {
    episode: 9,
    title: 'O relógio no braço',
    location: 'patio',
    cast: [
      {
        id: 'caio', character: 'beto', at: [10, Z], yaw: 180, clock: { left: '0000:002:02:17:40' },
        look: { name: 'Caio', skin: '#a8714f', shirt: '#7d828a', hair: '#1b1410', hairStyle: 'buzz' },
      },
      {
        id: 'vera', character: 'ana', at: [11.4, Z], yaw: 180, clock: { left: '0318:112:07:14:22' },
        look: { name: 'Vera', skin: '#f0c9a8', shirt: '#efe6d6', hair: '#d8c08a', hairStyle: 'bob' },
      },
      {
        id: 'rosa', character: 'ana', at: [12.8, Z], yaw: 180, clock: { left: '0000:002:02:17:40' },
        look: { name: 'Rosa', skin: '#a8714f', shirt: '#6f8fa8', hair: '#1b1410', hairStyle: 'bun', wear: ['longSleeves'] },
      },
      {
        id: 'menino', character: 'beto', at: [14.2, Z], yaw: 180, clock: { left: '0001:000:00:00:00', running: false },
        look: { name: 'Menino', height: 1.6, skin: '#8a5a3c', shirt: '#d9483b', hair: '#1b1410', hairStyle: 'curly' },
      },
    ],
  },
  (d) => {
    const caio = d.actor('caio');
    const vera = d.actor('vera');
    const menino = d.actor('menino');
    for (const id of ['caio', 'vera', 'rosa', 'menino']) d.actor(id).behave('idle');
    d.camera.cut({ pos: [12.1, 1.5, Z + 4.2], lookAt: [12.1, 1.1, Z], fov: 50 });

    d.at(PARTES.lendo - 0.8);
    // O rapaz levanta o antebraço esquerdo à frente do peito, como quem lê o relógio.
    // A rica estende o braço para mostrar; o menino lê o dele.
    caio.showArm('self');
    vera.showArm('out');
    menino.showArm('self');

    // Um dia passa: os relógios que correm descem juntos e rápido; o do menino não se mexe.
    d.at(PARTES.pulo);
    d.passTime('1:00:00:00', { duration: 2 });

    // A rica passa uma hora ao rapaz.
    d.at(PARTES.transferencia);
    vera.transfer('caio', '01:00:00');

    // O menino faz 25: o relógio começa a cair sem saltar.
    d.at(PARTES.virada);
    menino.clock({ run: true });
    d.wait(2);
  },
);
