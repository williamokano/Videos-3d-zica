import { registerAction, type ActionContext, type ChannelWrite } from './catalog';
import { actor, freeHand, ramp, reach, type Point3 } from './hands';

/**
 * Gear that goes on and comes off a body: dressing someone with a helmet or a coat of armour (`don`), taking it off
 * over the head with both hands (`doff`), and drawing a sword from somebody's sheath (`draw`). The worn piece is a
 * piece of the character's `wear` (hidden in the file until it is put on); the item is the same thing in the hand.
 * While it is worn, the item rides in the wearer's pocket, out of sight.
 */

/** Unit vectors a character faces and has to its right, at a heading (0 north, 90 west), as [x, z]. */
const axes = (yaw: number): { ahead: [number, number]; right: [number, number] } => {
  const a = (yaw * Math.PI) / 180;
  return { ahead: [-Math.sin(a), -Math.cos(a)], right: [Math.cos(a), -Math.sin(a)] };
};

/**
 * Pieces put on someone else without passing them over the head, and how high the hand takes them, in meters of
 * the standard body: a cloak is laid over the shoulders, a sash is wrapped round the waist.
 */
const LAID_ON: Record<string, number> = { cloak: 1.52, sash: 1.0 };

/** Pieces worn on the body, not on the head: they go on and come off over the head down to the chest. */
const ON_THE_CHEST = new Set(['scaleArmor', 'vest', 'cloak', 'tunic', 'robe']);

const placeOfWear = (ctx: ActionContext, wear: string): 'head' | 'chest' => {
  const asked = ctx.params.place as string | undefined;
  if (asked !== undefined && asked !== 'head' && asked !== 'chest') ctx.fail('"place" precisa ser "head" ou "chest".');
  return (asked as 'head' | 'chest' | undefined) ?? (ON_THE_CHEST.has(wear) ? 'chest' : 'head');
};

/** A path through points over the clip's progress: `keys` are [u, point], the hand easing from one to the next. */
const along = (keys: [number, Point3][], i: 0 | 1 | 2) => (u: number): number => {
  if (u <= keys[0][0]) return keys[0][1][i];
  for (let k = 1; k < keys.length; k++) {
    const [u1, p1] = keys[k];
    const [u0, p0] = keys[k - 1];
    if (u <= u1) return p0[i] + (p1[i] - p0[i]) * ramp(u, u0, u1);
  }
  return keys[keys.length - 1][1][i];
};

/** The worn piece's channel on a character, failing clearly when the file does not have it. */
function wearChannel(ctx: ActionContext, who: string, wear: string): string {
  const channel = `wear.${wear}`;
  if (!(channel in ctx.object(who).channels)) ctx.fail(`"${who}" não tem a peça "${wear}" na ficha; ponha em "wear" (com "hidden": true se começa sem ela).`);
  return channel;
}

registerAction({
  id: 'don',
  description: 'Quem segura o item (um capacete, uma couraça) veste alguém com ele. Em outra pessoa: a mão leva o item por cima da cabeça dela e desce; o manto (cloak) ela põe sobre os ombros, e a faixa (sash) na cintura. Em si mesmo ("on" é quem segura, na mão direita, com a esquerda livre): as duas mãos levam o item por cima da cabeça e o descem até a cabeça ou o peito, o contrário de um "doff". O item some da mão e a peça "wear" aparece no corpo (a peça precisa estar na ficha, escondida). Depois, o item fica com quem vestiu, guardado, para um "doff".',
  appliesTo: ['item'],
  params: {
    on: { type: 'string', description: 'quem é vestido', required: true },
    wear: { type: 'string', description: 'a peça de roupa que aparece nele (ex.: bronzeHelmet, scaleArmor)', required: true },
    place: { type: 'string', description: '"head" ou "chest": até onde a mão desce (padrão: chest para couraça, manto e colete; head para o resto)' },
  },
  duration: 1.6,
  compile(ctx) {
    const link = ctx.linkOf(ctx.target.id);
    const side = link?.socket.match(/^hand([LR])$/)?.[1] as 'L' | 'R' | undefined;
    if (!link || !side) ctx.fail('ninguém está segurando o item; use pickUp com "by" antes.');
    const by = link!.to;
    const on = ctx.params.on as string;
    if (on === by) return donSelf(ctx, by, side!);
    const who = actor(ctx, on);
    const wear = ctx.params.wear as string;
    const channel = wearChannel(ctx, on, wear);
    const place = ctx.placeOf(on);
    const scale = who.traits.bodyScale ?? 1;
    const top = place.pos[1] + (who.traits.eyeHeight ?? 1.6 * scale) + 0.17 * scale;
    const low = placeOfWear(ctx, wear) === 'chest' ? place.pos[1] + 1.25 * scale : top;
    // A cloak is laid on the shoulders, a sash wrapped round the waist: the hand goes only to them.
    const laid = ctx.params.place === undefined ? LAID_ON[wear] : undefined;
    const over: Point3 = [place.pos[0], laid !== undefined ? place.pos[1] + laid * scale : top + 0.22 * scale, place.pos[2]];
    const DOWN = 0.68;
    // Read now: inside `at` it would be read while the frames are drawn, when this very clip has already put it on.
    const was = ctx.current(channel, on);
    const amount = (u: number): number => Math.min(ramp(u, 0, 0.3), 1 - ramp(u, 0.8, 1));
    const height = (u: number): number => (laid !== undefined ? over[1] : over[1] + (low - over[1]) * ramp(u, 0.35, DOWN));
    const writes = reach(ctx, by, side!, over, amount, `a cabeça de "${on}"`).map((w): ChannelWrite => (w.channel === `reach${side}.y` ? { ...w, at: height } : w));
    return {
      writes: [
        ...writes,
        { target: by, channel: `carry${side}`, at: (u) => 1 - ramp(u, DOWN, DOWN + 0.08) },
        { target: on, channel, at: (u) => (u < DOWN ? was : 1) },
        { channel: 'held', at: (u) => (u < DOWN ? 1 : 0) },
      ],
      detach: { at: DOWN },
      attach: { to: on, socket: 'pocket', at: DOWN },
    };
  },
});

