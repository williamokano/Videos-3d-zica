/** Series bible: facts that stay true across the whole series until revoked. */

export interface Environment {
  skyTop: string;
  skyHorizon: string;
  sunColor: string;
  sunIntensity: number;
  ambientIntensity: number;
  fogNear: number;
  fogFar: number;
}

export const DEFAULT_ENVIRONMENT: Environment = {
  skyTop: '#3f86d6',
  skyHorizon: '#d4ebff',
  sunColor: '#fff3dc',
  sunIntensity: 2.6,
  ambientIntensity: 1.0,
  fogNear: 70,
  fogFar: 260,
};

export interface BibleRule {
  id: string;
  description: string;
  /** First episode where the rule holds. */
  from: number;
  /** Last episode where the rule holds; null = until revoked. */
  until: number | null;
  effects: { environment?: Partial<Environment> };
}

/** The look of the series. */
export interface Style {
  /** "soft": smooth shading, the look the kit was made with. "cel": light in flat bands and a dark outline. */
  look: 'soft' | 'cel';
  /** cel: thickness of the outline in meters (default 0.01). 0 leaves only the bands of light. */
  outline?: number;
  /** cel: number of bands of light (default 3). */
  bands?: number;
}

export interface Bible {
  series: string;
  title: string;
  /** Original language of the series (BCP 47). */
  language: string;
  /** Languages the series is dubbed into. */
  dubbing: string[];
  format: { width: number; height: number; fps: number };
  /** Audio pipeline config. Declared now, consumed by the speech phase. */
  audio: {
    provider: 'elevenlabs';
    /** tts: generate from text. sts: speech-to-speech over the author's own narration. */
    defaultMode: 'tts' | 'sts';
  };
  rules: BibleRule[];
  /** Without it, the series is "soft". */
  style?: Style;
}

/** The style of a series with every value filled in. */
export function resolveStyle(bible: Pick<Bible, 'style'>): Required<Style> {
  const bands = Math.round(bible.style?.bands ?? 3);
  return { look: bible.style?.look ?? 'soft', outline: Math.max(0, bible.style?.outline ?? 0.01), bands: Math.max(1, Math.min(8, bands)) };
}

export function activeRules(bible: Bible, episode: number): BibleRule[] {
  return bible.rules.filter((r) => r.from <= episode && (r.until === null || episode <= r.until));
}

const mixColor = (a: string, b: string, w: number): string => {
  // "#f00" is short for "#ff0000".
  const full = (c: string) => (c.length === 4 ? `#${[...c.slice(1)].map((d) => d + d).join('')}` : c);
  const [x, y] = [a, b].map((c) => [1, 3, 5].map((i) => parseInt(full(c).slice(i, i + 2), 16)));
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * w).toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Environment for an episode: defaults overridden by each active rule, in bible order.
 * `weights` says how much each rule is in effect, from 0 to 1 (default 1), so a rule can
 * come in gradually in the middle of an episode.
 */
export function resolveEnvironment(rules: BibleRule[], weights: Record<string, number> = {}): Environment {
  const env: Environment = { ...DEFAULT_ENVIRONMENT };
  for (const r of rules) {
    const w = Math.max(0, Math.min(1, weights[r.id] ?? 1));
    if (w === 0) continue;
    for (const [key, value] of Object.entries(r.effects.environment ?? {}) as [keyof Environment, string | number][]) {
      const now = env[key];
      const mixed = w >= 1 ? value : typeof value === 'number' ? (now as number) + (value - (now as number)) * w : mixColor(now as string, value, w);
      (env as unknown as Record<string, string | number>)[key] = mixed;
    }
  }
  return env;
}
