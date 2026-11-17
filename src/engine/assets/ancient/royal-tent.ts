import * as THREE from 'three';
import { channelAt, type CompiledActions } from '../../actions/catalog';
import { rng } from '../../core/rng';
import { legPose, odometer } from '../gait';
import { group, loose, place, post, rbox, registerAsset, setChannels } from '../registry';
import { BRONZE, lathe, merged, mesh, rod, ROPE, shade, v3, WOOD_DARK } from './kit';
import { BURLAP, jar, sackGeo } from './camp';

// Inside the king's tent

registerAsset(
  'ancient.rug',
  'Tapete tecido, com barra de outra cor, losangos no meio e franjas nas pontas (ao longo de z); pisa-se nele (params: width, depth, color, trim, seed)',
  (p) => {
    const [w, d] = [Number(p.width ?? 2), Number(p.depth ?? 3)];
    const color = String(p.color ?? '#9c3b2e');
    const trim = String(p.trim ?? '#d8b45a');
    const rand = rng(Number(p.seed ?? 1));
    const g = group(rbox(w, 0.014, d, trim, [0, 0.007, 0], 0.005), rbox(w - 0.24, 0.018, d - 0.24, color, [0, 0.009, 0], 0.005), rbox(w - 0.4, 0.02, d - 0.4, shade(color, 0.72), [0, 0.01, 0], 0.005));
    const n = Math.max(1, Math.round((d - 0.6) / Math.min(w * 0.6, 1)));
    for (let i = 0; i < n; i++) {
      const size = Math.min(w * 0.45, (d - 0.6) / n) * (0.8 + rand() * 0.1);
      const diamond = rbox(size * 0.7, 0.024, size * 0.7, i % 2 ? trim : '#2f4a6b', [0, 0.012, -d / 2 + 0.3 + ((i + 0.5) * (d - 0.6)) / n], 0.004);
      diamond.rotation.y = Math.PI / 4;
      g.add(diamond);
    }
    const fringe: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) for (let x = -w / 2 + 0.05; x < w / 2; x += 0.05) fringe.push(new THREE.BoxGeometry(0.012, 0.006, 0.09).translate(x, 0.004, s * (d / 2 + 0.04)));
    g.add(merged(fringe, '#efe4c8'));
    g.userData.passable = true;
    return g;
  },
);

registerAsset(
  'ancient.cushion',
  'Almofada de chão, quadrada e fofa com borlas nos cantos, ou um rolo para encostar (params: shape — "square" ou "bolster" —, color, trim, size — escala)',
  (p) => {
    const color = String(p.color ?? '#7a3b6a');
    const trim = String(p.trim ?? '#d6a640');
    const g = group();
    if (String(p.shape ?? 'square') === 'bolster') {
      g.add(mesh(new THREE.CapsuleGeometry(0.13, 0.62, 6, 14).rotateZ(Math.PI / 2), color, [0, 0.13, 0]));
      for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 16).rotateY(Math.PI / 2), trim, [s * 0.32, 0.13, 0]));
    } else {
      g.add(rbox(0.62, 0.17, 0.62, color, [0, 0.085, 0], 0.075), mesh(new THREE.SphereGeometry(0.025, 8, 6), trim, [0, 0.172, 0]));
      for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        // Hanging down from the corner.
        const tassel = mesh(new THREE.ConeGeometry(0.022, 0.08, 6).rotateX(Math.PI), trim, [x * 0.315, 0.045, z * 0.315]);
        g.add(tassel);
      }
    }
    g.scale.setScalar(Number(p.size ?? 1));
    return loose(group(g));
  },
);

registerAsset(
  'ancient.chest',
  'Baú de madeira com cintas de bronze, a frente (fechadura) para +z; a tampa abre para trás (canal `open`) e em cima se põem coisas (`top`) (params: width, color)',
  (p) => {
    const w = Number(p.width ?? 0.9);
    const [h, d] = [0.45, 0.5];
    const wood = String(p.color ?? '#7a5236');
    const g = group(rbox(w, h, d, wood, [0, h / 2, 0], 0.02));
    for (const x of [-w * 0.3, w * 0.3]) g.add(rbox(0.06, h + 0.01, d + 0.01, BRONZE, [x, h / 2, 0], 0.008));
    g.add(rbox(0.1, 0.12, 0.02, BRONZE, [0, h - 0.07, d / 2 + 0.01], 0.008));
    for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12).rotateY(Math.PI / 2), BRONZE, [s * (w / 2 + 0.012), h * 0.65, 0]));
    // The lid turns on hinges along the back.
    const lid = group(rbox(w + 0.03, 0.08, d + 0.03, shade(wood, 1.1), [0, 0.04, d / 2], 0.02), mesh(new THREE.CylinderGeometry(d / 2, d / 2, w + 0.02, 18, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.25, 1), shade(wood, 1.1), [0, 0.08, d / 2]));
    for (const x of [-w * 0.3, w * 0.3]) lid.add(rbox(0.062, 0.09, d + 0.04, BRONZE, [x, 0.045, d / 2], 0.008));
    lid.position.set(0, h, -d / 2);
    g.add(lid, place('top', 0, h + 0.15, 0));
    return setChannels(g, { open: { value: 0, apply: (v) => (lid.rotation.x = -v * 1.9) } });
  },
);

