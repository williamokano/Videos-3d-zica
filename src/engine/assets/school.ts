import * as THREE from 'three';
import { group, post, rbox, registerAsset } from './registry';

/*
 * Orientation convention: furniture a person uses faces -z (the person looks toward -z).
 * Wall-mounted assets have their back at z = 0 and face +z.
 */

const WOOD = '#d9a066';
const WOOD_DARK = '#8f563b';
const METAL = '#8b9bb4';

function chair(color: string, z: number, seatH = 0.44, w = 0.4) {
  const h = w / 2 - 0.03;
  return group(
    rbox(w, 0.04, w, color, [0, seatH, z]),
    rbox(w, 0.3, 0.04, color, [0, seatH + 0.33, z + h]),
    post(0.015, seatH + 0.48, METAL, -h, 0, z + h),
    post(0.015, seatH + 0.48, METAL, h, 0, z + h),
    post(0.015, seatH, METAL, -h, 0, z - h),
    post(0.015, seatH, METAL, h, 0, z - h),
  );
}

/** Where a person sits on the chair of a desk: seat height and how far behind the desk's origin. */
export const DESK_SEAT = { height: 0.46, back: 0.46 };

registerAsset('school.desk', 'Carteira escolar brasileira: mesa individual de madeira com vão embaixo para cadernos, e cadeira (params: color da cadeira)', (p) => {
  const color = String(p.color ?? '#5b8fd9');
  const top = 0.74;
  return group(
    // Square wooden top and, under it, a box open toward the student.
    rbox(0.62, 0.035, 0.48, WOOD, [0, top, -0.1]),
    rbox(0.58, 0.015, 0.42, WOOD_DARK, [0, top - 0.15, -0.1], 0.005),
    rbox(0.015, 0.15, 0.42, WOOD_DARK, [-0.29, top - 0.08, -0.1], 0.005),
    rbox(0.015, 0.15, 0.42, WOOD_DARK, [0.29, top - 0.08, -0.1], 0.005),
    rbox(0.58, 0.15, 0.015, WOOD_DARK, [0, top - 0.08, -0.31], 0.005),
    rbox(0.3, 0.03, 0.22, '#3d6fb3', [-0.08, top - 0.125, -0.08], 0.008),
    post(0.018, top - 0.02, METAL, -0.28, 0, -0.31),
    post(0.018, top - 0.02, METAL, 0.28, 0, -0.31),
    post(0.018, top - 0.02, METAL, -0.28, 0, 0.11),
    post(0.018, top - 0.02, METAL, 0.28, 0, 0.11),
    chair(color, DESK_SEAT.back),
  );
});

registerAsset('school.teacherDesk', 'Mesa do professor: mesa de escritório simples de 1,20 × 0,70 com duas gavetas pequenas, e cadeira', () =>
  group(
    rbox(1.2, 0.04, 0.7, WOOD, [0, 0.76, 0]),
    rbox(0.04, 0.74, 0.64, WOOD_DARK, [-0.56, 0.37, 0], 0.01),
    rbox(0.04, 0.74, 0.64, WOOD_DARK, [0.56, 0.37, 0], 0.01),
    rbox(1.1, 0.4, 0.02, WOOD_DARK, [0, 0.52, -0.31], 0.008),
    // Two small drawers on the right of whoever sits.
    rbox(0.36, 0.3, 0.6, WOOD_DARK, [0.36, 0.59, 0.01], 0.01),
    rbox(0.32, 0.12, 0.02, WOOD, [0.36, 0.665, 0.32], 0.006),
    rbox(0.32, 0.12, 0.02, WOOD, [0.36, 0.515, 0.32], 0.006),
    rbox(0.1, 0.02, 0.02, METAL, [0.36, 0.665, 0.335], 0.006),
    rbox(0.1, 0.02, 0.02, METAL, [0.36, 0.515, 0.335], 0.006),
    chair('#444b5a', 0.62, 0.47, 0.46),
  ),
);

registerAsset('school.blackboard', 'Quadro-negro de parede, verde como nas escolas públicas, com giz (params: width)', (p) => {
  const w = Number(p.width ?? 3.6);
  const g = group(
    rbox(w + 0.12, 1.32, 0.04, WOOD_DARK, [0, 1.55, 0.02], 0.015),
    rbox(w, 1.2, 0.03, '#2f6f4f', [0, 1.55, 0.035], 0.01),
    rbox(w, 0.03, 0.09, WOOD_DARK, [0, 0.93, 0.07], 0.01),
    rbox(0.1, 0.025, 0.03, '#f4f4f4', [w * 0.2, 0.955, 0.08], 0.008),
    rbox(0.14, 0.05, 0.05, '#6b7078', [-w * 0.3, 0.965, 0.08], 0.01),
  );
  // Lines of chalk already on the board.
  const lines: [number, number, number][] = [[-0.36, 2.0, 0.34], [-0.3, 1.86, 0.28], [-0.38, 1.72, 0.2], [-0.33, 1.58, 0.3], [0.12, 1.95, 0.22], [0.1, 1.8, 0.16]];
  for (const [x, y, length] of lines) g.add(rbox(w * length, 0.022, 0.004, '#e9efe9', [w * x + (w * length) / 2, y, 0.052], 0.002));
  return g;
});

registerAsset('school.lockers', 'Fileira de armários de corredor (params: count)', (p) => {
  const n = Number(p.count ?? 6);
  const g = group();
  const colors = ['#d95763', '#5b8fd9'];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.42;
    g.add(
      rbox(0.4, 1.9, 0.45, colors[i % 2], [x, 0.95, 0.225], 0.02),
      rbox(0.04, 0.12, 0.02, '#e8e8e8', [x + 0.12, 1.05, 0.46], 0.008),
      rbox(0.24, 0.05, 0.01, '#3b3b46', [x, 1.6, 0.455], 0.004),
    );
  }
  return g;
});

registerAsset('school.bench', 'Banco de pátio, com três lugares para sentar (left, middle, right); quem senta fica de frente para -z', () => {
  const bench = group(
    rbox(1.6, 0.06, 0.42, WOOD, [0, 0.45, 0]),
    rbox(1.6, 0.3, 0.05, WOOD, [0, 0.78, 0.2]),
    rbox(0.08, 0.45, 0.4, '#5a5f6b', [-0.65, 0.225, 0]),
    rbox(0.08, 0.45, 0.4, '#5a5f6b', [0.65, 0.225, 0]),
    rbox(0.06, 0.4, 0.06, '#5a5f6b', [-0.65, 0.62, 0.2]),
    rbox(0.06, 0.4, 0.06, '#5a5f6b', [0.65, 0.62, 0.2]),
  );
  for (const [name, x] of [['left', -0.5], ['middle', 0], ['right', 0.5]] as const) {
    const anchor = new THREE.Object3D();
    anchor.name = `seat.${name}`;
    anchor.position.set(x, 0.48, 0);
    bench.add(anchor);
  }
  return bench;
});
