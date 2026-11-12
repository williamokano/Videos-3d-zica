import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import '../engine/assets';
import { evaluateActions, type CompiledActions } from '../engine/actions/catalog';
import { loadGlbCharacter } from '../engine/character/glb';
import type { CharacterDef, CharacterRig } from '../engine/character/types';
import { applyStage, buildCast, buildProps, buildWorld, cameraStage, compileEpisode } from '../engine/timeline/stage';
import { activeRules, resolveEnvironment, type Bible } from '../engine/bible';
import { EnvironmentRig } from '../engine/environment';
import { evaluateCamera, validateCamera, type CameraPose, type CameraStage } from '../engine/timeline/camera';
import { isScript, resolveScript, type EpisodeScript } from '../engine/timeline/direct';
import { frameCount, type Episode } from '../engine/timeline/episode';
import { buildLocation, type InteractiveObject } from '../engine/world/build';
import type { Location, Room } from '../engine/world/types';
import { TimelineBar } from './timeline';
import { WalkControls } from './walk';

// Series data lives in /series as plain files; the studio only reads it.
const bibles = import.meta.glob<Bible>('/series/*/bible.json', { eager: true, import: 'default' });
const locations = import.meta.glob<Location>('/series/*/world/*.json', { eager: true, import: 'default' });
// An episode is a JSON file with every time written out, or a script (.ts) that works the times out.
const episodes = import.meta.glob<Episode | EpisodeScript>('/series/*/episodes/*.{json,ts}', { eager: true, import: 'default' });
const characters = import.meta.glob<CharacterDef>('/series/*/characters/*.json', { eager: true, import: 'default' });
const models = import.meta.glob<string>('/series/*/characters/*.glb', { eager: true, import: 'default', query: '?url' });

// Which series and episode to open comes from the address: ?series=<id>&ep=<number>.
const query = new URLSearchParams(window.location.search);
const allBibles = Object.values(bibles);
const bible = allBibles.find((b) => b.series === query.get('series')) ?? allBibles[0];
const inSeries = <T>(files: Record<string, T>) =>
  Object.entries(files).filter(([path]) => path.includes(`/series/${bible.series}/`)).map(([, v]) => v);
const seriesEpisodes = inSeries(episodes).sort((a, b) => a.episode - b.episode);
const source: Episode | EpisodeScript | undefined = seriesEpisodes.find((e) => e.episode === Number(query.get('ep'))) ?? seriesEpisodes[0];
const location = inSeries(locations).find((l) => !source || l.id === source.location);
if (!location) throw new Error(`A série "${bible.series}" ainda não tem nenhum cenário em world/.`);
const episodeNumber = source?.episode ?? 1;

// ?render[=scale] turns the page into a frame source for scripts/render.mjs: only the episode camera, at the final size.
const rendering = query.has('render');
const renderScale = Number(query.get('render')) || 1;
if (rendering) {
  document.body.classList.add('render');
  document.body.style.setProperty('--frame-w', `${Math.round(bible.format.width * renderScale)}px`);
  document.body.style.setProperty('--frame-h', `${Math.round(bible.format.height * renderScale)}px`);
}

