import { DESK_SEAT } from '../../../src/engine/assets/school';
import type { CastMember } from '../../../src/engine/character/cast';
import { extraLook } from '../../../src/engine/character/extras';
import { direct, type Actor, type Director } from '../../../src/engine/timeline/direct';

/*
 * Episódio 1, "Não olhe pro céu", todo pelos olhos do Fernando. Roteiro de trabalho em
 * series/ceu-vermelho/roteiros/001-roteiro.md (as cenas abaixo têm os mesmos números); regras da história em
 * series/ceu-vermelho/biblia.md. Para mudar uma fala, mude o texto aqui e rode `npm run voz`.
 *
 * No meio da aula o céu fica vermelho. Quem olha fixo para ele entra em transe. As três turmas descem para o
 * porão; o pai do Fernando manda duas mensagens que não batem; o professor não deixa ninguém sair; Fernando,
 * Lucas e Maria armam um plano.
 */

// ---- Lugares ----

/** As três salas: carteiras em 4 fileiras (da frente para o fundo) por 4 colunas (da janela, ao norte, para o corredor), viradas para o quadro a oeste. */
const SALAS = { 1: 0, 2: 8, 3: 16 } as const;
type Sala = keyof typeof SALAS;
const desk = (sala: Sala, row: number, column: number): [number, number] => [SALAS[sala] + 3.2 + 1.15 * row, -7 + 1.3 + 1.45 * column];
const seat = (sala: Sala, row: number, column: number): [number, number] => [desk(sala, row, column)[0] + DESK_SEAT.back, desk(sala, row, column)[1]];
/** Ao lado da cadeira, no corredor entre colunas: onde o aluno fica de pé ao levantar. */
const aisle = (sala: Sala, row: number, column: number): [number, number] => [seat(sala, row, column)[0], seat(sala, row, column)[1] + 0.725];
/** Porta de cada sala, no corredor (parede sul da sala). */
const portaDa = (sala: Sala): [number, number] => [SALAS[sala] + 1.2, 0.6];

/** Para onde olha quem está na janela norte de uma sala: o céu. */
const ceuNorte = (x: number): [number, number, number] => [x, 14, -40];
/** Para onde olha quem está numa janela do corredor ou no pátio: o céu ao sul. */
const ceuSul = (x: number): [number, number, number] => [x, 14, 40];

const PORAO = -3;
const PORTA_PORAO: [number, number] = [23.25, 2.2];
/** O banco velho guardado no depósito, perto da porta (no cenário, id "banco"). */
const BANCO: [number, number] = [21.4, 2.6];
/** Para descer ao porão pela escada de dentro (e não pela de emergência, que só abre por dentro). */
const PELA_ESCADA: [number, number, number][] = [[23.2, 1.5, 0], [22.6, 2.2, PORAO]];

// ---- Elenco ----

type Lugar = [number, number];
const HERO: Lugar = [3, 1];
const LUCAS: Lugar = [3, 0];
const MARIA: Lugar = [2, 2];
const PEDRO: Lugar = [1, 0];
const ANA: Lugar = [2, 0];
const RAFA: Lugar = [0, 2];
// A carteira à frente do Fernando fica vazia, para ele enxergar o quadro.
const VAZIAS = ['2,1', '0,3'];

const sentado = (id: string, character: string, sala: Sala, [row, column]: Lugar, look?: CastMember['look']): CastMember => ({
  id, character, at: seat(sala, row, column), yaw: 90, seated: DESK_SEAT.height, look,
});

interface Aluno {
  id: string;
  sala: Sala;
  place: Lugar;
  look: CastMember['look'];
}

/** Os figurantes de uma sala: uma ficha só ("aluno"), com aparência sorteada. */
function turma(sala: Sala, ocupadas: string[], quantos: number, semente: number): Aluno[] {
  const out: Aluno[] = [];
  for (let row = 0; row < 4 && out.length < quantos; row++) {
    for (let column = 0; column < 4 && out.length < quantos; column++) {
      if (ocupadas.includes(`${row},${column}`)) continue;
      const n = out.length + 1;
      out.push({ id: `s${sala}-aluno-${n}`, sala, place: [row, column], look: { name: `Aluno ${n}`, ...extraLook(semente + n * 7) } });
    }
  }
  return out;
}

