import { direct } from '../../../src/engine/timeline/direct';

/**
 * Animais: o banco do andar de quatro patas (`src/engine/assets/gait.ts`). Um jumento carregado é puxado em linha
 * reta, parte, anda e para, visto de lado, para conferir que cada casco fica parado no chão enquanto apoia e que
 * as pernas não tremem ao partir e ao parar; atrás, um rebanho pastando e andando.
 * `npm run look -- --series demo-acoes --ep 8 --t 2,2.1,2.2,2.3`.
 */
const [X0, X1, Z] = [6, 16, 7];

export default direct(
  {
    episode: 8,
    title: 'Animais',
    location: 'patio',
    cast: [{ id: 'ana', character: 'ana', at: [X0 - 1.2, Z], yaw: -90 }],
    props: [
      { id: 'jumento', asset: 'ancient.hitchedDonkey', pos: [X0, Z], rot: -90, params: { load: 1, tied: 0 } },
      { id: 'rebanho', asset: 'ancient.flock', pos: [11, 3], params: { count: 8, width: 8, depth: 3.5 } },
    ],
  },
  (d) => {
    d.camera.cut({ pos: [11, 1.1, 14.5], lookAt: [11, 0.7, Z], fov: 46 });
    d.actor('ana').behave('idle');
    d.wait(1);
    d.background(() => d.do('jumento', 'moveTo', { to: [X1, Z] }, { duration: 8, ease: 'inOut' }));
    d.actor('ana').walkTo([X1 + 1.2, Z], { speed: 1.4 });
    d.wait(2);
  },
);
