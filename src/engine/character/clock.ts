import * as THREE from 'three';

/**
 * The clock in the skin of the forearm (series hora-contada): how much time a person has left, in green numbers
 * under the skin of the inside of the forearm, as `AAAA:DDD:HH:MM:SS` (years, days, hours, minutes, seconds).
 *
 * The balance is a property of the character that really counts: two channels, `clock` and `clock.rate`, give
 * the balance at any time t as `clock - rate * t`. A running clock (rate 1) goes down by itself, second by
 * second, with nothing written; one that is stopped (rate 0, under 25) stays where it is. Actions only change it
 * when something happens: a payment, a transfer, a jump in time, the start at 25 (see actions/clock.ts).
 */

export const MINUTE = 60;
export const HOUR = 3600;
export const DAY = 86400;
/** A year of the clock: 365 days. */
export const YEAR = 365 * DAY;

/** What a character carries on the arm. */
export interface ClockSpec {
  /** Balance when the episode starts: seconds, or "AAAA:DDD:HH:MM:SS" (fewer fields count from the right: "02:17:40" is hours). */
  left: number | string;
  /** Counting down (25 or older). Default: true. Under 25 the clock shows one year and does not move. */
  running?: boolean;
  /** The arm it is on (default the left). */
  arm?: 'L' | 'R';
}

const UNITS = [YEAR, DAY, HOUR, MINUTE, 1];

/** Seconds from a balance written as on the arm ("0000:002:02:17:40", "02:17:40", "1:00:00:00:00") or already in seconds. */
export function parseClock(value: number | string): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) throw new Error(`Relógio: o saldo precisa ser zero ou mais segundos, e veio ${value}.`);
    return value;
  }
  const negative = value.trim().startsWith('-');
  const parts = value.trim().replace(/^[-+]/, '').split(':');
  if (parts.length > UNITS.length || parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error(`Relógio: "${value}" não é um saldo. Escreva AAAA:DDD:HH:MM:SS (anos, dias, horas, minutos, segundos), ou só o final, como "02:17:40".`);
  }
  const units = UNITS.slice(UNITS.length - parts.length);
  const seconds = parts.reduce((sum, p, i) => sum + Number(p) * units[i], 0);
  return negative ? -seconds : seconds;
}

/** An amount to add or take away: seconds (negative takes away) or a balance with "-" in front ("-01:10:00"). */
export function parseAmount(value: number | string): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Relógio: a quantia precisa ser um número de segundos, e veio ${value}.`);
    return value;
  }
  return parseClock(value);
}

/** A balance as the arm shows it: "0001:000:00:00:00". Whole seconds, rounded down, never below zero. */
export function formatClock(seconds: number): string {
  let rest = Math.max(0, Math.floor(seconds + 1e-6));
  const fields = UNITS.map((unit) => {
    const n = Math.floor(rest / unit);
    rest -= n * unit;
    return n;
  });
  const widths = [4, 3, 2, 2, 2];
  return fields.map((n, i) => String(Math.min(n, 10 ** widths[i] - 1)).padStart(widths[i], '0')).join(':');
}

/** The balance at time t from the two channels. */
export function clockAt(clock: number, rate: number, t: number): number {
  return Math.max(0, clock - rate * t);
}

/** How the numbers glow: steady with time to spare, brighter under a day, blinking in the last minute. */
export function clockGlow(seconds: number, running: boolean, t: number): number {
  if (!running) return 0.85;
  if (seconds <= 0) return 0.25;
  if (seconds < MINUTE) return 0.55 + 0.45 * (Math.sin(t * Math.PI * 4) > 0 ? 1 : 0);
  if (seconds < DAY) return 1;
  return 0.85;
}

const CANVAS_W = 1024;
const GREEN = '#46ff6e';

/**
 * The picture on the skin: a band around the inside of the forearm, between the elbow and the wrist. It lies in
 * the forearm's frame as the body builds it: the arm along x (toward -x for the left one), palm down (-y) in
 * the T-pose, thumb to the front (-z). The numbers run from the elbow to the wrist, their tops toward the thumb.
 * `roll` turns it round the arm with the wrist (the forearm turns as the hand does).
 */
export function buildArmClock(side: 'L' | 'R', radius: number, from: number, to: number): { object: THREE.Object3D; show(seconds: number, running: boolean, t: number, roll: number): void } {
  const x = side === 'L' ? -1 : 1;
  // A long thin band, one line of numbers along the arm: about 2.5 cm across the skin.
  const span = 0.55;
  // The picture has the band's own proportions, so the numbers are not stretched.
  const CANVAS_H = Math.round((CANVAS_W * radius * span) / (to - from));
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const along = 8;
  const around = 12;
  for (let i = 0; i <= along; i++) {
    for (let j = 0; j <= around; j++) {
      const u = i / along;
      const v = j / around;
      // Around the arm from the little finger's side (v 0) to the thumb's (v 1), across the palm side.
      const phi = (v - 0.5) * span;
      // The numbers run the other way along x on the right arm: turn v the other way round too, so they read
      // from outside and are not mirrored (their tops then point to the back of the arm).
      const a = side === 'L' ? phi : -phi;
      positions.push(x * (from + (to - from) * u), -radius * Math.cos(a), -radius * Math.sin(a));
      uvs.push(u, v);
    }
  }
  for (let i = 0; i < along; i++) {
    for (let j = 0; j < around; j++) {
      const a = i * (around + 1) + j;
      const b = a + around + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();

  const holder = new THREE.Group();
  holder.name = 'armClock';
  // Without a browser (tests) there is no picture.
  const canvas = typeof document === 'undefined' ? undefined : document.createElement('canvas');
  let texture: THREE.CanvasTexture | undefined;
  let material: THREE.MeshBasicMaterial | undefined;
  if (canvas) {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.noShadow = true;
    mesh.renderOrder = 2;
    holder.add(mesh);
  }

  let drawn = '';
  return {
    object: holder,
    show(seconds, running, t, roll) {
      holder.rotation.x = roll;
      if (!canvas || !texture || !material) return;
      const text = formatClock(seconds);
      const glow = clockGlow(seconds, running, t);
      const key = `${text}|${glow.toFixed(2)}`;
      if (key === drawn) return;
      drawn = key;
      const g = canvas.getContext('2d')!;
      g.clearRect(0, 0, CANVAS_W, CANVAS_H);
      g.font = `700 ${Math.round(CANVAS_H * 0.66)}px "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      // A soft halo under the skin, then the sharp numbers.
      g.fillStyle = GREEN;
      g.shadowColor = GREEN;
      g.globalAlpha = glow;
      g.shadowBlur = 28;
      g.fillText(text, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.96);
      g.shadowBlur = 6;
      g.fillStyle = '#c9ffd4';
      g.globalAlpha = glow * 0.55;
      g.fillText(text, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.96);
      g.globalAlpha = 1;
      texture.needsUpdate = true;
    },
  };
}
