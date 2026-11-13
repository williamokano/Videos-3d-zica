/**
 * Voice. Every spoken line becomes a take: an audio file made by the voice provider and, with it, when each letter
 * is said. A take is found by a key made from what it sounds like (voice, model, the text as sent with its tone),
 * never by where the line is in the episode, so moving or retiming a line costs nothing and only a new wording
 * or a new voice makes a new take.
 *
 * Takes live in series/<series>/audio/voz/<key>.mp3 with <key>.json next to it. `npm run voz` makes the missing
 * ones. Without its take, a line still plays: its length and its mouth come from the letters of the text.
 */
import { NO_VISEMES, VISEME_NAMES, lendShapes, letterSound, type Viseme, type VisemeWeights } from '../character/motion';

/** A voice of the provider and how it is set. */
export interface VoiceSpec {
  /** Voice id at the provider (ElevenLabs). */
  id: string;
  /** 0 to 1: lower is more expressive and varied, higher more even. */
  stability?: number;
  similarity?: number;
  /** 0 to 1: how much of the voice's own style. */
  style?: number;
  /** Speed of the speech, 0.7 to 1.2. Models that ignore it (v3) are sped up after generation. */
  speed?: number;
}

/** A line of the episode with what it takes to make its audio. */
export interface LineVoice {
  key: string;
  /** Who says it: a cast id, or "narrador". */
  speaker: string;
  /** As shown in subtitles. */
  text: string;
  /** As sent to the provider: the text with the tone tag in front. */
  spoken: string;
  voice: VoiceSpec;
  model: string;
}

/** What is known of a take once made: its length and when each letter of the text is said. */
export interface Take {
  key: string;
  duration: number;
  /** The letters of the line as said, without tone tags. */
  text: string;
  /** Seconds where each letter of `text` starts and ends. */
  starts: number[];
  ends: number[];
}

export const NARRATOR = 'narrador';
export const DEFAULT_MODEL = 'eleven_v3';

/**
 * Tones by name: the tag the model reads in front of the line (eleven_v3 audio tags). Any other tone is sent as it
 * is, in brackets, e.g. "laughs" or "sarcastic".
 */
export const TONES: Record<string, string> = {
  sussurro: 'whispers',
  preocupada: 'worried',
  preocupado: 'worried',
  firme: 'firm, commanding',
  decidido: 'determined',
  nervoso: 'nervous',
  grito: 'shouting',
  bravo: 'angry',
  assustado: 'scared',
  animado: 'excited',
  triste: 'sad',
  transe: 'monotone, distant, hypnotized',
  ironico: 'sarcastic',
  cansado: 'tired',
  urgente: 'urgent',
};

/**
 * How a voice reaches the listener, applied to the take when the sound is mixed (the take itself stays clean,
 * so the same line can be heard in the room and over a radio). Each is an ffmpeg filter chain, and a band of
 * frequencies for the studio's preview.
 */
export const VOICE_FILTERS: Record<string, { description: string; ffmpeg: string; band: [number, number] }> = {
  radio: {
    description: 'rádio comunicador (PX, viatura): faixa estreita, comprimido, um pouco rachado',
    ffmpeg: 'highpass=f=420,lowpass=f=2900,acompressor=threshold=-22dB:ratio=6:attack=3:release=80,acrusher=bits=9:mix=0.25,volume=1.7',
    band: [420, 2900],
  },
  phone: {
    description: 'voz saindo do alto-falante de um celular',
    ffmpeg: 'highpass=f=300,lowpass=f=3400,acompressor=threshold=-20dB:ratio=3,volume=1.3',
    band: [300, 3400],
  },
  speaker: {
    description: 'caixa de som de escola ou megafone: médio forte, com eco curto',
    ffmpeg: 'highpass=f=350,lowpass=f=4200,aecho=0.8:0.6:45:0.3,volume=1.4',
    band: [350, 4200],
  },
  muffled: {
    description: 'abafado, do outro lado de uma porta ou parede',
    ffmpeg: 'lowpass=f=700,volume=0.8',
    band: [40, 700],
  },
};

