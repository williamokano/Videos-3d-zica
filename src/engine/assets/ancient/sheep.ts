import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../../core/rng';
import { legPose, odometer } from '../gait';
import { group, registerAsset } from '../registry';
import { v3 } from './kit';

// Sheep

/** A geometry in one color, kept as vertex colors so parts of different colors merge into one mesh. */
export function painted(g: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  const c = new THREE.Color(color);
  const colors = new Float32Array(n.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) [colors[i], colors[i + 1], colors[i + 2]] = [c.r, c.g, c.b];
  n.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return n;
}

/** An ellipsoid of radii r·(sx, sy, sz) centered at `at`. */
const ball = (r: number, [sx, sy, sz]: [number, number, number], at: [number, number, number]) => new THREE.SphereGeometry(r, 14, 10).scale(sx, sy, sz).translate(...at);

/** The same geometry pushed out along its normals: the shell of a cel outline. */
function inflated(g: THREE.BufferGeometry, by: number): THREE.BufferGeometry {
  const shell = g.clone();
  const [pos, nor] = [shell.attributes.position, shell.attributes.normal];
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + nor.getX(i) * by, pos.getY(i) + nor.getY(i) * by, pos.getZ(i) + nor.getZ(i) * by);
  return shell;
}

/*
 * A sheep in its own frame: facing -z, hooves on y = 0, 0.75 m to the top of the back. Four rigid parts that
 * move: the woolly body, the head on its neck (turning at the chest), the two ears and the four legs.
 */
const NECK = v3(0, 0.46, -0.3);
const EAR = v3(0.072, 0.19, -0.255);
/** Meters a sheep covers in one cycle of its walk. */
const SHEEP_CYCLE = 0.5;
const HIPS: [number, number, number][] = [[-0.12, 0.34, -0.22], [0.12, 0.34, -0.22], [-0.12, 0.34, 0.26], [0.12, 0.34, 0.26]];

interface SheepShape { body: THREE.BufferGeometry; head: THREE.BufferGeometry; ear: THREE.BufferGeometry; leg: THREE.BufferGeometry }
const sheepShapes = new Map<string, SheepShape>();

/** The geometries of a sheep of these colors, built once and shared by every sheep and flock. */
function sheepShape(wool: string, face: string): SheepShape {
  const key = `${wool}|${face}`;
  let shape = sheepShapes.get(key);
  if (shape) return shape;
  const lumps = [ball(1, [0.27, 0.2, 0.38], [0, 0.5, 0.04]), ball(0.16, [1, 1, 0.9], [0, 0.5, -0.3]), ball(0.07, [1, 1.2, 1], [0, 0.56, 0.46])];
  for (const [z, r] of [[-0.24, 0.15], [-0.03, 0.16], [0.17, 0.16], [0.34, 0.13]]) lumps.push(ball(r, [1, 0.85, 1], [0, 0.6, z]));
  for (const s of [-1, 1]) for (const z of [-0.2, 0.06, 0.3]) lumps.push(ball(0.14, [0.9, 1, 1], [s * 0.16, 0.49, z]));
  const head = [
    painted(ball(0.13, [1, 1.05, 1.25], [0, 0.07, -0.08]), wool),
    painted(ball(1, [0.085, 0.095, 0.16], [0, 0, 0]).rotateX(-0.6).translate(0, 0.12, -0.34), face),
    painted(ball(0.075, [1.1, 0.8, 1.1], [0, 0.215, -0.27]), wool),
  ];
  for (const s of [-1, 1]) head.push(painted(ball(0.021, [1, 1, 1], [s * 0.07, 0.165, -0.37]), '#f4efe4'), painted(ball(0.012, [1, 1, 1], [s * 0.084, 0.166, -0.384]), '#141010'));
  shape = {
    body: mergeGeometries(lumps.map((g) => painted(g, wool))),
    head: mergeGeometries(head),
    // Pointing out along +x from where it joins the head.
    ear: painted(ball(1, [0.065, 0.016, 0.034], [0.055, 0, 0]), face),
    // Hanging from the hip, its tip on the ground.
    leg: painted(new THREE.CapsuleGeometry(0.034, 0.272, 4, 8).translate(0, -0.17, 0), face),
  };
  sheepShapes.set(key, shape);
  return shape;
}

