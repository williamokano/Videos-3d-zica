import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { resolveStyle } from './bible';
import { buildBody } from './character/body';
import { HAIR_COLORS, extraLook } from './character/extras';
import { NEUTRAL_FACE } from './character/motion';
import { HAIR_STYLES, type CharacterDef } from './character/types';
import { applyStyle } from './style';

const ana: CharacterDef = { id: 'ana', name: 'Ana' };

const meshes = (def: CharacterDef): THREE.Mesh[] => {
  const rig = buildBody(def);
  rig.setFace(NEUTRAL_FACE, { blink: 0, talk: 0, expressions: {}, visemes: {} });
  const found: THREE.Mesh[] = [];
  rig.object.traverse((o) => {
    if (o instanceof THREE.Mesh) found.push(o);
  });
  return found;
};
const finite = (found: THREE.Mesh[]): boolean => found.every((m) => [...m.geometry.attributes.position.array, ...m.position.toArray(), ...m.scale.toArray()].every(Number.isFinite));

describe('look of a character', () => {
  const bald = meshes({ ...ana, hairStyle: 'none' }).length;

  it('builds every hair style, each adding something to a bald head', () => {
    for (const hairStyle of HAIR_STYLES) {
      const found = meshes({ ...ana, hairStyle });
      expect(finite(found), hairStyle).toBe(true);
      if (hairStyle !== 'none') expect(found.length, hairStyle).toBeGreaterThan(bald);
    }
    // Curls are many rounded volumes.
    expect(meshes({ ...ana, hairStyle: 'afro' }).length - bald).toBeGreaterThan(15);
  });

  it('adds a streak of another color to any hair, and keeps natural brows under dyed hair', () => {
    const colors = (def: CharacterDef): Set<string> => new Set(meshes(def).map((m) => (m.material as THREE.MeshStandardMaterial).color.getHexString()));
    const pink = HAIR_COLORS.pink.slice(1);
    for (const hairStyle of ['short', 'long', 'fringe', 'bob', 'curly', 'curlyLong', 'afro', 'mohawk', 'puffs'] as const) {
      expect(colors({ ...ana, hairStyle }).has(pink), hairStyle).toBe(false);
      expect(colors({ ...ana, hairStyle, hairStreak: HAIR_COLORS.pink }).has(pink), hairStyle).toBe(true);
    }
    expect(colors({ ...ana, hairStyle: 'none', hairStreak: HAIR_COLORS.pink }).has(pink)).toBe(false);
    for (const dyed of [HAIR_COLORS.blue, HAIR_COLORS.green, HAIR_COLORS.purple, HAIR_COLORS.pink]) expect(colors({ ...ana, hair: dyed }).has('2b1d16')).toBe(true);
    for (const natural of [HAIR_COLORS.blond, HAIR_COLORS.red, HAIR_COLORS.brown]) expect(colors({ ...ana, hair: natural }).has('2b1d16')).toBe(false);
  });

  it('builds every face option', () => {
    const plain = meshes(ana).length;
    for (const headShape of ['round', 'oval', 'wide'] as const) {
      for (const nose of ['round', 'small', 'long', 'wide'] as const) expect(finite(meshes({ ...ana, headShape, nose, eyeSize: 1.2, lips: '#c0392b' }))).toBe(true);
    }
    for (const beard of ['stubble', 'mustache', 'goatee', 'full'] as const) expect(meshes({ ...ana, beard }).length, beard).toBeGreaterThan(plain);
    for (const glasses of ['round', 'square'] as const) expect(meshes({ ...ana, glasses }).length, glasses).toBe(plain + 5);
    expect(meshes({ ...ana, beard: 'none', glasses: 'none' }).length).toBe(plain);
  });

  it('keeps beard and glasses out of the outline, and takes the cel style whole', () => {
    const rig = buildBody({ ...ana, hairStyle: 'afro', beard: 'full', glasses: 'round' });
    applyStyle(rig.object, resolveStyle({ style: { look: 'cel' } }));
    let outlined = 0;
    rig.object.traverse((o) => {
      if (!o.userData.outline) return;
      outlined++;
      const material = (o.parent as THREE.Mesh).userData.builtMaterial as THREE.MeshStandardMaterial;
      expect(['2b2d33'].includes(material.color.getHexString())).toBe(false);
    });
    expect(outlined).toBeGreaterThan(30);
  });
});

describe('look of an extra', () => {
  const looks = Array.from({ length: 300 }, (_, i) => extraLook(i * 7 + 3));

  it('is the same for the same seed and only uses what exists', () => {
    expect(extraLook(31)).toEqual(extraLook(31));
    for (const look of looks) {
      expect(HAIR_STYLES).toContain(look.hairStyle);
      expect(['round', 'oval', 'wide']).toContain(look.headShape);
      expect(['round', 'small', 'long', 'wide']).toContain(look.nose);
      expect(['none', 'round', 'square']).toContain(look.glasses);
      expect(look.eyeSize! >= 0.88 && look.eyeSize! <= 1.12).toBe(true);
      expect(finite(meshes({ ...ana, ...look }))).toBe(true);
    }
  });

  it('varies everything across a crowd', () => {
    for (const key of ['skin', 'hair', 'hairStyle', 'eyes', 'headShape', 'nose', 'glasses'] as const) expect(new Set(looks.map((l) => l[key])).size, key).toBeGreaterThan(2);
    // Every hair style but bald turns up.
    expect(new Set(looks.map((l) => l.hairStyle)).size).toBe(HAIR_STYLES.length - 1);
    const glasses = looks.filter((l) => l.glasses !== 'none').length / looks.length;
    expect(glasses).toBeGreaterThan(0.08);
    expect(glasses).toBeLessThan(0.25);
  });

  it('has blond, red and brown hair, and now and then dyed hair or a streak', () => {
    const hair = looks.map((l) => l.hair);
    for (const color of [HAIR_COLORS.blond, HAIR_COLORS.red, HAIR_COLORS.brown, HAIR_COLORS.black]) expect(hair).toContain(color);
    const dyed = hair.filter((c) => ([HAIR_COLORS.blue, HAIR_COLORS.green, HAIR_COLORS.purple, HAIR_COLORS.pink] as string[]).includes(c!)).length / looks.length;
    expect(dyed).toBeGreaterThan(0.02);
    expect(dyed).toBeLessThan(0.14);
    const streaked = looks.filter((l) => l.hairStreak).length / looks.length;
    expect(streaked).toBeGreaterThan(0.03);
    expect(streaked).toBeLessThan(0.15);
  });

  it('gives beards to adults only', () => {
    expect(looks.every((l) => l.beard === 'none')).toBe(true);
    const adults = Array.from({ length: 300 }, (_, i) => extraLook(i * 7 + 3, { adult: true }));
    const bearded = adults.filter((l) => l.beard !== 'none').length / adults.length;
    expect(bearded).toBeGreaterThan(0.25);
    expect(bearded).toBeLessThan(0.55);
  });
});
