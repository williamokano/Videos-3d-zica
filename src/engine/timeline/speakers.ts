/**
 * The name a speaker gets on screen. Extras keep a unique id (their voice and takes hang on it) but the audience
 * only needs "Soldado", not "Soldado 3": the number shows up only when two people of the same name talk in the
 * same conversation, so the viewer can tell them apart.
 */

/** One spoken line: who says it, and when. */
export interface SpokenLine {
  /** Who speaks: one key per person (two keys with the same name are two people). */
  speaker: string;
  /** The name written for the speaker in the cast (may carry a number, "Soldado 3"). */
  name: string;
  t: number;
  end: number;
}

/** Lines closer than this (s) belong to the same conversation. */
export const CONVERSATION_GAP = 12;

/** "Soldado 3" → "Soldado", "Guarda da porta 1" → "Guarda da porta". */
export function baseName(name: string): string {
  return name.replace(/\s+\d+$/, '').trim() || name;
}

/**
 * The on-screen name of each line, in the order given. A speaker is called by the base name, unless another
 * speaker with the same base name talks in the same conversation: then each of them gets a number, in the
 * order they first speak there (Soldado 1 is whoever speaks first).
 */
export function speakerLabels(lines: readonly SpokenLine[]): string[] {
  const order = lines.map((_, i) => i).sort((a, b) => lines[a].t - lines[b].t);
  const labels: string[] = new Array(lines.length);
  let group: number[] = [];
  let reach = -Infinity;
  const close = (): void => {
    const first = new Map<string, string[]>(); // base name → speakers in order of first line
    for (const i of group) {
      const base = baseName(lines[i].name);
      const who = first.get(base) ?? [];
      if (!who.includes(lines[i].speaker)) who.push(lines[i].speaker);
      first.set(base, who);
    }
    for (const i of group) {
      const base = baseName(lines[i].name);
      const who = first.get(base)!;
      labels[i] = who.length > 1 ? `${base} ${who.indexOf(lines[i].speaker) + 1}` : base;
    }
    group = [];
  };
  for (const i of order) {
    if (group.length && lines[i].t - reach > CONVERSATION_GAP) close();
    group.push(i);
    reach = Math.max(reach, lines[i].end);
  }
  close();
  return labels;
}
