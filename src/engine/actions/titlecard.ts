import { titleCardProblem, type TitleCard } from '../ui/titlecard';
import { registerAction } from './catalog';

registerAction({
  id: 'titleCard',
  description: 'Mostra a tela de abertura da série por cima da imagem: o nome ("title"), uma linha embaixo ("subtitle") e o episódio ("episode"). Entra linha a linha e sai toda junta depois de "duration" segundos.',
  appliesTo: ['world'],
  params: {
    card: { type: 'data', description: '{ "title": "DAVI", "subtitle": "...", "episode": "Episódio 1 · ..." }', required: true },
  },
  duration: 3.5,
  compile(ctx) {
    const card = ctx.params.card as TitleCard;
    const problem = titleCardProblem(card);
    if (problem) ctx.fail(problem);
    return { writes: [], events: [{ type: 'titleCard', data: { card } }] };
  },
});
