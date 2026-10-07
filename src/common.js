// Helpers shared by the browser-side scenes (procedural textures, easing).
import * as THREE from 'three';

export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const hash = (x, y, seed) => {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// fbm that wraps horizontally so spherical textures have no seam
export function fbm(u, v, seed, scale, oct = 5) {
  let sum = 0, amp = 0.5, tot = 0;
  for (let o = 0; o < oct; o++) {
    const f = scale * 2 ** o;
    const a = vnoise(u * f, v * f, seed + o), b = vnoise((u - 1) * f, v * f, seed + o);
    sum += (a * (1 - u) + b * u) * amp; tot += amp; amp *= 0.5;
  }
  return sum / tot;
}
export const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
export const smooth = (u) => u * u * (3 - 2 * u);
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;

export function makeTexture(w, h, fn, { repeat } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a = 255] = fn(x / w, y / h);
    const i = (y * w + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}

export function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.35)');
  g.addColorStop(0.6, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// Vertical-gradient sky dome. stops: [[0..1 from horizon-up, '#hex'], ...] (0 = horizon, 1 = zenith)
export function skyDome(stops, radius = 900) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const ctx = c.getContext('2d'), g = ctx.createLinearGradient(0, 512, 0, 0);
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2 + 0.25),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
}