const stage = document.getElementById('stage')!;
const hint = document.getElementById('hint')!;
const panel = document.getElementById('panel')!;
const previewLabel = document.getElementById('preview-label')!;
// Spoken lines, shown while there is no voice. ?subs=0 leaves them out of a render.
const subtitle = document.createElement('div');
subtitle.id = 'subtitle';
subtitle.hidden = true;
stage.append(subtitle);
const showSubtitles = query.get('subs') !== '0';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(rendering ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.autoClear = false;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
const environment = new EnvironmentRig(scene);
scene.add(environment.group);

const built = buildLocation(location);
scene.add(built.group);

let actionsError = '';
let episode: Episode | undefined;
if (source && isScript(source)) {
  try {
    episode = resolveScript(source, built, inSeries(characters), bible);
  } catch (error) {
    // Show the location anyway, with the error in the panel.
    actionsError = `Roteiro do episódio ${source.episode}: ${error instanceof Error ? error.message : String(error)}`;
    const [x, z] = location.spawn?.pos ?? [0, 0];
    episode = { episode: source.episode, title: source.title, location: source.location, duration: 1, camera: [{ t: 0, pos: [x, 6, z + 12], lookAt: [x, 1, z] }] };
  }
} else {
  episode = source;
}

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
const walk = new WalkControls(camera, renderer.domElement, built.colliders, built.surfaces);

// ---- Episode camera ----

const frameAspect = bible.format.width / bible.format.height;
const shotCamera = new THREE.PerspectiveCamera(50, frameAspect, 0.1, 1000);
/** Short-range copy of the episode camera, so its frustum gizmo stays small. */
const gizmoCamera = new THREE.PerspectiveCamera(50, frameAspect, 0.2, 1.6);
/** Things drawn only in the free views: the episode camera's frustum and its path. */
const gizmos = new THREE.Group();
scene.add(gizmos);

// ---- Episode cast and actions ----

let actions: CompiledActions = { tracks: [], clips: [], links: [], gazes: [], events: [], behaviours: [], focus: {}, initial: {}, sockets: {}, scales: {} };
let cast: InteractiveObject[] = [];
const world = buildWorld(bible, episodeNumber);
/** Things the episode adds to the location. */
let props: InteractiveObject[] = [];
/** False when the camera track has an error; the shot view then stays where it is. */
let cameraOk = false;
if (episode) {
  try {
    const defs = inSeries(characters);
    const rigs: Record<string, CharacterRig> = {};
    for (const def of defs) {
      if (!def.glb || !episode.cast?.some((m) => m.character === def.id)) continue;
      const url = models[`/series/${bible.series}/characters/${def.glb}`];
      if (!url) throw new Error(`Personagem "${def.id}": arquivo "${def.glb}" não encontrado em series/${bible.series}/characters.`);
      rigs[def.id] = await loadGlbCharacter(def, url);
    }
    cast = buildCast(episode, defs, rigs);
    for (const character of cast) scene.add(character.object);
    props = buildProps(episode);
    for (const prop of props) scene.add(prop.object);
    actions = compileEpisode(episode, built, cast, [world, ...props]);
  } catch (error) {
    actionsError = [actionsError, error instanceof Error ? error.message : String(error)].filter(Boolean).join('\n');
  }
}
if (episode) {
  try {
    validateCamera(episode.camera, cast.map((c) => c.id));
    cameraOk = true;
  } catch (error) {
    actionsError = [actionsError, error instanceof Error ? error.message : String(error)].filter(Boolean).join('\n');
  }
}
const shotStage: CameraStage = cameraStage(actions, built, cast);
/** Character whose eyes the episode camera is in right now, if any. */
let firstPerson: InteractiveObject | undefined;
const interactiveById = new Map([...built.interactives, ...cast, world, ...props].map((o) => [o.id, o]));
/** Doors opened or closed by hand in walk mode, until the timeline moves again. */
const handOverrides = new Map<string, number>();

function applyActions(t: number): void {
  handOverrides.clear();
  applyStage(actions, interactiveById, t);
  applyEnvironment();
}

/** Walk mode: open or close the nearest door within reach, ignoring which side it opens from. */
function toggleNearestDoor(): void {
  const p = camera.position;
  let best: { id: string; distance: number } | undefined;
  for (const o of built.interactives) {
    if (o.kind !== 'door') continue;
    const [x, y, z] = o.position();
    const distance = Math.hypot(x - p.x, z - p.z);
    if (distance < 2.5 && Math.abs(y + 1.6 - p.y) < 1.5 && (!best || distance < best.distance)) best = { id: o.id, distance };
  }
  if (!best) return;
  const now = handOverrides.get(best.id) ?? evaluateActions(actions, timeline?.time ?? 0)[best.id]?.open ?? interactiveById.get(best.id)!.channels.open;
  const next = now >= 0.5 ? 0 : 1;
  handOverrides.set(best.id, next);
  interactiveById.get(best.id)!.set('open', next);
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && mode === 'walk') toggleNearestDoor();
});

function applyShot(t: number): void {
  if (!episode) return;
  applyActions(t);
  if (!cameraOk) return;
  const pose: CameraPose = evaluateCamera(episode.camera, t, shotStage);
  firstPerson = pose.mode === 'fpv' ? interactiveById.get(pose.follow!) : undefined;
  shotCamera.position.set(...pose.pos);
  shotCamera.lookAt(...pose.lookAt);
  shotCamera.fov = pose.fov;
  shotCamera.updateProjectionMatrix();
  shotCamera.updateMatrixWorld();
  showLine(t);
  gizmoCamera.copy(shotCamera, false);
  gizmoCamera.near = 0.2;
  gizmoCamera.far = 1.6;
  gizmoCamera.updateProjectionMatrix();
  gizmoCamera.updateMatrixWorld();
  frustum?.update();
}

