import { direct } from '../../../src/engine/timeline/direct';

/** Phone test: a message arrives, the owner takes the phone out of the pocket and reads it; then the signal drops. */
export default direct(
  {
    episode: 2,
    title: 'Celular',
    location: 'rua',
    cast: [
      { character: 'ana', at: [12, 4.6], yaw: 180 },
      { character: 'beto', at: [13.5, 6.2], yaw: 20 },
    ],
    props: [{ id: 'celular', asset: 'item.phone', pocketOf: 'ana' }],
  },
  (d) => {
    const ana = d.actor('ana');
    const celular = d.phone('celular');
    celular.setup({
      clock: '10:42',
      chats: [{
        id: 'pai',
        name: 'Pai',
        avatar: { color: '#3b6ea8' },
        history: [
          { from: 'them', text: 'Chegou bem na escola?', time: '07:12', day: 'Ontem' },
          { from: 'me', text: 'Cheguei sim', time: '07:15' },
          { from: 'them', image: { label: 'foto' }, text: 'Olha quem apareceu aqui em casa', time: '18:40' },
          { from: 'me', text: 'kkkk que fofo', time: '18:41' },
          { from: 'them', text: 'Não esquece o casaco amanhã', time: '06:50', day: 'Hoje' },
        ],
      }],
    });
    d.camera.cut({ pos: [10.6, 1.5, 6.6], lookAt: [12, 1.2, 4.6], fov: 50 });
    d.wait(1);
    celular.receive('NÃO OLHE PRO CÉU!', { time: '10:42' });
    ana.pickUp('celular');
    ana.raise();
    ana.lookAt('celular');
    d.camera.fpv(ana, { fov: 40 });
    d.wait(2);
    celular.send('Pai?? o que tá acontecendo', { time: '10:43' });
    d.wait(1.5);
    celular.typing(true);
    d.wait(2.5);
    d.world.network(false);
    d.wait(1.5);
    celular.send('PAI', { time: '10:43' });
    d.wait(2);
    d.camera.cut({ pos: [10.6, 1.5, 6.6], lookAt: [12, 1.2, 4.6], fov: 50 });
    ana.lookAhead();
    ana.lower();
    ana.putAway('celular');
  },
);
