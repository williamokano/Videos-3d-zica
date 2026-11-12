import type { CompiledActions } from '../actions/catalog';

/**
 * The card that closes an episode with a question for the viewer: a title, two or more answers to choose from,
 * and a call to comment. What it looks like at any instant is a pure function of the time, like everything else.
 */

export interface EndCardOption {
  label: string;
  /** A letter, a number or an emoji shown in the badge. Default: A, B, C... */
  icon?: string;
  /** Color of the badge. Default: one per option, from a fixed list. */
  color?: string;
}

export interface EndCard {
  title: string;
  options: EndCardOption[];
  /** Call to action under the options, e.g. "Comenta aí". */
  cta?: string;
}

/** Badge colors, in order. */
export const END_CARD_COLORS = ['#ff6b3d', '#3d9bff', '#3ecf8e', '#b76bff', '#ffc53d', '#ff5d8f'];

/** What is wrong with a card, or undefined. */
export function endCardProblem(card: Partial<EndCard> | undefined): string | undefined {
  if (!card || typeof card.title !== 'string' || !card.title.trim()) return '"title" precisa ser um texto.';
  if (!Array.isArray(card.options) || card.options.length < 2 || card.options.length > 6) return '"options" precisa ter de 2 a 6 opções.';
  if (card.options.some((o) => !o || typeof o.label !== 'string' || !o.label.trim())) return 'cada opção precisa de "label".';
  if (card.cta !== undefined && typeof card.cta !== 'string') return '"cta" precisa ser um texto.';
  return undefined;
}

export interface EndCardView {
  card: EndCard;
  /** How dark the picture behind is, 0 to 1. */
  dim: number;
  /** How far in each part is, 0 (not there yet) to 1 (in place). */
  title: number;
  options: number[];
  cta: number;
  badges: { icon: string; color: string }[];
}

const smooth = (u: number): number => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

/** The end card on screen at time t, if any: the title comes in first, then each option, then the call to comment. */
export function endCardAt(compiled: Pick<CompiledActions, 'events' | 'clips'>, t: number): EndCardView | undefined {
  // How long a card stays is the length of the clip that showed it.
  const clip = compiled.clips.filter((c) => c.action === 'endCard' && c.t <= t && t < c.t + c.duration).pop();
  const event = clip && compiled.events.find((e) => e.type === 'endCard' && e.t === clip.t);
  if (!event) return undefined;
  const card = event.data.card as EndCard;
  const into = t - event.t;
  const part = (i: number): number => smooth((into - 0.25 - i * 0.35) / 0.4);
  return {
    card,
    dim: smooth(into / 0.4),
    title: part(0),
    options: card.options.map((_, i) => part(i + 1)),
    cta: part(card.options.length + 1.5),
    badges: card.options.map((o, i) => ({ icon: o.icon ?? String.fromCharCode(65 + i), color: o.color ?? END_CARD_COLORS[i % END_CARD_COLORS.length] })),
  };
}
