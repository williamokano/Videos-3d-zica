#!/usr/bin/env node
/**
 * Render an episode to MP4: a headless browser draws the episode frame by frame and ffmpeg encodes them.
 *
 *   npm run render -- --series ceu-vermelho --ep 1
 *
 * Options:
 *   --series <id>   series folder (default: the first one)
 *   --ep <n>        episode number (default: the first one)
 *   --from <s>      start at this second (default 0)
 *   --to <s>        stop at this second (default: the end)
 *   --scale <k>     picture size relative to the bible's format, e.g. 0.5 for a quick preview (default 1)
 *   --out <file>    output file (default out/<series>-ep<n>.mp4)
 *   --software      draw on the CPU even if there is a GPU
 *   --step <n>      draw one frame in every n and slow the video down to match: a quick animatic (default 1)
 *   --no-subs       leave the subtitles of spoken lines out
 *   --crf <n>       x264 quality, lower is better (default 18)
 *
 * Needs ffmpeg on the PATH and a Chrome: CHROME_PATH, an installed Google Chrome, or Playwright's Chromium.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);
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
if (!chromium) fail('Falta o Playwright. Rode "npm install" (instala o playwright-core).');

const scale = Number(option('scale', 1));
const query = new URLSearchParams({ render: String(scale) });
if (option('series')) query.set('series', option('series'));
if (option('ep')) query.set('ep', option('ep'));
if (flag('no-subs')) query.set('subs', '0');
const step = Math.max(1, Math.round(Number(option('step', 1))));

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();

// With a GPU, Chrome uses it; without one it falls back to drawing on the CPU.
const gl = flag('software') ? ['--use-gl=swiftshader'] : ['--ignore-gpu-blocklist', '--enable-gpu'];
const launch = { args: [...gl, '--enable-unsafe-swiftshader', '--hide-scrollbars'] };
if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
let browser;
try {
  browser = await chromium.launch(launch);
} catch (error) {
  try {
    browser = await chromium.launch({ ...launch, channel: 'chrome' });
  } catch {
    await server.close();
    fail(`Não achei um Chrome para abrir. Instale o Google Chrome ou aponte CHROME_PATH para o executável.\n${error.message}`);
  }
}

let ffmpeg;
const stop = async (code, message) => {
  if (message) console.error(message);
  ffmpeg?.kill();
  await browser.close();
  await server.close();
  process.exit(code);
};

const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => console.error(`Erro na página: ${error.message}`));
await page.goto(`http://127.0.0.1:${port}/?${query}`);
await page.waitForFunction(() => window.__render, null, { timeout: 120000 });
const info = await page.evaluate(() => ({ ...window.__render, frame: undefined, title: document.title }));
if (info.error) await stop(1, `O episódio tem erro e não foi renderizado:\n${info.error}`);
if (!info.frames) await stop(1, 'Esta série não tem episódio para renderizar.');
await page.setViewportSize({ width: info.width, height: info.height });
await page.evaluate(() => document.fonts.ready);

const first = Math.max(0, Math.round(Number(option('from', 0)) * info.fps));
const last = Math.min(info.frames, option('to') ? Math.round(Number(option('to')) * info.fps) : info.frames);
if (last <= first) await stop(1, '"--to" precisa ser maior que "--from".');
const out = resolve(option('out', `out/${info.series}-ep${info.episode}.mp4`));
mkdirSync(dirname(out), { recursive: true });

console.log(`Placa de vídeo: ${info.gpu}`);
const total = Math.ceil((last - first) / step);
console.log(`${total} frames de ${info.width}x${info.height} a ${info.fps} fps → ${out}`);

ffmpeg = spawn(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(info.fps / step), '-i', '-',
    // x264 wants even sizes.
    '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(option('crf', 18)), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);
ffmpeg.on('error', () => stop(1, 'Não achei o ffmpeg. Instale-o e deixe no PATH.'));
const encoded = new Promise((done) => ffmpeg.on('close', done));

const started = Date.now();
for (let n = first; n < last; n += step) {
  await page.evaluate((frame) => window.__render.frame(frame), n);
  const picture = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: info.width, height: info.height } });
  if (!ffmpeg.stdin.write(picture)) await new Promise((drained) => ffmpeg.stdin.once('drain', drained));
  const done = (n - first) / step + 1;
  if (done % 10 === 0 || done === total) {
    const each = (Date.now() - started) / done;
    process.stdout.write(`\r${done}/${total} frames · ${(each / 1000).toFixed(2)} s por frame · faltam ${Math.round((each * (total - done)) / 1000)} s   `);
  }
}
ffmpeg.stdin.end();
const code = await encoded;
console.log(code === 0 && existsSync(out) ? `\nPronto: ${out}` : '\nO ffmpeg terminou com erro.');
await browser.close();
await server.close();
process.exit(code ?? 1);
