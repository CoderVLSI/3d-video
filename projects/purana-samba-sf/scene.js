import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { rng, fbm, mix, makeTexture, smooth, clamp01, lerp, glowTexture, skyDome } from '/src/common.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { loadRigged, makeActor } from '/src/rigged.js';

const W = 1280, H = 720;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(50, W / H, 0.2, 4000);
const composer = new EffectComposer(renderer); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.4, 0.6, 0.92); composer.addPass(bloom);
composer.addPass(new OutputPass());
const glowTex = glowTexture();
const glowSprite = (parent, color, scale, opacity, at = [0, 0, 0]) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(scale); s.position.set(...at); parent.add(s); return s;
};

// ---------------- characters (stand-ins until dedicated models exist) ----------------
const [baliGLB, guruGLB] = await Promise.all([loadRigged('bali'), loadRigged('shukracharya')]);
const samba = makeActor(baliGLB);     // the prince
const durvasa = makeActor(guruGLB);   // the sage
const surya = makeActor(baliGLB);     // the sun god: same figure, rendered as a golden luminous being
surya.divine(0xe8a838, 0.55);
const SH = 2.0, DH = 2.3;             // heights
const faceTo = (root, x, z) => { root.rotation.y = Math.atan2(x - root.position.x, z - root.position.z); };

// Sketchfab props (see docs/sketchfab-credits.md): scaled to a target height, centred on x/z, base on y=0.
const loadProp = async (file, height, tint, dropBase = false) => {
  const g = (await new GLTFLoader().loadAsync(`/assets/models/sf/${file}`)).scene, holder = new THREE.Group(); holder.add(g);
  const size = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()); g.scale.setScalar(height / size.y); g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()); g.position.set(-c.x, -box.min.y, -c.z);
  const all = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()), flat = [];
  g.traverse((o) => { // drop flat display plates that ship with some scans
    if (!o.isMesh) return; const b = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    if (b.y < 0.04 * all.y && Math.max(b.x, b.z) > 0.8 * Math.max(all.x, all.z)) flat.push(o);
    else if (dropBase && b.y < 0.12 * all.y && Math.max(b.x, b.z) > 0.45 * all.y * 0.35) { const bb = new THREE.Box3().setFromObject(o); if (bb.max.y < 0.14 * all.y + new THREE.Box3().setFromObject(g).min.y) flat.push(o); }
  });
  flat.forEach((o) => o.parent.remove(o));
  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material) { o.material = o.material.clone(); o.material.side = THREE.DoubleSide; if (tint) o.material.color.set(tint); } } });
  return holder;
};
const [gopuramM, templeM, suryaM, krishnaM, sunM, vaidyaAM, vaidyaBM] = await Promise.all([loadProp('gopuram.glb', 17, 0xffd9a0), loadProp('temple.glb', 11, 0xffe6c8), loadProp('surya_statue.glb', 1.9), loadProp('krishna_nb.glb', 2.35), loadProp('sun_face.glb', 6), loadProp('vaidya_a.glb', 2.0), loadProp('vaidya_b.glb', 1.95)]);
const dup = (o) => SkeletonUtils.clone(o);

