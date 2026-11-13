import * as THREE from 'three';
import { group, mat, post, rbox, registerAsset, setChannels, switchable } from './registry';

/*
 * Things fixed to a ceiling or a wall. Ceiling ones have their origin where they touch the ceiling and hang
 * down from it: place them with `y` at the ceiling height. Wall ones have their back at z = 0 and face +z.
 */

registerAsset(
  'light.tubeLamp',
  'Luminária de barra (calha com duas lâmpadas tubulares), de teto, como em sala de aula; a origem é no teto e o comprimento vai ao longo de x (params: length, color, intensity — 0 para a lâmpada aparecer acesa sem somar luz à cena —, range)',
  (p) => {
    const length = Number(p.length ?? 1.3);
    const color = String(p.color ?? '#f4f8ff');
    const intensity = Number(p.intensity ?? 7);
    const g = group(
      // The housing, a little wider than the tubes, and its end caps.
      rbox(length + 0.08, 0.045, 0.2, '#e9ecef', [0, -0.025, 0], 0.012),
      rbox(0.03, 0.05, 0.16, '#c5cad1', [-length / 2 - 0.01, -0.07, 0], 0.006),
      rbox(0.03, 0.05, 0.16, '#c5cad1', [length / 2 + 0.01, -0.07, 0], 0.006),
    );
    const tubes = [-0.045, 0.045].map((z) => {
      const tube = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(new THREE.CylinderGeometry(0.018, 0.018, length, 10).rotateZ(Math.PI / 2));
      tube.position.set(0, -0.075, z);
      tube.userData.noShadow = true;
      g.add(tube);
      return tube;
    });
    let light: THREE.PointLight | undefined;
    if (intensity > 0) {
      light = new THREE.PointLight(color, intensity, Number(p.range ?? 9), 1.6);
      light.position.y = -0.25;
      g.add(light);
    }
    // Channel `on`: with an id in the location, an episode can switch it off and on.
    return setChannels(g, switchable(tubes, color, light));
  },
);

registerAsset(
  'school.ceilingFan',
  'Ventilador de teto com haste, girando sozinho; a origem é no teto (params: blades — 3 ou 4 —, speed em voltas por segundo, 0 para parado, drop — comprimento da haste —, color)',
  (p) => {
    const blades = Math.max(2, Math.round(Number(p.blades ?? 3)));
    const speed = Number(p.speed ?? 1.1);
    const drop = Number(p.drop ?? 0.35);
    const color = String(p.color ?? '#f1f1ee');
    const g = group(
      // Canopy against the ceiling, rod, and the motor.
      new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.045, 0.06, 16), mat('#d9d9d4')).translateY(-0.03),
      post(0.012, drop, '#c9c9c4', 0, -drop, 0),
      new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.1, 20), mat(color)).translateY(-drop - 0.05),
    );
    const rotor = new THREE.Group();
    rotor.position.y = -drop - 0.06;
    for (let i = 0; i < blades; i++) {
      const arm = new THREE.Group();
      arm.rotation.y = (i / blades) * Math.PI * 2;
      const blade = rbox(0.52, 0.012, 0.13, color, [0.38, 0, 0], 0.005);
      // Pitched a little, as a real blade is.
      blade.rotation.x = 0.16;
      arm.add(blade, rbox(0.1, 0.01, 0.04, '#b8b8b2', [0.13, 0, 0], 0.004));
      rotor.add(arm);
    }
    g.add(rotor);
    // Turns with the clock of the episode, so every frame shows the blades where they are at that instant.
    // Channel `on`: switched off, the blades stand still.
    let on = speed ? 1 : 0;
    if (speed) g.userData.animate = (t: number) => (rotor.rotation.y = on > 0.5 ? -t * speed * Math.PI * 2 : 0.4);
    return setChannels(g, { on: { value: on, apply: (v) => (on = v) } });
  },
);

registerAsset(
  'school.speaker',
  'Caixinha de som de parede, das que dão o sinal e os avisos; costas em z = 0, virada para +z e um pouco para baixo (params: color)',
  (p) => {
    const color = String(p.color ?? '#2c2f36');
    const box = group(
      rbox(0.2, 0.28, 0.16, color, [0, 0, 0.08], 0.015),
      // Grille and the two cones behind it.
      rbox(0.17, 0.25, 0.01, '#15171b', [0, 0, 0.162], 0.004),
      new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 16).rotateX(Math.PI / 2), mat('#3d424c')).translateY(-0.045).translateZ(0.168),
      new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 12).rotateX(Math.PI / 2), mat('#3d424c')).translateY(0.07).translateZ(0.168),
    );
    box.position.set(0, 0, 0.05);
    box.rotation.x = 0.22;
    // The bracket that holds it off the wall.
    return group(rbox(0.06, 0.08, 0.07, '#8b9099', [0, 0.02, 0.035], 0.006), box);
  },
);
