import * as THREE from 'three';
import { group, mat, place, post, rbox, registerAsset, setChannels } from './registry';

/*
 * What stands on a street. Things with a front (a sign, a bus stop, a traffic light) face +z, toward the road
 * when placed on the kerb with their back to the houses. What lies flat on the ground (a crossing, a manhole)
 * is walked over and does not block the way.
 */

/** A lamp that is seen lit without lighting the scene; `lit(false)` shows it dark. */
function lamp(geometry: THREE.BufferGeometry, color: string): { mesh: THREE.Mesh; lit(on: boolean): void } {
  const [bright, dim] = [new THREE.MeshBasicMaterial({ color }), mat(`#${new THREE.Color(color).multiplyScalar(0.25).getHexString()}`)];
  const mesh = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(geometry, bright);
  mesh.userData.noShadow = true;
  return { mesh, lit: (on) => (mesh.material = on ? bright : dim) };
}

registerAsset(
  'street.lightPole',
  'Poste de luz de rua: poste alto com um braço para +z e a luminária na ponta. Canal `on` (0 ou 1) acende; `flicker: 1` faz a lâmpada falhar de vez em quando (params: height, reach, color — da luz —, intensity — 0 para aparecer aceso sem iluminar —, flicker, wires — 1 para a cruzeta de fios no alto)',
  (p) => {
    const height = Number(p.height ?? 7);
    const reach = Number(p.reach ?? 1.6);
    const color = String(p.color ?? '#ffe2a8');
    const intensity = Number(p.intensity ?? 0);
    const g = group(
      // Concrete pole, thicker at the foot.
      new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, height, 12), mat('#a9a59c')).translateY(height / 2),
      rbox(0.07, 0.07, reach, '#6b6f78', [0, height - 0.5, reach / 2], 0.02),
      rbox(0.26, 0.09, 0.5, '#4a4f5c', [0, height - 0.5, reach], 0.03),
    );
    if (Number(p.wires ?? 1) > 0) g.add(rbox(1.5, 0.08, 0.08, '#6b4a3a', [0, height - 0.15, 0], 0.02), rbox(0.2, 0.3, 0.2, '#8d919b', [0.3, height - 1.1, 0], 0.04));
    const bulb = lamp(new THREE.BoxGeometry(0.2, 0.03, 0.4), color);
    bulb.mesh.position.set(0, height - 0.56, reach);
    g.add(bulb.mesh);
    const light = intensity > 0 ? new THREE.PointLight(color, intensity, Number(p.range ?? 14), 1.5) : undefined;
    if (light) {
      light.position.set(0, height - 0.8, reach);
      g.add(light);
    }
    let on = 1;
    const flicker = Number(p.flicker ?? 0) > 0;
    const show = (lit: boolean) => {
      bulb.lit(lit);
      if (light) light.intensity = lit ? intensity : 0;
    };
    // A failing lamp goes dark in short bursts, at moments set by the clock of the episode.
    if (flicker) {
      g.userData.animate = (t: number) => {
        const k = Math.floor(t * 9);
        const noise = Math.sin(k * 12.9898) * 43758.5453;
        show(on > 0.5 && noise - Math.floor(noise) > 0.28);
      };
    }
    return setChannels(g, { on: { value: 1, apply: (v) => ((on = v), show(v > 0.5)) } });
  },
);

registerAsset(
  'street.trafficLight',
  'Semáforo de poste, virado para +z. Canal `state`: 0 vermelho, 1 amarelo, 2 verde, 3 apagado; `cycle: 1` faz ele trocar sozinho com o tempo (params: height, cycle)',
  (p) => {
    const height = Number(p.height ?? 3.4);
    const g = group(post(0.06, height, '#4a4f5c', 0, 0, 0), rbox(0.3, 0.86, 0.24, '#22252b', [0, height + 0.3, 0.02], 0.04));
    const lamps = (['#ff3b30', '#ffcc00', '#34c759'] as const).map((color, i) => {
      const l = lamp(new THREE.CircleGeometry(0.095, 20), color);
      l.mesh.position.set(0, height + 0.57 - i * 0.27, 0.145);
      // A hood over each lamp.
      g.add(l.mesh, rbox(0.24, 0.03, 0.14, '#22252b', [0, height + 0.69 - i * 0.27, 0.2], 0.01));
      return l;
    });
    const show = (state: number) => lamps.forEach((l, i) => l.lit(Math.round(state) === i));
    // Green 6 s, yellow 2 s, red 6 s.
    if (Number(p.cycle ?? 0) > 0) {
      g.userData.animate = (t: number) => {
        const at = t % 14;
        show(at < 6 ? 2 : at < 8 ? 1 : 0);
      };
    }
    return setChannels(g, { state: { value: 0, apply: show } });
  },
);