/** What makes one sheep unlike the next: when it grazes, how big it is, the shade of its wool. */
interface SheepLife { phase: number; period: number; size: number; tint: THREE.Color }
function sheepLife(rand: () => number): SheepLife {
  const k = 0.9 + rand() * 0.14;
  return { phase: rand() * 40, period: 9 + rand() * 6, size: 0.9 + rand() * 0.18, tint: new THREE.Color(k, k * (0.97 + rand() * 0.03), k * (0.9 + rand() * 0.08)) };
}

const smooth01 = (u: number) => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

const [_q, _e, _p, _one, _part] = [new THREE.Quaternion(), new THREE.Euler(), new THREE.Vector3(), new THREE.Vector3(1, 1, 1), new THREE.Matrix4()];
/** base × a part placed at `at`, turned by the euler angles. */
const partAt = (out: THREE.Matrix4, base: THREE.Matrix4, at: THREE.Vector3, x: number, y: number, z: number, order: THREE.EulerOrder = 'XYZ') =>
  out.multiplyMatrices(base, _part.compose(at, _q.setFromEuler(_e.set(x, y, z, order)), _one));

/**
 * Where the parts of a sheep are at time t, written into `out` (body, head, right ear, left ear, four legs),
 * from `base` (where the sheep stands, which way it faces, its size). It grazes by itself: head down to the
 * grass nibbling, then up looking around; the ears flick now and then. `walk` (0 to 1) swings the legs, at
 * `stride` (radians of the step cycle).
 */
function poseSheep(out: THREE.Matrix4[], base: THREE.Matrix4, life: SheepLife, t: number, walk = 0, stride = 0): void {
  const { phase } = life;
  const u = (((t + phase) / life.period) % 1 + 1) % 1;
  const down = smooth01(u / 0.08) * (1 - smooth01((u - 0.62) / 0.1));
  const nibble = down * 0.06 * (0.5 + 0.5 * Math.sin(t * 8.5 + phase));
  const pitch = 0.12 * (1 - down) - 1.2 * down - nibble;
  const yaw = (1 - down) * 0.5 * Math.sin(t * 0.55 + phase * 1.7) + down * 0.12 * Math.sin(t * 0.8 + phase);
  out[0].copy(base);
  partAt(out[1], base, NECK, pitch, yaw, 0, 'YXZ');
  for (const [i, s] of [[2, 1], [3, -1]] as const) {
    const flick = Math.max(0, Math.sin(t * (1.1 + i * 0.17) + phase * (i + 2))) ** 14;
    // The left ear is the right one turned round: the same geometry, never mirrored.
    partAt(out[i], out[1], _p.set(s * EAR.x, EAR.y, EAR.z), 0, s > 0 ? -0.25 : Math.PI + 0.25, -0.35 + 0.55 * flick);
  }
  // The four-beat walk (gait.ts); `stride` is in radians of the cycle.
  HIPS.forEach(([x, y, z], i) => {
    const pose = legPose(stride / (Math.PI * 2), i, y, SHEEP_CYCLE);
    partAt(out[4 + i], base, _p.set(x, y + walk * pose.lift * 0.5, z), walk * pose.angle, 0, 0);
  });
}

const sheepMaterials = new Map<string, THREE.MeshStandardMaterial>();
/** The material of a sheep: its colors are in the geometry, `tint` shades them. */
function sheepMaterial(tint: string): THREE.MeshStandardMaterial {
  let m = sheepMaterials.get(tint);
  if (!m) sheepMaterials.set(tint, (m = new THREE.MeshStandardMaterial({ color: tint, vertexColors: true, roughness: 0.95, metalness: 0 })));
  return m;
}

