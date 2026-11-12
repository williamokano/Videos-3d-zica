import { registerAction, type WalkPath } from './catalog';

const RUN_FROM = 3;

/** Shortest way to turn from one heading to another, in degrees. */
function turn(from: number, to: number): number {
  return from + ((((to - from) % 360) + 540) % 360) - 180;
}

/** Heading that looks along (dx, dz): 0 faces north, 90 west. */
const heading = (dx: number, dz: number): number => (Math.atan2(-dx, -dz) * 180) / Math.PI;

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
    to: { type: 'point2', description: 'destino [x, z] em coordenadas do local', required: true },
    elevation: { type: 'number', description: 'altura do piso de destino, se for em outro nível' },
    speed: { type: 'number', description: 'velocidade em m/s quando não há "duration" (padrão 1.4)' },
  },
  duration: 2,
  compile(ctx) {
    if (!ctx.services.findPath) ctx.fail('este local não tem mapa de caminhada.');
    const from: [number, number, number] = [ctx.current('x'), ctx.current('y'), ctx.current('z')];
    const to = ctx.params.to as [number, number];
    const path = ctx.services.findPath!(from, to, (ctx.params.elevation as number | undefined) ?? from[1]);
    if (!path) ctx.fail(`não há caminho a pé de [${from[0]}, ${from[2]}] até [${to}]. Confira se os dois pontos estão em piso livre e o nível de destino.`);
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
      return sum / 9;
    });

    const stride0 = ctx.current('stride');
    const cycle = (ctx.target.traits.strideLength ?? 1.5) * (speed >= RUN_FROM ? 1.75 : 1);
    const along = (index: number) => sampler(route, route.points.map((p) => p[index]));
    const [x, y, z, yaw] = [along(0), along(1), along(2), sampler(route, yaws)];
    return {
      duration: route.length / speed,
      writes: [
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