const sala3 = turma(3, [HERO, LUCAS, MARIA, PEDRO, ANA, RAFA].map(([r, c]) => `${r},${c}`).concat(VAZIAS), 9, 3);
const sala2 = turma(2, ['1,1', '3,3', '0,2', '2,0', '3,0'], 11, 101);
const sala1 = turma(1, ['0,0', '2,2', '3,1', '1,3', '3,3'], 11, 211);
// Em transe desde cedo, fora da sala do Fernando: uma aluna da sala 1 na janela do corredor e dois da sala 2 no pátio.
const transeCorredor = sala1[2];
const transePatio = [sala2[4], sala2[7]];

export default direct(
  {
    episode: 1,
    title: 'Não olhe pro céu',
    location: 'escola',
    cast: [
      sentado('heroi', 'heroi', 3, HERO),
      sentado('lucas', 'lucas', 3, LUCAS),
      sentado('maria', 'maria', 3, MARIA),
      sentado('pedro', 'aluno', 3, PEDRO, { name: 'Pedro', ...extraLook(41), hairStyle: 'fringe' }),
      sentado('ana', 'aluno', 3, ANA, { name: 'Ana', ...extraLook(57), hairStyle: 'ponytail', voice: { id: 'GDzHdQOi6jjf8zaXhCYD' } }),
      sentado('rafa', 'aluno', 3, RAFA, { name: 'Rafa', ...extraLook(63) }),
      { character: 'professor', at: [SALAS[3] + 0.62, -7 + 2.2], yaw: 90 },
      { character: 'professora', at: [SALAS[2] + 0.7, -7 + 2.6], yaw: -90 },
      { character: 'roberto', at: [SALAS[1] + 0.62, -7 + 2.4], yaw: 90 },
      ...[...sala3, ...sala2, ...sala1].map((a) => sentado(a.id, 'aluno', a.sala, a.place, a.look)),
    ],
    props: [
      { id: 'celular', asset: 'item.phone', pocketOf: 'heroi' },
    ],
    tail: 1,
  },
  (d) => {
    const heroi = d.actor('heroi');
    const lucas = d.actor('lucas');
    const maria = d.actor('maria');
    const pedro = d.actor('pedro');
    const ana = d.actor('ana');
    const rafa = d.actor('rafa');
    const professor = d.actor('professor');
    const professora = d.actor('professora');
    const roberto = d.actor('roberto');
    const celular = d.phone('celular');
    const a3 = sala3.map((a) => ({ ...a, actor: d.actor(a.id) }));
    const a2 = sala2.map((a) => ({ ...a, actor: d.actor(a.id) }));
    const a1 = sala1.map((a) => ({ ...a, actor: d.actor(a.id) }));

    // ---- Antes de tudo: a aula ----
    d.world.rule('ceu-vermelho', false);
    celular.setup({
      clock: '10:42',
      chats: [{
        id: 'pai',
        name: 'Pai',
        avatar: { color: '#3b6ea8' },
        // O pai escreve em minúsculas e chama de "filho". A primeira mensagem de hoje não é assim (ver a bíblia).
        history: [
          { from: 'them', text: 'chegou bem na escola filho?', time: '07:12', day: 'Ontem' },
          { from: 'me', text: 'cheguei sim', time: '07:15' },
          { from: 'them', image: {}, text: 'olha quem apareceu aqui em casa', time: '18:40' },
          { from: 'me', text: 'kkkk que fofo', time: '18:41' },
          { from: 'them', text: 'nao esquece o casaco filho', time: '06:50', day: 'Hoje' },
          { from: 'me', text: 'ta bom pai', time: '06:52' },
        ],
      }],
    });
    d.camera.fpv(heroi, { fov: 64, pitch: -7 });
    d.sound('burburinho-sala', { length: 46 });
    d.sound('zumbido-ceu', { length: 400, volume: 0.25, fade: 6 });
    professor.behave('write');
    professora.behave('write');
    roberto.behave('write');
    for (const a of [...a3, ...a2, ...a1]) a.actor.behave('attend', { object: a.sala === 3 ? 'professor' : a.sala === 2 ? 'professora' : 'roberto' });
    for (const x of [lucas, maria, pedro, ana, rafa]) x.behave('attend', { object: professor });
    // Conversa de fundo baixinha.
    a3[0].actor.behave('chat', { group: 'cochicho-1' });
    a3[1].actor.behave('chat', { group: 'cochicho-1' });
    heroi.lookAt(professor, { duration: 0 });

    // ======== 1. Abertura: a luz muda ========
    // O céu já está mudando no primeiro quadro.
    d.background(() => d.world.rule('ceu-vermelho', true, { duration: 5, ease: 'inOut' }));
    d.wait(0.6);
    // A turma inteira percebe e começa a cochichar, preocupada.
    for (const a of [...a3, ...a2, ...a1]) a.actor.behave('chat', { group: `s${a.sala}-${a.place[0]}`, mood: 'worried' });
    lucas.behave('idle', { mood: 'worried' });
    maria.behave('idle', { mood: 'worried' });
    heroi.lookAt(lucas, { duration: 0.5 });
    heroi.say('Mano... o céu ficou vermelho. Tu viu?', { to: lucas, tone: 'assustado', gesture: 0.3 });
    lucas.say('Pode crê, mano. Que bagulho bizarro... que que será que tá rolando?', { to: heroi });
    d.background(() => heroi.lookAt(maria, { duration: 0.5 }));
    maria.say('Olha... eu não tô gostando nada dessa situação, não.', { to: heroi, tone: 'preocupada' });

    // ======== 2. O primeiro em transe ========
    // Pedro e Ana vão até as janelas; Rafa para entre as fileiras. Ninguém mais olha para trás.
    const janelaA: [number, number] = [SALAS[3] + 2.2, -6.45];
    const janelaB: [number, number] = [SALAS[3] + 5.6, -6.45];
    const pedroNaJanela = d.background(() => {
      pedro.behave('none');
      pedro.standUp(aisle(3, ...PEDRO));
      pedro.walkTo(janelaA, { speed: 1 });
      pedro.turnTo(0);
      pedro.behave('trance', { point: ceuNorte(janelaA[0]) });
    });
    d.background(() => {
      d.wait(1.2);
      ana.behave('none');
      ana.standUp(aisle(3, ...ANA));
      ana.walkTo(janelaB, { speed: 0.9 });
      ana.turnTo(0);
      ana.behave('trance', { point: ceuNorte(janelaB[0]) });
    });
    d.background(() => {
      d.wait(2.4);
      rafa.behave('none');
      rafa.standUp(aisle(3, ...RAFA));
      rafa.turnTo(10);
      rafa.behave('trance', { point: ceuNorte(SALAS[3] + 3) });
    });
    // O professor larga o giz e se vira para a turma.
    professor.behave('none');
    professor.turnTo(-90);
    // Ele vê o Pedro levantar e não tira o olho dele.
    professor.behave('attend', { object: pedro, mood: 'worried' });
    d.background(() => heroi.lookAt(professor, { duration: 0.6 }));
    for (const a of a3) a.actor.behave('attend', { object: professor, mood: 'worried' });
    lucas.behave('attend', { object: professor, mood: 'worried' });
    maria.behave('attend', { object: professor, mood: 'worried' });
    professor.say('Atenção, alunos. Alguma coisa está acontecendo. Fiquem todos juntos e me obedeçam. Não saiam sozinhos.', { tone: 'firme' });
    d.waitFor(pedroNaJanela);
    d.wait(0.4);
    // Gancho: a voz que vem da janela.
    d.background(() => heroi.lookAt(pedro, { duration: 0.6 }));
    pedro.say('Ele tá olhando pra gente.', { tone: 'transe', gesture: 0 });
    d.wait(0.5);
    // Lucas vai até ele e toca no ombro.
    lucas.behave('none');
    lucas.standUp(aisle(3, ...LUCAS));
    lucas.walkTo([janelaA[0] + 0.55, janelaA[1] + 0.5], { speed: 1.5 });
    lucas.lookAt(pedro, { duration: 0.3 });
    d.together(
      () => lucas.pointAt([janelaA[0] + 0.15, 1.35, janelaA[1] + 0.1], { duration: 1.4 }),
      () => lucas.say('Pedro?', { to: pedro, gesture: 0 }),
    );
    d.wait(0.5);
    lucas.say('Pedro!', { to: pedro, tone: 'nervoso', gesture: 0 });
    d.wait(0.6);
    lucas.turnTo([seat(3, ...HERO)[0], seat(3, ...HERO)[1]]);
    d.background(() => heroi.lookAt(lucas, { duration: 0.4 }));
    lucas.say('Mano... ele nem pisca.', { to: heroi, tone: 'assustado' });
    lucas.behave('attend', { object: professor, mood: 'scared' });

    // ======== 3. O porão ========
    d.background(() => heroi.lookAt(professor, { duration: 0.5 }));
    professor.say('Ninguém chega perto das janelas!', { tone: 'grito' });
    professor.walkTo([janelaA[0] - 0.6, janelaA[1] + 0.6], { speed: 2.2 });
    professor.lookAt(pedro, { duration: 0.3 });
    professor.pointAt([janelaA[0] - 0.1, 1.3, janelaA[1] + 0.05], { duration: 1.2 });
    professor.turnTo([seat(3, ...HERO)[0], seat(3, ...HERO)[1]]);
    professor.lookAhead({ duration: 0.3 });
    professor.say('Acho melhor a gente se abrigar no porão. Vai ser mais seguro lá. Vamos, vamos!', { tone: 'nervoso' });

    // As outras duas turmas já estão descendo (a professora da sala 2 abre as portas e leva também a sala 1,
    // cujo professor está em transe). Saem uma depois da outra para não se cruzarem no corredor.
    descerTurmas(d, professora, roberto, a2, a1, d.now);

    // ======== 3b. A sala 3 sai ========
    // Fila: a turma primeiro; Fernando, Maria e Lucas por último, e ficam esperando no corredor.
    const lugarDe = new Map<string, Lugar>([...a3.map((a) => [a.id, a.place] as [string, Lugar]), ['heroi', HERO], ['maria', MARIA]]);
    const fila: Actor[] = [...a3.map((a) => a.actor), maria, heroi, lucas];
    const ateAPorta = (quem: Actor): number => {
      const at = quem === lucas ? [janelaA[0] + 0.55, janelaA[1] + 0.5] : aisle(3, ...lugarDe.get(quem.id)!);
      return at[0] - (SALAS[3] + 2.3) + Math.abs(at[1] + 0.4) + 1.4;
    };
    d.sound('corredor-passos', { length: 40, volume: 0.3 });
    const guia = d.background(() => {
      professor.walkTo(portaDa(3), { speed: 1.6 });
      professor.walkTo([SALAS[3] + 0.6, 1.4], { speed: 1.4 });
      professor.turnTo([SALAS[3] + 1.2, -1]);
      professor.behave('idle', { mood: 'worried' });
    });
    /** Onde cada um da sala 3 para no porão, e com quem conversa. */
    const destino3 = new Map<string, { ponto: [number, number]; centro: [number, number]; grupo: string }>();
    const centros3: [number, number][] = [[16.6, 1.7], [19.2, -5.2], [17.2, -5.3]];
    a3.forEach((a, i) => {
      const g = i % centros3.length;
      const ang = (i / a3.length) * Math.PI * 2;
      destino3.set(a.id, { ponto: [centros3[g][0] + Math.cos(ang) * 0.7, centros3[g][1] + Math.sin(ang) * 0.55], centro: centros3[g], grupo: `p3-${g}` });
    });
    let chegadaHeroi = d.now;
    const VEZ0 = d.now + 1.5;
    /** Onde o Fernando, Lucas e Maria param no corredor, esperando a fila andar. */
    const ESPERA: Record<string, [number, number]> = { heroi: [21.5, 1.3], maria: [22.3, 2.25], lucas: [22.5, 0.95] };
    fila.forEach((quem, ordem) => {
      const step = d.background(() => {
        const vez = VEZ0 + ordem * 1.0 + (ordem >= a3.length ? 1.5 : 0);
        d.wait(Math.max(0.2, vez - d.now - ateAPorta(quem) / 1.35));
        if (quem === heroi || quem === lucas || quem === maria) {
          if (quem !== heroi) quem.behave('none');
          if (quem !== lucas) quem.standUp(aisle(3, ...lugarDe.get(quem.id)!));
          if (quem === heroi) {
            // Antes de sair, um último olhar para o Pedro na janela.
            heroi.lookAt(pedro, { duration: 0.6 });
            d.wait(1.0);
            heroi.lookAhead({ duration: 0.4 });
          }
          quem.walkTo(ESPERA[quem.id], { speed: 1.35 });
          if (quem !== heroi) {
            quem.turnTo(ESPERA.heroi);
            quem.behave('idle', { mood: 'worried' });
          }
          return;
        }
        const destino = destino3.get(quem.id)!;
        quem.behave('none');
        quem.standUp(aisle(3, ...lugarDe.get(quem.id)!));
        quem.walkTo(destino.ponto, { speed: 1.35, elevation: PORAO, via: PELA_ESCADA });
        quem.turnTo(destino.centro);
        quem.behave('chat', { group: destino.grupo, mood: 'worried' });
      });
      if (quem === heroi) chegadaHeroi = step.end;
    });
    // Enquanto a fila anda: e os que estão na janela?
    d.wait(1.2);
    d.background(() => heroi.lookAt(maria, { duration: 0.5 }));
    maria.say('A gente vai deixar eles aí?', { to: professor, tone: 'preocupada' });
    d.background(() => heroi.lookAt(professor, { duration: 0.5 }));
    professor.say('Depois eu volto pra buscar eles. Anda, anda!', { tone: 'nervoso' });
    d.wait(1.2);
    // Saindo da sala, atrás deles, a voz da janela de novo.
    d.background(() => {
      d.waitFor(chegadaHeroi - 6);
      pedro.say('Ele tá vindo...', { tone: 'transe', gesture: 0 });
      d.wait(0.6);
      ana.say('Tá tão perto...', { tone: 'transe', gesture: 0 });
    });

    // ======== 4. O corredor ========
    d.waitFor(chegadaHeroi);
    // O professor Roberto, na janela do corredor, e a professora tentando chamar. Ele chegou de costas para eles.
    d.background(() => {
      heroi.turnTo([19.2, 2.4], { duration: 0.8 });
      heroi.lookAt(roberto, { duration: 0.5 });
    });
    d.wait(0.3);
    professora.say('Roberto?', { to: roberto, tone: 'preocupada', gesture: 0.4 });
    d.wait(0.2);
    professora.say('Roberto, me ajuda aqui!', { to: roberto, tone: 'nervoso' });
    roberto.say('Tá tão bonito...', { tone: 'transe', gesture: 0 });
    // Pela janela do corredor: dois alunos parados no pátio, olhando para cima.
    heroi.lookAt([16.4, 1.2, 8], { duration: 0.7 });
    d.wait(1.2);

    // Gancho: o celular vibra.
    d.sound('celular-vibra');
    celular.receive('Permaneça na escola. Fique escondido e não saia.', { time: '10:47' });
    heroi.lookAhead({ duration: 0.3 });
    lerCelular(d, heroi);
    d.wait(2.6);
    guardarCelular(d, heroi, lucas);
    heroi.say('Caralho... meu pai me mandou mensagem. Mandou eu ficar escondido na escola.', { to: lucas, tone: 'nervoso' });
    lucas.say('Mano, teu pai é polícia. Ele sabe o que tá falando.', { to: heroi });
    d.background(() => heroi.lookAt(maria, { duration: 0.5 }));
    maria.say('Olha, Fer... teu pai sabe do que ele tá falando. Melhor ficar por aqui.', { to: heroi, tone: 'preocupada' });

    // ======== 5. No porão ========
    // O professor manda o trio descer e vai atrás, fechando a porta.
    d.waitFor(guia);
    professor.behave('none');
    professor.walkTo([SALAS[3] + 3.4, 1.5], { speed: 1.6 });
    professor.lookAt(heroi, { duration: 0.3 });
    d.background(() => heroi.lookAt(professor, { duration: 0.4 }));
    professor.say('Vocês três, vamos!', { to: heroi, tone: 'nervoso' });
    professor.behave('idle', { mood: 'worried' });
    const AMIGOS: [number, number] = [20.3, 1.45];
    d.background(() => {
      maria.behave('none');
      maria.walkTo([AMIGOS[0] - 0.55, AMIGOS[1] + 0.6], { speed: 1.5, elevation: PORAO });
      maria.turnTo(AMIGOS);
      maria.behave('idle', { mood: 'worried' });
    });
    d.background(() => {
      d.wait(3.4);
      lucas.behave('none');
      d.together(
        () => lucas.walkTo([AMIGOS[0] - 0.75, AMIGOS[1] - 0.4], { speed: 1.5, elevation: PORAO }),
        // Descendo a escada, baixinho.
        () => {
          d.wait(3.5);
          lucas.say('Fer... e o Pedro? Ele vai ficar lá olhando pro céu até quando?', { tone: 'sussurro', gesture: 0 });
          d.wait(0.3);
          maria.say('Para, Lucas. Ninguém sabe.', { tone: 'sussurro', gesture: 0 });
          d.wait(0.4);
          lucas.say('E se ele não voltar mais?', { tone: 'sussurro', gesture: 0 });
        },
      );
      lucas.turnTo(AMIGOS);
      lucas.behave('idle', { mood: 'worried' });
    });
    const atras = d.background(() => {
      d.wait(3.6);
      professor.walkTo(PORTA_PORAO, { speed: 1.5, elevation: PORAO });
      professor.walkTo({ door: 'porta-deposito' });
      d.sound('porta-fecha');
      professor.close('porta-deposito');
      professor.walkTo([PORTA_PORAO[0] - 0.55, 2.2]);
      professor.turnTo([18, 1.5]);
    });
    d.wait(1.6);
    heroi.lookAhead({ duration: 0.4 });
    heroi.walkTo(AMIGOS, { speed: 1.5, elevation: PORAO });
    heroi.turnTo([PORTA_PORAO[0], 2.4]);
    d.sound('porao-ambiente', { length: 400, volume: 0.3, fade: 2 });
    d.background(() => heroi.lookAt(professor, { duration: 0.5 }));
    d.waitFor(atras);
    professor.say('Aqui ninguém vê o céu. A gente espera aqui.', { tone: 'cansado' });
    professor.behave('idle', { mood: 'worried' });

    // Gancho: o celular vibra de novo, várias vezes.
    d.wait(0.8);
    d.sound('celular-vibra');
    celular.receive('CADÊ VOCÊ', { time: '10:52' });
    lerCelular(d, heroi);
    for (const texto of ['VEM PRA DELEGACIA AGORA', 'NÃO ACREDITE EM NINGUÉM', 'ACIMA DE TUDO', 'NÃO OLHE PRO CÉU']) {
      d.wait(0.8);
      d.sound('notificacao');
      celular.receive(texto, { time: '10:52' });
    }
    d.wait(1.8);
    // Ele tenta responder, e a mensagem não sai.
    heroi.hand('type', { hand: 'right' });
    d.world.network(false);
    for (let i = 0; i < 6; i++) {
      d.sound('toque-tela', { volume: 0.25 });
      d.wait(0.22);
    }
    celular.send('pai vc mandou eu ficar na escola??', { time: '10:53' });
    d.sound('mensagem-erro');
    d.wait(1.8);
    heroi.hand('relaxed', { hand: 'right' });
    guardarCelular(d, heroi, lucas);

    // ======== 6. O confronto ========
    heroi.say('Véi, eu vou colar lá com meu pai mesmo. A delegacia é só três quilômetros daqui, dá pra ir correndo.', { to: lucas, tone: 'decidido' });
    d.background(() => heroi.lookAt(professor, { duration: 0.35 }));
    professor.say('Ninguém vai sair sozinho, não!', { to: heroi, tone: 'grito' });
    heroi.say('Mano, meu pai tá mandando eu ir embora, e ele é polícia. Cê tá me tirando? Quero ver quem vai me segurar aqui!', { to: professor, tone: 'bravo' });
    professor.walkTo(PORTA_PORAO, { speed: 1.6 });
    professor.turnTo([20, 1.5]);
    professor.express('angry', { amount: 0.6, duration: 0.4 });
    professor.say('Não vai passar ninguém dessa porta.', { to: heroi, tone: 'firme' });
    professor.behave('attend', { object: heroi, mood: 'worried' });

    // ======== 7. O plano ========
    // Longe dos grupinhos e do professor.
    const CANTO: [number, number] = [18.8, 0.95];
    d.together(
      () => {
        heroi.lookAhead({ duration: 0.3 });
        heroi.turnTo(CANTO);
        heroi.walkTo([CANTO[0] + 0.45, CANTO[1]], { speed: 1.2 });
        heroi.turnTo([CANTO[0] - 0.5, CANTO[1] + 0.1]);
      },
      () => {
        lucas.behave('none');
        lucas.walkTo([CANTO[0] - 0.35, CANTO[1] - 0.45], { speed: 1.2 });
        lucas.turnTo([CANTO[0] + 0.4, CANTO[1]]);
      },
      () => {
        maria.behave('none');
        maria.walkTo([CANTO[0] - 0.3, CANTO[1] + 0.55], { speed: 1.2 });
        maria.turnTo([CANTO[0] + 0.4, CANTO[1]]);
      },
    );
    lucas.behave('idle', { mood: 'worried' });
    maria.behave('idle', { mood: 'worried' });
    heroi.lookAt(lucas, { duration: 0.4 });
    heroi.say('Mano, preciso dar o fora daqui. Meu pai tá me procurando.', { to: lucas, tone: 'sussurro', gesture: 0.3 });
    lucas.say('Cara, eu não sairia, não... mas você que sabe. Eu te ajudo.', { to: heroi, tone: 'sussurro', gesture: 0.3 });
    d.background(() => heroi.lookAt(maria, { duration: 0.4 }));
    maria.say('Fer, não. Lá fora tá todo mundo olhando pro céu. E se você olhar também?', { to: heroi, tone: 'sussurro', gesture: 0.3 });
    heroi.say('Eu não vou olhar.', { to: maria, tone: 'sussurro', gesture: 0 });
    d.background(() => heroi.lookAt(lucas, { duration: 0.4 }));
    lucas.say('Então senta ali perto da porta, de boa. A gente chama ele lá no fundo.', { to: heroi, tone: 'sussurro', gesture: 0.3 });

    // ======== 8. A execução e o fim ========
    d.background(() => {
      d.together(
        () => lucas.walkTo([12.5, 1.9], { speed: 1.3 }),
        () => maria.walkTo([12.2, 1.1], { speed: 1.3 }),
      );
      maria.turnTo([20, 1.8]);
      lucas.turnTo([20, 1.8]);
    });
    heroi.lookAhead({ duration: 0.4 });
    heroi.walkTo([BANCO[0] + 0.5, BANCO[1] - 0.65], { speed: 1.0 });
    heroi.sit('banco', 'right');
    heroi.lookAt(professor, { duration: 0.5 });
    d.wait(0.6);
    d.background(() => heroi.lookAt([13, PORAO + 1.4, 1.5], { duration: 0.6 }));
    maria.say('Professor! Vem cá, rápido!', { tone: 'grito' });
    // O professor olha para o Fernando; Fernando abaixa os olhos.
    professor.behave('none');
    professor.lookAt(heroi, { duration: 0.3 });
    d.background(() => heroi.lookAt([BANCO[0] + 1.4, PORAO + 0.2, BANCO[1] - 2.2], { duration: 0.4 }));
    d.wait(0.9);
    professor.lookAt(maria, { duration: 0.3 });
    // Ele sai da frente da porta.
    // Ele passa longe do banco onde o Fernando está.
    const vai = d.background(() => {
      professor.walkTo([14.5, 1.6], { speed: 1.6, via: [[21.6, 0.7]] });
      professor.behave('attend', { object: maria, mood: 'worried' });
    });
    d.wait(1.4);
    d.background(() => heroi.lookAt([PORTA_PORAO[0] + 0.75, PORAO + 1.1, PORTA_PORAO[1]], { duration: 0.9 }));
    d.wait(1.2);
    d.waitFor(Math.min(vai.end, d.now + 0.4));
    d.sound('tensao-fim');
    d.background(() => {
      d.wait(0.6);
      d.narrate('E aí? Você ficava na escola... ou ia atrás do seu pai? Comenta aí. E marca aquele amigo que ia ser o seu Lucas.');
    });
    d.endCard({
      title: 'Você ficava ou ia atrás do seu pai?',
      options: [{ label: 'FICO', icon: '🏫', color: '#3d9bff' }, { label: 'VOU', icon: '🏃', color: '#ff6b3d' }],
      cta: 'Comenta FICO ou VOU 👇 e marca o amigo que ia te ajudar a fugir',
    }, { duration: 10 });
  },
);

