// Step 2: render the Three.js scene frame-by-frame in headless Chromium and mux with the ElevenLabs audio.
//   node src/render.mjs <project>                 -> out/<project>/video.mp4
//   node src/render.mjs <project> --stills 2,6,14 -> out/<project>/still_<t>.png (quick visual check)
//   node src/render.mjs <project> --workers 4     -> parallel browsers; measured SLOWER here (SwiftShader already uses all cores per frame), kept for machines with a GPU
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const project = process.argv[2];
if (!project || project.startsWith('--')) throw new Error('usage: node src/render.mjs <project> [--stills t1,t2,...]');
const OUT = `out/${project}`;
const FPS = 30, ENV_FPS = 30, TAIL = 1.2;
const timeline = JSON.parse(readFileSync(`${OUT}/timeline.json`, 'utf8'));
const total = timeline.duration + TAIL;
const argv = process.argv;
const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const WORKERS = Number(arg('--workers') || 1), SLICE = arg('--slice'); // --slice i/n: this process renders frames i, i+n, i+2n... to disk
const FRAMES = `${OUT}/frames`;
const NFRAMES = Math.ceil(total * FPS);

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

// audio graph: narration + (looped) background bed + timed sound effects
function audioArgs() {
  const sfx = timeline.sfx ?? [], f = total.toFixed(2);
  const inputs = ['-i', `${OUT}/narration.mp3`, '-stream_loop', '-1', '-i', `${OUT}/ambience.mp3`, ...sfx.flatMap((fx) => ['-i', `${OUT}/${fx.file}`])];
  const graph = [
    `[1:a]apad=pad_dur=${TAIL}[nar]`,
    `[2:a]atrim=0:${f},asetpts=N/SR/TB,afade=t=in:d=1.5,afade=t=out:st=${(total - 2).toFixed(2)}:d=2,volume=${process.env.BED_VOLUME || 0.28}[bed]`,
    ...sfx.map((fx, i) => `[${i + 3}:a]adelay=${Math.round(fx.at * 1000)}|${Math.round(fx.at * 1000)},volume=${fx.volume}[fx${i}]`),
    `[nar][bed]${sfx.map((_, i) => `[fx${i}]`).join('')}amix=inputs=${2 + sfx.length}:duration=longest:normalize=0,atrim=0:${f}[aout]`,
  ].join(';');
  return { inputs, graph, f };
}
const encodeArgs = (f) => ['-map', '0:v', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-t', f, '-movflags', '+faststart', `${OUT}/video.mp4`];

// Parallel mode: the supervisor starts one worker process per slice (each its own browser), then muxes the frames on disk.
if (WORKERS > 1 && !SLICE && !argv.includes('--stills')) {
  mkdirSync(FRAMES, { recursive: true });
  const t0 = Date.now();
  const codes = await Promise.all(Array.from({ length: WORKERS }, (_, i) => new Promise((resolve) => {
    const w = spawn(process.execPath, [argv[1], project, '--slice', `${i}/${WORKERS}`], { stdio: ['ignore', 'inherit', 'inherit'], env: process.env });
    w.on('close', resolve);
  })));
  if (codes.some((c) => c !== 0)) throw new Error(`worker failed: ${codes}`);
  const got = readdirSync(FRAMES).length;
  if (got !== NFRAMES) throw new Error(`expected ${NFRAMES} frames, found ${got}`);
  const { inputs, graph, f } = audioArgs();
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', `${FRAMES}/%05d.jpg`, ...inputs, '-filter_complex', graph, ...encodeArgs(f)], { stdio: 'inherit' });
  const code = await new Promise((r) => ff.on('close', r));
  console.log(`rendered ${NFRAMES} frames with ${WORKERS} workers in ${((Date.now() - t0) / 1000).toFixed(0)}s, ffmpeg exit ${code}`);
  rmSync(FRAMES, { recursive: true, force: true }); server.close(); process.exit(code);
}

// --gpu: use the machine's real GPU (new headless mode, hardware ANGLE backend). Default: software GL (SwiftShader), which works anywhere.
// Untested on real hardware so far (the cloud container has no GPU); use --check-gpu to see which renderer WebGL picked.
const GPU = process.argv.includes('--gpu') || process.argv.includes('--check-gpu');
const ANGLE = { win32: 'd3d11', darwin: 'metal', linux: 'vulkan' }[process.platform];
const browser = await chromium.launch(GPU
  ? { channel: process.env.CHROMIUM_CHANNEL || 'chromium', executablePath: process.env.CHROMIUM_PATH || undefined, args: [`--use-angle=${ANGLE}`, '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-webgl'] }
  : { executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
if (process.argv.includes('--check-gpu')) {
  const p = await browser.newPage();
  const info = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const d = gl && gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'no WebGL2'; });
  console.log('WebGL renderer:', info, /swiftshader|software|llvmpipe/i.test(info) ? '  <-- NOT using the GPU' : '  <-- GPU OK');
  await browser.close(); process.exit(0);
}
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
} else if (SLICE) {
  // worker: render every n-th frame to disk
  const [k, n] = SLICE.split('/').map(Number), t0 = Date.now();
  for (let i = k; i < NFRAMES; i += n) {
    await page.evaluate((t) => window.renderAt(t), i / FPS);
    await page.screenshot({ type: 'jpeg', quality: 95, path: `${FRAMES}/${String(i + 1).padStart(5, '0')}.jpg` });
    if (i % (n * 30) === k) console.log(`worker ${k}: frame ${i}/${NFRAMES}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
} else {
  // Resumable: frames are written to disk (atomically) and skipped when already present, so a restart loses almost nothing.
  mkdirSync(FRAMES, { recursive: true });
  const file = (i) => `${FRAMES}/${String(i + 1).padStart(5, '0')}.jpg`;
  const t0 = Date.now(); let done = 0;
  for (let i = 0; i < NFRAMES; i++) {
    if (existsSync(file(i))) continue;
    await page.evaluate((t) => window.renderAt(t), i / FPS);
    writeFileSync(`${file(i)}.tmp`, await page.screenshot({ type: 'jpeg', quality: 95 }));
    renameSync(`${file(i)}.tmp`, file(i)); done++;
    if (done % 30 === 1) console.log(`frame ${i}/${NFRAMES}  (${done} new, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  const { inputs, graph, f } = audioArgs();
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', `${FRAMES}/%05d.jpg`, ...inputs, '-filter_complex', graph, ...encodeArgs(f)], { stdio: 'inherit' });
  const code = await new Promise((r) => ff.on('close', r));
  console.log('ffmpeg exit', code);
}
await browser.close();
server.close();
