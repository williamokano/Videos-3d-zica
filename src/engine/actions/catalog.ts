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
  /** Characters: size relative to the standard 1.7 m body. */
  bodyScale?: number;
  /** Fixed places on the object where something can be attached (car seats): name → [x, y, z] in the object's own frame. */
  sockets?: Record<string, [number, number, number]>;
  /** Items: [width, height, depth] in meters. */
  size?: [number, number, number];
  /** Doors: where the handle is when the door is closed, and the direction that points into the room that declares it. */
  door?: { handle: [number, number, number]; center: [number, number, number]; inside: [number, number]; width: number };
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
  /** Object whose channel moves. Defaults to the clip's target. */
  target?: string;
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

/** One object riding on another: a character in a car seat, an item in a hand. */
export interface Link {
  /** The object that rides. */
  target: string;
  /** The object it rides on, and the place on it. */
  to: string;
  socket: string;
  /** Channel of `target` that says how attached it is, from 0 (where its own channels put it) to 1 (on the socket). Without it, fully attached. */
  weight?: string;
  t0: number;
  /** When it lets go; Infinity while still attached at the end. */
  t1: number;
}

/** A character keeping its head turned to something, from t0 until the next gaze of the same character. */
export interface Gaze {
  target: string;
  /** Id of an object to follow, a fixed point of the location, or null to look ahead again. */
  at: string | [number, number, number] | null;
  t0: number;
  /** Seconds the head takes to get there. */
  fade: number;
}

export interface ActionContext {
  services: ActionServices;
  target: ActionTarget;
  params: Record<string, unknown>;
  /** Value of a channel when the clip starts. `of` names another object. */
  current(channel: string, of?: string): number;
  /** Another object of the scene; fails with a clear message when it does not exist. */
  object(id: string): ActionTarget;
  /** Id of what rides on a socket when the clip starts, if anything. */
  riderOn(to: string, socket: string): string | undefined;
  /** What the object is riding on when the clip starts, if anything. */
  linkOf(id: string): Link | undefined;
  /** Where the object is when the clip starts, following what it rides on: [x, y, z] and heading. */
  placeOf(id: string): { pos: [number, number, number]; yaw: number };
  fail(message: string): never;
}

export interface ActionResult {
  writes: ChannelWrite[];
  duration?: number;
  /** Attach an object (default: the target) to a socket of another, from the start of the clip or from its end. */
  attach?: { target?: string; to: string; socket: string; weight?: string; at?: 'start' | 'end' };
  /** Turn the target's head to an object (by id) or a point; null looks ahead again. */
  gaze?: { at: string | [number, number, number] | null };
  /** Let an object (default: the target) go, at the end of the clip or at its start. */
  detach?: { target?: string; at?: 'start' | 'end' };
  validate?(ctx: ValidateContext): void;
}

export interface ActionDef {
  id: string;
  description: string;
  /** Object kinds the action applies to; "*" is any. */
  appliesTo: string[];
  params: Record<string, ParamSpec>;
  /** Default length in seconds. */
  duration: number;
  compile(ctx: ActionContext): ActionResult;
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
  /** Position of the clip in the list that was compiled. */
  index: number;
  t: number;
  duration: number;
  target: string;
  action: string;
}

export interface CompiledActions {
  tracks: ChannelTrack[];
  /** Clips in time order with their final durations, for timeline markers. */
  clips: CompiledClip[];
  links: Link[];
  gazes: Gaze[];
  /** Where to look to look at each object: a fixed place for doors, and how far above its position otherwise. */
  focus: Record<string, { base?: [number, number, number]; up: number }>;
  /** Channel values before any action, by object. */
  initial: Record<string, Record<string, number>>;
  sockets: Record<string, Record<string, [number, number, number]>>;
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
  const links: Link[] = [];
  const out: CompiledActions = {
    tracks: [],
    clips: compiled,
    links,
    gazes: [],
    focus: Object.fromEntries(targets.map((t) => [t.id, { base: t.traits.door?.handle, up: t.traits.door ? 0 : (t.traits.eyeHeight ?? (t.traits.size ? t.traits.size[1] / 2 : 0.8)) }])),
    initial: Object.fromEntries(targets.map((t) => [t.id, t.channels])),
    sockets: Object.fromEntries(targets.filter((t) => t.traits.sockets).map((t) => [t.id, t.traits.sockets!])),
  };
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

