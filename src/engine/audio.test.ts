import { describe, expect, it } from 'vitest';
import { lineMouth } from './actions/character';
import { soundFile } from './audio/sound';
import { spokenText, stripTags, takeFromAlignment, takeKey, takeVisemes } from './audio/voice';
import { mouthOpenOf } from './character/motion';
import { direct, resolveScript } from './timeline/direct';
import { cutAt, finalTime } from './timeline/episode';
import { buildLocation } from './world/build';
import type { CharacterDef } from './character/types';
import type { Bible } from './bible';

describe('voice takes', () => {
  it('keys a take by how it sounds, not by where it is', () => {
    const voice = { id: 'v1' };
    const a = takeKey(voice, 'eleven_v3', spokenText('Oi', 'sussurro'));
    expect(a).toBe(takeKey({ id: 'v1' }, 'eleven_v3', '[whispers] Oi'));
    expect(a).not.toBe(takeKey(voice, 'eleven_v3', 'Oi'));
    expect(a).not.toBe(takeKey({ id: 'v2' }, 'eleven_v3', '[whispers] Oi'));
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });

  it('sends a tone as a tag that stays out of the words', () => {
    expect(spokenText('Corre!', 'grito')).toBe('[shouting] Corre!');
    expect(spokenText('Corre!', 'laughs')).toBe('[laughs] Corre!');
    expect(stripTags('[whispers] Oi, [sighs] tudo bem?')).toBe('Oi, tudo bem?');
  });

  it('takes the tag out of the alignment and scales the times by the tempo', () => {
    const chars = [...'[x] Oi'];
    const starts = chars.map((_, i) => i * 0.1);
    const take = takeFromAlignment('k', 1.2, chars, starts, starts.map((s) => s + 0.1), 1.2);
    expect(take.text).toBe('Oi');
    expect(take.starts).toEqual([0.4 / 1.2, 0.5 / 1.2].map((v) => Math.round(v * 1000) / 1000));
    expect(take.duration).toBe(1);
  });

  it('opens the mouth when the voice says a vowel, and closes it in a pause', () => {
    const take = { key: 't1', duration: 2, text: 'ma. ma', starts: [0.1, 0.2, 0.3, 1.5, 1.6, 1.7], ends: [0.2, 0.35, 0.4, 1.6, 1.75, 1.8] };
    const mouth = takeVisemes(take);
    expect(mouth(0.27).A).toBeGreaterThan(0.5);
    expect(mouthOpenOf(mouth(1.0))).toBe(0);
    expect(mouth(1.76).A).toBeGreaterThan(0.5);
    expect(mouthOpenOf(mouth(2.1))).toBe(0);
  });

  it('a line lasts as long as its take', () => {
    const take = { key: 't2', duration: 3.4, text: 'oi', starts: [0, 0.2], ends: [0.2, 0.4] };
    expect(lineMouth('oi', take).duration).toBe(3.4);
    expect(lineMouth('oi').duration).toBe(1);
  });
});

describe('script with voices', () => {
  const ana: CharacterDef = { id: 'ana', name: 'Ana', voice: { id: 'voz-ana' } };
  const bible = { series: 't', title: 't', language: 'pt-BR', dubbing: [], format: { width: 10, height: 10, fps: 30 }, rules: [], audio: { provider: 'elevenlabs', defaultMode: 'tts', narrator: { id: 'voz-narrador' }, sounds: { porta: { file: 'porta.ogg' } } } } as Bible;
  const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 10 }, rooms: [] });
  const script = direct({ episode: 1, title: 't', location: 't', cast: [{ character: 'ana', at: [0, 0] }] }, (d) => {
    d.camera.cut({ pos: [0, 1, 5], lookAt: [0, 1, 0] });
    d.actor('ana').say('Oi', { tone: 'sussurro' });
    d.sound('porta');
    d.narrate('E agora?');
  });

  it('lists the lines with their voices, and uses a take when there is one', () => {
    const before = resolveScript(script, location, [ana], bible);
    expect(before.lines!.map((l) => [l.speaker, l.spoken, l.voice.id])).toEqual([['ana', '[whispers] Oi', 'voz-ana'], ['narrador', 'E agora?', 'voz-narrador']]);
    const key = before.lines![0].key;
    const after = resolveScript(script, location, [ana], bible, { [key]: { key, duration: 2.5, text: 'Oi', starts: [0, 0.3], ends: [0.3, 0.6] } });
    const say = after.actions!.find((c) => c.action === 'say')!;
    expect(say.duration).toBe(2.5);
    expect(after.actions!.find((c) => c.action === 'narrate')!.t).toBe(2.5);
  });

  it('refuses a sound the bible does not name', () => {
    const bad = direct({ episode: 1, title: 't', location: 't', cast: [] }, (d) => {
      d.camera.cut({ pos: [0, 1, 5], lookAt: [0, 1, 0] });
      d.sound('trovão');
    });
    expect(() => resolveScript(bad, location, [], bible)).toThrow(/trovão/);
  });

  it('names a made sound by what was asked', () => {
    expect(soundFile('vibra', { prompt: 'phone buzz' })).toMatch(/^vibra-[0-9a-f]{8}\.mp3$/);
    expect(soundFile('vibra', { prompt: 'phone buzz' })).not.toBe(soundFile('vibra', { prompt: 'phone buzz twice' }));
    expect(soundFile('porta', { file: 'porta.ogg' })).toBe('porta.ogg');
  });
});

