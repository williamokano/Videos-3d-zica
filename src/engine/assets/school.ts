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

registerAsset('school.desk', 'Carteira escolar: mesa individual com cadeira', (p) => {
  const color = String(p.color ?? '#5b8fd9');
  return group(
    rbox(0.62, 0.04, 0.45, WOOD, [0, 0.72, -0.1]),
    rbox(0.56, 0.02, 0.38, METAL, [0, 0.6, -0.1], 0.01),
    post(0.018, 0.7, METAL, -0.27, 0, -0.28),
    post(0.018, 0.7, METAL, 0.27, 0, -0.28),
    post(0.018, 0.7, METAL, -0.27, 0, 0.08),
    post(0.018, 0.7, METAL, 0.27, 0, 0.08),
    chair(color, 0.42),
  );
});

registerAsset('school.teacherDesk', 'Mesa do professor com cadeira', () =>
  group(
    rbox(1.5, 0.05, 0.7, WOOD, [0, 0.76, 0]),
    rbox(0.45, 0.7, 0.62, WOOD_DARK, [-0.48, 0.37, 0], 0.03),
    rbox(0.45, 0.7, 0.62, WOOD_DARK, [0.48, 0.37, 0], 0.03),
    rbox(1.4, 0.45, 0.03, WOOD_DARK, [0, 0.5, -0.3], 0.01),
    chair('#444b5a', 0.6, 0.47, 0.46),
  ),
);

registerAsset('school.blackboard', 'Quadro-negro de parede (params: width)', (p) => {
  const w = Number(p.width ?? 3.6);
  return group(
    rbox(w + 0.12, 1.32, 0.04, WOOD_DARK, [0, 1.55, 0.02], 0.015),
    rbox(w, 1.2, 0.03, '#2f5d50', [0, 1.55, 0.035], 0.01),
    rbox(w, 0.03, 0.09, WOOD_DARK, [0, 0.93, 0.07], 0.01),
    rbox(0.1, 0.025, 0.03, '#f4f4f4', [w * 0.2, 0.955, 0.08], 0.008),
  );
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

registerAsset('school.bench', 'Banco de pátio', () =>
  group(
    rbox(1.6, 0.06, 0.42, WOOD, [0, 0.45, 0]),
    rbox(1.6, 0.3, 0.05, WOOD, [0, 0.78, 0.2]),
    rbox(0.08, 0.45, 0.4, '#5a5f6b', [-0.65, 0.225, 0]),
    rbox(0.08, 0.45, 0.4, '#5a5f6b', [0.65, 0.225, 0]),
    rbox(0.06, 0.4, 0.06, '#5a5f6b', [-0.65, 0.62, 0.2]),
    rbox(0.06, 0.4, 0.06, '#5a5f6b', [0.65, 0.62, 0.2]),
  ),
);