    const object = (id: string): ActionTarget => byId.get(id) ?? fail(`objeto "${id}" não encontrado. Objetos com id: ${[...byId.keys()].join(', ')}.`);
    const trackOf = (channel: string, of = target.id): ChannelTrack => {
      const key = `${of}\n${channel}`;
      let track = tracks.get(key);
      if (!track) {
        const owner = object(of);
        if (!(channel in owner.channels)) {
          fail(`"${of}" não tem o canal "${channel}". Canais: ${Object.keys(owner.channels).join(', ')}.`);
        }
        track = { target: of, channel, initial: owner.channels[channel], segments: [] };
        tracks.set(key, track);
        out.tracks.push(track);
      }
      return track;
    };
    const current = (channel: string, of?: string): number => {
      const track = trackOf(channel, of);
      return track.segments.at(-1)?.end ?? track.initial;
    };
    const linkOf = (id: string): Link | undefined => links.find((l) => l.target === id && l.t1 > clip.t);
    const riderOn = (to: string, socket: string) => links.find((l) => l.to === to && l.socket === socket && l.t1 > clip.t)?.target;
    const placeOf = (id: string) => placementAt(out, id, clip.t);

    const result = def.compile({ services, target, params, current, object, linkOf, riderOn, placeOf, fail });
    const duration = clip.duration ?? result.duration ?? def.duration;
    if (!isNumber(duration) || duration < 0) fail('"duration" precisa ser um número de segundos maior ou igual a zero.');
    const ease = EASES[clip.ease ?? 'inOut'];

