import { censorProblem, type Censor } from '../censor';
import { registerAction } from './catalog';

registerAction({
  id: 'censor',
  description:
    'Censura um lugar da cena na imagem final, por "duration" segundos: "tarja" (retângulo preto) ou "mosaico" (quadriculado). "at" é o ponto [x, y, z] e "size" o tamanho em metros; a cobertura acompanha a câmera. Para o que a história precisa mostrar que aconteceu sem mostrar (um golpe, um ferimento).',
  appliesTo: ['world'],
  params: {
    at: { type: 'point3', description: 'o ponto coberto [x, y, z]', required: true },
    size: { type: 'number', description: 'altura da cobertura, em metros (padrão 0.6)' },
    mode: { type: 'string', description: '"tarja" (preta) ou "mosaico" (quadriculado, padrão)' },
  },
  duration: 1,
  compile(ctx) {
    const censor: Censor = { at: ctx.params.at as Censor['at'], size: (ctx.params.size as number | undefined) ?? 0.6, mode: (ctx.params.mode as Censor['mode'] | undefined) ?? 'mosaico' };
    const problem = censorProblem(censor);
    if (problem) ctx.fail(problem);
    return { writes: [], events: [{ type: 'censor', data: { ...censor } }] };
  },
});
