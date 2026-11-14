import { describe, expect, it } from 'vitest';
import { evaluateCamera } from './timeline/camera';
import { direct, resolveScript } from './timeline/direct';
import { buildLocation } from './world/build';

describe('camera orbit and shake', () => {
  const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 40 }, rooms: [] });

  it('an orbit keeps its distance and keeps looking at the center, and shake moves the camera only while it is on', () => {
    const episode = resolveScript(direct({ episode: 1, title: 't', location: 't', cast: [] }, (d) => {
      d.camera.cut({ pos: [0, 2, 10], lookAt: [0, 1, 0] });
      d.wait(1);
      d.camera.orbit({ center: [2, 1, 3], radius: 5, height: 0.5, from: 0, to: 120, duration: 4 });
      d.wait(4);
      d.camera.cut({ pos: [0, 2, 10], lookAt: [0, 1, 0], shake: 1 });
      d.wait(2);
    }), location, []);
    for (let t = 1; t < 5; t += 0.25) {
      const pose = evaluateCamera(episode.camera, t);
      expect(Math.hypot(pose.pos[0] - 2, pose.pos[2] - 3)).toBeCloseTo(5, 1);
      expect(pose.lookAt).toEqual([2, 1, 3]);
    }
    // Ends 120° round: east and a little north of south.
    const end = evaluateCamera(episode.camera, 4.999);
    expect(end.pos[0]).toBeCloseTo(2 + 5 * Math.sin((120 * Math.PI) / 180), 1);
    expect(evaluateCamera(episode.camera, 0.5).pos).toEqual([0, 2, 10]);
    const a = evaluateCamera(episode.camera, 5.5).pos;
    const b = evaluateCamera(episode.camera, 5.6).pos;
    expect(Math.hypot(a[0] - 0, a[1] - 2, a[2] - 10)).toBeLessThan(0.1);
    expect(a).not.toEqual(b);
  });

  it('a cut in the middle of an orbit ends it', () => {
    const episode = resolveScript(direct({ episode: 1, title: 't', location: 't', cast: [] }, (d) => {
      d.camera.orbit({ center: [0, 1, 0], radius: 5, height: 0, from: 0, to: 180, duration: 10 });
      d.wait(3);
      d.camera.cut({ pos: [9, 2, 9], lookAt: [0, 1, 0] });
      d.wait(9);
    }), location, []);
    for (const t of [3, 6, 9, 11]) expect(evaluateCamera(episode.camera, t).pos).toEqual([9, 2, 9]);
  });
});
