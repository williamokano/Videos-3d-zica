import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import '../engine/actions/builtin';
import '../engine/actions/character';
import '../engine/actions/phone';
import '../engine/assets';
import { mat, type AssetChannels } from '../engine/assets/registry';
import { actionsFor, assetGroups, channelRange, rowLayout } from '../engine/assets/showcase';
import { resolveStyle, type Bible } from '../engine/bible';
import { buildCharacter } from '../engine/character/cast';
import { EnvironmentRig } from '../engine/environment';
import { applyStyle } from '../engine/style';
import { buildProp, type InteractiveObject } from '../engine/world/build';
import { button, checkbox, el, select, slider } from './ui';

// The showcase of assets: the kit by group on an empty stage. Address: ?vitrine=assets&grupo=<group>&series=<id>.
// The series only sets the look (soft or cel) the assets are shown in.

const bibles = Object.values(import.meta.glob<Bible>('/series/*/bible.json', { eager: true, import: 'default' }));
const query = new URLSearchParams(window.location.search);
const bible = bibles.find((b) => b.series === query.get('series')) ?? bibles[0];
const groups = assetGroups();
const group = groups.find((g) => g.id === query.get('grupo')) ?? groups.find((g) => g.id === 'vehicle') ?? groups[0];

const stage = document.getElementById('stage')!;
const hint = document.getElementById('hint')!;
const panel = document.getElementById('panel')!;
document.title = 'Vitrine de assets';
hint.textContent = 'Clique num asset para selecionar · arraste para girar · roda do mouse aproxima · botão direito desloca';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 1000);
const environment = new EnvironmentRig(scene);
environment.apply({ skyTop: '#3f86d6', skyHorizon: '#d4ebff', sunColor: '#fff3dc', sunIntensity: 2.6, ambientIntensity: 1, fogNear: 70, fogFar: 260 });
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), mat('#9aa0a8'));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(environment.group, floor);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;

/** One asset on the stage. */
interface Slot {
  id: string;
  description: string;
  kind: string;
  object: InteractiveObject;
  /** The channels the asset itself declares, apart from where it is. */
  channels: AssetChannels;
  size: THREE.Vector3;
  nameplate: HTMLDivElement;
  /** Where each channel is now, for the sliders. */
  values: Record<string, number>;
}

/** Move a channel of an asset. */
function move(slot: Slot, channel: string, value: number): void {
  slot.values[channel] = value;
  slot.object.set(channel, value);
}

const style = resolveStyle(bible);
let selected: Slot | undefined;
/** Sweep every 0-to-1 channel back and forth, to see the asset move. */
let animate = false;
let time = 0;

const slots: Slot[] = group.assets.map((asset) => {
  const object = buildProp({ id: asset.id, asset: asset.id, pos: [0, 0] });
  // Things that hang from a ceiling stand at their own height here.
  const box = new THREE.Box3().setFromObject(object.object);
  const size = box.getSize(new THREE.Vector3());
  object.object.position.y -= Math.min(0, box.min.y);
  const nameplate = el('div', asset.id, 'nameplate');
  stage.append(nameplate);
  scene.add(object.object);
  const slot: Slot = { ...asset, object, channels: (object.object.userData.channels ?? {}) as AssetChannels, size, nameplate, values: {} };
  nameplate.onclick = () => pick(slot);
  return slot;
});
const places = rowLayout(slots.map((s) => Math.max(0.6, s.size.x)));
slots.forEach((slot, i) => slot.object.object.position.setX(places[i]));

// Somebody of 1.70 m next to the row, to see the size of things.
const person = buildCharacter({ id: 'escala', character: 'escala', at: [(places.at(-1) ?? 0) + Math.max(0.6, slots.at(-1)?.size.x ?? 0) / 2 + 1.5, 0], yaw: 180 }, { id: 'escala', name: 'Escala' });
scene.add(person.object);
const personPlate = el('div', '1,70 m', 'nameplate');
stage.append(personPlate);
applyStyle(scene, style);

function frame(slot?: Slot): void {
  if (slot) {
    const span = Math.max(slot.size.x, slot.size.y, slot.size.z, 0.5);
    const p = slot.object.object.position;
    orbit.target.set(p.x, slot.size.y * 0.5 + p.y, p.z);
    camera.position.set(p.x + span * 1.1, p.y + slot.size.y * 0.5 + span * 0.7, p.z + span * 1.9 + 0.6);
  } else {
    const width = (places.at(-1) ?? 0) - (places[0] ?? 0) + 5;
    const distance = Math.max(4, (width / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Math.min(1.6, camera.aspect));
    orbit.target.set(0.4, 0.8, 0);
    camera.position.set(0.4, 1.5 + distance * 0.22, distance);
  }
  orbit.update();
}

function pick(slot?: Slot): void {
  selected = slot;
  frame(slot);
  renderPanel();
}

// A click picks an asset; a drag is the camera's.
const raycaster = new THREE.Raycaster();
let pressed: [number, number] | undefined;
renderer.domElement.addEventListener('pointerdown', (e) => {
  pressed = [e.clientX, e.clientY];
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!pressed || Math.hypot(e.clientX - pressed[0], e.clientY - pressed[1]) > 4 || e.button !== 0) return;
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((e.clientY - rect.top) / rect.height) * 2), camera);
  const hit = raycaster.intersectObjects(slots.map((s) => s.object.object), true)[0];
  const slot = hit && slots.find((s) => {
    let o: THREE.Object3D | null = hit.object;
    while (o && o !== s.object.object) o = o.parent;
    return Boolean(o);
  });
  if (slot) pick(slot);
});

