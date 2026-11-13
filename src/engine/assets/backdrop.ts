import * as THREE from 'three';
import { rng } from '../core/rng';
import { group, mat, post, rbox, registerAsset } from './registry';

/*
 * What fills the world beyond where anyone goes, the way games and films do it, in rings:
 *
 * - near (just past the fence, where things slide against each other as the camera moves): real, simple
 *   houses in 3D, `backdrop.house`;
 * - far: flat pictures of buildings standing in an arc around the place, `backdrop.skyline`. They are painted
 *   here, on a canvas, so no image files are needed and a seed always gives the same street. Two rings at
 *   different distances, the far one hazier, slide a little against each other and read as depth.
 *
 * The pictures are not lit: they are tinted by the fog, which has the color of the horizon, so when the sky
 * changes (a red sky) the city changes with it.
 */

const WALLS = ['#e8d9b8', '#d9a48a', '#c9d6dd', '#e6e2d6', '#c98f6a', '#d8c58f', '#b9c7a8', '#d6b7b0'];
const ROOFS = ['#a4553c', '#8c4a36', '#7d7f86'];

registerAsset(
  'backdrop.house',
  'Casa simples de bairro, para preencher o outro lado da rua: sobrado ou térrea, telhado, porta, janelas, às vezes caixa d\'água; a frente olha para +z (params: seed, floors, width, depth)',
  (p) => {
    const rand = rng(Number(p.seed ?? 1));
    const floors = Number(p.floors ?? (rand() < 0.55 ? 2 : 1));
    const width = Number(p.width ?? 6 + Math.floor(rand() * 3));
    const depth = Number(p.depth ?? 7);
    const height = floors * 2.9;
    const wall = WALLS[Math.floor(rand() * WALLS.length)];
    const g = group(rbox(width, height, depth, wall, [0, height / 2, 0], 0.04));
    // Roof: a slab with eaves, or a low tiled ridge.
    const roof = ROOFS[Math.floor(rand() * ROOFS.length)];
    if (rand() < 0.5) g.add(rbox(width + 0.5, 0.18, depth + 0.5, roof, [0, height + 0.09, 0], 0.03));
    else {
      const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.01, width * 0.62, 1.3, 4, 1).rotateY(Math.PI / 4).scale(1, 1, (depth + 0.5) / (width * 0.88)), mat(roof));
      ridge.position.y = height + 0.65;
      g.add(ridge);
    }
    const front = depth / 2 + 0.02;
    const dark = '#3b4652';
    // Door (or a garage gate) on the ground floor, and windows.
    const door = -width / 2 + 0.9 + rand() * (width - 1.8);
    g.add(rbox(rand() < 0.4 ? 2.4 : 0.9, 2.1, 0.06, rand() < 0.5 ? '#6b4a3a' : '#7c838c', [door, 1.05, front], 0.02));
    for (let f = 0; f < floors; f++) {
      const n = 1 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) {
        const x = -width / 2 + ((i + 0.5) / n) * width + (rand() - 0.5) * 0.4;
        if (f === 0 && Math.abs(x - door) < 1.8) continue;
        g.add(rbox(1.1, 1.0, 0.05, dark, [x, f * 2.9 + 1.6, front], 0.02), rbox(1.25, 0.08, 0.1, '#f0ece2', [x, f * 2.9 + 1.06, front], 0.02));
      }
    }
    // The blue water tank on the roof, as on half the houses in Brazil.
    if (rand() < 0.5) g.add(post(0.45, 0.75, '#3f7fbf', (rand() - 0.5) * (width - 2), height + 0.2, -depth / 4), rbox(1.1, 0.2, 1.1, '#b9b4aa', [0, height + 0.1, -depth / 4], 0.02));
    return g;
  },
);

/** A color pulled toward the haze of the distance: less contrast and less color the further away. */
function hazed(color: string, haze: number): string {
  return `#${new THREE.Color(color).lerp(new THREE.Color('#cfd9e2'), haze).getHexString()}`;
}