/** A flat sign with a picture drawn on it; in tests (no browser) a plain colored plate. */
function plate(width: number, height: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, fallback: string): THREE.Mesh {
  let material: THREE.Material = new THREE.MeshBasicMaterial({ color: fallback });
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = [256, Math.round((256 * height) / width)];
    draw(canvas.getContext('2d')!, canvas.width, canvas.height);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    material = new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.userData.noShadow = mesh.userData.noOutline = true;
  return mesh;
}

registerAsset(
  'street.sign',
  'Placa de trânsito num poste, virada para +z (params: kind — "stop" (PARE), "noParking", "speed" com `text` para o número, "crossing" (travessia de pedestre), "name" (nome de rua, com `text`) —, text, height)',
  (p) => {
    const kind = String(p.kind ?? 'stop');
    const text = String(p.text ?? (kind === 'speed' ? '40' : kind === 'name' ? 'Rua das Flores' : 'PARE'));
    const height = Number(p.height ?? 2.3);
    const g = group(post(0.03, height + 0.35, '#8d919b', 0, 0, 0));
    const [w, h] = kind === 'name' ? [0.9, 0.24] : [0.6, 0.6];
    const face = plate(w, h, (c, cw, ch) => {
      const [cx, cy, r] = [cw / 2, ch / 2, Math.min(cw, ch) / 2 - 4];
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (kind === 'stop') {
        // An octagon.
        c.fillStyle = '#c62828';
        c.beginPath();
        for (let i = 0; i < 8; i++) c.lineTo(cx + r * Math.cos(((i + 0.5) / 8) * Math.PI * 2), cy + r * Math.sin(((i + 0.5) / 8) * Math.PI * 2));
        c.fill();
        c.fillStyle = '#ffffff';
        c.font = 'bold 64px sans-serif';
        c.fillText(text, cx, cy + 4);
      } else if (kind === 'name') {
        c.fillStyle = '#1e4fa3';
        c.fillRect(0, 0, cw, ch);
        c.fillStyle = '#ffffff';
        c.font = `bold ${Math.round(ch * 0.5)}px sans-serif`;
        c.fillText(text, cx, cy + 2, cw - 16);
      } else if (kind === 'crossing') {
        // A yellow diamond with a walker.
        c.fillStyle = '#f2c200';
        c.beginPath();
        c.moveTo(cx, cy - r);
        c.lineTo(cx + r, cy);
        c.lineTo(cx, cy + r);
        c.lineTo(cx - r, cy);
        c.fill();
        c.fillStyle = '#111';
        c.beginPath();
        c.arc(cx, cy - 36, 14, 0, Math.PI * 2);
        c.fill();
        c.fillRect(cx - 8, cy - 20, 16, 44);
        c.fillRect(cx - 26, cy + 20, 18, 8);
        c.fillRect(cx + 8, cy + 20, 18, 8);
      } else {
        // A white disc with a red ring: a speed limit, or a struck-out E for no parking.
        c.fillStyle = '#d32f2f';
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(cx, cy, r * 0.76, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#111';
        c.font = 'bold 96px sans-serif';
        c.fillText(kind === 'noParking' ? 'E' : text, cx, cy + 6);
        if (kind === 'noParking') {
          c.strokeStyle = '#d32f2f';
          c.lineWidth = 18;
          c.beginPath();
          c.moveTo(cx - r * 0.62, cy - r * 0.62);
          c.lineTo(cx + r * 0.62, cy + r * 0.62);
          c.stroke();
        }
      }
    }, kind === 'name' ? '#1e4fa3' : '#c62828');
    face.position.set(0, height, 0.035);
    g.add(face);
    // Only a street name is a rectangle with a back; the others keep the shape of their picture.
    if (kind === 'name') g.add(rbox(w * 0.98, h * 0.96, 0.02, '#c5cad1', [0, height, 0.02], 0.008));
    return g;
  },
);

registerAsset('street.cone', 'Cone de trânsito laranja com faixas brancas; dê `id` e `pickable` para alguém carregar (params: height, color)', (p) => {
  const h = Number(p.height ?? 0.72);
  const color = String(p.color ?? '#f26b21');
  const ringAt = (y: number, thick: number) => {
    // A white band that follows the slope of the cone.
    const [bottom, top] = [0.03 + (0.14 - 0.03) * (1 - (y - thick / 2) / h), 0.03 + (0.14 - 0.03) * (1 - (y + thick / 2) / h)];
    const band = new THREE.Mesh(new THREE.CylinderGeometry(top + 0.004, bottom + 0.004, thick, 16), mat('#f4f4f0'));
    band.position.y = y + 0.03;
    return band;
  };
  return group(
    rbox(0.36, 0.035, 0.36, '#22242a', [0, 0.0175, 0], 0.012),
    new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.14, h, 16), mat(color)).translateY(h / 2 + 0.03),
    ringAt(h * 0.42, h * 0.14), ringAt(h * 0.68, h * 0.1),
  );
});

