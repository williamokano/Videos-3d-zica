#!/usr/bin/env node
/**
 * Render an episode to MP4: headless browsers draw the episode frame by frame and ffmpeg encodes them.
 *
 *   npm run render -- --series ceu-vermelho --ep 1
 *
 * Every frame is a pure function of its time, so the episode is cut into stretches drawn side by side, each
 * by its own browser into its own piece of video, and the pieces are joined at the end without re-encoding.
 *
 * Options:
 *   --series <id>   series folder (default: the first one)
 *   --ep <n>        episode number (default: the first one)
 *   --from <s>      start at this second (default 0)
 *   --to <s>        stop at this second (default: the end)
 *   --scale <k>     picture size relative to the bible's format, e.g. 0.5 for a quick preview (default 1)
 *   --out <file>    output file (default out/<series>-ep<n>.mp4)
 *   --workers <n>   browsers drawing at the same time (default: half the CPU cores, at most 8)
 *   --software      draw on the CPU even if there is a GPU
 *   --step <n>      draw one frame in every n and slow the video down to match: a quick animatic (default 1)
 *   --no-subs       leave the subtitles of spoken lines out
 *   --crf <n>       x264 quality, lower is better (default 18)
 *
 * Needs ffmpeg on the PATH and a Chrome: CHROME_PATH, an installed Google Chrome, or Playwright's Chromium.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { availableParallelism } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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
const crf = String(option('crf', 18));
const workersWanted = Math.max(1, Math.round(Number(option('workers', Math.min(8, Math.floor(availableParallelism() / 2))))));

// No reloads: a file saved in the middle of a render must not change or break the frames being drawn.
const server = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/?${query}`;

// With a GPU, Chrome uses it; without one it falls back to drawing on the CPU.
const gl = flag('software') ? ['--use-gl=swiftshader'] : ['--ignore-gpu-blocklist', '--enable-gpu'];
const launchOptions = { args: [...gl, '--enable-unsafe-swiftshader', '--hide-scrollbars'] };
if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
async function launch() {
  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    try {
      return await chromium.launch({ ...launchOptions, channel: 'chrome' });
    } catch {
      throw new Error(`Não achei um Chrome para abrir. Instale o Google Chrome ou aponte CHROME_PATH para o executável.\n${error.message}`);
    }
  }
}

const browsers = [];
const encoders = [];
let scratch;
let finished = false;
async function cleanUp() {
  for (const ffmpeg of encoders) if (ffmpeg.exitCode === null) ffmpeg.kill('SIGKILL');
  await Promise.allSettled(browsers.map((b) => b.close()));
  await server.close();
  if (scratch) rmSync(scratch, { recursive: true, force: true });
}
async function stop(message) {
  if (finished) return;
  finished = true;
  console.error(`\n${message}`);
  await cleanUp();
  process.exit(1);
}
process.on('SIGINT', () => stop('Render interrompido.'));

/** Open the episode in a fresh browser, at the final size, ready to draw frames. */
async function openStage() {
  const browser = await launch();
  browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('pageerror', (error) => problems.push(`Erro na página: ${error.message}`));
  page.on('crash', () => problems.push('A página do navegador travou.'));
  await page.goto(url);
  await page.waitForFunction(() => window.__render, null, { timeout: 120000 });
  const info = await page.evaluate(() => ({ ...window.__render, frame: undefined }));
  await page.setViewportSize({ width: info.width, height: info.height });
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  const clip = { x: 0, y: 0, width: info.width, height: info.height, scale: 1 };
  return {
    info,
    problems,
    /** The picture of frame n, as PNG. The capture waits for the frame just drawn to be on screen. */
    async draw(n) {
      await page.evaluate((frame) => window.__render.frame(frame, false), n);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip, optimizeForSpeed: true });
      return Buffer.from(data, 'base64');
    },
  };
}

