import type { CastMember } from '../../src/engine/character/cast';
import { extraLook } from '../../src/engine/character/extras';
import type { Actor, Director } from '../../src/engine/timeline/direct';

/*
 * O que os dois episódios de Davi e Golias dividem: onde fica cada coisa no vale de Elá
 * (world/vale-de-ela.json, gerado por world/gerar-vale.py) e quem são os soldados das duas filas.
 *
 * Eixos: x leste, z sul. Israel no monte norte (z negativo), filisteus no monte sul. yaw 0 olha para o
 * norte, 180 para o sul.
 */

/** Altura do topo plano dos dois montes (onde ficam as filas e os acampamentos). */
export const TOPO = 9;
/** Linha de frente de cada exército (|z|), na beira do topo. */
export const LINHA = 35.5;
/** O leito do riacho, no fundo do vale. */
export const LEITO = -0.9;
/** A tenda do rei Saul: centro, com a entrada aberta para o sul. */
export const TENDA: [number, number] = [0, -45];

/** Os irmãos do Davi na fila de Israel, olhando para o vale. */
export const IRMAOS = { sama: [2.2, -LINHA], eliabe: [4.4, -LINHA], abinadabe: [6.6, -LINHA] } as const;

const PELE = ['#e6ad82', '#c98b5e', '#d79a6c', '#a86f48', '#efc29a', '#b97d52'];
const CABELO = ['#2c1d18', '#3a2618', '#4a3020', '#1d1512', '#5a3a22'];
/** Túnicas da tropa: cores de pano tingido à mão, uma por figurante. */
const TUNICAS: Record<string, string[]> = {
  soldado: ['#7d8a96', '#8a6f4e', '#6f7a52', '#a08a62', '#5f6a74', '#94683f', '#77684f'],
  filisteu: ['#9a2f24', '#b0472c', '#7d2a22', '#a8562e', '#8c3a2c'],
};
const CAPACETE: Record<string, object> = {
  soldado: { id: 'bronzeHelmet', color: '#7a5233', accent: '#4e331f' },
  filisteu: { id: 'plumedHelmet', color: '#e8dcb8', accent: '#3d5c8a' },
};

/** Um figurante da fila: a ficha de soldado com rosto, barba e cor de túnica sorteados. */
function figurante(id: string, character: string, at: [number, number], yaw: number, seed: number, name: string): CastMember {
  const look = extraLook(seed, { adult: true });
  return {
    id, character, at, yaw,
    look: {
      ...look, name,
      skin: PELE[seed % PELE.length], shirt: PELE[seed % PELE.length], pants: PELE[seed % PELE.length], shoes: PELE[seed % PELE.length],
      hair: CABELO[seed % CABELO.length], hairStyle: 'short', glasses: 'none',
      beard: (['full', 'goatee', 'stubble', 'full'] as const)[seed % 4],
      wear: [{ id: 'tunic', color: TUNICAS[character][seed % TUNICAS[character].length], accent: '#4b3a2a' }, CAPACETE[character] as { id: string }, 'sandals'],
    },
  };
}

/** A fila de Israel: duas fileiras, com um vão no meio (|x| < 1.5) por onde o Davi passa. */
export function filaDeIsrael(): CastMember[] {
  const frente = [-13.2, -11, -8.8, -6.6, -4.4, -2.2, 8.8, 11, 13.2];
  const tras = [-7.7, -5.5, -3.3, 9.9, 12.1];
  return [
    ...frente.map((x, i) => figurante(`israel-${i + 1}`, 'soldado', [x, -LINHA], 180, 11 + i * 7, `Soldado ${i + 1}`)),
    ...tras.map((x, i) => figurante(`israel-${frente.length + i + 1}`, 'soldado', [x, -LINHA - 1.9], 180, 91 + i * 5, `Soldado ${frente.length + i + 1}`)),
  ];
}

/** A fila dos filisteus, do outro lado do vale, olhando para o norte. */
export function filaFilisteia(): CastMember[] {
  return [-11, -8.8, -6.6, -4.4, -2.2, 0, 2.2, 4.4, 6.6, 8.8, 11].map((x, i) => figurante(`filisteu-${i + 1}`, 'filisteu', [x, LINHA], 0, 301 + i * 9, `Filisteu ${i + 1}`));
}

/** Uma roda de soldados conversando em volta de uma fogueira do acampamento. */
export function rodaDaFogueira(prefixo: string, centro: [number, number], seed: number): CastMember[] {
  return [0, 1, 2].map((k) => {
    const a = (k / 3) * Math.PI * 2 + 0.4;
    const at: [number, number] = [centro[0] + Math.cos(a) * 1.5, centro[1] + Math.sin(a) * 1.5];
    // De frente para o fogo.
    const yaw = (Math.atan2(at[0] - centro[0], at[1] - centro[1]) * 180) / Math.PI;
    return figurante(`${prefixo}-${k + 1}`, 'soldado', at, yaw, seed + k * 13, `Soldado da fogueira ${k + 1}`);
  });
}

/** Ids de um grupo de figurantes. */
export const ids = (members: CastMember[]): string[] => members.map((m) => m.id!);

/** Todos prestam atenção em alguém (ou algo), com a cara que a cena pede. */
export function atentos(d: Director, quem: string[], alvo: string, mood: 'calm' | 'worried' | 'scared' | 'happy'): void {
  for (const id of quem) d.actor(id).behave('attend', { object: alvo, mood });
}

/** Um grupo inteiro se encolhe de medo (ou volta ao normal, com amount 0), cada um num instante um pouco diferente. */
export function encolhem(d: Director, quem: string[], amount: number): void {
  d.background(() => {
    quem.forEach((id, i) => {
      d.background(() => {
        d.wait((i % 5) * 0.08);
        d.do(id, 'move', { name: 'cower', amount: amount * (0.6 + (i % 3) * 0.2) }, { duration: 0.5 });
      });
    });
  });
}

/** Atalho para o ator. */
export const quem = (d: Director, id: string): Actor => d.actor(id);
