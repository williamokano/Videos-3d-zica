/**
 * Direction in code. An episode script says what happens in order ("Ana walks to the door, opens it, goes out")
 * and this module works out when: each step starts where the one before it ended, and how long a step takes
 * comes from the world (a walk lasts as long as its route). The result is a plain Episode, the same data an
 * episode written by hand in JSON has.
 */
import '../actions/builtin';
import '../actions/character';
import '../actions/phone';
import { compileActions, type ActionClip, type Ease, type WalkPath } from '../actions/catalog';
import type { CastMember } from '../character/cast';
import type { Bible } from '../bible';
import type { CharacterDef } from '../character/types';
import type { ChatMessage, PhoneSetup } from '../ui/phone';
import type { BuiltLocation } from '../world/build';
import { buildNav, findPath } from '../world/nav';
import { validateCamera, type CameraKey, type Vec3 } from './camera';
import type { Episode, EpisodeProp } from './episode';
import { WORLD, buildCast, buildProps, buildWorld, initialLinks } from './stage';

export interface ScriptHeader {
  episode: number;
  title: string;
  /** Location id (file name in world/). */
  location: string;
  cast: CastMember[];
  /** Things this episode adds to the location, e.g. a phone that starts in a pocket. */
  props?: EpisodeProp[];
  /** Length in seconds. Default: when the last thing ends, plus `tail`. */
  duration?: number;
  /** Seconds kept after the last thing ends (default 1). */
  tail?: number;
}

/** An episode written as a script. Lives in series/<series>/episodes/<n>.ts as the default export. */
export interface EpisodeScript extends ScriptHeader {
  script(d: Director): void;
}

export interface StepOptions {
  /** Seconds the step takes, instead of its own length. */
  duration?: number;
  ease?: Ease;
}

/** When a step happened. */
export interface Step {
  start: number;
  end: number;
}

type Point2 = [number, number];
type Shot = { pos: Vec3; lookAt: Vec3; fov?: number };

/** A character of the cast, as the script sees it. Every method is one step: it starts now and the clock moves to its end. */
export interface Actor {
  readonly id: string;
  /** Walk to a point, or up to a door (`{ door: id }`), within reach of its handle. */
  walkTo(to: Point2 | { door: string }, options?: StepOptions & { speed?: number; elevation?: number }): Step;
  /** Same as walkTo, running (4 m/s unless `speed` says otherwise). */
  runTo(to: Point2 | { door: string }, options?: StepOptions & { speed?: number; elevation?: number }): Step;
  /** Turn the body to a point, or to a heading in degrees (0 north, 90 west). */
  turnTo(to: Point2 | number, options?: StepOptions): Step;
  express(expression: string, options?: StepOptions & { amount?: number }): Step;
  /** Turn the head to another character, an object by id, or a point. */
  lookAt(target: Actor | string | Vec3, options?: StepOptions): Step;
  lookAhead(options?: StepOptions): Step;
  pickUp(item: string, options?: StepOptions & { hand?: 'left' | 'right' }): Step;
  /** Put a held item on a point, or on a seat of an object that then carries it. */
  putDown(item: string, where: Vec3 | { on: string; seat: string }, options?: StepOptions): Step;
  /** Open a door, or a `part` of a vehicle, by hand. */
  open(object: string, options?: StepOptions & { part?: string; amount?: number; hand?: 'left' | 'right' }): Step;
  close(object: string, options?: StepOptions & { part?: string; hand?: 'left' | 'right' }): Step;
  sit(on: string, seat?: string, options?: StepOptions): Step;
  standUp(to: Point2, options?: StepOptions & { yaw?: number }): Step;
  /** Speak a line: the mouth moves and the line is kept for subtitles and, later, voice. `to` is who it is said to. */
  say(text: string, options?: StepOptions & { to?: Actor | string }): Step;
  /**
   * What the character does by itself from now on, until told otherwise. Takes no time.
   * "chat" (with `group`), "attend" (`object`), "watch" (`point`), "write", "idle", "none".
   */
  behave(mode: 'chat' | 'attend' | 'watch' | 'write' | 'idle' | 'none', options?: { group?: string; object?: Actor | string; point?: Vec3 }): void;
  /** Put a held item in the pocket; `pickUp` takes it out again. */
  putAway(item: string, options?: StepOptions): Step;
  /** Lift what is in the hand to the eyes (to read a phone) or to the chest; stays up until `lower`. */
  raise(to?: 'eyes' | 'chest', options?: StepOptions): Step;
  lower(options?: StepOptions): Step;
  /** Point at another character, an object by id, or a point: arm out, eyes on it, arm back at the end. A longer `duration` holds it. */
  pointAt(target: Actor | string | Vec3, options?: StepOptions & { hand?: 'left' | 'right' }): Step;
  /** Hold the hands in a pose until told otherwise: "grip", "point", "fist", "open", "type", or "relaxed". */
  hand(pose: 'relaxed' | 'grip' | 'point' | 'fist' | 'open' | 'type', options?: StepOptions & { hand?: 'left' | 'right' | 'both' }): Step;
}

