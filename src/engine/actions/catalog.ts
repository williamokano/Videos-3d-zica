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
  /**
   * Hinged parts (car doors), in the object's own frame: where the hinge is ([x, z]), how long the leaf is, the
   * side it swings out to (1 for +x, -1 for -x) and how far, in radians. Closed, the leaf runs from the hinge toward +z.
   */
  parts?: Record<string, { hinge: [number, number]; length: number; side: number; angle: number }>;
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

export type ParamType = 'number' | 'string' | 'boolean' | 'point2' | 'point3' | 'path' | 'points' | 'data';

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

import { ambientAt, type Behaviour, type GazeSpec } from './ambient';

/** Something that happened to an object at a time; the object decides how to show it. */
export interface StageEvent {
  target: string;
  t: number;
  type: string;
  data: Record<string, unknown>;
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
  /** Attach an object (default: the target) to a socket of another, from the start of the clip, its end, or a point of its progress (0 to 1). */
  attach?: { target?: string; to: string; socket: string; weight?: string; at?: 'start' | 'end' | number };
  /** Things that happen to an object at the start of the clip and that it shows its own way (a message arriving on a phone). */
  events?: { target?: string; type: string; data?: Record<string, unknown> }[];
  /** What the target does by itself from now on (see ambient.ts). */
  behaviour?: Omit<Behaviour, 'target' | 't0'>;
  /** Turn the target's head to an object (by id) or a point; null looks ahead again. It takes the clip's length to get there, or `fade` seconds. */
  gaze?: { at: string | [number, number, number] | null; fade?: number };
  /** Let an object (default: the target) go, at the end of the clip or at its start. */
  detach?: { target?: string; at?: 'start' | 'end' | number };
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
  /** What undirected characters do by themselves. */
  behaviours: Behaviour[];
  /** Things that happened to objects, in time order. */
  events: StageEvent[];
  /** Where to look to look at each object: a fixed place for doors, and how far above its position otherwise. */
  focus: Record<string, { base?: [number, number, number]; up: number }>;
  /** Channel values before any action, by object. */
  initial: Record<string, Record<string, number>>;
  sockets: Record<string, Record<string, [number, number, number]>>;
  /** Body size of each character, relative to the standard one. */
  scales: Record<string, number>;
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
  /** Points [x, z] or [x, z, level]. */
  points: (v) => Array.isArray(v) && v.every((p) => isPoint(p, 2) || isPoint(p, 3)),
  data: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
};

/**
 * Turn the episode's action clips into channel tracks. Throws with a message that names the clip
 * when an action does not exist, does not fit its target, has bad params or overlaps another one.
 */
