import { direct } from '../../../src/engine/timeline/direct';

/** Shows everything the engine does: the three kinds of door, the car, an item carried by hand, three cameras. */
export default direct(
  {
    episode: 1,
    title: 'Portas, carro, caixa e gente',
    location: 'rua',
    cast: [
      { character: 'ana', at: [12.6, 1.2], yaw: 180 },
      { character: 'beto', at: [27, 5.2], yaw: 90 },
      { character: 'robo', at: [2.6, 4.6], yaw: -90 },
    ],
  },
  (d) => {
    const ana = d.actor('ana');
    const beto = d.actor('beto');
    const robo = d.actor('robo');

    // A loja abre enquanto o robô passa na calçada.
    d.camera.cut({ pos: [5.5, 1.6, 9.5], lookAt: [5.5, 1.3, 3], fov: 55 });
    d.background(() => {
      d.wait(0.3);
      robo.walkTo([9.2, 4.6]);
      robo.behave('idle');
      robo.lookAt(ana);
    });
    d.wait(0.5);
    d.do('porta-loja', 'open', {}, { duration: 3 });
    d.wait(0.5);
    d.camera.moveTo({ pos: [5.5, 1.6, 8], lookAt: [5.5, 1.2, 3], fov: 55 });

    // Ana abre a porta de casa com a mão e sai.
    d.camera.cut({ pos: [13.4, 1.6, 7], lookAt: [12.4, 1.1, 3] });
    d.wait(0.2);
    ana.walkTo({ door: 'porta-casa' });
    ana.open('porta-casa');
    d.camera.moveTo({ pos: [13.3, 1.6, 6.8], lookAt: [12.4, 1.1, 3] });
    d.camera.thirdPerson(ana);
    const anaNaCaixa = d.background(() => {
      ana.walkTo([17.75, 4.7], { speed: 1.8 });
      ana.turnTo([18.2, 5.2]);
    });
    d.wait(1.2);

    // Enquanto isso, Beto corre para o mercado; vemos pelos olhos dele.
    d.camera.cut({ pos: [22.5, 1.6, 7.2], lookAt: [22.5, 1.1, 3] });
    d.background(() => d.do('porta-mercado', 'open', {}, { duration: 1.2 }));
    beto.express('happy');
    d.wait(0.4);
    d.camera.moveTo({ pos: [22.5, 1.6, 7.0], lookAt: [22.5, 1.1, 3] });
    d.camera.fpv(beto);
    beto.runTo([22.5, -1.5]);

    // Ana pega a caixa.
    d.waitFor(anaNaCaixa);
    d.camera.cut({ pos: [19.6, 1.5, 6.6], lookAt: [17.9, 0.7, 4.9] });
    ana.pickUp('caixa');
    ana.express('happy');
    d.camera.moveTo({ pos: [19.9, 1.5, 6.9], lookAt: [17.9, 0.9, 4.9] });

    // O carro chega; ela acompanha com a cabeça e vai até ele.
    d.camera.cut({ pos: [22.5, 2.3, 4.2], lookAt: [14, 0.6, 9], fov: 60 });
    const carroChega = d.background(() => d.do('carro', 'drive', { path: [[10, 9], [18, 8.6]] }, { duration: 4, ease: 'out' }));
    d.wait(0.2);
    ana.lookAt('carro');
    d.wait(1.4);
    ana.lookAhead();
    ana.walkTo([16.6, 7.2]);
    ana.turnTo(180);
    d.waitFor(carroChega);
    d.camera.moveTo({ pos: [22.3, 2.2, 4.4], lookAt: [17.5, 0.7, 8.6], fov: 60 });

    // Caixa no banco de trás.
    d.camera.cut({ pos: [15.0, 1.5, 5.4], lookAt: [17.2, 0.9, 8.0] });
    ana.open('carro', { part: 'rearLeft' });
    ana.walkTo([17.05, 7.55]);
    ana.turnTo([17.2, 8.2]);
    ana.putDown('caixa', { on: 'carro', seat: 'rearLeft' });
    ana.close('carro', { part: 'rearLeft' });
    d.background(() => d.do('porta-loja', 'close', {}, { duration: 3 }));

    // Ela entra e sai dirigindo.
    ana.walkTo([17.55, 7.2]);
    ana.turnTo(180);
    ana.open('carro', { part: 'frontLeft' });
    d.camera.moveTo({ pos: [15.6, 1.5, 5.2], lookAt: [17.6, 0.9, 8.0] });
    d.camera.fpv(ana);
    ana.sit('carro');
    ana.close('carro', { part: 'frontLeft' });
    d.wait(0.2);
    d.background(() => {
      d.wait(1);
      d.camera.thirdPerson(ana, { distance: 7, height: 1.6 });
    });
    d.do('carro', 'drive', { path: [[24, 8.6], [34, 8.6]] }, { duration: 4, ease: 'in' });
  },
);
