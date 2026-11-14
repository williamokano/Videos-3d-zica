import { describe, expect, it } from 'vitest';
import { baseName, speakerLabels } from './speakers';

const line = (speaker: string, name: string, t: number, end = t + 2) => ({ speaker, name, t, end });

describe('speakerLabels', () => {
  it('drops the number of an extra who talks alone', () => {
    expect(speakerLabels([line('g1', 'Guarda 1', 0), line('davi', 'Davi', 3)])).toEqual(['Guarda', 'Davi']);
  });

  it('numbers two of the same name who talk to each other, by who speaks first', () => {
    const labels = speakerLabels([line('s4', 'Soldado 4', 0), line('s2', 'Soldado 2', 3), line('s4', 'Soldado 4', 6)]);
    expect(labels).toEqual(['Soldado 1', 'Soldado 2', 'Soldado 1']);
  });

  it('a later conversation starts the count again', () => {
    const labels = speakerLabels([line('s1', 'Soldado', 0), line('s2', 'Soldado', 3), line('s2', 'Soldado', 60)]);
    expect(labels).toEqual(['Soldado 1', 'Soldado 2', 'Soldado']);
  });

  it('keeps the order of the input and names that are not numbered', () => {
    expect(speakerLabels([line('a', 'Saul', 5), line('b', 'Guarda da porta 2', 0)])).toEqual(['Saul', 'Guarda da porta']);
  });

  it('baseName only strips a trailing number', () => {
    expect(baseName('Soldado 12')).toBe('Soldado');
    expect(baseName('Davi')).toBe('Davi');
    expect(baseName('7')).toBe('7');
  });
});
