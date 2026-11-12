import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import '../engine/actions/character';
import '../engine/assets';
import { BEHAVIOURS } from '../engine/actions/ambient';
import { compileActions, headAngles, type CompiledActions } from '../engine/actions/catalog';
import { mat, rbox } from '../engine/assets/registry';
import { resolveEnvironment, resolveStyle, type Bible } from '../engine/bible';
import { buildCharacter } from '../engine/character/cast';
import { extraLook } from '../engine/character/extras';
import { loadGlbCharacter } from '../engine/character/glb';
import { EXPRESSIONS, HAND_POSE_NAMES, VISEME_NAMES } from '../engine/character/motion';
import { SHOWCASE_BEHAVIOURS, SHOWCASE_POSES, SHOWCASE_YAW, STOOL, phoneOf, poseChannels, showcaseLayout, stageTrack } from '../engine/character/showcase';
import type { CharacterDef } from '../engine/character/types';
import { EnvironmentRig } from '../engine/environment';
import { applyStyle } from '../engine/style';
import { applyStage } from '../engine/timeline/stage';
import { buildProp, type InteractiveObject } from '../engine/world/build';
import { button, checkbox, color, el, select, slider } from './ui';

// The showcase of characters: everyone of a series side by side on an empty stage, to look at and adjust
// outside an episode. Address: ?vitrine=personagens&series=<id> (or series=* for every series).

const bibles = Object.values(import.meta.glob<Bible>('/series/*/bible.json', { eager: true, import: 'default' }));
const characterFiles = import.meta.glob<CharacterDef>('/series/*/characters/*.json', { eager: true, import: 'default' });
const models = import.meta.glob<string>('/series/*/characters/*.glb', { eager: true, import: 'default', query: '?url' });

const query = new URLSearchParams(window.location.search);
const everySeries = query.get('series') === '*';
const bible = bibles.find((b) => b.series === query.get('series')) ?? bibles[0];

const stage = document.getElementById('stage')!;
const hint = document.getElementById('hint')!;
const panel = document.getElementById('panel')!;
document.title = 'Vitrine de personagens';
hint.textContent = 'Clique num personagem para selecionar · arraste para girar · roda do mouse aproxima · botão direito desloca';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 1000);
const environment = new EnvironmentRig(scene);
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), mat('#9aa0a8'));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(environment.group, floor);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;

// ---- The stage ----

type Look = 'free' | 'camera' | 'selected' | 'ahead';
const LOOKS: [Look, string][] = [['free', 'Livre'], ['camera', 'Para a câmera'], ['selected', 'Para o selecionado'], ['ahead', 'Para um ponto à frente']];

/** One character on the stage and what it is set to do. */
interface Slot {
  id: string;
  /** The character as its file has it, and as the menu changed it. */
  file: CharacterDef;
  def: CharacterDef;
  /** URL of the model, for characters that are a GLB. */
  model?: string;
  object: InteractiveObject;
  at: [number, number];
  pose: string;
  behaviour: string;
  look: Look;
  expression: string;
  intensity: number;
  /** A mouth shape of speech held still, or '' to leave the mouth to the pose. */
  mouth: string;
  /** A hand pose held by both hands, or '' to leave them to what the body is doing. */
  hand: string;
  stool: THREE.Mesh;
  phone?: InteractiveObject;
  nameplate: HTMLDivElement;
  /** Number of the variation, for extras made from another character. */
  extra?: number;
}

const slots: Slot[] = [];
/** null means everybody: the menu then applies to all. */
let selected: Slot | null = null;
let compiled: CompiledActions = compileActions([], []);
let objects = new Map<string, InteractiveObject>();
let time = 0;
let paused = false;
let error = '';
const rulesOn = new Set<string>();
/** The look of the series; the menu can change it to compare, without saving. */
const style = resolveStyle(everySeries ? {} : bible);