/** Pega o celular do bolso e traz para perto dos olhos, com zoom para dar para ler. */
function lerCelular(d: Director, heroi: Actor): void {
  heroi.pickUp('celular');
  d.together(
    () => heroi.raise(),
    () => heroi.lookAt('celular', { duration: 0.6 }),
  );
  d.camera.moveTo({ fov: 64, pitch: -7 });
  d.wait(0.7);
  // Olhando o celular, a câmera aponta para o meio da tela.
  d.camera.moveTo({ fov: 38, pitch: 0 });
}

/** Abaixa e guarda o celular, voltando o olhar para alguém. */
function guardarCelular(d: Director, heroi: Actor, para: Actor): void {
  d.camera.moveTo({ fov: 38, pitch: 0 });
  d.together(
    () => heroi.lower(),
    () => heroi.lookAt(para, { duration: 0.6 }),
  );
  d.camera.moveTo({ fov: 64, pitch: -7 });
  heroi.putAway('celular');
}

/**
 * As salas 2 e 1 descem antes da sala 3: a professora vai na frente abrindo as portas, a sala 2 sai em fila, depois
 * a sala 1 (sem o professor Roberto, que fica em transe na janela do corredor). No caminho, uma aluna da sala 1
 * para na janela do corredor e dois da sala 2 saem para o pátio, todos em transe.
 */
