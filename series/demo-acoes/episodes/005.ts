import { direct } from '../../../src/engine/timeline/direct';

/**
 * Every action an asset takes, one after the other, to see each of them: a gate, seats that face a table, things
 * put in a bin and on a shelf, things knocked over, lights and a traffic light, a car that steers, and indoors
 * lockers, drawers, a lamp, a fan and a blind.
 */
export default direct(
  {
    episode: 5,
    title: 'O que cada asset faz',
    location: 'patio',
    cast: [
      { character: 'ana', at: [12, 2.2], yaw: 180 },
      { character: 'beto', at: [10.9, 9.6], yaw: 90 },
      { character: 'gari', at: [5, 13.5], yaw: 0 },
      { character: 'policial', at: [14.5, 9.15], yaw: 0 },
      { character: 'entregador', at: [17.5, 9.95], yaw: 0 },
    ],
  },
  (d) => {
    const [ana, beto, gari, policial, entregador] = ['ana', 'beto', 'gari', 'policial', 'entregador'].map((id) => d.actor(id));
    for (const who of [ana, beto, gari, policial, entregador]) who.behave('idle');

    // 1. O portão: fechado barra; aberto, ela passa.
    d.camera.cut({ pos: [8.4, 2.6, 0.6], lookAt: [12, 1, 4.6], fov: 55 });
    d.wait(0.6);
    d.do('portao', 'open', {}, { duration: 1.6 });
    ana.walkTo([6.3, 8.2]);

    // 2. Sentar: cada um no seu lugar, virado para o meio da mesa.
    d.camera.cut({ pos: [7.4, 7.4, 3.6], lookAt: [7, 0.4, 10.8], fov: 62 });
    d.together(
      () => ana.sit('mesa-banquinhos', 's1'),
      () => beto.sit('mesa-arcos', 'b1'),
      () => gari.sit('mesa-reta', 'b1'),
    );
    d.wait(1.6);

    // 3. Pôr coisas: a caixa vai para dentro da lixeira.
    d.camera.cut({ pos: [16.4, 1.7, 10.4], lookAt: [14.5, 0.8, 8.5], fov: 45 });
    policial.behave('none');
    policial.turnTo([14.95, 9.15]);
    policial.pickUp('caixa');
    policial.turnTo([14.5, 8.2]);
    policial.putDown('caixa', { on: 'lixeira', seat: 'inside' });
    policial.behave('idle');
    d.wait(0.8);

    // 4. Derrubar e levantar: o cone por esbarrão, o cavalete e a bicicleta caem; o cone volta a ficar de pé.
    d.camera.cut({ pos: [19, 3.2, 17.5], lookAt: [19, 0.4, 9], fov: 50 });
    d.wait(0.5);
    d.do('cone', 'knockOver', { by: 'entregador' });
    d.do('cavalete', 'knockOver');
    d.do('bike', 'knockOver');
    d.wait(1);
    d.do('cone', 'setUpright');
    d.wait(0.6);

    // 5. Ligar, desligar e sinalizar; a viatura sai fazendo a curva, com giroflex e faróis.
    d.camera.cut({ pos: [19.6, 2.2, 8.4], lookAt: [22.6, 3.4, 6], fov: 40 });
    for (const to of ['green', 'yellow', 'red', 'off']) {
      d.do('semaforo', 'signal', { to });
      d.wait(0.7);
    }
    d.camera.cut({ pos: [13.2, 0.9, 0.4], lookAt: [8.6, 0.6, 0.6], fov: 50 });
    d.do('viatura', 'switch', { on: true });
    d.do('viatura', 'switch', { on: true, what: 'lights' });
    d.do('poste', 'switch', { on: false });
    d.wait(0.8);
    d.do('viatura', 'drive', { path: [[6.5, 1.6], [9.6, -0.6], [11, -4.5]], speed: 2.6 });

    // 6. Dentro: armários, gaveta, lâmpada, ventilador e persiana.
    d.camera.cut({ pos: [4.4, 1.7, 15.2], lookAt: [3.6, 1.2, 19.8], fov: 70 });
    d.do('armarios', 'open', { part: 'door2' });
    d.do('armarios', 'open', { part: 'door4', amount: 0.5 });
    d.wait(0.8);
    d.camera.cut({ pos: [5.0, 1.45, 15.5], lookAt: [5.7, 0.62, 17.2], fov: 55 });
    d.do('mesa-prof', 'open', { part: 'drawer1' });
    d.do('mesa-prof', 'open', { part: 'drawer2', amount: 0.5 });
    d.wait(0.8);
    d.camera.cut({ pos: [7.2, 1.6, 17.6], lookAt: [8.4, 1.75, 14.2], fov: 62 });
    d.wait(0.6);
    d.do('persiana', 'open', {}, { duration: 1.6 });
    // O ventilador girando, e parado depois de desligado.
    d.camera.cut({ pos: [6.6, 1.2, 18.4], lookAt: [8, 2.6, 17], fov: 50 });
    d.wait(1.2);
    d.do('ventilador', 'switch', { on: false });
    d.wait(1.2);
    d.camera.cut({ pos: [7.2, 1.6, 17.6], lookAt: [5, 2.4, 16.4], fov: 70 });
    d.wait(0.5);
    d.do('lampada', 'switch', { on: false });
    d.wait(1);
  },
);
