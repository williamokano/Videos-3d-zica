import { MOVE_NAMES } from '../character/motion';
import { registerAction, type ChannelWrite } from './catalog';
import { outAndBack, ramp, reach } from './hands';

/**
 * Whole-body moves (MOVES in character/motion.ts) as actions: a plain `move` that sets the weight of one, and
 * the two that also move things through the scene: falling over, and throwing what the hand holds.
 * Both read best with `ease: 'linear'`, since they keep their own timing.
 */

/** Unit vector a character faces at a heading (0 north, 90 west), as [x, z]. */
const facing = (yaw: number): [number, number] => [-Math.sin((yaw * Math.PI) / 180), -Math.cos((yaw * Math.PI) / 180)];

registerAction({
  id: 'move',
  description: `Um movimento do corpo inteiro, que fica até outro "move" o desfazer (amount 0): ${MOVE_NAMES.join(', ')}. Os que se repetem sozinhos (sling, dance, cheer) continuam enquanto valem.`,
  appliesTo: ['character'],
  params: {
    name: { type: 'string', description: `nome do movimento: ${MOVE_NAMES.join(', ')}`, required: true },
    amount: { type: 'number', description: 'de 0 (desfaz) a 1 (padrão)' },
  },
  duration: 0.6,
  compile(ctx) {
    const name = ctx.params.name as string;
    if (!MOVE_NAMES.includes(name)) ctx.fail(`movimento desconhecido "${name}". Existem: ${MOVE_NAMES.join(', ')}.`);
    if (name === 'fall' || name === 'throw') ctx.fail(`para "${name}" use a ação "${name}", que também move o corpo ou o objeto pelo cenário.`);
    return { writes: [{ channel: `move.${name}`, to: (ctx.params.amount as number | undefined) ?? 1 }] };
  },
});

registerAction({
  id: 'fall',
  description: 'O personagem cai duro para a frente, como uma árvore, e fica deitado de bruços até um "move" ou "standUp" o levantar. Use "ease: linear".',
  appliesTo: ['character'],
  params: {
    toward: { type: 'number', description: 'direção da queda em graus, como o yaw (padrão: para onde ele está virado)' },
  },
  duration: 1.3,
  compile(ctx) {
    const yaw = ctx.current('yaw');
    const [fx, fz] = facing((ctx.params.toward as number | undefined) ?? yaw);
    const hips = 0.9 * (ctx.target.traits.bodyScale ?? 1);
    const [x0, z0] = [ctx.current('x'), ctx.current('z')];
    // Slow at first, then faster: something heavy toppling.
    const angle = (u: number): number => u * u;
    // The pose turns the body about the hips, which would swing the feet back: moving the whole character
    // forward as it tips keeps the feet where they stood, so it pivots on them.
    const ahead = (u: number): number => hips * Math.sin((angle(u) * Math.PI) / 2);
    return {
      writes: [
        { channel: 'move.fall', at: angle },
        { channel: 'x', at: (u) => x0 + fx * ahead(u) },
        { channel: 'z', at: (u) => z0 + fz * ahead(u) },
        { channel: 'yaw', at: () => yaw },
      ],
    };
  },
});

/** Seconds from the start of a throw to the moment the hand lets go. */
const RELEASE = 0.45;

