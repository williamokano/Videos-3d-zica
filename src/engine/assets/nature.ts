import * as THREE from 'three';
import { rng } from '../core/rng';
import { group, mat, registerAsset } from './registry';

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
