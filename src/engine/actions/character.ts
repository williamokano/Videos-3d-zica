import { HAND_POSE_NAMES, VISEME_NAMES, mouthOpenOf, visemeTrack } from '../character/motion';
import { VOICE_FILTERS, takeVisemes, type Take } from '../audio/voice';
import { BEHAVIOURS, MOODS, type Mood } from './ambient';
import { registerAction, type WalkPath } from './catalog';
import { BODY, outAndBack, reachBody, type Point3 } from './hands';

const RUN_FROM = 3;

/** Shortest way to turn from one heading to another, in degrees. */
function turn(from: number, to: number): number {
  return from + ((((to - from) % 360) + 540) % 360) - 180;
}

/** Heading that looks along (dx, dz): 0 faces north, 90 west. */
const heading = (dx: number, dz: number): number => (Math.atan2(-dx, -dz) * 180) / Math.PI;

/** One walk through several stops: the path to each, end to end. Null if any stretch has no way. */
function joinPaths(find: NonNullable<import('./catalog').ActionServices['findPath']>, from: [number, number, number], stops: ([number, number] | [number, number, number])[]): WalkPath | null {
  const out: WalkPath = { points: [from], distances: [0], length: 0, doors: [] };
  let at = from;
  for (const stop of stops) {
    const part = find(at, [stop[0], stop[1]], stop[2] ?? at[1]);
    if (!part) return null;
    for (const door of part.doors) out.doors.push({ id: door.id, distance: out.length + door.distance });
    part.points.forEach((p, i) => {
      if (i === 0) return;
      out.points.push(p);
      out.distances.push(out.length + part.distances[i]);
    });
    out.length += part.length;
    at = out.points[out.points.length - 1];
  }
  return out;
}

function sampler(path: WalkPath, values: number[]): (distance: number) => number {
  return (distance) => {
    const d = Math.max(0, Math.min(path.length, distance));
    let i = 1;
    while (i < path.distances.length - 1 && path.distances[i] < d) i++;
    const span = path.distances[i] - path.distances[i - 1];
    const u = span > 0 ? (d - path.distances[i - 1]) / span : 1;
    return values[i - 1] + (values[i] - values[i - 1]) * u;
  };
}

