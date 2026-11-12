#!/usr/bin/env node
/**
 * Look at an episode at a few instants, as pictures: to see where things are before (and after) writing a scene.
 *
 *   npm run look -- --series ceu-vermelho --ep 1 --t 10,12.5,30
 *   npm run look -- --ep 1 --t 8 --view 20,9,-3:20,0,-3:60:0     (a free camera: pos : lookAt : fov : level)
 *
 * Without --view, each picture is what the episode camera shows. With --view, a camera placed by hand; the
 * optional level (e.g. 0 or -3) hides what is above that floor and its ceilings, for a dollhouse view from above.
 * Several --view can be given; each time is drawn from each view.
 *
 * Options:
 *   --t <s,s,...>   seconds to draw (default 0)
 *   --view <...>    pos x,y,z : lookAt x,y,z [: fov [: level]]  (repeatable)
 *   --scale <k>     picture size relative to the bible's format (default 0.5)
 *   --wide          a 16:9 picture instead of the bible's format (for free views of a whole floor)
 *   --out <dir>     folder for the pictures (default: <base>/<series>/ep001/quadros, see scripts/paths.mjs)
 *   --dir <folder>  base folder for the outputs, instead of out/
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { episodeFolder } from './paths.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const options = (name) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] !== undefined ? [args[i + 1]] : []));
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const require = createRequire(import.meta.url);
let chromium;
for (const name of ['playwright', 'playwright-core']) {
  try {
    ({ chromium } = require(name));
    break;
  } catch {
    // Try the next one.
  }
}
if (!chromium) fail('Falta o Playwright. Rode "npm install".');

const triple = (text) => {
  const v = text.split(',').map(Number);
  if (v.length !== 3 || v.some((n) => !Number.isFinite(n))) fail(`Ponto inválido "${text}": use x,y,z.`);
  return v;
};
const views = options('view').map((text) => {
  const [pos, lookAt, fov, level] = text.split(':');
  if (!lookAt) fail(`--view precisa de pos:lookAt, e veio "${text}".`);
  return { pos: triple(pos), lookAt: triple(lookAt), fov: fov ? Number(fov) : undefined, level: level !== undefined && level !== '' ? Number(level) : undefined };
});
const times = String(option('t', '0')).split(',').map(Number);
const scale = Number(option('scale', 0.5));

const query = new URLSearchParams({ render: String(scale) });
if (option('series')) query.set('series', option('series'));
if (option('ep')) query.set('ep', option('ep'));

const server = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/?${query}`;
const launchOptions = { args: ['--ignore-gpu-blocklist', '--enable-gpu', '--enable-unsafe-swiftshader', '--hide-scrollbars'] };
if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
let browser;
try {
  browser = await chromium.launch(launchOptions);
} catch {
  browser = await chromium.launch({ ...launchOptions, channel: 'chrome' });
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('pageerror', (error) => problems.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__render, null, { timeout: 120000 });
  const info = await page.evaluate(() => ({ ...window.__render, frame: undefined }));
  if (info.error) console.warn(`O episódio tem erro:\n${info.error}`);
  const outDir = resolve(option('out', join(episodeFolder(info.series, info.episode, { dir: option('dir'), output: info.output }), 'quadros')));
  mkdirSync(outDir, { recursive: true });
  const wide = args.includes('--wide');
  const size = wide ? { width: Math.round(1280 * scale * 1.5), height: Math.round(720 * scale * 1.5) } : { width: info.width, height: info.height };
  await page.setViewportSize(size);
  if (wide) await page.evaluate(({ width, height }) => {
    document.body.style.setProperty('--frame-w', `${width}px`);
    document.body.style.setProperty('--frame-h', `${height}px`);
    window.dispatchEvent(new Event('resize'));
  }, size);
  await page.evaluate(() => document.fonts.ready);
  const written = [];
  for (const t of times) {
    const frame = Math.min(info.frames - 1, Math.max(0, Math.round(t * info.fps)));
    for (const [k, view] of (views.length ? views : [undefined]).entries()) {
      await page.evaluate(([n, v]) => window.__render.frame(n, true, v), [frame, view]);
      const name = `${info.series}-ep${info.episode}-t${t.toFixed(2)}${view ? `-v${k}` : ''}.png`;
      const file = join(outDir, name);
      writeFileSync(file, await page.screenshot({ clip: { x: 0, y: 0, ...size } }));
      written.push(file);
    }
  }
  if (problems.length) console.warn(problems.join('\n'));
  console.log(`Duração do episódio: ${(info.frames / info.fps).toFixed(2)} s`);
  console.log(written.join('\n'));
} finally {
  await browser.close();
  await server.close();
}
