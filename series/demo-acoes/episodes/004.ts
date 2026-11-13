import { direct } from '../../../src/engine/timeline/direct';

const KINDS = ['fixed', 'sliding', 'tilt', 'casement', 'louver', 'blinds'];

/** Every kind of window, seen from outside and from inside, opening and closing. */
export default direct(
  { episode: 4, title: 'Janelas', location: 'janelas', cast: [{ character: 'ana', at: [7, 7.4], yaw: 0 }] },
  (d) => {
    d.actor('ana').behave('idle');
    d.camera.cut({ pos: [7, 1.9, 13.5], lookAt: [7, 1.5, 5], fov: 62 });
    d.wait(1);
    // All of them open at once (the fixed one has nothing to open, and stays as it is).
    d.together(...KINDS.map((kind) => () => void d.do(`janela-${kind}`, 'open', {}, { duration: 1.6 })));
    d.wait(1.2);
    d.camera.cut({ pos: [7, 1.6, 0.8], lookAt: [7, 1.5, 5], fov: 80 });
    d.wait(1.2);
    d.together(...KINDS.map((kind) => () => void d.do(`janela-${kind}`, 'close', {}, { duration: 1.6 })));
    d.wait(0.8);
  },
);