/** Putting on what one holds: the reverse of a "doff", from the hand in front of the chest up over the head and down. */
function donSelf(ctx: ActionContext, by: string, side: 'L' | 'R') {
  if (side !== 'R') ctx.fail('para vestir a si mesmo, segure o item na mão direita.');
  if (ctx.riderOn(by, 'handL')) ctx.fail(`para vestir, "${by}" precisa da mão esquerda livre (está segurando "${ctx.riderOn(by, 'handL')}").`);
  const wear = ctx.params.wear as string;
  const channel = wearChannel(ctx, by, wear);
  const chest = placeOfWear(ctx, wear) === 'chest';
  // In meters of the standard body, as in "doff", the other way round: in front of the chest, up over the head,
  // and down to where the piece sits; it is on as the hands get there.
  const ON = 0.68;
  // Read now, not inside `at` (see the other "don").
  const was = ctx.current(channel, by);
  const fit = chest ? [0.21, 1.0, -0.14] : [0.15, 1.7, -0.03];
  const keys = (sign: number): [number, Point3][] => [
    [0, [sign * 0.11, 1.2, -0.34]],
    [0.35, [sign * 0.13, 1.98, -0.12]],
    [ON, [sign * fit[0], fit[1], fit[2]]],
    [0.85, [sign * fit[0], fit[1], fit[2]]],
  ];
  const writes: ChannelWrite[] = (['L', 'R'] as const).flatMap((s) => {
    const path = keys(s === 'R' ? 1 : -1);
    return [
      { target: by, channel: `reach${s}.x`, at: along(path, 0) },
      { target: by, channel: `reach${s}.y`, at: along(path, 1) },
      { target: by, channel: `reach${s}.z`, at: along(path, 2) },
      { target: by, channel: `reach${s}.local`, at: () => 1 },
      { target: by, channel: `reach${s}`, at: (u: number) => Math.min(ramp(u, 0, 0.2), 1 - ramp(u, 0.85, 1)) },
    ];
  });
  return {
    writes: [
      ...writes,
      { target: by, channel: 'carryR', at: (u: number) => 1 - ramp(u, ON, ON + 0.05) },
      { target: by, channel, at: (u: number) => (u < ON ? was : 1) },
      { channel: 'held', at: (u: number) => (u < ON ? 1 : 0) },
    ],
    detach: { at: ON },
    attach: { to: by, socket: 'pocket', at: ON },
  };
}