registerAction({
  id: 'walkTo',
  description: 'O personagem vai a pé até um ponto, desviando de paredes e usando portas e escadas. Corre a partir de 3 m/s.',
  appliesTo: ['character'],
  params: {
    to: { type: 'point2', description: 'destino [x, z] em coordenadas do local' },
    door: { type: 'string', description: 'em vez de "to": id de uma porta; o personagem para diante dela, do lado em que está, ao alcance da maçaneta' },
    elevation: { type: 'number', description: 'altura do piso de destino, se for em outro nível' },
    speed: { type: 'number', description: 'velocidade em m/s quando não há "duration" (padrão 1.4)' },
    via: { type: 'points', description: 'pontos [x, z] (ou [x, z, nível]) por onde passar no caminho, sem parar, ex.: para descer pela escada certa' },
  },
  duration: 2,
  compile(ctx) {
    if (!ctx.services.findPath) ctx.fail('este local não tem mapa de caminhada.');
    if (ctx.linkOf(ctx.target.id)) ctx.fail(`o personagem está sentado em "${ctx.linkOf(ctx.target.id)!.to}"; use standUp antes.`);
    if (ctx.current('sit') > 0.5) ctx.fail('o personagem está sentado; use standUp antes.');
    const from: [number, number, number] = [ctx.current('x'), ctx.current('y'), ctx.current('z')];
    const doorId = ctx.params.door as string | undefined;
    if ((doorId === undefined) === (ctx.params.to === undefined)) ctx.fail('informe "to" ou "door", um dos dois.');
    let to = ctx.params.to as [number, number];
    /** Heading to end with, when stopping at a door. */
    let facing: number | undefined;
    const level = (ctx.params.elevation as number | undefined) ?? from[1];
    const via = (ctx.params.via as ([number, number] | [number, number, number])[] | undefined) ?? [];
    let path = doorId ? null : via.length ? joinPaths(ctx.services.findPath!, from, [...via, [to[0], to[1], level]]) : ctx.services.findPath!(from, to, level);
    if (doorId) {
      const door = ctx.object(doorId).traits.door ?? ctx.fail(`"${doorId}" não é uma porta.`);
      const kind = ctx.object(doorId).traits.doorKind;
      const swingsIn = ctx.object(doorId).traits.opensFrom !== 'inside';
      const lateral = [door.handle[0] - door.center[0], door.handle[2] - door.center[2]];
      const span = Math.hypot(lateral[0], lateral[1]) || 1;
      const standing = (side: number): [number, number] => {
        const out = [door.inside[0] * side, door.inside[1] * side];
        // A swing door comes toward whoever is on the side it opens to: wait beside the handle, out of its way.
        const inTheWay = kind === 'swing' && (side > 0) === swingsIn;
        const shift = inTheWay ? 0.35 : kind === 'rollup' ? 0 : -0.12;
        return [door.handle[0] + (lateral[0] / span) * shift + out[0] * 0.5, door.handle[2] + (lateral[1] / span) * shift + out[1] * 0.5];
      };
      // The side to stop on is the one reached without going through the door itself.
      const near = Math.sign((from[0] - door.center[0]) * door.inside[0] + (from[2] - door.center[2]) * door.inside[1]) || 1;
      for (const side of [near, -near]) {
        const spot = standing(side);
        const way = ctx.services.findPath!(from, spot, (ctx.params.elevation as number | undefined) ?? door.center[1]);
        if (!way || way.doors.some((d) => d.id === doorId)) continue;
        if (!path || way.length < path.length) {
          path = way;
          to = spot;
        }
      }
      if (!path) ctx.fail(`não há caminho a pé até a porta "${doorId}" sem passar por ela.`);
      facing = heading(door.handle[0] - to[0], door.handle[2] - to[1]);
    }
    if (!path) ctx.fail(`não há caminho a pé de [${from[0]}, ${from[2]}] até [${to}] no nível ${level}. Confira se os dois pontos estão em piso livre e o nível de destino.`);
    const route = path!;
    if (route.length < 0.05) ctx.fail('o personagem já está nesse ponto.');
    const speed = (ctx.params.speed as number | undefined) ?? 1.4;
    if (speed <= 0) ctx.fail('"speed" precisa ser maior que zero.');

    // Heading at each point, turning smoothly into corners instead of snapping.
    const yaw0 = ctx.current('yaw');
    const raw: number[] = [];
    route.points.forEach((p, i) => {
      const [a, b] = i < route.points.length - 1 ? [p, route.points[i + 1]] : [route.points[i - 1], p];
      raw.push(turn(raw[i - 1] ?? yaw0, heading(b[0] - a[0], b[2] - a[2])));
    });
    const yaws = raw.map((_, i) => {
      let sum = 0;
      for (let k = i - 4; k <= i + 4; k++) sum += k < 0 ? yaw0 : raw[Math.min(k, raw.length - 1)];
      const yaw = sum / 9;
      if (facing === undefined) return yaw;
      // Over the last steps, turn to face the door.
      const left = route.length - route.distances[i];
      return yaw + (turn(yaw, facing) - yaw) * Math.max(0, 1 - left / 0.6);
    });

    const stride0 = ctx.current('stride');
    const cycle = (ctx.target.traits.strideLength ?? 1.5) * (speed >= RUN_FROM ? 1.75 : 1);
    const along = (index: number) => sampler(route, route.points.map((p) => p[index]));
    const [x, y, z, yaw] = [along(0), along(1), along(2), sampler(route, yaws)];
    // The head leads into a turn: it looks where the path goes about two steps ahead (people turn the head
    // 0.2 to 0.6 s before the body, up to about 25°), easing in and out with the walk.
    const LOOK_AHEAD = 1.6;
    const lead = (s: number): number => {
      const ahead = Math.max(-25, Math.min(25, turn(yaw(s), yaw(Math.min(route.length, s + LOOK_AHEAD))) - yaw(s)));
      return ahead * Math.max(0, Math.min(1, s / 0.5, (route.length - s) / 0.8));
    };
    return {
      duration: route.length / speed,
      writes: [
        { channel: 'lead', at: (u) => lead(u * route.length) },
        { channel: 'x', at: (u) => x(u * route.length) },
        { channel: 'y', at: (u) => y(u * route.length) },
        { channel: 'z', at: (u) => z(u * route.length) },
        { channel: 'yaw', at: (u) => yaw(u * route.length) },
        { channel: 'stride', at: (u) => stride0 + (u * route.length) / cycle },
        // Ease into and out of the walk over the first and last steps.
        { channel: 'gait', at: (u) => (speed >= RUN_FROM ? 2 : 1) * Math.max(0, Math.min(1, (u * route.length) / 0.4, ((1 - u) * route.length) / 0.4)) },
      ],
      validate(check) {
        for (const door of route.doors) {
          const time = check.timeAt(door.distance / route.length);
          const needed = check.target(door.id)?.traits.passableAt ?? 0.5;
          if (check.valueAt(door.id, 'open', time) < needed) {
            check.fail(`a porta "${door.id}" está fechada quando o personagem chega nela, aos ${time.toFixed(1)}s. Abra a porta antes.`);
          }
        }
      },
    };
  },
});

