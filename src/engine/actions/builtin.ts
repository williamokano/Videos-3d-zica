import { registerAction, type ActionContext, type ActionResult, type ChannelWrite } from './catalog';
import { BODY, actor, freeHand, outAndBack, ramp, reach, reachBody, type Point3 } from './hands';

/** Channel that holds how open something is: the object itself, or one named part of it (a car door). */
function openChannel(ctx: ActionContext): string {
  const part = ctx.params.part as string | undefined;
  if (!part && !('open' in ctx.target.channels)) {
    const parts = Object.keys(ctx.target.channels).filter((c) => c.endsWith('.open')).map((c) => c.slice(0, -5));
    ctx.fail(`informe "part" para dizer qual parte abrir. Partes: ${parts.join(', ') || 'nenhuma'}.`);
  }
  return part ? `${part}.open` : 'open';
}

const BY = { type: 'string', description: 'personagem que faz isso com a mão; ele precisa estar ao alcance' } as const;
const HAND = { type: 'string', description: 'com "by": "left" ou "right" (padrão: a direita, se estiver livre)' } as const;

/**
 * A character moving a door or a car door by hand: the hand goes to the handle, then the leaf moves.
 * On a door with a known handle, `from` comes from the side the character is on.
 */
function byHand(ctx: ActionContext, channel: string, to: number): ActionResult {
  const by = ctx.params.by as string;
  const who = actor(ctx, by);
  const place = ctx.placeOf(by);
  const door = ctx.target.traits.door;
  let point: Point3;
  if (door) {
    const side = Math.sign((place.pos[0] - door.center[0]) * door.inside[0] + (place.pos[2] - door.center[2]) * door.inside[1]) || 1;
    point = [door.handle[0] + door.inside[0] * side * 0.08, door.handle[1], door.handle[2] + door.inside[1] * side * 0.08];
  } else {
    // No handle known: the hand goes out in front of the body.
    const a = (place.yaw * Math.PI) / 180;
    const scale = who.traits.bodyScale ?? 1;
    point = [place.pos[0] - Math.sin(a) * 0.5 * scale, place.pos[1] + 0.95 * scale, place.pos[2] - Math.cos(a) * 0.5 * scale];
  }
  const from = ctx.current(channel);
  const hand = reach(ctx, by, freeHand(ctx, by), point, outAndBack(0.3, 0.6), door ? `a maçaneta de "${ctx.target.id}"` : `"${ctx.target.id}"`);
  // Standing where the leaf is about to pass, the character steps out of its way first.
  const aside = ctx.linkOf(by) ? undefined : outOfTheWay(ctx, ctx.params.part as string | undefined, from, to, place.pos);
  if (!aside) return { writes: [{ channel, at: (u) => from + (to - from) * ramp(u, 0.3, 1) }, ...hand], duration: 1.2 };
  const far = Math.hypot(aside[0] - place.pos[0], aside[1] - place.pos[2]);
  const stride = ctx.current('stride', by);
  const step = (u: number): number => ramp(u, 0, 0.4);
  return {
    duration: 1.7,
    writes: [
      { target: by, channel: 'x', at: (u) => place.pos[0] + (aside[0] - place.pos[0]) * step(u) },
      { target: by, channel: 'z', at: (u) => place.pos[2] + (aside[1] - place.pos[2]) * step(u) },
      { target: by, channel: 'stride', at: (u) => stride + (far / (who.traits.strideLength ?? 1.5)) * step(u) },
      { target: by, channel: 'gait', at: (u) => Math.max(0, Math.min(1, u / 0.08, (0.4 - u) / 0.08)) },
      { channel, at: (u) => from + (to - from) * ramp(u, 0.45, 1) },
      ...hand,
    ],
  };
}

/** How wide a person is, for a door not to touch them. */
const BODY_RADIUS = 0.28;

/**
 * Where a character at `pos` has to go so that a hinged part does not pass through them while it moves from
 * `from` to `to` open: straight away from the hinge, to just past the end of the leaf. Undefined when the part
 * is not hinged or the character is already clear of it.
 */
function outOfTheWay(ctx: ActionContext, part: string | undefined, from: number, to: number, pos: Point3): [number, number] | undefined {
  const hinged = part ? ctx.target.traits.parts?.[part] : undefined;
  if (!hinged) return undefined;
  const base = ctx.placeOf(ctx.target.id);
  const a = (base.yaw * Math.PI) / 180;
  const [dx, dz] = [pos[0] - base.pos[0], pos[2] - base.pos[2]];
  // In the object's own frame, from the hinge.
  const rel = [dx * Math.cos(a) - dz * Math.sin(a) - hinged.hinge[0], dx * Math.sin(a) + dz * Math.cos(a) - hinged.hinge[1]];
  const r = Math.hypot(rel[0], rel[1]);
  if (r > hinged.length + BODY_RADIUS) return undefined;
  // Angle from the closed leaf (+z) out to the side the part swings to.
  const at = Math.atan2(hinged.side * rel[0], rel[1]);
  const margin = Math.asin(Math.min(1, BODY_RADIUS / Math.max(r, BODY_RADIUS)));
  const [low, high] = [Math.min(from, to) * hinged.angle - margin, Math.max(from, to) * hinged.angle + margin];
  if (at < low || at > high) return undefined;
  // Never back into the body of the car: at least a little out to the side.
  const out = Math.max(at, 0.35);
  const far = hinged.length + BODY_RADIUS + 0.12;
  const [x, z] = [hinged.hinge[0] + hinged.side * Math.sin(out) * far, hinged.hinge[1] + Math.cos(out) * far];
  return [base.pos[0] + x * Math.cos(a) + z * Math.sin(a), base.pos[2] - x * Math.sin(a) + z * Math.cos(a)];
}

