import * as THREE from 'three';
import type { CompiledActions } from './actions/catalog';

/**
 * Censorship on the finished picture: a black bar ("tarja") or a mosaic ("mosaico") over a place in the scene,
 * for what the story has to show happened without showing it (a blow, a wound). The place is a point in the world
 * with a size in meters; each frame it is projected through the shot's camera, so the cover follows the shot.
 */

export type CensorMode = 'tarja' | 'mosaico';

export interface Censor {
  /** The point covered, in world meters. */
  at: [number, number, number];
  /** How much is covered around it, in meters (the height of the cover). */
  size: number;
  mode: CensorMode;
}

export const CENSOR_MODES: CensorMode[] = ['tarja', 'mosaico'];

/** What is wrong with a censor, or undefined. */
export function censorProblem(c: Partial<Censor> | undefined): string | undefined {
  if (!c || !Array.isArray(c.at) || c.at.length !== 3 || c.at.some((v) => typeof v !== 'number')) return '"at" precisa ser um ponto [x, y, z].';
  if (typeof c.size !== 'number' || !(c.size > 0)) return '"size" precisa ser um tamanho em metros, maior que zero.';
  if (!CENSOR_MODES.includes(c.mode as CensorMode)) return `"mode" precisa ser ${CENSOR_MODES.map((m) => `"${m}"`).join(' ou ')}.`;
  return undefined;
}

/** The censors on screen at time t. */
export function censorsAt(compiled: Pick<CompiledActions, 'events' | 'clips'>, t: number): Censor[] {
  // Each censor clip made one censor event, in the same order.
  const clips = compiled.clips.filter((c) => c.action === 'censor');
  const events = compiled.events.filter((e) => e.type === 'censor');
  return clips.flatMap((c, i) => (c.t <= t && t < c.t + c.duration && events[i] ? [events[i].data as unknown as Censor] : []));
}

/** At most this many covers in one frame. */
const MAX = 4;

/**
 * Where a censor falls on the picture: center and half size, as fractions of the frame (0 to 1 from the bottom
 * left), or undefined when the point is behind the camera. The cover is `size` meters tall where the point is;
 * a bar is wider than tall, a mosaic square.
 */
export function censorRect(c: Censor, camera: THREE.PerspectiveCamera, aspect: number): { center: [number, number]; half: [number, number] } | undefined {
  const p = new THREE.Vector3(...c.at);
  const distance = p.distanceTo(camera.position);
  const ndc = p.clone().project(camera);
  if (ndc.z > 1 || distance < 1e-3) return undefined;
  const halfV = c.size / 2 / (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  const wide = c.mode === 'tarja' ? 1.7 : 1;
  return { center: [(ndc.x + 1) / 2, (ndc.y + 1) / 2], half: [(halfV * wide) / aspect, halfV] };
}

export class CensorPass {
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly scene = new THREE.Scene();
  private readonly material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      map: { value: null as THREE.Texture | null },
      size: { value: new THREE.Vector2(1, 1) },
      count: { value: 0 },
      centers: { value: Array.from({ length: MAX }, () => new THREE.Vector2()) },
      halves: { value: Array.from({ length: MAX }, () => new THREE.Vector2()) },
      modes: { value: Array.from({ length: MAX }, () => 0) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      `#define MAX ${MAX}`,
      'uniform sampler2D map; uniform vec2 size; uniform int count;',
      'uniform vec2 centers[MAX]; uniform vec2 halves[MAX]; uniform float modes[MAX];',
      'varying vec2 vUv;',
      'void main(){',
      '  vec3 c = texture2D(map, vUv).rgb;',
      '  for (int i = 0; i < MAX; i++) {',
      '    if (i >= count) break;',
      '    vec2 d = abs(vUv - centers[i]);',
      '    if (d.x > halves[i].x || d.y > halves[i].y) continue;',
      '    if (modes[i] < 0.5) { c = vec3(0.0); continue; }',
      // Mosaic: about seven squares across the height of the cover, each the color of its middle.
      '    float cell = max(6.0, halves[i].y * 2.0 * size.y / 7.0);',
      '    vec2 px = (floor(vUv * size / cell) + 0.5) * cell;',
      '    c = texture2D(map, px / size).rgb;',
      '  }',
      '  gl_FragColor = vec4(c, 1.0);',
      '}',
    ].join('\n'),
  });
  private texture?: THREE.FramebufferTexture;
  private readonly corner = new THREE.Vector2();

  constructor() {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  /**
   * Cover the censors in what was just drawn in `rect` ([x, y, width, height] in CSS pixels, origin at the bottom
   * left, as in setViewport), seen through `camera`. The renderer's viewport and scissor must still be that rectangle.
   */
  apply(renderer: THREE.WebGLRenderer, rect: [number, number, number, number], camera: THREE.Camera, censors: Censor[]): void {
    if (!censors.length || !(camera instanceof THREE.PerspectiveCamera)) return;
    const ratio = renderer.getPixelRatio();
    const [x, y, w, h] = rect.map((v) => Math.floor(v * ratio));
    if (w < 1 || h < 1) return;
    const u = this.material.uniforms;
    let n = 0;
    for (const c of censors) {
      const r = censorRect(c, camera, w / h);
      if (!r || n >= MAX) continue;
      (u.centers.value as THREE.Vector2[])[n].set(...r.center);
      (u.halves.value as THREE.Vector2[])[n].set(...r.half);
      (u.modes.value as number[])[n] = c.mode === 'mosaico' ? 1 : 0;
      n++;
    }
    if (!n) return;
    u.count.value = n;
    (u.size.value as THREE.Vector2).set(w, h);
    if (!this.texture || this.texture.image.width !== w || this.texture.image.height !== h) {
      this.texture?.dispose();
      this.texture = new THREE.FramebufferTexture(w, h);
      this.texture.minFilter = this.texture.magFilter = THREE.NearestFilter;
      u.map.value = this.texture;
    }
    renderer.copyFramebufferToTexture(this.texture, this.corner.set(x, y));
    renderer.render(this.scene, this.camera);
  }
}
