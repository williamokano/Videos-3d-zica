/**
 * Action track: things that happen to interactive objects over time (a door opens, a car
 * drives, a box is put in a trunk). Actions are compiled into per-object tracks, and the
 * state of every object at an instant is a pure function of those tracks and t, so the
 * timeline can be scrubbed to any frame.
 */
import type { Pose, TargetInfo } from '../world/interactive';

export interface Action {
  /** Seconds from the start of the episode. */
  t: number;
  /** Id of a door or named prop. */
  target: string;
  /** Name of an action in the catalog, e.g. "open". */
  action: string;
  /** Seconds the action takes; each action has its own default. */
  duration?: number;
  params?: Record<string, unknown>;
}

interface ChannelSegment {
  t0: number;
  t1: number;
  to: number;
}

type MotionEvent =
  | { t0: number; t1: number; points: [number, number][] }
  | { t0: number; place: Partial<Pose> };

interface AttachEvent {
  t: number;
  /** "<object id>.<anchor>", or null when released. */
  to: string | null;
}

export interface CompiledActions {
  targets: TargetInfo[];
  channels: Map<string, ChannelSegment[]>;
  motions: Map<string, MotionEvent[]>;
  attachments: Map<string, AttachEvent[]>;
}

export interface ObjectState {
  channels: Record<string, number>;
  /** Present for objects that have a pose (named props). */
  pose?: Pose;
  /** Anchor the object is riding on, as "<object id>.<anchor>". */
  attachedTo?: string;
}

// ---- Catalog ----

export interface ActionContext {
  action: Action;
  target: TargetInfo;
  duration: number;
  param<T>(name: string): T | undefined;
  fail(message: string): never;
  /** Animate one of the target's channels to a value over the action's duration. */
  channel(name: string, to: number): void;
  /** Move the target through [x, z] waypoints, starting from wherever it is. */
  move(points: [number, number][]): void;
  /** Put the target somewhere instantly. */
  place(pose: Partial<Pose>): void;
  /** Make the target ride on another object's anchor, or release it with null. */
  attach(to: string | null): void;
  findTarget(id: string): TargetInfo | undefined;
}

export interface ActionDef {
  description: string;
  defaultDuration: number;
  compile(ctx: ActionContext): void;
}

const catalog = new Map<string, ActionDef>();

/** Add an action to the catalog. Check `listActions()` before creating a new one. */
export function registerAction(name: string, def: ActionDef): void {
  if (catalog.has(name)) throw new Error(`Action already registered: ${name}`);
  catalog.set(name, def);
}

export function listActions(): { name: string; description: string }[] {
  return [...catalog].map(([name, def]) => ({ name, description: def.description }));
}

/** Channel an open/close action drives: "open" on doors, or a named part such as "door.fl" on a car. */
function openable(ctx: ActionContext): string {
  const name = ctx.param<string>('part') ?? 'open';
  if (!(name in ctx.target.channels)) {
    ctx.fail(`it has no "${name}" to open or close (available: ${Object.keys(ctx.target.channels).join(', ') || 'none'})`);
  }
  return name;
}

registerAction('open', {
  description: 'Abre uma porta (de abrir, de correr ou de enrolar) ou uma parte que abre de um objeto. params: part (ex.: "door.fl" num carro), amount (0–1), from ("inside" | "outside": de que lado está quem abre)',
  defaultDuration: 1,
  compile(ctx) {
    const from = ctx.param<string>('from') ?? 'inside';
    const allowed = ctx.target.opensFrom ?? 'both';
    if (allowed !== 'both' && allowed !== from) return ctx.fail(`it only opens from the ${allowed}, and this action opens it from the ${from}`);
    ctx.channel(openable(ctx), ctx.param<number>('amount') ?? 1);
  },
});

registerAction('close', {
  description: 'Fecha uma porta ou uma parte que abre de um objeto. params: part',
  defaultDuration: 1,
  compile(ctx) {
    ctx.channel(openable(ctx), 0);
  },
});

registerAction('set', {
  description: 'Leva qualquer canal do objeto a um valor. params: channel, to',
  defaultDuration: 1,
  compile(ctx) {
    const name = ctx.param<string>('channel');
    const to = ctx.param<number>('to');
    if (!name || typeof to !== 'number') return ctx.fail('it needs params "channel" and "to"');
    if (!(name in ctx.target.channels)) return ctx.fail(`it has no channel "${name}" (available: ${Object.keys(ctx.target.channels).join(', ') || 'none'})`);
    ctx.channel(name, to);
  },
});

registerAction('move', {
  description: 'Desloca um objeto (um carro andando, uma caixa empurrada) por pontos [x, z], virado para onde vai. params: path ([[x, z], ...]) ou to ([x, z])',
  defaultDuration: 3,
  compile(ctx) {
    const to = ctx.param<[number, number]>('to');
    const path = ctx.param<[number, number][]>('path') ?? (to ? [to] : undefined);
    if (!path?.length) return ctx.fail('it needs params "path" or "to"');
    ctx.move(path);
  },
});

registerAction('attach', {
  description: 'Prende um objeto a um ponto de outro (caixa no porta-malas, depois: objeto na mão). params: to ("<id>.<âncora>")',
  defaultDuration: 0,
  compile(ctx) {
    const to = ctx.param<string>('to');
    if (!to) return ctx.fail('it needs param "to" as "<object id>.<anchor>"');
    const dot = to.indexOf('.');
    const holder = ctx.findTarget(to.slice(0, dot));
    if (dot < 0 || !holder) return ctx.fail(`"${to}" does not name an object; use "<object id>.<anchor>"`);
    const anchor = to.slice(dot + 1);
    if (!holder.anchors.includes(anchor)) return ctx.fail(`"${holder.id}" has no anchor "${anchor}" (available: ${holder.anchors.join(', ') || 'none'})`);
    ctx.attach(to);
  },
});

