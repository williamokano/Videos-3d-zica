import { direct } from '../../../src/engine/timeline/direct';

/**
 * The street kit together: a police car with its light bar on, an officer talking on a hand-held radio with a
 * voice answering over it, a bus that pulls in and opens its doors, a rider on a bicycle, and street furniture.
 */
export default direct(
  {
    episode: 3,
    title: 'Rua, polícia, ônibus e bicicleta',
    location: 'rua',
    cast: [
      { character: 'policial', at: [20.6, 5.7], yaw: 180 },
      { character: 'entregador', at: [26.4, 10.1], yaw: 90 },
      { character: 'gari', at: [12.2, 15.4], yaw: 0 },
      { character: 'ana', at: [8.4, 15.6], yaw: 0 },
    ],
    props: [
      { id: 'viatura', asset: 'vehicle.policeCar', pos: [20.5, 7.9], rot: -90 },
      { id: 'onibus', asset: 'vehicle.bus', pos: [-9, 12], rot: -90 },
      { id: 'bicicleta', asset: 'vehicle.bicycle', pos: [26.4, 9.3], rot: 90 },
      { id: 'radio', asset: 'item.radio', pocketOf: 'policial' },
    ],
  },
  (d) => {
    const policial = d.actor('policial');
    const entregador = d.actor('entregador');
    const gari = d.actor('gari');
    const ana = d.actor('ana');
    gari.behave('idle');
    entregador.behave('idle');
    ana.behave('attend', { object: 'onibus' });
    d.do('viatura', 'set', { channel: 'siren', value: 1 });

    // O policial chama a central pelo rádio; a resposta vem pelo rádio, de quem não está em cena.
    d.camera.cut({ pos: [16.6, 1.7, 5.9], lookAt: [20.8, 1.25, 6.5], fov: 48 });
    policial.behave('idle');
    d.wait(0.8);
    policial.pickUp('radio');
    policial.raise('chest');
    policial.say('Central, viatura doze no local. Rua bloqueada.');
    d.narrate('Copiado, doze. Reforço a caminho.', { as: 'ana', filter: 'radio' });
    policial.lower();
    policial.putAway('radio');
    policial.behave('idle');

    // O ônibus encosta no ponto e abre as portas.
    d.camera.cut({ pos: [15.5, 2.2, 17.4], lookAt: [8.5, 1.5, 12.6], fov: 55 });
    d.do('onibus', 'drive', { path: [[5, 12]], speed: 5 });
    d.together(
      () => d.do('onibus', 'open', { part: 'frontDoor' }, { duration: 1.2 }),
      () => d.do('onibus', 'open', { part: 'rearDoor' }, { duration: 1.2 }),
    );
    d.wait(1);

    // O entregador monta na bicicleta e passa pela rua.
    d.camera.cut({ pos: [21, 1.5, 12.2], lookAt: [24.5, 1.1, 9.4], fov: 55 });
    entregador.sit('bicicleta');
    d.camera.moveTo({ pos: [21, 1.5, 12.2], lookAt: [20, 1.1, 9.4], fov: 55 });
    d.do('bicicleta', 'drive', { path: [[13, 9.3]], speed: 3.5 });
    d.camera.moveTo({ pos: [21, 1.5, 12.2], lookAt: [13.5, 1.1, 9.4], fov: 55 });
    d.wait(0.6);
  },
);
