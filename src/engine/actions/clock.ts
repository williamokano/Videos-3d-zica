import { registerAction, type ActionContext, type ChannelWrite } from './catalog';
import { formatClock } from '../character/clock';

/**
 * The clock on the arm (series hora-contada). Its balance at time t is `clock - clock.rate * t`: a running
 * clock goes down by itself, and these actions only write when something happens to it. Every write keeps the
 * balance continuous: starting the clock at 25 does not make the numbers jump.
 */

function needsClock(ctx: ActionContext, id: string): void {
  if (!('clock' in ctx.object(id).channels)) ctx.fail(`"${id}" não tem relógio no braço. Dê "clock" na ficha ou no elenco.`);
}

/** The balance of someone's arm when the clip starts. */
function balanceAt(ctx: ActionContext, id: string): number {
  return Math.max(0, ctx.current('clock', id) - ctx.current('clock.rate', id) * ctx.clip.t);
}

registerAction({
  id: 'clock',
  description:
    'Mexe no relógio do braço: "set" acerta o saldo (num pulo de tempo, no começo de uma cena), "add" soma ou tira segundos aos poucos durante a ação (pagamento, salário, o tempo correndo rápido), "run" liga (aos 25) ou para o relógio. O saldo não salta quando o relógio liga.',
  appliesTo: ['character'],
  params: {
    set: { type: 'number', description: 'saldo em segundos; com "duration", os números correm até ele' },
    add: { type: 'number', description: 'segundos a somar (negativo tira), ao longo da ação' },
    run: { type: 'boolean', description: 'true: começa a contar para baixo (aos 25); false: para' },
  },
  duration: 0,
  compile(ctx) {
    const me = ctx.target.id;
    needsClock(ctx, me);
    const { set, add, run } = ctx.params as { set?: number; add?: number; run?: boolean };
    if (set === undefined && add === undefined && run === undefined) ctx.fail('informe "set", "add" ou "run".');
    if (set !== undefined && add !== undefined) ctx.fail('use "set" ou "add", não os dois.');
    if (set !== undefined && set < 0) ctx.fail('o saldo de "set" precisa ser zero ou mais.');
    const t = ctx.clip.t;
    const clock = ctx.current('clock');
    const rate = ctx.current('clock.rate');
    const next = run === undefined ? rate : run ? 1 : 0;
    if (add && rate === 0 && next === 0) {
      ctx.fail('o relógio está parado (menos de 25 anos): o ano do braço não se gasta nem recebe. Pague pelo cofre, ou ligue com "run".');
    }
    const balance = balanceAt(ctx, me);
    if (add !== undefined && balance + add < 0) ctx.fail(`não há tanto no braço: o saldo é ${formatClock(balance)} e a ação tira ${formatClock(-add)}.`);
    // Where the balance stays when the rate changes: clock - rate * t is the same on both sides of t. From there
    // the numbers go to the new balance over the action (at once when it takes no time).
    const from = clock + (next - rate) * t;
    const to = set !== undefined ? set + next * t : from + (add ?? 0);
    const writes: ChannelWrite[] = [{ channel: 'clock', at: (u) => from + (to - from) * u }];
    if (next !== rate) writes.push({ channel: 'clock.rate', at: () => next });
    return { writes, duration: add !== undefined ? 1.2 : 0 };
  },
});

registerAction({
  id: 'transfer',
  description:
    'Passa tempo do braço de um personagem para o de outro, aos poucos durante a ação: a "queda de mão" ou duas pessoas encostando o braço numa máquina. Os dois precisam ter o relógio ligado (25 anos ou mais).',
  appliesTo: ['character'],
  params: {
    to: { type: 'string', description: 'quem recebe', required: true },
    amount: { type: 'number', description: 'segundos que passam (positivo)', required: true },
  },
  duration: 3,
  compile(ctx) {
    const from = ctx.target.id;
    const to = ctx.params.to as string;
    const amount = ctx.params.amount as number;
    if (to === from) ctx.fail('quem dá e quem recebe são a mesma pessoa.');
    needsClock(ctx, from);
    needsClock(ctx, to);
    if (!(amount > 0)) ctx.fail('"amount" precisa ser um número de segundos maior que zero.');
    for (const id of [from, to]) {
      if (ctx.current('clock.rate', id) === 0) ctx.fail(`o relógio de "${id}" está parado (menos de 25 anos): o ano do braço não passa para ninguém.`);
    }
    const balance = balanceAt(ctx, from);
    if (amount > balance) ctx.fail(`"${from}" só tem ${formatClock(balance)} no braço e a ação passa ${formatClock(amount)}.`);
    const give = ctx.current('clock', from);
    const take = ctx.current('clock', to);
    return {
      writes: [
        { channel: 'clock', at: (u) => give - amount * u },
        { target: to, channel: 'clock', at: (u) => take + amount * u },
      ],
    };
  },
});
