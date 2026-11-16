import { describe, expect, it } from 'vitest';
import type { CastMember } from './character/cast';
import type { CharacterDef } from './character/types';
import { project, reviewEpisode, reviewReport, REVIEW_CHECKS, type Finding } from './review';
import { direct, resolveScript, type Director } from './timeline/direct';
import { buildLocation } from './world/build';

describe('review', () => {
  const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 40 }, rooms: [{ id: 'r', name: 'r', origin: [0, 0], size: [12, 12], floorColor: '#ccc' }] });
  const defs: CharacterDef[] = [{ id: 'ana', name: 'Ana' }, { id: 'beto', name: 'Beto' }];
  // Ana in the middle of the room, facing south; the camera in front of her, three meters away, at her eyes.
  const ana: CastMember = { character: 'ana', at: [6, 4], yaw: 180 };
  const beto: CastMember = { character: 'beto', at: [9, 4], yaw: 180 };
  const front = { pos: [6, 1.5, 7] as [number, number, number], lookAt: [6, 1.5, 4] as [number, number, number] };
  const review = (cast: CastMember[], script: (d: Director) => void): Finding[] => {
    const episode = resolveScript(direct({ episode: 1, title: 't', location: 't', cast }, script), location, defs);
    return reviewEpisode(episode, location, defs);
  };
  const checks = (findings: Finding[]): string[] => [...new Set(findings.filter((f) => f.level !== 'nota').map((f) => f.check))];
  const talk = (d: Director): void => {
    for (const id of ['ana', 'beto']) d.actor(id).behave('idle');
    d.actor('ana').say('Uma fala curta, de frente para a câmera.');
  };

  it('projects a point onto the picture', () => {
    const pose = { pos: [0, 1, 0] as [number, number, number], lookAt: [0, 1, -5] as [number, number, number], fov: 90 };
    expect(project(pose, [0, 1, -3], 1)).toMatchObject({ x: 0, y: 0, depth: 3 });
    // At 90° the edge of the picture is as far to the side as the point is ahead; a narrow picture reaches it sooner.
    expect(project(pose, [3, 1, -3], 1).x).toBeCloseTo(1);
    expect(project(pose, [3, 1, -3], 9 / 16).x).toBeCloseTo(16 / 9);
    expect(project(pose, [0, 4, -3], 1).y).toBeCloseTo(1);
    expect(project(pose, [0, 1, 2], 1).depth).toBeLessThan(0);
  });

  it('has nothing to say about a line spoken in the middle of the picture', () => {
    expect(checks(review([ana, beto], (d) => {
      d.camera.cut(front);
      talk(d);
    }))).toEqual([]);
  });

  it('finds two lines spoken at the same time', () => {
    const found = review([ana, beto], (d) => {
      d.camera.cut({ pos: [7.5, 1.5, 9], lookAt: [7.5, 1.5, 4] });
      for (const id of ['ana', 'beto']) d.actor(id).behave('idle');
      d.together(() => d.actor('ana').say('Eu falo agora mesmo, sem esperar.'), () => d.actor('beto').say('E eu também falo agora mesmo.'));
    });
    expect(found.find((f) => f.check === 'fala-sobreposta')).toMatchObject({ level: 'erro' });
  });

  it('finds a stretch with nothing new to see or hear', () => {
    const found = review([ana, beto], (d) => {
      d.camera.cut(front);
      talk(d);
      d.wait(5);
      d.actor('ana').say('Voltei.');
    });
    const still = found.find((f) => f.check === 'trecho-parado')!;
    expect(still.end! - still.t).toBeCloseTo(5, 0);
  });

  it('finds the speaker at the edge, hidden behind someone, or out of the picture', () => {
    expect(checks(review([ana, beto], (d) => {
      d.camera.cut({ pos: [6, 1.5, 7], lookAt: [6.6, 1.5, 4] });
      talk(d);
    }))).toEqual(['fala-na-borda']);
    // Beto stands between the camera and Ana.
    expect(checks(review([ana, { ...beto, at: [6, 5.5] }], (d) => {
      d.camera.cut(front);
      talk(d);
    }))).toEqual(['fala-tapada']);
    // Seen from behind, over her shoulder, there is no face to keep clear or centered.
    expect(checks(review([ana, { ...beto, at: [6.3, 8], yaw: 0 }], (d) => {
      d.camera.cut({ pos: [5.5, 1.8, 2.8], lookAt: [6.3, 1.5, 8] });
      talk(d);
    }))).toEqual([]);
    const away = review([ana, beto], (d) => {
      d.camera.cut({ pos: [6, 1.5, 7], lookAt: [6, 1.5, 11] });
      talk(d);
    });
    expect(away.find((f) => f.check === 'fala-fora-do-quadro')).toMatchObject({ level: 'nota' });
  });

  it('finds the camera inside a person and people inside each other', () => {
    expect(checks(review([ana, beto], (d) => {
      d.camera.cut({ pos: [9, 1.2, 4], lookAt: [6, 1.5, 4] });
      talk(d);
    }))).toContain('camera-dentro');
    expect(checks(review([ana, { ...beto, at: [6.1, 4] }], (d) => {
      d.camera.cut({ pos: [6, 1.5, 9], lookAt: [6, 1.5, 4] });
      talk(d);
    }))).toContain('gente-atravessando');
  });

  it('finds censorship that ends before the cut and a camera that shakes too much', () => {
    const found = review([ana, beto], (d) => {
      d.camera.cut({ ...front, shake: 0.4 });
      for (const id of ['ana', 'beto']) d.actor(id).behave('idle');
      d.background(() => d.censor({ at: [6, 1.5, 4], size: 0.5, mode: 'tarja' }, { duration: 1 }));
      d.actor('ana').say('Uma fala que dura mais do que a tarja que está na frente dela.');
      d.camera.cut(front);
      d.actor('ana').say('Pronto.');
    });
    expect(checks(found)).toEqual(expect.arrayContaining(['censura', 'tremor']));
  });

  it('writes the findings with the time of the finished video', () => {
    const lines = reviewReport({ cuts: [[2, 6]] }, [{ check: 'tremor', level: 'aviso', t: 70, end: 72, text: 'x' }]);
    expect(lines).toEqual(['⚠ 1:06.0–1:08.0  [tremor] x']);
    expect(Object.keys(REVIEW_CHECKS)).toContain('tremor');
  });
});