/** A phone of the episode, as the script sees it. None of these take time: they happen now. */
export interface Phone {
  readonly id: string;
  /** Contacts, history and clock. Call once, before anything else happens on the phone. */
  setup(setup: PhoneSetup): void;
  /** A message arrives in the open chat. */
  receive(text: string, options?: Omit<ChatMessage, 'from' | 'text'>): void;
  /** The owner's message goes out. */
  send(text: string, options?: Omit<ChatMessage, 'from' | 'text'>): void;
  /** The other side starts or stops typing ("…"). A message arriving also ends it. */
  typing(on: boolean): void;
  /** Show another chat. */
  open(chat: string): void;
  /** Light the screen up or turn it off. */
  screen(on: boolean): void;
  /** Force this phone on or off the network, whatever the world's signal is; null follows the world again. */
  network(on: boolean | null): void;
}

export interface Director {
  /** The clock: seconds from the start of the episode where the next step begins. */
  readonly now: number;
  actor(id: string): Actor;
  /** A phone declared in the episode's `props`. */
  phone(id: string): Phone;
  /** Any action of the catalog on any object, e.g. `d.do('carro', 'drive', { path })`. */
  do(target: string, action: string, params?: Record<string, unknown>, options?: StepOptions): Step;
  wait(seconds: number): void;
  /** Move the clock to a time. */
  at(time: number): void;
  /** Wait until a time, if it has not passed yet. Takes a time or a step (its end). */
  waitFor(when: number | Step): void;
  /** Things that happen at the same time: each branch starts now, and the clock ends at the last one to finish. */
  together(...branches: (() => void)[]): Step;
  /** Something that goes on while the script carries on: the clock stays where it was. */
  background(branch: () => void): Step;
  world: {
    /** Bring a rule of the bible into effect (true or 1), or out of it; with `duration`, gradually. */
    rule(id: string, on: boolean | number, options?: StepOptions): Step;
    /** Phones get or lose signal everywhere. */
    network(on: boolean, options?: StepOptions): Step;
  };
  camera: {
    /** Cut to a camera placed by hand. */
    cut(shot: Shot): void;
    /** Within the current shot, be here by now: the camera moves from where the shot started. In a shot attached to a character, only `fov`, `distance`, `height` and `pitch` apply. */
    moveTo(shot: Partial<Shot> & { distance?: number; height?: number; pitch?: number }): void;
    /** Cut to the eyes of a character. */
    fpv(who: Actor | string, options?: { fov?: number; pitch?: number }): void;
    /** Cut to behind and above a character, following them. */
    thirdPerson(who: Actor | string, options?: { distance?: number; height?: number; pitch?: number; fov?: number }): void;
  };
}