registerAction({
  id: 'turnTo',
  description: 'O personagem vira o corpo para um ponto ou para uma direção.',
  appliesTo: ['character'],
  params: {
    to: { type: 'point2', description: 'ponto [x, z] para onde olhar' },
    yaw: { type: 'number', description: 'direção em graus: 0 norte, 90 oeste' },
  },
  duration: 0.4,
  compile(ctx) {
    const to = ctx.params.to as [number, number] | undefined;
    const yaw = ctx.params.yaw as number | undefined;
    if ((to === undefined) === (yaw === undefined)) ctx.fail('informe "to" ou "yaw", um dos dois.');
    const wanted = to ? heading(to[0] - ctx.current('x'), to[1] - ctx.current('z')) : yaw!;
    return { writes: [{ channel: 'yaw', to: turn(ctx.current('yaw'), wanted) }] };
  },
});

registerAction({
  id: 'express',
  description: 'Muda a expressão do rosto do personagem. "neutral" volta ao rosto normal.',
  appliesTo: ['character'],
  params: {
    expression: { type: 'string', description: 'nome da expressão: neutral, happy, sad, angry, surprised, scared', required: true },
    amount: { type: 'number', description: 'intensidade de 0 a 1 (padrão 1)' },
  },
  duration: 0.3,
  compile(ctx) {
    const names = ctx.target.traits.expressions ?? [];
    const wanted = ctx.params.expression as string;
    if (wanted !== 'neutral' && !names.includes(wanted)) ctx.fail(`expressão desconhecida "${wanted}". Existem: neutral, ${names.join(', ')}.`);
    const amount = (ctx.params.amount as number | undefined) ?? 1;
    return { writes: names.map((name) => ({ channel: `expr.${name}`, to: name === wanted ? amount : 0 })) };
  },
});

registerAction({
  id: 'lookAt',
  description: 'O personagem vira a cabeça para um objeto (e continua acompanhando se ele se mexer) ou para um ponto. Sem parâmetros, volta a olhar para a frente.',
  appliesTo: ['character'],
  params: {
    object: { type: 'string', description: 'id do que olhar: outro personagem, um item, o carro, uma porta' },
    point: { type: 'point3', description: 'ponto [x, y, z] em coordenadas do local' },
  },
  duration: 0.4,
  compile(ctx) {
    const object = ctx.params.object as string | undefined;
    const point = ctx.params.point as [number, number, number] | undefined;
    if (object !== undefined && point !== undefined) ctx.fail('informe "object" ou "point", não os dois.');
    if (object === ctx.target.id) ctx.fail('o personagem não pode olhar para si mesmo.');
    if (object !== undefined) ctx.object(object);
    return { writes: [], gaze: { at: object ?? point ?? null } };
  },
});

