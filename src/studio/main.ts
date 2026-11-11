import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import '../engine/assets/school';
import '../engine/assets/nature';
import { activeRules, resolveEnvironment, type Bible } from '../engine/bible';
import { EnvironmentRig } from '../engine/environment';
import { buildLocation } from '../engine/world/build';
import type { Location, Room } from '../engine/world/types';
import { WalkControls } from './walk';

// Series data lives in /series as plain files; the studio only reads it.
const bibles = import.meta.glob<Bible>('/series/*/bible.json', { eager: true, import: 'default' });
const locations = import.meta.glob<Location>('/series/*/world/*.json', { eager: true, import: 'default' });

const bible = Object.values(bibles)[0];
const location = Object.entries(locations).find(([path]) => path.includes(`/series/${bible.series}/`))?.[1];
if (!location) throw new Error(`A série "${bible.series}" ainda não tem nenhum cenário em world/.`);

const EPISODE = 1;

const viewport = document.getElementById('viewport')!;
const hint = document.getElementById('hint')!;
const panel = document.getElementById('panel')!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
viewport.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
const environment = new EnvironmentRig(scene);
scene.add(environment.group);

const built = buildLocation(location);
scene.add(built.group);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.maxPolarAngle = Math.PI / 2 - 0.03;
orbit.enableDamping = true;
const walk = new WalkControls(camera, renderer.domElement, built.colliders);

// ---- State ----

type Mode = 'orbit' | 'walk';
let mode: Mode = 'orbit';
const disabledRules = new Set<string>();

function roomCenter(room: Room): [number, number] {
  return [room.origin[0] + room.size[0] / 2, room.origin[1] + room.size[1] / 2];
}

function locationBounds() {
  const box = new THREE.Box2();
  for (const r of location!.rooms) {
    box.expandByPoint(new THREE.Vector2(r.origin[0], r.origin[1]));
    box.expandByPoint(new THREE.Vector2(r.origin[0] + r.size[0], r.origin[1] + r.size[1]));
  }
  return box;
}

function frameOrbit(cx: number, cz: number, span: number): void {
  orbit.target.set(cx, 0, cz);
  camera.position.set(cx + span * 0.35, span * 0.8, cz + span * 0.85);
  orbit.update();
}

function overview(): void {
  const b = locationBounds();
  const c = b.getCenter(new THREE.Vector2());
  const s = b.getSize(new THREE.Vector2());
  frameOrbit(c.x, c.y, Math.max(s.x, s.y) * 0.75);
}

function setMode(next: Mode): void {
  mode = next;
  orbit.enabled = next === 'orbit';
  built.ceilings.visible = next === 'walk';
  if (next === 'walk') {
    walk.enabled = true;
    const yard = location!.rooms.find((r) => r.outdoor) ?? location!.rooms[0];
    const [x, z] = roomCenter(yard);
    walk.placeAt(x, z, 0);
    hint.textContent = 'Clique para olhar com o mouse · WASD anda · Shift corre · setas viram · Esc solta o mouse';
  } else {
    walk.exit();
    overview();
    hint.textContent = 'Arraste para girar · roda do mouse aproxima · botão direito desloca';
  }
  renderPanel();
}

function focusRoom(room: Room): void {
  const [x, z] = roomCenter(room);
  if (mode === 'walk') walk.placeAt(x, z, 90);
  else frameOrbit(x, z, Math.max(...room.size) * 1.1);
}

function applyEnvironment(): void {
  const rules = activeRules(bible, EPISODE).filter((r) => !disabledRules.has(r.id));
  environment.apply(resolveEnvironment(rules));
}

// ---- Panel ----

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function renderPanel(): void {
  panel.replaceChildren();
  panel.append(el('h1', bible.title), el('p', `Episódio ${EPISODE} · ${bible.language} · ${location!.name}`));

  panel.append(el('h2', 'Navegação'));
  const modes = el('div', '', 'row');
  for (const [id, label] of [['orbit', 'Visão geral'], ['walk', 'Andar (FPV)']] as const) {
    const b = el('button', label, mode === id ? 'active' : '');
    b.onclick = () => setMode(id);
    modes.append(b);
  }
  panel.append(modes);

  panel.append(el('h2', 'Bíblia — regras ativas'));
  const rules = activeRules(bible, EPISODE);
  if (!rules.length) panel.append(el('p', 'Nenhuma regra ativa neste episódio.'));
  for (const rule of rules) {
    const label = el('label');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = !disabledRules.has(rule.id);
    box.onchange = () => {
      if (box.checked) disabledRules.delete(rule.id);
      else disabledRules.add(rule.id);
      applyEnvironment();
    };
    const text = el('span', rule.id);
    text.append(el('small', rule.description));
    label.append(box, text);
    panel.append(label);
  }

  panel.append(el('h2', 'Áreas'));
  for (const room of location!.rooms) {
    const b = el('button', room.name);
    b.onclick = () => focusRoom(room);
    panel.append(b);
  }
}

// ---- Loop ----

function resize(): void {
  const { clientWidth: w, clientHeight: h } = viewport;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();

applyEnvironment();
setMode('orbit');

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (mode === 'walk') walk.update(dt);
  else orbit.update();
  renderer.render(scene, camera);
});

// Handle for automated checks and debugging from the console.
Object.assign(window, { __studio: { setMode, focusRoom: (id: string) => focusRoom(location!.rooms.find((r) => r.id === id)!), walk, camera } });
