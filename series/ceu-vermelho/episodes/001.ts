import { DESK_SEAT } from '../../../src/engine/assets/school';
import type { CastMember } from '../../../src/engine/character/cast';
import { extraLook } from '../../../src/engine/character/extras';
import { direct, type Actor } from '../../../src/engine/timeline/direct';

/*
 * Episódio 1, todo visto pelos olhos do protagonista. No meio da aula o céu fica vermelho; o pai manda
 * não olhar; o professor leva a turma para o depósito no subsolo; o sinal cai; o protagonista foge.
 */

// Sala 3: carteiras em 4 fileiras (da frente para o fundo) por 4 colunas (da janela para o corredor), viradas para o quadro a oeste.
const SALA = { x: 16, z: -7 };
const desk = (row: number, column: number): [number, number] => [SALA.x + 3.2 + 1.15 * row, SALA.z + 1.3 + 1.45 * column];
const seat = (row: number, column: number): [number, number] => [desk(row, column)[0] + DESK_SEAT.back, desk(row, column)[1]];
/** Corredor entre colunas, ao lado da cadeira: onde o aluno fica de pé ao levantar. */
const aisle = (row: number, column: number): [number, number] => [seat(row, column)[0], seat(row, column)[1] + 0.725];

const HERO: [number, number] = [3, 1];
const LUCAS: [number, number] = [3, 0];
const MARIA: [number, number] = [2, 2];
// A carteira à frente do protagonista fica vazia, para ele enxergar o quadro.
const EMPTY = ['0,3', '2,1'];

const student = (id: string, character: string, [row, column]: [number, number], look?: CastMember['look']): CastMember => ({
  id, character, at: seat(row, column), yaw: 90, seated: DESK_SEAT.height, look,
});

// Figurantes: uma ficha só ("aluno"), com aparência sorteada pelo número de cada um.
const extras: { id: string; place: [number, number] }[] = [];
for (let row = 0; row < 4; row++) {
  for (let column = 0; column < 4; column++) {
    const taken = [HERO, LUCAS, MARIA].some(([r, c]) => r === row && c === column) || EMPTY.includes(`${row},${column}`);
    if (!taken) extras.push({ id: `aluno-${extras.length + 1}`, place: [row, column] });
  }
}

const JANELA: [number, number, number] = [21, 7, -30];
const DEPOSITO = -3;

