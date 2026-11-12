/**
 * Actions: generic, data-driven things that happen to interactive objects (open a door, drive a car, pick something up).
 *
 * An interactive object exposes numeric channels (e.g. `open` from 0 to 1). An action is a catalog entry that says
 * which kinds of object it applies to, which params it takes and which channels it moves. The episode lists action
 * clips; compiling them gives per-channel segments, and the value of every channel at time t is a pure function of
 * those segments, so scrubbing to any frame gives the same result as playing up to it.
 */

export type Ease = 'linear' | 'in' | 'out' | 'inOut';

/** One entry of the episode's action track. */
export interface ActionClip {
  /** Seconds from the start of the episode. */
  t: number;
  /** Seconds the action takes. Defaults to the action's own duration. */
  duration?: number;
  /** Id of the interactive object (door opening id or prop id). */
  target: string;
  /** Action id in the catalog, e.g. "open". */
  action: string;
  ease?: Ease;
  params?: Record<string, unknown>;
}

export interface TargetTraits {
  /** Doors: which side the door can be opened from. */
  opensFrom?: 'inside' | 'outside' | 'both';
  /** Doors: how the leaf moves. */
  doorKind?: 'swing' | 'sliding' | 'rollup';
  pickable?: boolean;
  /** Doors: from this much open, a person can walk through. */
  passableAt?: number;
  /** Characters: meters covered by one full walk cycle (two steps). */
  strideLength?: number;
  /** Characters: height of the eyes above the feet, in meters. */
  eyeHeight?: number;
  /** Characters: names of the expressions the face can show. */
  expressions?: string[];
}

/** What the compiler needs to know about an interactive object. */
export interface ActionTarget {
  id: string;
  /** "door", "vehicle", "item" (pickable prop) or "prop". */
  kind: string;
  /** Channel name → value before any action runs. */
  channels: Record<string, number>;
  traits: TargetTraits;
}

export type ParamType = 'number' | 'string' | 'boolean' | 'point2' | 'point3' | 'path';

export interface ParamSpec {
  type: ParamType;
  description: string;
  required?: boolean;
}

/** Move a channel during the clip: straight to `to`, or along `at(u)` with u from 0 to 1. */
export interface ChannelWrite {
  channel: string;
  to?: number;
  at?: (u: number) => number;
}

/** A route on foot: points every few centimeters and the doors it goes through. */
export interface WalkPath {
  /** [x, y, z] along the way. */
  points: [number, number, number][];
  /** Distance travelled at each point. */
  distances: number[];
  length: number;
  doors: { id: string; distance: number }[];
}

/** What the world offers to actions that need more than their target. */
export interface ActionServices {
  /** Route on foot between two places, or null when there is none. */
  findPath?(from: [number, number, number], to: [number, number], toElevation: number): WalkPath | null;
}

/** Checks that need the whole track compiled, e.g. "is that door open by the time I get there?". */
export interface ValidateContext {
  /** Clock time at which the clip reaches `progress` (0 to 1) of its way. */
  timeAt(progress: number): number;
  /** Value of another object's channel at a time. */
  valueAt(target: string, channel: string, time: number): number;
  target(id: string): ActionTarget | undefined;
  fail(message: string): never;
}

export interface ActionContext {
  services: ActionServices;
  target: ActionTarget;
  params: Record<string, unknown>;
  /** Value of a channel when the clip starts. */
  current(channel: string): number;
  fail(message: string): never;
}

export interface ActionDef {
  id: string;
  description: string;
  /** Object kinds the action applies to; "*" is any. */
  appliesTo: string[];
  params: Record<string, ParamSpec>;
  /** Default length in seconds. */
  duration: number;
  compile(ctx: ActionContext): { writes: ChannelWrite[]; duration?: number; validate?(ctx: ValidateContext): void };
}

const actions = new Map<string, ActionDef>();

/** Register a reusable action. Check `listActions()` before creating a new one. */
export function registerAction(def: ActionDef): void {
  if (actions.has(def.id)) throw new Error(`Action already registered: ${def.id}`);
  actions.set(def.id, def);
}

export function listActions(): ActionDef[] {
  return [...actions.values()];
}

// ---- Compiling ----

interface Segment {
  t0: number;
  t1: number;
  /** Value at eased progress u. */
  at(u: number): number;
  end: number;
}

export interface ChannelTrack {
  target: string;
  channel: string;
  initial: number;
  segments: Segment[];
}

export interface CompiledClip {
  t: number;
  duration: number;
  target: string;
  action: string;
}

export interface CompiledActions {
  tracks: ChannelTrack[];
  /** Clips in time order with their final durations, for timeline markers. */
  clips: CompiledClip[];
}

const EASES: Record<Ease, (u: number) => number> = {
  linear: (u) => u,
  in: (u) => u * u,
  out: (u) => 1 - (1 - u) * (1 - u),
  inOut: (u) => u * u * (3 - 2 * u),
};

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isPoint = (v: unknown, n: number): boolean => Array.isArray(v) && v.length === n && v.every(isNumber);

const PARAM_CHECKS: Record<ParamType, (v: unknown) => boolean> = {
  number: isNumber,
  string: (v) => typeof v === 'string',
  boolean: (v) => typeof v === 'boolean',
  point2: (v) => isPoint(v, 2),
  point3: (v) => isPoint(v, 3),
  path: (v) => Array.isArray(v) && v.length > 0 && v.every((p) => isPoint(p, 2)),
};