const seedOf = (id: string): number => [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
const targets = (): Slot[] => (selected ? [selected] : slots);

async function build(slot: Pick<Slot, 'id' | 'def' | 'model' | 'at'>): Promise<InteractiveObject> {
  const member = { id: slot.id, character: slot.def.id, at: slot.at, yaw: SHOWCASE_YAW };
  return buildCharacter(member, slot.def, slot.model ? await loadGlbCharacter(slot.def, slot.model) : undefined);
}

function dispose(object: THREE.Object3D): void {
  object.removeFromParent();
  // Materials are shared by color; geometries belong to each body.
  object.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}

async function addSlot(id: string, file: CharacterDef, def: CharacterDef, model?: string, extra?: number): Promise<Slot> {
  const stool = rbox(0.42, STOOL, 0.42, '#6b5a4c', [0, STOOL / 2, 0], 0.03);
  stool.castShadow = stool.receiveShadow = true;
  const nameplate = el('div', def.name, 'nameplate');
  const slot: Slot = {
    id, file, def, model, extra, stool, nameplate, at: [0, 0], pose: 'idle', behaviour: 'none', look: 'free', expression: '', intensity: 1, mouth: '', hand: '',
    object: await build({ id, def, model, at: [0, 0] }),
  };
  nameplate.onclick = () => select_(slot);
  stage.append(nameplate);
  scene.add(slot.object.object, stool);
  slots.push(slot);
  return slot;
}

function removeSlot(slot: Slot): void {
  dispose(slot.object.object);
  dispose(slot.stool);
  if (slot.phone) dispose(slot.phone.object);
  slot.nameplate.remove();
  slots.splice(slots.indexOf(slot), 1);
  if (selected === slot) selected = null;
}

/** Build the body again after a change of look, keeping everything else. */
async function rebuild(slot: Slot): Promise<void> {
  const next = await build(slot);
  dispose(slot.object.object);
  slot.object = next;
  scene.add(next.object);
  restage();
}

/** Put everyone in place and compile what they do by themselves. Called whenever the stage changes. */
function restage(): void {
  const places = showcaseLayout(slots.length);
  slots.forEach((slot, i) => {
    slot.at = places[i];
    slot.stool.position.set(slot.at[0], STOOL / 2, slot.at[1] - 0.04);
    slot.stool.visible = slot.pose === 'sit';
    const holds = Boolean(SHOWCASE_POSES[slot.pose]?.phone);
    if (holds && !slot.phone) {
      slot.phone = buildProp({ id: phoneOf(slot.id), asset: 'item.phone', pickable: true, pos: slot.at });
      scene.add(slot.phone.object);
    } else if (!holds && slot.phone) {
      dispose(slot.phone.object);
      slot.phone = undefined;
    }
  });
  const track = stageTrack(slots, selected?.id);
  const all = [...slots.map((s) => s.object), ...slots.flatMap((s) => (s.phone ? [s.phone] : []))];
  objects = new Map(all.map((o) => [o.id, o]));
  try {
    // The compiler reads where each one starts from the channels.
    for (const slot of slots) Object.assign(slot.object.channels, { x: slot.at[0], z: slot.at[1], y: 0, yaw: SHOWCASE_YAW });
    compiled = compileActions(track.clips, all, {}, { links: track.links });
    error = '';
  } catch (e) {
    compiled = compileActions([], all);
    error = e instanceof Error ? e.message : String(e);
  }
  // Whoever just came in gets the look of the rest.
  applyStyle(scene, style);
}

const eye = new THREE.Vector3();
/** Where the eyes of a character are right now. */
function eyesOf(slot: Slot): [number, number, number] {
  const head = slot.object.socket?.('head');
  if (head) return head.getWorldPosition(eye).toArray();
  const [x, y, z] = slot.object.position();
  return [x, y + (slot.object.traits.eyeHeight ?? 1.6), z];
}

/** The point a character is set to look at, if any. */
function lookPoint(slot: Slot): [number, number, number] | undefined {
  if (slot.look === 'camera') return camera.position.toArray();
  if (slot.look === 'ahead') return [slot.at[0], 1.5, slot.at[1] + 8];
  if (slot.look === 'selected' && selected && selected !== slot) return eyesOf(selected);
  return undefined;
}

/** Show the stage at time t. */
function apply(t: number): void {
  for (const slot of slots) {
    const { object } = slot;
    object.set('x', slot.at[0]);
    object.set('z', slot.at[1]);
    object.set('yaw', SHOWCASE_YAW);
    const pose = SHOWCASE_POSES[slot.pose];
    for (const [channel, value] of Object.entries(poseChannels(slot.pose, t, object.traits, seedOf(slot.id)))) object.set(channel, value);
    for (const name of Object.keys(EXPRESSIONS)) object.set(`expr.${name}`, name === slot.expression ? slot.intensity : 0);
    if (slot.hand) for (const side of ['L', 'R']) for (const name of HAND_POSE_NAMES) object.set(`hand${side}.${name}`, name === slot.hand ? 1 : 0);
    if (slot.mouth) for (const name of VISEME_NAMES) object.set(`vis.${name}`, name === slot.mouth ? 1 : 0);
    object.set('look.yaw', 0);
    object.set('look.pitch', 0);
    // A behaviour, when there is one, takes the free hands; applyStage sets it.
    object.ambient?.(pose?.ambient?.(t, seedOf(slot.id)));
  }
  applyStage(compiled, objects, t);
  // The head is turned last, from where the pose left the eyes.
  for (const slot of slots) {
    const point = lookPoint(slot);
    if (!point) continue;
    const { yaw, pitch } = headAngles(eyesOf(slot), SHOWCASE_YAW, point);
    slot.object.set('look.yaw', yaw);
    slot.object.set('look.pitch', pitch);
    slot.object.tick?.(t);
  }
}

// ---- Camera ----

type Framing = 'all' | 'body' | 'face';

function frame(framing: Framing): void {
  const slot = selected;
  if (!slot || framing === 'all') {
    const xs = slots.map((s) => s.at[0]);
    const width = Math.max(4, Math.max(...xs, 0) - Math.min(...xs, 0) + 2);
    // Far enough for the whole row to fit, whatever the shape of the window.
    const distance = Math.max(4, (width / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Math.min(1.6, camera.aspect));
    // With rows behind, from higher up, to see over the heads in front.
    const rows = new Set(slots.map((s) => s.at[1])).size;
    orbit.target.set(0, 0.95, 0);
    camera.position.set(0, 1.5 + (rows - 1) * 1.1, distance);
  } else if (framing === 'body') {
    const height = slot.def.height ?? 1.7;
    orbit.target.set(slot.at[0], height * 0.55, slot.at[1]);
    camera.position.set(slot.at[0] + 0.5, height * 0.7, slot.at[1] + height * 2.3);
  } else {
    // The head joint is at its base; the face is a little above.
    const [x, base, z] = eyesOf(slot);
    const y = slot.object.socket?.('head') ? base + 0.11 : base;
    orbit.target.set(x, y, z);
    camera.position.set(x + 0.1, y + 0.02, z + 0.85);
  }
  orbit.update();
}

function select_(slot: Slot | null, framing: Framing = 'body'): void {
  selected = slot;
  restage();
  frame(slot ? framing : 'all');
  renderPanel();
}

// A click picks a character; a drag is the camera's.
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
  if (slot) select_(slot);
});