const GROUP_NAMES: Record<string, string> = { vehicle: 'Veículos', school: 'Escola', item: 'Itens', storage: 'Depósito', nature: 'Natureza', structure: 'Estrutura', light: 'Luzes' };

function renderPanel(): void {
  panel.replaceChildren();
  panel.append(el('h1', 'Vitrine de assets'), el('p', `${GROUP_NAMES[group.id] ?? group.id} · ${slots.length} ${slots.length === 1 ? 'asset' : 'assets'}`));
  const go = (search: string) => {
    window.location.search = search;
  };

  panel.append(el('h2', 'Grupo'));
  for (const g of groups) panel.append(button(`${GROUP_NAMES[g.id] ?? g.id} (${g.assets.length})`, g === group, () => go(`?vitrine=assets&grupo=${g.id}&series=${bible.series}`)));
  panel.append(
    button('Vitrine de personagens', false, () => go(`?vitrine=personagens&series=${bible.series}`)),
    button('Voltar ao estúdio', false, () => go(`?series=${bible.series}`)),
  );

  panel.append(el('h2', 'Estilo'));
  const looks = el('div', '', 'row');
  for (const [look, label] of [['soft', 'Suave'], ['cel', 'Cel shading']] as const) {
    looks.append(button(label, style.look === look, () => {
      style.look = look;
      applyStyle(scene, style);
      renderPanel();
    }));
  }
  panel.append(looks);

  panel.append(el('h2', 'Asset'));
  panel.append(button('Todos', !selected, () => pick()));
  for (const slot of slots) panel.append(button(slot.id, slot === selected, () => pick(slot)));

  panel.append(el('h2', 'Movimento'), checkbox('Animar os canais', 'abre e fecha tudo o que vai de 0 a 1', animate, (on) => {
    animate = on;
    if (!on) for (const slot of slots) for (const [name, channel] of Object.entries(slot.channels)) move(slot, name, channel.value);
    renderPanel();
  }));

  if (!selected) return;
  const slot = selected;
  panel.append(el('h2', slot.id), el('p', slot.description, 'note'));
  panel.append(el('p', `Tipo: ${slot.kind} · ${slot.size.x.toFixed(2)} × ${slot.size.y.toFixed(2)} × ${slot.size.z.toFixed(2)} m (largura × altura × comprimento)`, 'note'));

  panel.append(el('h2', 'Canais'));
  const names = Object.keys(slot.channels);
  if (!names.length) panel.append(el('p', 'Este asset não tem partes que se movem.', 'note'));
  for (const name of names) {
    panel.append(slider(name, channelRange(name), slot.values[name] ?? slot.object.channels[name] ?? 0, (v) => {
      animate = false;
      move(slot, name, v);
    }));
  }
  const sockets = Object.keys(slot.object.traits.sockets ?? {});
  if (sockets.length) panel.append(el('p', `Lugares: ${sockets.map((s) => s.replace(/^seat\./, '')).join(', ')}.`, 'note'));

  panel.append(el('h2', 'Ações que valem para ele'));
  const actions = actionsFor(slot.kind);
  const chosen = el('p', '', 'note');
  panel.append(select('Ação', [['', '(ver uma)'], ...actions.map((a): [string, string] => [a.id, a.id])], '', (id) => {
    const action = actions.find((a) => a.id === id);
    chosen.textContent = action ? `${action.description} Parâmetros: ${Object.entries(action.params).map(([k, p]) => `${k} (${p.description})`).join('; ') || 'nenhum'}.` : '';
  }), chosen);
}

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
frame();
renderPanel();

const feet = new THREE.Vector3();
const place = (plate: HTMLElement, at: THREE.Vector3): void => {
  feet.set(at.x, 0, at.z + 0.2).project(camera);
  plate.hidden = feet.z > 1;
  plate.style.left = `${((feet.x + 1) / 2) * width}px`;
  plate.style.top = `${((1 - feet.y) / 2) * height}px`;
};
const timer = new THREE.Timer();
renderer.setAnimationLoop(() => {
  timer.update();
  time += Math.min(timer.getDelta(), 0.1);
  if (animate) {
    const swing = (1 - Math.cos(time * 1.6)) / 2;
    for (const slot of slots) {
      for (const name of Object.keys(slot.channels)) {
        const [low, high] = channelRange(name);
        if (low === 0 && high === 1) slot.object.set(name, swing);
        else if (name === 'travel') slot.object.set(name, time * 1.5);
      }
    }
  }
  person.tick?.(time);
  orbit.update();
  renderer.render(scene, camera);
  for (const slot of slots) {
    place(slot.nameplate, slot.object.object.position);
    slot.nameplate.classList.toggle('selected', slot === selected);
  }
  place(personPlate, person.object.position);
});

// Handle for automated checks and debugging from the console.
Object.assign(window, {
  __assets: {
    camera, orbit, frame,
    group: group.id,
    ids: () => slots.map((s) => s.id),
    select: (id: string | null) => pick(id === null ? undefined : slots.find((s) => s.id === id)),
    channels: (id: string) => Object.keys(slots.find((s) => s.id === id)?.channels ?? {}),
    set: (id: string, channel: string, value: number) => {
      animate = false;
      const slot = slots.find((s) => s.id === id);
      if (slot) move(slot, channel, value);
      renderPanel();
    },
    setStyle: (look: 'soft' | 'cel') => {
      style.look = look;
      applyStyle(scene, style);
      renderPanel();
    },
    animate: (on: boolean) => {
      animate = on;
      renderPanel();
    },
    /** Ids of the catalog actions that fit an asset. */
    actions: (id: string) => actionsFor(slots.find((s) => s.id === id)?.kind ?? 'prop').map((a) => a.id),
  },
});