/** The text as sent to the provider. */
export function spokenText(text: string, tone?: string): string {
  if (!tone) return text;
  return `[${TONES[tone] ?? tone}] ${text}`;
}

/** Tags like "[whispers]" out of a text: they are said as tone, not as words. */
export const stripTags = (text: string): string => text.replace(/\[[^\]]*\]\s*/g, '');

/** A short, stable hash of a string (two 32-bit FNV-1a with different seeds). */
function hash(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** The key of a take: the same sound always has the same key. */
export function takeKey(voice: VoiceSpec, model: string, spoken: string, language = 'pt'): string {
  const { id, stability, similarity, style, speed } = voice;
  return hash(JSON.stringify([id, stability ?? null, similarity ?? null, style ?? null, speed ?? null, model, language, spoken]));
}

/**
 * A take from the provider's answer: the letters of the spoken text with their times. The tone tag is taken out
 * (the model does not say it), and the times are scaled by `tempo` when the audio was sped up afterwards.
 */
export function takeFromAlignment(key: string, duration: number, chars: string[], starts: number[], ends: number[], tempo = 1): Take {
  const keep: number[] = [];
  let depth = 0;
  chars.forEach((ch, i) => {
    if (ch === '[') depth++;
    else if (ch === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0) keep.push(i);
  });
  // The space after a tag is not part of the line.
  while (keep.length && /\s/.test(chars[keep[0]])) keep.shift();
  const r = (t: number) => Math.round((t / tempo) * 1000) / 1000;
  return { key, duration: r(duration), text: keep.map((i) => chars[i]).join(''), starts: keep.map((i) => r(starts[i])), ends: keep.map((i) => r(ends[i])) };
}

const smooth = (u: number): number => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

interface TimedSound {
  shape: Viseme | null;
  weight: number;
  start: number;
  end: number;
  borrowed?: true;
}

const timedTracks = new Map<string, (seconds: number) => VisemeWeights>();

/**
 * The mouth shapes of a take, as a function of seconds from its start: each letter's shape comes in when the
 * voice says it. Pauses longer than a moment close the mouth.
 */
export function takeVisemes(take: Take): (seconds: number) => VisemeWeights {
  const known = timedTracks.get(take.key);
  if (known) return known;
  const sounds: TimedSound[] = [];
  [...take.text].forEach((ch, i) => {
    const sound = letterSound(ch);
    if (!sound) return;
    const [start, end] = [take.starts[i] ?? 0, take.ends[i] ?? take.starts[i] ?? 0];
    // A gap before this letter is a pause: the mouth closes in it.
    const previous = sounds[sounds.length - 1];
    if (previous && start - previous.end > 0.12) sounds.push({ shape: null, weight: 0, start: previous.end + 0.04, end: start });
    sounds.push({ shape: sound.shape, weight: sound.weight, start, end: Math.max(end, start + 0.03), borrowed: sound.borrowed });
  });
  lendShapes(sounds);
  const track = (s: number): VisemeWeights => {
    const weights = { ...NO_VISEMES };
    if (!sounds.length || s <= sounds[0].start || s >= take.duration) return weights;
    let i = sounds.length - 1;
    while (i > 0 && sounds[i].start > s) i--;
    const [now, before] = [sounds[i], sounds[i - 1]];
    // Each sound comes in over the first half of its time (at most 60 ms), as the one before goes out.
    const into = smooth((s - now.start) / Math.min(0.06, (now.end - now.start) / 2));
    // After the last letter of a phrase the mouth closes.
    const fade = 1 - smooth((s - now.end) / 0.08);
    if (now.shape) weights[now.shape] += now.weight * into * fade;
    if (before?.shape) weights[before.shape] += before.weight * (1 - into);
    return weights;
  };
  timedTracks.set(take.key, track);
  return track;
}

/** The mouth open, 0 to 1, of a mix of shapes, for faces with one control. Same as mouthOpenOf. */
export const visemeNames: readonly Viseme[] = VISEME_NAMES;