registerAction({
  id: 'throw',
  description: 'Quem segura o item o arremessa (braço por cima do ombro; com "move sling" ligado, solta da funda) até um ponto ou até acertar alguém. O item voa em arco e fica onde caiu. Use "ease: linear".',
  appliesTo: ['item'],
  params: {
    to: { type: 'point3', description: 'onde o item chega, [x, y, z]' },
    hit: { type: 'string', description: 'em vez de "to": id de um personagem; o item acerta a testa dele' },
    speed: { type: 'number', description: 'velocidade do voo em m/s (padrão 20). Mais baixo parece câmera lenta' },
    arc: { type: 'number', description: 'quanto o arco sobe no meio do voo, em metros (padrão 1/20 da distância)' },
    with: { type: 'string', description: 'id de um item que lança (a funda) na mão de quem arremessa; o item arremessado sai do bolso dele no instante de soltar, e a funda fica vazia (canal "loaded")' },
  },
  duration: 1,
  compile(ctx) {
    const launcher = ctx.params.with as string | undefined;
    const link = ctx.linkOf(launcher ?? ctx.target.id);
    const hand = link?.socket.match(/^hand([LR])$/)?.[1];
    if (!link || !hand) ctx.fail(launcher ? `ninguém está segurando "${launcher}"; use pickUp com "by" antes.` : 'ninguém está segurando o item; use pickUp com "by" antes.');
    const by = link!.to;
    if (launcher) {
      const own = ctx.linkOf(ctx.target.id);
      if (own?.to !== by || own.socket !== 'pocket') ctx.fail(`com "with", o item arremessado precisa estar no bolso de "${by}" (guardado com putAway, ou "pocketOf" no episódio).`);
    }
    const hit = ctx.params.hit as string | undefined;
    if ((hit === undefined) === (ctx.params.to === undefined)) ctx.fail('informe "to" ou "hit", um dos dois.');
    let to = ctx.params.to as [number, number, number];
    if (hit) {
      const victim = ctx.placeOf(hit);
      const [fx, fz] = facing(victim.yaw);
      const eye = ctx.object(hit).traits.eyeHeight ?? 1.6;
      // The forehead: a little above the eyes, at the front of the head.
      to = [victim.pos[0] + fx * 0.1 * (eye / 1.6), victim.pos[1] + eye * 1.06, victim.pos[2] + fz * 0.1 * (eye / 1.6)];
    }
    const thrower = ctx.placeOf(by);
    const [fx, fz] = facing(thrower.yaw);
    const scale = ctx.object(by).traits.bodyScale ?? 1;
    // Where the hand lets go: above the right shoulder, a little ahead.
    const from: [number, number, number] = [thrower.pos[0] + fx * 0.3 * scale - fz * 0.25 * scale, thrower.pos[1] + 1.85 * scale, thrower.pos[2] + fz * 0.3 * scale + fx * 0.25 * scale];
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const speed = (ctx.params.speed as number | undefined) ?? 20;
    if (speed <= 0) ctx.fail('"speed" precisa ser maior que zero.');
    const flight = distance / speed;
    const arc = (ctx.params.arc as number | undefined) ?? distance / 20;
    const total = RELEASE + flight;
    const release = RELEASE / total;
    const along = (u: number): number => Math.max(0, (u - release) / (1 - release));
    const point = (i: 0 | 1 | 2) => (u: number): number => {
      const s = along(u);
      return from[i] + (to[i] - from[i]) * s + (i === 1 ? arc * 4 * s * (1 - s) : 0);
    };
    // The arm: a whole throw takes twice the wind-up, the hand letting go halfway.
    const arm = (u: number): number => Math.min(1, (u * total) / (RELEASE * 2));
    const writes: ChannelWrite[] = [
      { target: by, channel: 'move.throw', at: (u) => (u >= 1 ? 1 : arm(u)) },
      ...(launcher
        ? ('loaded' in ctx.object(launcher).channels ? [{ target: launcher, channel: 'loaded', at: (u: number) => (u < release ? 1 : 0) }] : [])
        : [
            { target: by, channel: `carry${hand}`, at: (u: number) => 1 - ramp(u, release, Math.min(1, release + 0.05)) },
            { channel: 'held', at: (u: number) => (u < release ? 1 : 0) },
          ]),
      { channel: 'x', at: point(0) },
      { channel: 'y', at: point(1) },
      { channel: 'z', at: point(2) },
    ];
    return { duration: total, writes, detach: { at: release } };
  },
});

registerAction({
  id: 'pour',
  description: 'Quem segura o item (o chifre de azeite, um jarro) leva a mão até acima da cabeça de alguém e derrama: a unção. O item inclina pelo canal "pour" se tiver um. O outro pode estar de pé ou ajoelhado.',
  appliesTo: ['item'],
  params: {
    over: { type: 'string', description: 'id do personagem sobre cuja cabeça derramar', required: true },
    spout: { type: 'number', description: 'quanto a boca do item inclinado fica à frente da mão, em metros (padrão 0,2, o chifre de azeite)' },
  },
  duration: 4,
  compile(ctx) {
    const link = ctx.linkOf(ctx.target.id);
    const hand = link?.socket.match(/^hand([LR])$/)?.[1] as 'L' | 'R' | undefined;
    if (!link || !hand) ctx.fail('ninguém está segurando o item; use pickUp com "by" antes.');
    const by = link!.to;
    const over = ctx.params.over as string;
    if (over === by) ctx.fail('não dá para derramar sobre a própria cabeça.');
    const who = ctx.object(over);
    if (who.kind !== 'character') ctx.fail(`"${over}" precisa ser um personagem do elenco.`);
    const place = ctx.placeOf(over);
    const scale = who.traits.bodyScale ?? 1;
    // The top of the head, a little lower when kneeling, and a hand's width above it.
    const kneeling = ctx.current('move.kneel', over);
    const top = place.pos[1] + ((who.traits.eyeHeight ?? 1.6) + 0.14 * scale) - 0.4 * scale * kneeling;
    // Kneeling, the body leans forward and the head with it, a hand's width ahead of the feet.
    const [fx, fz] = facing(place.yaw);
    const ahead = 0.14 * scale * kneeling;
    // The horn tips forward, away from whoever holds it: its mouth ends up ahead of the hand. The hand stays that
    // much nearer the one who pours, so the oil falls on the head.
    const pourer = ctx.placeOf(by);
    const [dx, dz] = [place.pos[0] - pourer.pos[0], place.pos[2] - pourer.pos[2]];
    const apart = Math.hypot(dx, dz) || 1;
    const spout = (ctx.params.spout as number | undefined) ?? 0.2;
    const point: [number, number, number] = [place.pos[0] + fx * ahead - (dx / apart) * spout, top + 0.22, place.pos[2] + fz * ahead - (dz / apart) * spout];
    const tilt = (u: number): number => Math.min(ramp(u, 0.25, 0.4), 1 - ramp(u, 0.75, 0.85));
    return {
      writes: [
        ...reach(ctx, by, hand!, point, outAndBack(0.2, 0.88), `a cabeça de "${over}"`),
        ...('pour' in ctx.target.channels ? [{ channel: 'pour', at: tilt }] : []),
      ],
    };
  },
});