// ---- Look ----

/** Change the look of the selected character and build it again. */
async function restyle(slot: Slot, change: Partial<CharacterDef>): Promise<void> {
  slot.def = { ...slot.def, ...change, id: slot.def.id };
  await rebuild(slot);
}

/** Extras made from a character: the same file, each with a look of its own. */
async function addExtras(from: Slot, count: number): Promise<void> {
  const first = Math.max(0, ...slots.map((s) => s.extra ?? 0)) + 1;
  for (let n = first; n < first + count; n++) {
    await addSlot(`${from.id}#${n}`, from.file, { ...from.file, ...extraLook(n * 7 + seedOf(from.id)), id: from.file.id, name: `${from.file.name} ${n}` }, undefined, n);
  }
  restage();
  select_(null);
}

function applyEnvironment(): void {
  environment.apply(resolveEnvironment(everySeries ? [] : bible.rules.filter((r) => rulesOn.has(r.id))));
}

// ---- Panel ----

function renderPanel(): void {
  panel.replaceChildren();
  panel.append(el('h1', 'Vitrine de personagens'), el('p', everySeries ? 'Todas as séries' : bible.title));
  if (error) panel.append(el('div', error, 'error'));

  panel.append(el('h2', 'Série'));
  const open = (series: string) => {
    window.location.search = `?vitrine=personagens&series=${series}`;
  };
  for (const b of bibles) panel.append(button(b.title, !everySeries && b === bible, () => open(b.series)));
  if (bibles.length > 1) panel.append(button('Todas as séries', everySeries, () => open('*')));
  panel.append(button('Voltar ao estúdio', false, () => {
    window.location.search = `?series=${bible.series}`;
  }));

  panel.append(el('h2', 'Tempo'));
  const clock = el('div', '', 'row');
  clock.append(
    button(paused ? 'Continuar' : 'Pausar', paused, () => {
      paused = !paused;
      renderPanel();
    }),
    button('Voltar ao início', false, () => {
      time = 0;
    }),
  );
  panel.append(clock);

  panel.append(el('h2', 'Personagem'));
  panel.append(button('Todos', !selected, () => select_(null)));
  for (const slot of slots) panel.append(button(slot.def.name, slot === selected, () => select_(slot)));
  if (selected) {
    const views = el('div', '', 'row');
    views.append(button('Corpo', false, () => frame('body')), button('Rosto', false, () => frame('face')), button('Palco', false, () => frame('all')));
    panel.append(views);
  }

  const who = targets();
  const shared = <K extends 'pose' | 'behaviour' | 'look' | 'expression' | 'mouth' | 'hand'>(key: K): string => (who.every((s) => s[key] === who[0]?.[key]) ? (who[0]?.[key] ?? '') : '');
  const mixed: [string, string][] = selected ? [] : [['', '(vários)']];
  const set = <K extends 'pose' | 'behaviour' | 'look' | 'expression' | 'mouth' | 'hand'>(key: K, value: Slot[K]): void => {
    for (const slot of who) slot[key] = value;
    restage();
    renderPanel();
  };

  panel.append(el('h2', selected ? `O que ${selected.def.name} faz` : 'O que todos fazem'));
  const expression = shared('expression');
  panel.append(
    select('Expressão', [['', 'Neutra'], ...Object.keys(EXPRESSIONS).map((name): [string, string] => [name, name])], expression, (v) => set('expression', v)),
    slider('Intensidade', [0, 1.5, 0.05], who[0]?.intensity ?? 1, (v) => {
      for (const slot of who) slot.intensity = v;
    }),
    select('Boca', [['', 'Da pose'], ...VISEME_NAMES.map((name): [string, string] => [name, name === 'F' ? 'F / V' : name])], shared('mouth'), (v) => set('mouth', v)),
    select('Mãos', [['', 'Da pose'], ...HAND_POSE_NAMES.map((name): [string, string] => [name, name])], shared('hand'), (v) => set('hand', v)),
    select('Pose', [...(shared('pose') ? [] : mixed), ...Object.entries(SHOWCASE_POSES).map(([id, p]): [string, string] => [id, p.label])], shared('pose'), (v) => v && set('pose', v)),
    select('Figurante', [...(shared('behaviour') ? [] : mixed), ['none', 'Sem comportamento'], ...SHOWCASE_BEHAVIOURS.map((mode): [string, string] => [mode, mode])], shared('behaviour'), (v) => v && set('behaviour', v)),
  );
  const behaviour = shared('behaviour');
  if (behaviour && behaviour !== 'none') panel.append(el('p', `${BEHAVIOURS[behaviour]}. Com um comportamento, a cabeça e as mãos livres são dele.`, 'note'));
  panel.append(select('Olhar', [...(shared('look') ? [] : mixed), ...LOOKS], shared('look'), (v) => v && set('look', v as Look)));

  if (selected) {
    const slot = selected;
    panel.append(el('h2', 'Aparência'));
    if (slot.model) {
      panel.append(el('p', 'Este personagem é um modelo GLB: a aparência vem do arquivo.', 'note'));
    } else {
      const def = slot.def;
      const live = (change: Partial<CharacterDef>) => void restyle(slot, change);
      panel.append(
        color('Pele', def.skin ?? '#e8b88f', (v) => live({ skin: v }), renderPanel),
        color('Olhos', def.eyes ?? '#4a2f1d', (v) => live({ eyes: v }), renderPanel),
        color('Cabelo', def.hair ?? '#3b2a20', (v) => live({ hair: v }), renderPanel),
        select('Corte', [['short', 'curto'], ['long', 'comprido'], ['bun', 'coque'], ['none', 'sem cabelo']], def.hairStyle ?? 'short', (v) => {
          void restyle(slot, { hairStyle: v as CharacterDef['hairStyle'] }).then(renderPanel);
        }),
        select('Mãos', [['mitten', 'luva'], ['fingers', 'dedos']], def.hands ?? 'mitten', (v) => {
          void restyle(slot, { hands: v as CharacterDef['hands'] }).then(renderPanel);
        }),
        color('Camisa', def.shirt ?? '#3d7dd9', (v) => live({ shirt: v }), renderPanel),
        color('Calça', def.pants ?? '#34405a', (v) => live({ pants: v }), renderPanel),
        slider('Altura', [1.1, 2, 0.01], def.height ?? 1.7, (v) => live({ height: v }), renderPanel),
        slider('Corpo', [0.8, 1.3, 0.01], def.build ?? 1, (v) => live({ build: v }), renderPanel),
        slider('Cabeça', [1, 1.6, 0.01], def.headScale ?? 1.3, (v) => live({ headScale: v }), renderPanel),
      );
      const looks = el('div', '', 'row');
      looks.append(
        button('Variar', false, () => {
          slot.extra = (slot.extra ?? 0) + 1;
          void restyle(slot, extraLook(slot.extra * 7 + seedOf(slot.id))).then(renderPanel);
        }),
        button('Restaurar', false, () => {
          slot.def = { ...slot.file };
          void rebuild(slot).then(renderPanel);
        }),
      );
      panel.append(looks, button('Adicionar 6 figurantes a partir dele', false, () => void addExtras(slot, 6)));
      panel.append(el('p', 'Para guardar, copie para o arquivo do personagem:', 'note'), el('div', JSON.stringify(def), 'snippet'));
    }
  }
  if (slots.some((s) => s.id.includes('#'))) {
    panel.append(button('Remover os figurantes', false, () => {
      for (const slot of slots.filter((s) => s.id.includes('#'))) removeSlot(slot);
      restage();
      select_(null);
    }));
  }

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
  if (style.look === 'cel') {
    panel.append(
      slider('Contorno', [0, 0.03, 0.001], style.outline, (v) => {
        style.outline = v;
        applyStyle(scene, style);
      }, renderPanel),
      slider('Faixas', [1, 6, 1], style.bands, (v) => {
        style.bands = v;
        applyStyle(scene, style);
      }, renderPanel),
      el('p', `Para a série: "style": ${JSON.stringify({ look: 'cel', outline: style.outline, bands: style.bands })} na bíblia.`, 'note'),
    );
  }

  if (!everySeries && bible.rules.length) {
    panel.append(el('h2', 'Bíblia — ver sob as regras'));
    for (const rule of bible.rules) {
      panel.append(checkbox(rule.id, rule.description, rulesOn.has(rule.id), (on) => {
        if (on) rulesOn.add(rule.id);
        else rulesOn.delete(rule.id);
        applyEnvironment();
      }));
    }
  }
}

