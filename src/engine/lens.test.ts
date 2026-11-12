import { describe, expect, it } from 'vitest';
import { evaluateCamera, validateCamera, type CameraKey, type CameraStage } from './timeline/camera';

const stage: CameraStage = { subject: () => ({ pos: [0, 0, 0], yaw: 0, eyeHeight: 1.6 }) };

describe('wide-angle lens', () => {
  it('is off unless a key asks for it, and moves between keys like the field of view', () => {
    const plain: CameraKey[] = [{ t: 0, pos: [0, 2, 5], lookAt: [0, 1, 0] }, { t: 2, pos: [0, 2, 3], lookAt: [0, 1, 0] }];
    expect(evaluateCamera(plain, 1).lens).toBe(0);
    const keys: CameraKey[] = [{ t: 0, pos: [0, 2, 5], lookAt: [0, 1, 0] }, { t: 2, pos: [0, 2, 3], lookAt: [0, 1, 0], lens: 0.8 }];
    expect(evaluateCamera(keys, 0).lens).toBe(0);
    expect(evaluateCamera(keys, 1).lens).toBeCloseTo(0.4);
    expect(evaluateCamera(keys, 5).lens).toBe(0.8);
  });

  it('works in the eyes of a character and behind one, and a cut does not carry it over', () => {
    const keys: CameraKey[] = [
      { t: 0, mode: 'fpv', follow: 'ana' },
      { t: 2, lens: 0.6 },
      { t: 4, cut: true, mode: 'third_person', follow: 'ana' },
    ];
    expect(evaluateCamera(keys, 1, stage).lens).toBeCloseTo(0.3);
    expect(evaluateCamera(keys, 3, stage).lens).toBe(0.6);
    expect(evaluateCamera(keys, 5, stage).lens).toBe(0);
  });

  it('must be between 0 and 1', () => {
    expect(() => validateCamera([{ t: 0, pos: [0, 0, 0], lookAt: [0, 0, 1], lens: 1.5 }], [])).toThrow(/"lens"/);
    expect(() => validateCamera([{ t: 0, pos: [0, 0, 0], lookAt: [0, 0, 1], lens: 1 }], [])).not.toThrow();
  });
});