function descerTurmas(d: Director, professora: Actor, roberto: Actor, a2: (Aluno & { actor: Actor })[], a1: (Aluno & { actor: Actor })[], antes: number): void {
  const inicio = Math.max(3, antes - 50);
  d.background(() => {
    d.at(inicio);
    // Roberto já saiu da sala e está parado na janela do corredor, perto da escada.
    roberto.behave('none');
    roberto.walkTo([19.6, 2.55], { speed: 1.1 });
    roberto.turnTo(180);
    roberto.behave('trance', { point: ceuSul(19.6) });
  });
  let abriu = 0;
  d.background(() => {
    d.at(inicio + 2);
    professora.behave('none');
    professora.walkTo(portaDa(2), { speed: 1.5 });
    professora.walkTo({ door: 'porta-escadaria' }, { speed: 1.6 });
    professora.open('porta-escadaria');
    professora.walkTo({ door: 'porta-deposito' }, { speed: 1.6, elevation: PORAO });
    abriu = professora.open('porta-deposito').end;
    // Volta ao corredor para chamar o Roberto.
    professora.walkTo([18.4, 1.9], { speed: 1.6, elevation: 0 });
    professora.turnTo([19.6, 2.55]);
    professora.behave('attend', { object: roberto, mood: 'worried' });
  });
  // Os pontos de cada grupo no porão: a sala 2 mais a oeste, a sala 1 no meio.
  const centros: [number, number][] = [[3.2, 1.9], [6, 1.6], [3, -5.4], [6, -5.4], [9, 1.6], [12, 1.7], [11.5, -5.4], [14.5, -5.5]];
  let k = 0;
  const descer = (alunos: (Aluno & { actor: Actor })[], primeiro: number, fora: Aluno[]) => {
    alunos.forEach((a, i) => {
      d.background(() => {
        const vez = primeiro + i * 1.2;
        const [ax, az] = aisle(a.sala, ...a.place);
        d.at(Math.max(0.5, vez - (ax - (SALAS[a.sala] + 2.3) + Math.abs(az) + 1.4) / 1.35));
        a.actor.behave('none');
        a.actor.standUp([ax, az]);
        if (fora.includes(a)) {
          // Em transe: um na janela do corredor, dois no pátio.
          const corredor = a.sala === 1;
          const ponto: [number, number] = corredor ? [4.4, 2.55] : i % 2 ? [15.4, 8.6] : [17.2, 7.2];
          a.actor.walkTo(ponto, { speed: 0.9 });
          a.actor.turnTo(corredor ? 180 : 170);
          a.actor.behave('trance', { point: ceuSul(ponto[0]) });
          return;
        }
        const centro = centros[Math.floor(k / 3) % centros.length];
        const ang = (k % 3) * 2.1 + 0.4;
        k++;
        a.actor.walkTo([centro[0] + Math.cos(ang) * 0.65, centro[1] + Math.sin(ang) * 0.5], { speed: 1.35, elevation: PORAO, via: PELA_ESCADA });
        a.actor.turnTo(centro);
        a.actor.behave('chat', { group: `p-${centro.join(',')}`, mood: 'worried' });
      });
    });
  };
  // Cada um chega à porta da sala na sua vez; o primeiro chega à porta do porão logo depois de ela abrir
  // (da porta da sala 2 até lá são uns 22 m).
  const primeiro = abriu - 22 / 1.35 + 1;
  descer(a2, primeiro, transePatio);
  descer(a1, primeiro + a2.length * 1.2 + 2, [transeCorredor]);
}
