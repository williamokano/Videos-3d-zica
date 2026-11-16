/**
 * The reviewer: reads a resolved episode and lists what would look or sound wrong in the finished video, with the
 * time of each thing, before anything is rendered. Every check here is something the author once found by
 * watching a render (tasks/lessons.md): lines on top of each other, dead stretches, the camera inside a wall or a
 * person, whoever speaks out of the picture or hidden, people standing inside each other.
 *
 * Pure: it only works out positions from the action track and the camera track. `npm run revisar` prints it.
 */
import { evaluateLinks, type ActionClip } from './actions/catalog';
import { charactersOf } from './actions/crowd';
import type { Bible } from './bible';
import type { CharacterDef } from './character/types';
import { evaluateCamera, type CameraKey, type CameraPose, type CameraStage, type Vec3 } from './timeline/camera';
import { cutAt, finalTime, type Episode } from './timeline/episode';
import { buildCast, buildProps, buildWorld, cameraStage, compileEpisode } from './timeline/stage';
import { clearFraction, type BuiltLocation } from './world/build';

export type FindingLevel = 'erro' | 'aviso' | 'nota';

export interface Finding {
  /** Which check found it (REVIEW_CHECKS). */
  check: string;
  /** `erro`: do not render like this. `aviso`: look at it. `nota`: for the record. */
  level: FindingLevel;
  /** Seconds of the episode (not of the finished video: see `finalTime`). */
  t: number;
  end?: number;
  text: string;
}

/** What each check looks for, by id. */
export const REVIEW_CHECKS: Record<string, string> = {
  'fala-sobreposta': 'duas falas ao mesmo tempo',
  'fala-em-camera-lenta': 'fala dentro de um trecho em câmera lenta',
  'trecho-parado': 'trecho sem fala, som nem ação nova',
  'camera-dentro': 'câmera dentro de parede, móvel, chão ou pessoa',
  'fala-fora-do-quadro': 'quem fala não aparece durante a fala inteira',
  'fala-na-borda': 'quem fala está na borda do quadro (o Instagram corta)',
  'fala-tapada': 'quem fala está atrás de alguém ou de uma parede',
  'gente-atravessando': 'duas pessoas ocupando o mesmo lugar',
  'censura': 'censura que acaba antes do corte ou cai fora do quadro',
  'tremor': 'tremor de câmera acima do combinado',
  'duracao': 'episódio longo demais',
  'parado': 'personagem parado sem comportamento',
  'sem-gravacao': 'falas ainda sem voz gravada',
};

export interface ReviewOptions {
  /** Width over height of the finished video (default 9:16). */
  aspect?: number;
  /** Longest the finished video may be, in seconds (default 180, the Instagram limit). */
  limit?: number;
  /** Longest stretch with no line, sound or new action, in seconds (default 3). */
  dead?: number;
  /** Highest camera shake that goes unremarked (default 0.15). */
  shake?: number;
  /** How far from the middle a speaker's head may be, as a fraction of half the width (default 0.6). */
  edge?: number;
}

/** Where a point falls in the picture: x and y from -1 to 1 inside the frame, `depth` in meters ahead of the camera. */
export function project(pose: Pick<CameraPose, 'pos' | 'lookAt' | 'fov'>, point: Vec3, aspect: number): { x: number; y: number; depth: number } {
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = (a: Vec3): Vec3 => {
    const n = Math.hypot(...a) || 1;
    return [a[0] / n, a[1] / n, a[2] / n];
  };
  const f = unit(sub(pose.lookAt, pose.pos));
  // Looking straight up or down, any horizontal direction serves as "right".
  const flat = Math.hypot(f[0], f[2]);
  const r: Vec3 = flat < 1e-6 ? [1, 0, 0] : [-f[2] / flat, 0, f[0] / flat];
  const u: Vec3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const d = sub(point, pose.pos);
  const depth = dot(d, f);
  const half = Math.tan((pose.fov * Math.PI) / 360);
  if (depth <= 1e-6) return { x: Infinity, y: Infinity, depth };
  return { x: dot(d, r) / (depth * half * aspect), y: dot(d, u) / (depth * half), depth };
}

