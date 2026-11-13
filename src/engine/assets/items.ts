import * as THREE from 'three';
import { channelAt, type CompiledActions } from '../actions/catalog';
import { createPhoneApp, type PhoneApp, type PhoneEvent, type PhoneSetup } from '../ui/phone';
import { mat, rbox, registerAsset, setChannels } from './registry';

const SCREEN_W = 720;
const SCREEN_H = 1480;

/**
 * Smartphone, upright, screen toward +z (toward whoever holds it). What the screen shows comes from the
 * phone's events in the action track (see engine/ui/phone.ts). Channel `network`: -1 follows the world's
 * signal, 0 forces it off, 1 forces it on.
 */
registerAsset('item.phone', 'Celular com tela que mostra um app (mensageiro); pegável; a tela vem dos eventos do episódio (params: color)', (p) => {
  const body = rbox(0.074, 0.154, 0.009, String(p.color ?? '#1c1f26'), [0, 0.077, 0], 0.004);
  const phone = new THREE.Group();
  phone.add(body);
  // Where the palm of a hand holds it: low, against its back. Tilted back a little, like something being read.
  phone.userData.grip = [0, 0, -0.012];
  phone.userData.tilt = -0.3;

  // Without a browser (tests) there is no picture, only the state.
  const canvas = typeof document === 'undefined' ? undefined : document.createElement('canvas');
  let texture: THREE.CanvasTexture | undefined;
  if (canvas) {
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.068 * (SCREEN_H / SCREEN_W)), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    screen.position.set(0, 0.077, 0.0052);
    screen.userData.noShadow = true;
    phone.add(screen);
  } else {
    phone.add(new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.14), mat('#05070a')).translateY(0.077).translateZ(0.0052));
  }

  let app: PhoneApp | undefined;
  let appId = '';
  let drawn = '';
  phone.userData.present = (compiled: CompiledActions, t: number, id: string) => {
    const events = eventsOf(compiled, id);
    const setup = events.find((e) => e.type === 'setup')?.data as PhoneSetup | undefined;
    if ((setup?.app ?? 'messenger') !== appId || !app) {
      appId = setup?.app ?? 'messenger';
      app = createPhoneApp(appId);
    }
    const network = (time: number): boolean => {
      const own = channelAt(compiled, id, 'network', time);
      return (own < 0 ? channelAt(compiled, 'world', 'network', time) : own) >= 0.5;
    };
    const state = app.state(events, t, network);
    phone.userData.state = state;
    if (!canvas || !texture) return;
    // Drawn again only when what it shows has changed.
    const key = app.animating(state) ? `t${t}` : JSON.stringify([state.messages.length, state.typing >= 0, state.network, state.on, state.chat?.id, events.length]);
    if (key === drawn) return;
    drawn = key;
    app.draw(canvas.getContext('2d')!, SCREEN_W, SCREEN_H, state);
    texture.needsUpdate = true;
  };
  return setChannels(phone, { network: { value: -1, apply: () => {} } });
}, 'phone');

const cache = new WeakMap<CompiledActions, Map<string, PhoneEvent[]>>();
function eventsOf(compiled: CompiledActions, id: string): PhoneEvent[] {
  let byId = cache.get(compiled);
  if (!byId) cache.set(compiled, (byId = new Map()));
  let events = byId.get(id);
  if (!events) byId.set(id, (events = compiled.events.filter((e) => e.target === id)));
  return events;
}

/**
 * Hand-held two-way radio, upright, front toward +z (toward whoever holds it). Held low in the palm like the
 * phone, so it can be raised to the mouth with `raise('chest')`.
 */
registerAsset('item.radio', 'Rádio comunicador de mão (PX): corpo, antena, visor e botão de falar; pegável (params: color)', (p) => {
  const color = String(p.color ?? '#22262e');
  const radio = new THREE.Group();
  radio.add(
    rbox(0.062, 0.125, 0.034, color, [0, 0.0625, 0], 0.01),
    // Antenna and the two knobs on top.
    rbox(0.014, 0.11, 0.014, '#111318', [-0.018, 0.18, 0], 0.005),
    rbox(0.016, 0.018, 0.016, '#3d424c', [0.006, 0.134, 0], 0.005),
    rbox(0.016, 0.014, 0.016, '#3d424c', [0.024, 0.132, 0], 0.005),
    // Speaker grille, a small lit display, and the push-to-talk key on the side.
    rbox(0.046, 0.05, 0.004, '#15171b', [0, 0.04, 0.018], 0.002),
    rbox(0.01, 0.045, 0.02, '#d95b2b', [-0.034, 0.08, 0], 0.004),
  );
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.022), new THREE.MeshBasicMaterial({ color: '#9be36b', toneMapped: false }));
  display.position.set(0, 0.092, 0.0175);
  display.userData.noShadow = true;
  radio.add(display);
  radio.userData.grip = [0, 0, -0.014];
  radio.userData.tilt = -0.2;
  return radio;
});