// ---- Start ----

for (const [path, def] of Object.entries(characterFiles).sort(([a], [b]) => a.localeCompare(b))) {
  const series = path.split('/')[2];
  if (!everySeries && series !== bible.series) continue;
  try {
    if (def.glb && !models[`/series/${series}/characters/${def.glb}`]) throw new Error(`arquivo "${def.glb}" não encontrado em series/${series}/characters.`);
    await addSlot(everySeries ? `${series}/${def.id}` : def.id, def, { ...def }, def.glb ? models[`/series/${series}/characters/${def.glb}`] : undefined);
  } catch (e) {
    error = [error, `Personagem "${def.id}": ${e instanceof Error ? e.message : String(e)}`].filter(Boolean).join('\n');
  }
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
const loadError = error;
restage();
error = [loadError, error].filter(Boolean).join('\n');
applyEnvironment();
frame('all');
renderPanel();

const feet = new THREE.Vector3();
const timer = new THREE.Timer();
renderer.setAnimationLoop(() => {
  timer.update();
  if (!paused) time += Math.min(timer.getDelta(), 0.1);
  apply(time);
  orbit.update();
  renderer.render(scene, camera);
  for (const slot of slots) {
    feet.set(slot.at[0], 0, slot.at[1]).project(camera);
    slot.nameplate.hidden = feet.z > 1;
    slot.nameplate.textContent = slot.def.name;
    slot.nameplate.classList.toggle('selected', slot === selected);
    slot.nameplate.style.left = `${((feet.x + 1) / 2) * width}px`;
    slot.nameplate.style.top = `${((1 - feet.y) / 2) * height}px`;
  }
});

// Handle for automated checks and debugging from the console.
const bySlot = (id: string): Slot => {
  const slot = slots.find((s) => s.id === id);
  if (!slot) throw new Error(`Não há "${id}" na vitrine. Existem: ${slots.map((s) => s.id).join(', ')}.`);
  return slot;
};
const setAll = <K extends 'pose' | 'behaviour' | 'look' | 'expression' | 'intensity' | 'mouth' | 'hand'>(key: K, value: Slot[K]): void => {
  for (const slot of targets()) slot[key] = value;
  restage();
  renderPanel();
};
Object.assign(window, {
  __vitrine: {
    camera, orbit, frame,
    cast: () => slots.map((s) => s.object),
    ids: () => slots.map((s) => s.id),
    /** A character id, or null for everybody. */
    select: (id: string | null, framing?: Framing) => select_(id === null ? null : bySlot(id), framing),
    setPose: (pose: string) => setAll('pose', pose),
    setBehaviour: (mode: string) => setAll('behaviour', mode),
    setLook: (look: Look) => setAll('look', look),
    setExpression: (name: string, intensity = 1) => {
      setAll('intensity', intensity);
      setAll('expression', name);
    },
    /** Hold a mouth shape of speech ("A", "E", "O", "U", "F"), or '' to let the pose move the mouth. */
    setMouth: (shape: string) => setAll('mouth', shape),
    /** Hold a hand pose in both hands ("grip", "point", "fist", "open", "type"), or '' to let the body decide. */
    setHand: (pose: string) => setAll('hand', pose),
    restyle: (id: string, change: Partial<CharacterDef>) => restyle(bySlot(id), change).then(renderPanel),
    addExtras: (id: string, count = 6) => addExtras(bySlot(id), count),
    /** "soft" or "cel", and for cel the outline in meters and the number of bands of light. */
    setStyle: (look: 'soft' | 'cel', outline = style.outline, bands = style.bands) => {
      Object.assign(style, { look, outline, bands });
      applyStyle(scene, style);
      renderPanel();
    },
    setRule: (id: string, on: boolean) => {
      if (on) rulesOn.add(id);
      else rulesOn.delete(id);
      applyEnvironment();
      renderPanel();
    },
    /** Stop the clock, optionally at a given time in seconds. */
    pause: (at?: number) => {
      paused = true;
      if (at !== undefined) time = at;
      renderPanel();
    },
    play: () => {
      paused = false;
      renderPanel();
    },
    get time() {
      return time;
    },
    get error() {
      return error;
    },
  },
});
