import * as THREE from 'three';
import { rng } from '../../core/rng';
import { group, registerAsset } from '../registry';
import { BRONZE, merged, mesh, rod, rodGeo, ROPE, v3 } from './kit';

// Cattle

registerAsset(
  'ancient.heifer',
  'Novilha (vaca nova), de frente para -z, 1,2 m na cernelha, com cabresto. Mexe a cauda, as orelhas e a cabeça sozinha com o tempo. `rope: 1` põe a corda de puxar pendurada do cabresto até o chão, para alguém levar pelo caminho (`moveTo`) (params: color — do pelo, castanho claro —, rope, seed)',
  (p) => {
    const color = String(p.color ?? '#b98a5a');
    const light = '#ead7bb';
    const dark = '#352a24';
    const g = group(mesh(new THREE.CapsuleGeometry(0.33, 0.85, 6, 16).rotateX(Math.PI / 2), color, [0, 0.9, 0.05]));
    // Legs with dark hooves; shoulders and haunches; the pale belly.
    for (const [x, z] of [[-0.17, -0.42], [0.17, -0.42], [-0.17, 0.5], [0.17, 0.5]]) {
      g.add(rod(v3(x, 0.08, z), v3(x, 0.82, z), 0.06, color, 0.1), mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.09, 10), dark, [x, 0.045, z]));
    }
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.2, 12, 10).scale(0.8, 1, 1), color, [s * 0.14, 0.92, 0.5]), mesh(new THREE.SphereGeometry(0.19, 12, 10).scale(0.8, 1.05, 1), color, [s * 0.13, 0.95, -0.42]));
    g.add(mesh(new THREE.CapsuleGeometry(0.22, 0.6, 4, 12).rotateX(Math.PI / 2), light, [0, 0.72, 0.05]));
    // Neck and head turn together from the shoulders.
    const head = new THREE.Group();
    head.position.set(0, 1.0, -0.55);
    const skull = new THREE.CapsuleGeometry(0.13, 0.24, 6, 12);
    skull.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), v3(0, -0.75, -1).normalize()));
    head.add(
      rod(v3(0, -0.08, 0.1), v3(0, 0.16, -0.25), 0.22, color, 0.15),
      mesh(skull, color, [0, 0.13, -0.42]),
      mesh(new THREE.SphereGeometry(0.115, 12, 10).scale(1.05, 0.85, 0.9), light, [0, 0.0, -0.58]),
      // The dewlap under the throat.
      mesh(new THREE.SphereGeometry(0.1, 10, 8).scale(0.6, 1.3, 1.2), color, [0, -0.08, -0.2]),
    );
    for (const s of [-1, 1]) {
      head.add(mesh(new THREE.SphereGeometry(0.02, 8, 6), '#141010', [s * 0.11, 0.21, -0.43]), mesh(new THREE.SphereGeometry(0.016, 8, 6), '#4a3030', [s * 0.04, -0.02, -0.68]));
      // Two small horn buds: she is young.
      head.add(mesh(new THREE.ConeGeometry(0.022, 0.06, 8).rotateZ(-s * 0.5), '#e2d6bd', [s * 0.07, 0.3, -0.32]));
    }
    const ears = [-1, 1].map((s) => {
      const ear = new THREE.Group();
      ear.position.set(s * 0.12, 0.25, -0.3);
      ear.add(mesh(new THREE.SphereGeometry(1, 10, 8).scale(0.09, 0.025, 0.05).translate(s * 0.08, 0, 0), color));
      ear.rotation.z = s * -0.25;
      head.add(ear);
      return ear;
    });
    // The halter: a band round the nose and one behind the ears, a ring under the chin.
    const halter: THREE.BufferGeometry[] = [new THREE.TorusGeometry(0.125, 0.012, 5, 18).rotateX(1.25).translate(0, 0.03, -0.53), new THREE.TorusGeometry(0.15, 0.012, 5, 18).rotateY(Math.PI / 2).rotateZ(Math.PI / 2).rotateX(-0.25).translate(0, 0.17, -0.3)];
    for (const s of [-1, 1]) halter.push(rodGeo(v3(s * 0.12, 0.06, -0.53), v3(s * 0.145, 0.2, -0.32), 0.011, 0.011, 5));
    head.add(merged(halter, '#7a3b2a', true), mesh(new THREE.TorusGeometry(0.025, 0.007, 5, 12), BRONZE, [0, -0.1, -0.5]));
    if (Number(p.rope ?? 0) > 0) {
      // From the ring it hangs in a curve to the ground and lies there a little way forward.
      const ground = -head.position.y;
      const curve = new THREE.CatmullRomCurve3([v3(0, -0.12, -0.5), v3(0.02, -0.5, -0.62), v3(0.05, ground + 0.25, -0.72), v3(0.08, ground + 0.015, -0.9), v3(0.14, ground + 0.015, -1.25)]);
      const rope = mesh(new THREE.TubeGeometry(curve, 24, 0.011, 5), ROPE);
      rope.userData.noOutline = true;
      head.add(rope);
    }
    g.add(head);
    const tail = new THREE.Group();
    tail.position.set(0, 1.08, 0.82);
    tail.add(rod(v3(0, 0, 0), v3(0, -0.7, 0.05), 0.022, color), mesh(new THREE.SphereGeometry(0.05, 8, 8).scale(1, 2, 1), dark, [0, -0.76, 0.055]));
    g.add(tail);
    const phase = rng(Number(p.seed ?? 1))() * 10;
    g.userData.animate = (t: number) => {
      tail.rotation.z = 0.3 * Math.sin(t * 1.7 + phase) * Math.max(0, Math.sin(t * 0.4 + phase));
      tail.rotation.x = 0.06 * Math.sin(t * 0.9 + phase);
      head.rotation.x = 0.07 * Math.sin(t * 0.7 + phase);
      head.rotation.y = 0.1 * Math.sin(t * 0.23 + phase);
      ears.forEach((ear, i) => (ear.rotation.x = 0.5 * Math.max(0, Math.sin(t * (1.2 + i * 0.35) + phase * (i + 1))) ** 8));
    };
    g.userData.animate(0);
    return g;
  },
);