describe('jump cuts', () => {
  it('moves times to the finished video', () => {
    const ep = { cuts: [[2, 5], [10, 11]] as [number, number][] };
    expect(finalTime(ep, 1)).toBe(1);
    expect(finalTime(ep, 3)).toBe(2);
    expect(finalTime(ep, 7)).toBe(4);
    expect(finalTime(ep, 12)).toBe(8);
    expect(cutAt(ep, 4)).toEqual([2, 5]);
    expect(cutAt(ep, 5)).toBeUndefined();
  });
});

describe('looking round', () => {
  const location = buildLocation({ id: 't', name: 't', ground: { color: '#fff', size: 10 }, rooms: [] });
  const defs: CharacterDef[] = [{ id: 'ana', name: 'Ana' }, { id: 'beto', name: 'Beto' }];
  const cast = [{ character: 'ana', at: [0, 0] as [number, number], yaw: 0 }, { character: 'beto', at: [0, 2] as [number, number], yaw: 0 }];
  const yawOf = (ep: ReturnType<typeof resolveScript>) => ep.actions!.filter((c) => c.target === 'ana' && c.action === 'turnTo').map((c) => c.params!.yaw as number);

  it('turns the body to look at someone behind, but not at someone in front', () => {
    const behind = resolveScript(direct({ episode: 1, title: 't', location: 't', cast }, (d) => {
      d.camera.cut({ pos: [0, 1, 5], lookAt: [0, 1, 0] });
      d.actor('ana').lookAt(d.actor('beto'));
    }), location, defs);
    expect(Math.abs(yawOf(behind)[0])).toBeCloseTo(180);
    const ahead = resolveScript(direct({ episode: 1, title: 't', location: 't', cast: [cast[0], { ...cast[1], at: [0.5, -2] }] }, (d) => {
      d.camera.cut({ pos: [0, 1, 5], lookAt: [0, 1, 0] });
      d.actor('ana').say('oi', { to: 'beto' });
    }), location, defs);
    expect(yawOf(ahead)).toEqual([]);
  });

  it('gives the turn up when the script turns the body itself', () => {
    const ep = resolveScript(direct({ episode: 1, title: 't', location: 't', cast }, (d) => {
      d.camera.cut({ pos: [0, 1, 5], lookAt: [0, 1, 0] });
      d.background(() => d.actor('ana').lookAt(d.actor('beto')));
      d.actor('ana').turnTo(90);
    }), location, defs);
    expect(yawOf(ep)).toEqual([90]);
  });
});

describe('nobody stands frozen', () => {
  it('reports a character with no behaviour and nothing to do, but not the one the camera sees through', async () => {
    const { stillWithNothingToDo } = await import('./timeline/direct');
    const clips = [
      { t: 0, target: 'ana', action: 'behave', params: { mode: 'write' }, duration: 0 },
      { t: 2, target: 'ana', action: 'behave', params: { mode: 'none' }, duration: 0 },
      { t: 2, target: 'ana', action: 'turnTo', params: { yaw: 90 }, duration: 1 },
      { t: 3, target: 'ana', action: 'say', params: { text: 'oi' }, duration: 1 },
      { t: 9, target: 'ana', action: 'behave', params: { mode: 'idle' }, duration: 0 },
    ];
    expect(stillWithNothingToDo(clips, ['ana', 'eu'], ['eu'], 12)).toEqual(['"ana" fica parado sem fazer nada de 4.0 s a 9.0 s: dê um behave (idle, attend, chat...) ou uma ação.']);
    clips[4].t = 6;
    expect(stillWithNothingToDo(clips, ['ana'], [], 12)).toEqual([]);
  });
});