/** Side of a door a character stands on. */
function sideOf(ctx: ActionContext, by: string): 'inside' | 'outside' | undefined {
  const door = ctx.target.traits.door;
  if (!door) return undefined;
  const { pos } = ctx.placeOf(by);
  return (pos[0] - door.center[0]) * door.inside[0] + (pos[2] - door.center[2]) * door.inside[1] > 0 ? 'inside' : 'outside';
}

registerAction({
  id: 'open',
  description: 'Abre uma porta (de abrir, de correr ou de enrolar) ou uma parte de um veículo. Com "by", o personagem abre com a mão.',
  appliesTo: ['door', 'vehicle'],
  params: {
    part: { type: 'string', description: 'parte do objeto, ex.: "frontLeft" num carro' },
    amount: { type: 'number', description: 'quanto abrir, de 0 a 1 (padrão 1)' },
    from: { type: 'string', description: 'lado de quem abre: "inside" ou "outside"; obrigatório em porta que só abre por um lado, a não ser que haja "by"' },
    by: BY,
    hand: HAND,
  },
  duration: 0.8,
  compile(ctx) {
    const by = ctx.params.by as string | undefined;
    const from = (ctx.params.from as string | undefined) ?? (by ? sideOf(ctx, by) : undefined);
    if (from !== undefined && from !== 'inside' && from !== 'outside') ctx.fail('"from" precisa ser "inside" ou "outside".');
    const side = ctx.target.traits.opensFrom;
    if (side && side !== 'both') {
      const name = side === 'inside' ? 'por dentro' : 'por fora';
      if (!from) ctx.fail(`esta porta só abre ${name}; informe "from" com o lado de quem abre.`);
      if (from !== side) ctx.fail(by ? `esta porta só abre ${name}, e "${by}" está do outro lado.` : `esta porta só abre ${name}.`);
    }
    const amount = (ctx.params.amount as number | undefined) ?? 1;
    if (amount < 0 || amount > 1) ctx.fail('"amount" vai de 0 a 1.');
    return by ? byHand(ctx, openChannel(ctx), amount) : { writes: [{ channel: openChannel(ctx), to: amount }] };
  },
});

