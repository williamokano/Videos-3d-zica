import { registerAction } from './catalog';

registerAction({
  id: 'screen',
  description: 'Algo acontece na tela de um celular: "setup" (contatos e histórico), "open" (abre uma conversa), "message" (chega ou sai uma mensagem), "typing" (o outro lado está digitando), "screen" (liga ou apaga). O app do celular decide como mostrar.',
  appliesTo: ['phone'],
  params: {
    event: { type: 'string', description: 'tipo do evento: setup, open, message, typing, screen', required: true },
    data: { type: 'data', description: 'dados do evento, ex.: { "from": "them", "text": "Oi" } numa mensagem' },
  },
  duration: 0,
  compile: (ctx) => ({ writes: [], events: [{ type: ctx.params.event as string, data: (ctx.params.data as Record<string, unknown> | undefined) ?? {} }] }),
});
