import { NARRATOR, type Take } from '../audio/voice';
import { lineMouth } from './character';
import { registerAction } from './catalog';

registerAction({
  id: 'narrate',
  description: 'O narrador fala, sem corpo: a voz da bíblia (audio.narrator) e a legenda. Dura o que a gravação durar (ou conforme o texto, sem gravação).',
  appliesTo: ['world'],
  params: {
    text: { type: 'string', description: 'o que o narrador diz', required: true },
    tone: { type: 'string', description: 'tom da voz (não aparece na legenda)' },
    take: { type: 'data', description: 'a gravação (posta pelo roteiro)' },
  },
  duration: 1,
  compile(ctx) {
    const text = ctx.params.text as string;
    const take = ctx.params.take as Take | undefined;
    const { duration } = lineMouth(text, take);
    return { duration, writes: [], events: [{ type: 'line', data: { text, duration, take: take?.key, speaker: NARRATOR } }] };
  },
});

registerAction({
  id: 'sound',
  description: 'Toca um som da bíblia (audio.sounds) pelo nome. Um som em loop (ambiente) toca por "length" segundos, com entrada e saída suaves.',
  appliesTo: ['world'],
  params: {
    name: { type: 'string', description: 'nome do som em audio.sounds da bíblia', required: true },
    volume: { type: 'number', description: '0 a 1 e acima (padrão: o da bíblia, ou 1)' },
    length: { type: 'number', description: 'som em loop: quantos segundos toca' },
    fade: { type: 'number', description: 'segundos de entrada e saída (padrão 0, ou 1 em loop)' },
  },
  duration: 0,
  compile(ctx) {
    const { name, volume, length, fade } = ctx.params as { name: string; volume?: number; length?: number; fade?: number };
    return { writes: [], events: [{ type: 'sound', data: { name, volume, length, fade: fade ?? (length ? 1 : 0) } }] };
  },
});
