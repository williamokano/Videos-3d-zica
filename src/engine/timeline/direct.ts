/**
 * Direction in code. An episode script says what happens in order ("Ana walks to the door, opens it, goes out")
 * and this module works out when: each step starts where the one before it ended, and how long a step takes
 * comes from the world (a walk lasts as long as its route). The result is a plain Episode, the same data an
 * episode written by hand in JSON has.
 */
import '../actions/builtin';
import '../actions/character';
import '../actions/moves';
import '../actions/gear';
import '../actions/phone';
import '../actions/audio';
import '../actions/endcard';
import '../actions/titlecard';
import '../actions/censor';
import '../actions/clock';
import { parseAmount, parseClock } from '../character/clock';
import { channelAt, compileActions, focusAt, placementAt, seatedDrop, type ActionClip, type Ease, type WalkPath } from '../actions/catalog';
import type { CastMember } from '../character/cast';
import type { Bible } from '../bible';
import type { CharacterDef } from '../character/types';
import { DEFAULT_MODEL, NARRATOR, spokenText, takeKey, type LineVoice, type Take } from '../audio/voice';
import type { ChatMessage, PhoneSetup } from '../ui/phone';
import type { EndCard } from '../ui/endcard';
import type { TitleCard } from '../ui/titlecard';
import { clearFraction, type BuiltLocation } from '../world/build';
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
type Shot = { pos: Vec3; lookAt: Vec3; fov?: number; lens?: number; shake?: number };
/** A camera that keeps a cast member in the middle of the picture while it moves from `from` to `to`. */
type Track = { from: Vec3; to?: Vec3; duration?: number; fov?: number; lens?: number; shake?: number; aimHeight?: number; cut?: boolean };
/** Two people seen from the side, both in the picture, the camera turning a little round them. */
/** A shot over the listener's shoulder at the speaker (see `d.camera.over`). */
type Over = { side?: 1 | -1; fov?: number; back?: number; cut?: boolean };
/** One turn of a conversation: who speaks, what, and how (see `d.conversa`). */
export type Turn = [who: Actor | string, text: string, options?: StepOptions & { tone?: string; gesture?: number }];
type TwoShot = { distance?: number; height?: number; swing?: number; duration?: number; side?: 1 | -1; fov?: number; turn?: number };

