import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../../core/rng';
import { group, rbox, registerAsset } from '../registry';
import { lathe, merged, mesh, rod, rodGeo, shade, STONE, v3, WOOD, WOOD_DARK } from './kit';
import { flameMaterial, tongue } from './palace';

// Lamps

/** A clay oil lamp with its flame, the spout toward -z; with intensity > 0, a warm light that flickers with it. */
export function oilLamp(p: Record<string, number | string>): THREE.Group {
  const color = String(p.color ?? '#b5704a');
  const intensity = Number(p.intensity ?? 0);
  const phase = rng(Number(p.seed ?? 1))() * 10;
  // A round saucer, pinched at the front into a spout and with its rim folded up there.
  const body = lathe([[0.001, 0], [0.03, 0], [0.048, 0.012], [0.052, 0.026], [0.046, 0.033], [0.038, 0.026], [0.03, 0.02], [0.001, 0.019]], 32);
  body.deleteAttribute('normal');
  body.deleteAttribute('uv');
  const clay = mergeVertices(body);
  const pos = clay.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const r = Math.hypot(x, z);
    const f = r > 1e-4 ? Math.max(0, -z / r) ** 5 : 0;
    pos.setXYZ(i, x * (1 - 0.55 * f), y + f * (y / 0.033) * 0.006, z - f * (r / 0.05) * 0.045);
  }
  clay.computeVertexNormals();
  const tip = v3(0, 0.032, -0.088);
  // The oil, the handle at the back and the wick lying in the spout: too small for an outline.
  const small = [
    mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.002, 18), '#3a2a1a', [0, 0.024, 0]),
    mesh(new THREE.TorusGeometry(0.014, 0.005, 6, 12, Math.PI * 1.3).rotateY(Math.PI / 2).rotateX(-0.6), color, [0, 0.028, 0.05]),
    rod(v3(0, 0.026, -0.05), tip, 0.0035, '#2a211c'),
  ];
  for (const m of small) m.userData.noOutline = true;
  const lamp = group(mesh(clay, color), ...small);
  // The flame: an orange drop round a pale core, both their own light.
  const drop = (r: number, h: number) => lathe([[0, 0], [r * 0.7, h * 0.12], [r, h * 0.33], [r * 0.6, h * 0.66], [0.0005, h]], 10);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), flameMaterial('#ffa040', 0.07));
  glow.position.y = 0.03;
  const flame = group(new THREE.Mesh(tongue(0.014, 0.07), flameMaterial('#ff8a2a', 0.8)), new THREE.Mesh(tongue(0.009, 0.045), flameMaterial('#ffd36b', 0.9)), new THREE.Mesh(drop(0.0055, 0.024), new THREE.MeshBasicMaterial({ color: '#fff6d0' })), glow);
  flame.traverse((o) => void (o.userData.noOutline = true));
  flame.position.copy(tip).add(v3(0, 0.002, 0));
  flame.traverse((o) => void (o.userData.noShadow = true));
  lamp.add(flame);
  const light = intensity > 0 ? new THREE.PointLight('#ffb062', intensity, Number(p.range ?? 6), 2) : undefined;
  if (light) {
    light.position.copy(tip).add(v3(0, 0.07, 0));
    if (Number(p.shadow ?? 0) > 0) {
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
      light.shadow.camera.near = 0.03;
      light.shadow.bias = -0.002;
    }
    lamp.add(light);
  }
  lamp.scale.setScalar(Number(p.size ?? 1));
  const g = group(lamp);
  g.userData.animate = (t: number) => {
    const k = 1 + 0.16 * Math.sin(t * 13 + phase) + 0.08 * Math.sin(t * 29.7 + phase * 2);
    flame.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
    flame.rotation.set(0.1 * Math.sin(t * 3.1 + phase), 0, 0.12 * Math.sin(t * 4.3 + phase));
    if (light) light.intensity = intensity * (0.88 + 0.08 * Math.sin(t * 13 + phase) + 0.04 * Math.sin(t * 29.7 + phase * 2));
  };
  g.userData.animate(0);
  return g;
}

registerAsset(
  'ancient.oilLamp',
  'Candeia de barro: pires com o bico beliscado para a frente (-z), pavio e chama que tremula sozinha (13 cm). Com `intensity` maior que 0 acende uma luz quente de verdade, de alcance curto (6 m), para interior à noite; `shadow: 1` faz essa luz projetar sombra (mais caro) (params: intensity, shadow, range, size — escala —, color — do barro —, seed)',
  (p) => oilLamp(p),
);

registerAsset(
  'ancient.lampStand',
  'Candeia acesa num suporte. `kind`: "wood" (pé de madeira de três pernas, 1,1 m), "stone" (coluna baixa de pedra, 90 cm) ou "shelf" (prateleira de parede com mão-francesa: costas em z = 0, olha para +z; a origem é o tampo, ponha na altura com `y`). Mesma luz da `ancient.oilLamp` (params: kind, intensity, shadow, range, color — da madeira ou da pedra —, seed)',
  (p) => {
    const kind = String(p.kind ?? 'wood');
    const g = group();
    let top = 0;
    let turn = 0;
    if (kind === 'stone') {
      const color = String(p.color ?? STONE);
      top = 0.9;
      g.add(mesh(lathe([[0.001, 0], [0.2, 0], [0.2, 0.08], [0.15, 0.12], [0.11, 0.16], [0.1, 0.78], [0.13, 0.82], [0.16, 0.86], [0.16, top], [0.001, top]], 18), color));
    } else if (kind === 'shelf') {
      const color = String(p.color ?? WOOD);
      g.add(rbox(0.4, 0.035, 0.22, color, [0, -0.0175, 0.11], 0.008));
      for (const x of [-0.14, 0.14]) {
        g.add(rbox(0.03, 0.2, 0.03, shade(color, 0.8), [x, -0.135, 0.015], 0.006), rod(v3(x, -0.21, 0.025), v3(x, -0.03, 0.18), 0.012, shade(color, 0.8)));
      }
      turn = Math.PI;
    } else {
      const color = String(p.color ?? WOOD_DARK);
      top = 1.1;
      const legs = [0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.3;
        return rodGeo(v3(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24), v3(Math.cos(a) * 0.03, 0.3, Math.sin(a) * 0.03), 0.018, 0.022, 7);
      });
      g.add(merged(legs, color, true), mesh(new THREE.CylinderGeometry(0.025, 0.03, top - 0.25, 10), color, [0, 0.25 + (top - 0.25) / 2, 0]));
      g.add(mesh(lathe([[0.001, 0], [0.04, 0], [0.11, 0.025], [0.12, 0.035], [0.001, 0.03]], 18), color, [0, top - 0.035, 0]));
    }
    const lamp = oilLamp(p);
    lamp.position.set(0, top, kind === 'shelf' ? 0.12 : 0);
    lamp.rotation.y = turn;
    g.add(lamp);
    g.userData.animate = lamp.userData.animate;
    return g;
  },
);
