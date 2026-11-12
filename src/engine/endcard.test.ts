import { describe, expect, it } from 'vitest';
import './actions/endcard';
import { compileActions, type ActionClip } from './actions/catalog';
import { direct, resolveScript } from './timeline/direct';
import { buildWorld } from './timeline/stage';
import { END_CARD_COLORS, endCardAt, endCardProblem, type EndCard } from './ui/endcard';
import { buildLocation } from './world/build';

const card: EndCard = { title: 'O que você faria?', options: [{ label: 'Ficava' }, { label: 'Saía', icon: '2', color: '#123456' }], cta: 'Comenta aí' };
const compile = (clips: ActionClip[]) => compileActions(clips, [buildWorld()]);

describe('end card', () => {
  it('is on screen for the length of its clip, and not before or after', () => {
    const compiled = compile([{ t: 10, target: 'world', action: 'endCard', params: { card }, duration: 5 }]);
    expect(endCardAt(compiled, 9.9)).toBeUndefined();
    expect(endCardAt(compiled, 10)?.card).toEqual(card);
    expect(endCardAt(compiled, 14.9)).toBeDefined();
    expect(endCardAt(compiled, 15)).toBeUndefined();
    // Six seconds when nothing is said.
    expect(compile([{ t: 0, target: 'world', action: 'endCard', params: { card } }]).clips[0].duration).toBe(6);
  });

  it('brings in the title, then each option, then the call to comment', () => {
    const compiled = compile([{ t: 10, target: 'world', action: 'endCard', params: { card } }]);
    const start = endCardAt(compiled, 10)!;
    expect([start.dim, start.title, ...start.options, start.cta]).toEqual([0, 0, 0, 0, 0]);
    const early = endCardAt(compiled, 10.7)!;
    expect(early.title).toBe(1);
    expect(early.options[0]).toBeGreaterThan(0);
    expect(early.options[0]).toBeGreaterThan(early.options[1]);
    expect(early.cta).toBe(0);
    const settled = endCardAt(compiled, 13)!;
    expect([settled.dim, settled.title, ...settled.options, settled.cta]).toEqual([1, 1, 1, 1, 1]);
    expect(endCardAt(compiled, 11.3)).toEqual(endCardAt(compiled, 11.3));
  });

  it('gives each option a badge: a letter and a color unless it has its own', () => {
    const view = endCardAt(compile([{ t: 0, target: 'world', action: 'endCard', params: { card } }]), 1)!;
    expect(view.badges).toEqual([{ icon: 'A', color: END_CARD_COLORS[0] }, { icon: '2', color: '#123456' }]);
  });

  it('explains what is wrong with a card', () => {
    expect(endCardProblem(card)).toBeUndefined();
    expect(endCardProblem({ ...card, title: ' ' })).toMatch(/title/);
    expect(endCardProblem({ ...card, options: [{ label: 'só uma' }] })).toMatch(/2 a 6/);
    expect(endCardProblem({ ...card, options: [{ label: 'a' }, { label: '' }] })).toMatch(/label/);
    expect(() => compile([{ t: 0, target: 'world', action: 'endCard', params: { card: { title: 'x', options: [] } } }])).toThrow(/2 a 6/);
  });

  it('is one line in a script, and the episode lasts until it is over', () => {
    const script = direct({ episode: 1, title: 't', location: 't', cast: [] }, (d) => {
      d.camera.cut({ pos: [0, 2, 5], lookAt: [0, 1, 0] });
      d.wait(2);
      d.endCard(card, { duration: 4 });
    });
    const episode = resolveScript(script, buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 10 }, rooms: [] }), []);
    expect(episode.actions).toEqual([{ t: 2, target: 'world', action: 'endCard', params: { card }, duration: 4 }]);
    expect(episode.duration).toBeGreaterThanOrEqual(6);
  });
});