/** One picture of a row of buildings, seen from the front, with nothing where the sky is. */
function paintStreet(seed: number, haze: number, tall: boolean): THREE.Texture | undefined {
  // Without a browser (tests) there is nothing to paint on.
  if (typeof document === 'undefined') return undefined;
  const rand = rng(seed);
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [1024, 384];
  const c = canvas.getContext('2d')!;
  const ground = canvas.height;
  let x = -20 - rand() * 40;
  while (x < canvas.width) {
    const blockOfFlats = rand() < (tall ? 0.7 : 0.25);
    const w = blockOfFlats ? 90 + rand() * 90 : 70 + rand() * 60;
    const floors = blockOfFlats ? 4 + Math.floor(rand() * (tall ? 9 : 3)) : 1 + Math.floor(rand() * 2);
    const h = Math.min(ground - 20, floors * 26 + 14);
    const top = ground - h;
    const wall = hazed(WALLS[Math.floor(rand() * WALLS.length)], haze);
    c.fillStyle = wall;
    c.fillRect(x, top, w, h);
    // A darker side band, so each building reads as a volume.
    c.fillStyle = hazed('#000000', 0.82 + haze * 0.15);
    c.globalAlpha = 0.5;
    c.fillRect(x + w - 10, top, 10, h);
    c.globalAlpha = 1;
    // Windows in rows; a few open (darker), a few with a curtain (lighter).
    const columns = Math.max(2, Math.floor(w / 26));
    for (let f = 0; f < floors; f++) {
      for (let k = 0; k < columns; k++) {
        const pick = rand();
        c.fillStyle = hazed(pick < 0.2 ? '#2c3540' : pick < 0.35 ? '#e9e4d2' : '#5f7184', haze);
        c.fillRect(x + 8 + k * ((w - 16) / columns) + 3, top + 12 + f * 26, (w - 16) / columns - 8, 13);
      }
    }
    // Roofline: a tiled roof on houses, a water tank or an antenna on the rest.
    if (!blockOfFlats && rand() < 0.6) {
      c.fillStyle = hazed(ROOFS[Math.floor(rand() * 2)], haze);
      c.beginPath();
      c.moveTo(x - 6, top);
      c.lineTo(x + w / 2, top - 22);
      c.lineTo(x + w + 6, top);
      c.fill();
    } else if (rand() < 0.6) {
      const tx = x + 12 + rand() * (w - 44);
      c.fillStyle = hazed('#8f959c', haze);
      c.fillRect(tx + 3, top - 8, 3, 8);
      c.fillRect(tx + 18, top - 8, 3, 8);
      c.fillStyle = hazed('#3f7fbf', haze);
      c.fillRect(tx, top - 24, 24, 16);
    }
    if (rand() < 0.3) {
      c.fillStyle = hazed('#4a4f57', haze);
      c.fillRect(x + w * rand(), top - 30, 2, 30);
    }
    x += w + (rand() < 0.3 ? 10 + rand() * 30 : -2);
    // A tree in a gap now and then breaks the line of roofs.
    if (rand() < 0.3) {
      c.fillStyle = hazed(rand() < 0.5 ? '#4f8a43' : '#3f7a45', haze);
      const r = 26 + rand() * 22;
      c.beginPath();
      c.arc(x - 6, ground - r * 1.5, r, 0, Math.PI * 2);
      c.arc(x - 6 + r * 0.7, ground - r * 1.1, r * 0.75, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = hazed('#6b4a3a', haze);
      c.fillRect(x - 9, ground - r * 0.8, 6, r * 0.8);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

registerAsset(
  'backdrop.skyline',
  'Fundo de cidade pintado: cartões com fachadas de prédios e casas em arco ao redor da origem, para a distância aonde ninguém vai (params: radius, count, height — do cartão, em metros —, arc e start em graus, haze de 0 a 1 — quanto mais longe, maior —, tall — 1 para prédios altos —, seed)',
  (p) => {
    const radius = Number(p.radius ?? 90);
    const count = Math.max(1, Math.round(Number(p.count ?? 14)));
    const height = Number(p.height ?? 18);
    const arc = THREE.MathUtils.degToRad(Number(p.arc ?? 360));
    const start = THREE.MathUtils.degToRad(Number(p.start ?? 0));
    const haze = Number(p.haze ?? 0.3);
    const seed = Number(p.seed ?? 1);
    const rand = rng(seed + 77);
    // Each card is a little wider than its share of the arc, so neighbours overlap and no gap shows.
    const width = ((radius * arc) / count) * 1.2;
    const g = group();
    for (let i = 0; i < count; i++) {
      const map = paintStreet(seed * 31 + i, haze, Number(p.tall ?? 0) > 0);
      const material = new THREE.MeshBasicMaterial(map ? { map, alphaTest: 0.5, side: THREE.DoubleSide } : { color: hazed('#c9c3b5', haze), side: THREE.DoubleSide });
      const card = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      const a = start + ((i + 0.5) / count) * arc;
      // Staggered a little nearer and further, so they slide against each other as the camera moves.
      const r = radius + (rand() - 0.5) * radius * 0.12;
      card.position.set(Math.sin(a) * r, height / 2 - 0.5, Math.cos(a) * r);
      card.lookAt(0, height / 2 - 0.5, 0);
      card.userData.noShadow = card.userData.noOutline = true;
      g.add(card);
    }
    g.userData.passable = true;
    return g;
  },
);
