import * as THREE from 'three';
import type { Hill, Terrain } from './types';

/**
 * Ground with relief: hills and hollows described as data, summed into one height at every point. The ground
 * mesh, the standing surface (and so walking, the camera and props) all read the same function, so a person
 * walking down a slope has their feet on what is drawn.
 */

const smooth = (u: number): number => u * u * u * (u * (u * 6 - 15) + 10);

/** How much of a hill's height is at a point: 1 on its flat top, falling smoothly to 0 at its edge. */
function hillWeight(hill: Hill, x: number, z: number): number {
  const [rx, rz] = typeof hill.radius === 'number' ? [hill.radius, hill.radius] : hill.radius;
  let dx = x - hill.at[0];
  let dz = z - hill.at[1];
  if (hill.rot) {
    const a = THREE.MathUtils.degToRad(hill.rot);
    [dx, dz] = [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)];
  }
  const d = Math.hypot(dx / rx, dz / rz);
  if (d >= 1) return 0;
  const top = Math.min(0.95, Math.max(0, hill.top ?? 0));
  return d <= top ? 1 : smooth((1 - d) / (1 - top));
}

/** Small bumps so a slope does not look like a sheet; zero on flat tops and valley floors marked `smooth`. */
function bumps(x: number, z: number): number {
  return Math.sin(x * 0.21 + Math.sin(z * 0.13) * 2) * Math.cos(z * 0.17 + Math.sin(x * 0.11) * 2);
}

/** Height of the ground at a point. Without terrain, 0. */
export function terrainHeight(terrain: Terrain | undefined, x: number, z: number): number {
  if (!terrain) return 0;
  let h = 0;
  let slope = 0;
  for (const hill of terrain.hills) {
    const w = hillWeight(hill, x, z);
    h += hill.height * w;
    // Bumps only on the sides of a hill, where nobody stands still.
    slope += Math.abs(hill.height) * w * (1 - w) * 4;
  }
  return h + (terrain.roughness ?? 0.15) * Math.min(1, slope / 6) * bumps(x, z);
}

/** The ground of a location with terrain, as one mesh of `size` × `size` meters, colored by height and slope. */
export function buildTerrainMesh(terrain: Terrain, size: number, color: string): THREE.Mesh {
  const step = terrain.resolution ?? 1;
  const n = Math.max(2, Math.round(size / step));
  const geometry = new THREE.PlaneGeometry(size, size, n, n);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(terrain, pos.getX(i), pos.getZ(i)) - 0.02);
  geometry.computeVertexNormals();

  const base = new THREE.Color(color);
  const slopeColor = new THREE.Color(terrain.slopeColor ?? color);
  const highColor = new THREE.Color(terrain.highColor ?? color);
  const lowColor = new THREE.Color(terrain.lowColor ?? color);
  const top = Math.max(1, ...terrain.hills.map((h) => h.height));
  const normals = geometry.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    c.copy(base);
    if (y > 0) c.lerp(highColor, Math.min(1, y / top));
    else if (y < 0) c.lerp(lowColor, Math.min(1, -y / 2));
    // Steep ground shows bare earth and rock.
    c.lerp(slopeColor, Math.min(1, Math.max(0, (1 - normals.getY(i)) * 5)));
    // Patches, so a large field is not one flat color.
    const patch = 0.92 + 0.08 * Math.sin(x * 0.37 + Math.cos(z * 0.29) * 3) * Math.cos(z * 0.41 - x * 0.05);
    c.multiplyScalar(patch);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}