/** Who says what at time t, as a subtitle over the episode camera's picture. */
function showLine(t: number): void {
  const line = actions.events.find((e) => e.type === 'line' && t >= e.t && t < e.t + (e.data.duration as number));
  const visible = Boolean(line) && showSubtitles && (mode === 'shot' || rendering);
  subtitle.hidden = !visible;
  if (!visible || !line) return;
  const member = episode?.cast?.find((m) => (m.id ?? m.character) === line.target);
  const name = member?.look?.name ?? inSeries(characters).find((c) => c.id === member?.character)?.name ?? line.target;
  subtitle.replaceChildren(el('b', `${name}: `), String(line.data.text));
  const [x, y, w, h] = fit(0, 0, width, height);
  Object.assign(subtitle.style, { left: `${x + w * 0.06}px`, width: `${w * 0.88}px`, bottom: `${y + h * 0.1}px`, fontSize: `${h * 0.024}px` });
}

let frustum: THREE.CameraHelper | undefined;
if (episode && cameraOk) {
  frustum = new THREE.CameraHelper(gizmoCamera);
  const samples: THREE.Vector3[] = [];
  for (let t = 0; t <= episode.duration; t += 0.1) samples.push(new THREE.Vector3(...evaluateCamera(episode.camera, t, shotStage).pos));
  const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(samples), new THREE.LineBasicMaterial({ color: '#ffd400' }));
  gizmos.add(frustum, path);
  for (const key of episode.camera) {
    if (!key.pos) continue;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: key.cut ? '#ff6b3d' : '#ffd400' }));
    dot.position.set(...key.pos);
    gizmos.add(dot);
  }
}

// ---- State ----

type Mode = 'orbit' | 'walk' | 'shot';
let mode: Mode = 'orbit';
/** Orbit view only: hide everything above this floor height. null shows all storeys. */
let level: number | null = null;
let showPreview = true;
let snippet = '';
const disabledRules = new Set<string>();

const levels = [...new Set(location.rooms.map((r) => r.elevation ?? 0))].sort((a, b) => b - a);
const levelName = (y: number) => (y === 0 ? 'Térreo' : y < 0 ? `Subsolo (${y} m)` : `Andar (+${y} m)`);

function roomCenter(room: Room): [number, number] {
  return [room.origin[0] + room.size[0] / 2, room.origin[1] + room.size[1] / 2];
}

function frameOrbit(cx: number, cy: number, cz: number, span: number): void {
  orbit.target.set(cx, cy, cz);
  camera.position.set(cx + span * 0.35, cy + span * 0.8, cz + span * 0.85);
  orbit.update();
}

function overview(): void {
  const box = new THREE.Box2();
  for (const r of location!.rooms) {
    box.expandByPoint(new THREE.Vector2(r.origin[0], r.origin[1]));
    box.expandByPoint(new THREE.Vector2(r.origin[0] + r.size[0], r.origin[1] + r.size[1]));
  }
  const c = box.getCenter(new THREE.Vector2());
  const s = box.getSize(new THREE.Vector2());
  frameOrbit(c.x, level ?? 0, c.y, Math.max(s.x, s.y) * 0.75);
}

/** Dollhouse rules: in orbit the viewed storey loses its ceiling and everything above it is hidden. */
function applyVisibility(): void {
  const cut = mode === 'orbit' ? level : null;
  for (const room of built.rooms) {
    room.group.visible = cut === null || room.elevation <= cut;
    room.ceiling.visible = mode !== 'orbit' || (cut !== null && room.elevation < cut);
  }
  built.exterior.visible = cut === null || cut >= 0;
  for (const s of built.stairs) s.group.visible = cut === null || s.bottom <= cut;
  for (const c of cast) c.object.visible = cut === null || c.position()[1] <= cut + 0.5;
}

function setLevel(next: number | null): void {
  level = next;
  applyVisibility();
  overview();
  renderPanel();
}

function setMode(next: Mode): void {
  mode = next;
  orbit.enabled = next === 'orbit';
  walk.enabled = next === 'walk';
  if (next !== 'walk') walk.exit();
  applyVisibility();
  if (next === 'walk') {
    const spawn = location!.spawn;
    const [x, z] = spawn?.pos ?? roomCenter(location!.rooms[0]);
    walk.placeAt(x, z, spawn?.elevation ?? location!.rooms[0].elevation ?? 0, spawn?.yaw ?? 0);
    hint.textContent = 'Clique para olhar com o mouse · WASD anda · Shift corre · setas viram · E abre e fecha a porta mais próxima · Esc solta o mouse';
  } else if (next === 'orbit') {
    overview();
    hint.textContent = 'Arraste para girar · roda do mouse aproxima · botão direito desloca';
  } else {
    hint.textContent = 'Visão da câmera do episódio no formato final · espaço toca · , e . andam um frame';
  }
  renderPanel();
}

