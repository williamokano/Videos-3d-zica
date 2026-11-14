import type { CompiledActions } from '../actions/catalog';

/**
 * The opening card of a series: its name, a line under it and which episode this is, laid over the picture for a
 * few seconds after the hook. The same card on every episode gives the series its identity.
 */
export interface TitleCard {
  /** Name of the series, e.g. "DAVI". */
  title: string;
  /** The line under it, e.g. "Uma história de coragem e destino". */
  subtitle?: string;
  /** Which episode, e.g. "Episódio 1 · O escolhido". */
  episode?: string;
}

/** What is wrong with a card, or undefined. */
export function titleCardProblem(card: Partial<TitleCard> | undefined): string | undefined {
  if (!card || typeof card.title !== 'string' || !card.title.trim()) return '"title" precisa ser um texto.';
  for (const key of ['subtitle', 'episode'] as const) if (card[key] !== undefined && typeof card[key] !== 'string') return `"${key}" precisa ser um texto.`;
  return undefined;
}

export interface TitleCardView {
  card: TitleCard;
  /** How much of each line shows, 0 to 1: they come in one after the other and all leave together. */
  title: number;
  subtitle: number;
  episode: number;
}

const smooth = (u: number): number => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

/** The title card on screen at time t, if any. */
export function titleCardAt(compiled: Pick<CompiledActions, 'events' | 'clips'>, t: number): TitleCardView | undefined {
  const clip = compiled.clips.filter((c) => c.action === 'titleCard' && c.t <= t && t < c.t + c.duration).pop();
  const event = clip && compiled.events.find((e) => e.type === 'titleCard' && e.t === clip.t);
  if (!clip || !event) return undefined;
  const into = t - clip.t;
  const out = smooth((clip.duration - into) / 0.6);
  const part = (delay: number): number => Math.min(smooth((into - delay) / 0.6), out);
  return { card: event.data.card as TitleCard, title: part(0), subtitle: part(0.35), episode: part(0.7) };
}
