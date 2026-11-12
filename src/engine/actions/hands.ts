import type { ActionContext, ChannelWrite } from './catalog';

/** Helpers for actions in which a character uses a hand on something. */

export type Point3 = [number, number, number];

const smooth = (u: number): number => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

/** 0 → 1 between `from` and `to` of the clip's progress. */
export const ramp = (u: number, from: number, to: number): number => smooth((u - from) / (to - from));

/** The character named by a "by" param. */
export function actor(ctx: ActionContext, by: string) {
  const who = ctx.object(by);
  if (who.kind !== 'character') ctx.fail(`"by" precisa ser um personagem do elenco, e "${by}" é "${who.kind}".`);
  return who;
}

/** Which hand to use: the one asked for, else the right one, else the left if the right is holding something. */
export function freeHand(ctx: ActionContext, by: string): 'L' | 'R' {
  const asked = ctx.params.hand as string | undefined;
  if (asked !== undefined && asked !== 'left' && asked !== 'right') ctx.fail('"hand" precisa ser "left" ou "right".');
  const order: ('L' | 'R')[] = asked === 'left' ? ['L'] : asked === 'right' ? ['R'] : ['R', 'L'];
  const side = order.find((s) => !ctx.riderOn(by, `hand${s}`));
  if (!side) ctx.fail(asked ? `a mão pedida de "${by}" já está segurando "${ctx.riderOn(by, `hand${order[0]}`)}".` : `"${by}" está com as duas mãos ocupadas.`);
  return side!;
}

/**
 * Channel writes that take a hand of `by` to `point` and back. `amount(u)` says how far along the hand is,
 * from 0 (arm at rest) to 1 (on the point), over the clip's progress u. The character squats if the point is low.
 * Fails when the point is out of arm's reach.
 */
export function reach(ctx: ActionContext, by: string, side: 'L' | 'R', point: Point3, amount: (u: number) => number, what: string): ChannelWrite[] {
  const who = actor(ctx, by);
  if (ctx.current(`reach${side}`, by) > 0.01) ctx.fail(`a mão de "${by}" está levantada segurando algo; use "lower" antes.`);
  const scale = who.traits.bodyScale ?? 1;
  const place = ctx.placeOf(by);
  const far = Math.hypot(point[0] - place.pos[0], point[2] - place.pos[2]);
  const limit = 0.8 * scale;
  if (far > limit) {
    ctx.fail(`${what} está a ${far.toFixed(2)} m de "${by}", fora do alcance do braço (${limit.toFixed(2)} m). Leve o personagem até lá antes, com walkTo.`);
  }
  const shoulder = place.pos[1] + 1.36 * scale;
  if (point[1] > shoulder + 0.55 * scale) ctx.fail(`${what} está alto demais para "${by}" alcançar.`);
  const squat = Math.max(0, Math.min(1, (shoulder - 0.42 * scale - point[1]) / (0.6 * scale)));
  const constant = (channel: string, value: number): ChannelWrite => ({ target: by, channel, at: () => value });
  const writes: ChannelWrite[] = [
    constant(`reach${side}.x`, point[0]),
    constant(`reach${side}.y`, point[1]),
    constant(`reach${side}.z`, point[2]),
    constant(`reach${side}.local`, 0),
    { target: by, channel: `reach${side}`, at: amount },
  ];
  if (squat > 0.02) writes.push({ target: by, channel: 'crouch', at: (u) => squat * amount(u) });
  return writes;
}

/** Hand goes out during the first part of the clip, stays, and comes back at the end. */
export const outAndBack = (out: number, back: number) => (u: number): number => Math.min(ramp(u, 0, out), 1 - ramp(u, back, 1));

/** Places on the body, in meters of the standard 1.7 m body: x to the character's right, y up from the feet, -z ahead. */
export const BODY = {
  pocket: (side: 'L' | 'R'): Point3 => [side === 'R' ? 0.17 : -0.17, 0.86, -0.02],
  /** Where a hand holds something to be read. */
  eyes: (side: 'L' | 'R'): Point3 => [side === 'R' ? 0.05 : -0.05, 1.4, -0.36],
  chest: (side: 'L' | 'R'): Point3 => [side === 'R' ? 0.08 : -0.08, 1.2, -0.3],
};

/** Channel writes that take a hand of `by` to a place on its own body, following `amount(u)`. */
export function reachBody(by: string, side: 'L' | 'R', point: Point3, amount: ChannelWrite['at'] | number): ChannelWrite[] {
  const constant = (channel: string, value: number): ChannelWrite => ({ target: by, channel, at: () => value });
  return [
    constant(`reach${side}.x`, point[0]),
    constant(`reach${side}.y`, point[1]),
    constant(`reach${side}.z`, point[2]),
    constant(`reach${side}.local`, 1),
    typeof amount === 'number' ? { target: by, channel: `reach${side}`, to: amount } : { target: by, channel: `reach${side}`, at: amount },
  ];
}