registerAsset(
  'ancient.lowTable',
  'Mesa baixa de madeira (35 cm, para comer sentado no chão), com jarra, copos e uma tigela de frutas em cima; põe-se coisas em `top` (params: width, depth, jar — 0 ou 1 —, cups, fruit — 0 ou 1 —, color)',
  (p) => {
    const [w, d] = [Number(p.width ?? 1.2), Number(p.depth ?? 0.7)];
    const wood = String(p.color ?? '#8a5a3a');
    const top = 0.35;
    const g = group(rbox(w, 0.05, d, wood, [0, top - 0.025, 0], 0.015), rbox(w - 0.1, 0.06, d - 0.1, shade(wood, 0.75), [0, top - 0.08, 0], 0.01));
    for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) g.add(rbox(0.07, top - 0.05, 0.07, shade(wood, 0.75), [x * (w / 2 - 0.07), (top - 0.05) / 2, z * (d / 2 - 0.07)], 0.015));
    if (Number(p.jar ?? 1) > 0) {
      const pitcher = jar('pitcher', 0.3, '#b86a42');
      pitcher.position.set(-w * 0.28, top, -d * 0.12);
      g.add(pitcher);
    }
    const cups = Math.max(0, Math.round(Number(p.cups ?? 2)));
    for (let i = 0; i < cups; i++) {
      g.add(mesh(lathe([[0.001, 0], [0.03, 0], [0.045, 0.06], [0.048, 0.08], [0.04, 0.08], [0.035, 0.065], [0.001, 0.065]], 14), i % 2 ? BRONZE : '#c47a4a', [w * 0.02 + (i - (cups - 1) / 2) * 0.16, top, d * 0.18]));
    }
    if (Number(p.fruit ?? 1) > 0) {
      const bowl = group(mesh(lathe([[0.001, 0], [0.06, 0], [0.13, 0.05], [0.14, 0.065], [0.125, 0.065], [0.115, 0.055], [0.001, 0.03]], 16), '#b9663f'));
      const rand = rng(8);
      const grapes: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 14; i++) grapes.push(new THREE.IcosahedronGeometry(0.022, 1).translate(-0.04 + (rand() - 0.5) * 0.08, 0.06 + rand() * 0.04, (rand() - 0.5) * 0.08));
      bowl.add(merged(grapes, '#5d2f5a', true));
      for (let i = 0; i < 3; i++) bowl.add(mesh(new THREE.SphereGeometry(0.035, 10, 8).scale(1, 1.15, 1), '#7a5a3a', [0.05, 0.075, (i - 1) * 0.055]));
      bowl.position.set(w * 0.3, top, -d * 0.05);
      g.add(bowl);
    }
    g.add(place('top', 0, top + 0.01, 0));
    return g;
  },
);

