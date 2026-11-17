import { direct } from '../../../src/engine/timeline/direct';

/**
 * Conversa: o banco da câmera de diálogo (`d.conversa`, `d.camera.over`). Três pares, cada um num caso: dois de
 * frente no pátio, dois muito perto um do outro dentro da sala, com a parede atrás (vira plano de lado), e uma
 * pessoa conversando com um gigante de 3,1 m. Cada troca de quem fala corta para o contraplano, do mesmo lado.
 * Os tempos de cada conversa estão no roteiro marcado (`npm run roteiro -- --series demo-acoes --ep 7`).
 */
export default direct(
  {
    episode: 7,
    title: 'Conversa',
    location: 'patio',
    cast: [
      { id: 'ana', character: 'ana', at: [5, 6], yaw: -90 },
      { id: 'beto', character: 'beto', at: [8.5, 6], yaw: 90 },
      // Dentro da sala (z de 14 a 20), encostados na parede do fundo.
      { id: 'gari', character: 'gari', at: [5.6, 19.2], yaw: -90 },
      { id: 'entregador', character: 'entregador', at: [6.4, 19.2], yaw: 90 },
      { id: 'policial', character: 'policial', at: [16, 6], yaw: -90 },
      { id: 'gigante', character: 'gari', at: [19.5, 6], yaw: 90, look: { name: 'Gigante', height: 3.1, build: 1.35, headScale: 1.75, beard: 'full', hairStyle: 'long' } },
    ],
  },
  (d) => {
    for (const id of ['ana', 'beto', 'gari', 'entregador', 'policial', 'gigante']) d.actor(id).behave('idle');
    d.conversa([
      ['ana', 'Tu viste quem chegou no portão hoje cedo?'],
      ['beto', 'Vi. Ninguém sabe de onde ele veio.'],
      ['beto', 'E ninguém teve coragem de perguntar.'],
      ['ana', 'Então eu pergunto.', { tone: 'firme' }],
    ]);
    d.wait(0.6);
    d.conversa([
      ['gari', 'Fala baixo. A parede escuta.'],
      ['entregador', 'Aqui dentro? Só tem nós dois.'],
      ['gari', 'Por isso mesmo.'],
    ]);
    d.wait(0.6);
    d.conversa([
      ['policial', 'Daqui de baixo você parece ainda maior.'],
      ['gigante', 'E daqui de cima você parece com medo.', { tone: 'irônico' }],
      ['policial', 'Não é medo. É respeito.'],
    ]);
    d.wait(1);
  },
);
