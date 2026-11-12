import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mapBones, retarget } from './retarget';
import type { CharacterDef, CharacterRig } from './types';

/** Wrap a loaded model as a character: scaled to the character's height, facing -z, driven by standard poses. */
export function rigFromModel(def: CharacterDef, model: THREE.Object3D): CharacterRig {
  const root = new THREE.Group();
  const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), def.facing === '-z' ? 0 : Math.PI);
  model.quaternion.premultiply(turn);
  root.add(model);
  root.updateWorldMatrix(true, true);

  const bones = mapBones(model, def.bones);
  const missing = (['hips', 'thighL', 'thighR', 'upperArmL', 'upperArmR'] as const).filter((j) => !bones[j]);
  if (missing.length) {
    throw new Error(`Personagem "${def.id}": não achei no GLB os ossos de ${missing.join(', ')}. Informe os nomes em "bones".`);
  }

  // Feet on the ground, height as asked.
  const box = new THREE.Box3().setFromObject(model);
  const scale = (def.height ?? 1.7) / (box.max.y - box.min.y);
  root.scale.setScalar(scale);
  model.position.y -= box.min.y;

  const meshes: THREE.Mesh[] = [];
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.castShadow = o.receiveShadow = true;
    // A skinned mesh moves away from the box it was loaded with.
    o.frustumCulled = false;
    if (o.morphTargetDictionary) meshes.push(o);
  });
  const morphs = Object.entries(def.morphs ?? {});
  const driven = retarget(root, bones, (def.height ?? 1.7) / 1.7);

  return {
    object: root,
    ...driven,
    eyeHeight: (def.height ?? 1.7) * 0.93,
    setFace(_face, raw) {
      for (const [channel, target] of morphs) {
        const value = channel === 'blink' ? raw.blink : channel === 'talk' ? raw.talk : channel.startsWith('vis.') ? (raw.visemes[channel.slice(4)] ?? 0) : (raw.expressions[channel] ?? 0);
        for (const mesh of meshes) {
          const index = mesh.morphTargetDictionary![target];
          if (index !== undefined) mesh.morphTargetInfluences![index] = value;
        }
      }
    },
  };
}

/** Load a character's GLB. Only runs in the browser. */
export async function loadGlbCharacter(def: CharacterDef, url: string): Promise<CharacterRig> {
  const gltf = await new GLTFLoader().loadAsync(url);
  return rigFromModel(def, gltf.scene);
}