/** An x264 encoder taking PNG frames on stdin. */
function encoder(file, fps) {
  const ffmpeg = spawn(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      // x264 wants even sizes.
      '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', file],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  encoders.push(ffmpeg);
  ffmpeg.on('error', () => stop('Não achei o ffmpeg. Instale-o e deixe no PATH.'));
  const done = new Promise((ok) => ffmpeg.on('close', ok));
  return {
    async write(picture) {
      if (!ffmpeg.stdin.write(picture)) await new Promise((drained) => ffmpeg.stdin.once('drain', drained));
    },
    async end() {
      ffmpeg.stdin.end();
      const code = await done;
      if (code !== 0) throw new Error(`O ffmpeg terminou com erro (código ${code}) ao gravar ${file}.`);
    },
  };
}

try {
  const firstStage = await openStage();
  const { info } = firstStage;
  if (info.error) throw new Error(`O episódio tem erro e não foi renderizado:\n${info.error}`);
  if (!info.frames) throw new Error('Esta série não tem episódio para renderizar.');

  const first = Math.max(0, Math.round(Number(option('from', 0)) * info.fps));
  const last = Math.min(info.frames, option('to') ? Math.round(Number(option('to')) * info.fps) : info.frames);
  if (last <= first) throw new Error('"--to" precisa ser maior que "--from".');
  const frames = [];
  for (let n = first; n < last; n += step) frames.push(n);
  const workers = Math.min(workersWanted, frames.length);
  const out = resolve(option('out', `out/${info.series}-ep${info.episode}.mp4`));
  mkdirSync(dirname(out), { recursive: true });
  // Next to the output, so the finished video moves into place in one step.
  scratch = mkdtempSync(join(dirname(out), '.render-'));

  console.log(`Placa de vídeo: ${info.gpu}`);
  console.log(`${frames.length} frames de ${info.width}x${info.height} a ${info.fps} fps, ${workers} em paralelo → ${out}`);

  // Contiguous stretches, one per browser, so the pieces join in order.
  const size = Math.ceil(frames.length / workers);
  const stretches = Array.from({ length: workers }, (_, k) => frames.slice(k * size, (k + 1) * size)).filter((s) => s.length);
  const pieces = stretches.map((_, k) => join(scratch, `parte-${String(k).padStart(3, '0')}.mp4`));

  let drawn = 0;
  const started = Date.now();
  const report = () => {
    const seconds = (Date.now() - started) / 1000;
    const rate = drawn / seconds;
    process.stdout.write(`\r${drawn}/${frames.length} frames · ${rate.toFixed(1)} frames/s · faltam ${Math.round((frames.length - drawn) / rate)} s   `);
  };
  const ticker = setInterval(report, 1000);

  await Promise.all(
    stretches.map(async (stretch, k) => {
      const stage = k === 0 ? firstStage : await openStage();
      const video = encoder(pieces[k], info.fps / step);
      for (const n of stretch) {
        if (stage.problems.length) throw new Error(stage.problems.join('\n'));
        await video.write(await stage.draw(n));
        drawn++;
      }
      await video.end();
    }),
  );
  clearInterval(ticker);
  report();

  // Join the pieces without re-encoding; the result goes in place only once it is whole.
  const list = join(scratch, 'partes.txt');
  writeFileSync(list, pieces.map((p) => `file '${p}'`).join('\n'));
  const joined = join(scratch, 'final.mp4');
  const code = await new Promise((ok) => {
    const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', joined], { stdio: 'inherit' });
    encoders.push(ffmpeg);
    ffmpeg.on('close', ok);
  });
  if (code !== 0) throw new Error('O ffmpeg não conseguiu juntar as partes do vídeo.');
  renameSync(joined, out);
  const minutes = (Date.now() - started) / 60000;
  console.log(`\nPronto em ${minutes >= 1 ? `${minutes.toFixed(1)} min` : `${Math.round(minutes * 60)} s`}: ${out}`);
  finished = true;
  await cleanUp();
  process.exit(0);
} catch (error) {
  await stop(`Render não concluído: ${error instanceof Error ? error.message : String(error)}`);
}
