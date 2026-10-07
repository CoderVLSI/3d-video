import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const W = 1280, H = 720;

// ---------- deterministic helpers ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const hash = (x, y, seed) => {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// fbm that wraps horizontally so the planet texture has no seam
function fbm(u, v, seed, scale, oct = 5) {
  let sum = 0, amp = 0.5, tot = 0;
  for (let o = 0; o < oct; o++) {
    const f = scale * 2 ** o;
    const a = vnoise(u * f, v * f, seed + o), b = vnoise((u - 1) * f, v * f, seed + o);
    sum += (a * (1 - u) + b * u) * amp; tot += amp; amp *= 0.5;
  }
  return sum / tot;
}
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
function makeTexture(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a = 255] = fn(x / w, y / h);
    const i = (y * w + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const smooth = (u) => u * u * (3 - 2 * u);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02020a);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1200);

const composer = new EffectComposer(renderer);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.85, 0.7, 0.55);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// stars
{
  const r = rng(7), n = 3500, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = 250 + r() * 250, s = Math.sqrt(1 - u * u);
    pos.set([rad * s * Math.cos(th), rad * u, rad * s * Math.sin(th)], i * 3);
    const k = 0.6 + r() * 0.4, warm = r();
    col.set([k * (0.85 + 0.15 * warm), k * 0.9, k * (1 - 0.2 * warm)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true })));
}

// soft glow texture (sun halo, nebula clouds)
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.35)');
  g.addColorStop(0.6, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
})();
function glow(color, scale, opacity, at) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  s.scale.setScalar(scale); s.position.set(...at); scene.add(s); return s;
}
// nebula
glow(0x5b2a9a, 380, 0.22, [-160, 60, -300]);
glow(0x1d5fb4, 420, 0.2, [220, -80, -330]);
glow(0x9a2a6a, 300, 0.14, [40, 140, -380]);

// sun
const SUN_R = 2.6;
const sunTex = makeTexture(512, 256, (u, v) => {
  const n = fbm(u, v, 3, 6, 5), m = fbm(u, v, 9, 14, 4);
  const t = clamp01(n * 1.3 + m * 0.4 - 0.15);
  const c = mix([225, 80, 8], [255, 190, 80], t);
  return c.map((x) => x * 0.9);
});
const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 64, 48), new THREE.MeshBasicMaterial({ map: sunTex }));
scene.add(sun);
const halo1 = glow(0xff9a3c, 17, 0.55, [0, 0, 0]);
const halo2 = glow(0xffd9a0, 8, 0.4, [0, 0, 0]);
scene.add(new THREE.AmbientLight(0x1a2240, 0.9));
const sunLight = new THREE.PointLight(0xfff0d8, 520, 0, 1.6);
scene.add(sunLight);

