/**
 * What a phone shows. The screen at any instant is a pure function of the phone's events up to then and of
 * whether it has signal, so scrubbing the timeline shows the same thing as playing up to that frame.
 *
 * An app turns events into a picture. The messenger below is the built-in one; a series can register its own,
 * or extend `MessengerApp` and override `onNetworkError` to show a lost connection its own way.
 */

export interface PhoneEvent {
  t: number;
  type: string;
  data: Record<string, unknown>;
}

export interface ChatMessage {
  from: 'me' | 'them';
  text?: string;
  /** A picture message: any caption-like label; the picture itself is drawn from `colors`. */
  image?: { label?: string; colors?: [string, string] };
  /** Clock time shown in the bubble, e.g. "10:42". */
  time?: string;
  /** Starts a new day: a separator with this label goes above, e.g. "Ontem". */
  day?: string;
}

export interface Chat {
  id: string;
  /** Contact name, shown large at the top. */
  name: string;
  /** Contact picture: a color and, by default, the initial of the name. */
  avatar?: { color?: string; text?: string };
  /** Messages already there when the episode starts. */
  history?: ChatMessage[];
}

export interface PhoneSetup {
  /** Clock on the status bar, e.g. "10:42". */
  clock?: string;
  /** Name of the app to show (default "messenger"). */
  app?: string;
  chats?: Chat[];
  /** Chat open on the screen (default: the first). */
  open?: string;
  /** Color of the owner's own bubbles. */
  accent?: string;
}

/** A message on the screen, with when it showed up and what became of it. */
export interface ShownMessage extends ChatMessage {
  /** Seconds since it appeared; Infinity for history. */
  age: number;
  /** Not sent for lack of signal. */
  failed?: boolean;
}

export interface PhoneState {
  setup: PhoneSetup;
  chat?: Chat;
  messages: ShownMessage[];
  /** Seconds the other side has been typing, or -1. */
  typing: number;
  network: boolean;
  /** Screen lit. */
  on: boolean;
  t: number;
}

/** What went wrong for lack of signal: an event that needed the network and when. */
export interface NetworkError {
  event: PhoneEvent;
  state: PhoneState;
}

export interface PhoneApp {
  /** Fold the phone's events up to time t into what is on the screen. `network(time)` says if there was signal. */
  state(events: PhoneEvent[], t: number, network: (time: number) => boolean): PhoneState;
  draw(g: CanvasRenderingContext2D, width: number, height: number, state: PhoneState): void;
  /** Whether the picture is still moving at this state (so it must be drawn again next frame). */
  animating(state: PhoneState): boolean;
}

const apps = new Map<string, () => PhoneApp>();

/** Register a phone app. Check `listPhoneApps()` before creating a new one. */
export function registerPhoneApp(id: string, create: () => PhoneApp): void {
  apps.set(id, create);
}
export function listPhoneApps(): string[] {
  return [...apps.keys()];
}
export function createPhoneApp(id = 'messenger'): PhoneApp {
  const create = apps.get(id);
  if (!create) throw new Error(`App de celular desconhecido: "${id}". Existem: ${[...apps.keys()].join(', ')}.`);
  return create();
}

const APPEAR = 0.28;
const ease = (u: number): number => {
  const v = Math.max(0, Math.min(1, u));
  return 1 - (1 - v) * (1 - v);
};

/**
 * Instant messenger: contact on top, received messages on the left, the owner's on the right, a box to type in
 * at the bottom. New messages push the older ones up. Events: `setup` (PhoneSetup), `open` ({ chat }),
 * `message` ({ chat?, from, text?, image? }), `typing` ({ on }), `screen` ({ on }).
 */
export class MessengerApp implements PhoneApp {
  /**
   * Something needed the network and there was none. The default: a message of the owner stays on the screen
   * marked as not sent, a message from the other side never arrives, and "typing…" goes away.
   * Override to show it another way; return the state to use.
   */
  onNetworkError(error: NetworkError): PhoneState {
    const { event, state } = error;
    if (event.type === 'message' && event.data.from === 'me') {
      state.messages.push({ ...(event.data as unknown as ChatMessage), age: state.t - event.t, failed: true });
    }
    if (event.type === 'typing') state.typing = -1;
    return state;
  }