/** Shortest distance, seen from above, between the point `p` and the stretch from `a` to `b`, and how far along it (0 to 1). */
function flatDistance(a: Vec3, b: Vec3, p: Vec3): { distance: number; along: number } {
  const [dx, dz] = [b[0] - a[0], b[2] - a[2]];
  const length2 = dx * dx + dz * dz;
  const along = length2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[2] - a[2]) * dz) / length2));
  return { distance: Math.hypot(a[0] + dx * along - p[0], a[2] + dz * along - p[2]), along };
}

/** Join the instants a problem was seen at into stretches: one finding for each, not one for each sample. */
function stretches(times: number[], step: number): [number, number][] {
  const out: [number, number][] = [];
  for (const t of times) {
    const last = out[out.length - 1];
    if (last && t - last[1] <= step * 1.5) last[1] = t;
    else out.push([t, t]);
  }
  return out;
}

const SAMPLE = 0.1;
/** Half the width of a body, for the camera and for sight lines, in meters (at standard height). */
const BODY = 0.24;
/** Half the width of a body below the shoulders, for sight lines. */
const TORSO = 0.2;
/** Two people closer than this, center to center, are inside each other. */
const OVERLAP = 0.26;
/** How long two people may brush past each other before it counts, in seconds. */
const OVERLAP_TIME = 0.4;

interface Line {
  clip: ActionClip;
  t: number;
  end: number;
  who: string;
  text: string;
}

/**
 * Review an episode. `built` is its location and `characters` the files of the series; the bible gives the rules
 * of the world the episode starts with.
 */