// planets
const PLANETS = {
  A: { r: 0.65, orbit: 8.5, speed: 0.46, phase: 0.6, tilt: 0.1,
    tex: makeTexture(512, 256, (u, v) => { const n = fbm(u, v, 21, 7); return mix([120, 60, 35], [225, 150, 90], clamp01((n - 0.3) * 2.2)); }) },
  B: { r: 0.95, orbit: 13, speed: 0.31, phase: 2.5, tilt: 0.4,
    tex: makeTexture(512, 256, (u, v) => {
      const n = fbm(u, v, 5, 5), pole = smooth(clamp01((Math.abs(v - 0.5) - 0.38) / 0.1));
      const land = n > 0.5 ? mix([45, 110, 55], [150, 135, 90], clamp01((n - 0.5) * 4)) : mix([12, 40, 110], [30, 95, 170], n * 2);
      return mix(land, [240, 245, 255], pole);
    }) },
  C: { r: 1.35, orbit: 19, speed: 0.2, phase: 4.2, tilt: 0.45, ring: true,
    tex: makeTexture(512, 256, (u, v) => {
      const band = Math.sin(v * 38 + fbm(u, v, 2, 4, 4) * 5) * 0.5 + 0.5;
      return mix([176, 128, 82], [236, 208, 160], band * 0.85 + fbm(u, v, 4, 10, 3) * 0.15);
    }) },
  D: { r: 0.55, orbit: 25, speed: 0.13, phase: 5.6, tilt: 0.2,
    tex: makeTexture(512, 256, (u, v) => { const n = fbm(u, v, 41, 8); return mix([150, 200, 235], [235, 250, 255], clamp01(n * 1.6 - 0.2)); }) },
};
const bodies = {};
for (const [id, p] of Object.entries(PLANETS)) {
  const grp = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 48, 32), new THREE.MeshStandardMaterial({ map: p.tex, roughness: 0.85, metalness: 0 }));
  mesh.rotation.z = p.tilt; grp.add(mesh);
  if (p.ring) {
    const inner = p.r * 1.45, outer = p.r * 2.6, rg = new THREE.RingGeometry(inner, outer, 128, 1);
    const pos = rg.attributes.position, uv = rg.attributes.uv, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5); }
    const ringTex = makeTexture(512, 4, (u) => {
      const n = vnoise(u * 60, 0.5, 8) * 0.6 + vnoise(u * 160, 0.5, 9) * 0.4;
      const edge = smooth(clamp01(u * 8)) * smooth(clamp01((1 - u) * 6)), gap = u > 0.55 && u < 0.62 ? 0.15 : 1;
      return [225, 210, 185, 255 * edge * gap * clamp01(0.25 + n * 0.9)];
    });
    const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false }));
    ring.rotation.x = Math.PI / 2; mesh.add(ring);
  }
  scene.add(grp);
  // orbit line
  const pts = []; for (let i = 0; i <= 192; i++) { const a = (i / 192) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit)); }
  scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x6f8fcf, transparent: true, opacity: 0.22 })));
  bodies[id] = { grp, mesh, p };
}
const planetPos = (id, t, out = new THREE.Vector3()) => {
  const p = PLANETS[id], a = p.phase + p.speed * t;
  return out.set(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit);
};

// voice ring: bars driven by the real narration amplitude
const BARS = 96, RING_R = 5.6;
const barMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 1, 0.1), new THREE.MeshBasicMaterial({ color: 0x7fd6ff }), BARS);
scene.add(barMesh);
const dummy = new THREE.Object3D();

// ---------- camera path ----------
const abs = (x, y, z) => ({ abs: [x, y, z] });
const rel = (id, x, y, z) => ({ rel: id, off: [x, y, z] });
// planet-relative in a sun-facing frame: x = sideways, y = up, z = toward the sun (so the planet is lit from the camera's side)
const lit = (id, side, up, toSun) => ({ lit: id, off: [side, up, toSun] });
const KEYS = [
  { t: 0.0, pos: abs(0, 26, 62), look: abs(0, 0, 0) },
  { t: 4.0, pos: abs(-6, 14, 34), look: abs(0, 0, 0) },
  { t: 5.0, pos: abs(7, 3.5, 11), look: abs(0, 0, 0) },
  { t: 8.1, pos: abs(3, 1.2, 8.5), look: abs(0, 0, 0) },
  { t: 9.6, pos: abs(-12, 7, 22), look: abs(0, 0, 0) },
  { t: 12.6, pos: abs(8, 48, 18), look: abs(0, 0, 0) },
  { t: 13.4, pos: lit('C', 6, 5.5, 8), look: rel('C', 0, 0, 0) },
  { t: 16.8, pos: lit('C', -6, 3, 7), look: rel('C', 0, 0, 0) },
  { t: 18.0, pos: abs(-4, 9, 30), look: abs(0, 0, 0) },
  { t: 21.0, pos: abs(-16, 11, 27), look: abs(0, 0, 0) },
  { t: 99, pos: abs(14, 17, 52), look: abs(0, 0, 0) },
];
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
function resolve(spec, t, out) {
  if (spec.abs) return out.set(...spec.abs);
  if (spec.lit) {
    planetPos(spec.lit, t, out);
    const toSun = _b.copy(out).negate().normalize(), side = _c.set(0, 1, 0).cross(toSun).normalize();
    const [sx, up, sz] = spec.off;
    return out.addScaledVector(side, sx).addScaledVector(_c.set(0, 1, 0), up).addScaledVector(toSun, sz);
  }
  planetPos(spec.rel, t, out); return out.add(_b.set(...spec.off));
}
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function placeCamera(t) {
  let i = KEYS.findIndex((k) => k.t > t) - 1;
  if (i < 0) i = KEYS.length - 2;
  const k0 = KEYS[i], k1 = KEYS[i + 1], u = smooth(clamp01((t - k0.t) / (k1.t - k0.t)));
  camPos.copy(resolve(k0.pos, t, _a)).lerp(resolve(k1.pos, t, new THREE.Vector3()), u);
  camLook.copy(resolve(k0.look, t, _a)).lerp(resolve(k1.look, t, new THREE.Vector3()), u);
  camPos.x += Math.sin(t * 0.7) * 0.15; camPos.y += Math.cos(t * 0.55) * 0.12; // gentle handheld drift
  camera.position.copy(camPos); camera.lookAt(camLook);
}