/** Declare an episode as a script. */
export function direct(header: ScriptHeader, script: (d: Director) => void): EpisodeScript {
  return { ...header, script };
}

export function isScript(episode: Episode | EpisodeScript): episode is EpisodeScript {
  return typeof (episode as EpisodeScript).script === 'function';
}

const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
const round = (t: number): number => Math.round(t * 1000) / 1000;

/** Run a script against its location and turn it into an Episode with every time worked out. */
export function resolveScript(source: EpisodeScript, built: BuiltLocation, characters: CharacterDef[], bible?: Bible): Episode {
  const { script, tail, duration, ...header } = source;
  const cast = buildCast({ ...header, duration: 0, camera: [] }, characters);
  const targets = [...built.interactives, ...cast, buildWorld(bible, header.episode), ...buildProps(header)];
  const initial = { links: initialLinks(header) };
  const nav = cast.length ? buildNav(built) : undefined;
  // Every step compiles the track again to learn its length; routes are worked out once.
  const routes = new Map<string, WalkPath | null>();
  const services = {
    findPath: nav && ((from: [number, number, number], to: Point2, elevation: number) => {
      const key = JSON.stringify([from, to, elevation]);
      if (!routes.has(key)) routes.set(key, findPath(nav, from, to, elevation));
      return routes.get(key)!;
    }),
  };

  const clips: ActionClip[] = [];
  const keys: CameraKey[] = [];
  let now = 0;
  let last = 0;

  const run = (target: string, action: string, params: Record<string, unknown> = {}, options: StepOptions = {}): Step => {
    const clip: ActionClip = clean({ t: round(now), target, action, params: clean(params), duration: options.duration, ease: options.ease });
    clips.push(clip);
    try {
      const compiled = compileActions(clips, targets, services, initial);
      clip.duration = round(compiled.clips.find((c) => c.index === clips.length - 1)!.duration);
    } catch (error) {
      clips.pop();
      throw error;
    }
    const step = { start: clip.t, end: round(clip.t + clip.duration) };
    now = step.end;
    last = Math.max(last, now);
    return step;
  };

  const idOf = (who: Actor | string): string => (typeof who === 'string' ? who : who.id);
  /** Something that happens at this instant and does not move the clock. */
  const instant = (target: string, action: string, params: Record<string, unknown>): void => {
    const at = now;
    run(target, action, params, { duration: 0 });
    now = at;
  };
  const actor = (id: string): Actor => {
    if (!cast.some((c) => c.id === id)) throw new Error(`"${id}" não está no elenco do episódio. Elenco: ${cast.map((c) => c.id).join(', ') || 'vazio'}.`);
    const walk = (to: Point2 | { door: string }, speed: number | undefined, options: StepOptions & { elevation?: number } = {}): Step =>
      run(id, 'walkTo', { ...(Array.isArray(to) ? { to } : to), speed, elevation: options.elevation }, options);
    return {
      id,
      walkTo: (to, options) => walk(to, options?.speed, options),
      runTo: (to, options) => walk(to, options?.speed ?? 4, options),
      turnTo: (to, options) => run(id, 'turnTo', typeof to === 'number' ? { yaw: to } : { to }, options),
      express: (expression, options) => run(id, 'express', { expression, amount: options?.amount }, options),
      lookAt: (target, options) => run(id, 'lookAt', Array.isArray(target) ? { point: target } : { object: typeof target === 'string' ? target : target.id }, options),
      lookAhead: (options) => run(id, 'lookAt', {}, options),
      pickUp: (item, options) => run(item, 'pickUp', { by: id, hand: options?.hand }, options),
      putDown: (item, where, options) => run(item, 'putDown', Array.isArray(where) ? { at: where } : where, options),
      open: (object, options) => run(object, 'open', { by: id, part: options?.part, amount: options?.amount, hand: options?.hand }, options),
      close: (object, options) => run(object, 'close', { by: id, part: options?.part, hand: options?.hand }, options),
      sit: (on, seat, options) => run(id, 'sit', { on, seat }, options),
      standUp: (to, options) => run(id, 'standUp', { to, yaw: options?.yaw }, options),
      say: (text, options) => run(id, 'say', { text, to: options?.to === undefined ? undefined : idOf(options.to) }, options),
      behave: (mode, options) => instant(id, 'behave', { mode, group: options?.group, object: options?.object === undefined ? undefined : idOf(options.object), point: options?.point }),
      putAway: (item, options) => run(item, 'putAway', {}, options),
      raise: (to, options) => run(id, 'raise', { to }, options),
      lower: (options) => run(id, 'lower', {}, options),
      pointAt: (target, options) => run(id, 'pointAt', { ...(Array.isArray(target) ? { point: target } : { object: idOf(target) }), hand: options?.hand }, options),
      hand: (pose, options) => run(id, 'hand', { pose, hand: options?.hand }, options),
    };
  };

  const key = (k: Omit<CameraKey, 't'>): void => {
    keys.push(clean({ t: round(now), ...k }));
    last = Math.max(last, now);
  };

  const phone = (id: string): Phone => {
    const event = (type: string, data: object) => instant(id, 'screen', { event: type, data });
    return {
      id,
      setup: (setup) => event('setup', setup),
      receive: (text, options) => event('message', { ...options, from: 'them', text }),
      send: (text, options) => event('message', { ...options, from: 'me', text }),
      typing: (on) => event('typing', { on }),
      open: (chat) => event('open', { chat }),
      screen: (on) => event('screen', { on }),
      network: (on) => instant(id, 'set', { channel: 'network', value: on === null ? -1 : Number(on) }),
    };
  };

  const director: Director = {
    get now() {
      return now;
    },
    actor,
    phone,
    do: run,
    wait(seconds) {
      if (!(seconds >= 0)) throw new Error(`wait: os segundos precisam ser zero ou mais, e veio ${seconds}.`);
      now = round(now + seconds);
      last = Math.max(last, now);
    },
    at(time) {
      if (!(time >= 0)) throw new Error(`at: o tempo precisa ser zero ou mais, e veio ${time}.`);
      now = round(time);
    },
    waitFor(when) {
      now = Math.max(now, typeof when === 'number' ? when : when.end);
      last = Math.max(last, now);
    },
    together(...branches) {
      const start = now;
      let end = start;
      for (const branch of branches) {
        now = start;
        branch();
        end = Math.max(end, now);
      }
      now = end;
      return { start, end };
    },
    background(branch) {
      const start = now;
      branch();
      const end = now;
      now = start;
      return { start, end };
    },
    world: {
      rule: (id, on, options) => run(WORLD, 'set', { channel: `rule.${id}`, value: Number(on) }, { duration: 0, ...options }),
      network: (on, options) => run(WORLD, 'set', { channel: 'network', value: Number(on) }, { duration: 0, ...options }),
    },
    camera: {
      cut: (shot) => key({ ...shot, cut: keys.length > 0 || undefined }),
      moveTo: (shot) => key(shot),
      fpv: (who, options) => key({ ...options, cut: keys.length > 0 || undefined, mode: 'fpv', follow: idOf(who) }),
      thirdPerson: (who, options) => key({ ...options, cut: keys.length > 0 || undefined, mode: 'third_person', follow: idOf(who) }),
    },
  };
  script(director);

  if (!keys.length) throw new Error('O roteiro não tem câmera: comece com d.camera.cut(...), d.camera.fpv(...) ou d.camera.thirdPerson(...).');
  // Keys written out of order (inside a background branch) go to their place; equal times keep the order they were written in.
  const camera = keys.map((k, i) => ({ k, i })).sort((a, b) => a.k.t - b.k.t || a.i - b.i).map(({ k }) => k);
  validateCamera(camera, cast.map((c) => c.id));
  return { ...header, duration: duration ?? round(last + (tail ?? 1)), camera, actions: clips };
}