// ---------------- set A: Dwaraka plaza ----------------
const A = new THREE.Group(); scene.add(A);
A.add(skyDome([[0, '#ffd9a0'], [0.2, '#8fc3ee'], [1, '#3a78c8']]));
const stone = makeTexture(256, 256, (u, v) => { const n = fbm(u, v, 12, 6, 5), c = mix([150, 128, 98], [196, 172, 134], n); const l = (Math.abs(((u * 8) % 1) - 0.5) > 0.47 || Math.abs(((v * 8) % 1) - 0.5) > 0.47) ? 0.78 : 1; return c.map((x) => x * l); }, { repeat: 6 });
{
  const ground = new THREE.Mesh(new THREE.CircleGeometry(70, 64), new THREE.MeshStandardMaterial({ map: stone, roughness: 0.9 }));
  stone.repeat.set(20, 20); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; A.add(ground);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 900), new THREE.MeshStandardMaterial({ color: 0x1f6fb0, roughness: 0.25, metalness: 0.2 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.6, -520); A.add(sea);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.3, metalness: 0.8 }), wall = new THREE.MeshStandardMaterial({ map: stone, roughness: 0.85 });
  // palace backdrop: stepped base, hall, golden dome and spire
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(40 - i * 4, 0.5, 14 - i * 1.5), wall); s.position.set(0, 0.25 + i * 0.5, -16 - i * 0.2); s.castShadow = s.receiveShadow = true; A.add(s); }
  gopuramM.position.set(0, 0, -36); A.add(gopuramM);
  for (const sx of [-1, 1]) { const t = dup(templeM); t.position.set(sx * 24, 0, -20); t.rotation.y = sx * -0.6; A.add(t); }
  for (const x of [-9, -4.5, 4.5, 9]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 5, 16), wall); p.position.set(x, 2.5, 4.5); p.castShadow = true; A.add(p); const t = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), gold); t.position.set(x, 5.2, 4.5); A.add(t); }
  const sun = new THREE.DirectionalLight(0xffe6c0, 2.2); sun.position.set(-14, 22, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 }); A.add(sun);
  A.add(new THREE.HemisphereLight(0xbcd6f5, 0x6a5a44, 0.55));
}
A.add(durvasa.root); scene.add(samba.root);
// the vaidyas (court physicians) who fail to cure Samba, and Lord Krishna who advises him
const VAI = [dup(vaidyaAM), dup(vaidyaAM), dup(vaidyaAM)], VAI_HOME = [[-1.9, 1.3], [2.2, 1.0], [-0.2, -0.5]], VAI_FROM = [[-9, 2], [9, 1], [0, -12]];
VAI[1].scale.setScalar(0.94); VAI[2].scale.setScalar(0.98); VAI.forEach((v) => { v.visible = false; A.add(v); });
const krishna = dup(krishnaM); krishna.visible = false; A.add(krishna);
const krishnaGlow = glowSprite(A, 0xffe0a0, 7, 0, [-1.7, 1.4, 0.6]);
const curseFlash = glowSprite(A, 0xff5a30, 9, 0, [0, 2, 0]);

