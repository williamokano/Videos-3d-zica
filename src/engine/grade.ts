import * as THREE from 'three';
import { gradeIsNeutral, type Grade } from './bible';

/**
 * What is done to a finished picture. After a view is drawn, `apply` takes what is on the canvas in a
 * rectangle and draws it back with the grade (tint, saturation, contrast, vignette, grain) and through a
 * wide-angle lens. It works on the picture as shown, so with a neutral grade and no lens nothing is done and
 * the frame is exactly what it was.
 */
export class GradePass {
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly scene = new THREE.Scene();
  private readonly material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: { map: { value: null as THREE.Texture | null }, tint: { value: new THREE.Color() }, amount: { value: 0 }, saturation: { value: 1 }, contrast: { value: 1 }, vignette: { value: 0 }, grain: { value: 0 }, lens: { value: 0 }, time: { value: 0 }, corner: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D map; uniform vec3 tint; uniform float amount; uniform float saturation; uniform float contrast; uniform float vignette;',
      'uniform float grain; uniform float lens; uniform float time; uniform vec2 corner;',
      'varying vec2 vUv;',
      'void main(){',
      '  vec2 d = vUv - 0.5;',
      // Through the lens, the middle of the picture is seen larger and the corners stay where they are.
      // `corner` scales the frame so that a corner is at distance 1 from the center, whatever its shape.
      '  float r2 = dot(d * corner, d * corner);',
      '  vec3 c = texture2D(map, 0.5 + d * (1.0 - lens * 0.42 * (1.0 - r2))).rgb;',
      '  float luma = dot(c, vec3(0.299, 0.587, 0.114));',
      // Toward the tint, keeping how light each thing is: whites take the color, blacks stay black.
      '  c = mix(c, tint * luma * 1.6, amount * 0.75) * mix(vec3(1.0), tint, amount * 0.5);',
      '  c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, saturation);',
      '  c = (c - 0.5) * contrast + 0.5;',
      '  c *= 1.0 - vignette * smoothstep(0.25, 0.85, length(d) * 1.25);',
      // Grain: a different speckle on every frame, the same for the same frame.
      '  float speck = fract(sin(dot(gl_FragCoord.xy + fract(time * 7.13) * 311.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;',
      '  c += speck * grain * 0.16;',
      '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
      '}',
    ].join('\n'),
  });
  private texture?: THREE.FramebufferTexture;
  private grade?: Grade;
  private readonly corner = new THREE.Vector2();

  constructor() {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  set(grade: Grade): void {
    this.grade = grade;
    const u = this.material.uniforms;
    (u.tint.value as THREE.Color).set(grade.tint).convertLinearToSRGB();
    u.amount.value = grade.amount;
    u.saturation.value = grade.saturation;
    u.contrast.value = grade.contrast;
    u.vignette.value = grade.vignette;
    u.grain.value = grade.grain;
  }

  /**
   * Grade what was just drawn in `rect` ([x, y, width, height] in CSS pixels, origin at the bottom left, as in
   * setViewport). The renderer's viewport and scissor must still be that rectangle. `lens` is the wide-angle
   * distortion of the shot (0 to 1) and `time` the instant of the frame, which picks its grain.
   */
  apply(renderer: THREE.WebGLRenderer, rect: [number, number, number, number], lens = 0, time = 0): void {
    if ((!this.grade || gradeIsNeutral(this.grade)) && lens <= 0.001) return;
    this.material.uniforms.lens.value = Math.max(0, Math.min(1, lens));
    this.material.uniforms.time.value = time;
    const ratio = renderer.getPixelRatio();
    const [x, y, w, h] = rect.map((v) => Math.floor(v * ratio));
    if (w < 1 || h < 1) return;
    if (!this.texture || this.texture.image.width !== w || this.texture.image.height !== h) {
      this.texture?.dispose();
      this.texture = new THREE.FramebufferTexture(w, h);
      // The lens reads between pixels.
      this.texture.minFilter = this.texture.magFilter = THREE.LinearFilter;
      (this.material.uniforms.corner.value as THREE.Vector2).set(w, h).multiplyScalar(2 / Math.hypot(w, h));
      this.material.uniforms.map.value = this.texture;
    }
    renderer.copyFramebufferToTexture(this.texture, this.corner.set(x, y));
    renderer.render(this.scene, this.camera);
  }
}
