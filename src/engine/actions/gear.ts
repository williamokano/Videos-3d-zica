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
  description: 'Quem segura o item (um capacete, uma couraça) veste outra pessoa com ele: a mão leva o item por cima da cabeça dela e desce; o item some da mão e a peça "wear" aparece no corpo dela (a peça precisa estar na ficha, escondida). Depois, o item fica com ela, guardado, para um "doff".',
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
    if (on === by) ctx.fail('para vestir a si mesmo, ainda não há ação; quem veste é outra pessoa.');
    const who = actor(ctx, on);
    const wear = ctx.params.wear as string;
    const channel = wearChannel(ctx, on, wear);
    const place = ctx.placeOf(on);
    const scale = who.traits.bodyScale ?? 1;
    const top = place.pos[1] + (who.traits.eyeHeight ?? 1.6 * scale) + 0.17 * scale;
    const low = placeOfWear(ctx, wear) === 'chest' ? place.pos[1] + 1.25 * scale : top;
    const over: Point3 = [place.pos[0], top + 0.22 * scale, place.pos[2]];
    const DOWN = 0.68;
    const amount = (u: number): number => Math.min(ramp(u, 0, 0.3), 1 - ramp(u, 0.8, 1));
    const height = (u: number): number => over[1] + (low - over[1]) * ramp(u, 0.35, DOWN);
    const writes = reach(ctx, by, side!, over, amount, `a cabeça de "${on}"`).map((w): ChannelWrite => (w.channel === `reach${side}.y` ? { ...w, at: height } : w));
    return {
      writes: [
        ...writes,
        { target: by, channel: `carry${side}`, at: (u) => 1 - ramp(u, DOWN, DOWN + 0.08) },
        { target: on, channel, at: (u) => (u < DOWN ? ctx.current(channel, on) : 1) },
        { channel: 'held', at: (u) => (u < DOWN ? 1 : 0) },
      ],
      detach: { at: DOWN },
      attach: { to: on, socket: 'pocket', at: DOWN },
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
