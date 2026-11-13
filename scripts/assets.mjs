#!/usr/bin/env node
/**
 * The catalog of assets with the actions that make sense for each, written to docs/ASSETS.md from the engine
 * itself, so the list is never out of date by hand.
 *
 *   npm run assets
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
try {
  await server.ssrLoadModule('/src/engine/assets/index.ts');
  const { assetGroups, assetActions } = await server.ssrLoadModule('/src/engine/assets/showcase.ts');
  const { listWearables } = await server.ssrLoadModule('/src/engine/character/wear.ts');
  const out = ['# Assets e o que cada um faz', '', 'Gerado por `npm run assets` a partir do catálogo do motor. Não edite à mão.', '', 'Todo asset com `id` no local (ou em `props` do episódio) também aceita `moveTo` (levar a outro ponto) e `set` (qualquer canal). Os que não têm ação própria são cenário.', ''];
  for (const group of assetGroups()) {
    out.push(`## ${group.id}`, '');
    for (const asset of group.assets) {
      const { actions, channels } = assetActions(asset.id);
      out.push(`### \`${asset.id}\``, '', asset.description, '');
      if (actions.length) for (const a of actions) out.push(`- **${a.action}**: ${a.what}`);
      else out.push('- Cenário: sem ação própria.');
      if (channels.length) out.push(`- Canais: ${channels.map((c) => `\`${c}\``).join(', ')}`);
      out.push('');
    }
  }
  out.push('## Roupas e acessórios (`wear` na ficha do personagem)', '');
  for (const w of listWearables()) out.push(`- \`${w.id}\`: ${w.description}`);
  out.push('', '## Janelas (`frame` numa abertura, ou `windows` no local)', '', '- `fixed`, `sliding`, `tilt`, `casement`, `louver`, `blinds`: todas com o canal `open`, movido por **open / close** (a `fixed` não se mexe).', '');
  const file = resolve('docs/ASSETS.md');
  writeFileSync(file, out.join('\n'));
  console.log(file);
} finally {
  await server.close();
}