registerAction({
  id: 'give',
  description: 'Quem segura o item o entrega a outra pessoa ("to"): os dois estendem a mão, o item passa de uma mão para a outra no meio, e quem recebe fica segurando na mão direita. Precisam estar perto (até 1,5 m um do outro), e a mão direita de quem recebe, livre.',
  appliesTo: ['item'],
  params: {
    to: { type: 'string', description: 'quem recebe', required: true },
  },
  duration: 1.4,
  compile(ctx) {
    const link = ctx.linkOf(ctx.target.id);
    const side = link?.socket.match(/^hand([LR])$/)?.[1] as 'L' | 'R' | undefined;
    if (!link || !side) ctx.fail('ninguém está segurando o item; use pickUp antes.');
    const by = link!.to;
    const to = ctx.params.to as string;
    if (to === by) ctx.fail('quem entrega e quem recebe são a mesma pessoa.');
    if (ctx.riderOn(to, 'handR')) ctx.fail(`a mão direita de "${to}" está ocupada com "${ctx.riderOn(to, 'handR')}".`);
    const [a, b] = [ctx.placeOf(by), ctx.placeOf(to)];
    const far = Math.hypot(a.pos[0] - b.pos[0], a.pos[2] - b.pos[2]);
    if (far > 1.5) ctx.fail(`"${by}" e "${to}" estão a ${far.toFixed(2)} m; chegue mais perto (até 1,5 m) antes de entregar.`);
    const k = Math.min(actor(ctx, by).traits.bodyScale ?? 1, actor(ctx, to).traits.bodyScale ?? 1);
    // The hands meet between them, at the height of a chest.
    const meet: Point3 = [(a.pos[0] + b.pos[0]) / 2, Math.max(a.pos[1], b.pos[1]) + 1.15 * k, (a.pos[2] + b.pos[2]) / 2];
    const PASS = 0.5;
    const giver = reach(ctx, by, side!, meet, (u) => Math.min(ramp(u, 0, 0.4), 1 - ramp(u, 0.55, 0.95)), `a mão de "${to}"`);
    const taker = reach(ctx, to, 'R', meet, (u) => Math.min(ramp(u, 0.1, 0.45), 1 - ramp(u, 0.6, 1)), `a mão de "${by}"`);
    return {
      writes: [
        ...giver,
        ...taker,
        { target: by, channel: `carry${side}`, at: (u: number) => 1 - ramp(u, PASS, PASS + 0.05) },
        { target: to, channel: 'carryR', at: (u: number) => ramp(u, PASS, PASS + 0.1) },
      ],
      detach: { at: PASS },
      attach: { to, socket: 'handR', at: PASS },
    };
  },
});

registerAction({
  id: 'doff',
  description: 'Quem está vestindo a peça ("wear": um capacete, a couraça) a tira com as duas mãos, puxando por cima da cabeça, e fica segurando o item na mão direita. O item precisa estar com ele, guardado (vestido com "don", ou "pocketOf" no episódio). As duas mãos precisam estar livres.',
  appliesTo: ['item'],
  params: {
    wear: { type: 'string', description: 'a peça de roupa que sai do corpo', required: true },
    place: { type: 'string', description: '"head" ou "chest": de onde as mãos puxam (padrão: chest para couraça, manto e colete; head para o resto)' },
  },
  duration: 1.8,
  compile(ctx) {
    const link = ctx.linkOf(ctx.target.id);
    if (link?.socket !== 'pocket') ctx.fail('o item precisa estar com quem o veste, guardado (vestido com "don", ou "pocketOf" no episódio).');
    const by = link!.to;
    actor(ctx, by);
    const wear = ctx.params.wear as string;
    const channel = wearChannel(ctx, by, wear);
    if (ctx.current(channel, by) < 0.5) ctx.fail(`"${by}" não está vestindo "${wear}".`);
    for (const s of ['L', 'R'] as const) {
      if (ctx.riderOn(by, `hand${s}`)) ctx.fail(`para tirar "${wear}", "${by}" precisa das duas mãos livres (está segurando "${ctx.riderOn(by, `hand${s}`)}").`);
      if (ctx.current(`reach${s}`, by) > 0.01) ctx.fail(`a mão de "${by}" está levantada; use "lower" antes.`);
    }
    const chest = placeOfWear(ctx, wear) === 'chest';
    // The piece leaves the body as soon as the hands have it, and goes up with them.
    const OFF = 0.36;
    // In meters of the standard body: x to the right, y up from the feet, -z ahead. Hands at the sides of the
    // helmet (or the hem of the coat), up over the head, then down in front of the chest holding it.
    const grab = chest ? [0.21, 1.0, -0.14] : [0.15, 1.7, -0.03];
    const keys = (sign: number): [number, Point3][] => [
      [0, [sign * grab[0], grab[1], grab[2]]],
      [0.3, [sign * grab[0], grab[1], grab[2]]],
      [0.6, [sign * 0.13, 1.98, -0.12]],
      [0.85, [sign * 0.11, 1.2, -0.34]],
    ];
    const writes: ChannelWrite[] = (['L', 'R'] as const).flatMap((s) => {
      const path = keys(s === 'R' ? 1 : -1);
      return [
        { target: by, channel: `reach${s}.x`, at: along(path, 0) },
        { target: by, channel: `reach${s}.y`, at: along(path, 1) },
        { target: by, channel: `reach${s}.z`, at: along(path, 2) },
        { target: by, channel: `reach${s}.local`, at: () => 1 },
        { target: by, channel: `reach${s}`, at: (u: number) => Math.min(ramp(u, 0, 0.3), 1 - ramp(u, 0.85, 1)) },
      ];
    });
    return {
      writes: [
        ...writes,
        { target: by, channel: 'carryR', at: (u) => ramp(u, 0.85, 1) },
        { target: by, channel, at: (u) => (u < OFF ? 1 : 0) },
        { channel: 'held', at: (u) => (u < OFF ? 0 : 1) },
      ],
      detach: { at: OFF },
      attach: { to: by, socket: 'handR', weight: 'held', at: OFF },
    };
  },
});