registerAsset(
  'ancient.hitchedDonkey',
  'Jumento parado, de frente para -z, amarrado pelo cabresto a uma estaca; mexe a cauda, as orelhas e a cabeça sozinho. `load: 1` põe manta e alforjes no lombo (params: color, load, tied — 0 sem estaca —, seed)',
  (p) => {
    const color = String(p.color ?? '#8f877d');
    const light = '#ddd5c8';
    const dark = '#3a3330';
    const g = group(mesh(new THREE.CapsuleGeometry(0.27, 0.6, 6, 14).rotateX(Math.PI / 2), color, [0, 0.88, 0.05]));
    // Legs, a little thicker at the top, with dark hooves; the haunches.
    // Each leg hangs from a pivot at the hip, so it can swing when the donkey is led along.
    const legs = [[-0.13, -0.33], [0.13, -0.33], [-0.13, 0.4], [0.13, 0.4]].map(([x, z]) => {
      const leg = new THREE.Group();
      leg.position.set(x, 0.84, z);
      leg.add(rod(v3(0, -0.77, 0), v3(0, 0, 0), 0.05, color, 0.09), mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.08, 10), dark, [0, -0.8, 0]));
      g.add(leg);
      return leg;
    });
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.15, 12, 10).scale(0.8, 1, 1), color, [s * 0.11, 0.86, 0.42]));
    // The light belly.
    g.add(mesh(new THREE.CapsuleGeometry(0.17, 0.45, 4, 12).rotateX(Math.PI / 2), light, [0, 0.74, 0.05]));
    // Neck and head turn together from the shoulders.
    const head = new THREE.Group();
    head.position.set(0, 1.0, -0.42);
    const skull = new THREE.CapsuleGeometry(0.115, 0.26, 6, 12);
    skull.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), v3(0, -0.55, -1).normalize()));
    head.add(
      rod(v3(0, -0.05, 0.04), v3(0, 0.3, -0.22), 0.17, color, 0.12),
      rod(v3(0, 0.16, 0.0), v3(0, 0.43, -0.2), 0.04, dark),
      mesh(skull, color, [0, 0.28, -0.38]),
      mesh(new THREE.SphereGeometry(0.11, 12, 10).scale(0.95, 0.9, 1.05), light, [0, 0.18, -0.56]),
      mesh(new THREE.SphereGeometry(0.03, 8, 6), dark, [0, 0.17, -0.65]),
      mesh(new THREE.TorusGeometry(0.105, 0.012, 5, 16).rotateX(1.1), '#8a3b2a', [0, 0.22, -0.5]),
    );
    for (const s of [-1, 1]) head.add(mesh(new THREE.SphereGeometry(0.018, 8, 6), '#141010', [s * 0.085, 0.36, -0.42]));
    const ears = [-1, 1].map((s) => {
      const ear = new THREE.Group();
      ear.position.set(s * 0.06, 0.42, -0.3);
      const cone = mesh(new THREE.ConeGeometry(0.045, 0.3, 7).scale(1, 1, 0.55).translate(0, 0.15, 0), color);
      const tip = mesh(new THREE.ConeGeometry(0.028, 0.08, 7).translate(0, 0.27, 0), dark);
      ear.add(cone, tip);
      ear.rotation.set(0.35, 0, -s * 0.35);
      head.add(ear);
      return ear;
    });
    g.add(head);
    const tail = new THREE.Group();
    tail.position.set(0, 0.98, 0.62);
    tail.add(rod(v3(0, 0, 0), v3(0, -0.4, 0.06), 0.02, color), mesh(new THREE.SphereGeometry(0.05, 8, 8).scale(1, 1.8, 1), dark, [0, -0.44, 0.065]));
    g.add(tail);
    if (Number(p.load ?? 0) > 0) {
      g.add(rbox(0.6, 0.03, 0.55, '#7d3b33', [0, 1.13, 0.0], 0.01));
      for (const s of [-1, 1]) {
        g.add(rbox(0.03, 0.34, 0.55, '#7d3b33', [s * 0.28, 0.98, 0], 0.01));
        const bag = mesh(sackGeo(true).scale(0.75, 0.75, 0.75).rotateY(Math.PI / 2), BURLAP[1], [s * 0.36, 0.78, -0.25]);
        g.add(bag);
      }
    }
    if (Number(p.tied ?? 1) > 0) g.add(post(0.04, 0.75, WOOD_DARK, 0.45, 0, -1.25), rod(v3(0.03, 1.12, -0.95), v3(0.45, 0.6, -1.25), 0.008, ROPE));
    const phase = rng(Number(p.seed ?? 1))() * 10;
    g.userData.animate = (t: number) => {
      tail.rotation.z = 0.25 * Math.sin(t * 1.9 + phase) * Math.max(0, Math.sin(t * 0.45 + phase));
      head.rotation.x = 0.06 * Math.sin(t * 0.6 + phase);
      head.rotation.y = 0.12 * Math.sin(t * 0.27 + phase);
      ears.forEach((ear, i) => (ear.rotation.x = 0.35 + 0.25 * Math.max(0, Math.sin(t * (1.3 + i * 0.4) + phase * (i + 1))) ** 6));
    };
    // Led along (moveTo), it walks: the four-beat walk of a donkey (gait.ts), its phase taken from the distance
    // covered so the legs never race when the pace changes, each hoof still on the ground while it bears weight.
    // Standing, the legs come back straight under it.
    const HIP = 0.84;
    const CYCLE = 0.9;
    let travelled: ((t: number) => number) | undefined;
    g.userData.present = (compiled: CompiledActions, t: number, id: string) => {
      const at = (u: number): [number, number] => [channelAt(compiled, id, 'x', u), channelAt(compiled, id, 'z', u)];
      travelled ??= odometer(at);
      const dt = 0.12;
      const [a, b] = [at(Math.max(0, t - dt)), at(t + dt)];
      const walk = Math.min(1, Math.hypot(b[0] - a[0], b[1] - a[1]) / (2 * dt) / 0.35);
      const phase = travelled(t) / CYCLE;
      legs.forEach((leg, i) => {
        const pose = legPose(phase, i, HIP, CYCLE);
        leg.rotation.x = walk * pose.angle;
        // A rigid leg is lifted by drawing it a little shorter from the hip.
        leg.scale.y = 1 - (walk * pose.lift) / HIP;
      });
      // The head nods twice a cycle, with the steps.
      head.position.y = 1.0 + walk * 0.02 * Math.abs(Math.sin(phase * Math.PI * 2));
      head.rotation.x += walk * 0.07 * Math.sin(phase * Math.PI * 4);
    };
    return g;
  },
);
