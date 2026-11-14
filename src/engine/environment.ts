import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Environment } from './bible';

/** Where the sun is from what it lights. */
const SUN_OFFSET = [6, 30, 7] as const;

/** Sky, sun, ambient light and fog. `apply` restyles everything from a resolved Environment. */
export class EnvironmentRig {
  readonly group = new THREE.Group();
  private readonly sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly sun = new THREE.DirectionalLight();
  private readonly ambient = new THREE.HemisphereLight();
  /** Puffy clouds high up in a ring round the place, shown up to how much of the sky has clouds. */
  private readonly clouds = new THREE.Group();
  private readonly cloudMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, transparent: true, opacity: 0.95, fog: false, depthWrite: false });

  constructor(private readonly scene: THREE.Scene) {
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(450, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
        vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 horizon; varying float h;\n' +
          'void main(){ gl_FragColor = vec4(mix(horizon, top, pow(clamp(h,0.0,1.0),0.55)),1.0);\n' +
          '#include <colorspace_fragment>\n}',
      }),
    );
    this.sun.position.set(12 + SUN_OFFSET[0], SUN_OFFSET[1], 5 + SUN_OFFSET[2]);
    this.sun.target.position.set(12, 0, 5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -35;
    cam.right = cam.top = 35;
    cam.far = 120;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.buildClouds();
    this.group.add(this.sky, this.sun, this.sun.target, this.ambient, this.clouds);
    scene.fog = new THREE.Fog('#ffffff');
  }

  /**
   * Keep the sun's shadows around what a camera sees: they cover about 70 m, so in a large place (a valley) a
   * shot far from the middle would otherwise have none. The sun keeps its direction.
   */
  aim(camera: THREE.Camera): void {
    const ahead = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(18).add(camera.getWorldPosition(new THREE.Vector3()));
    // Snapped to a coarse grid, so the shadows do not shimmer as the camera moves.
    const [x, y, z] = [ahead.x, ahead.y, ahead.z].map((v) => Math.round(v / 4) * 4);
    this.sun.target.position.set(x, y, z);
    this.sun.position.set(x + SUN_OFFSET[0], y + SUN_OFFSET[1], z + SUN_OFFSET[2]);
    this.sun.target.updateMatrixWorld();
  }

  /**
   * Seventy clouds, each a few flattened puffs merged in one mesh, spread round the sky, low enough that
   * they show behind people in a vertical picture (5° to 30° up). They are not lit: their color follows the sky (white by day,
   * pink at dawn, dark blue at night), which is cheaper and reads well in the cel style.
   */
  private buildClouds(): void {
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const puff = new THREE.SphereGeometry(1, 12, 8);
    for (let i = 0; i < 70; i++) {
      const parts: THREE.BufferGeometry[] = [];
      const puffs = 4 + Math.floor(random() * 4);
      for (let k = 0; k < puffs; k++) {
        const g = puff.clone();
        const r = 9 + random() * 9;
        g.scale(r * (1.2 + random() * 0.6), r * (0.45 + random() * 0.2), r);
        g.translate((k - puffs / 2) * 11 + random() * 6, random() * 4, random() * 8 - 4);
        parts.push(g);
      }
      const merged = mergeGeometries(parts);
      // Shaded underneath, so a white cloud still reads against a pale sky near the horizon.
      merged.computeBoundingBox();
      const { min, max } = merged.boundingBox!;
      const position = merged.attributes.position;
      const shade = new Float32Array(position.count * 3);
      for (let v = 0; v < position.count; v++) {
        const k = 0.72 + 0.28 * ((position.getY(v) - min.y) / (max.y - min.y || 1));
        shade.set([k, k, k * 1.02], v * 3);
      }
      merged.setAttribute('color', new THREE.BufferAttribute(shade, 3));
      const cloud = new THREE.Mesh(merged, this.cloudMaterial);
      const around = random() * Math.PI * 2;
      const up = (5 + random() * 25) * (Math.PI / 180);
      const far = 330;
      cloud.position.set(Math.sin(around) * Math.cos(up) * far, Math.sin(up) * far, Math.cos(around) * Math.cos(up) * far);
      cloud.lookAt(0, cloud.position.y, 0);
      cloud.userData.noOutline = true;
      cloud.userData.order = random();
      // After the sky, which is drawn without depth and would paint over them.
      cloud.renderOrder = 1;
      this.clouds.add(cloud);
    }
  }

  apply(env: Environment): void {
    this.sky.material.uniforms.top.value.set(env.skyTop);
    this.sky.material.uniforms.horizon.value.set(env.skyHorizon);
    this.sun.color.set(env.sunColor);
    this.sun.intensity = env.sunIntensity;
    // The sky tints the ambient light without washing out object colors.
    this.ambient.color.set('#ffffff').lerp(new THREE.Color(env.skyHorizon), 0.3);
    this.ambient.groundColor.set('#8a7f72');
    this.ambient.intensity = env.ambientIntensity;
    // Clouds: as many as the sky has, in a color between white and the sky, darker when the sun is weak.
    const cover = Math.max(0, Math.min(1, env.clouds ?? 0));
    for (const cloud of this.clouds.children) cloud.visible = (cloud.userData.order as number) < cover;
    const light = Math.min(1, env.sunIntensity / 2.6);
    this.cloudMaterial.color.set(env.skyHorizon).lerp(new THREE.Color('#ffffff'), 0.75 * light).multiplyScalar(0.55 + 0.45 * light);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(env.skyHorizon);
    fog.near = env.fogNear;
    fog.far = env.fogFar;
  }
}
