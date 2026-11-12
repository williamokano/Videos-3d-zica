import { describe, expect, it } from 'vitest';
import { channelAt, evaluateLinks, placementAt } from './actions/catalog';
import { DEFAULT_ENVIRONMENT, resolveEnvironment, type Bible } from './bible';
import type { CharacterDef } from './character/types';
import { direct, resolveScript, type Director } from './timeline/direct';
import { applyStage, buildCast, buildProps, buildWorld, compileEpisode } from './timeline/stage';
import { MessengerApp, type PhoneEvent, type PhoneState } from './ui/phone';
import { buildLocation } from './world/build';
import type { Location } from './world/types';

const ana: CharacterDef = { id: 'ana', name: 'Ana' };
const location: Location = { id: 't', name: 't', ground: { color: '#fff', size: 40 }, rooms: [{ id: 'sala', name: 'Sala', origin: [0, 0], size: [8, 8], floorColor: '#fff', outdoor: true }] };
const bible: Bible = {
  series: 't', title: 't', language: 'pt-BR', dubbing: [], format: { width: 1080, height: 1920, fps: 30 }, audio: { provider: 'elevenlabs', defaultMode: 'tts' },
  rules: [{ id: 'ceu', description: '', from: 1, until: null, effects: { environment: { skyTop: '#ff0000', sunIntensity: 0.6 } } }],
};

function play(script: (d: Director) => void) {
  const source = direct({ episode: 1, title: 't', location: 't', cast: [{ character: 'ana', at: [4, 4] }], props: [{ id: 'celular', asset: 'item.phone', pocketOf: 'ana' }] }, (d) => {
    d.camera.fpv('ana');
    script(d);
  });
  const built = buildLocation(location);
  const episode = resolveScript(source, built, [ana], bible);
  const cast = buildCast(episode, [ana]);
  const others = [buildWorld(bible, 1), ...buildProps(episode)];
  const compiled = compileEpisode(episode, built, cast, others);
  const objects = new Map([...built.interactives, ...cast, ...others].map((o) => [o.id, o]));
  const screen = (t: number): PhoneState => {
    applyStage(compiled, objects, t);
    return objects.get('celular')!.object.userData.state as PhoneState;
  };
  return { episode, compiled, objects, screen };
}

describe('world state', () => {
  it('brings a rule of the bible in gradually', () => {
    const s = play((d) => {
      d.world.rule('ceu', false);
      d.wait(2);
      d.world.rule('ceu', true, { duration: 4, ease: 'linear' });
    });
    expect(channelAt(s.compiled, 'world', 'rule.ceu', 1)).toBe(0);
    expect(channelAt(s.compiled, 'world', 'rule.ceu', 4)).toBeCloseTo(0.5);
    expect(channelAt(s.compiled, 'world', 'rule.ceu', 9)).toBe(1);
    const half = resolveEnvironment(bible.rules, { ceu: 0.5 });
    expect(half.skyTop).toBe('#9f436b');
    expect(half.sunIntensity).toBeCloseTo((DEFAULT_ENVIRONMENT.sunIntensity + 0.6) / 2);
    expect(resolveEnvironment(bible.rules, { ceu: 0 })).toEqual(DEFAULT_ENVIRONMENT);
    expect(resolveEnvironment(bible.rules).skyTop).toBe('#ff0000');
  });
});

describe('phone', () => {
  const chats = [{ id: 'pai', name: 'Pai', history: [{ from: 'them' as const, text: 'Oi' }] }];

  it('starts in the pocket, comes out to the hand, goes up to be read and back', () => {
    const s = play((d) => {
      const a = d.actor('ana');
      d.wait(1);
      a.pickUp('celular');
      a.raise();
      d.wait(1);
      a.lower();
      a.putAway('celular');
    });
    const phone = s.objects.get('celular')!.object;
    s.screen(0.5);
    expect(phone.visible).toBe(false);
    expect(evaluateLinks(s.compiled, 0.5)[0]).toMatchObject({ target: 'celular', to: 'ana', socket: 'pocket' });
    // Raised: in front of the face, a little below the eyes, screen toward the owner.
    s.screen(3);
    expect(phone.visible).toBe(true);
    expect(evaluateLinks(s.compiled, 3)[0].socket).toBe('handR');
    expect(phone.position.z).toBeLessThan(3.75);
    expect(phone.position.y).toBeGreaterThan(1.3);
    expect(phone.position.y).toBeLessThan(1.55);
    expect(placementAt(s.compiled, 'celular', 3).pos[2]).toBeCloseTo(3.64);
    s.screen(20);
    expect(phone.visible).toBe(false);
    expect(() => play((d) => void d.actor('ana').putAway('celular'))).toThrow(/ninguém está segurando/);
    expect(() => play((d) => void d.actor('ana').lower())).toThrow(/não está com a mão levantada/);
  });

  it('shows messages as they arrive, and "typing" until the answer comes', () => {
    const s = play((d) => {
      const c = d.phone('celular');
      c.setup({ clock: '10:42', chats });
      d.wait(2);
      c.typing(true);
      d.wait(2);
      c.receive('NÃO OLHE PRO CÉU!');
      d.wait(1);
      c.send('Por quê?');
    });
    expect(s.screen(1)).toMatchObject({ chat: { name: 'Pai' }, typing: -1, network: true });
    expect(s.screen(1).messages.map((m) => m.text)).toEqual(['Oi']);
    expect(s.screen(3).typing).toBeCloseTo(1);
    const after = s.screen(6);
    expect(after.typing).toBe(-1);
    expect(after.messages.map((m) => [m.from, m.text])).toEqual([['them', 'Oi'], ['them', 'NÃO OLHE PRO CÉU!'], ['me', 'Por quê?']]);
    expect(after.messages[1].age).toBeCloseTo(2);
    // Going back shows what was there then.
    expect(s.screen(1).messages).toHaveLength(1);
  });

  it('loses the signal with the world, unless the phone says otherwise', () => {
    const script = (d: Director) => {
      const c = d.phone('celular');
      c.setup({ chats });
      c.typing(true);
      d.wait(2);
      d.world.network(false);
      d.wait(1);
      c.send('Pai?');
      c.receive('Estou indo');
    };
    const s = play(script);
    expect(s.screen(1)).toMatchObject({ network: true });
    expect(s.screen(1).typing).toBeGreaterThan(0);
    const down = s.screen(4);
    expect(down).toMatchObject({ network: false, typing: -1 });
    // The owner's message stays, marked as not sent; the one from the other side never arrives.
    expect(down.messages.map((m) => [m.text, m.failed])).toEqual([['Oi', undefined], ['Pai?', true]]);
    const own = play((d) => {
      d.phone('celular').network(true);
      script(d);
    });
    expect(own.screen(4).messages.map((m) => m.text)).toEqual(['Oi', 'Pai?', 'Estou indo']);
  });

  it('lets an app show a network error its own way', () => {
    class Quiet extends MessengerApp {
      errors: string[] = [];
      override onNetworkError(error: { event: PhoneEvent; state: PhoneState }): PhoneState {
        this.errors.push(error.event.type);
        return error.state;
      }
    }
    const app = new Quiet();
    const events: PhoneEvent[] = [{ t: 0, type: 'setup', data: { chats } }, { t: 1, type: 'message', data: { from: 'me', text: 'Oi?' } }];
    const state = app.state(events, 2, () => false);
    expect(app.errors).toEqual(['message']);
    expect(state.messages).toHaveLength(1);
  });
});