function focusRoom(room: Room): void {
  const [x, z] = roomCenter(room);
  const elevation = room.elevation ?? 0;
  if (mode === 'walk') {
    walk.placeAt(x, z, elevation, 90);
    return;
  }
  if (mode === 'shot') setMode('orbit');
  level = elevation === levels[0] ? null : elevation;
  applyVisibility();
  frameOrbit(x, elevation, z, Math.max(9, Math.max(...room.size) * 1.1));
  renderPanel();
}

function applyEnvironment(): void {
  // Every rule of the bible counts, by how much the world has it in effect right now.
  const rules = bible.rules.filter((r) => !disabledRules.has(r.id));
  environment.apply(resolveEnvironment(rules, Object.fromEntries(rules.map((r) => [r.id, world.get!(`rule.${r.id}`) ?? 0]))));
}

/** Current free-view pose as a camera keyframe at the current time, ready to paste into the episode file. */
function captureKeyframe(): void {
  const r = (n: number) => Math.round(n * 100) / 100;
  const target = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(4).add(camera.position);
  snippet = JSON.stringify({
    t: r(timeline?.time ?? 0),
    pos: camera.position.toArray().map(r),
    lookAt: target.toArray().map(r),
    fov: r(camera.fov),
  });
  void navigator.clipboard?.writeText(snippet).catch(() => {});
  renderPanel();
}

// ---- Panel ----

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(label: string, active: boolean, onClick: () => void): HTMLButtonElement {
  const b = el('button', label, active ? 'active' : '');
  b.onclick = onClick;
  return b;
}

function checkbox(title: string, detail: string, checked: boolean, onChange: (checked: boolean) => void): HTMLLabelElement {
  const label = el('label');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = checked;
  box.onchange = () => onChange(box.checked);
  const text = el('span', title);
  if (detail) text.append(el('small', detail));
  label.append(box, text);
  return label;
}

function renderPanel(): void {
  panel.replaceChildren();
  const subtitle = episode ? `Episódio ${episode.episode}: ${episode.title}` : 'Sem episódio';
  panel.append(el('h1', bible.title), el('p', `${subtitle} · ${bible.language} · ${location!.name}`));

  if (allBibles.length > 1 || seriesEpisodes.length > 1) {
    panel.append(el('h2', 'Série e episódio'));
    const open = (series: string, ep?: number) => {
      window.location.search = `?series=${series}${ep === undefined ? '' : `&ep=${ep}`}`;
    };
    if (allBibles.length > 1) for (const b of allBibles) panel.append(button(b.title, b === bible, () => open(b.series)));
    if (seriesEpisodes.length > 1) {
      for (const e of seriesEpisodes) panel.append(button(`Episódio ${e.episode}: ${e.title}`, e === source, () => open(bible.series, e.episode)));
    }
  }

  panel.append(el('h2', 'Visão'));
  const modes = el('div', '', 'row');
  modes.append(button('Geral', mode === 'orbit', () => setMode('orbit')), button('Andar', mode === 'walk', () => setMode('walk')));
  if (episode) modes.append(button('Câmera', mode === 'shot', () => setMode('shot')));
  panel.append(modes);

  if (mode === 'orbit' && levels.length > 1) {
    panel.append(el('h2', 'Nível'));
    panel.append(button('Todos', level === null, () => setLevel(null)));
    for (const y of levels) panel.append(button(levelName(y), level === y, () => setLevel(y)));
  }

  if (episode && mode !== 'shot') {
    panel.append(el('h2', 'Câmera do episódio'));
    panel.append(
      checkbox('Mostrar prévia e trajeto', '', showPreview, (on) => {
        showPreview = on;
      }),
      button('Levar minha visão até a câmera', false, () => {
        if (mode === 'walk') setMode('orbit');
        camera.position.copy(shotCamera.position);
        orbit.target.copy(shotCamera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3).add(shotCamera.position));
        orbit.update();
      }),
      button('Copiar minha visão como keyframe', false, captureKeyframe),
    );
    if (snippet) panel.append(el('div', snippet, 'snippet'));
  }

  if (cast.length) {
    panel.append(el('h2', 'Elenco'));
    for (const c of cast) {
      panel.append(button(c.id, false, () => {
        if (mode !== 'orbit') setMode('orbit');
        const [x, y, z] = c.position();
        frameOrbit(x, y + 1, z, 5);
      }));
    }
  }

  if (actionsError || actions.clips.length) {
    panel.append(el('h2', 'Ações do episódio'));
    if (actionsError) panel.append(el('div', actionsError, 'error'));
    for (const clip of actions.clips) {
      panel.append(button(`${clip.t}s · ${clip.action} · ${clip.target}`, false, () => timeline?.seek(Math.round(clip.t * bible.format.fps))));
    }
  }

  panel.append(el('h2', 'Bíblia — regras ativas'));
  const rules = activeRules(bible, episodeNumber);
  if (!rules.length) panel.append(el('p', 'Nenhuma regra ativa neste episódio.'));
  for (const rule of rules) {
    panel.append(
      checkbox(rule.id, rule.description, !disabledRules.has(rule.id), (on) => {
        if (on) disabledRules.delete(rule.id);
        else disabledRules.add(rule.id);
        applyEnvironment();
      }),
    );
  }

  panel.append(el('h2', 'Áreas'));
  for (const room of location!.rooms) panel.append(button(room.name, false, () => focusRoom(room)));
}