// ---------------- set B: the Chandrabhaga river at Mitravana ----------------
const B = new THREE.Group(); scene.add(B);
const skyB = skyDome([[0, '#ffb870'], [0.12, '#f08a68'], [0.3, '#7a6aa8'], [1, '#243a78']]); B.add(skyB);
const grass = makeTexture(256, 256, (u, v) => mix([44, 92, 40], [92, 138, 58], fbm(u, v, 5, 12, 4)), { repeat: 40 });
const RIVER_W = 40, RIVER_L = 240, RS = 48;
const river = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_W, RIVER_L, RS, 160), new THREE.MeshStandardMaterial({ color: 0x2f8aa8, roughness: 0.18, metalness: 0.35, transparent: true, opacity: 0.93 }));
river.rotation.x = -Math.PI / 2; river.position.set(0, 0.0, -40); B.add(river);
const riverBase = river.geometry.attributes.position.array.slice();
for (const sx of [-1, 1]) {
  const bank = new THREE.Mesh(new THREE.PlaneGeometry(260, 400, 1, 1), new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }));
  bank.rotation.x = -Math.PI / 2; bank.position.set(sx * (RIVER_W / 2 + 130 - 1), 0.35, -80); bank.receiveShadow = true; B.add(bank);
}
{
  const r = rng(5);
  const trunk = new THREE.MeshStandardMaterial({ color: 0x5a3c24, roughness: 1 }), leaf = new THREE.MeshStandardMaterial({ color: 0x2f6a30, roughness: 0.9 });
  for (let i = 0; i < 70; i++) {
    const side = r() < 0.5 ? -1 : 1, x = side * (RIVER_W / 2 + 4 + r() * 60), z = -r() * 160 + 14, h = 4 + r() * 5;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, h * 0.5, 8), trunk); t.position.set(x, 0.35 + h * 0.25, z);
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.8 + r() * 1.2, h, 10), leaf); c.position.set(x, 0.35 + h * 0.75, z); c.castShadow = true;
    B.add(t, c);
  }
  for (let i = 0; i < 14; i++) { // far Himalaya
    const m = new THREE.Mesh(new THREE.ConeGeometry(40 + r() * 50, 80 + r() * 90, 6), new THREE.MeshStandardMaterial({ color: 0x8a96b8, roughness: 1 }));
    m.position.set(-420 + i * 66 + r() * 30, 30, -520 - r() * 120); B.add(m);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(14, 28, 6), new THREE.MeshStandardMaterial({ color: 0xf4f6ff, roughness: 0.8 })); cap.position.set(m.position.x, m.position.y + 0.38 * (80 + 0), m.position.z); B.add(cap);
  }
}
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffd890 })); B.add(sunDisc);
const sunHalo = glowSprite(B, 0xffb060, 230, 0.9, [0, 0, 0]);
const sunHalo2 = glowSprite(B, 0xffe0b0, 90, 0.9, [0, 0, 0]);
const keyB = new THREE.DirectionalLight(0xffc890, 3.0); keyB.castShadow = true; keyB.shadow.mapSize.set(2048, 2048);
Object.assign(keyB.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 90 }); B.add(keyB, keyB.target);
B.add(new THREE.HemisphereLight(0xaab8ff, 0x3a4a30, 0.9));
// idol: a glowing carved figure (a slim capsule + head), floating on the river
const idol = new THREE.Group();
{
  const goldM = new THREE.MeshStandardMaterial({ color: 0xe8a838, roughness: 0.35, metalness: 0.85, emissive: 0xff9a30, emissiveIntensity: 0.7 });
  const statue = dup(suryaM); statue.traverse((o) => { if (o.isMesh) o.material = goldM; });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffe8a0 })); ring.position.y = 1.5; ring.rotation.y = Math.PI / 2;
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.45, side: THREE.DoubleSide })); halo.position.set(0, 1.5, -0.2);
  idol.add(statue, ring, halo); glowSprite(idol, 0xffc060, 4.5, 0.8, [0, 1.1, 0]);
}
B.add(idol);
// temple on the bank (rises in sentence 8/9)
const temple = new THREE.Group(); B.add(temple);
{
  temple.add(dup(templeM));
  const disc = dup(sunM); disc.scale.setScalar(0.5); disc.position.set(0, 3.0, 3.4); temple.add(disc);
  glowSprite(temple, 0xffc060, 10, 0.6, [0, 4.2, 3.8]);
  temple.position.set(-RIVER_W / 2 - 11, 0.35, -6); temple.rotation.y = Math.PI / 2; temple.visible = false;
}
const sparkles = (() => {
  const n = 160, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe8a0, size: 0.16, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  p.frustumCulled = false; B.add(p); return { p, g, n, seeds: Array.from({ length: n }, (_, i) => { const r = rng(i * 13 + 7); return [r(), r(), r(), r()]; }) };
})();
const rays = new THREE.Group(); B.add(rays); // god-rays around Surya
for (let i = 0; i < 14; i++) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.35, 9, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(0, 0, 0); m.rotation.z = (i / 14) * Math.PI * 2; m.position.set(Math.sin(m.rotation.z) * -4.5, Math.cos(m.rotation.z) * 4.5, 0); rays.add(m);
}
B.add(surya.root);
const sunEmblem = dup(sunM); sunEmblem.visible = false; B.add(sunEmblem);

