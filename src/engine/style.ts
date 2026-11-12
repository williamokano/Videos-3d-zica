import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Style } from './bible';

/**
 * The look of a series, put on a scene after it is built: nothing that builds a scene knows about it.
 * "soft" is the scene as built. "cel" lights rounded things in a few flat bands and draws a dark outline
 * around them: the same mesh again, in black, a little larger and showing only its back faces.
 *
 * Plain boxes and planes (walls, floors, ceilings, door leaves) stay as built, like a painted background
 * behind cel characters: bands of lamp light draw large arcs across a flat wall, and sharp corners open the
 * outline. Also left without an outline: anything see-through (glass), anything that is its own light
 * (a phone screen, the sky), and whatever has `userData.noOutline` on it or on something above it (the small
 * parts of a face).
 */

/** Thickness of every outline in the scene, in meters. */
const thickness = { value: 0 };

const outlineMaterial = new THREE.MeshBasicMaterial({ color: '#17131a', side: THREE.BackSide });
outlineMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.outline = thickness;
  // Pushed out along the normal as seen by the camera, so the thickness does not depend on the size of the object.
  shader.vertexShader = `uniform float outline;\n${shader.vertexShader}`.replace(
    '#include <project_vertex>',
    [
      '#include <project_vertex>',
      // A body moved by bones has its normals moved with it.
      '#ifdef USE_SKINNING',
      '  mvPosition.xyz += normalize(transformedNormal) * outline;',
      '#else',
      '  mvPosition.xyz += normalize(normalMatrix * normal) * outline;',
      '#endif',
      '  gl_Position = projectionMatrix * mvPosition;',
    ].join('\n'),
  );
};

/** Light of the darkest band of the lit side. The brightest is full light. */
const SHADE = 0.3;

const ramps = new Map<number, THREE.DataTexture>();
/**
 * Light in `bands` flat steps. The ramp is read from a surface facing away from the light (left end) to one
 * facing it (right end): the half that faces away stays dark, as with smooth shading, and the bands are all
 * on the half that faces the light. Without that, every lamp would light the ceiling it hangs from.
 */
function ramp(bands: number): THREE.DataTexture {
  let texture = ramps.get(bands);
  if (!texture) {
    const lit = Array.from({ length: bands }, (_, i) => Math.round(255 * (bands === 1 ? 1 : SHADE + (1 - SHADE) * (i / (bands - 1)))));
    // Just past the edge of the light there is still a little of it, so the shade on a face does not start as a hard line.
    const away = lit.map((_, i) => (i === bands - 1 && bands > 1 ? Math.round(lit[0] / 2) : 0));
    texture = new THREE.DataTexture(Uint8Array.from([...away, ...lit]), bands * 2, 1, THREE.RedFormat);
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    ramps.set(bands, texture);
  }
  return texture;
}

const banded = new WeakMap<THREE.Material, Map<number, THREE.MeshToonMaterial>>();
/** The material lit in bands: same color, light of its own and transparency. One per material and number of bands. */
function toon(material: THREE.Material, bands: number): THREE.Material {
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;
  let byBands = banded.get(material);
  if (!byBands) banded.set(material, (byBands = new Map()));
  let made = byBands.get(bands);
  if (!made) {
    made = new THREE.MeshToonMaterial({
      color: material.color, map: material.map, vertexColors: material.vertexColors, gradientMap: ramp(bands),
      emissive: material.emissive, emissiveIntensity: material.emissiveIntensity, emissiveMap: material.emissiveMap,
      transparent: material.transparent, opacity: material.opacity, side: material.side,
    });
    byBands.set(bands, made);
  }
  return made;
}

/** Flat, sharp-cornered things: the shell of a location. */
function flat(mesh: THREE.Mesh): boolean {
  const geometry = mesh.geometry;
  if (geometry instanceof THREE.PlaneGeometry || geometry instanceof THREE.CircleGeometry) return true;
  return geometry instanceof THREE.BoxGeometry && !(geometry instanceof RoundedBoxGeometry);
}

/** Whether a mesh, with the material it was built with, gets an outline. */
function outlined(mesh: THREE.Mesh, material: THREE.Material | THREE.Material[]): boolean {
  if (Array.isArray(material) || !(material instanceof THREE.MeshStandardMaterial) || material.transparent || flat(mesh)) return false;
  for (let o: THREE.Object3D | null = mesh; o; o = o.parent) if (o.userData.noOutline) return false;
  return true;
}

/** Put a style on everything under `root`. Safe to call again: after a change of style, or when something new came in. */
export function applyStyle(root: THREE.Object3D, style: Required<Style>): void {
  const cel = style.look === 'cel';
  thickness.value = style.outline;
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && !o.userData.outline) meshes.push(o);
  });
  for (const mesh of meshes) {
    // What the mesh was built with is kept, to convert from and to go back to.
    const built: THREE.Material | THREE.Material[] = (mesh.userData.builtMaterial ??= mesh.material);
    mesh.material = !cel || flat(mesh) ? built : Array.isArray(built) ? built.map((m) => toon(m, style.bands)) : toon(built, style.bands);
    const has = mesh.children.find((child) => child.userData.outline);
    const wants = cel && style.outline > 0 && outlined(mesh, built);
    if (has && !wants) mesh.remove(has);
    if (!has && wants) {
      const shell = mesh instanceof THREE.SkinnedMesh ? new THREE.SkinnedMesh(mesh.geometry, outlineMaterial) : new THREE.Mesh(mesh.geometry, outlineMaterial);
      if (shell instanceof THREE.SkinnedMesh && mesh instanceof THREE.SkinnedMesh) shell.bind(mesh.skeleton, mesh.bindMatrix);
      shell.userData.outline = true;
      shell.frustumCulled = mesh.frustumCulled;
      mesh.add(shell);
    }
  }
}