registerAction({
  id: 'draw',
  description: 'O personagem ("by") tira a espada (o item) da bainha de alguém ("from", que usa "scabbard" e tem "scabbardEmpty" escondida na ficha), de pé ou caído de bruços, e a ergue acima da cabeça; fica assim até um "lower". A espada começa com quem tira, guardada ("pocketOf"), e aparece na mão quando sai da bainha. Ele precisa estar ao lado do quadril do outro.',
  appliesTo: ['item'],
  params: {
    by: { type: 'string', description: 'quem tira a espada', required: true },
    from: { type: 'string', description: 'de quem é a bainha', required: true },
    hand: { type: 'string', description: '"left" ou "right" (padrão: a direita, se estiver livre)' },
  },
  duration: 2.4,
  compile(ctx) {
    const by = ctx.params.by as string;
    const from = ctx.params.from as string;
    const drawer = actor(ctx, by);
    const owner = actor(ctx, from);
    const link = ctx.linkOf(ctx.target.id);
    if (link?.socket !== 'pocket' || link.to !== by) ctx.fail(`a espada precisa começar com "${by}", guardada ("pocketOf": "${by}" no episódio).`);
    const sheathed = wearChannel(ctx, from, 'scabbard');
    const empty = wearChannel(ctx, from, 'scabbardEmpty');
    if (ctx.current(sheathed, from) < 0.5) ctx.fail(`a bainha de "${from}" já está vazia.`);
    const side = freeHand(ctx, by);
    const place = ctx.placeOf(from);
    const s = owner.traits.bodyScale ?? 1;
    const { ahead, right } = axes(place.yaw);
    // The hilt sits on the left hip, a little above the belt. Lying face down (after "fall"), the hips are where
    // the character's position is, near the ground, and the hilt points toward the head.
    const lying = Math.min(1, Math.max(0, ctx.current('move.fall', from)));
    const mix = (a: number, b: number): number => a + (b - a) * lying;
    const side3 = (k: number): [number, number] => [-right[0] * k, -right[1] * k];
    const [lx, lz] = side3(0.26 * s);
    const hilt: Point3 = [
      place.pos[0] + lx + ahead[0] * mix(0.02, 0.22) * s,
      place.pos[1] + mix(1.12, 0.24) * s,
      place.pos[2] + lz + ahead[1] * mix(0.02, 0.22) * s,
    ];
    // Out of the sheath: up when standing, toward the head when lying, as long as the blade.
    const blade = (ctx.target.traits.size?.[1] ?? 0.9) * 0.85;
    const out: Point3 = [hilt[0] + ahead[0] * blade * lying, hilt[1] + blade * mix(1, 0.35), hilt[2] + ahead[1] * blade * lying];
    // Raised above the head, a little ahead and to the side of the hand that holds it.
    const me = ctx.placeOf(by);
    const k = drawer.traits.bodyScale ?? 1;
    const mine = axes(me.yaw);
    const hand = side === 'R' ? 1 : -1;
    const up: Point3 = [me.pos[0] + mine.ahead[0] * 0.22 * k + mine.right[0] * 0.14 * k * hand, me.pos[1] + 1.95 * k, me.pos[2] + mine.ahead[1] * 0.22 * k + mine.right[1] * 0.14 * k * hand];
    const OUT = 0.33;
    const path: [number, Point3][] = [[0, hilt], [OUT + 0.03, hilt], [0.6, out], [0.95, up]];
    // Checks the reach to the hilt and squats for it; the squat goes as the sword comes up.
    const base = reach(ctx, by, side, hilt, (u) => ramp(u, 0, 0.3), 'o punho da espada');
    const squat = base.find((w) => w.channel === 'crouch');
    const depth = squat?.at ? squat.at(1) : 0;
    const writes = base
      .filter((w) => w.channel !== 'crouch')
      .map((w): ChannelWrite => {
        const axis = { [`reach${side}.x`]: 0, [`reach${side}.y`]: 1, [`reach${side}.z`]: 2 }[w.channel] as 0 | 1 | 2 | undefined;
        return axis === undefined ? w : { ...w, at: along(path, axis) };
      });
    return {
      writes: [
        ...writes,
        ...(depth > 0.01 ? [{ target: by, channel: 'crouch', at: (u: number) => depth * Math.min(ramp(u, 0, 0.3), 1 - ramp(u, 0.45, 0.8)) }] : []),
        { target: by, channel: `carry${side}`, at: (u) => ramp(u, OUT, OUT + 0.1) },
        { target: from, channel: sheathed, at: (u) => (u < OUT ? 1 : 0) },
        { target: from, channel: empty, at: (u) => (u < OUT ? 0 : 1) },
        { channel: 'held', at: (u) => (u < OUT ? 0 : 1) },
      ],
      detach: { at: OUT },
      attach: { to: by, socket: `hand${side}`, weight: 'held', at: OUT },
    };
  },
});