registerAction('detach', {
  description: 'Solta um objeto preso e o coloca num lugar. params: at ([x, z]), y, rot',
  defaultDuration: 0,
  compile(ctx) {
    const at = ctx.param<[number, number]>('at');
    if (!at) return ctx.fail('it needs param "at" as [x, z]: where the object is put down');
    ctx.attach(null);
    ctx.place({ x: at[0], z: at[1], y: ctx.param<number>('y') ?? 0, rot: ctx.param<number>('rot') });
  },
});

// ---- Compile ----

export function compileActions(actions: Action[], targets: TargetInfo[]): CompiledActions {
  const byId = new Map(targets.map((t) => [t.id, t]));
  const compiled: CompiledActions = { targets, channels: new Map(), motions: new Map(), attachments: new Map() };
  const push = <T>(map: Map<string, T[]>, key: string, item: T) => map.set(key, [...(map.get(key) ?? []), item]);

  for (const action of [...actions].sort((a, b) => a.t - b.t)) {
    const where = `Action "${action.action}" on "${action.target}" at ${action.t}s`;
    const fail = (message: string): never => {
      throw new Error(`${where}: ${message}.`);
    };
    const def = catalog.get(action.action);
    if (!def) throw new Error(`${where}: unknown action. Known: ${[...catalog.keys()].join(', ')}.`);
    const target = byId.get(action.target);
    if (!target) throw new Error(`${where}: unknown target. Known: ${[...byId.keys()].join(', ')}.`);
    const duration = action.duration ?? def.defaultDuration;
    const t1 = action.t + duration;

    def.compile({
      action,
      target,
      duration,
      fail,
      param: <T>(name: string) => action.params?.[name] as T | undefined,
      findTarget: (id) => byId.get(id),
      channel(name, to) {
        const key = `${target.id}|${name}`;
        const last = compiled.channels.get(key)?.at(-1);
        if (last && action.t < last.t1) fail(`"${name}" is still being changed by an action that ends at ${last.t1}s`);
        push(compiled.channels, key, { t0: action.t, t1, to });
      },
      move(points) {
        if (!target.pose) fail('only named props can be moved');
        const last = compiled.motions.get(target.id)?.at(-1);
        if (last && 't1' in last && action.t < last.t1) fail(`it is still moving until ${last.t1}s`);
        push(compiled.motions, target.id, { t0: action.t, t1, points });
      },
      place(pose) {
        if (!target.pose) fail('only named props can be placed');
        push(compiled.motions, target.id, { t0: action.t, place: pose });
      },
      attach(to) {
        if (!target.pose) fail('only named props can be attached');
        push(compiled.attachments, target.id, { t: action.t, to });
      },
    });
  }
  return compiled;
}

// ---- Evaluate ----

const smooth = (u: number) => u * u * (3 - 2 * u);

function channelAt(initial: number, segments: ChannelSegment[] | undefined, t: number): number {
  let value = initial;
  for (const s of segments ?? []) {
    if (t < s.t0) break;
    if (t >= s.t1) {
      value = s.to;
      continue;
    }
    return value + (s.to - value) * smooth((t - s.t0) / (s.t1 - s.t0));
  }
  return value;
}

/** Point at distance d along a polyline. */
function along(points: [number, number][], d: number): [number, number] {
  for (let i = 1; i < points.length; i++) {
    const len = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (d <= len || i === points.length - 1) {
      const u = len ? Math.min(1, Math.max(0, d / len)) : 0;
      return [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * u, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * u];
    }
    d -= len;
  }
  return points[0];
}

/** Pose and total distance travelled at t. */
function poseAt(initial: Pose, events: MotionEvent[] | undefined, t: number): { pose: Pose; travelled: number } {
  const pose = { ...initial };
  let travelled = 0;
  for (const e of events ?? []) {
    if (t < e.t0) break;
    if ('place' in e) {
      for (const [k, v] of Object.entries(e.place)) if (v !== undefined) pose[k as keyof Pose] = v;
      continue;
    }
    const points: [number, number][] = [[pose.x, pose.z], ...e.points];
    let total = 0;
    for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (total === 0) continue;
    const u = t >= e.t1 ? 1 : smooth((t - e.t0) / (e.t1 - e.t0));
    const d = u * total;
    [pose.x, pose.z] = along(points, d);
    // Face the direction of travel, looking a little ahead so corners turn instead of snapping.
    const a = along(points, Math.max(0, d - 0.75));
    const b = along(points, Math.min(total, d + 0.75));
    pose.rot = (Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) * 180) / Math.PI;
    travelled += d;
    if (t < e.t1) break;
  }
  return { pose, travelled };
}

/** State of every interactive object at time t. */
export function evaluateActions(compiled: CompiledActions, t: number): Map<string, ObjectState> {
  const out = new Map<string, ObjectState>();
  for (const target of compiled.targets) {
    const state: ObjectState = { channels: {} };
    for (const [name, initial] of Object.entries(target.channels)) {
      state.channels[name] = channelAt(initial, compiled.channels.get(`${target.id}|${name}`), t);
    }
    if (target.pose) {
      const { pose, travelled } = poseAt(target.pose, compiled.motions.get(target.id), t);
      state.pose = pose;
      // Objects with wheels expose "travel"; it follows the distance moved unless an action drives it directly.
      if ('travel' in target.channels && !compiled.channels.has(`${target.id}|travel`)) state.channels.travel = travelled;
      let attached: string | null = null;
      for (const a of compiled.attachments.get(target.id) ?? []) if (a.t <= t) attached = a.to;
      if (attached) state.attachedTo = attached;
    }
    out.set(target.id, state);
  }
  return out;
}