// ---------------- timeline ----------------
let SN, END, envelope = [], FPS_ENV = 30, lastCapKey = '';
const T = (i, f = 0) => SN[i].start + f * (SN[i].end - SN[i].start);
const prog = (t, a, b) => clamp01((t - a) / Math.max(1e-6, b - a));
const envAt = (t) => { const x = t * FPS_ENV, i = Math.floor(x), f = x - i; return (envelope[i] ?? 0) + ((envelope[i + 1] ?? 0) - (envelope[i] ?? 0)) * f; };
const val = (x, t) => (typeof x === 'function' ? x(t) : x);
const _p = new THREE.Vector3(), _l = new THREE.Vector3(), _q = new THREE.Vector3();
let CAM;
function placeCamera(list, t) {
  let i = list.findIndex((k) => k[0] > t) - 1, u = 0, a = list[0], b = list[0];
  if (i >= 0 && i < list.length - 1) { a = list[i]; b = list[i + 1]; u = smooth(clamp01((t - a[0]) / (b[0] - a[0]))); } else if (i >= list.length - 1 || (i < 0 && t >= list[0][0])) a = b = list[list.length - 1];
  _p.fromArray(val(a[1], t)).lerp(_q.fromArray(val(b[1], t)), u);
  _l.fromArray(val(a[2], t)).lerp(_q.fromArray(val(b[2], t)), u);
  _p.x += Math.sin(t * 0.7) * 0.04; _p.y += Math.cos(t * 0.55) * 0.03;
  camera.position.copy(_p); camera.lookAt(_l);
}
const SAMBA_HOME = new THREE.Vector3(-1.2, 0, 1.0), DUR_START = new THREE.Vector3(8.5, 0, -7), DUR_MEET = new THREE.Vector3(1.6, 0, 1.6);
const sambaPos = new THREE.Vector3(), durPos = new THREE.Vector3();
function buildCameras() {
  CAM = {
    A: [
      [T(0, 0), [-3.4, 1.9, 6.2], [-1.2, 1.35, 1.0]],
      [T(0, 1), [-0.2, 1.7, 4.8], [-1.2, 1.5, 1.0]],
      [T(1, 0), [6, 3.0, 8.5], (t) => [lerp(DUR_START.x, DUR_MEET.x, prog(t, T(1, 0), T(1, 1))), 1.5, lerp(DUR_START.z, DUR_MEET.z, prog(t, T(1, 0), T(1, 1)))]],
      [T(2, 0), [3.4, 1.7, 6.0], [0.4, 1.6, 1.3]],
      [T(2, 1), [-2.8, 1.9, 4.6], [0.5, 1.6, 1.3]],
      [T(3, 0), [0.4, 1.8, 6.4], [0.8, 1.9, 1.4]],
      [T(3, 0.6), [0.2, 1.4, 4.4], [1.6, 2.1, 1.6]],
      [T(4, 0), [-0.6, 1.6, 4.3], [-0.9, 1.0, 1.0]],
      [T(4, 1), [-1.4, 2.4, 4.8], [-1.0, 0.7, 1.0]],
      [T(5, 0), [-4, 3.2, 6.5], [-1.0, 1.0, 1.0]],
      [T(5, 1), [-3.5, 2.6, 5.5], [-1.0, 1.4, 1.0]],
    ],
    B: [
      [T(6, 0), [-6, 3.0, 12], [-1, 1.3, 2]],
      [T(6, 0.5), [4, 1.4, 9], [0, 1.3, 2]],
      [T(6, 1), [-2.2, 1.7, 6.5], [0, 1.4, 2]],
      [T(7, 0), [1.5, 1.5, 7.5], [0, 2.4, -8]],
      [T(7, 0.45), [3.2, 1.6, 6.8], [0, 2.8, -5]],
      [T(7, 1), [-1.0, 1.5, 6.5], [0, 1.4, 2]],
      [T(8, 0), [-7, 2.4, 12], (t) => [idolPos.x, 1.1, idolPos.z]],
      [T(8, 0.5), [-4, 2.2, 10], [-0.6, 1.3, 2]],
      [T(8, 0.95), [-2, 6, 14], [-RIVER_W / 2 - 6, 6, -6]],
      [T(9, 0), [-8, 9, 18], [-RIVER_W / 2 - 8, 8, -6]],
      [END, [-10, 12, 28], [-RIVER_W / 2 - 8, 8, -6]],
    ],
  };
}
const idolPos = new THREE.Vector3();