registerAsset(
  'street.barrier',
  'Barreira de bloqueio, ao longo de x: "wood" (cavalete de madeira listrado), "steel" (grade de aço de contenção, das de evento e obra) ou "plastic" (barreira plástica laranja e branca) (params: kind, length, color)',
  (p) => {
    const kind = String(p.kind ?? 'wood');
    const length = Number(p.length ?? (kind === 'steel' ? 2.2 : 1.6));
    const g = group();
    if (kind === 'steel') {
      const steel = String(p.color ?? '#b9bcc2');
      const tube = (w: number, h: number, x: number, y: number) => rbox(w, h, 0.035, steel, [x, y, 0], 0.014);
      g.add(tube(length, 0.035, 0, 1.08), tube(length, 0.035, 0, 0.18), tube(0.035, 0.94, -length / 2, 0.63), tube(0.035, 0.94, length / 2, 0.63));
      const bars = Math.round(length / 0.14);
      for (let i = 1; i < bars; i++) g.add(rbox(0.02, 0.9, 0.02, steel, [-length / 2 + (i / bars) * length, 0.63, 0], 0.008));
      // Flat feet across, so it stands by itself.
      for (const x of [-length / 2 + 0.2, length / 2 - 0.2]) g.add(rbox(0.05, 0.03, 0.6, steel, [x, 0.015, 0], 0.01), rbox(0.03, 0.18, 0.03, steel, [x, 0.1, 0], 0.01));
      return g;
    }
    if (kind === 'plastic') {
      for (let i = 0; i < 2; i++) g.add(rbox(length, 0.42, 0.4 - i * 0.14, i ? '#f4f4f0' : String(p.color ?? '#f26b21'), [0, 0.21 + i * 0.42, 0], 0.06));
      return g;
    }
    // A-frame legs at each end and a striped board across.
    for (const x of [-length / 2 + 0.12, length / 2 - 0.12]) {
      for (const lean of [-1, 1]) {
        const leg = rbox(0.06, 1.0, 0.035, '#c9a15a', [x, 0.48, lean * 0.16], 0.01);
        leg.rotation.x = lean * -0.33;
        g.add(leg);
      }
    }
    const stripes = Math.max(4, Math.round(length / 0.2));
    for (let i = 0; i < stripes; i++) g.add(rbox(length / stripes, 0.16, 0.03, i % 2 ? '#f4f4f0' : String(p.color ?? '#f2a900'), [-length / 2 + ((i + 0.5) / stripes) * length, 0.86, 0], 0.006));
    g.add(rbox(length, 0.08, 0.025, '#c9a15a', [0, 0.5, 0], 0.008));
    return g;
  },
);

registerAsset('street.trashBin', 'Lixeira de rua num poste, das de calçada (params: color)', (p) => {
  const color = String(p.color ?? '#e07b1f');
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.5, 14, 1, true), new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }));
  bin.position.set(0, 0.85, 0.24);
  // `inside`: where something thrown away goes.
  return group(place('inside', 0, 0.68, 0.24), post(0.03, 1.15, '#6b6f78', 0, 0, 0), bin, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 14), mat('#3d424c')).translateY(0.61).translateZ(0.24), rbox(0.05, 0.05, 0.24, '#6b6f78', [0, 0.95, 0.1], 0.015));
});

