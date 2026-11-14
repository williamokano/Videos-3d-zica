import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { censorProblem, censorRect, censorsAt } from './censor';

describe('censura', () => {
  it('recusa censura sem ponto, sem tamanho ou com modo desconhecido', () => {
    expect(censorProblem({ at: [0, 1, 0], size: 0.5, mode: 'tarja' })).toBeUndefined();
    expect(censorProblem({ size: 0.5, mode: 'tarja' })).toMatch(/"at"/);
    expect(censorProblem({ at: [0, 1, 0], size: 0, mode: 'tarja' })).toMatch(/"size"/);
    expect(censorProblem({ at: [0, 1, 0], size: 0.5, mode: 'blur' as never })).toMatch(/"mode"/);
  });

  it('projeta o ponto no quadro, do tamanho certo, e some atrás da câmera', () => {
    const camera = new THREE.PerspectiveCamera(60, 9 / 16, 0.1, 100);
    camera.position.set(0, 1, 5);
    camera.lookAt(0, 1, 0);
    camera.updateMatrixWorld();
    const r = censorRect({ at: [0, 1, 0], size: 1, mode: 'mosaico' }, camera, 9 / 16)!;
    expect(r.center[0]).toBeCloseTo(0.5, 5);
    expect(r.center[1]).toBeCloseTo(0.5, 5);
    // 1 m a 5 m com 60°: a altura do quadro ali é 2 * 5 * tan(30°) = 5,77 m.
    expect(r.half[1]).toBeCloseTo(0.5 / 5.7735, 3);
    // A tarja é mais larga que o mosaico.
    const bar = censorRect({ at: [0, 1, 0], size: 1, mode: 'tarja' }, camera, 9 / 16)!;
    expect(bar.half[0]).toBeGreaterThan(r.half[0]);
    expect(censorRect({ at: [0, 1, 10], size: 1, mode: 'tarja' }, camera, 9 / 16)).toBeUndefined();
  });

  it('cada censura fica na tela só no seu tempo', () => {
    const compiled = {
      clips: [{ t: 2, duration: 1, action: 'censor', target: 'world' }, { t: 5, duration: 2, action: 'censor', target: 'world' }],
      events: [{ t: 2, type: 'censor', target: 'world', data: { at: [0, 0, 0], size: 1, mode: 'tarja' } }, { t: 5, type: 'censor', target: 'world', data: { at: [1, 0, 0], size: 1, mode: 'mosaico' } }],
    } as never;
    expect(censorsAt(compiled, 1.9)).toEqual([]);
    expect(censorsAt(compiled, 2.5).map((c) => c.mode)).toEqual(['tarja']);
    expect(censorsAt(compiled, 6).map((c) => c.mode)).toEqual(['mosaico']);
  });
});