registerAction({
  id: 'sit',
  description: 'O personagem senta num assento de um objeto (ex.: banco de um carro) e passa a ir junto com ele.',
  appliesTo: ['character'],
  params: {
    on: { type: 'string', description: 'id do objeto que tem o assento, ex.: o carro', required: true },
    seat: { type: 'string', description: 'nome do assento: driver, passenger, rearLeft, rearRight (padrão driver)' },
  },
  duration: 1,
  compile(ctx) {
    const on = ctx.params.on as string;
    const seats = ctx.object(on).traits.sockets ?? {};
    const asked = (ctx.params.seat as string | undefined) ?? 'driver';
    const socket = asked in seats ? asked : `seat.${asked}`;
    if (!(socket in seats)) ctx.fail(`"${on}" não tem o assento "${asked}". Assentos: ${Object.keys(seats).map((n) => n.replace(/^seat\./, '')).join(', ') || 'nenhum'}.`);
    if (ctx.linkOf(ctx.target.id)) ctx.fail(`o personagem já está sentado em "${ctx.linkOf(ctx.target.id)!.to}".`);
    const me = ctx.placeOf(ctx.target.id).pos;
    const base = ctx.placeOf(on).pos;
    const far = Math.hypot(me[0] - base[0], me[2] - base[2]);
    if (far > 2.5) ctx.fail(`"${on}" está a ${far.toFixed(1)} m; leve o personagem até lá antes, com walkTo.`);
    return {
      writes: [{ channel: 'attached', to: 1 }, { channel: 'sit', at: (u) => Math.max(0, (u - 0.3) / 0.7) }],
      attach: { to: on, socket, weight: 'attached' },
    };
  },
});

registerAction({
  id: 'standUp',
  description: 'O personagem levanta de onde está sentado e fica de pé num ponto ao lado.',
  appliesTo: ['character'],
  params: {
    to: { type: 'point2', description: 'onde ele fica de pé, [x, z] em coordenadas do local', required: true },
    yaw: { type: 'number', description: 'direção em que fica olhando (padrão: a de quem sai do assento)' },
  },
  duration: 1,
  compile(ctx) {
    const link = ctx.linkOf(ctx.target.id);
    if (!link) {
      // On a plain seat (a chair): get up and step to the point.
      if (ctx.current('sit') < 0.5) ctx.fail('o personagem não está sentado.');
      const [x, z] = ctx.params.to as [number, number];
      const far = Math.hypot(x - ctx.current('x'), z - ctx.current('z'));
      if (far > 1.5) ctx.fail(`o ponto fica a ${far.toFixed(1)} m da cadeira; escolha um ao lado e depois use walkTo.`);
      const facing = turn(ctx.current('yaw'), (ctx.params.yaw as number | undefined) ?? heading(x - ctx.current('x'), z - ctx.current('z')));
      return {
        writes: [
          { channel: 'x', to: x }, { channel: 'z', to: z }, { channel: 'y', to: ctx.current('y') - ctx.current('seat') },
          { channel: 'yaw', to: facing },
          { channel: 'sit', at: (u: number) => 1 - Math.min(1, u / 0.6) },
          { channel: 'seat', at: () => 0 },
        ],
      };
    }
    const seat = ctx.placeOf(ctx.target.id);
    const to = ctx.params.to as [number, number];
    const far = Math.hypot(to[0] - seat.pos[0], to[1] - seat.pos[2]);
    if (far > 2.5) ctx.fail(`o ponto fica a ${far.toFixed(1)} m do assento; escolha um ao lado e depois use walkTo.`);
    const yaw = turn(seat.yaw, (ctx.params.yaw as number | undefined) ?? heading(to[0] - seat.pos[0], to[1] - seat.pos[2]));
    const constant = (channel: string, value: number) => ({ channel, at: () => value });
    return {
      writes: [
        constant('x', to[0]), constant('z', to[1]), constant('y', ctx.placeOf(link.to).pos[1]), constant('yaw', yaw),
        { channel: 'attached', to: 0 },
        { channel: 'sit', at: (u: number) => 1 - Math.min(1, u / 0.7) },
      ],
      detach: {},
    };
  },
});

