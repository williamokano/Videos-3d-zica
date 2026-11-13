import { describe, expect, it } from 'vitest';
// @ts-expect-error a plain script, with no types
import { cuesOf } from '../../scripts/mix.mjs';
import { VOICE_FILTERS } from './audio/voice';

describe('mixing', () => {
  it('puts a radio filter on the line that asks for it, and leaves the others clean', () => {
    const take = (key: string) => ({ key, duration: 1, text: 'a', starts: [0], ends: [1] });
    const episode = { duration: 10, actions: [
      { t: 1, target: 'ana', action: 'say', params: { text: 'a', take: take('series-file-that-is-not-there-1') } },
      { t: 3, target: 'world', action: 'narrate', params: { text: 'b', filter: 'radio', take: take('series-file-that-is-not-there-2') } },
    ] };
    // The files are not there, and the error names both: that is as far as this goes without audio.
    expect(() => cuesOf({ series: 'x', bible: { audio: {} }, episode, soundFile: () => '', filters: VOICE_FILTERS })).toThrow(/not-there-1[\s\S]*not-there-2/);
    expect(VOICE_FILTERS.radio.ffmpeg).toMatch(/highpass.*lowpass/);
    for (const f of Object.values(VOICE_FILTERS)) expect(f.band[0]).toBeLessThan(f.band[1]);
  });
});