// ---- Timeline ----

let timeline: TimelineBar | undefined;
if (episode) {
  timeline = new TimelineBar(episode, bible.format.fps, () => applyShot(timeline!.time), actions.clips);
  document.getElementById('viewport')!.append(timeline.element);
  applyShot(0);
}

// ---- Loop ----

let width = 1;
let height = 1;
function resize(): void {
  width = stage.clientWidth;
  height = stage.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

/** Largest rectangle with the episode's aspect ratio inside the given box (CSS pixels, origin bottom-left). */
function fit(x: number, y: number, w: number, h: number): [number, number, number, number] {
  const fw = Math.min(w, h * frameAspect);
  const fh = fw / frameAspect;
  return [x + (w - fw) / 2, y + (h - fh) / 2, fw, fh];
}

/** Draw one view. `asShot` renders what the episode camera really sees: the full scene with ceilings and no gizmos. */
function draw(cam: THREE.Camera, rect: [number, number, number, number] | null, asShot: boolean, withGizmos = false): void {
  gizmos.visible = withGizmos;
  if (asShot) {
    for (const r of built.rooms) r.group.visible = r.ceiling.visible = true;
    built.exterior.visible = true;
    for (const s of built.stairs) s.group.visible = true;
    for (const c of cast) c.object.visible = true;
    firstPerson?.firstPerson?.(true);
  }
  const [x, y, w, h] = rect ?? [0, 0, width, height];
  renderer.setViewport(x, y, w, h);
  renderer.setScissor(x, y, w, h);
  renderer.setScissorTest(true);
  renderer.clear();
  renderer.render(scene, cam);
  if (asShot) {
    firstPerson?.firstPerson?.(false);
    applyVisibility();
  }
}

applyEnvironment();
setMode('orbit');

const clock = new THREE.Timer();
if (rendering) {
  // Frames are drawn one by one, on request, so what is captured never depends on the clock.
  const frames = episode ? frameCount(episode, bible.format.fps) : 0;
  const settle = () => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
  const info = renderer.getContext().getExtension('WEBGL_debug_renderer_info');
  Object.assign(window, {
    __render: {
      frames,
      fps: bible.format.fps,
      width,
      height,
      series: bible.series,
      episode: episodeNumber,
      error: actionsError,
      gpu: info ? String(renderer.getContext().getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'desconhecida',
      async frame(n: number): Promise<void> {
        timeline!.seek(n);
        renderer.setScissorTest(false);
        renderer.clear();
        draw(shotCamera, [0, 0, width, height], true);
        await settle();
      },
    },
  });
}
renderer.setAnimationLoop(rendering ? null : () => {
  clock.update();
  const dt = Math.min(clock.getDelta(), 0.1);
  timeline?.update(dt);
  if (mode === 'walk') walk.update(dt);
  else if (mode === 'orbit') orbit.update();

  renderer.setScissorTest(false);
  renderer.setClearColor('#0c0d10');
  renderer.clear();
  const inset = episode && showPreview && mode !== 'shot';
  previewLabel.hidden = !inset;
  if (mode === 'shot') {
    draw(shotCamera, fit(0, 0, width, height), true);
  } else {
    draw(camera, null, false, Boolean(inset));
    if (inset) {
      const h = Math.min(height * 0.45, 420);
      const rect = fit(width - h * frameAspect - 12, 12, h * frameAspect, h);
      draw(shotCamera, rect, true);
      previewLabel.style.left = `${rect[0]}px`;
      previewLabel.style.bottom = `${rect[1] + rect[3] + 4}px`;
    }
  }
});

// Handle for automated checks and debugging from the console.
Object.assign(window, {
  __studio: {
    setMode, setLevel, orbit, focusRoom: (id: string) => focusRoom(location!.rooms.find((r) => r.id === id)!), walk, camera, timeline,
    interactives: built.interactives, cast, actionsError, toggleNearestDoor,
  },
});