const SHEEP_WOOL = '#eee6d3';
const SHEEP_FACE = '#3d322c';
/** Thickness of the outline the flock draws itself in cel (the style's own shells are not instanced). */
const FLOCK_OUTLINE = 0.01;
const outlineShell = new THREE.MeshBasicMaterial({ color: '#17131a', side: THREE.BackSide });

registerAsset(
  'ancient.sheep',
  'Ovelha de lã fofa, cara e pernas escuras, de frente para -z, 75 cm até o lombo. Pasta sozinha com o tempo: baixa a cabeça até o capim e mordisca, levanta e olha em volta, mexe as orelhas; cada `seed` pasta num ritmo seu e tem tamanho e tom de lã um pouco diferentes (params: seed, color — da lã —, face — da cara e das pernas)',
  (p) => {
    const life = sheepLife(rng(Number(p.seed ?? 1)));
    const shape = sheepShape(String(p.color ?? SHEEP_WOOL), String(p.face ?? SHEEP_FACE));
    const material = sheepMaterial(`#${life.tint.getHexString()}`);
    const parts = [shape.body, shape.head, shape.ear, shape.ear, ...HIPS.map(() => shape.leg)].map((geometry) => {
      const m = new THREE.Mesh(geometry, material);
      m.matrixAutoUpdate = false;
      return m;
    });
    const g = group(...parts);
    const base = new THREE.Matrix4().makeScale(life.size, life.size, life.size);
    const out = parts.map(() => new THREE.Matrix4());
    g.userData.animate = (t: number) => {
      poseSheep(out, base, life, t);
      parts.forEach((m, i) => {
        m.matrix.copy(out[i]);
        m.matrixWorldNeedsUpdate = true;
      });
    };
    g.userData.animate(0);
    return g;
  },
);