export function reviewEpisode(episode: Episode, built: BuiltLocation, characters: CharacterDef[], bible?: Bible, options: ReviewOptions = {}): Finding[] {
  const aspect = options.aspect ?? 9 / 16;
  const limit = options.limit ?? 180;
  const dead = options.dead ?? 3;
  const edge = options.edge ?? 0.6;
  const maxShake = options.shake ?? 0.15;
  const out: Finding[] = [];
  const add = (check: string, level: FindingLevel, t: number, end: number | undefined, text: string): void => {
    out.push({ check, level, t, ...(end !== undefined && end > t ? { end } : {}), text });
  };

  const cast = buildCast(episode, characters);
  const compiled = compileEpisode(episode, built, cast, [buildWorld(bible, episode.episode), ...buildProps(episode)]);
  const stage = cameraStage(compiled, built, cast);
  const people = charactersOf(compiled);
  const clips = episode.actions ?? [];
  const seen = (t: number): boolean => !cutAt(episode, t);
  const nameOf = (id: string): string => {
    const member = episode.cast?.find((m) => (m.id ?? m.character) === id);
    return member?.look?.name ?? characters.find((c) => c.id === member?.character)?.name ?? id;
  };
  const scaleOf = (id: string): number => compiled.scales[id] ?? 1;
  const traits = new Map(cast.map((c) => [c.id, c.traits]));
  const headRadius = (id: string): number => (traits.get(id)?.headRadius as number | undefined) ?? 0.14;
  const headOf = (id: string, t: number): Vec3 | undefined => {
    const s = stage.subject(id, t);
    return s && [s.pos[0], s.pos[1] + s.eyeHeight, s.pos[2]];
  };

  // --- Sound: lines over each other, lines in slow motion, dead stretches -------------------------------------
  const lines: Line[] = clips
    .filter((c) => c.action === 'say' || c.action === 'narrate')
    .map((c) => ({ clip: c, t: c.t, end: c.t + (c.duration ?? 0), who: c.action === 'say' ? c.target : String((c.params as { as?: string } | undefined)?.as ?? 'narrador'), text: String((c.params as { text?: string } | undefined)?.text ?? '') }))
    .sort((a, b) => a.t - b.t);
  const quote = (l: Line): string => `${l.who === 'narrador' ? 'Narrador' : nameOf(l.who)}: "${l.text.length > 40 ? `${l.text.slice(0, 40)}…` : l.text}"`;
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length && lines[j].t < lines[i].end; j++) {
      const over = Math.min(lines[i].end, lines[j].end) - lines[j].t;
      if (over > 0.2) add('fala-sobreposta', 'erro', lines[j].t, lines[j].t + over, `${quote(lines[i])} e ${quote(lines[j])} se atropelam por ${over.toFixed(1)} s.`);
    }
  }
  for (const [from, to] of episode.slow ?? []) {
    for (const l of lines) if (l.t < to && l.end > from) add('fala-em-camera-lenta', 'erro', l.t, l.end, `${quote(l)} cai na câmera lenta de ${from.toFixed(1)} s a ${to.toFixed(1)} s: a voz não acompanha.`);
  }
  // Something new for the eye or the ear: a line going on, a sound starting, a cut, an action starting.
  const happenings = [
    ...clips.filter((c) => c.action !== 'behave' && c.action !== 'say' && c.action !== 'narrate' && c.action !== 'censor').map((c) => c.t),
    ...episode.camera.filter((k) => k.cut).map((k) => k.t),
  ].filter(seen).sort((a, b) => a - b);
  let quiet = 0;
  const silence: [number, number][] = [];
  for (const l of lines) {
    if (l.t - quiet > 0) silence.push([quiet, l.t]);
    quiet = Math.max(quiet, l.end);
  }
  if (episode.duration - quiet > 0) silence.push([quiet, episode.duration]);
  for (const [from, to] of silence) {
    let last = from;
    for (const t of [...happenings.filter((h) => h > from && h < to), to]) {
      // Time taken out by a jump cut is not waited through.
      const waited = finalTime(episode, t) - finalTime(episode, last);
      if (waited >= dead) add('trecho-parado', 'aviso', last, t, `${waited.toFixed(1)} s sem fala, som nem ação nova: ponha uma fala, um som ou um corte.`);
      last = t;
    }
  }

  // --- Picture, instant by instant: the camera inside things, people inside each other ------------------------
  const inside = new Map<string, number[]>();
  const overlapping = new Map<string, number[]>();
  const mark = (map: Map<string, number[]>, key: string, t: number): void => void (map.get(key) ?? map.set(key, []).get(key)!).push(t);
  const solid = built.colliders.filter((c) => !c.disabled && !c.door);
  for (let t = 0; t <= episode.duration; t += SAMPLE) {
    if (!seen(t)) continue;
    const pose = evaluateCamera(episode.camera, t, stage);
    const [x, y, z] = pose.pos;
    if (y < built.groundAt(x, z) + 0.03) mark(inside, 'o chão', t);
    for (const c of solid) if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && y > c.y0 && y < c.y1) mark(inside, 'uma parede ou um móvel', t);
    const riding = new Map(evaluateLinks(compiled, t).map((l) => [l.target, l.to]));
    const here = at(t);
    for (const { id, s } of here) {
      if (pose.follow === id && pose.mode === 'fpv') continue;
      if (Math.hypot(x - s.pos[0], z - s.pos[2]) < BODY * scaleOf(id) && y > s.pos[1] && y < s.pos[1] + s.eyeHeight + 0.2) mark(inside, `"${nameOf(id)}" (${id})`, t);
    }
    for (let i = 0; i < here.length; i++) {
      for (let j = i + 1; j < here.length; j++) {
        const [a, b] = [here[i], here[j]];
        // Carried, riding or sitting on the same thing: together on purpose.
        if (riding.get(a.id) === b.id || riding.get(b.id) === a.id || (riding.has(a.id) && riding.get(a.id) === riding.get(b.id))) continue;
        if (Math.abs(a.s.pos[1] - b.s.pos[1]) > 1.2) continue;
        if (Math.hypot(a.s.pos[0] - b.s.pos[0], a.s.pos[2] - b.s.pos[2]) < OVERLAP * Math.min(scaleOf(a.id), scaleOf(b.id))) mark(overlapping, `${a.id}|${b.id}`, t);
      }
    }
  }
  for (const [what, times] of inside) {
    for (const [from, to] of stretches(times, SAMPLE)) add('camera-dentro', 'erro', from, to, `A câmera está dentro de ${what}.`);
  }
  for (const [pair, times] of overlapping) {
    const [a, b] = pair.split('|');
    for (const [from, to] of stretches(times, SAMPLE)) {
      if (to - from < OVERLAP_TIME) continue;
      // Out of every shot, nobody sees it.
      const shown = [from, (from + to) / 2, to].some((t) => {
        const p = project(evaluateCamera(episode.camera, t, stage), headOf(a, t)!, aspect);
        return p.depth > 0 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.3;
      });
      if (shown) add('gente-atravessando', 'erro', from, to, `"${nameOf(a)}" (${a}) e "${nameOf(b)}" (${b}) ocupam o mesmo lugar.`);
    }
  }

  // --- Whoever speaks: in the picture, away from the edge, not behind anybody ---------------------------------
  for (const l of lines) {
    if (l.clip.action !== 'say' || !people.includes(l.who)) continue;
    const moments = [0.15, 0.5, 0.85].map((u) => l.t + (l.end - l.t) * u).filter(seen);
    if (!moments.length) continue;
    const views = moments.map((t) => {
      const pose = evaluateCamera(episode.camera, t, stage);
      const head = headOf(l.who, t)!;
      return { t, pose, head, p: project(pose, head, aspect) };
    });
    // Through the speaker's own eyes there is no face to show.
    if (views.every((v) => v.pose.mode === 'fpv' && v.pose.follow === l.who)) continue;
    const inFrame = (v: (typeof views)[number]): boolean => v.p.depth > 0 && Math.abs(v.p.x) <= 1 && Math.abs(v.p.y) <= 1;
    if (!views.some(inFrame)) {
      add('fala-fora-do-quadro', 'nota', l.t, l.end, `${quote(l)}: quem fala não aparece em nenhum momento da fala.`);
      continue;
    }
    const mid = views[Math.floor(views.length / 2)];
    if (!inFrame(mid)) continue;
    // Facing away from the camera (a shot over the speaker's shoulder), there is no face to keep clear or centered.
    const me = stage.subject(l.who, mid.t)!;
    const facing = ((me.yaw + (me.head?.yaw ?? 0)) * Math.PI) / 180;
    const towards = Math.atan2(-(mid.pose.pos[0] - me.pos[0]), -(mid.pose.pos[2] - me.pos[2]));
    const turned = Math.abs(Math.atan2(Math.sin(towards - facing), Math.cos(towards - facing)));
    if (turned > (100 * Math.PI) / 180) continue;
    if (Math.abs(mid.p.x) > edge) add('fala-na-borda', 'aviso', l.t, l.end, `${quote(l)}: o rosto está a ${Math.round(Math.abs(mid.p.x) * 100)}% do caminho até a borda ${mid.p.x < 0 ? 'esquerda' : 'direita'}; quem fala fica no terço central.`);
    // The eyes and the mouth both have to be seen.
    const mouth: Vec3 = [mid.head[0], mid.head[1] - 0.1 * scaleOf(l.who), mid.head[2]];
    const blocker = at(mid.t).find(({ id, s }) => {
      if (id === l.who || (mid.pose.follow === id && mid.pose.mode === 'fpv')) return false;
      const k = scaleOf(id);
      return [mid.head, mouth].some((aim) => {
        const { distance, along } = flatDistance(mid.pose.pos, aim, [s.pos[0], 0, s.pos[2]]);
        if (along < 0.05 || along > 0.95) return false;
        // Height of the sight line where it passes them: the head is a ball, the body a narrower column under it.
        const y = mid.pose.pos[1] + (aim[1] - mid.pose.pos[1]) * along - s.pos[1];
        const head = headRadius(id) * k + 0.03;
        if (Math.hypot(distance, y - s.eyeHeight) < head) return true;
        return y > 0 && y < s.eyeHeight - head && distance < TORSO * k;
      });
    });
    if (blocker) add('fala-tapada', 'aviso', l.t, l.end, `${quote(l)}: "${nameOf(blocker.id)}" (${blocker.id}) está entre a câmera e o rosto de quem fala.`);
    else if (clearFraction(solid, mid.pose.pos, mid.head) < 0.98) add('fala-tapada', 'aviso', l.t, l.end, `${quote(l)}: há uma parede ou um móvel entre a câmera e o rosto de quem fala.`);
  }
  function at(t: number): { id: string; s: NonNullable<ReturnType<CameraStage['subject']>> }[] {
    return people.map((id) => ({ id, s: stage.subject(id, t)! }));
  }

  // --- Censorship: on the picture, and until the cut ---------------------------------------------------------
  const cuts = episode.camera.filter((k) => k.cut).map((k) => k.t);
  const censors = clips.filter((c) => c.action === 'censor');
  for (const c of censors) {
    const end = c.t + (c.duration ?? 0);
    const point = (c.params as { censor?: { at?: Vec3 }; at?: Vec3 } | undefined)?.censor?.at ?? (c.params as { at?: Vec3 } | undefined)?.at;
    const next = cuts.find((t) => t > c.t + 1e-6) ?? episode.duration;
    // Another cover taking over at the same instant is the same as lasting.
    const handed = censors.some((o) => o !== c && Math.abs(o.t - end) < 0.05);
    if (next - end > 0.05 && !handed) add('censura', 'aviso', end, next, `A censura acaba aos ${end.toFixed(1)} s e o plano só corta aos ${next.toFixed(1)} s: o que ela cobria aparece por ${(next - end).toFixed(1)} s.`);
    if (!point) continue;
    const off: number[] = [];
    for (let t = c.t; t < end; t += SAMPLE) {
      const p = project(evaluateCamera(episode.camera, t, stage), point, aspect);
      if (p.depth <= 0 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) off.push(t);
    }
    for (const [from, to] of stretches(off, SAMPLE)) add('censura', 'nota', from, to, 'O ponto censurado está fora do quadro: confira se a censura está no lugar certo.');
  }

  // --- The rest: shake, length, frozen people, lines with no take ---------------------------------------------
  const shaky = episode.camera.filter((k: CameraKey) => (k.shake ?? 0) > maxShake + 1e-9);
  for (const [from, to] of stretches(shaky.map((k) => k.t), 2)) {
    const most = Math.max(...shaky.filter((k) => k.t >= from && k.t <= to).map((k) => k.shake!));
    add('tremor', 'aviso', from, to, `Tremor de câmera ${most}: o combinado é até ${maxShake}, por pouco tempo.`);
  }
  const length = finalTime(episode, episode.duration);
  if (length > limit) add('duracao', 'erro', episode.duration, undefined, `O vídeo tem ${length.toFixed(1)} s: passa do limite de ${limit} s.`);
  else if (length > limit - 10) add('duracao', 'aviso', episode.duration, undefined, `O vídeo tem ${length.toFixed(1)} s: menos de 10 s de folga para o limite de ${limit} s.`);
  for (const w of episode.warnings ?? []) add('parado', 'aviso', Number(/de ([\d.]+) s/.exec(w)?.[1] ?? 0), undefined, w);
  const untaken = lines.filter((l) => !(l.clip.params as { take?: unknown } | undefined)?.take);
  if (untaken.length) add('sem-gravacao', 'nota', untaken[0].t, undefined, `${untaken.length} de ${lines.length} falas ainda sem voz gravada: os tempos mudam quando a voz chegar (rode de novo depois de \`npm run voz\`).`);

  const rank: Record<FindingLevel, number> = { erro: 0, aviso: 1, nota: 2 };
  return out.sort((a, b) => a.t - b.t || rank[a.level] - rank[b.level]);
}

/** Findings as lines of text, times as in the finished video. */
export function reviewReport(episode: Pick<Episode, 'cuts' | 'slow'>, findings: Finding[]): string[] {
  const clock = (t: number): string => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  const sign: Record<FindingLevel, string> = { erro: '✖', aviso: '⚠', nota: '·' };
  return findings.map((f) => {
    const [from, to] = [finalTime(episode, f.t), f.end === undefined ? undefined : finalTime(episode, f.end)];
    return `${sign[f.level]} ${clock(from)}${to !== undefined && to - from >= 0.2 ? `–${clock(to)}` : ''}  [${f.check}] ${f.text}`;
  });
}