registerAsset(
  'street.busStop',
  'Ponto de ônibus coberto, aberto para +z (a rua): cobertura, fundo, banco com lugares para sentar (left, middle, right) e placa (params: width, color)',
  (p) => {
    const width = Number(p.width ?? 3.2);
    const color = String(p.color ?? '#2f6fc4');
    const g = group(
      rbox(width + 0.3, 0.07, 1.5, color, [0, 2.45, 0.35], 0.02),
      rbox(0.07, 2.45, 0.07, '#6b6f78', [-width / 2, 1.225, -0.3], 0.02), rbox(0.07, 2.45, 0.07, '#6b6f78', [width / 2, 1.225, -0.3], 0.02),
      // The bench and its back.
      rbox(width - 0.6, 0.06, 0.4, '#c9a15a', [0, 0.46, -0.05], 0.02),
      rbox(0.06, 0.46, 0.34, '#6b6f78', [-width / 2 + 0.5, 0.23, -0.05], 0.02), rbox(0.06, 0.46, 0.34, '#6b6f78', [width / 2 - 0.5, 0.23, -0.05], 0.02),
    );
    const back = rbox(width, 1.7, 0.03, '#9fd0ee', [0, 1.3, -0.3], 0.01);
    back.material = new THREE.MeshStandardMaterial({ color: '#9fd0ee', transparent: true, opacity: 0.35, roughness: 0.2 });
    back.userData.noShadow = true;
    g.add(back);
    // Whoever sits looks at the road, the way the stop faces.
    for (const [name, x] of [['left', -0.7], ['middle', 0], ['right', 0.7]] as const) g.add(place(name, x, 0.49, -0.05, 180));
    // The stop sign on its own post, at the kerb end.
    const sign = plate(0.42, 0.42, (c, w, h) => {
      c.fillStyle = color;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.fillRect(w * 0.2, h * 0.3, w * 0.6, h * 0.36);
      c.fillStyle = color;
      c.fillRect(w * 0.26, h * 0.36, w * 0.48, h * 0.14);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(w * 0.32, h * 0.7, 12, 0, Math.PI * 2);
      c.arc(w * 0.68, h * 0.7, 12, 0, Math.PI * 2);
      c.fill();
    }, color);
    sign.position.set(width / 2 + 0.5, 2.5, 0.72);
    g.add(post(0.03, 2.8, '#8d919b', width / 2 + 0.5, 0, 0.7), sign);
    return g;
  },
);

registerAsset(
  'street.crosswalk',
  'Faixa de pedestre pintada no chão: listras ao longo de x, atravessando z (params: width — largura da faixa —, length — a largura da rua que ela cruza)',
  (p) => {
    const width = Number(p.width ?? 3);
    const length = Number(p.length ?? 7);
    const g = group();
    const stripes = Math.round(width / 0.9);
    for (let i = 0; i < stripes; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.45, length).rotateX(-Math.PI / 2), mat('#eeeeea'));
      stripe.position.set(-width / 2 + ((i + 0.5) / stripes) * width, 0.012, 0);
      stripe.userData.noShadow = true;
      stripe.receiveShadow = true;
      g.add(stripe);
    }
    g.userData.passable = true;
    return g;
  },
);

registerAsset('street.manhole', 'Tampa de bueiro redonda no chão, ou boca de lobo ("grate") junto ao meio-fio (params: kind — "round" ou "grate")', (p) => {
  const g = String(p.kind ?? 'round') === 'grate'
    ? group(rbox(0.9, 0.02, 0.4, '#3d424c', [0, 0.012, 0], 0.006), ...[-0.3, -0.15, 0, 0.15, 0.3].map((x) => rbox(0.05, 0.022, 0.3, '#15171b', [x, 0.014, 0], 0.004)))
    : group(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 20), mat('#4a4f5c')).translateY(0.011), new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.022, 20), mat('#3d424c')).translateY(0.012));
  g.userData.passable = true;
  return g;
});
