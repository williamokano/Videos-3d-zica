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
}

export function activeRules(bible: Bible, episode: number): BibleRule[] {
  return bible.rules.filter((r) => r.from <= episode && (r.until === null || episode <= r.until));
}

/** Environment for an episode: defaults overridden by each active rule, in bible order. */
export function resolveEnvironment(rules: BibleRule[]): Environment {
  const env = { ...DEFAULT_ENVIRONMENT };
  for (const r of rules) Object.assign(env, r.effects.environment);
  return env;
}
