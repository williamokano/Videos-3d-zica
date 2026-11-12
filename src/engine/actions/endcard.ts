import { endCardProblem, type EndCard } from '../ui/endcard';
import { registerAction } from './catalog';

registerAction({
  id: 'endCard',
  description: 'Mostra a tela final por cima da imagem: uma pergunta ("title"), de 2 a 6 opções ("options", cada uma com "label" e, se quiser, "icon" e "color") e uma chamada para comentar ("cta"). Fica na tela por "duration" segundos.',
  appliesTo: ['world'],
  params: {
    card: { type: 'data', description: '{ "title": "...", "options": [{ "label": "..." }, ...], "cta": "..." }', required: true },
  },
  duration: 6,
  compile(ctx) {
    const card = ctx.params.card as EndCard;
    const problem = endCardProblem(card);
    if (problem) ctx.fail(problem);
    return { writes: [], events: [{ type: 'endCard', data: { card } }] };
  },
});
