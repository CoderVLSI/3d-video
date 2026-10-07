// Step 2: render the Three.js scene frame-by-frame in headless Chromium and mux with the ElevenLabs audio.
//   node src/render.mjs <project>                 -> out/<project>/video.mp4
//   node src/render.mjs <project> --stills 2,6,14 -> out/<project>/still_<t>.png (quick visual check)
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const project = process.argv[2];
if (!project || project.startsWith('--')) throw new Error('usage: node src/render.mjs <project> [--stills t1,t2,...]');
const OUT = `out/${project}`;
const FPS = 30, ENV_FPS = 30, TAIL = 1.2;
const timeline = JSON.parse(readFileSync(`${OUT}/timeline.json`, 'utf8'));
const total = timeline.duration + TAIL;

// Amplitude envelope of the narration (RMS per frame, normalised) so the 3D scene can react to the voice.
function envelope() {
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', `${OUT}/narration.mp3`, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  const s = new Int16Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + (pcm.length & ~1))), raw = [];
  for (let f = 0; ; f++) { // 8000 / ENV_FPS is fractional, so derive integer sample bounds per frame
    const a = Math.floor((f * 8000) / ENV_FPS), b = Math.floor(((f + 1) * 8000) / ENV_FPS);
    if (b > s.length) break;
    let sum = 0; for (let j = a; j < b; j++) sum += (s[j] / 32768) ** 2;
    raw.push(Math.sqrt(sum / (b - a)));
  }
  const ref = [...raw].sort((a, b) => a - b)[Math.floor(raw.length * 0.95)] || 1;
  const norm = raw.map((v) => Math.min(1, v / ref));
  if (norm.some((v) => !Number.isFinite(v))) throw new Error('envelope contains non-finite values');
  return norm.map((v, i) => (v + (norm[i - 1] ?? v) + (norm[i + 1] ?? v)) / 3); // light smoothing
}
const env = envelope();
writeFileSync(`${OUT}/envelope.json`, JSON.stringify(env));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const p = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const body = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/projects/${project}/scene.html`);
await page.waitForFunction('window.__ready === true', null, { timeout: 120000 });
await page.evaluate(([tl, e, f, tot]) => window.initScene(tl, e, f, tot), [timeline, env, ENV_FPS, total]);

const stillsArg = process.argv.indexOf('--stills');
if (stillsArg > -1) {
  for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
    await page.evaluate((t) => window.renderAt(t), t);
    await page.screenshot({ path: `${OUT}/still_${t}.png` });
    console.log('still', t);
  }
} else {
  const n = Math.ceil(total * FPS);
  // audio graph: narration + (looped) background bed + timed sound effects
  const sfx = timeline.sfx ?? [];
  const inputs = ['-i', `${OUT}/narration.mp3`, '-stream_loop', '-1', '-i', `${OUT}/ambience.mp3`, ...sfx.flatMap((fx) => ['-i', `${OUT}/${fx.file}`])];
  const f = total.toFixed(2);
  const graph = [
    `[1:a]apad=pad_dur=${TAIL}[nar]`,
    `[2:a]atrim=0:${f},asetpts=N/SR/TB,afade=t=in:d=1.5,afade=t=out:st=${(total - 2).toFixed(2)}:d=2,volume=${process.env.BED_VOLUME || 0.28}[bed]`,
    ...sfx.map((fx, i) => `[${i + 3}:a]adelay=${Math.round(fx.at * 1000)}|${Math.round(fx.at * 1000)},volume=${fx.volume}[fx${i}]`),
    `[nar][bed]${sfx.map((_, i) => `[fx${i}]`).join('')}amix=inputs=${2 + sfx.length}:duration=longest:normalize=0,atrim=0:${f}[aout]`,
  ].join(';');
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', ...inputs,
    '-filter_complex', graph,
    '-map', '0:v', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-t', f, '-movflags', '+faststart', `${OUT}/video.mp4`,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r) => ff.on('close', r));
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => window.renderAt(t), i / FPS);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 30 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  const code = await done;
  console.log('ffmpeg exit', code);
}
await browser.close();
server.close();
