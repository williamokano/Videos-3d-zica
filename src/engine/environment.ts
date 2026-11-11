import * as THREE from 'three';
import type { Environment } from './bible';

/** Sky, sun, ambient light and fog. `apply` restyles everything from a resolved Environment. */
export class EnvironmentRig {
  readonly group = new THREE.Group();
  private readonly sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly sun = new THREE.DirectionalLight();
  private readonly ambient = new THREE.HemisphereLight();

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
    this.sun.position.set(18, 30, 12);
    this.sun.target.position.set(12, 0, 5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -35;
    cam.right = cam.top = 35;
    cam.far = 120;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.group.add(this.sky, this.sun, this.sun.target, this.ambient);
    scene.fog = new THREE.Fog('#ffffff');
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
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(env.skyHorizon);
    fog.near = env.fogNear;
    fog.far = env.fogFar;
  }
}