// ---------- captions ----------
const capEl = document.getElementById('cap'), titleEl = document.getElementById('title');
let timeline, envelope, FPS_ENV = 30, lastCapKey = '';
function captions(t) {
  const s = timeline.sentences.find((s) => t >= s.start - 0.15 && t <= s.end + 0.45);
  if (!s) { if (lastCapKey) { capEl.innerHTML = ''; lastCapKey = ''; } return; }
  const on = s.words.map((w) => (t >= w.start ? 1 : 0)).join('');
  const key = s.start + on;
  if (key === lastCapKey) return;
  lastCapKey = key;
  capEl.innerHTML = s.words.map((w, i) => `<span class="${on[i] === '1' ? 'on' : ''}">${w.text}</span>`).join(' ');
}
function title(t) {
  const fadeIn = clamp01((t - 17.2) / 0.8), fadeOut = clamp01((t - 0.0) / 0.01);
  let o = 0, txt = '';
  if (t < 4.0) { o = Math.min(clamp01(t / 0.8), clamp01((4.0 - t) / 0.6)); txt = 'A Tiny Solar System'; }
  else if (t > 17.2) { o = fadeIn; txt = 'Voice by ElevenLabs · 3D by Three.js'; }
  titleEl.textContent = txt; titleEl.style.opacity = o;
}
const envAt = (t) => {
  const x = t * FPS_ENV, i = Math.floor(x), f = x - i;
  const a = envelope[i] ?? 0, b = envelope[i + 1] ?? 0;
  return a + (b - a) * f;
};

// ---------- frame ----------
function renderAt(t) {
  const env = envAt(t);
  placeCamera(t);
  for (const [id, b] of Object.entries(bodies)) {
    planetPos(id, t, b.grp.position);
    b.mesh.rotation.y = t * (0.5 + b.p.speed * 2);
  }
  sun.rotation.y = t * 0.08;
  const pulse = 1 + env * 0.06;
  sun.scale.setScalar(pulse);
  halo1.scale.setScalar(17 + env * 3.5); halo2.scale.setScalar(8 + env * 1.8);
  sunLight.intensity = 520 * (0.96 + env * 0.1);
  // voice ring
  const vis = 0.5 + 0.5 * smooth(clamp01((t - 3.0) / 1.5));
  for (let i = 0; i < BARS; i++) {
    const a = (i / BARS) * Math.PI * 2 + t * 0.12;
    const wob = 0.55 + 0.45 * Math.sin(i * 1.7 + t * 6.3) * Math.sin(i * 0.43 - t * 2.1);
    const h = 0.08 + env * 2.6 * Math.abs(wob) * vis;
    dummy.position.set(Math.cos(a) * RING_R, 0, Math.sin(a) * RING_R);
    dummy.rotation.set(0, -a, 0);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix(); barMesh.setMatrixAt(i, dummy.matrix);
  }
  barMesh.instanceMatrix.needsUpdate = true;
  bloom.strength = 0.6 + env * 0.2;
  captions(t); title(t);
  composer.render();
}

window.initScene = (tl, env, fps) => { timeline = tl; envelope = env; FPS_ENV = fps; lastCapKey = ''; return true; };
window.renderAt = renderAt;
window.__ready = true;
