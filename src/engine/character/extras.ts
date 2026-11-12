import type { CharacterDef } from './types';

const SKIN = ['#f1c9a5', '#e8b88f', '#d9a074', '#c68a5e', '#a86f48', '#8a5636', '#6e4429'];
const HAIR = ['#1c1512', '#2b1d16', '#3b2a20', '#5a3a26', '#7a5230', '#a8763c', '#15181f'];
const STYLES: NonNullable<CharacterDef['hairStyle']>[] = ['short', 'short', 'long', 'bun', 'short', 'long'];
const PANTS = ['#34405a', '#2b3348', '#3f4a5c', '#4a4f5c', '#2f3a4a'];
const SHOES = ['#2b2e36', '#f0f0f0', '#5a4636', '#1f2530'];

const hash = (a: number, b: number): number => {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * A look for an extra: skin, hair, height and build picked from the seed, so a crowd made from one character
 * file does not look like copies. What is not varied here (the shirt of a uniform) comes from the file.
 */
export function extraLook(seed: number, options: { minHeight?: number; maxHeight?: number } = {}): Partial<CharacterDef> {
  const pick = <T>(list: T[], salt: number): T => list[Math.floor(hash(seed, salt) * list.length) % list.length];
  const [low, high] = [options.minHeight ?? 1.56, options.maxHeight ?? 1.8];
  return {
    skin: pick(SKIN, 1),
    hair: pick(HAIR, 2),
    hairStyle: pick(STYLES, 3),
    pants: pick(PANTS, 4),
    shoes: pick(SHOES, 5),
    height: Math.round((low + (high - low) * hash(seed, 6)) * 100) / 100,
    build: Math.round((0.9 + 0.22 * hash(seed, 7)) * 100) / 100,
  };
}
