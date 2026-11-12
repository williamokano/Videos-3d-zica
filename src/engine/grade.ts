import * as THREE from 'three';
import { gradeIsNeutral, type Grade } from './bible';

/**
 * Color grading of a finished picture. After a view is drawn, `apply` takes what is on the canvas in a
 * rectangle and draws it back with the grade: tint, saturation, contrast and vignette. It works on the picture
 * as shown, so with a neutral grade nothing is done and the frame is exactly what it was.
 */
export class GradePass {
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly scene = new THREE.Scene();
  private readonly material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: { map: { value: null as THREE.Texture | null }, tint: { value: new THREE.Color() }, amount: { value: 0 }, saturation: { value: 1 }, contrast: { value: 1 }, vignette: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D map; uniform vec3 tint; uniform float amount; uniform float saturation; uniform float contrast; uniform float vignette;',
      'varying vec2 vUv;',
      'void main(){',
      '  vec3 c = texture2D(map, vUv).rgb;',
      '  float luma = dot(c, vec3(0.299, 0.587, 0.114));',
      // Toward the tint, keeping how light each thing is: whites take the color, blacks stay black.
      '  c = mix(c, tint * luma * 1.6, amount * 0.75) * mix(vec3(1.0), tint, amount * 0.5);',
      '  c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, saturation);',
      '  c = (c - 0.5) * contrast + 0.5;',
      '  vec2 d = vUv - 0.5;',
      '  c *= 1.0 - vignette * smoothstep(0.25, 0.85, length(d) * 1.25);',
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
  }

  /**
   * Grade what was just drawn in `rect` ([x, y, width, height] in CSS pixels, origin at the bottom left, as in
   * setViewport). The renderer's viewport and scissor must still be that rectangle.
   */
  apply(renderer: THREE.WebGLRenderer, rect: [number, number, number, number]): void {
    if (!this.grade || gradeIsNeutral(this.grade)) return;
    const ratio = renderer.getPixelRatio();
    const [x, y, w, h] = rect.map((v) => Math.floor(v * ratio));
    if (w < 1 || h < 1) return;
    if (!this.texture || this.texture.image.width !== w || this.texture.image.height !== h) {
      this.texture?.dispose();
      this.texture = new THREE.FramebufferTexture(w, h);
      this.texture.minFilter = this.texture.magFilter = THREE.NearestFilter;
      this.material.uniforms.map.value = this.texture;
    }
    renderer.copyFramebufferToTexture(this.texture, this.corner.set(x, y));
    renderer.render(this.scene, this.camera);
  }
}
