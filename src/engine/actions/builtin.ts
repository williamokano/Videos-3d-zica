import { registerAction, type ActionContext } from './catalog';

/** Channel that holds how open something is: the object itself, or one named part of it (a car door). */
function openChannel(ctx: ActionContext): string {
  const part = ctx.params.part as string | undefined;
  if (!part && !('open' in ctx.target.channels)) {
    const parts = Object.keys(ctx.target.channels).filter((c) => c.endsWith('.open')).map((c) => c.slice(0, -5));
    ctx.fail(`informe "part" para dizer qual parte abrir. Partes: ${parts.join(', ') || 'nenhuma'}.`);
  }
  return part ? `${part}.open` : 'open';
}

registerAction({
  id: 'open',
  description: 'Abre uma porta (de abrir, de correr ou de enrolar) ou uma parte de um veículo.',
  appliesTo: ['door', 'vehicle'],
  params: {
    part: { type: 'string', description: 'parte do objeto, ex.: "frontLeft" num carro' },
    amount: { type: 'number', description: 'quanto abrir, de 0 a 1 (padrão 1)' },
    from: { type: 'string', description: 'lado de quem abre: "inside" ou "outside"; obrigatório em porta que só abre por um lado' },
  },
  duration: 0.8,
  compile(ctx) {
    const from = ctx.params.from as string | undefined;
    if (from !== undefined && from !== 'inside' && from !== 'outside') ctx.fail('"from" precisa ser "inside" ou "outside".');
    const side = ctx.target.traits.opensFrom;
    if (side && side !== 'both') {
      const name = side === 'inside' ? 'por dentro' : 'por fora';
      if (!from) ctx.fail(`esta porta só abre ${name}; informe "from" com o lado de quem abre.`);
      if (from !== side) ctx.fail(`esta porta só abre ${name}.`);
    }
    const amount = (ctx.params.amount as number | undefined) ?? 1;
    if (amount < 0 || amount > 1) ctx.fail('"amount" vai de 0 a 1.');
    return { writes: [{ channel: openChannel(ctx), to: amount }] };
  },
});

registerAction({
  id: 'close',
  description: 'Fecha uma porta ou uma parte de um veículo. Numa porta de enrolar, ela desce de cima para baixo.',
  appliesTo: ['door', 'vehicle'],
  params: { part: { type: 'string', description: 'parte do objeto, ex.: "frontLeft" num carro' } },
  duration: 0.8,
  compile: (ctx) => ({ writes: [{ channel: openChannel(ctx), to: 0 }] }),
});

registerAction({
  id: 'set',
  description: 'Leva qualquer canal de um objeto a um valor. Use quando nenhuma ação específica serve.',
  appliesTo: ['*'],
  params: {
    channel: { type: 'string', description: 'nome do canal', required: true },
    value: { type: 'number', description: 'valor final', required: true },
  },
  duration: 0.5,
  compile: (ctx) => ({ writes: [{ channel: ctx.params.channel as string, to: ctx.params.value as number }] }),
});

registerAction({
  id: 'moveTo',
  description: 'Desliza um objeto com id em linha reta até um ponto do local.',
  appliesTo: ['prop', 'item', 'vehicle'],
  params: {
    to: { type: 'point2', description: 'destino [x, z] em coordenadas do local', required: true },
    y: { type: 'number', description: 'altura final' },
    yaw: { type: 'number', description: 'rotação final em graus' },
  },
  duration: 1,
  compile(ctx) {
    const [x, z] = ctx.params.to as [number, number];
    const writes = [{ channel: 'x', to: x }, { channel: 'z', to: z }];
    if (ctx.params.y !== undefined) writes.push({ channel: 'y', to: ctx.params.y as number });
    if (ctx.params.yaw !== undefined) writes.push({ channel: 'yaw', to: ctx.params.yaw as number });
    return { writes };
  },
});