registerAction({
  id: 'raise',
  description: 'O personagem levanta o que tem na mão até a frente do rosto (para ler um celular) ou do peito, e fica assim até um "lower".',
  appliesTo: ['character'],
  params: {
    to: { type: 'string', description: '"eyes" (padrão) ou "chest"' },
    hand: { type: 'string', description: '"left" ou "right" (padrão: a mão que segura algo)' },
  },
  duration: 0.6,
  compile(ctx) {
    const to = (ctx.params.to as string | undefined) ?? 'eyes';
    if (to !== 'eyes' && to !== 'chest') ctx.fail('"to" precisa ser "eyes" ou "chest".');
    const asked = ctx.params.hand as string | undefined;
    if (asked !== undefined && asked !== 'left' && asked !== 'right') ctx.fail('"hand" precisa ser "left" ou "right".');
    const me = ctx.target.id;
    const side = asked ? (asked === 'left' ? 'L' : 'R') : ctx.riderOn(me, 'handR') || !ctx.riderOn(me, 'handL') ? 'R' : 'L';
    return { writes: reachBody(me, side, BODY[to as 'eyes' | 'chest'](side), 1) };
  },
});

registerAction({
  id: 'lower',
  description: 'O personagem abaixa a mão que tinha levantado com "raise".',
  appliesTo: ['character'],
  params: {},
  duration: 0.5,
  compile(ctx) {
    const sides = (['L', 'R'] as const).filter((s) => ctx.current(`reach${s}`) > 0.01);
    if (!sides.length) ctx.fail('o personagem não está com a mão levantada.');
    return { writes: sides.map((s) => ({ channel: `reach${s}`, to: 0 })) };
  },
});

registerAction({
  id: 'say',
  description: 'O personagem fala: a boca faz as formas das letras do texto e as mãos acompanham. A fala fica registrada no episódio (legenda agora, voz depois). Sem "duration", dura conforme o tamanho do texto.',
  appliesTo: ['character'],
  params: {
    text: { type: 'string', description: 'o que ele diz', required: true },
    to: { type: 'string', description: 'id de com quem fala; ele olha para essa pessoa' },
    tone: { type: 'string', description: 'tom da voz: sussurro, nervoso, grito, transe... (não aparece na legenda)' },
    take: { type: 'data', description: 'a gravação da fala (posta pelo roteiro): duração e tempos de cada letra' },
    filter: { type: 'string', description: `por onde a voz chega: ${Object.entries(VOICE_FILTERS).map(([k, v]) => `"${k}" (${v.description})`).join('; ')}` },
    gesture: { type: 'number', description: 'quanto as mãos acompanham, 0 a 1 (padrão 1)' },
  },
  duration: 1,
  compile(ctx) {
    const text = ctx.params.text as string;
    const to = ctx.params.to as string | undefined;
    const take = ctx.params.take as Take | undefined;
    if (to !== undefined) ctx.object(to);
    const gesture = (ctx.params.gesture as number | undefined) ?? 1;
    voiceFilterOk(ctx.params.filter as string | undefined, ctx.fail);
    const { duration, shapes } = lineMouth(text, take);
    return {
      duration,
      // The mouth follows the voice (or the letters, at an even pace), not the easing.
      writes: [
        ...VISEME_NAMES.map((name) => ({ channel: `vis.${name}`, at: (u: number) => shapes(u)[name] })),
        // For faces with a single control for the mouth.
        { channel: 'talk', at: (u: number) => mouthOpenOf(shapes(u)) },
        ...(gesture > 0 ? [{ channel: 'gesture', at: (u: number) => gesture * Math.min(1, u * 4, (1 - u) * 4) }] : []),
      ],
      events: [{ type: 'line', data: { text, duration, take: take?.key } }],
      gaze: to === undefined ? undefined : { at: to, fade: 0.4 },
    };
  },
});

