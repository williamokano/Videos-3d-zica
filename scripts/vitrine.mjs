#!/usr/bin/env node
/**
 * A picture of a showcase page, to look at characters and assets outside an episode.
 *
 *   npm run vitrine -- --personagens --series demo-acoes                 everybody of the series
 *   npm run vitrine -- --personagens --series demo-acoes --id policial   one character, close
 *   npm run vitrine -- --assets --grupo vehicle                           a group of assets
 *   npm run vitrine -- --assets --grupo vehicle --id vehicle.bus --set frontDoor.open=1
 *
 * Options: --style cel|soft, --pose <name> (characters), --orbit <degrees> to look from another side,
 * --out <file> (default out/vitrine/<what>.png).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const options = (name) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] !== undefined ? [args[i + 1]] : []));
const { chromium } = createRequire(import.meta.url)('playwright-core');
const characters = args.includes('--personagens');
const query = new URLSearchParams({ vitrine: characters ? 'personagens' : 'assets' });
if (option('series')) query.set('series', option('series'));
if (option('grupo')) query.set('grupo', option('grupo'));

const server = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const launch = { args: ['--ignore-gpu-blocklist', '--enable-gpu', '--enable-unsafe-swiftshader', '--hide-scrollbars'] };
const browser = await chromium.launch({ ...launch, channel: 'chrome' }).catch(() => chromium.launch(launch));
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?${query}`);
  const handle = characters ? '__vitrine' : '__assets';
  await page.waitForFunction((h) => window[h], handle, { timeout: 120000 });
  await page.evaluate(async ([h, id, style, pose, sets, orbit, isCharacters]) => {
    const v = window[h];
    if (style) v.setStyle(style);
    if (isCharacters && pose) v.setPose(pose);
    if (id) v.select(id);
    for (const pair of sets) {
      const [channel, value] = pair.split('=');
      v.set(id, channel, Number(value));
    }
    if (isCharacters) v.pause(1.2);
    if (orbit) {
      // Turn the camera round what it looks at.
      const a = (Number(orbit) * Math.PI) / 180;
      const [c, t] = [v.camera.position, v.orbit.target];
      const [dx, dz] = [c.x - t.x, c.z - t.z];
      c.set(t.x + dx * Math.cos(a) - dz * Math.sin(a), c.y, t.z + dx * Math.sin(a) + dz * Math.cos(a));
      v.orbit.update();
    }
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 300))));
  }, [handle, option('id') ?? null, option('style') ?? null, option('pose') ?? null, options('set'), option('orbit') ?? null, characters]);
  const out = resolve(option('out', `out/vitrine/${characters ? 'personagens' : option('grupo', 'assets')}${option('id') ? `-${option('id')}` : ''}.png`));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, await page.locator('canvas').first().screenshot());
  if (problems.length) console.warn(problems.join('\n'));
  console.log(out);
} finally {
  await browser.close();
  await server.close();
}
