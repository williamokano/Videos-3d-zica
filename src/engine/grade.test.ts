import { describe, expect, it } from 'vitest';
import { NEUTRAL_GRADE, gradeIsNeutral, resolveEnvironment, resolveGrade, type BibleRule } from './bible';

const rules: BibleRule[] = [
  { id: 'red', description: '', from: 1, until: null, effects: { environment: { skyTop: '#ff0000' }, grade: { tint: '#ff0000', amount: 0.4, vignette: 0.2 } } },
  { id: 'old', description: '', from: 1, until: null, effects: { grade: { saturation: 0 } } },
  { id: 'sky', description: '', from: 1, until: null, effects: { environment: { sunIntensity: 1 } } },
];

describe('color of the picture', () => {
  it('is neutral unless the series or a rule says otherwise', () => {
    expect(resolveGrade({}, [])).toEqual(NEUTRAL_GRADE);
    expect(gradeIsNeutral(resolveGrade({}, []))).toBe(true);
    expect(gradeIsNeutral(resolveGrade({}, [rules[2]]))).toBe(true);
    expect(gradeIsNeutral(resolveGrade({ grade: { contrast: 1.1 } }, []))).toBe(false);
  });

  it('takes the grade of the series and what each rule changes, in order', () => {
    expect(resolveGrade({ grade: { contrast: 1.2 } }, rules)).toEqual({ tint: '#ff0000', amount: 0.4, saturation: 0, contrast: 1.2, vignette: 0.2 });
  });

  it('comes in with the weight of the rule, as the sky does', () => {
    const half = resolveGrade({}, rules, { red: 0.5, old: 0 });
    expect(half.amount).toBeCloseTo(0.2);
    expect(half.vignette).toBeCloseTo(0.1);
    expect(half.saturation).toBe(1);
    expect(half.tint).toBe('#ff8080');
    expect(gradeIsNeutral(resolveGrade({}, rules, { red: 0, old: 0 }))).toBe(true);
    // The environment still resolves the same way.
    expect(resolveEnvironment(rules, { red: 0.5 }).sunIntensity).toBe(1);
  });

  it('does not change the series grade it starts from', () => {
    const bible = { grade: { contrast: 1.2 } };
    resolveGrade(bible, rules);
    expect(bible.grade).toEqual({ contrast: 1.2 });
  });
});