registerAction({
  id: 'close',
  description: 'Fecha uma porta ou uma parte de um veículo. Numa porta de enrolar, ela desce de cima para baixo. Com "by", o personagem fecha com a mão.',
  appliesTo: ['door', 'vehicle'],
  params: { part: { type: 'string', description: 'parte do objeto, ex.: "frontLeft" num carro' }, by: BY, hand: HAND },
  duration: 0.8,
  compile: (ctx) => (ctx.params.by ? byHand(ctx, openChannel(ctx), 0) : { writes: [{ channel: openChannel(ctx), to: 0 }] }),
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
  appliesTo: ['prop', 'item', 'phone', 'vehicle'],
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

/** Middle of an item sitting at `base`: where a hand grabs it. */
const middle = (ctx: ActionContext, base: Point3): Point3 => [base[0], base[1] + (ctx.target.traits.size?.[1] ?? 0) / 2, base[2]];

registerAction({
  id: 'pickUp',
  description: 'Pega um item. Com "by", o personagem estende a mão (e se agacha, se preciso), pega e fica segurando; sem "by", o item vai até o ponto "to".',
  appliesTo: ['item', 'phone'],
  params: {
    by: { type: 'string', description: 'personagem que pega; ele precisa estar a um braço do item' },
    hand: HAND,
    to: { type: 'point3', description: 'sem "by": onde o item fica seguro, [x, y, z] em coordenadas do local' },
  },
  duration: 0.6,
  compile(ctx) {
    const by = ctx.params.by as string | undefined;
    const to = ctx.params.to as Point3 | undefined;
    if ((by === undefined) === (to === undefined)) ctx.fail('informe "by" (quem pega) ou "to" (para onde o item vai), um dos dois.');
    if (!by) return carry(ctx, to!, 1);
    if (!ctx.target.traits.pickable) ctx.fail('o objeto não é pegável; marque o prop com "pickable": true.');
    const link = ctx.linkOf(ctx.target.id);
    if (link?.socket.startsWith('hand')) ctx.fail(`o item já está com "${link.to}".`);
    const side = freeHand(ctx, by);
    if (link?.socket === 'pocket') {
      // Out of the pocket: the hand goes to the hip and comes back holding it.
      if (link.to !== by) ctx.fail(`o item está no bolso de "${link.to}"; só ele pode tirar.`);
      actor(ctx, by);
      return {
        duration: 0.9,
        writes: [
          ...reachBody(by, side, BODY.pocket(side), outAndBack(0.45, 0.55)),
          { target: by, channel: `carry${side}`, at: (u) => ramp(u, 0.5, 1) },
          { channel: 'held', at: () => 1 },
        ],
        detach: { at: 0.5 },
        attach: { to: by, socket: `hand${side}`, weight: 'held', at: 0.5 },
      };
    }
    const base = ctx.placeOf(ctx.target.id).pos;
    const constant = (channel: string, value: number): ChannelWrite => ({ channel, at: () => value });
    return {
      duration: 1.2,
      writes: [
        ...reach(ctx, by, side, middle(ctx, base), outAndBack(0.45, 0.55), `"${ctx.target.id}"`),
        { target: by, channel: `carry${side}`, at: (u) => ramp(u, 0.5, 1) },
        { channel: 'held', at: (u) => ramp(u, 0.4, 0.5) },
        // Taken from a seat or a shelf of another object: from now on the item is where it was picked up.
        ...(link ? [constant('x', base[0]), constant('y', base[1]), constant('z', base[2])] : []),
      ],
      detach: { at: 'start' },
      attach: { to: by, socket: `hand${side}`, weight: 'held' },
    };
  },
});

registerAction({
  id: 'putDown',
  description: 'Larga um item num ponto do local. Se um personagem o segura, é ele quem põe o item lá.',
  appliesTo: ['item', 'phone'],
  params: {
    at: { type: 'point3', description: 'onde o item fica, [x, y, z] em coordenadas do local' },
    on: { type: 'string', description: 'em vez de "at": id de um objeto com assentos (ex.: o carro); o item fica nele e vai junto' },
    seat: { type: 'string', description: 'com "on": nome do assento, ex.: rearLeft' },
  },
  duration: 0.6,
  compile(ctx) {
    const on = ctx.params.on as string | undefined;
    if ((on === undefined) === (ctx.params.at === undefined)) ctx.fail('informe "at" ou "on", um dos dois.');
    let at = ctx.params.at as Point3;
    let socket = '';
    if (on) {
      const seats = ctx.object(on).traits.sockets ?? {};
      const asked = ctx.params.seat as string | undefined;
      socket = asked && asked in seats ? asked : `seat.${asked}`;
      if (!(socket in seats)) ctx.fail(`informe "seat" com um assento de "${on}": ${Object.keys(seats).map((n) => n.replace(/^seat\./, '')).join(', ') || 'nenhum'}.`);
      const base = ctx.placeOf(on);
      const a = (base.yaw * Math.PI) / 180;
      const [x, y, z] = seats[socket];
      at = [base.pos[0] + x * Math.cos(a) + z * Math.sin(a), base.pos[1] + y, base.pos[2] - x * Math.sin(a) + z * Math.cos(a)];
    }
    const constant = (channel: string, value: number): ChannelWrite => ({ channel, at: () => value });
    const link = ctx.linkOf(ctx.target.id);
    const hand = link?.socket.match(/^hand([LR])$/)?.[1] as 'L' | 'R' | undefined;
    const result: ActionResult = !link || !hand
      ? carry(ctx, at, 0)
      : {
          duration: 1.2,
          writes: [
            ...reach(ctx, link.to, hand, middle(ctx, at), outAndBack(0.45, 0.55), `o ponto onde largar "${ctx.target.id}"`),
            { target: link.to, channel: `carry${hand}`, at: (u) => 1 - ramp(u, 0, 0.5) },
            constant('x', at[0]), constant('y', at[1]), constant('z', at[2]),
            { channel: 'held', at: (u) => 1 - ramp(u, 0.5, 0.6) },
          ],
          detach: {},
        };
    return on ? { ...result, attach: { to: on, socket, at: 'end' } } : result;
  },
});

registerAction({
  id: 'putAway',
  description: 'Quem segura o item guarda no bolso. Ele some até ser tirado de novo com pickUp.',
  appliesTo: ['item', 'phone'],
  params: {},
  duration: 0.9,
  compile(ctx) {
    const link = ctx.linkOf(ctx.target.id);
    const hand = link?.socket.match(/^hand([LR])$/)?.[1] as 'L' | 'R' | undefined;
    if (!link || !hand) ctx.fail('ninguém está segurando o item.');
    const by = link!.to;
    if (ctx.current(`reach${hand}`, by) > 0.01) ctx.fail(`a mão de "${by}" está levantada; use "lower" antes de guardar.`);
    return {
      writes: [
        ...reachBody(by, hand!, BODY.pocket(hand!), outAndBack(0.45, 0.55)),
        { target: by, channel: `carry${hand}`, at: (u) => 1 - ramp(u, 0, 0.5) },
      ],
      detach: { at: 0.5 },
      attach: { to: by, socket: 'pocket', at: 0.5 },
    };
  },
});