// ---------------- poses ----------------
const SICK = new THREE.Color(0x4f6a3c);
function poseA(t, e) {
  [samba, durvasa].forEach((f) => f.reset());
  const breathe = Math.sin(t * 1.8);
  // --- Samba
  samba.root.visible = true; samba.root.scale.setScalar(SH);
  const curse = T(3, 0.55), sick = smooth(prog(t, curse, curse + 0.9)) * 0.9;
  samba.tint(SICK, sick);
  sambaPos.copy(SAMBA_HOME);
  samba.rot('chest', 'x', breathe * 1.2);
  if (t < T(1, 0.2)) { // preening: turns his head, admires his arms, chest out
    const p = Math.sin(t * 0.9);
    samba.rot('head', 'y', 18 * p); samba.rot('chest', 'x', -5); samba.rot('upperArm_L', 'z', 10); samba.rot('upperArm_R', 'z', -10);
    samba.rot('foreArm_L', 'x', -40 * (0.5 + 0.5 * p)); samba.rot('foreArm_R', 'x', -40 * (0.5 - 0.5 * p));
  }
  if (t >= T(2, 0) && t < curse) { // mocks the sage, copying his walk
    const w = prog(t, T(2, 0), T(2, 1)), ph = t * 7, s1 = Math.sin(ph), c1 = Math.cos(ph);
    sambaPos.set(lerp(-1.2, 0.2, smooth(w)), 0, lerp(1.0, 2.6, smooth(w)));
    samba.rot('thigh_L', 'x', -26 * s1); samba.rot('thigh_R', 'x', 26 * s1); samba.rot('shin_L', 'x', 30 * Math.max(0, -c1)); samba.rot('shin_R', 'x', 30 * Math.max(0, c1));
    samba.rot('chest', 'z', 7 * s1); samba.rot('head', 'z', 12 * s1); samba.rot('upperArm_L', 'x', 14 * s1); samba.rot('upperArm_R', 'x', -14 * s1);
    samba.rot('spine', 'x', 8); samba.rot('head', 'x', 8);
    samba.body.position.y = Math.abs(s1) * 0.02;
  }
  if (t >= curse) { // recoils, then sinks to his knees
    const rc = smooth(prog(t, curse, curse + 0.5)), kn = smooth(prog(t, T(4, 0.1), T(4, 0.6)));
    sambaPos.set(0.2, 0, 2.6);
    samba.rot('chest', 'x', -10 * rc + 22 * kn); samba.rot('head', 'x', -12 * rc + 24 * kn); samba.rot('upperArm_L', 'x', -40 * rc); samba.rot('upperArm_R', 'x', -40 * rc);
    samba.rot('thigh_L', 'x', -80 * kn); samba.rot('thigh_R', 'x', -80 * kn); samba.rot('shin_L', 'x', 100 * kn); samba.rot('shin_R', 'x', 100 * kn);
    samba.body.position.y = -0.34 * kn;
  }
  if (t >= T(5, 0.15)) { // takes Krishna's advice: bows, hands joined
    const bw = smooth(prog(t, T(5, 0.15), T(5, 0.6)));
    samba.rot('upperArm_L', 'x', -48 * bw); samba.rot('upperArm_R', 'x', -48 * bw); samba.rot('foreArm_L', 'x', -62 * bw); samba.rot('foreArm_R', 'x', -62 * bw);
    samba.rot('upperArm_L', 'z', -12 * bw); samba.rot('upperArm_R', 'z', 12 * bw); samba.rot('head', 'x', 8 * bw);
  }
  samba.root.position.copy(sambaPos); faceTo(samba.root, durPos.x, durPos.z);
  if (t >= T(5, 0)) samba.root.rotation.y = 0.3; // facing the sun symbol
  samba.rig.apply();
  // --- Durvasa
  const arrive = prog(t, T(1, 0), T(1, 1)), eA = smooth(arrive);
  durvasa.root.visible = t >= T(1, 0) - 0.05 && t < T(5, 0.2); durvasa.root.scale.setScalar(DH);
  durPos.lerpVectors(DUR_START, DUR_MEET, eA);
  const walking = arrive < 1, ph = t * 6.5, s1 = Math.sin(ph), c1 = Math.cos(ph);
  if (walking) {
    durvasa.rot('thigh_L', 'x', -26 * s1); durvasa.rot('thigh_R', 'x', 26 * s1); durvasa.rot('shin_L', 'x', 28 * Math.max(0, -c1)); durvasa.rot('shin_R', 'x', 28 * Math.max(0, c1));
    durvasa.rot('upperArm_L', 'x', 14 * s1); durvasa.rot('chest', 'y', -4 * s1); durvasa.body.position.y = Math.abs(s1) * 0.025;
    faceTo(durvasa.root, DUR_MEET.x, DUR_MEET.z);
  } else {
    faceTo(durvasa.root, sambaPos.x, sambaPos.z);
    durvasa.rot('chest', 'x', breathe);
    if (t >= T(2, 0) && t < T(3, 0)) durvasa.rot('head', 'z', Math.sin(t * 8) * 4); // slow burn
    if (t >= T(3, 0)) { // curses: rises on his toes with a pointing arm
      const pt = smooth(prog(t, T(3, 0.25), T(3, 0.55)));
      durvasa.rot('upperArm_R', 'x', -88 * pt); durvasa.rot('foreArm_R', 'x', -8 * pt); durvasa.rot('chest', 'x', 8 * pt); durvasa.rot('head', 'x', 6 * pt);
      durvasa.rot('chest', 'z', Math.sin(t * 30) * 2 * pt * (t < T(3, 0.9) ? 1 : 0)); // trembling with anger
    }
  }
  durvasa.root.position.copy(durPos);
  durvasa.rig.apply();
  // vaidyas shake their heads over Samba (sentence 5), then leave as Krishna arrives
  const vaiOn = t >= T(4, 0) - 0.05 && t < T(5, 0.12), va = smooth(prog(t, T(4, 0), T(4, 0.35)));
  VAI.forEach((v, i) => {
    v.visible = vaiOn; v.position.set(lerp(VAI_FROM[i][0], VAI_HOME[i][0], va), Math.abs(Math.sin(t * 2.2 + i)) * 0.012, lerp(VAI_FROM[i][1], VAI_HOME[i][1], va));
    faceTo(v, sambaPos.x, sambaPos.z); v.rotation.y += Math.sin(t * 3.2 + i * 2) * 0.2 * va;
  });
  // Krishna appears in a soft golden light for sentence 6
  const kr = smooth(prog(t, T(5, 0), T(5, 0.12)));
  krishna.visible = t >= T(5, 0) - 0.02; krishna.scale.setScalar(0.4 + 0.6 * kr); krishna.position.set(-1.2, 0, 1.0);
  faceTo(krishna, sambaPos.x, sambaPos.z); krishna.rotation.y += Math.sin(t * 1.3) * 0.05; krishna.position.y = Math.sin(t * 1.6) * 0.01;
  krishnaGlow.material.opacity = krishna.visible ? 0.55 * Math.max(0, 1 - prog(t, T(5, 0.1), T(5, 0.6))) + 0.12 : 0; krishnaGlow.position.set(-1.7, 1.4, 0.6);
  // flash
  const fl = Math.max(0, 1 - Math.abs(t - curse) / 0.4);
  curseFlash.material.opacity = fl * 0.9; curseFlash.position.set(durPos.x * 0.5 + sambaPos.x * 0.5, 2.2, durPos.z * 0.5 + sambaPos.z * 0.5);
  surya.root.visible = false;
}

