import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import '../engine/assets/school';
import '../engine/assets/nature';
import '../engine/assets/building';
import { activeRules, resolveEnvironment, type Bible } from '../engine/bible';
import { EnvironmentRig } from '../engine/environment';
import '../engine/assets/vehicles';
import { compileActions, evaluateActions } from '../engine/timeline/actions';
import { evaluateCamera } from '../engine/timeline/camera';
import type { Episode } from '../engine/timeline/episode';
import { buildLocation } from '../engine/world/build';
import { describeTarget } from '../engine/world/interactive';
import type { Location, Room } from '../engine/world/types';
import { TimelineBar } from './timeline';
import { WalkControls } from './walk';

// Series data lives in /series as plain files; the studio only reads it.
const bibles = import.meta.glob<Bible>('/series/*/bible.json', { eager: true, import: 'default' });
const locations = import.meta.glob<Location>('/series/*/world/*.json', { eager: true, import: 'default' });
const episodes = import.meta.glob<Episode>('/series/*/episodes/*.json', { eager: true, import: 'default' });

const bible = Object.values(bibles)[0];
const inSeries = <T>(files: Record<string, T>) =>
  Object.entries(files).filter(([path]) => path.includes(`/series/${bible.series}/`)).map(([, v]) => v);
const episode: Episode | undefined = inSeries(episodes).sort((a, b) => a.episode - b.episode)[0];
const location = inSeries(locations).find((l) => !episode || l.id === episode.location);
if (!location) throw new Error(`A série "${bible.series}" ainda não tem nenhum cenário em world/.`);
const episodeNumber = episode?.episode ?? 1;

const stage = document.getElementById('stage')!;
const hint = document.getElementById('hint')!;
const panel = document.getElementById('panel')!;
const previewLabel = document.getElementById('preview-label')!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.autoClear = false;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
const environment = new EnvironmentRig(scene);
scene.add(environment.group);

const built = buildLocation(location);
scene.add(built.group);

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

function applyShot(t: number): void {
  if (!episode) return;
  const pose = evaluateCamera(episode.camera, t);
  shotCamera.position.set(...pose.pos);
  shotCamera.lookAt(...pose.lookAt);
  shotCamera.fov = pose.fov;
  shotCamera.updateProjectionMatrix();
  shotCamera.updateMatrixWorld();
  gizmoCamera.copy(shotCamera, false);
  gizmoCamera.near = 0.2;
  gizmoCamera.far = 1.6;
  gizmoCamera.updateProjectionMatrix();
  gizmoCamera.updateMatrixWorld();
  frustum?.update();
}

let frustum: THREE.CameraHelper | undefined;
if (episode) {
  frustum = new THREE.CameraHelper(gizmoCamera);
  const samples: THREE.Vector3[] = [];
  for (let t = 0; t <= episode.duration; t += 0.1) samples.push(new THREE.Vector3(...evaluateCamera(episode.camera, t).pos));
  const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(samples), new THREE.LineBasicMaterial({ color: '#ffd400' }));
  gizmos.add(frustum, path);
  for (const key of episode.camera) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: key.cut ? '#ff6b3d' : '#ffd400' }));
    dot.position.set(...key.pos);
    gizmos.add(dot);
  }
}

// ---- Actions ----

const compiled = compileActions(episode?.actions ?? [], [...built.interactives.values()].map(describeTarget));
let doorsBlock = true;

/** Put every interactive object in the state it has at time t. */
function applyActions(t: number): void {
  const states = evaluateActions(compiled, t);
  for (const [id, state] of states) {
    const it = built.interactives.get(id)!;
    for (const [name, value] of Object.entries(state.channels)) it.channels[name].set(value);
    if (state.pose) {
      it.object.position.set(state.pose.x, state.pose.y, state.pose.z);
      it.object.rotation.y = THREE.MathUtils.degToRad(state.pose.rot);
    }
  }
  // Riders follow their anchor once every carrier is in place.
  built.group.updateMatrixWorld(true);
  const position = new THREE.Vector3();
  const direction = new THREE.Vector3();
  for (const [id, state] of states) {
    if (!state.attachedTo) continue;
    const dot = state.attachedTo.indexOf('.');
    const anchor = built.interactives.get(state.attachedTo.slice(0, dot))!.anchors[state.attachedTo.slice(dot + 1)];
    const rider = built.interactives.get(id)!.object;
    rider.position.copy(anchor.getWorldPosition(position));
    anchor.getWorldDirection(direction);
    rider.rotation.y = Math.atan2(direction.x, direction.z);
  }
  if (!doorsBlock) for (const it of built.interactives.values()) if (it.kind === 'door') it.channels.open.set(1);
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
    hint.textContent = 'Clique para olhar com o mouse · WASD anda · Shift corre · setas viram · Esc solta o mouse';
  } else if (next === 'orbit') {
    overview();
    hint.textContent = 'Arraste para girar · roda do mouse aproxima · botão direito desloca';
  } else {
    hint.textContent = '';
  }
  hint.hidden = !hint.textContent;
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
  const rules = activeRules(bible, episodeNumber).filter((r) => !disabledRules.has(r.id));
  environment.apply(resolveEnvironment(rules));
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

  if (mode === 'walk') {
    panel.append(el('h2', 'Portas'));
    panel.append(
      checkbox('Portas fechadas bloqueiam', 'Desmarque para explorar com todas abertas.', doorsBlock, (on) => {
        doorsBlock = on;
        applyActions(timeline?.time ?? 0);
      }),
    );
  }

  if (episode?.actions?.length) {
    panel.append(el('h2', 'Ações do episódio'));
    for (const action of [...episode.actions].sort((a, b) => a.t - b.t)) {
      const b = el('button', '', 'event');
      b.append(el('b', `${action.t}s`), el('span', `${action.action} · ${action.target}${action.params?.part ? ` (${action.params.part})` : ''}`));
      b.onclick = () => timeline?.seek(action.t * bible.format.fps);
      panel.append(b);
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
  timeline = new TimelineBar(episode, bible.format.fps, () => {
    applyShot(timeline!.time);
    applyActions(timeline!.time);
  });
  document.getElementById('viewport')!.append(timeline.element);
  applyShot(0);
}
applyActions(0);

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
  }
  const [x, y, w, h] = rect ?? [0, 0, width, height];
  renderer.setViewport(x, y, w, h);
  renderer.setScissor(x, y, w, h);
  renderer.setScissorTest(true);
  renderer.clear();
  renderer.render(scene, cam);
  if (asShot) applyVisibility();
}

applyEnvironment();
setMode('orbit');

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
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
  __studio: { setMode, setLevel, focusRoom: (id: string) => focusRoom(location!.rooms.find((r) => r.id === id)!), walk, camera, timeline },
});