/** A character of the cast, as the script sees it. Every method is one step: it starts now and the clock moves to its end. */
export interface Actor {
  readonly id: string;
  /** Walk to a point, or up to a door (`{ door: id }`), within reach of its handle. */
  walkTo(to: Point2 | { door: string }, options?: StepOptions & { speed?: number; elevation?: number; via?: (Point2 | [number, number, number])[] }): Step;
  /** Same as walkTo, running (4 m/s unless `speed` says otherwise). */
  runTo(to: Point2 | { door: string }, options?: StepOptions & { speed?: number; elevation?: number; via?: (Point2 | [number, number, number])[] }): Step;
  /** Turn the body to a point, or to a heading in degrees (0 north, 90 west). */
  turnTo(to: Point2 | number, options?: StepOptions): Step;
  express(expression: string, options?: StepOptions & { amount?: number }): Step;
  /** Turn the head to another character, an object by id, or a point. */
  lookAt(target: Actor | string | Vec3, options?: StepOptions): Step;
  lookAhead(options?: StepOptions): Step;
  pickUp(item: string, options?: StepOptions & { hand?: 'left' | 'right'; bag?: boolean }): Step;
  /** Put a held item on a point, or on a seat of an object that then carries it. */
  putDown(item: string, where: Vec3 | { on: string; seat: string }, options?: StepOptions): Step;
  /** Open a door, or a `part` of a vehicle, by hand. */
  open(object: string, options?: StepOptions & { part?: string; amount?: number; hand?: 'left' | 'right' }): Step;
  close(object: string, options?: StepOptions & { part?: string; hand?: 'left' | 'right' }): Step;
  sit(on: string, seat?: string, options?: StepOptions): Step;
  standUp(to: Point2, options?: StepOptions & { yaw?: number }): Step;
  /**
   * Speak a line in the character's voice: the step lasts as long as the take (`npm run voz` makes the missing
   * ones) and the mouth follows it. `to` is who it is said to; `tone` is how ("sussurro", "nervoso", "grito",
   * "transe"... see TONES in audio/voice.ts) and stays out of the subtitle. `gesture: 0` keeps the hands still.
   */
  say(text: string, options?: StepOptions & { to?: Actor | string; tone?: string; gesture?: number; filter?: string }): Step;
  /**
   * What the character does by itself from now on, until told otherwise. Takes no time.
   * "chat" (with `group`), "attend" (`object`), "watch" (`point`), "trance" (`point`), "write", "idle", "none".
   * `mood` ("calm", "worried", "scared", "happy") sets the face the character keeps meanwhile.
   */
  behave(mode: 'chat' | 'attend' | 'watch' | 'trance' | 'write' | 'idle' | 'none', options?: { group?: string; object?: Actor | string; point?: Vec3; mood?: 'calm' | 'worried' | 'scared' | 'happy' }): void;
  /** Put a held item in the pocket; `pickUp` takes it out again. */
  putAway(item: string, options?: StepOptions & { bag?: boolean }): Step;
  /** Lift what is in the hand to the eyes (to read a phone) or to the chest; stays up until `lower`. */
  raise(to?: 'eyes' | 'chest', options?: StepOptions & { hand?: 'left' | 'right' }): Step;
  /** Turn the inside of the forearm up, where the clock is (hora-contada): `'self'` to read it, `'out'` to show it. Stays until `lower`. */
  showArm(to?: 'self' | 'out', options?: StepOptions & { hand?: 'left' | 'right' }): Step;
  lower(options?: StepOptions): Step;
  /** Point at another character, an object by id, or a point: arm out, eyes on it, arm back at the end. A longer `duration` holds it. */
  pointAt(target: Actor | string | Vec3, options?: StepOptions & { hand?: 'left' | 'right' }): Step;
  /** Hold the hands in a pose until told otherwise: "grip", "point", "fist", "open", "type", or "relaxed". */
  hand(pose: 'relaxed' | 'grip' | 'point' | 'fist' | 'open' | 'type', options?: StepOptions & { hand?: 'left' | 'right' | 'both' }): Step;
  /**
   * The clock on the arm (hora-contada). Balances are seconds or "AAAA:DDD:HH:MM:SS" ("02:00:00" is two hours).
   * `set` puts the balance at a value (a jump in time; with `duration` the numbers run to it), `add` adds or,
   * with "-", takes away over the step (a payment: 1.2 s), `run: true` starts it at 25.
   */
  clock(change: { set?: number | string; add?: number | string; run?: boolean }, options?: StepOptions): Step;
  /** Time from this arm to another's, over the step (3 s): the "queda de mão", or both arms on a machine. */
  transfer(to: Actor | string, amount: number | string, options?: StepOptions): Step;
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
  /** Height of the ground of the location at [x, z] (0 without terrain): to place a camera or a point on a hillside. */
  ground(x: number, z: number): number;
  /** Any action of the catalog on any object, e.g. `d.do('carro', 'drive', { path })`. */
  do(target: string, action: string, params?: Record<string, unknown>, options?: StepOptions): Step;
  wait(seconds: number): void;
  /**
   * A jump in the story's time (hora-contada): every clock on an arm that is running goes down by `amount`
   * (seconds or "AAAA:DDD:HH:MM:SS"), all together, the numbers running fast over `duration` (default 1.5 s).
   */
  passTime(amount: number | string, options?: StepOptions): Step;
  /** Move the clock to a time. */
  at(time: number): void;
  /** Wait until a time, if it has not passed yet. Takes a time or a step (its end). */
  waitFor(when: number | Step): void;
  /** Things that happen at the same time: each branch starts now, and the clock ends at the last one to finish. */
  together(...branches: (() => void)[]): Step;
  /** Something that goes on while the script carries on: the clock stays where it was. */
  background(branch: () => void): Step;
  /**
   * Close with a question for the viewer, over the picture: a title, 2 to 6 options and a call to comment.
   * Stays for 6 seconds unless `duration` says otherwise; the episode goes on behind it.
   */
  endCard(card: EndCard, options?: StepOptions): Step;
  /**
   * The opening card of the series over the picture: its name, a line under it and the episode. Stays 3.5 s
   * unless `duration` says otherwise. The episode goes on behind it, so it takes no time: the clock does not move.
   */
  titleCard(card: TitleCard, options?: StepOptions): Step;
  /**
   * Censorship on the finished picture: a black bar (`mode: 'tarja'`) or a mosaic (`'mosaico'`, the default) over
   * the point `at`, `size` meters tall (default 0.6), for `duration` seconds (default 1). The cover follows the shot.
   * Takes no time: what happens under it goes on.
   */
  censor(censor: { at: [number, number, number]; size?: number; mode?: 'tarja' | 'mosaico' }, options?: StepOptions): Step;
  /**
   * A jump cut: what happens from `from` to `to` (times or steps) stays in the episode but leaves the finished
   * video. For long walks between moments. Takes no time.
   */
  cutOut(from: number | Step, to: number | Step): void;
  /**
   * Slow motion: what happens from `from` to `to` (times or steps) lasts `factor` times longer in the finished video
   * (a whole number, 2 to 8), everything in it slowed alike: bodies, things flying, the camera. Nobody may speak in it.
   * Takes no time. The studio plays it at normal speed; the render and `npm run roteiro` stretch it.
   */
  slowMo(from: number | Step, to: number | Step, factor: number): void;
  /**
   * The narrator speaks (the bible's `audio.narrator` voice). Takes as long as the take.
   * With `as`, it is the voice of a character of the series who is not in the scene (by its file id), heard
   * through `filter`: "radio", "phone", "speaker" or "muffled". The subtitle shows that character's name.
   */
  narrate(text: string, options?: StepOptions & { tone?: string; as?: string; filter?: string }): Step;
  /**
   * Play a sound of the bible (`audio.sounds`) now. Takes no time. A looping sound (ambience) plays for
   * `length` seconds, fading in and out.
   */
  sound(name: string, options?: { volume?: number; length?: number; fade?: number }): void;
  world: {
    /** Bring a rule of the bible into effect (true or 1), or out of it; with `duration`, gradually. */
    rule(id: string, on: boolean | number, options?: StepOptions): Step;
    /**
     * The picture goes to black (`true`, or how far, 0 to 1) or comes back (`false`): a cut to black is
     * `blackout(true)` (instant), a fade is `blackout(true, { duration: 1 })`. Sound, subtitles and the end card
     * go on over the black. For what is only heard (the spear in the dark).
     */
    blackout(on: boolean | number, options?: StepOptions): Step;
    /** Phones get or lose signal everywhere. */
    network(on: boolean, options?: StepOptions): Step;
  };
  camera: {
    /** Cut to a camera placed by hand. */
    cut(shot: Shot): void;
    /** Within the current shot, be here by now: the camera moves from where the shot started. In a shot attached to a character, only `fov`, `lens`, `distance`, `height` and `pitch` apply. `lens` (0 to 1) is a wide-angle distortion, for moments of tension. */
    moveTo(shot: Partial<Shot> & { distance?: number; height?: number; pitch?: number }): void;
    /** Cut to the eyes of a character. */
    fpv(who: Actor | string, options?: { fov?: number; pitch?: number; lens?: number }): void;
    /** Cut to behind and above a character, following them. */
    thirdPerson(who: Actor | string, options?: { distance?: number; height?: number; pitch?: number; fov?: number; lens?: number; shake?: number }): void;
    /**
     * Go round a point over `duration` seconds, looking at it, from angle `from` to `to` (degrees; 0 is south of the
     * point, 90 east, as seen from above). Starts with a cut unless `cut: false`. The clock does not move.
     */
    orbit(options: { center: Vec3; radius: number; height: number; from: number; to: number; duration: number; fov?: number; lens?: number; shake?: number; cut?: boolean }): void;
    /**
     * Follow someone like a film camera does: from a place set apart (`from`), turning to keep them in frame as
     * they walk, and drifting to `to` over `duration` seconds if given. Starts with a cut unless `cut: false`.
     * The clock does not move.
     */
    track(who: Actor | string, options: Track): void;
    /**
     * Two people talking, from the side, both in the picture: the camera sits off the line between them, at
     * `distance` (default fits both), and turns `swing` degrees round them (default 14) over `duration` seconds
     * (default 8). `side` picks which side of them (1 or -1); `turn` shifts the whole shot round, in degrees.
     * The clock does not move.
     */
    twoShot(a: Actor | string, b: Actor | string, options?: TwoShot): void;
    /**
     * Over the shoulder of `listener`, at `speaker`, worked out from where both are now; the camera keeps aiming at
     * the speaker's face if they move. Speaker in the middle third, the listener's head and shoulder at the side.
     * Closer than OVER_MIN_APART (the listener's back would fill the picture) it becomes a shot from the side,
     * far enough back for both to stay near the middle. Comes in rather than go through a wall.
     * `side`: 1 over the right shoulder (default), -1 over the left.
     */
    over(listener: Actor | string, speaker: Actor | string, options?: Over): void;
  };
  /** Where a cast member is now (their feet), as the script stands: [x, y, z]. */
  where(who: Actor | string): Vec3;
  /**
   * A conversation between two people, written as the turns: each one is said to the other, and every time the
   * speaker changes the camera cuts to a shot over the listener's shoulder (`camera.over`), always from the same
   * side of the line between them (the 180° rule: each stays on their side of the picture). `side` picks that side
   * for the first speaker; `camera: false` leaves the camera alone. Returns the whole conversation as a step.
   */
  conversa(turns: Turn[], options?: { side?: 1 | -1; fov?: number; camera?: boolean; gap?: number }): Step;
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
export function resolveScript(source: EpisodeScript, built: BuiltLocation, characters: CharacterDef[], bible?: Bible, takes: Record<string, Take> = {}): Episode {
  const { script, tail, duration, ...source2 } = source;
  // On terrain, whoever has no floor height stands on the ground where they start.
  const ground = (x: number, z: number): number | undefined => (built.groundAt(x, z) === 0 ? undefined : round(built.groundAt(x, z)));
  const header = {
    ...source2,
    cast: source2.cast.map((m) => (m.elevation === undefined && ground(m.at[0], m.at[1]) !== undefined ? { ...m, elevation: ground(m.at[0], m.at[1]) } : m)),
    props: source2.props?.map((p) => (p.y === undefined && p.pos && !p.pocketOf && ground(p.pos[0], p.pos[1]) !== undefined ? { ...p, y: ground(p.pos[0], p.pos[1]) } : p)),
  };
  const cast = buildCast({ ...header, duration: 0, camera: [] }, characters);
  const targets = [...built.interactives, ...cast, buildWorld(bible, header.episode), ...buildProps(header)];
  const initial = { links: initialLinks(header) };
  const nav = cast.length ? buildNav(built) : undefined;
  // Every step compiles the track again to learn its length; routes are worked out once.
  const routes = new Map<string, WalkPath | null>();
  const services = {
    groundAt: built.groundAt,
    findPath: nav && ((from: [number, number, number], to: Point2, elevation?: number) => {
      const key = JSON.stringify([from, to, elevation]);
      if (!routes.has(key)) routes.set(key, findPath(nav, from, to, elevation));
      return routes.get(key)!;
    }),
  };

  const clips: ActionClip[] = [];
  const lines: LineVoice[] = [];
  const cuts: [number, number][] = [];
  const slow: [number, number, number][] = [];
  const model = bible?.audio?.model ?? DEFAULT_MODEL;
  /** The voice of a cast member: its own look, else its character's. */
  const voiceOf = (id: string) => {
    const member = header.cast.find((m) => (m.id ?? m.character) === id);
    return member?.look?.voice ?? characters.find((c) => c.id === member?.character)?.voice;
  };
  /** The take of a line, if made, and the line kept for `npm run voz`. */
  const voiced = (speaker: string, text: string, tone?: string): Take | undefined => {
    // A cast member, the narrator, or a character of the series who is not in the scene.
    const voice = speaker === NARRATOR ? bible?.audio?.narrator : (voiceOf(speaker) ?? characters.find((c) => c.id === speaker)?.voice);
    if (!voice) return undefined;
    const spoken = spokenText(text, tone);
    const key = takeKey(voice, model, spoken);
    if (!lines.some((l) => l.key === key)) lines.push({ key, speaker, text, spoken, voice, model });
    return takes[key];
  };
  const keys: CameraKey[] = [];
  /** Keys a camera move planned ahead of the clock (an orbit), by when the move started: a later cut ends the move. */
  const planned = new Map<CameraKey, number>();
  let now = 0;
  let last = 0;

  /** Body turns put in by the director (see `faceFor`): they give way to any step the script asks for. */
  const automatic = new Set<ActionClip>();
  const run = (target: string, action: string, params: Record<string, unknown> = {}, options: StepOptions = {}): Step => {
    const clip: ActionClip = clean({ t: round(now), target, action, params: clean(params), duration: options.duration, ease: options.ease });
    clips.push(clip);
    try {
      const compiled = compileActions(clips, targets, services, initial);
      clip.duration = round(compiled.clips.find((c) => c.index === clips.length - 1)!.duration);
    } catch (error) {
      clips.pop();
      // A turn the director added on its own gets in the way of this step: take it out and try again.
      const end = clip.t + (clip.duration ?? 0);
      const inTheWay = [...automatic].filter((a) => a.target === target && a.t < Math.max(end, clip.t + 0.01) && a.t + (a.duration ?? 0) > clip.t);
      if (!inTheWay.length || !/em uso/.test(String(error))) throw error;
      for (const a of inTheWay) {
        clips.splice(clips.indexOf(a), 1);
        automatic.delete(a);
      }
      return run(target, action, params, options);
    }
    const step = { start: clip.t, end: round(clip.t + clip.duration) };
    now = step.end;
    last = Math.max(last, now);
    return step;
  };

  const idOf = (who: Actor | string): string => (typeof who === 'string' ? who : who.id);
  /** Where a cast member's feet are at the current time of the script. */
  const whereNow = (id: string): Vec3 => {
    if (!targets.some((t) => t.id === id && t.kind === 'character')) throw new Error(`"${id}" não está no elenco.`);
    return placementAt(compileActions(clips, targets, services, initial), id, now).pos;
  };
  /** Where the eyes of a cast member are now: their own height, lower when seated. */
  const eyesNow = (id: string): Vec3 => {
    const compiled = compileActions(clips, targets, services, initial);
    const { pos } = placementAt(compiled, id, now);
    const eye = (targets.find((t) => t.id === id)?.traits.eyeHeight as number | undefined) ?? 1.6;
    return [pos[0], pos[1] + eye - seatedDrop(compiled, id, now), pos[2]];
  };
  /**
   * A head turns 75° at most. To look at (or talk to) someone further round, a person turns the body too: when
   * the target is more than 70° from where the character faces, the body turns toward it while the head does.
   * Not while walking or sitting (the turn would fight the walk); then only the head turns, as far as it goes.
   */
  const faceFor = (id: string, target: Actor | string | Vec3, duration = 0.6): void => {
    const compiled = compileActions(clips, targets, services, initial);
    if (channelAt(compiled, id, 'sit', now) > 0.5 || channelAt(compiled, id, 'gait', now) > 0.05) return;
    const me = placementAt(compiled, id, now);
    const point = Array.isArray(target) ? target : focusAt(compiled, idOf(target), now);
    const [dx, dz] = [point[0] - me.pos[0], point[2] - me.pos[2]];
    if (Math.hypot(dx, dz) < 0.2) return;
    const heading = (Math.atan2(-dx, -dz) * 180) / Math.PI;
    const off = ((((heading - me.yaw) % 360) + 540) % 360) - 180;
    if (Math.abs(off) <= 70) return;
    const at = now;
    try {
      run(id, 'turnTo', { yaw: me.yaw + off }, { duration: Math.max(0.4, duration) });
      automatic.add(clips[clips.length - 1]);
    } catch {
      // Something else turns the body now (a walk): the head does what it can.
    }
    now = at;
  };
  /** Something that happens at this instant and does not move the clock. */
  const instant = (target: string, action: string, params: Record<string, unknown>): void => {
    const at = now;
    run(target, action, params, { duration: 0 });
    now = at;
  };
  const actor = (id: string): Actor => {
    if (!cast.some((c) => c.id === id)) throw new Error(`"${id}" não está no elenco do episódio. Elenco: ${cast.map((c) => c.id).join(', ') || 'vazio'}.`);
    const walk = (to: Point2 | { door: string }, speed: number | undefined, options: StepOptions & { elevation?: number; via?: (Point2 | [number, number, number])[] } = {}): Step =>
      run(id, 'walkTo', { ...(Array.isArray(to) ? { to } : to), speed, elevation: options.elevation, via: options.via }, options);
    return {
      id,
      walkTo: (to, options) => walk(to, options?.speed, options),
      runTo: (to, options) => walk(to, options?.speed ?? 4, options),
      turnTo: (to, options) => run(id, 'turnTo', typeof to === 'number' ? { yaw: to } : { to }, options),
      express: (expression, options) => run(id, 'express', { expression, amount: options?.amount }, options),
      lookAt: (target, options) => {
        faceFor(id, target, options?.duration);
        return run(id, 'lookAt', Array.isArray(target) ? { point: target } : { object: typeof target === 'string' ? target : target.id }, options);
      },
      lookAhead: (options) => run(id, 'lookAt', {}, options),
      pickUp: (item, options) => run(item, 'pickUp', { by: id, hand: options?.hand, bag: options?.bag }, options),
      putDown: (item, where, options) => run(item, 'putDown', Array.isArray(where) ? { at: where } : where, options),
      open: (object, options) => run(object, 'open', { by: id, part: options?.part, amount: options?.amount, hand: options?.hand }, options),
      close: (object, options) => run(object, 'close', { by: id, part: options?.part, hand: options?.hand }, options),
      sit: (on, seat, options) => run(id, 'sit', { on, seat }, options),
      standUp: (to, options) => run(id, 'standUp', { to, yaw: options?.yaw }, options),
      say: (text, options) => (options?.to !== undefined && faceFor(id, options.to), run(id, 'say', { text, to: options?.to === undefined ? undefined : idOf(options.to), tone: options?.tone, gesture: options?.gesture, filter: options?.filter, take: voiced(id, text, options?.tone) }, options)),
      behave: (mode, options) => instant(id, 'behave', { mode, group: options?.group, object: options?.object === undefined ? undefined : idOf(options.object), point: options?.point, mood: options?.mood }),
      putAway: (item, options) => run(item, 'putAway', { bag: options?.bag }, options),
      raise: (to, options) => run(id, 'raise', { to, hand: options?.hand }, options),
      showArm: (to, options) => run(id, 'showArm', { to, hand: options?.hand }, options),
      lower: (options) => run(id, 'lower', {}, options),
      pointAt: (target, options) => run(id, 'pointAt', { ...(Array.isArray(target) ? { point: target } : { object: idOf(target) }), hand: options?.hand }, options),
      hand: (pose, options) => run(id, 'hand', { pose, hand: options?.hand }, options),
      clock: (change, options) =>
        run(id, 'clock', { set: change.set === undefined ? undefined : parseClock(change.set), add: change.add === undefined ? undefined : parseAmount(change.add), run: change.run }, options),
      transfer: (to, amount, options) => run(id, 'transfer', { to: idOf(to), amount: parseClock(amount) }, options),
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
    passTime(amount, options) {
      const seconds = parseClock(amount);
      const compiled = compileActions(clips, targets, services, initial);
      const running = targets.filter((t) => t.kind === 'character' && 'clock' in t.channels && channelAt(compiled, t.id, 'clock.rate', now) > 0);
      const start = now;
      let end = start;
      for (const t of running) {
        now = start;
        end = Math.max(end, run(t.id, 'clock', { add: -seconds }, { duration: 1.5, ...options }).end);
      }
      now = end;
      return { start, end };
    },
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
    ground: (x, z) => round(built.groundAt(x, z)),
    where: (who) => whereNow(idOf(who)),
    conversa: (turns, { side = 1, fov, camera = true, gap = 0.25 } = {}) => {
      const people = [...new Set(turns.map(([who]) => idOf(who)))];
      if (people.length !== 2) throw new Error(`d.conversa: uma conversa é entre duas pessoas, e estas falas têm ${people.length} (${people.join(', ')}).`);
      const start = now;
      let previous: string | undefined;
      turns.forEach(([who, text, options = {}], i) => {
        const id = idOf(who);
        const other = people.find((p) => p !== id)!;
        if (i > 0) director.wait(gap);
        // The first speaker is seen over the other's chosen shoulder; the reverse, over the opposite one, keeps both on their side.
        if (camera && id !== previous) director.camera.over(other, id, { side: (id === people[0] ? side : -side) as 1 | -1, fov });
        director.actor(id).say(text, { ...options, to: other });
        previous = id;
      });
      return { start: round(start), end: round(now) };
    },
    endCard: (card, options) => run(WORLD, 'endCard', { card }, options),
    censor: (censor, options) => {
      const start = now;
      const step = run(WORLD, 'censor', { ...censor }, options);
      now = start;
      return step;
    },
    titleCard: (card, options) => {
      const start = now;
      const step = run(WORLD, 'titleCard', { card }, options);
      now = start;
      return step;
    },
    cutOut(from, to) {
      const [a, b] = [typeof from === 'number' ? from : from.start, typeof to === 'number' ? to : to.end];
      if (!(b > a)) throw new Error(`cutOut: o fim (${b}) precisa vir depois do começo (${a}).`);
      cuts.push([round(a), round(b)]);
    },
    slowMo(from, to, factor) {
      const [a, b] = [typeof from === 'number' ? from : from.start, typeof to === 'number' ? to : to.end];
      if (!(b > a)) throw new Error(`slowMo: o fim (${b}) precisa vir depois do começo (${a}).`);
      if (!Number.isInteger(factor) || factor < 2 || factor > 8) throw new Error(`slowMo: o fator precisa ser um número inteiro de 2 a 8 (veio ${factor}).`);
      // On whole frames, so the stretched stretch lasts exactly factor times as long.
      const fps = bible?.format?.fps ?? 30;
      slow.push([Math.round(a * fps) / fps, Math.round(b * fps) / fps, factor].map(round) as [number, number, number]);
    },
    narrate: (text, options) => {
      const who = options?.as === undefined ? undefined : characters.find((c) => c.id === options.as);
      if (options?.as !== undefined && !who) throw new Error(`narrate: a ficha "${options.as}" não existe na série. Fichas: ${characters.map((c) => c.id).join(', ')}.`);
      return run(WORLD, 'narrate', { text, tone: options?.tone, filter: options?.filter, as: who?.id, name: who?.name, take: voiced(who?.id ?? NARRATOR, text, options?.tone) }, options);
    },
    sound: (name, options) => {
      if (!bible?.audio?.sounds?.[name]) throw new Error(`O som "${name}" não está em audio.sounds da bíblia. Sons: ${Object.keys(bible?.audio?.sounds ?? {}).join(', ') || 'nenhum'}.`);
      instant(WORLD, 'sound', { name, ...options });
    },
    world: {
      rule: (id, on, options) => run(WORLD, 'set', { channel: `rule.${id}`, value: Number(on) }, { duration: 0, ...options }),
      network: (on, options) => run(WORLD, 'set', { channel: 'network', value: Number(on) }, { duration: 0, ...options }),
      blackout: (on, options) => run(WORLD, 'set', { channel: 'black', value: Math.max(0, Math.min(1, Number(on))) }, { duration: 0, ...options }),
    },
    camera: {
      cut: (shot) => key({ ...shot, cut: keys.length > 0 || undefined }),
      moveTo: (shot) => key(shot),
      fpv: (who, options) => key({ ...options, cut: keys.length > 0 || undefined, mode: 'fpv', follow: idOf(who) }),
      thirdPerson: (who, options) => key({ ...options, cut: keys.length > 0 || undefined, mode: 'third_person', follow: idOf(who) }),
      track: (who, { from, to, duration, fov, lens, shake, aimHeight, cut = true }) => {
        const aim = idOf(who);
        key({ pos: from, aim, aimHeight, fov, lens, shake, ...(cut && keys.length > 0 ? { cut: true } : {}) });
        if (to && duration) {
          const start = now;
          now = start + duration;
          key({ pos: to, aim, aimHeight, fov, lens, shake });
          planned.set(keys[keys.length - 1], round(start));
          now = start;
        }
      },
      over: (listener, speaker, options = {}) => {
        const head = (targets.find((t) => t.id === idOf(listener))?.traits.headRadius as number | undefined) ?? 0.14;
        key(overShot(eyesNow(idOf(listener)), eyesNow(idOf(speaker)), idOf(speaker), { ...options, head }, (from, to) => clearFraction(built.colliders, from, to), keys.length > 0));
      },
      twoShot: (a, b, { distance, height = 1.5, swing = 14, duration = 8, side = 1, fov = 40, turn = 0 } = {}) => {
        const [pa, pb] = [whereNow(idOf(a)), whereNow(idOf(b))];
        const center: Vec3 = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + height, (pa[2] + pb[2]) / 2];
        const apart = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]);
        // Far enough for both to fit across a narrow vertical picture, with room around them.
        const across = (2 * Math.tan(((fov / 2) * Math.PI) / 180) * 9) / 16;
        // Off the line between them, on the chosen side: heading of the perpendicular, as orbit counts it.
        const facing = (Math.atan2(-(pb[2] - pa[2]) * side, (pb[0] - pa[0]) * side) * 180) / Math.PI + turn;
        let radius = distance ?? Math.max(2.6, (apart + 1.4) / across);
        // Indoors, come in rather than go through a wall: the shortest free distance along the whole swing.
        for (const angle of [facing - swing / 2, facing, facing + swing / 2]) {
          const a = (angle * Math.PI) / 180;
          const far: Vec3 = [center[0] + Math.sin(a) * radius, center[1], center[2] + Math.cos(a) * radius];
          radius = Math.min(radius, Math.max(1.2, clearFraction(built.colliders, center, far) * radius - 0.3));
        }
        director.camera.orbit({ center, radius, height: 0, from: facing - swing / 2, to: facing + swing / 2, duration, fov });
      },
      orbit: ({ center, radius, height, from, to, duration, fov, lens, shake, cut = true }) => {
        if (!(duration > 0)) throw new Error('d.camera.orbit: "duration" precisa ser maior que zero.');
        // A key every 10 degrees or so keeps the curve between keys close to a circle.
        const steps = Math.max(2, Math.ceil(Math.abs(to - from) / 10));
        const start = now;
        for (let k = 0; k <= steps; k++) {
          const a = ((from + ((to - from) * k) / steps) * Math.PI) / 180;
          now = start + (duration * k) / steps;
          key({ pos: [center[0] + Math.sin(a) * radius, center[1] + height, center[2] + Math.cos(a) * radius], lookAt: center, fov, lens, shake, ...(k === 0 && cut && keys.length > 0 ? { cut: true } : {}) });
          if (k > 0) planned.set(keys[keys.length - 1], round(start));
        }
        now = start;
      },
    },
  };
  script(director);

  if (!keys.length) throw new Error('O roteiro não tem câmera: comece com d.camera.cut(...), d.camera.fpv(...) ou d.camera.thirdPerson(...).');
  // A cut ends a move planned ahead: the rest of an orbit after the next cut is dropped.
  for (const [k, start] of planned) {
    if (keys.some((other) => other.cut && !planned.has(other) && other.t > start && other.t < k.t)) keys.splice(keys.indexOf(k), 1);
  }
  // Keys written out of order (inside a background branch) go to their place; equal times keep the order they were written in.
  const camera = keys.map((k, i) => ({ k, i })).sort((a, b) => a.k.t - b.k.t || a.i - b.i).map(({ k }) => k);
  validateCamera(camera, cast.map((c) => c.id));
  cuts.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < cuts.length; i++) if (cuts[i][0] < cuts[i - 1][1]) throw new Error(`cutOut: os cortes [${cuts[i - 1]}] e [${cuts[i]}] se sobrepõem.`);
  // A line cut in the middle would jump in the sound.
  for (const clip of clips) {
    if (clip.action !== 'say' && clip.action !== 'narrate') continue;
    const end = clip.t + (clip.duration ?? 0);
    const cut = cuts.find(([a, b]) => clip.t < b && end > a);
    if (cut) throw new Error(`cutOut [${cut}] corta a fala "${(clip.params as { text: string }).text}" (${clip.t.toFixed(1)}–${end.toFixed(1)} s).`);
    // A voice cannot be slowed down with the picture.
    const slowed = slow.find(([a, b]) => clip.t < b && end > a);
    if (slowed) throw new Error(`slowMo [${slowed.slice(0, 2)}] pega a fala "${(clip.params as { text: string }).text}" (${clip.t.toFixed(1)}–${end.toFixed(1)} s): ninguém fala em câmera lenta.`);
  }
  slow.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < slow.length; i++) if (slow[i][0] < slow[i - 1][1]) throw new Error(`slowMo: [${slow[i - 1].slice(0, 2)}] e [${slow[i].slice(0, 2)}] se sobrepõem.`);
  for (const [a, b] of slow) {
    const cut = cuts.find(([c, e]) => a < e && b > c);
    if (cut) throw new Error(`slowMo [${a},${b}] e cutOut [${cut}] se sobrepõem.`);
  }
  const length = duration ?? round(last + (tail ?? 1));
  const warnings = stillWithNothingToDo(clips, cast.map((c) => c.id), camera.filter((k) => k.mode === 'fpv').map((k) => k.follow!), length);
  return { ...header, duration: length, camera, actions: clips, lines, ...(cuts.length ? { cuts } : {}), ...(slow.length ? { slow } : {}), ...(warnings.length ? { warnings } : {}) };
}