  state(events: PhoneEvent[], t: number, network: (time: number) => boolean): PhoneState {
    let state: PhoneState = { setup: {}, messages: [], typing: -1, network: network(t), on: true, t };
    let typingSince = -1;
    const open = (id?: string) => {
      state.chat = state.setup.chats?.find((c) => c.id === id) ?? state.setup.chats?.[0];
      state.messages = (state.chat?.history ?? []).map((m) => ({ ...m, age: Infinity }));
    };
    for (const event of events) {
      if (event.t > t) break;
      const online = network(event.t);
      if (event.type === 'setup') {
        state.setup = event.data as PhoneSetup;
        open(state.setup.open);
      } else if (event.type === 'open') {
        open(event.data.chat as string);
      } else if (event.type === 'screen') {
        state.on = Boolean(event.data.on);
      } else if (event.type === 'message') {
        if (event.data.chat && event.data.chat !== state.chat?.id) continue;
        if (!online) {
          state = this.onNetworkError({ event, state });
          continue;
        }
        state.messages.push({ ...(event.data as unknown as ChatMessage), age: t - event.t });
        if (event.data.from === 'them') typingSince = -1;
      } else if (event.type === 'typing') {
        if (event.data.on && !online) {
          state = this.onNetworkError({ event, state });
          continue;
        }
        typingSince = event.data.on ? event.t : -1;
      }
    }
    state.typing = typingSince >= 0 ? t - typingSince : -1;
    // Losing the signal in the middle of "typing…" ends it.
    if (state.typing >= 0 && !state.network) state = this.onNetworkError({ event: { t, type: 'typing', data: { on: true } }, state });
    return state;
  }

  animating(state: PhoneState): boolean {
    return state.on && (state.typing >= 0 || state.messages.some((m) => m.age < APPEAR + 0.1));
  }