/** Smooth curve through the points (Catmull-Rom), sampled by distance travelled. `before` is a point behind the first one. */
function curve(points: [number, number][], before: [number, number]): { length: number; at(distance: number): [number, number] } {
  const samples: [number, number][] = [points[0]];
  const last = points.length - 1;
  // Past either end, keep going straight: `before` gives the direction of departure.
  const p = (i: number): [number, number] =>
    i < 0 ? before : i > last ? [2 * points[last][0] - points[last - 1][0], 2 * points[last][1] - points[last - 1][1]] : points[i];
  for (let i = 0; i < points.length - 1; i++) {
    for (let step = 1; step <= 16; step++) {
      const u = step / 16;
      const point = [0, 1].map((k) => {
        const [a, b, c, d] = [p(i - 1)[k], p(i)[k], p(i + 1)[k], p(i + 2)[k]];
        return 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
      });
      samples.push(point as [number, number]);
    }
  }
  const lengths = [0];
  for (let i = 1; i < samples.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
  }
  const length = lengths[lengths.length - 1];
  return {
    length,
    at(distance) {
      const d = Math.max(0, Math.min(length, distance));
      let i = 1;
      while (i < lengths.length - 1 && lengths[i] < d) i++;
      const span = lengths[i] - lengths[i - 1];
      const u = span > 0 ? (d - lengths[i - 1]) / span : 0;
      return [samples[i - 1][0] + (samples[i][0] - samples[i - 1][0]) * u, samples[i - 1][1] + (samples[i][1] - samples[i - 1][1]) * u];
    },
  };
}

registerAction({
  id: 'drive',
  description: 'Anda com um veículo por um caminho, saindo de onde ele está. As rodas giram e ele vira junto com a curva.',
  appliesTo: ['vehicle'],
  params: {
    path: { type: 'path', description: 'pontos [x, z] por onde passar, em coordenadas do local', required: true },
    speed: { type: 'number', description: 'velocidade média em m/s quando não há "duration" (padrão 6)' },
    reverse: { type: 'boolean', description: 'anda de ré' },
  },
  duration: 2,
  compile(ctx) {
    const start: [number, number] = [ctx.current('x'), ctx.current('z')];
    const path = ctx.params.path as [number, number][];
    const reverse = ctx.params.reverse === true;
    const travel = ctx.current('travel');
    const yaw0 = ctx.current('yaw');
    // Leave along the way the vehicle is pointing, so it does not snap sideways on the first frame.
    const reach = Math.hypot(path[0][0] - start[0], path[0][1] - start[1]) * (reverse ? -1 : 1);
    const rad = (yaw0 * Math.PI) / 180;
    const route = curve([start, ...path], [start[0] + Math.sin(rad) * reach, start[1] + Math.cos(rad) * reach]);
    if (route.length < 0.01) ctx.fail('o caminho não sai do lugar.');
    const speed = (ctx.params.speed as number | undefined) ?? 6;
    if (speed <= 0) ctx.fail('"speed" precisa ser maior que zero.');
    const yaw = (u: number): number => {
      const d = u * route.length;
      const [ax, az] = route.at(d - 0.25);
      const [bx, bz] = route.at(d + 0.25);
      // Heading 0 faces north (-z) and grows counter-clockwise, like a prop's `rot`.
      const heading = (Math.atan2(-(bx - ax), -(bz - az)) * 180) / Math.PI + (reverse ? 180 : 0);
      // Take the shortest turn from where the vehicle was pointing.
      return yaw0 + ((((heading - yaw0) % 360) + 540) % 360) - 180;
    };
    return {
      duration: route.length / speed,
      writes: [
        { channel: 'x', at: (u) => route.at(u * route.length)[0] },
        { channel: 'z', at: (u) => route.at(u * route.length)[1] },
        { channel: 'yaw', at: yaw },
        { channel: 'travel', at: (u) => travel + (reverse ? -1 : 1) * u * route.length },
      ],
    };
  },
});

function carry(ctx: ActionContext, point: [number, number, number], held: number) {
  if (!ctx.target.traits.pickable) ctx.fail('o objeto não é pegável; marque o prop com "pickable": true.');
  const [x, y, z] = point;
  return { writes: [{ channel: 'x', to: x }, { channel: 'y', to: y }, { channel: 'z', to: z }, { channel: 'held', to: held }] };
}

registerAction({
  id: 'pickUp',
  description: 'Pega um item: ele sai de onde está e vai até o ponto onde fica seguro. Com personagens, esse ponto passa a ser a mão.',
  appliesTo: ['item'],
  params: { to: { type: 'point3', description: 'onde o item fica seguro, [x, y, z] em coordenadas do local', required: true } },
  duration: 0.6,
  compile: (ctx) => carry(ctx, ctx.params.to as [number, number, number], 1),
});

registerAction({
  id: 'putDown',
  description: 'Larga um item num ponto do local.',
  appliesTo: ['item'],
  params: { at: { type: 'point3', description: 'onde o item fica, [x, y, z] em coordenadas do local', required: true } },
  duration: 0.6,
  compile: (ctx) => carry(ctx, ctx.params.at as [number, number, number], 0),
});