const sunPos = new THREE.Vector3();
function poseB(t, e) {
  [samba, surya].forEach((f) => f.reset());
  // sun: a slow dawn glow at the horizon; time-lapse arcs during the penance (sentence 6); descends to the river for the blessing
  const pen = prog(t, T(6, 0.15), T(6, 1)), arc = smooth(prog(t, T(6, 0.1), T(6, 0.95)));
  const hz = 0.05 + 0.35 * Math.abs(Math.sin(arc * Math.PI * 3)) ; // sun rises and sets three times
  sunPos.set(-30 + 60 * arc * 0, 8 + hz * 120, -240);
  if (t < T(6, 0.1)) sunPos.set(0, 12, -240);
  if (t >= T(6, 0.95)) sunPos.set(0, 16, -240);
  sunDisc.position.copy(sunPos); sunHalo.position.copy(sunPos); sunHalo2.position.copy(sunPos);
  keyB.position.set(sunPos.x * 0.15, 30, 40); keyB.target.position.set(0, 0, 0);
  keyB.intensity = 2.0 + clamp01(sunPos.y / 80) * 1.4;
  skyB.visible = true;
  // Samba stands in the river, hands joined
  samba.root.visible = true; samba.root.scale.setScalar(SH);
  const walkIn = smooth(prog(t, T(6, 0), T(6, 0.35)));
  const heal = smooth(prog(t, T(7, 0.45), T(7, 0.8)));
  const sick = t < T(7, 0.45) ? 0.9 : 0.9 * (1 - heal);
  samba.tint(SICK, t < T(6, 0) ? 0.9 : Math.max(0, sick)); // fades with penance, then heals fully
  const thin = pen * 0.0;
  samba.root.position.set(lerp(-6, 0, walkIn), -0.35 * walkIn, lerp(7, 2, walkIn));
  samba.root.rotation.y = lerp(0.7, Math.PI, walkIn); // faces upstream/sun (away from the camera, toward -z)
  samba.root.rotation.y = Math.PI * walkIn + 0.7 * (1 - walkIn) * 0;
  if (walkIn < 1 && t >= T(6, 0)) { const s1 = Math.sin(t * 6); samba.rot('thigh_L', 'x', -26 * s1); samba.rot('thigh_R', 'x', 26 * s1); samba.rot('shin_L', 'x', 28 * Math.max(0, -Math.cos(t * 6))); samba.rot('shin_R', 'x', 28 * Math.max(0, Math.cos(t * 6))); }
  const pray = smooth(prog(t, T(6, 0.3), T(6, 0.5)));
  samba.rot('upperArm_L', 'x', -48 * pray); samba.rot('upperArm_R', 'x', -48 * pray); samba.rot('foreArm_L', 'x', -75 * pray); samba.rot('foreArm_R', 'x', -75 * pray);
  samba.rot('upperArm_L', 'z', -10 * pray); samba.rot('upperArm_R', 'z', 10 * pray); samba.rot('head', 'x', -8 * pray + (t > T(7, 0.1) ? -12 : 0)); samba.rot('chest', 'x', Math.sin(t * 1.6));
  if (t >= T(7, 0.1) && t < T(8, 0)) { const up = smooth(prog(t, T(7, 0.1), T(7, 0.35))); samba.rot('upperArm_L', 'z', 18 * up); samba.rot('upperArm_R', 'z', -18 * up); samba.rot('head', 'x', -14 * up); }
  if (t >= T(8, 0.55)) { const rs = smooth(prog(t, T(8, 0.55), T(8, 0.9))); samba.rot('upperArm_L', 'x', -62 * rs); samba.rot('upperArm_R', 'x', -62 * rs); samba.rot('foreArm_L', 'x', -40 * rs); samba.rot('foreArm_R', 'x', -40 * rs); }
  samba.glow(0xffc870, heal * 0.5 * (t < T(8, 0) ? 1 : 0.4));
  samba.rig.apply();
  // Surya descends in golden light during sentence 7
  const des = smooth(prog(t, T(7, 0.0), T(7, 0.4))), leave = smooth(prog(t, T(7, 0.75), T(7, 1)));
  surya.root.visible = des > 0.01 && leave < 0.99; surya.root.scale.setScalar(3.4); sunHalo2.material.opacity = 0.9 * (1 - 0.6 * des);
  surya.root.position.set(0, lerp(14, 1.4, des) + leave * 10, lerp(-38, -9, des));
  surya.root.rotation.y = 0;
  surya.rot('upperArm_L', 'z', 28 * des); surya.rot('upperArm_R', 'z', -28 * des); surya.rot('foreArm_L', 'x', -34 * des); surya.rot('foreArm_R', 'x', -34 * des);
  surya.rig.apply();
  sunEmblem.visible = surya.root.visible; sunEmblem.position.copy(surya.root.position).add(_q.set(0, 4.2, -1.4)); sunEmblem.scale.setScalar(1.1 + 0.05 * Math.sin(t * 2)); sunEmblem.rotation.y = 0;
  rays.visible = surya.root.visible; rays.position.copy(surya.root.position).add(_q.set(0, 3.4, 0)); rays.scale.setScalar(1 + 0.15 * Math.sin(t * 3)); rays.rotation.z = t * 0.12;
  // idol floats down the river toward Samba
  const fl = prog(t, T(8, 0.0), T(8, 0.5));
  idolPos.set(lerp(2, -0.9, smooth(fl)) + Math.sin(t * 1.3) * 0.08 * (1 - fl), 0.04 + Math.sin(t * 2.1) * 0.04, lerp(-34, 4.2, smooth(fl)));
  idol.visible = t >= T(8, 0) - 0.1 && t < T(8, 0.55) + 4.5;
  if (t >= T(8, 0.6)) { // lifted by Samba, carried to the bank
    const c = smooth(prog(t, T(8, 0.6), T(8, 0.95)));
    idolPos.set(lerp(-0.9, -RIVER_W / 2 - 6.5, c), lerp(0.1, 1.1, smooth(prog(t, T(8, 0.6), T(8, 0.72)))), lerp(4.2, -6.2, c));
  }
  idol.position.copy(idolPos); idol.rotation.y = t * 0.6; idol.scale.setScalar(0.85);
  // temple rises
  const rise = smooth(prog(t, T(8, 0.75), T(9, 0.35)));
  temple.visible = rise > 0.01; temple.scale.set(1.25, Math.max(0.001, rise) * 1.25, 1.25);
  // river waves + sparkles
  const pos = river.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = riverBase[i * 3], y = riverBase[i * 3 + 1]; pos.setZ(i, Math.sin(x * 0.4 + t * 1.4) * 0.06 + Math.sin(y * 0.25 + t * 0.9) * 0.08); }
  pos.needsUpdate = true; river.geometry.computeVertexNormals();
  const sp = sparkles.g.attributes.position, heal2 = (t > T(7, 0.4) && t < T(8, 0.2)) ? 1 : 0, tpl = t > T(9, 0) ? 1 : 0;
  for (let i = 0; i < sparkles.n; i++) {
    const [a, b, c, d] = sparkles.seeds[i], life = (t * (0.25 + d * 0.3) + a) % 1;
    const cx = tpl ? temple.position.x : samba.root.position.x, cz = tpl ? temple.position.z : samba.root.position.z;
    sp.setXYZ(i, cx + (b - 0.5) * 6, 0.4 + life * (tpl ? 14 : 6) * (c + 0.3), cz + (c - 0.5) * 6);
  }
  sp.needsUpdate = true; sparkles.p.material.opacity = (heal2 || tpl) ? 0.9 : 0.0;
  curseFlash.material.opacity = 0;
}

