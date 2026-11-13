import * as THREE from 'three';
import { rng } from '../core/rng';
import { group, place, post, rbox, registerAsset, setChannels, switchable } from './registry';

registerAsset('structure.pillar', 'Pilar de concreto (params: height, size)', (p) => {
  const h = Number(p.height ?? 3);
  const s = Number(p.size ?? 0.4);
  return group(rbox(s, h, s, '#a9a59c', [0, h / 2, 0], 0.03));
});

registerAsset('light.ceilingLamp', 'Luminária de teto com luz própria; posicione com y perto do teto (params: color, intensity, range)', (p) => {
  const color = String(p.color ?? '#ffe9c4');
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.1, 16), new THREE.MeshBasicMaterial({ color }));
  glow.position.y = -0.05;
  glow.userData.noShadow = true;
  const light = new THREE.PointLight(color, Number(p.intensity ?? 14), Number(p.range ?? 11), 1.6);
  light.position.y = -0.2;
  // Channel `on`: with an id in the location, an episode can switch it off and on.
  return setChannels(group(post(0.015, 0.12, '#3b3b46', 0, 0, 0), glow, light), switchable([glow], color, light));
});

registerAsset('storage.shelf', 'Estante de depósito com caixas (params: seed, width)', (p) => {
  const rand = rng(Number(p.seed ?? 1));
  const w = Number(p.width ?? 2);
  const g = group();
  for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) {
    for (const z of [-0.22, 0.22]) g.add(rbox(0.05, 2.2, 0.05, '#5a5f6b', [x, 1.1, z], 0.01));
  }
  const boxColors = ['#c8a06a', '#b98d58', '#d6b27c', '#8e9aa8'];
  for (const y of [0.25, 0.9, 1.55, 2.18]) {
    g.add(rbox(w, 0.04, 0.5, '#7b808c', [0, y, 0], 0.01));
    // The end of each shelf is kept free, to put things on.
    if (y > 2) continue;
    g.add(place(`shelf${[0.25, 0.9, 1.55].indexOf(y) + 1}`, w / 2 - 0.22, y + 0.02, 0));
    let x = -w / 2 + 0.12;
    while (x < w / 2 - 0.5) {
      const bw = 0.3 + rand() * 0.3;
      const bh = 0.25 + rand() * 0.3;
      if (rand() > 0.25) g.add(rbox(bw, bh, 0.36, boxColors[Math.floor(rand() * boxColors.length)], [x + bw / 2, y + 0.02 + bh / 2, (rand() - 0.5) * 0.06], 0.02));
      x += bw + 0.06 + rand() * 0.15;
    }
  }
  return g;
});

registerAsset('storage.crates', 'Pilha de caixotes de madeira (params: seed)', (p) => {
  const rand = rng(Number(p.seed ?? 1));
  const g = group();
  const s = 0.7;
  const spots: [number, number, number][] = [[0, 0, 0], [s + 0.05, 0, 0.1], [0.1, 0, s + 0.08], [0.35, s, 0.2]];
  for (const [x, y, z] of spots) {
    if (y > 0 && rand() < 0.3) continue;
    const crate = rbox(s, s, s, rand() > 0.5 ? '#b98d58' : '#a67c4a', [x, y + s / 2, z], 0.03);
    crate.rotation.y = (rand() - 0.5) * 0.3;
    g.add(crate);
  }
  // On the second crate, which never has another on top.
  g.add(place('top', s + 0.05, s, 0.1));
  return g;
});

registerAsset('item.box', 'Caixa de papelão pequena, boa para ser carregada (params: size, color)', (p) => {
  const s = Number(p.size ?? 0.4);
  const color = String(p.color ?? '#c8a06a');
  return group(rbox(s, s * 0.75, s, color, [0, s * 0.375, 0], 0.02), rbox(s * 0.2, 0.01, s, '#e8d9b5', [0, s * 0.75, 0], 0.004));
});