export function compileActions(clips: ActionClip[], targets: ActionTarget[], services: ActionServices = {}, initial: { links?: Link[] } = {}): CompiledActions {
  const byId = new Map(targets.map((t) => [t.id, t]));
  const tracks = new Map<string, ChannelTrack>();
  const compiled: CompiledClip[] = [];
  const links: Link[] = (initial.links ?? []).map((l) => ({ ...l }));
  const out: CompiledActions = {
    tracks: [],
    clips: compiled,
    links,
    gazes: [],
    events: [],
    behaviours: [],
    focus: Object.fromEntries(targets.map((t) => [t.id, { base: t.traits.door?.handle, up: t.traits.door ? 0 : (t.traits.eyeHeight ?? (t.traits.size ? t.traits.size[1] / 2 : 0.8)) }])),
    initial: Object.fromEntries(targets.map((t) => [t.id, t.channels])),
    sockets: Object.fromEntries(targets.filter((t) => t.traits.sockets).map((t) => [t.id, t.traits.sockets!])),
    scales: Object.fromEntries(targets.filter((t) => t.traits.bodyScale).map((t) => [t.id, t.traits.bodyScale!])),
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
    const moment = (at: 'start' | 'end' | number): number => clip.t + duration * (at === 'start' ? 0 : at === 'end' ? 1 : at);
    if (result.detach) {
      const link = linkOf(result.detach.target ?? target.id);
      if (link) link.t1 = moment(result.detach.at ?? 'end');
    }
    for (const event of result.events ?? []) {
      out.events.push({ target: event.target ?? target.id, t: clip.t, type: event.type, data: event.data ?? {} });
    }
    if (result.attach) {
      const { to, socket, weight } = result.attach;
      const rider = result.attach.target ?? target.id;
      const t0 = moment(result.attach.at ?? 'start');
      const busy = links.find((l) => l.target === rider && l.t1 > t0);
      if (busy) fail(`"${rider}" já está preso a "${busy.to}"; solte antes.`);
      const taken = links.find((l) => l.to === to && l.socket === socket && l.t1 > t0);
      if (taken) fail(`"${socket}" de "${to}" já está ocupado por "${taken.target}".`);
      links.push({ target: rider, to, socket, weight, t0, t1: Infinity });
    }
    if (result.behaviour) out.behaviours.push({ ...result.behaviour, target: target.id, t0: clip.t });
    if (result.gaze) out.gazes.push({ target: target.id, at: result.gaze.at, t0: clip.t, fade: Math.min(duration, result.gaze.fade ?? duration) });
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
  out.events.sort((a, b) => a.t - b.t);
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

/** How far a character's upper body comes down when it sits: the hips go from standing height to the seat. */
export function seatedDrop(compiled: CompiledActions, id: string, t: number): number {
  return 0.82 * (compiled.scales[id] ?? 0) * channelAt(compiled, id, 'sit', t);
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
  if (!link || depth > 4) return { pos, yaw };
  let offset = compiled.sockets[link.to]?.[link.socket];
  const side = link.socket.match(/^hand([LR])$/)?.[1];
  if (!offset && (side || link.socket === 'pocket')) {
    // In a hand or a pocket: about where that is on the body. The scene puts it exactly on the hand.
    const of = (channel: string) => channelAt(compiled, link.to, channel, t);
    const sign = side === 'L' ? -1 : 1;
    const carried = [sign * 0.2, 1.0, -0.25];
    const raised = of(`reach${side}.local`) > 0.5 ? of(`reach${side}`) : 0;
    // Raised to be read, the hand turns its palm to the face and holds the thing a little above and in front
    // of the wrist (measured on the built body: 2 cm toward the middle, 5 cm up, 3 cm forward).
    const held = [-sign * 0.022, 0.049, -0.028];
    const at = side ? carried.map((v, i) => v + (of(`reach${side}.${'xyz'[i]}`) + held[i] - v) * raised) : [0.17, 0.86, 0];
    const scale = compiled.scales[link.to] ?? 1;
    offset = [at[0] * scale, at[1] * scale - seatedDrop(compiled, link.to, t), at[2] * scale];
  }
  if (!offset) return { pos, yaw };
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
  return [pos[0], pos[1] + (focus?.up ?? 0) - seatedDrop(compiled, id, t), pos[2]];
}

const MAX_HEAD_TURN = 75;
const MAX_HEAD_TILT = 40;

/** Head turn that points the eyes at `point`, for a body heading `bodyYaw`: degrees, `yaw` to the left, `pitch` up, within what a neck can do. */
export function headAngles(eye: [number, number, number], bodyYaw: number, point: [number, number, number]): { yaw: number; pitch: number } {
  const [dx, dy, dz] = [point[0] - eye[0], point[1] - eye[1], point[2] - eye[2]];
  const flat = Math.hypot(dx, dz);
  if (flat < 1e-6 && Math.abs(dy) < 1e-6) return { yaw: 0, pitch: 0 };
  const heading = (Math.atan2(-dx, -dz) * 180) / Math.PI;
  const yaw = ((((heading - bodyYaw) % 360) + 540) % 360) - 180;
  const pitch = (Math.atan2(dy, flat) * 180) / Math.PI;
  return { yaw: Math.max(-MAX_HEAD_TURN, Math.min(MAX_HEAD_TURN, yaw)), pitch: Math.max(-MAX_HEAD_TILT, Math.min(MAX_HEAD_TILT, pitch)) };
}

/**
 * How far a character's head is turned from its body at time t, in degrees: `yaw` to the left,
 * `pitch` up. The neck has limits, so a target behind the back is looked at over the shoulder.
 */
export function gazeAt(compiled: CompiledActions, id: string, t: number): { yaw: number; pitch: number } {
  let i = compiled.gazes.length - 1;
  while (i >= 0 && (compiled.gazes[i].target !== id || compiled.gazes[i].t0 > t)) i--;
  const own = placementAt(compiled, id, t);
  const eye = focusAt(compiled, id, t);
  const toward = (at: string | [number, number, number]): { yaw: number; pitch: number } => headAngles(eye, own.yaw, typeof at === 'string' ? focusAt(compiled, at, t) : at);
  const mix = (from: { yaw: number; pitch: number }, to: { yaw: number; pitch: number }, w: number) => ({
    yaw: from.yaw + (to.yaw - from.yaw) * w,
    pitch: from.pitch + (to.pitch - from.pitch) * w,
  });
  // With nobody directing the head, it does what the character's behaviour says.
  // Walking, a head nobody directs leads into the turns of the path.
  const lead = channelAt(compiled, id, 'lead', t);
  const undirected = (): { yaw: number; pitch: number } => {
    if (!compiled.behaviours.length) return { yaw: lead, pitch: 0 };
    const { gaze } = ambientAt(compiled.behaviours, id, t);
    const angles = (spec: GazeSpec) => (spec === null ? { yaw: lead, pitch: 0 } : 'at' in spec ? toward(spec.at) : { yaw: spec.yaw + lead, pitch: spec.pitch });
    return mix(angles(gaze.from), angles(gaze.to), gaze.blend);
  };
  const angles = (gaze: Gaze | undefined) => (!gaze || gaze.at === null ? undirected() : toward(gaze.at));
  if (i < 0) return undirected();
  const gaze = compiled.gazes[i];
  let k = i - 1;
  while (k >= 0 && compiled.gazes[k].target !== id) k--;
  const u = gaze.fade > 0 ? Math.max(0, Math.min(1, (t - gaze.t0) / gaze.fade)) : 1;
  return mix(angles(compiled.gazes[k]), angles(gaze), u * u * (3 - 2 * u));
}
