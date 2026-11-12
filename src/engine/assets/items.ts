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
  // Where a hand holds it: low, behind the screen. Tilted back a little, like something being read.
  phone.userData.grip = [0.012, 0.02, -0.065];
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