/** Fail on a voice filter that does not exist. */
export function voiceFilterOk(filter: string | undefined, fail: (message: string) => never): void {
  if (filter !== undefined && !(filter in VOICE_FILTERS)) fail(`filtro de voz desconhecido "${filter}". Existem: ${Object.keys(VOICE_FILTERS).join(', ')}.`);
}

/** Length of a line and its mouth shapes by progress (0 to 1): from its take if there is one, else from the letters. */
export function lineMouth(text: string, take?: Take): { duration: number; shapes: (u: number) => Record<string, number> } {
  if (take) {
    const timed = takeVisemes(take);
    return { duration: take.duration, shapes: (u) => timed(u * take.duration) };
  }
  return { duration: Math.max(1, 0.5 + text.length * 0.065), shapes: visemeTrack(text) };
}

registerAction({
  id: 'behave',
  description: `O que o personagem faz sozinho daqui em diante, para figurantes e para quem espera a sua vez. Modos: ${Object.entries(BEHAVIOURS).map(([k, v]) => `"${k}" (${v})`).join('; ')}.`,
  appliesTo: ['character'],
  params: {
    mode: { type: 'string', description: `um de: ${Object.keys(BEHAVIOURS).join(', ')}`, required: true },
    group: { type: 'string', description: 'chat: nome do grupo de conversa' },
    object: { type: 'string', description: 'attend: id do que ele acompanha com os olhos' },
    point: { type: 'point3', description: 'watch, trance: ponto [x, y, z] para onde olha' },
    mood: { type: 'string', description: `humor: ${Object.entries(MOODS).map(([k, v]) => `"${k}" (${v})`).join('; ')}` },
  },
  duration: 0,
  compile(ctx) {
    const mode = ctx.params.mode as string;
    if (!(mode in BEHAVIOURS)) ctx.fail(`modo desconhecido "${mode}". Existem: ${Object.keys(BEHAVIOURS).join(', ')}.`);
    const { group, object, point, mood } = ctx.params as { group?: string; object?: string; point?: [number, number, number]; mood?: Mood };
    if (mood !== undefined && !(mood in MOODS)) ctx.fail(`humor desconhecido "${mood}". Existem: ${Object.keys(MOODS).join(', ')}.`);
    if (mode === 'chat' && !group) ctx.fail('"chat" precisa de "group".');
    if (mode === 'attend' && !object) ctx.fail('"attend" precisa de "object".');
    if ((mode === 'watch' || mode === 'trance') && !point) ctx.fail(`"${mode}" precisa de "point".`);
    if (object !== undefined) ctx.object(object);
    return { writes: [], behaviour: { mode, group, object, point, mood } };
  },
});