    for (const write of result.writes) {
      const track = trackOf(write.channel, write.target);
      const from = current(write.channel, write.target);
      const last = track.segments.at(-1);
      if (last && clip.t < last.t1 - 1e-9) {
        fail(`o canal "${write.channel}" de "${track.target}" ainda está em uso por outra ação até ${last.t1}s.`);
      }
      const to = write.to ?? from;
      const at = write.at ?? ((u: number) => from + (to - from) * u);
      track.segments.push({ t0: clip.t, t1: clip.t + duration, at: (u) => at(ease(u)), end: at(1) });
    }
    if (result.detach) {
      const link = linkOf(result.detach.target ?? target.id);
      if (link) link.t1 = result.detach.at === 'start' ? clip.t : clip.t + duration;
    }
    if (result.attach) {
      const { to, socket, weight } = result.attach;
      const rider = result.attach.target ?? target.id;
      const t0 = result.attach.at === 'end' ? clip.t + duration : clip.t;
      const busy = links.find((l) => l.target === rider && l.t1 > t0);
      if (busy) fail(`"${rider}" já está preso a "${busy.to}"; solte antes.`);
      const taken = links.find((l) => l.to === to && l.socket === socket && l.t1 > t0);
      if (taken) fail(`"${socket}" de "${to}" já está ocupado por "${taken.target}".`);
      links.push({ target: rider, to, socket, weight, t0, t1: Infinity });
    }
    if (result.gaze) out.gazes.push({ target: target.id, at: result.gaze.at, t0: clip.t, fade: duration });
    compiled.push({ index, t: clip.t, duration, target: clip.target, action: clip.action });

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
  return out;
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

/** Value of one channel of one object at time t. */
export function channelAt(compiled: CompiledActions, target: string, channel: string, t: number): number {
  const track = compiled.tracks.find((k) => k.target === target && k.channel === channel);
  return track ? evaluateTrack(track, t) : (compiled.initial[target]?.[channel] ?? 0);
}

/** What each object is riding on at time t. */
export function evaluateLinks(compiled: CompiledActions, t: number): Link[] {
  return compiled.links.filter((l) => t >= l.t0 && t < l.t1);
}

/**
 * Where an object is at time t: its own x, y, z and yaw channels, pulled toward the socket it rides on
 * by the link's weight. Only fixed sockets count here; moving ones (a hand) are followed by the scene.
 */
export function placementAt(compiled: CompiledActions, id: string, t: number, depth = 0): { pos: [number, number, number]; yaw: number } {
  const own = (channel: string) => channelAt(compiled, id, channel, t);
  const pos: [number, number, number] = [own('x'), own('y'), own('z')];
  let yaw = own('yaw');
  const link = evaluateLinks(compiled, t).find((l) => l.target === id);
  const offset = link && compiled.sockets[link.to]?.[link.socket];
  if (!link || !offset || depth > 4) return { pos, yaw };
  const base = placementAt(compiled, link.to, t, depth + 1);
  const a = (base.yaw * Math.PI) / 180;
  const at = [
    base.pos[0] + offset[0] * Math.cos(a) + offset[2] * Math.sin(a),
    base.pos[1] + offset[1],
    base.pos[2] - offset[0] * Math.sin(a) + offset[2] * Math.cos(a),
  ];
  const w = link.weight ? Math.max(0, Math.min(1, own(link.weight))) : 1;
  for (let i = 0; i < 3; i++) pos[i] += (at[i] - pos[i]) * w;
  yaw += ((((base.yaw - yaw) % 360) + 540) % 360 - 180) * w;
  return { pos, yaw };
}

/** The point a character looks at to look at an object, at time t. */
export function focusAt(compiled: CompiledActions, id: string, t: number): [number, number, number] {
  const focus = compiled.focus[id];
  if (focus?.base) return focus.base;
  const { pos } = placementAt(compiled, id, t);
  // Seated, a character's eyes come down with the hips.
  const seated = 0.47 * (focus?.up ?? 0) * channelAt(compiled, id, 'sit', t);
  return [pos[0], pos[1] + (focus?.up ?? 0) - seated, pos[2]];
}

const MAX_HEAD_TURN = 75;
const MAX_HEAD_TILT = 40;

/**
 * How far a character's head is turned from its body at time t, in degrees: `yaw` to the left,
 * `pitch` up. The neck has limits, so a target behind the back is looked at over the shoulder.
 */
export function gazeAt(compiled: CompiledActions, id: string, t: number): { yaw: number; pitch: number } {
  let i = compiled.gazes.length - 1;
  while (i >= 0 && (compiled.gazes[i].target !== id || compiled.gazes[i].t0 > t)) i--;
  if (i < 0) return { yaw: 0, pitch: 0 };
  const own = placementAt(compiled, id, t);
  const eye = focusAt(compiled, id, t);
  const angles = (gaze: Gaze | undefined): { yaw: number; pitch: number } => {
    if (!gaze || gaze.at === null) return { yaw: 0, pitch: 0 };
    const p = typeof gaze.at === 'string' ? focusAt(compiled, gaze.at, t) : gaze.at;
    const [dx, dy, dz] = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
    const flat = Math.hypot(dx, dz);
    if (flat < 1e-6 && Math.abs(dy) < 1e-6) return { yaw: 0, pitch: 0 };
    const heading = (Math.atan2(-dx, -dz) * 180) / Math.PI;
    const yaw = ((((heading - own.yaw) % 360) + 540) % 360) - 180;
    const pitch = (Math.atan2(dy, flat) * 180) / Math.PI;
    return { yaw: Math.max(-MAX_HEAD_TURN, Math.min(MAX_HEAD_TURN, yaw)), pitch: Math.max(-MAX_HEAD_TILT, Math.min(MAX_HEAD_TILT, pitch)) };
  };
  const gaze = compiled.gazes[i];
  let k = i - 1;
  while (k >= 0 && compiled.gazes[k].target !== id) k--;
  const from = angles(compiled.gazes[k]);
  const to = angles(gaze);
  const u = gaze.fade > 0 ? Math.max(0, Math.min(1, (t - gaze.t0) / gaze.fade)) : 1;
  const w = u * u * (3 - 2 * u);
  return { yaw: from.yaw + (to.yaw - from.yaw) * w, pitch: from.pitch + (to.pitch - from.pitch) * w };
}
