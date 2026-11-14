import * as THREE from 'three';
import { rng } from '../core/rng';
import { group, mat, registerAsset, setChannels } from './registry';

function blob(radius: number, color: string, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), mat(color));
  mesh.position.set(x, y, z);
  return mesh;
}

registerAsset('nature.tree', 'Árvore de copa arredondada (params: seed, height)', (p) => {
  const rand = rng(Number(p.seed ?? 1));
  const h = Number(p.height ?? 4) * (0.9 + rand() * 0.2);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, h * 0.55, 10), mat('#8f563b'));
  trunk.position.y = h * 0.275;
  const greens = ['#4f9e4b', '#6abe30', '#3f8f4a'];
  const g = group(trunk, blob(h * 0.3, greens[0], 0, h * 0.72, 0));
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const r = h * (0.14 + rand() * 0.08);
    g.add(blob(h * (0.17 + rand() * 0.07), greens[1 + (i % 2)], Math.cos(a) * r, h * (0.6 + rand() * 0.25), Math.sin(a) * r));
  }
  return g;
});

registerAsset('nature.bush', 'Arbusto baixo (params: seed)', (p) => {
  const rand = rng(Number(p.seed ?? 1));
  const g = group();
  for (let i = 0; i < 3; i++) {
    g.add(blob(0.35 + rand() * 0.15, '#4f9e4b', (i - 1) * 0.4, 0.3 + rand() * 0.1, (rand() - 0.5) * 0.3));
  }
  return g;
});

registerAsset('nature.dust', 'Nuvem de poeira que sobe do chão: um passo pesado, um corpo que cai, um impacto. Canal `puff` de 0 (nada) a 1 (já assentou): a poeira cresce, se espalha, sobe um pouco e some. Faça com `set` de 0 a 1 em 1 a 3 s, `ease: "out"`; o mesmo prop sobe de novo voltando a 0 (params: size, o raio quando cresce, em metros, padrão 1; color; seed)', (p) => {
  const rand = rng(Number(p.seed ?? 1));
  const size = Number(p.size ?? 1);
  const base = new THREE.Color(String(p.color ?? '#d6c19a'));
  const g = group();
  // Unlit and see-through, so the style leaves it as it is and its fading shows.
  const material = new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: 0, depthWrite: false });
  const shade = new THREE.MeshBasicMaterial({ color: base.clone().multiplyScalar(0.86), transparent: true, opacity: 0, depthWrite: false });
  const puffs = Array.from({ length: 11 }, (_, i) => {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), i % 3 === 0 ? shade : material);
    const angle = (i / 11) * Math.PI * 2 + rand() * 0.5;
    const out = 0.35 + rand() * 0.65;
    return { mesh, dir: [Math.cos(angle) * out, Math.sin(angle) * out], grow: 0.28 + rand() * 0.22, rise: 0.15 + rand() * 0.45 };
  });
  for (const { mesh } of puffs) g.add(mesh);
  g.userData.noOutline = true;
  return setChannels(g, {
    puff: {
      value: 0,
      apply: (v) => {
        const u = Math.max(0, Math.min(1, v));
        const on = u > 0.001 && u < 0.999;
        const spread = 1 - (1 - u) ** 2;
        material.opacity = shade.opacity = on ? 0.72 * (1 - u) ** 1.4 * Math.min(1, u / 0.05) : 0;
        for (const { mesh, dir, grow, rise } of puffs) {
          mesh.visible = on;
          const r = size * grow * (0.35 + 0.65 * spread);
          mesh.scale.setScalar(r);
          mesh.position.set(dir[0] * size * spread, r * 0.6 + size * rise * spread, dir[1] * size * spread);
        }
      },
    },
  });
});