registerAsset(
  'ancient.flock',
  'Rebanho de ovelhas espalhado num retângulo (width × depth, centrado na origem). Cada ovelha pasta no seu ritmo e vai andando devagar pelo pasto, para e anda de novo, virando para onde vai e mexendo as pernas; nunca sai da área nem esbarra na outra. Pisa-se no meio delas. Barato: 30 ovelhas são quatro malhas (params: count — 14 —, width — 12 —, depth — 8 —, color — da lã —, face, seed)',
  (p) => {
    const count = Math.max(1, Math.round(Number(p.count ?? 14)));
    const width = Number(p.width ?? 12);
    const depth = Number(p.depth ?? 8);
    const rand = rng(Number(p.seed ?? 1));
    const shape = sheepShape(String(p.color ?? SHEEP_WOOL), String(p.face ?? SHEEP_FACE));
    const material = sheepMaterial('#ffffff');
    const g = group();
    const parts = ([[shape.body, 1], [shape.head, 1], [shape.ear, 2], [shape.leg, 4]] as const).map(([geometry, each]) => {
      const m = new THREE.InstancedMesh(geometry, material, count * each);
      // Instances move: the box of the whole mesh is not kept.
      m.frustumCulled = false;
      m.userData.noOutline = true;
      const shell = new THREE.InstancedMesh(inflated(geometry, FLOCK_OUTLINE), outlineShell, count * each);
      shell.instanceMatrix = m.instanceMatrix;
      shell.frustumCulled = false;
      shell.visible = false;
      shell.userData.noShadow = shell.userData.noOutline = true;
      g.add(m, shell);
      return { mesh: m, shell, each };
    });
    // Each sheep wanders in a cell of its own, so two never meet: a grid over the area, cells taken at random.
    const cols = Math.max(1, Math.min(count, Math.round(Math.sqrt((count * width) / depth))));
    const rows = Math.ceil(count / cols);
    const cells = Array.from({ length: cols * rows }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const [cw, cd] = [width / cols, depth / rows];
    const flock = Array.from({ length: count }, (_, i) => {
      const [c, r] = [cells[i] % cols, Math.floor(cells[i] / cols)];
      // How far it may stray from the middle of its cell, keeping the whole body inside.
      const [ax, az] = [Math.max(0, cw / 2 - 0.65), Math.max(0, cd / 2 - 0.65)];
      const [f1, f2] = [0.6 + rand() * 0.5, 0.6 + rand() * 0.5];
      const reach = Math.hypot(ax * f1, az * f2);
      return {
        life: sheepLife(rand),
        home: [-width / 2 + (c + 0.5) * cw, -depth / 2 + (r + 0.5) * cd],
        ax, az, f1, f2, reach,
        a1: rand() * Math.PI * 2,
        a2: rand() * Math.PI * 2,
        // A walk cycle of `cycle` seconds: it stops, sets off, walks and slows down again. `k` keeps the top speed near 0.25 m/s.
        cycle: 14 + rand() * 10,
        psi: rand() * Math.PI * 2,
        k: reach > 0.01 ? 0.25 / (4 * reach) : 0,
        heading: rand() * Math.PI * 2,
      };
    }).map((s) => ({
      ...s,
      // Meters walked by the time it is `along` its path (the path's own measure, which only grows with time).
      walked: odometer((along) => [s.ax * Math.sin(along * s.f1 + s.a1), s.az * Math.sin(along * s.f2 + s.a2)]),
    }));
    const tint = new THREE.Color();
    flock.forEach((s, i) => {
      for (const { mesh, each } of parts) for (let j = 0; j < each; j++) mesh.setColorAt(i * each + j, tint.copy(s.life.tint));
    });
    const out = Array.from({ length: 8 }, () => new THREE.Matrix4());
    const base = new THREE.Matrix4();
    const [at, scale, turn] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Quaternion()];
    const up = v3(0, 1, 0);
    g.userData.followsGround = true;
    g.userData.animate = (t: number) => {
      flock.forEach((s, i) => {
        // How far along its path: a pure function of t, so any frame can be drawn on its own.
        const x = (2 * Math.PI * t) / s.cycle + s.psi;
        const along = ((s.k * s.cycle) / (2 * Math.PI)) * (1.5 * x - 2 * Math.sin(x) + 0.25 * Math.sin(2 * x));
        const rate = s.k * (1 - Math.cos(x)) ** 2;
        const [c1, c2] = [Math.cos(along * s.f1 + s.a1), Math.cos(along * s.f2 + s.a2)];
        const [dx, dz] = [s.ax * s.f1 * c1, s.az * s.f2 * c2];
        const speed = Math.hypot(dx, dz) * rate;
        const walk = Math.min(1, speed / 0.12);
        // Cycles of the walk from the meters really walked, so a planted hoof stays put (gait.ts).
        const stride = (s.walked(along) / SHEEP_CYCLE) * Math.PI * 2;
        const heading = s.reach > 0.01 ? Math.atan2(-dx, -dz) : s.heading;
        at.set(s.home[0] + s.ax * Math.sin(along * s.f1 + s.a1), 0.012 * walk * Math.abs(Math.sin(stride)), s.home[1] + s.az * Math.sin(along * s.f2 + s.a2));
        // On a hillside, each sheep stands on the ground under it (the location gives the height; see build.ts).
        at.y += (g.userData.ground as ((x: number, z: number) => number) | undefined)?.(at.x, at.z) ?? 0;
        base.compose(at, turn.setFromAxisAngle(up, heading), scale.setScalar(s.life.size));
        poseSheep(out, base, s.life, t, walk, stride);
        parts[0].mesh.setMatrixAt(i, out[0]);
        parts[1].mesh.setMatrixAt(i, out[1]);
        for (let j = 0; j < 2; j++) parts[2].mesh.setMatrixAt(i * 2 + j, out[2 + j]);
        for (let j = 0; j < 4; j++) parts[3].mesh.setMatrixAt(i * 4 + j, out[4 + j]);
      });
      for (const { mesh, shell } of parts) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.boundingBox = mesh.boundingSphere = null;
        // The outline shows only when the style has turned the sheep to cel.
        shell.visible = mesh.material instanceof THREE.MeshToonMaterial;
      }
    };
    g.userData.animate(0);
    g.userData.passable = true;
    return g;
  },
);