/** Longest a character may stand with no behaviour and no action before it looks frozen, in seconds. */
export const STILL_LIMIT = 3;

/**
 * The world has to look alive: a character with no behaviour ("none", or never given one) and no step going on
 * stands frozen, breathing and blinking only. Every stretch like that longer than STILL_LIMIT is reported. The
 * character the camera sees through (fpv) is left out: its body is not on screen.
 */
export function stillWithNothingToDo(clips: ActionClip[], cast: string[], viewers: string[], length: number): string[] {
  const out: string[] = [];
  for (const id of cast) {
    if (viewers.includes(id)) continue;
    const mine = clips.filter((c) => c.target === id || (c.params as { by?: string } | undefined)?.by === id).sort((a, b) => a.t - b.t);
    // Someone who has fallen lies still on purpose, from then on.
    const fallen = mine.find((c) => c.action === 'fall');
    const end = fallen ? Math.min(length, fallen.t) : length;
    // When the character is busy (a step that takes time) and when its behaviour changes.
    const busy = mine.filter((c) => (c.duration ?? 0) > 0 && c.action !== 'lookAt').map((c) => [c.t, c.t + (c.duration ?? 0)] as [number, number]);
    const modes = mine.filter((c) => c.action === 'behave').map((c) => ({ t: c.t, mode: (c.params as { mode: string }).mode }));
    // Stretches with no behaviour.
    const idle: [number, number][] = [];
    let from: number | null = modes.length && modes[0].t === 0 && modes[0].mode !== 'none' ? null : 0;
    for (const { t, mode } of modes) {
      if (mode === 'none' && from === null) from = t;
      else if (mode !== 'none' && from !== null) {
        idle.push([from, t]);
        from = null;
      }
    }
    if (from !== null && end > from) idle.push([from, end]);
    // Take out the time spent on steps; what is left is standing frozen.
    for (const [a, b] of idle) {
      let t = a;
      for (const [s, e] of busy) {
        if (e <= t || s >= b) continue;
        if (s - t > STILL_LIMIT) out.push(`"${id}" fica parado sem fazer nada de ${t.toFixed(1)} s a ${s.toFixed(1)} s: dê um behave (idle, attend, chat...) ou uma ação.`);
        t = Math.max(t, e);
      }
      if (b - t > STILL_LIMIT) out.push(`"${id}" fica parado sem fazer nada de ${t.toFixed(1)} s a ${b.toFixed(1)} s: dê um behave (idle, attend, chat...) ou uma ação.`);
    }
  }
  return out;
}