export default direct(
  {
    episode: 1,
    title: 'De repente',
    location: 'escola',
    cast: [
      student('heroi', 'heroi', HERO),
      student('lucas', 'lucas', LUCAS),
      student('maria', 'maria', MARIA),
      { character: 'professor', at: [SALA.x + 0.62, SALA.z + 2.2], yaw: 90 },
      ...extras.map(({ id, place }, i) => student(id, 'aluno', place, { name: `Aluno ${i + 1}`, ...extraLook(i * 7 + 3) })),
    ],
    props: [
      { id: 'celular', asset: 'item.phone', pocketOf: 'heroi' },
      { id: 'celular-professor', asset: 'item.phone', pocketOf: 'professor', params: { color: '#3a3f4a' } },
    ],
    tail: 1.5,
  },
  (d) => {
    const heroi = d.actor('heroi');
    const lucas = d.actor('lucas');
    const maria = d.actor('maria');
    const professor = d.actor('professor');
    const alunos = extras.map(({ id, place }) => ({ actor: d.actor(id), place }));
    const turma: { actor: Actor; place: [number, number] }[] = [...alunos, { actor: lucas, place: LUCAS }, { actor: maria, place: MARIA }];
    const celular = d.phone('celular');

    // ---- A aula ----
    d.world.rule('ceu-vermelho', false);
    celular.setup({
      clock: '10:42',
      chats: [{
        id: 'pai',
        name: 'Pai',
        avatar: { color: '#3b6ea8' },
        history: [
          { from: 'them', text: 'Chegou bem na escola?', time: '07:12', day: 'Ontem' },
          { from: 'me', text: 'Cheguei sim', time: '07:15' },
          { from: 'them', image: {}, text: 'Olha quem apareceu aqui em casa', time: '18:40' },
          { from: 'me', text: 'kkkk que fofo', time: '18:41' },
          { from: 'them', text: 'Não esquece o casaco amanhã', time: '06:50', day: 'Hoje' },
          { from: 'me', text: 'Tá bom pai', time: '06:52' },
        ],
      }],
    });
    d.phone('celular-professor').screen(false);
    d.camera.fpv(heroi, { fov: 64, pitch: -7 });
    professor.behave('write');
    for (const { actor } of turma) actor.behave('attend', { object: professor });
    // Conversa de fundo: duas duplas cochichando.
    alunos[0].actor.behave('chat', { group: 'cochicho-1' });
    alunos[1].actor.behave('chat', { group: 'cochicho-1' });
    alunos[6].actor.behave('chat', { group: 'cochicho-2' });
    alunos[7].actor.behave('chat', { group: 'cochicho-2' });
    heroi.lookAt(professor, { duration: 0 });
    d.wait(5);

    // ---- O céu fica vermelho ----
    d.background(() => d.world.rule('ceu-vermelho', true, { duration: 9, ease: 'inOut' }));
    d.wait(2.5);
    // Quem está perto da janela percebe primeiro. Nem todo mundo olha.
    const olham = [lucas, alunos[0].actor, alunos[3].actor, alunos[4].actor, alunos[8].actor, maria];
    d.background(() => {
      for (const quem of olham) {
        quem.behave('watch', { point: JANELA });
        d.wait(0.7);
      }
    });
    d.wait(1.5);
    heroi.lookAt(lucas, { duration: 0.8 });
    d.wait(2.2);
    heroi.lookAt(professor, { duration: 0.8 });
    d.wait(1.5);

    // ---- Lucas vem falar ----
    lucas.behave('none');
    lucas.standUp(aisle(...LUCAS));
    lucas.turnTo(seat(...HERO));
    d.background(() => heroi.lookAt(lucas, { duration: 0.5 }));
    lucas.say('Caraca, mano, o que que tá rolando?', { to: heroi });
    d.wait(0.6);
    lucas.behave('watch', { point: JANELA });
    d.wait(1.2);

    // ---- O celular toca ----
    celular.receive('NÃO OLHE PRO CÉU!', { time: '10:43' });
    heroi.lookAhead({ duration: 0.4 });
    heroi.pickUp('celular');
    d.together(
      () => heroi.raise(),
      () => heroi.lookAt('celular', { duration: 0.6 }),
    );
    d.camera.moveTo({ fov: 64 });
    d.wait(0.8);
    d.camera.moveTo({ fov: 44 });
    d.wait(4);
    d.camera.moveTo({ fov: 44 });

    // ---- Confusão ----
    // Os alunos levantam e se juntam em grupinhos nos corredores da sala, discutindo.
    const grupos = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10]];
    d.background(() => {
      grupos.forEach((grupo, g) => {
        for (const i of grupo) {
          const { actor, place } = alunos[i];
          d.background(() => {
            d.wait(0.4 * (i % 3));
            actor.behave('none');
            actor.standUp(aisle(...place));
            actor.behave('chat', { group: `grupo-${g}` });
          });
        }
        d.wait(0.5);
      });
      maria.behave('none');
      maria.standUp(aisle(...MARIA));
      maria.behave('chat', { group: 'amigos' });
      lucas.behave('chat', { group: 'amigos' });
    });
    d.wait(1);
    d.together(
      () => heroi.lower(),
      () => heroi.lookAt(lucas, { duration: 0.6 }),
    );
    d.camera.moveTo({ fov: 64 });
    heroi.putAway('celular');
    heroi.standUp(aisle(...HERO));
    heroi.lookAt(alunos[4].actor, { duration: 0.7 });
    d.wait(2);
    heroi.lookAt(alunos[9].actor, { duration: 0.7 });
    d.wait(2);
    heroi.lookAt(maria, { duration: 0.6 });
    d.wait(1.5);

    // ---- O professor chama a atenção ----
    professor.behave('none');
    professor.turnTo(desk(2, 2));
    d.background(() => {
      for (const { actor } of turma) {
        actor.behave('attend', { object: professor });
        d.wait(0.12);
      }
    });
    d.background(() => heroi.lookAt(professor, { duration: 0.5 }));
    professor.say('Pessoal! Atenção aqui!');
    d.wait(0.5);
    professor.say('Vamos para um abrigo aqui embaixo. Com calma, em fila.');
    d.wait(0.4);
    // Enquanto espera a vez, o protagonista acompanha o professor saindo.
    heroi.turnTo([SALA.x + 1.2, SALA.z + 6.8]);

    // ---- A caminho do depósito ----
    // O professor vai na frente e abre as portas; a turma segue em fila, cada um para o seu canto do depósito.
    const centros: [number, number][] = [[17.6, 1.5], [14.6, 1.9], [20.6, -2.2], [11.6, 1.5]];
    const emVolta = (centro: [number, number], n: number, de: number): [number, number] => {
      const a = (de / n) * Math.PI * 2 + 0.5;
      return [centro[0] + Math.cos(a) * 0.6, centro[1] + Math.sin(a) * 0.6];
    };
    const AMIGOS: [number, number] = [21.3, 1.3];
    const destinoDe = new Map<string, { ponto: [number, number]; centro: [number, number]; grupo: string }>();
    grupos.forEach((grupo, g) => grupo.forEach((i, k) => destinoDe.set(alunos[i].actor.id, { ponto: emVolta(centros[g], grupo.length, k), centro: centros[g], grupo: `grupo-${g}` })));
    destinoDe.set('lucas', { ponto: [AMIGOS[0] - 0.75, AMIGOS[1] - 0.35], centro: AMIGOS, grupo: 'amigos' });
    destinoDe.set('maria', { ponto: [AMIGOS[0] - 0.55, AMIGOS[1] + 0.6], centro: AMIGOS, grupo: 'amigos' });

    const guia = d.background(() => {
      professor.walkTo({ door: 'porta-escadaria' }, { speed: 1.6 });
      professor.open('porta-escadaria');
      professor.walkTo({ door: 'porta-deposito' }, { speed: 1.6, elevation: DEPOSITO });
      professor.open('porta-deposito');
      // Fica de lado, esperando a turma entrar.
      professor.walkTo([26.2, 2.45], { elevation: DEPOSITO });
      professor.turnTo([24, 2.2]);
      professor.behave('idle');
    });

    // Ordem da fila: os da frente da sala saem primeiro; o protagonista vai no meio, com os amigos.
    const fila: Actor[] = [...[0, 1, 2, 3, 4, 5].map((i) => alunos[i].actor), lucas, heroi, maria, ...[6, 7, 8, 9, 10].map((i) => alunos[i].actor)];
    const lugarDe = new Map<string, [number, number]>([...turma.map(({ actor, place }) => [actor.id, place] as [string, [number, number]]), ['heroi', HERO]]);
    /** Metros, mais ou menos, do lugar de cada um até a porta da sala: pelo corredor entre as carteiras e depois pela frente. */
    const ateAPorta = (quem: Actor): number => {
      const [x, z] = aisle(...lugarDe.get(quem.id)!);
      return x - (SALA.x + 2.3) + Math.abs(z - (SALA.z + 6.6)) + 1.4;
    };
    let ultimo = d.now;
    let chegadaDoHeroi = d.now;
    fila.forEach((quem, ordem) => {
      const step = d.background(() => {
        // Cada um sai na hora certa para chegar à porta da sala na sua vez, venha de perto ou do fundo.
        // O protagonista e quem vem atrás dele deixam mais espaço, para a visão dele não ser só uma nuca.
        const vez = 12 + ordem * 1.1 + (ordem >= 7 ? 1.4 : 0) + (ordem >= 8 ? 0.8 : 0);
        d.wait(Math.max(0.2, vez - ateAPorta(quem) / 1.35));
        if (quem === heroi) {
          heroi.lookAhead({ duration: 0.4 });
          heroi.walkTo(AMIGOS, { speed: 1.35, elevation: DEPOSITO });
          heroi.turnTo([AMIGOS[0] - 0.7, AMIGOS[1] + 0.1]);
          return;
        }
        const destino = destinoDe.get(quem.id)!;
        quem.behave('idle');
        quem.walkTo(destino.ponto, { speed: 1.35, elevation: DEPOSITO });
        quem.turnTo(destino.centro);
        quem.behave('chat', { group: destino.grupo });
      });
      ultimo = Math.max(ultimo, step.end);
      if (quem === heroi) chegadaDoHeroi = step.end;
    });
    d.waitFor(guia);
    d.waitFor(chegadaDoHeroi);
    // Enquanto o resto da turma chega, ele olha em volta: os amigos, a porta, os outros grupos.
    const olhares: (Actor | [number, number, number])[] = [lucas, maria, [24, -1.5, 2.2], alunos[0].actor, lucas, alunos[6].actor, maria];
    for (let i = 0; d.now < ultimo - 3; i++) {
      heroi.lookAt(olhares[i % olhares.length], { duration: 0.6 });
      d.wait(1.9);
    }

    // ---- O professor fecha a porta ----
    d.waitFor(ultimo - 3);
    professor.behave('none');
    professor.walkTo([23.2, 1.2], { elevation: DEPOSITO });
    professor.walkTo({ door: 'porta-deposito' });
    d.background(() => {
      heroi.turnTo([23.4, 2.4]);
      heroi.lookAt(professor, { duration: 0.6 });
    });
    professor.close('porta-deposito');
    professor.walkTo([22.7, 2.9]);
    professor.turnTo([18, 1.5]);
    professor.pickUp('celular-professor');
    professor.raise('chest');
    professor.lookAt('celular-professor', { duration: 0.4 });
    d.wait(1.6);
    d.background(() => {
      for (const quem of fila) {
        if (quem !== heroi) quem.behave('attend', { object: professor });
        d.wait(0.1);
      }
    });
    professor.lookAhead({ duration: 0.4 });
    professor.say('Recebi uma mensagem pra se abrigar e esperar a ajuda.');
    professor.say('Vamos ficar aqui.');
    professor.lower();
    professor.putAway('celular-professor');
    professor.behave('idle');
    for (const quem of fila) if (quem !== heroi) quem.behave('chat', { group: destinoDe.get(quem.id)!.grupo });

    // ---- Segunda mensagem do pai ----
    d.wait(1.2);
    celular.receive('FIQUE AONDE VOCÊ ESTÁ, ESTOU INDO', { time: '10:51' });
    heroi.pickUp('celular');
    d.together(
      () => heroi.raise(),
      () => heroi.lookAt('celular', { duration: 0.6 }),
    );
    d.camera.moveTo({ fov: 64 });
    d.wait(0.6);
    d.camera.moveTo({ fov: 44 });
    d.wait(2.4);
    celular.typing(true);
    d.wait(3);
    // Cai o sinal, no mundo todo.
    d.world.network(false);
    d.wait(3);
    d.camera.moveTo({ fov: 44 });
    d.together(
      () => heroi.lower(),
      () => heroi.lookAt(lucas, { duration: 0.6 }),
    );
    d.camera.moveTo({ fov: 64 });
    heroi.putAway('celular');

    // ---- A fuga ----
    lucas.behave('attend', { object: heroi });
    maria.behave('attend', { object: heroi });
    heroi.lookAhead({ duration: 0.4 });
    heroi.walkTo({ door: 'porta-deposito' });
    professor.behave('none');
    d.background(() => {
      professor.turnTo([23.5, 2.2]);
      professor.lookAt(heroi, { duration: 0.3 });
    });
    heroi.turnTo([22.7, 2.9]);
    heroi.say('Eu vou sair.', { to: professor });
    professor.say('Daqui ninguém sai!', { to: heroi });
    d.wait(0.3);
    // Lucas e Maria distraem o professor.
    d.together(
      () => lucas.walkTo([21.4, 2.6], { speed: 2 }),
      () => maria.walkTo([21.2, 1.9], { speed: 2 }),
    );
    d.background(() => heroi.lookAt(lucas, { duration: 0.4 }));
    lucas.say('Professor! Olha ali atrás!', { to: professor });
    d.background(() => {
      professor.turnTo([18, 1.5]);
      professor.lookAt(maria, { duration: 0.4 });
    });
    maria.say('Tem gente passando mal lá no fundo!', { to: professor });
    // Com o professor de costas, a porta.
    heroi.lookAhead({ duration: 0.3 });
    heroi.turnTo([24, 2.2]);
    heroi.open('porta-deposito');
    d.background(() => {
      d.wait(0.6);
      professor.lookAt(heroi, { duration: 0.3 });
      professor.say('Ei! Volta aqui!', { to: heroi });
    });
    // A fuga: a lente abre enquanto ele corre.
    d.camera.moveTo({ fov: 64, lens: 0 });
    heroi.runTo([20, 1.5], { elevation: 0, speed: 3.6 });
    d.camera.moveTo({ fov: 76, lens: 0.7 });
    // Tela final: a pergunta para quem assiste.
    d.endCard({
      title: 'O que você faria?',
      options: [{ label: 'Ficava no abrigo esperando ajuda' }, { label: 'Saía para ver o céu' }, { label: 'Ia atrás da minha família' }],
      cta: 'Comenta aí o que você faria',
    });
  },
);
