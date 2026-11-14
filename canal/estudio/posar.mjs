#!/usr/bin/env node
/**
 * Pictures of characters for the channel's art (canal/): the showcase (vitrine) stage with the sky,
 * floor and stools hidden, over flat chroma green, so canal/estudio/arte.py can cut them out.
 *
 *   node canal/estudio/posar.mjs --series davi-e-golias --ids davi --pose sling --expr happy \
 *     --cam 0,1.4,4:0,1,0:30 --size 1080x1920 --out out/canal/davi.png
 *
 * Options: --ids a,b (they stand in a row, as in the showcase), --pose <showcase pose>, --expr <expression>,
 * --cam pos:lookAt[:fov], --orbit <degrees> (turns the characters), --t <s> (time of the pose), --size WxH.
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
const { chromium } = createRequire(import.meta.url)('playwright-core');
const [w, h] = option('size', '1080x1920').split('x').map(Number);
const query = new URLSearchParams({ vitrine: 'personagens', series: option('series', 'davi-e-golias'), so: option('ids', 'davi') });

const server = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const launch = { args: ['--ignore-gpu-blocklist', '--enable-gpu', '--enable-unsafe-swiftshader', '--hide-scrollbars'] };
const browser = await chromium.launch({ ...launch, channel: 'chrome' }).catch(() => chromium.launch(launch));
try {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.warn(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?${query}`);
  await page.waitForFunction(() => window.__vitrine, null, { timeout: 120000 });
  await page.addStyleTag({ content: '#panel, #hint, .nameplate { display: none !important; } #stage, body { margin: 0 !important; }' });
  const info = await page.evaluate(async ([pose, expr, cam, orbit, t, style]) => {
    const v = window.__vitrine;
    if (style) v.setStyle(style);
    v.select(null);
    if (pose) v.setPose(pose);
    if (expr) v.setExpression(expr, 1);
    v.pause(Number(t));
    const cast = v.cast().map((c) => c.object);
    const scene = cast[0].parent;
    const keep = new Set(cast);
    // Hide what is not a character and casts no light: sky, floor, stools.
    for (const child of scene.children) {
      if (keep.has(child)) continue;
      if (child.isMesh) child.visible = false;
      child.traverse?.((o) => {
        if (o.isMesh || o.isPoints || o.isSprite) o.visible = false;
      });
    }
    let color;
    cast[0].traverse((o) => {
      if (!color && o.material?.color) color = o.material.color.clone();
    });
    scene.background = color.setRGB(0, 1, 0);
    scene.fog = null;
    if (orbit) for (const c of cast) c.rotation.y += (Number(orbit) * Math.PI) / 180;
    if (cam) {
      const [pos, look, fov] = cam.split(':');
      v.camera.position.set(...pos.split(',').map(Number));
      v.orbit.target.set(...look.split(',').map(Number));
      if (fov) v.camera.fov = Number(fov);
      v.camera.updateProjectionMatrix();
      v.orbit.update();
    }
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 400))));
    return cast.map((c) => c.position.toArray());
  }, [option('pose'), option('expr'), option('cam'), option('orbit'), option('t', '1.2'), option('style', 'cel')]);
  console.log('posições', JSON.stringify(info));
  const out = resolve(option('out', 'out/canal/pose.png'));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, await page.locator('canvas').first().screenshot());
  console.log(out);
} finally {
  await browser.close();
  await server.close();
}