/** Closer than this (m), a shot over the shoulder shows only the listener's back: it becomes a shot from the side. */
export const OVER_MIN_APART = 1.3;
const round3 = (p: Vec3): Vec3 => p.map((v) => Math.round(v * 1000) / 1000) as Vec3;
/** How far to the side of the listener's head the camera sits, in meters: a touch, so the head is not dead center. */
const OVER_ASIDE = 0.16;

/**
 * The key of a shot over `listener`'s shoulder at `speaker` (eyes given), aiming at `aim`. `clear` says how much of
 * a straight line is free of walls. Pure, so the shot can be checked without a scene.
 */
export function overShot(listener: Vec3, speaker: Vec3, aim: string, { side = 1, fov = 36, back, head = 0.14 }: Over & { head?: number }, clear: (from: Vec3, to: Vec3) => number, cut: boolean): Omit<CameraKey, 't'> {
  const [dx, dz] = [speaker[0] - listener[0], speaker[2] - listener[2]];
  const apart = Math.hypot(dx, dz);
  if (apart < 0.05) throw new Error('d.camera.over: as duas pessoas estão no mesmo lugar.');
  const [fx, fz] = [dx / apart, dz / apart];
  // Right of the listener as they face the speaker (yaw 0 faces -z, so right is +x).
  const [rx, rz] = [-fz, fx];
  const eyes = Math.max(listener[1], speaker[1]);
  // Far enough back that the listener's head stays a frame at the bottom, not half the picture (a giant's is bigger).
  // Not more than 60% of the distance between them, or the camera has to climb too high to clear a tall listener.
  back ??= Math.min(1.7 * Math.max(1, head / 0.15), Math.max(1.1, apart * 0.6));
  let pos: Vec3;
  if (apart >= OVER_MIN_APART) {
    // Nearly behind the listener and high: the line to the speaker's face passes just over their head, so the
    // listener's head and shoulder sit at the bottom edge of the picture and the speaker in the middle (a vertical
    // picture has no room for the usual shot from beside the shoulder).
    const at = (k: number): Vec3 => {
      const behind = back * k;
      const along = behind / (apart + behind);
      const top = listener[1] + head * 1.3 + 0.06;
      // The whole face clears the head, down to the chin, not only the eyes.
      const chin = speaker[1] - 0.2;
      const y = Math.min(top + 1.4, Math.max(listener[1] + 0.3, (top - chin * along) / (1 - along)));
      return [listener[0] - fx * behind + rx * side * OVER_ASIDE, y, listener[2] - fz * behind + rz * side * OVER_ASIDE];
    };
    pos = at(1);
    // Against a wall behind the listener: come in until the camera itself is clear of it and sees the speaker.
    for (const k of [1, 0.8, 0.6, 0.45, 0.33, 0.22, 0.15]) {
      pos = at(k);
      if (clear(speaker, pos) > 0.98 && clear(listener, pos) > 0.98) break;
    }
  } else {
    // From the side, off the middle of the two, far enough back that both faces stay in the middle of a vertical picture.
    const across = Math.tan((fov * Math.PI) / 360) * (9 / 16);
    let distance = Math.max(2.4, (apart / 2 + 0.2) / (0.55 * across));
    const middle: Vec3 = [(listener[0] + speaker[0]) / 2, eyes, (listener[2] + speaker[2]) / 2];
    const far: Vec3 = [middle[0] + rx * side * distance, middle[1], middle[2] + rz * side * distance];
    distance = Math.max(1.2, clear(middle, far) * distance - 0.3);
    pos = [middle[0] + rx * side * distance, eyes + 0.1, middle[2] + rz * side * distance];
    // Both in the picture: look at the middle of them rather than follow one.
    return { pos: round3(pos), lookAt: round3([middle[0], eyes - 0.1, middle[2]]), fov, ...(cut ? { cut: true } : {}) };
  }
  // Eyes on the upper third, not in the middle: aim below them by a sixth of the picture's height at their distance
  // (from the middle to a third from the top). In a vertical picture the middle leaves half of it above the head.
  const reach = Math.hypot(speaker[0] - pos[0], speaker[1] - pos[1], speaker[2] - pos[2]);
  const below = (2 * reach * Math.tan((fov * Math.PI) / 360)) / 6;
  return { pos: round3(pos), aim, aimHeight: Math.round(-below * 1000) / 1000, fov, ...(cut ? { cut: true } : {}) };
}