registerAction({
  id: 'pointAt',
  description: 'O personagem aponta para um objeto ou um ponto: estende o braço com o indicador esticado, olha para lá, e recolhe o braço no fim. Com "duration" maior, fica apontando mais tempo.',
  appliesTo: ['character'],
  params: {
    object: { type: 'string', description: 'id do que apontar: outro personagem, um item, o carro, uma porta' },
    point: { type: 'point3', description: 'ponto [x, y, z] em coordenadas do local' },
    hand: { type: 'string', description: '"left" ou "right" (padrão: a mão livre do lado do alvo)' },
  },
  duration: 1.6,
  compile(ctx) {
    const object = ctx.params.object as string | undefined;
    const given = ctx.params.point as Point3 | undefined;
    if ((object === undefined) === (given === undefined)) ctx.fail('informe "object" ou "point", um dos dois.');
    const me = ctx.target.id;
    if (object === me) ctx.fail('o personagem não pode apontar para si mesmo.');
    const asked = ctx.params.hand as string | undefined;
    if (asked !== undefined && asked !== 'left' && asked !== 'right') ctx.fail('"hand" precisa ser "left" ou "right".');
    let target = given!;
    if (object !== undefined) {
      // The middle of a thing, the face of a person, the handle of a door.
      const traits = ctx.object(object).traits;
      const [x, y, z] = ctx.placeOf(object).pos;
      target = traits.door?.handle ?? [x, y + (traits.eyeHeight ?? (traits.size ? traits.size[1] / 2 : 0.8)), z];
    }
    const place = ctx.placeOf(me);
    const scale = ctx.target.traits.bodyScale ?? 1;
    const yaw = (place.yaw * Math.PI) / 180;
    const [dx, dy, dz] = [target[0] - place.pos[0], target[1] - place.pos[1], target[2] - place.pos[2]].map((v) => v / scale);
    // In the character's own frame: x to its right, -z ahead, in meters of the standard body.
    const local: Point3 = [dx * Math.cos(yaw) - dz * Math.sin(yaw), dy, dx * Math.sin(yaw) + dz * Math.cos(yaw)];
    const free = (side: 'L' | 'R'): boolean => !ctx.riderOn(me, `hand${side}`) && ctx.current(`reach${side}`) < 0.01;
    const wanted: 'L' | 'R' = asked ? (asked === 'left' ? 'L' : 'R') : local[0] >= 0 ? 'R' : 'L';
    const side = free(wanted) ? wanted : asked ? undefined : free(wanted === 'R' ? 'L' : 'R') ? (wanted === 'R' ? 'L' : 'R') : undefined;
    if (!side) ctx.fail(asked ? 'a mão pedida está ocupada.' : 'o personagem está com as duas mãos ocupadas.');
    const shoulder: Point3 = [side === 'R' ? 0.19 : -0.19, 1.36, 0];
    const to = [local[0] - shoulder[0], local[1] - shoulder[1], local[2] - shoulder[2]];
    const far = Math.hypot(...to);
    if (far < 0.3) ctx.fail('o alvo está perto demais para apontar.');
    if (to[2] / far > 0.35) ctx.fail('o alvo está atrás do personagem; vire-o antes, com turnTo.');
    // An arm does not point straight up or down.
    const flat = Math.hypot(to[0], to[2]);
    const rise = Math.max(-0.9, Math.min(0.9, Math.atan2(to[1], flat)));
    const reach = 0.47;
    const tip: Point3 = [
      shoulder[0] + (to[0] / flat) * Math.cos(rise) * reach,
      shoulder[1] + Math.sin(rise) * reach,
      shoulder[2] + (to[2] / flat) * Math.cos(rise) * reach,
    ];
    const amount = outAndBack(0.25, 0.8);
    return {
      writes: [...reachBody(me, side!, tip, amount), { channel: `hand${side}.point`, at: amount }],
      gaze: { at: object ?? given!, fade: 0.4 },
    };
  },
});

registerAction({
  id: 'hand',
  description: `O personagem põe as mãos numa pose e fica assim até outra: ${HAND_POSE_NAMES.join(', ')}, ou "relaxed" para soltar. Segurar algo e gesticular ao falar já mudam a mão sozinhos.`,
  appliesTo: ['character'],
  params: {
    pose: { type: 'string', description: `uma de: relaxed, ${HAND_POSE_NAMES.join(', ')}`, required: true },
    hand: { type: 'string', description: '"left", "right" ou "both" (padrão)' },
  },
  duration: 0.25,
  compile(ctx) {
    const pose = ctx.params.pose as string;
    if (pose !== 'relaxed' && !HAND_POSE_NAMES.includes(pose)) ctx.fail(`pose de mão desconhecida "${pose}". Existem: relaxed, ${HAND_POSE_NAMES.join(', ')}.`);
    const which = (ctx.params.hand as string | undefined) ?? 'both';
    if (!['left', 'right', 'both'].includes(which)) ctx.fail('"hand" precisa ser "left", "right" ou "both".');
    const sides = (['L', 'R'] as const).filter((side) => which === 'both' || (which === 'left') === (side === 'L'));
    return { writes: sides.flatMap((side) => HAND_POSE_NAMES.map((name) => ({ channel: `hand${side}.${name}`, to: name === pose ? 1 : 0 }))) };
  },
});