registerAction({
  id: 'chop',
  description:
    'Quem segura a espada (o item, na mão, depois de um "draw" ou "pickUp") ergue um pouco mais e desce num golpe até o ponto "at" [x, y, z], onde a lâmina chega; fica lá embaixo. A espada alcança mais longe que o braço: o ponto pode estar a até o braço mais a lâmina. Rápido (padrão 0,8 s; o golpe em si é o último terço).',
  appliesTo: ['item'],
  params: {
    at: { type: 'point3', description: 'onde a lâmina chega [x, y, z]', required: true },
  },
  duration: 0.8,
  compile(ctx) {
    const link = ctx.linkOf(ctx.target.id);
    if (!link || (link.socket !== 'handR' && link.socket !== 'handL')) ctx.fail('a espada precisa estar na mão de alguém (depois de um "draw" ou "pickUp").');
    const by = link!.to;
    const side = link!.socket === 'handL' ? 'L' : 'R';
    const me = ctx.placeOf(by);
    const k = actor(ctx, by).traits.bodyScale ?? 1;
    const at = ctx.params.at as Point3;
    const blade = (ctx.target.traits.size?.[1] ?? 0.9) * 0.85;
    const [dx, dz] = [at[0] - me.pos[0], at[2] - me.pos[2]];
    const far = Math.hypot(dx, dz);
    if (far > 0.8 * k + blade) ctx.fail(`o ponto do golpe está a ${far.toFixed(2)} m de "${by}", longe demais até para a espada (${(0.8 * k + blade).toFixed(2)} m).`);
    // Where the hand is now (the sword raised), a little higher and back for the swing, and where it ends: in front,
    // low, toward the point, a blade's length short of it, so the blade reaches it.
    const from: Point3 = [ctx.current(`reach${side}.x`, by), ctx.current(`reach${side}.y`, by), ctx.current(`reach${side}.z`, by)];
    const [ux, uz] = far > 1e-3 ? [dx / far, dz / far] : [0, 0];
    const windup: Point3 = [from[0] - ux * 0.12 * k, from[1] + 0.12 * k, from[2] - uz * 0.12 * k];
    const reachOut = Math.min(0.62 * k, Math.max(0.3 * k, far - blade * 0.7));
    const end: Point3 = [me.pos[0] + ux * reachOut, Math.max(me.pos[1] + 0.55 * k, at[1] + blade * 0.35), me.pos[2] + uz * reachOut];
    const path: [number, Point3][] = [[0, from], [0.6, windup], [1, end]];
    return {
      writes: [
        { target: by, channel: `reach${side}.x`, at: along(path, 0) },
        { target: by, channel: `reach${side}.y`, at: along(path, 1) },
        { target: by, channel: `reach${side}.z`, at: along(path, 2) },
        // The body follows the blow down: a bend at the end. The blade turns down with the arm.
        { target: by, channel: 'crouch', at: (u: number) => 0.35 * ramp(u, 0.6, 1) },
        ...('swing' in ctx.target.channels ? [{ channel: 'swing', at: (u: number) => ramp(u, 0.6, 1) }] : []),
      ],
    };
  },
});
