import type { CharacterDef, HairStyle } from './types';

const SKIN = ['#f1c9a5', '#e8b88f', '#d9a074', '#c68a5e', '#a86f48', '#8a5636', '#6e4429'];
/** Hair colors by name, for character files and menus. */
export const HAIR_COLORS = {
  black: '#1c1512', darkBrown: '#2b1d16', brown: '#4a3020', chestnut: '#6b4226', lightBrown: '#8a5a32', blond: '#d9b25f', lightBlond: '#ecd49a',
  red: '#b5471f', auburn: '#7a2e1c', gray: '#8c8c8c', blue: '#2f6fd6', green: '#2f9e5b', purple: '#8a4fc7', pink: '#e86aa6',
} as const;
const C = HAIR_COLORS;
// Natural colors, the common ones more often.
const HAIR = [C.black, C.black, C.darkBrown, C.darkBrown, C.brown, C.brown, C.chestnut, C.chestnut, C.lightBrown, C.blond, C.blond, C.lightBlond, C.red, C.auburn];
const DYED = [C.blue, C.green, C.purple, C.pink];
const STREAKS = [C.blond, C.lightBlond, C.red, C.blue, C.green, C.purple, C.pink];
// Some styles come up more often than others.
const STYLES: HairStyle[] = ['short', 'short', 'fringe', 'fringe', 'curly', 'curly', 'curlyLong', 'curlyLong', 'afro', 'puffs', 'bob', 'long', 'long', 'ponytail', 'ponytail', 'pigtails', 'bun', 'buzz', 'mohawk'];
const EYES = ['#4a2f1d', '#4a2f1d', '#3a2417', '#5b3a1e', '#2c1a12', '#5a6b3a', '#3d6a8c'];
const SHAPES: NonNullable<CharacterDef['headShape']>[] = ['round', 'round', 'oval', 'wide'];
const NOSES: NonNullable<CharacterDef['nose']>[] = ['round', 'round', 'small', 'long', 'wide'];
const BEARDS: NonNullable<CharacterDef['beard']>[] = ['stubble', 'mustache', 'goatee', 'full'];
const PANTS = ['#34405a', '#2b3348', '#3f4a5c', '#4a4f5c', '#2f3a4a'];
const SHOES = ['#2b2e36', '#f0f0f0', '#5a4636', '#1f2530'];

const hash = (a: number, b: number): number => {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * A look for an extra: skin, hair, face, height and build picked from the seed, so a crowd made from one
 * character file does not look like copies. What is not varied here (the shirt of a uniform) comes from the
 * file. `adult` lets some of them have a beard; a few wear glasses either way.
 */
export function extraLook(seed: number, options: { minHeight?: number; maxHeight?: number; adult?: boolean } = {}): Partial<CharacterDef> {
  const pick = <T>(list: T[], salt: number): T => list[Math.floor(hash(seed, salt) * list.length) % list.length];
  const round = (v: number): number => Math.round(v * 100) / 100;
  const [low, high] = [options.minHeight ?? 1.56, options.maxHeight ?? 1.8];
  return {
    skin: pick(SKIN, 1),
    // A few dye their hair, and a few have a streak.
    hair: hash(seed, 16) < 0.07 ? pick(DYED, 17) : pick(HAIR, 2),
    hairStreak: hash(seed, 18) < 0.08 ? pick(STREAKS, 19) : undefined,
    hairStyle: pick(STYLES, 3),
    pants: pick(PANTS, 4),
    shoes: pick(SHOES, 5),
    height: round(low + (high - low) * hash(seed, 6)),
    build: round(0.9 + 0.22 * hash(seed, 7)),
    eyes: pick(EYES, 8),
    eyeSize: round(0.88 + 0.24 * hash(seed, 9)),
    headShape: pick(SHAPES, 10),
    nose: pick(NOSES, 11),
    beard: options.adult && hash(seed, 12) < 0.4 ? pick(BEARDS, 13) : 'none',
    glasses: hash(seed, 14) < 0.16 ? (hash(seed, 15) < 0.5 ? 'round' : 'square') : 'none',
  };
}