/**
 * Turn the episode's action clips into channel tracks. Throws with a message that names the clip
 * when an action does not exist, does not fit its target, has bad params or overlaps another one.
 */
export function compileActions(clips: ActionClip[], targets: ActionTarget[], services: ActionServices = {}): CompiledActions {
  const byId = new Map(targets.map((t) => [t.id, t]));
  const tracks = new Map<string, ChannelTrack>();
  const compiled: CompiledClip[] = [];
  const checks: (() => void)[] = [];
  const ordered = clips.map((clip, index) => ({ clip, index })).sort((a, b) => a.clip.t - b.clip.t || a.index - b.index);

  for (const { clip, index } of ordered) {
    const fail = (message: string): never => {
      throw new Error(`Ação ${index + 1} ("${clip.action}" em "${clip.target}" aos ${clip.t}s): ${message}`);
    };
    const def = actions.get(clip.action) ?? fail(`ação desconhecida. Catálogo: ${[...actions.keys()].join(', ')}.`);
    const target = byId.get(clip.target) ?? fail(`objeto não encontrado neste local. Objetos com id: ${[...byId.keys()].join(', ') || 'nenhum'}.`);
    if (!def.appliesTo.includes('*') && !def.appliesTo.includes(target.kind)) {
      fail(`vale para ${def.appliesTo.join(', ')}, mas o objeto é "${target.kind}".`);
    }
    if (!isNumber(clip.t) || clip.t < 0) fail('"t" precisa ser um número de segundos maior ou igual a zero.');
    if (clip.ease && !EASES[clip.ease]) fail(`"ease" precisa ser um de: ${Object.keys(EASES).join(', ')}.`);

    const params = clip.params ?? {};
    for (const name of Object.keys(params)) {
      if (!def.params[name]) fail(`parâmetro desconhecido "${name}". Aceitos: ${Object.keys(def.params).join(', ') || 'nenhum'}.`);
    }
    for (const [name, spec] of Object.entries(def.params)) {
      const value = params[name];
      if (value === undefined) {
        if (spec.required) fail(`falta o parâmetro "${name}" (${spec.description}).`);
      } else if (!PARAM_CHECKS[spec.type](value)) {
        fail(`parâmetro "${name}" precisa ser do tipo ${spec.type}.`);
      }
    }

    const trackOf = (channel: string): ChannelTrack => {
      const key = `${target.id}\n${channel}`;
      let track = tracks.get(key);
      if (!track) {
        if (!(channel in target.channels)) {
          fail(`o objeto não tem o canal "${channel}". Canais: ${Object.keys(target.channels).join(', ')}.`);
        }
        track = { target: target.id, channel, initial: target.channels[channel], segments: [] };
        tracks.set(key, track);
      }
      return track;
    };
    const current = (channel: string): number => {
      const track = trackOf(channel);
      return track.segments.at(-1)?.end ?? track.initial;
    };

    const result = def.compile({ services, target, params, current, fail });
    const duration = clip.duration ?? result.duration ?? def.duration;
    if (!isNumber(duration) || duration < 0) fail('"duration" precisa ser um número de segundos maior ou igual a zero.');
    const ease = EASES[clip.ease ?? 'inOut'];

    for (const write of result.writes) {
      const track = trackOf(write.channel);
      const from = current(write.channel);
      const last = track.segments.at(-1);
      if (last && clip.t < last.t1 - 1e-9) {
        fail(`o canal "${write.channel}" ainda está em uso por outra ação até ${last.t1}s.`);
      }
      const to = write.to ?? from;
      const at = write.at ?? ((u: number) => from + (to - from) * u);
      track.segments.push({ t0: clip.t, t1: clip.t + duration, at: (u) => at(ease(u)), end: at(1) });
    }
    compiled.push({ t: clip.t, duration, target: clip.target, action: clip.action });

    const validate = result.validate;
    if (validate) {
      const timeAt = (progress: number): number => {
        // Invert the easing by bisection: it only ever grows.
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 24; i++) {
          const mid = (lo + hi) / 2;
          if (ease(mid) < progress) lo = mid;
          else hi = mid;
        }
        return clip.t + duration * hi;
      };
      const valueAt = (id: string, channel: string, time: number): number => {
        const track = tracks.get(`${id}\n${channel}`);
        return track ? evaluateTrack(track, time) : (byId.get(id)?.channels[channel] ?? 0);
      };
      checks.push(() => validate({ timeAt, valueAt, target: (id) => byId.get(id), fail }));
    }
  }
  for (const check of checks) check();
  return { tracks: [...tracks.values()], clips: compiled };
}

function evaluateTrack(track: ChannelTrack, t: number): number {
  let i = track.segments.length - 1;
  while (i >= 0 && track.segments[i].t0 > t) i--;
  if (i < 0) return track.initial;
  const s = track.segments[i];
  return t >= s.t1 ? s.end : s.at((t - s.t0) / (s.t1 - s.t0));
}

/** Value of every animated channel at time t: target id → channel → value. */
export function evaluateActions(compiled: CompiledActions, t: number): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const track of compiled.tracks) (out[track.target] ??= {})[track.channel] = evaluateTrack(track, t);
  return out;
}