  draw(g: CanvasRenderingContext2D, w: number, h: number, state: PhoneState): void {
    const u = w / 720;
    const font = (px: number, weight = 400) => `${weight} ${Math.round(px * u)}px "Helvetica Neue", Arial, "Liberation Sans", sans-serif`;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#05070a';
    g.fillRect(0, 0, w, h);
    if (!state.on) return;
    const accent = state.setup.accent ?? '#2f7df6';

    // Chat area.
    const top = 250 * u;
    const bottom = h - 150 * u;
    g.fillStyle = '#e9edf2';
    g.fillRect(0, top, w, bottom - top);

    // Lay the rows out from the bottom up, so the newest is always in view.
    type Row = { height: number; show: number; paint(y: number, show: number): void };
    const rows: Row[] = [];
    const pad = 26 * u;
    const maxText = w * 0.7;
    const lineHeight = 60 * u;
    const wrap = (text: string): string[] => {
      const lines: string[] = [];
      let line = '';
      for (const word of text.split(/\s+/)) {
        const trial = line ? `${line} ${word}` : word;
        if (line && g.measureText(trial).width > maxText) {
          lines.push(line);
          line = word;
        } else line = trial;
      }
      if (line) lines.push(line);
      return lines;
    };
    const bubble = (x: number, y: number, bw: number, bh: number, color: string, mine: boolean) => {
      g.fillStyle = color;
      g.beginPath();
      const r = 30 * u;
      g.roundRect(x, y, bw, bh, mine ? [r, r, 8 * u, r] : [r, r, r, 8 * u]);
      g.fill();
    };

    for (const m of state.messages) {
      if (m.day) {
        rows.push({
          show: 1,
          height: 96 * u,
          paint: (y) => {
            g.font = font(30, 600);
            const tw = g.measureText(m.day!).width + 48 * u;
            g.fillStyle = '#cfd6df';
            g.beginPath();
            g.roundRect((w - tw) / 2, y + 22 * u, tw, 52 * u, 26 * u);
            g.fill();
            g.fillStyle = '#4a5563';
            g.textAlign = 'center';
            g.fillText(m.day!, w / 2, y + 59 * u);
          },
        });
      }
      const mine = m.from === 'me';
      g.font = font(48, 500);
      const lines = m.text ? wrap(m.text) : [];
      const picture = m.image ? 300 * u : 0;
      const textWidth = Math.max(0, ...lines.map((l) => g.measureText(l).width));
      const bw = Math.max(textWidth, m.image ? 380 * u : 0, 150 * u) + pad * 2;
      const bh = picture + lines.length * lineHeight + pad * 2 + 30 * u;
      const show = ease(m.age / APPEAR);
      rows.push({
        show,
        height: (bh + 18 * u) * show,
        paint: (y, shown) => {
          const x = mine ? w - bw - 24 * u : 24 * u;
          g.globalAlpha = shown;
          bubble(x, y, bw, bh, m.failed ? '#f3c9c4' : mine ? accent : '#ffffff', mine);
          let ty = y + pad;
          if (m.image) {
            const [a, b] = m.image.colors ?? ['#7fb4e8', '#f2d49b'];
            const grad = g.createLinearGradient(0, ty, 0, ty + picture);
            grad.addColorStop(0, a);
            grad.addColorStop(1, b);
            g.fillStyle = grad;
            g.beginPath();
            g.roundRect(x + pad, ty, bw - pad * 2, picture - 14 * u, 16 * u);
            g.fill();
            ty += picture;
          }
          g.font = font(48, 500);
          g.textAlign = 'left';
          g.fillStyle = mine && !m.failed ? '#ffffff' : '#111820';
          lines.forEach((line, i) => g.fillText(line, x + pad, ty + 46 * u + i * lineHeight));
          g.font = font(26);
          g.textAlign = 'right';
          g.fillStyle = m.failed ? '#b3261e' : mine ? 'rgba(255,255,255,0.8)' : '#7a8594';
          g.fillText(m.failed ? 'Não enviada  !' : (m.time ?? ''), x + bw - pad, y + bh - 16 * u);
          g.globalAlpha = 1;
        },
      });
    }
    if (state.typing >= 0) {
      const show = ease(state.typing / APPEAR);
      rows.push({
        show,
        height: 118 * u * show,
        paint: (y, shown) => {
          g.globalAlpha = shown;
          bubble(24 * u, y, 190 * u, 100 * u, '#ffffff', false);
          // One dot, two, three, and again.
          const lit = 1 + (Math.floor(state.typing / 0.35) % 3);
          for (let i = 0; i < 3; i++) {
            g.fillStyle = i < lit ? '#5b6675' : '#d5dbe3';
            g.beginPath();
            g.arc((24 + 55 + i * 40) * u, y + 50 * u, 13 * u, 0, Math.PI * 2);
            g.fill();
          }
          g.globalAlpha = 1;
        },
      });
    }
    g.save();
    g.beginPath();
    g.rect(0, top, w, bottom - top);
    g.clip();
    let y = bottom - 14 * u;
    for (let i = rows.length - 1; i >= 0 && y > top - 400 * u; i--) {
      y -= rows[i].height;
      rows[i].paint(y, rows[i].show);
    }
    g.restore();

    // Header: status bar, then the contact.
    g.fillStyle = '#12202f';
    g.fillRect(0, 0, w, top);
    g.fillStyle = '#ffffff';
    g.font = font(30, 600);
    g.textAlign = 'left';
    g.fillText(state.setup.clock ?? '', 34 * u, 52 * u);
    g.textAlign = 'right';
    if (state.network) {
      for (let i = 0; i < 4; i++) g.fillRect(w - (190 - i * 16) * u, (52 - 8 - i * 7) * u, 10 * u, (8 + i * 7) * u);
    } else {
      g.fillStyle = '#ff8a80';
      g.fillText('Sem rede', w - 110 * u, 52 * u);
    }
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3 * u;
    g.strokeRect(w - 92 * u, 28 * u, 52 * u, 26 * u);
    g.fillRect(w - 87 * u, 33 * u, 34 * u, 16 * u);
    if (state.chat) {
      const cy = 160 * u;
      g.fillStyle = state.chat.avatar?.color ?? '#c7884f';
      g.beginPath();
      g.arc(92 * u, cy, 58 * u, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.font = font(60, 700);
      g.textAlign = 'center';
      g.fillText(state.chat.avatar?.text ?? state.chat.name.slice(0, 1).toUpperCase(), 92 * u, cy + 21 * u);
      g.textAlign = 'left';
      g.font = font(70, 700);
      g.fillText(state.chat.name, 178 * u, cy + 8 * u);
      g.font = font(30);
      g.fillStyle = '#9fb3c8';
      g.fillText(!state.network ? 'aguardando rede…' : state.typing >= 0 ? 'digitando…' : 'online', 180 * u, cy + 54 * u);
    }

    // Box to type in.
    g.fillStyle = '#ffffff';
    g.fillRect(0, bottom, w, h - bottom);
    g.fillStyle = '#eef1f5';
    g.beginPath();
    g.roundRect(24 * u, bottom + 28 * u, w - 170 * u, 94 * u, 47 * u);
    g.fill();
    g.fillStyle = '#8a94a3';
    g.font = font(40);
    g.textAlign = 'left';
    g.fillText('Mensagem', 62 * u, bottom + 90 * u);
    g.fillStyle = accent;
    g.beginPath();
    g.arc(w - 76 * u, bottom + 75 * u, 47 * u, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(w - 94 * u, bottom + 50 * u);
    g.lineTo(w - 48 * u, bottom + 75 * u);
    g.lineTo(w - 94 * u, bottom + 100 * u);
    g.closePath();
    g.fill();
  }
}

registerPhoneApp('messenger', () => new MessengerApp());