// ---------------- overlays ----------------
const capEl = document.getElementById('cap'), titleEl = document.getElementById('title'), flashEl = document.getElementById('flash');
function captions(t) {
  const s = SN.find((s) => t >= s.start - 0.15 && t <= s.end + 0.45);
  if (!s) { if (lastCapKey) { capEl.innerHTML = ''; lastCapKey = ''; } return; }
  const on = s.words.map((w) => (t >= w.start ? 1 : 0)).join(''), key = s.start + on;
  if (key === lastCapKey) return; lastCapKey = key;
  capEl.innerHTML = s.words.map((w, i) => `<span class="${on[i] === '1' ? 'on' : ''}">${w.text}</span>`).join(' ');
}
function overlays(t) {
  let o = 0, txt = '';
  if (t < T(0, 0.85)) { o = Math.min(clamp01((t - 0.2) / 0.8), clamp01((T(0, 0.85) - t) / 0.6)); txt = window.P_TITLES.start; }
  else if (t > T(9, 0.55)) { o = clamp01((t - T(9, 0.55)) / 0.9); txt = window.P_TITLES.end; }
  titleEl.textContent = txt; titleEl.style.opacity = o;
  const b6 = (T(5, 1) + T(6, 0)) / 2;
  let f = t < b6 ? smooth(clamp01((t - (b6 - 0.5)) / 0.5)) : 1 - smooth(clamp01((t - b6) / 0.8));
  f = Math.max(f, Math.max(0, 1 - Math.abs(t - T(3, 0.55)) / 0.25) * 0.7);
  flashEl.style.background = t > T(3, 0.4) && t < T(3, 0.8) ? 'radial-gradient(circle,#ffb090,#a02818)' : 'radial-gradient(circle,#fffbe8,#ffe2a0)';
  flashEl.style.opacity = f;
}

function renderAt(t) {
  const e = envAt(t), setA = t < (T(5, 1) + T(6, 0)) / 2;
  A.visible = setA; B.visible = !setA;
  if (setA) poseA(t, e); else poseB(t, e);
  bloom.strength = (setA ? 0.28 : 0.6) + e * 0.1;
  scene.environmentIntensity = setA ? 0.5 : 0.25;
  placeCamera(setA ? CAM.A : CAM.B, t);
  captions(t); overlays(t);
  composer.render();
}
window.initScene = (tl, env, fps, total) => {
  SN = tl.sentences; envelope = env; FPS_ENV = fps; END = total; lastCapKey = '';
  if (SN.length < 10) throw new Error(`expected 10 sentences, got ${SN.length}`);
  buildCameras(); return true;
};
window.renderAt = renderAt;
if (window.P_FONTS) await Promise.all(window.P_FONTS.map((f) => document.fonts.load(f.spec, f.text)));
window.__ready = true;
