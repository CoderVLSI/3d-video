import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { rng, fbm, vnoise, mix, makeTexture, smooth, clamp01, lerp, glowTexture, skyDome } from '/src/common.js';

const W = 1280, H = 720;

// ================= renderer =================
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.2, 6000);
const composer = new EffectComposer(renderer);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.6, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const glowTex = glowTexture();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
// the hero: Vamana, decimated from the release GLB with tools/blender/optimize_model.py
const loadGLB = async (name) => (await new GLTFLoader().loadAsync(`/assets/models/${name}_rigged.glb`)).scene;
const [vamanaGLB, baliGLB, guruGLB] = await Promise.all([loadGLB('vamana'), loadGLB('bali'), loadGLB('shukracharya')]);

function glowSprite(parent, color, scale, opacity, at = [0, 0, 0]) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(scale); s.position.set(...at); parent.add(s); return s;
}
const enableShadows = (o, cast = true, receive = false) => o.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } });

// ================= characters =================
// Procedural low-poly figure, 1 unit tall, feet at y=0, facing +z. Limbs pivot at hips/shoulders.
function makeFigure({ skin = 0xd9a273, cloth = 0xff8a1e, trim = 0xffd34d, hair = 0x1a1008, crown = false, beard = false, umbrella = false, knot = false, tilak = false, hairWhite = false }) {
  const mats = [];
  const M = (color, o = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, emissive: 0xff9a30, emissiveIntensity: 0, ...o }); mats.push(m); return m; };
  const mSkin = M(skin), mCloth = M(cloth), mTrim = M(trim, { metalness: 0.6, roughness: 0.35 }), mHair = M(hairWhite ? 0xf2f2f2 : hair);
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  add(root, new THREE.CapsuleGeometry(0.095, 0.15, 6, 14), mSkin, 0, 0.62, 0);                    // torso
  add(root, new THREE.CylinderGeometry(0.115, 0.155, 0.34, 28), mCloth, 0, 0.33, 0);                // dhoti
  const belt = add(root, new THREE.TorusGeometry(0.117, 0.013, 8, 28), mTrim, 0, 0.5, 0); belt.rotation.x = Math.PI / 2;
  const sash = add(root, new THREE.TorusGeometry(0.1, 0.02, 8, 28), mCloth, 0, 0.72, 0); sash.rotation.set(Math.PI / 2 + 0.5, 0.2, 0);

  const mkLimb = (x, y, len, r0, r1, drop) => {
    const g = new THREE.Group(); g.position.set(x, y, 0); root.add(g);
    add(g, new THREE.CylinderGeometry(r0, r1, len, 12), mSkin, 0, -len / 2, 0);
    return g;
  };
  const legL = mkLimb(-0.06, 0.45, 0.43, 0.04, 0.03), legR = mkLimb(0.06, 0.45, 0.43, 0.04, 0.03);
  [legL, legR].forEach((l) => add(l, new THREE.BoxGeometry(0.075, 0.04, 0.13), mSkin, 0, -0.43, 0.03));
  const armL = mkLimb(-0.14, 0.75, 0.3, 0.03, 0.025), armR = mkLimb(0.14, 0.75, 0.3, 0.03, 0.025);
  [armL, armR].forEach((a) => add(a, new THREE.SphereGeometry(0.034, 12, 10), mSkin, 0, -0.31, 0));
  if (crown) [armL, armR].forEach((a) => { const b = add(a, new THREE.TorusGeometry(0.03, 0.01, 8, 14), mTrim, 0, -0.07, 0); b.rotation.x = Math.PI / 2; });

  const head = new THREE.Group(); head.position.set(0, 0.865, 0); root.add(head);
  add(head, new THREE.SphereGeometry(0.082, 28, 20), mSkin);
  const cap = add(head, new THREE.SphereGeometry(0.087, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2 - 0.15), mHair, 0, 0.004, -0.004);
  add(head, new THREE.SphereGeometry(0.011, 8, 8), M(0x120a06), -0.03, 0.01, 0.076);               // eyes
  add(head, new THREE.SphereGeometry(0.011, 8, 8), M(0x120a06), 0.03, 0.01, 0.076);
  add(head, new THREE.SphereGeometry(0.012, 8, 8), mSkin, 0, -0.012, 0.083);                         // nose
  const mouth = add(head, new THREE.TorusGeometry(0.02, 0.004, 6, 12, Math.PI), M(0x6b2a22), 0, -0.04, 0.074); mouth.rotation.z = Math.PI;
  add(root, new THREE.CylinderGeometry(0.035, 0.04, 0.05, 12), mSkin, 0, 0.78, 0);                   // neck
  if (tilak) add(head, new THREE.SphereGeometry(0.01, 8, 8), M(0xc01818), 0, 0.042, 0.081);
  if (knot) add(head, new THREE.SphereGeometry(0.028, 12, 10), mHair, 0, 0.1, -0.02);
  if (beard) { const b = add(head, new THREE.ConeGeometry(0.06, 0.15, 14), mHair, 0, -0.1, 0.045); b.rotation.x = Math.PI; }
  if (crown) {
    const c = new THREE.Group(); c.position.set(0, 0.08, 0); head.add(c);
    add(c, new THREE.CylinderGeometry(0.075, 0.085, 0.07, 20), mTrim, 0, 0.03, 0);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; add(c, new THREE.ConeGeometry(0.014, 0.07, 6), mTrim, Math.cos(a) * 0.075, 0.095, Math.sin(a) * 0.075); }
    add(c, new THREE.SphereGeometry(0.02, 10, 8), M(0xd01040, { emissive: 0xff2040, emissiveIntensity: 0.8 }), 0, 0.045, 0.08);
    const n = add(root, new THREE.TorusGeometry(0.075, 0.014, 8, 24), mTrim, 0, 0.76, 0); n.rotation.x = Math.PI / 2 - 0.3;
  }
  let umb = null;
  if (umbrella) {
    umb = new THREE.Group(); umb.position.set(0.14, 0.57, 0.27); root.add(umb);
    add(umb, new THREE.CylinderGeometry(0.008, 0.008, 0.62, 8), M(0x6b4a2a), 0, 0.2, 0);
    const can = add(umb, new THREE.ConeGeometry(0.3, 0.14, 28, 1, true), M(0xff6a00, { side: THREE.DoubleSide }), 0, 0.5, 0);
    add(umb, new THREE.SphereGeometry(0.02, 8, 8), mTrim, 0, 0.58, 0);
    const rim = add(umb, new THREE.TorusGeometry(0.3, 0.007, 6, 36), mTrim, 0, 0.43, 0); rim.rotation.x = Math.PI / 2;
  }
  enableShadows(root, true, false);
  const reset = () => {
    [legL, legR, armL, armR, head].forEach((p) => p.rotation.set(0, 0, 0));
    root.rotation.set(0, root.rotation.y, 0);
    armR.rotation.x = umbrella ? -1.0 : 0;
  };
  const glow = (k) => mats.forEach((m) => { m.emissiveIntensity = k * (m.metalness > 0.3 ? 0.9 : 0.45); });
  return { root, legL, legR, armL, armR, head, umb, reset, glow, mouth };
}
// Bone control for the rigged GLBs (tools/blender/rig_character.py). Rotations are given about the character's own axes
// ('x' pitch: + leans/kicks forward for the spine, - swings a hanging limb forward; 'y' yaw: + turns to the character's left;
// 'z' roll: + abducts the left arm outward) and composed down the skeleton, so pose code reads the same for every character.
const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
class BoneRig {
  constructor(model) {
    this.bones = new Map(); this.order = [];
    const visit = (o) => { if (o.isBone) { this.bones.set(o.name, o); this.order.push(o); } o.children.forEach(visit); };
    visit(model);
    this.rest = new Map(this.order.map((b) => [b, b.quaternion.clone()]));
    this.delta = new Map();
  }
  reset() { this.delta.clear(); }
  rot(name, axis, deg) {
    const b = this.bones.get(name); if (!b || !deg) return;
    const q = new THREE.Quaternion().setFromAxisAngle(AXES[axis], (deg * Math.PI) / 180);
    this.delta.set(b, q.multiply(this.delta.get(b) ?? new THREE.Quaternion()));
  }
  apply() { // local = inv(P) * delta * P * rest, with P the parent's current accumulated rotation
    const P = new Map(), tmp = new THREE.Quaternion();
    for (const b of this.order) {
      const pq = (b.parent && P.get(b.parent)) || new THREE.Quaternion(), d = this.delta.get(b), rest = this.rest.get(b);
      if (d) b.quaternion.copy(pq).invert().multiply(d).multiply(pq).multiply(rest); else b.quaternion.copy(rest);
      P.set(b, tmp.copy(pq).multiply(b.quaternion).clone());
    }
  }
}
// A rigged character as a group scaled to 1 unit tall (feet at y=0, facing +z); set root.scale to the height you want.
function makeRiggedActor(gltfScene, { glowing = false } = {}) {
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const body = new THREE.Group(); root.add(body);
  const model = SkeletonUtils.clone(gltfScene); model.scale.setScalar(1 / 1.9); body.add(model);
  const mats = new Set();
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; mats.add(o.material); } });
  if (glowing) mats.forEach((m) => { m.emissive = new THREE.Color(0xffe2b0); m.emissiveMap = m.map; m.emissiveIntensity = 0; m.needsUpdate = true; });
  const halo = glowing ? glowSprite(root, 0xffc060, 1.9, 0, [0, 0.5, 0]) : null;
  const rig = new BoneRig(model);
  return {
    root, body, rig, rot: (n, ax, deg) => rig.rot(n, ax, deg),
    reset() { rig.reset(); body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); root.rotation.set(0, root.rotation.y, 0); },
    glow(k) { if (!glowing) return; mats.forEach((m) => { m.emissiveIntensity = k; }); halo.material.opacity = Math.min(1, k); },
  };
}
const faceTo = (root, x, z) => { root.rotation.y = Math.atan2(x - root.position.x, z - root.position.z); };

// ================= set 1: sacrificial courtyard (hall) =================
const hall = new THREE.Group(); scene.add(hall);
hall.add(skyDome([[0, '#ffb066'], [0.12, '#e0705a'], [0.35, '#6a3a78'], [1, '#14163f']]));
glowSprite(hall, 0xffa860, 420, 0.85, [-300, 55, -640]);
glowSprite(hall, 0xff7a3a, 900, 0.25, [-300, 40, -640]);
{
  // stars in the dusk sky
  const r = rng(3), n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const th = r() * Math.PI * 2, y = 0.25 + r() * 0.75, rad = 850, s = Math.sqrt(1 - y * y); pos.set([rad * s * Math.cos(th), rad * y, rad * s * Math.sin(th)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  hall.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xfff2dd, transparent: true, opacity: 0.8 })));
}
const stoneTex = makeTexture(256, 256, (u, v) => { const n = fbm(u, v, 12, 6, 5), c = mix([128, 108, 90], [206, 184, 150], n); const line = (Math.abs(((u * 8) % 1) - 0.5) > 0.47 || Math.abs(((v * 8) % 1) - 0.5) > 0.47) ? 0.7 : 1; return c.map((x) => x * line); }, { repeat: 5 });
const grassTex = makeTexture(256, 256, (u, v) => mix([30, 54, 28], [74, 98, 44], fbm(u, v, 5, 12, 4)), { repeat: 60 });
{
  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; hall.add(ground);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.6, 0.5, 72), new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 }));
  plat.position.y = -0.25; plat.receiveShadow = true; hall.add(plat);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.8, 0.12, 64), new THREE.MeshStandardMaterial({ color: 0x9c7d4c, roughness: 0.8, metalness: 0.1 }));
  inner.position.y = 0.04; inner.receiveShadow = true; hall.add(inner);
  const pillarMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.85 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.15, p = new THREE.Group(); p.position.set(Math.cos(a) * 13.2, 0, Math.sin(a) * 13.2);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 9, 18), pillarMat); col.position.y = 4.5;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.7), pillarMat); cap.position.y = 9.2;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.7), pillarMat); base.position.y = 0.25;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffc070 })); lamp.position.y = 9.8;
    p.add(col, cap, base, lamp); glowSprite(p, 0xffa040, 3.2, 0.6, [0, 9.8, 0]);
    [col, cap, base].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    hall.add(p);
  }
}
// yajna fire
const fire = new THREE.Group(); hall.add(fire);
const flames = [];
{
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.22, 10, 28), new THREE.MeshStandardMaterial({ color: 0x70604f, roughness: 1 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; fire.add(ring);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, m = new THREE.Mesh(new THREE.ConeGeometry(0.34 - (i % 2) * 0.08, 1.7 + (i % 3) * 0.25, 14, 1, true),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd060 : 0xff6a10, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(Math.cos(a) * 0.4, 0.95, Math.sin(a) * 0.4); fire.add(m); flames.push(m);
  }
  glowSprite(fire, 0xff8a30, 5, 0.45, [0, 1.3, 0]); glowSprite(fire, 0xffd090, 2.2, 0.5, [0, 1.0, 0]);
}
const fireLight = new THREE.PointLight(0xff8a3a, 30, 0, 1.5); fireLight.position.set(0, 1.8, 0); hall.add(fireLight);
const sunsetLight = new THREE.DirectionalLight(0xffb070, 2.4);
sunsetLight.position.set(-24, 17, 20); sunsetLight.castShadow = true; sunsetLight.shadow.mapSize.set(2048, 2048);
Object.assign(sunsetLight.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 }); sunsetLight.shadow.bias = -0.0005;
hall.add(sunsetLight);
hall.add(new THREE.HemisphereLight(0x8a7bb8, 0x3a2a20, 0.8));
const sparks = (() => {
  const n = 120, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffa040, size: 0.14, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  hall.add(p); return { n, g, seeds: Array.from({ length: n }, (_, i) => { const r = rng(i * 17 + 3); return [r(), r(), r(), r()]; }) };
})();

const VH = 1.9, BH = 3.7; // Vamana / Bali heights
const vamana = makeRiggedActor(vamanaGLB, { glowing: true });
const bali = makeRiggedActor(baliGLB);
const guru = makeRiggedActor(guruGLB);
hall.add(vamana.root, bali.root, guru.root);
const facingVamanaGuru = new THREE.Vector3();

// ================= set 2: cosmos (the two great steps) =================
const cosmos = new THREE.Group(); scene.add(cosmos);
const COS = 110; // Vamana's scale in the cosmic form
const cv = makeRiggedActor(vamanaGLB, { glowing: true });
cv.root.scale.setScalar(COS); cosmos.add(cv.root);
const earthPos = new THREE.Vector3(0, -26.5, 0); // first step: his feet land on top of the Earth
const heavenFeet = new THREE.Vector3(0, 85, 46); // second step: ... and on the heavens
const earth = new THREE.Mesh(new THREE.SphereGeometry(27, 64, 48), new THREE.MeshStandardMaterial({
  roughness: 0.9, map: makeTexture(1024, 512, (u, v) => {
    const n = fbm(u, v, 5, 5), pole = smooth(clamp01((Math.abs(v - 0.5) - 0.38) / 0.1)), cl = clamp01((fbm(u, v, 31, 8, 4) - 0.5) * 3) * 0.85;
    const land = n > 0.5 ? mix([45, 110, 55], [160, 140, 90], clamp01((n - 0.5) * 4)) : mix([10, 40, 120], [30, 95, 175], n * 2);
    return mix(mix(land, [240, 245, 255], pole), [255, 255, 255], cl);
  }),
}));
earth.position.copy(earthPos); cosmos.add(earth);
glowSprite(cosmos, 0x6aa8ff, 95, 0.55, earthPos.toArray());
const footRing = new THREE.Mesh(new THREE.RingGeometry(3.5, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
footRing.rotation.x = -Math.PI / 2; footRing.position.set(0, 0.9, 0); cosmos.add(footRing);
const footRing2 = footRing.clone(); footRing2.material = footRing.material.clone(); footRing2.position.copy(heavenFeet).add(new THREE.Vector3(0, 0.4, 0)); cosmos.add(footRing2);
// the heavens: a golden ring of luminaries
const heavenPos = heavenFeet.clone().add(new THREE.Vector3(0, -1.5, 0));
const heaven = new THREE.Group(); heaven.position.copy(heavenPos); cosmos.add(heaven);
const orbs = [];
{
  const ring = new THREE.Mesh(new THREE.TorusGeometry(34, 0.9, 10, 96), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); ring.rotation.x = Math.PI / 2; heaven.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(34, 64), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc860, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.x = Math.PI / 2; heaven.add(disc);
  glowSprite(heaven, 0xffd890, 95, 0.32);
  const r = rng(19);
  for (let i = 0; i < 12; i++) {
    const big = i < 2, m = new THREE.Mesh(new THREE.SphereGeometry(big ? 4.5 : 1.6 + r() * 1.2, 20, 14), new THREE.MeshBasicMaterial({ color: i === 0 ? 0xffd060 : i === 1 ? 0xe8f0ff : [0xfff0b0, 0xbfd8ff, 0xffc0a0][i % 3] }));
    glowSprite(m, i === 0 ? 0xffb030 : 0xaac8ff, big ? 26 : 10, 0.8);
    heaven.add(m); orbs.push({ m, a: (i / 12) * Math.PI * 2, rad: 18 + r() * 14, sp: 0.25 + r() * 0.3, y: (r() - 0.5) * 8 });
  }
}
{
  const r = rng(11), n = 3000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = 1700 + r() * 800, s = Math.sqrt(1 - u * u);
    pos.set([rad * s * Math.cos(th), rad * u, rad * s * Math.sin(th)], i * 3);
    const k = 0.6 + r() * 0.4; col.set([k, k * 0.92, k * (0.8 + r() * 0.2)], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  cosmos.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, vertexColors: true })));
  glowSprite(cosmos, 0x6a3aa8, 1500, 0.28, [-1100, 500, -1500]); glowSprite(cosmos, 0x1f5fb0, 1700, 0.25, [1300, -300, -1700]);
  glowSprite(cosmos, 0xffa850, 1100, 0.2, [0, 100, -1800]);
}
{
  const key = new THREE.DirectionalLight(0xffe0b0, 3.2); key.position.set(160, 120, 140); cosmos.add(key);
  cosmos.add(new THREE.AmbientLight(0x4a5a9a, 0.55));
  const rim = new THREE.PointLight(0xffc860, 18000, 0, 1.8); rim.position.set(0, 140, 40); cosmos.add(rim);
}

// ================= set 3: Onam =================
const onam = new THREE.Group(); scene.add(onam);
onam.add(skyDome([[0, '#f59a58'], [0.1, '#a04a78'], [0.3, '#2a2060'], [1, '#080a24']]));
{
  const r = rng(8), n = 700, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const th = r() * Math.PI * 2, y = 0.12 + r() * 0.88, s = Math.sqrt(1 - y * y); pos.set([850 * s * Math.cos(th), 850 * y, 850 * s * Math.sin(th)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  onam.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, color: 0xfff6e0 })));
}
const pookalamTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d'); x.translate(512, 512);
  x.fillStyle = '#1c4a22'; x.beginPath(); x.arc(0, 0, 512, 0, Math.PI * 2); x.fill();
  const rings = [[470, 56, '#ff9a00', 30, 52], [430, 48, '#fff4c9', 26, 44], [380, 40, '#e0223a', 24, 46], [330, 36, '#ffd21f', 22, 40], [285, 32, '#ffffff', 20, 38], [240, 28, '#7a2bbf', 18, 34],
    [195, 24, '#ff7a00', 16, 30], [150, 20, '#f4f08c', 14, 26], [110, 16, '#d0204a', 12, 22]];
  rings.forEach(([rad, n, col, w, l], k) => {
    for (let i = 0; i < n; i++) {
      x.save(); x.rotate((i / n) * Math.PI * 2 + k * 0.1); x.fillStyle = col; x.beginPath(); x.ellipse(0, -rad, w * 0.55, l * 0.75, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(0, -rad + l * 0.25, w * 0.2, l * 0.35, 0, 0, Math.PI * 2); x.fill(); x.restore();
    }
  });
  [[70, '#ffd21f'], [48, '#e0223a'], [26, '#fff4c9']].forEach(([rr, col]) => { x.fillStyle = col; x.beginPath(); x.arc(0, 0, rr, 0, Math.PI * 2); x.fill(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
})();
{
  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, color: 0x9a9a9a }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; onam.add(ground);
  const pk = new THREE.Mesh(new THREE.CircleGeometry(7.6, 96), new THREE.MeshStandardMaterial({ map: pookalamTex, emissiveMap: pookalamTex, emissive: 0xffffff, emissiveIntensity: 0.1, roughness: 1 }));
  pk.rotation.x = -Math.PI / 2; pk.position.y = 0.03; onam.add(pk);
  const dgeo = new THREE.CylinderGeometry(0.2, 0.14, 0.12, 14), dmat = new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.9 });
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2, d = new THREE.Group(); d.position.set(Math.cos(a) * 8.4, 0.06, Math.sin(a) * 8.4);
    d.add(new THREE.Mesh(dgeo, dmat)); const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe0a0 })); f.position.y = 0.15; f.scale.y = 1.6; d.add(f);
    glowSprite(d, 0xffa030, 1.4, 0.9, [0, 0.2, 0]); onam.add(d);
  }
  onam.add(new THREE.HemisphereLight(0x7a6aa8, 0x2a2018, 0.9));
  const warm = new THREE.PointLight(0xffa860, 40, 0, 1.3); warm.position.set(0, 7, 0); onam.add(warm);
  const moon = new THREE.DirectionalLight(0x9ab0ff, 0.9); moon.position.set(-20, 30, -10); onam.add(moon);
}
const baliO = makeRiggedActor(baliGLB);
onam.add(baliO.root); baliO.root.scale.setScalar(BH);
const villagers = [];
{
  const palettes = [[0xf6f0dc, 0xe0b040], [0xf6f0dc, 0xe0b040], [0xe0405a, 0xffd34d], [0x2a8a6a, 0xffd34d], [0xf6f0dc, 0xe0b040], [0xff9d1a, 0xffd34d], [0x4a70d0, 0xffd34d], [0xf6f0dc, 0xe0b040]];
  palettes.forEach(([cloth, trim], i) => {
    const f = makeFigure({ skin: [0xd9a273, 0xc58f64, 0xe0ac7c, 0xb87b52][i % 4], cloth, trim, hair: 0x120a06 });
    const a = (i / palettes.length) * Math.PI * 2 + 0.4, rad = 11.5; f.root.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    faceTo(f.root, 0, 0); f.root.scale.setScalar(2.9 + (i % 3) * 0.2); onam.add(f.root); villagers.push({ f, ph: i * 1.3 });
  });
  const fr = rng(21), n = 90, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe890, size: 0.16, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  onam.add(pts); onam.userData.fireflies = { n, g, seeds: Array.from({ length: n }, () => [fr() * 40 - 20, fr() * 7 + 0.5, fr() * 40 - 20, fr() * 6.28]) };
  onam.userData.pts = pts;
}

// ================= timeline helpers =================
let TL, SN, B, END, envelope = [], FPS_ENV = 30, lastCapKey = '';
const T = (i, f = 0) => SN[i].start + f * (SN[i].end - SN[i].start);
const D = (i) => SN[i].end - SN[i].start;
const prog = (t, a, b) => clamp01((t - a) / Math.max(1e-6, b - a));
const envAt = (t) => { const x = t * FPS_ENV, i = Math.floor(x), f = x - i; return (envelope[i] ?? 0) + ((envelope[i + 1] ?? 0) - (envelope[i] ?? 0)) * f; };

// camera key lists are built at init (they depend on sentence times)
let CAM = null;
const growth = (t) => (t < T(5, 0.05) ? 1 : Math.exp(Math.log(18) * smooth(prog(t, T(5, 0.05), T(5, 0.97)))));
const vamanaHallPos = new THREE.Vector3(3.3, 0, 2.4);
function buildCameras() {
  const growCam = (t) => { const h = VH * growth(t); return [0, 2 + 0.34 * h, 9 + 0.95 * h]; };
  const growLook = (t) => { const h = VH * growth(t); return [3, 0.42 * h, 1]; };
  const vPos = (t) => { const p = prog(t, T(2, 0), T(2, 1) + 0.25), e = 1 - (1 - p) ** 1.6; return [lerp(3.8, 3.3, e), 0.85, lerp(28, 2.4, e)]; };
  CAM = {
    hall1: [
      [T(0, 0), [2, 10, 31], [0, 2.5, 0]],
      [T(1, 0), [-13, 6.5, 19], [-1, 3, 0]],
      [T(1, 1), [-9, 3, 12], [-2, 3, 0]],
      [T(2, 0.3), [-3, 2.0, 12], vPos],
      [T(2, 0.7), [6.2, 1.5, 9], vPos],
      [T(2, 1), [5.4, 1.4, 6.0], vPos],
      [T(3, 0), [0.4, 1.5, 5.4], [3.3, 1.15, 2.4]],
      [T(3, 1), [0.9, 1.3, 4.7], [3.3, 1.2, 2.4]],
      [T(4, 0), [3.8, 3.4, 6.8], [-3, 3.2, 0]],
      [T(4, 1), [4.4, 3.6, 5.8], [-3, 3.4, 0]],
      [T(5, 0), growCam, growLook],
      [T(5, 1), growCam, growLook],
    ],
    cosmos: [
      [T(6, 0), [235, 50, 60], [0, 45, 5]],
      [T(6, 1), [232, 55, 70], [0, 52, 8]],
      [T(7, 0), [232, 55, 70], [0, 60, 12]],
      [T(7, 0.5), [265, 135, 110], [0, 105, 28]],
      [T(7, 1), [290, 150, 150], [0, 112, 30]],
    ],
    hall2: [
      [T(8, 0), [12, 3, 9], [0, 10, 1.5]],
      [T(8, 0.6), [9, 3, 6.5], [0, 6.5, 1.6]],
      [T(8, 1), [7.5, 3.2, 5], [0, 4.2, 1.6]],
      [T(9, 0.2), [6.8, 3.4, 4.2], [0, 3.2, 1.7]],
      [T(9, 0.8), [6.0, 3.8, 4.2], [0, 2.2, 1.7]],
      [T(9, 1), [9.0, 6.5, 7.0], [0, 0.5, 1.7]],
    ],
    onam: [
      [T(10, 0), [16, 2.8, 16], [0, 2.4, 0]],
      [T(10, 0.55), [9, 6.5, 11], [0, 1.2, 0]],
      [END, [0, 34, 0.6], [0, 0, 0]],
    ],
  };
}
const val = (x, t) => (typeof x === 'function' ? x(t) : x);
const _p = new THREE.Vector3(), _l = new THREE.Vector3();
function placeCamera(list, t) {
  let i = list.findIndex((k) => k[0] > t) - 1;
  let u = 0, a = list[0], b = list[0];
  if (i >= 0 && i < list.length - 1) { a = list[i]; b = list[i + 1]; u = smooth(clamp01((t - a[0]) / (b[0] - a[0]))); }
  else if (i < 0 && t >= list[0][0]) { a = b = list[list.length - 1]; }
  else if (i >= list.length - 1) { a = b = list[list.length - 1]; }
  _p.fromArray(val(a[1], t)).lerp(new THREE.Vector3().fromArray(val(b[1], t)), u);
  _l.fromArray(val(a[2], t)).lerp(new THREE.Vector3().fromArray(val(b[2], t)), u);
  _p.x += Math.sin(t * 0.7) * 0.05 * (list === CAM.cosmos ? 20 : 1); _p.y += Math.cos(t * 0.55) * 0.04 * (list === CAM.cosmos ? 20 : 1);
  camera.position.copy(_p); camera.lookAt(_l);
}

// ================= poses =================
const swing = (f, ph, amp) => { f.legL.rotation.x = Math.sin(ph) * amp; f.legR.rotation.x = -Math.sin(ph) * amp; f.armL.rotation.x = -Math.sin(ph) * amp * 0.9; };
const idle = (f, t, k = 1) => { f.root.position.y += Math.sin(t * 1.8 + k) * 0.01 * f.root.scale.y; };
const GH = 3.3; // Shukracharya's height
function poseHall(t, phase) {
  [vamana, bali, guru].forEach((f) => f.reset());
  const e = envAt(t), breathe = Math.sin(t * 1.8);
  // --- Bali Chakravarti
  bali.root.visible = true; bali.root.scale.setScalar(BH);
  if (phase === 1) {
    const back = smooth(prog(t, T(5, 0), T(5, 0.9)));
    bali.root.position.set(-3 - back * 3.2, 0, -0.5 + back * 0.4);
    faceTo(bali.root, vamanaHallPos.x, vamanaHallPos.z);
    bali.rot('chest', 'x', breathe * 1.2);
    const open = smooth(prog(t, T(1, 0.1), T(1, 0.6))) * (t < T(2, 0) ? 1 : 0.55); // generous, open hands
    bali.rot('upperArm_L', 'z', 26 * open); bali.rot('upperArm_R', 'z', -26 * open);
    bali.rot('foreArm_L', 'x', -32 * open); bali.rot('foreArm_R', 'x', -32 * open);
    if (t >= T(2, 0.2) && t < T(5, 0)) bali.rot('head', 'x', 6 * smooth(prog(t, T(2, 0.2), T(2, 0.8)))); // looks down at the tiny visitor
    if (t >= T(4, 0) && t < T(5, 0)) { // laughs and agrees
      const k = Math.sin(t * 9); bali.root.position.y += Math.abs(k) * 0.05;
      bali.rot('head', 'x', -16); bali.rot('chest', 'x', -4 + k * 2.5); bali.rot('upperArm_L', 'x', -14); bali.rot('upperArm_R', 'x', -14);
    }
    if (t >= T(5, 0.1)) { // awe as Vamana grows
      const up = smooth(prog(t, T(5, 0.1), T(5, 0.6)));
      bali.rot('upperArm_L', 'z', 62 * up); bali.rot('upperArm_R', 'z', -62 * up); bali.rot('head', 'x', -24 * up); bali.rot('chest', 'x', -7 * up);
    }
  } else {
    const bow = smooth(prog(t, T(8, 0.1), T(8, 0.85))), sink = smooth(prog(t, T(9, 0.55), T(9, 1.0)));
    bali.root.position.set(0, -sink * 4.6, 3.4); bali.root.rotation.y = Math.PI;
    bali.rot('hips', 'x', 10 * bow); bali.rot('spine', 'x', 24 * bow); bali.rot('chest', 'x', 20 * bow); bali.rot('neck', 'x', 12 * bow); bali.rot('head', 'x', 8 * bow);
    bali.rot('upperArm_L', 'x', -48 * bow); bali.rot('upperArm_R', 'x', -48 * bow); bali.rot('foreArm_L', 'x', -62 * bow); bali.rot('foreArm_R', 'x', -62 * bow);
    bali.rot('upperArm_L', 'z', -12 * bow); bali.rot('upperArm_R', 'z', 12 * bow); // hands brought together
  }
  bali.rig.apply();
  // --- Shukracharya
  guru.root.visible = phase === 1 && t < T(5, 1);
  guru.root.position.set(-8.4, 0, -3.2); guru.root.scale.setScalar(GH); faceTo(guru.root, 0, 0);
  guru.rot('chest', 'x', breathe * 1.0);
  if (t >= T(4, 0.3) && t < T(5, 0)) { // warns the king
    const w = smooth(prog(t, T(4, 0.3), T(4, 0.5)));
    guru.rot('head', 'y', Math.sin(t * 7) * 20 * w); guru.rot('upperArm_R', 'x', -72 * w); guru.rot('foreArm_R', 'x', -26 * w); guru.rot('chest', 'y', -8 * w);
  }
  if (t >= T(5, 0.05)) { const aw = smooth(prog(t, T(5, 0.05), T(5, 0.4))); guru.rot('head', 'x', -16 * aw); guru.rot('upperArm_R', 'z', -50 * aw); guru.rot('chest', 'x', -5 * aw); }
  guru.rig.apply();
  // --- Vamana
  if (phase === 1) {
    vamana.root.visible = t >= T(2, 0) - 0.05;
    const w = prog(t, T(2, 0), T(2, 1) + 0.25), e1 = 1 - (1 - w) ** 1.6;
    vamana.root.position.set(lerp(3.8, vamanaHallPos.x, e1), 0, lerp(28, vamanaHallPos.z, e1));
    if (w < 1) { // walking in
      vamana.root.rotation.y = Math.atan2(vamanaHallPos.x - 3.8, vamanaHallPos.z - 28);
      const ph = t * 8, s1 = Math.sin(ph), c1 = Math.cos(ph);
      vamana.rot('thigh_L', 'x', -30 * s1); vamana.rot('thigh_R', 'x', 30 * s1);
      vamana.rot('shin_L', 'x', 38 * Math.max(0, -c1)); vamana.rot('shin_R', 'x', 38 * Math.max(0, c1));
      vamana.rot('upperArm_L', 'x', 20 * s1); vamana.rot('foreArm_R', 'x', -4 * s1);
      vamana.rot('hips', 'z', 3 * s1); vamana.rot('chest', 'y', -5 * s1); vamana.rot('head', 'y', 3 * s1);
      vamana.body.position.y = Math.abs(s1) * 0.03;
    } else {
      faceTo(vamana.root, bali.root.position.x, bali.root.position.z);
      vamana.rot('chest', 'x', breathe * 1.5);
      const ask = smooth(prog(t, T(3, 0.05), T(3, 0.35))) * (t < T(4, 0) ? 1 : 1 - smooth(prog(t, T(4, 0), T(4, 0.3)))); // holds out the kamandalu and asks
      vamana.rot('head', 'x', -15 * ask); vamana.rot('chest', 'x', -4 * ask);
    }
    vamana.root.scale.setScalar(VH * growth(t));
    vamana.glow(smooth(prog(t, T(5, 0.1), T(5, 0.9))) * 0.45);
  } else {
    // giant Vamana lifts his right foot over the bowed king, lowers it onto his head and presses him into Sutala
    vamana.root.visible = true; vamana.root.scale.setScalar(13); vamana.root.rotation.y = 0;
    vamana.root.position.set(0, 0, -2.8);
    const lift = smooth(prog(t, T(8, 0.0), T(8, 0.9))), press = smooth(prog(t, T(9, 0.2), T(9, 0.95))), bless = smooth(prog(t, T(9, 0.45), T(9, 0.9)));
    const thigh = -72 * lift + 57 * press, shin = 12 * lift - 8 * press;
    vamana.rot('thigh_R', 'x', thigh); vamana.rot('shin_R', 'x', shin); vamana.rot('foot_R', 'x', -(thigh + shin) - 4); // keep the sole level
    vamana.rot('spine', 'x', -8 * lift * (1 - press)); vamana.rot('upperArm_L', 'x', -66 * bless); vamana.rot('foreArm_L', 'x', -30 * bless);
    vamana.glow(0.3);
  }
  vamana.rig.apply();
  fireLight.intensity = 30 * (0.85 + 0.15 * Math.sin(t * 17) + 0.1 * Math.sin(t * 31 + 1) + e * 0.2);
  flames.forEach((m, i) => { m.scale.set(1 + 0.15 * Math.sin(t * 11 + i), 1 + 0.3 * Math.sin(t * 13 + i * 2) + e * 0.3, 1 + 0.15 * Math.cos(t * 9 + i)); m.rotation.y = t * 2 + i; });
  const pos = sparks.g.attributes.position;
  for (let i = 0; i < sparks.n; i++) {
    const [a, b, c, d] = sparks.seeds[i], life = (t * (0.35 + d * 0.5) + a) % 1, ang = b * 6.28 + life * 2;
    pos.setXYZ(i, Math.cos(ang) * (0.3 + c * 0.9) * (1 + life), 0.8 + life * (5 + c * 4), Math.sin(ang) * (0.3 + c * 0.9) * (1 + life));
  }
  pos.needsUpdate = true;
}
function poseCosmos(t) {
  cv.reset(); cv.glow(0.22);
  const land1 = smooth(prog(t, T(6, 0), T(6, 0.45)));          // first step: descends onto the Earth
  const up2 = prog(t, T(7, 0), T(7, 0.5)), e2 = smooth(up2);   // second step: strides up onto the heavens
  cv.root.position.set(0, (1 - land1) * 24 + e2 * 85 + Math.sin(Math.PI * up2) * 22, e2 * 46);
  cv.body.rotation.x = 0.07 * Math.sin(Math.PI * land1) + 0.1 * Math.sin(Math.PI * up2);
  const air1 = 1 - land1, sw = Math.sin(Math.PI * up2);
  cv.rot('thigh_R', 'x', -50 * air1); cv.rot('shin_R', 'x', 30 * air1); cv.rot('thigh_L', 'x', 14 * air1 - 46 * sw); cv.rot('shin_L', 'x', 30 * sw); cv.rot('thigh_R', 'x', 18 * sw);
  cv.rot('upperArm_L', 'z', 22); cv.rot('chest', 'x', -4);
  cv.rig.apply();
  earth.rotation.y = t * 0.05;
  earth.scale.setScalar(Math.max(0.001, smooth(prog(t, T(6, 0), T(6, 0.25)))));
  const r1 = prog(t, T(6, 0.45), T(6, 0.9)), r2 = prog(t, T(7, 0.5), T(7, 0.95));
  footRing.visible = r1 > 0 && r1 < 1; footRing.scale.setScalar(1 + 9 * r1); footRing.material.opacity = 0.9 * (1 - r1);
  footRing2.visible = r2 > 0 && r2 < 1; footRing2.scale.setScalar(1 + 9 * r2); footRing2.material.opacity = 0.9 * (1 - r2);
  heaven.scale.setScalar(Math.max(0.001, smooth(prog(t, T(7, 0.0), T(7, 0.5)))));
  orbs.forEach((o) => { const a = o.a + t * o.sp; o.m.position.set(Math.cos(a) * o.rad, o.y, Math.sin(a) * o.rad); });
}
function poseOnam(t) {
  const e = envAt(t);
  baliO.reset(); baliO.root.position.set(-2.6, 0, 4.2); baliO.root.scale.setScalar(BH); faceTo(baliO.root, 6, 12);
  const wv = Math.sin(t * 3);
  baliO.rot('upperArm_R', 'z', -125 + wv * 6); baliO.rot('foreArm_R', 'z', -18 * wv); baliO.rot('upperArm_L', 'z', 14);
  baliO.rot('head', 'x', -6 + e * 3); baliO.rot('chest', 'x', Math.sin(t * 2.2) * 1.5);
  baliO.root.position.y = Math.abs(Math.sin(t * 2.2)) * 0.05;
  baliO.rig.apply();
  villagers.forEach(({ f, ph }) => { f.reset(); const w = Math.sin(t * 3.2 + ph); f.armL.rotation.set(-2.5 + w * 0.25, 0, -0.3); f.armR.rotation.set(-2.5 - w * 0.25, 0, 0.3); f.root.position.y = Math.abs(w) * 0.1; });
  const ff = onam.userData.fireflies, pos = ff.g.attributes.position;
  for (let i = 0; i < ff.n; i++) { const [x, y, z, p] = ff.seeds[i]; pos.setXYZ(i, x + Math.sin(t * 0.6 + p) * 1.5, y + Math.sin(t * 0.9 + p * 2) * 0.8, z + Math.cos(t * 0.5 + p) * 1.5); }
  pos.needsUpdate = true;
  onam.userData.pts.material.opacity = 0.55 + 0.45 * Math.sin(t * 2.3);
}

// ================= overlays =================
const capEl = document.getElementById('cap'), titleEl = document.getElementById('title'), flashEl = document.getElementById('flash');
function captions(t) {
  const s = SN.find((s) => t >= s.start - 0.15 && t <= s.end + 0.45);
  if (!s) { if (lastCapKey) { capEl.innerHTML = ''; lastCapKey = ''; } return; }
  const on = s.words.map((w) => (t >= w.start ? 1 : 0)).join(''), key = s.start + on;
  if (key === lastCapKey) return;
  lastCapKey = key;
  capEl.innerHTML = s.words.map((w, i) => `<span class="${on[i] === '1' ? 'on' : ''}">${w.text}</span>`).join(' ');
}
function overlays(t) {
  let o = 0, txt = '';
  if (t < T(0, 0.9)) { o = Math.min(clamp01((t - 0.2) / 0.8), clamp01((T(0, 0.9) - t) / 0.6)); txt = window.VAMANA_TITLES?.start ?? 'Vamana · The Dwarf Avatar'; }
  else if (t > T(10, 0.62)) { o = clamp01((t - T(10, 0.62)) / 0.9); txt = window.VAMANA_TITLES?.end ?? 'Happy Onam'; }
  titleEl.textContent = txt; titleEl.style.opacity = o;
  let f = 0;
  for (const b of [B[5], B[7], B[9]]) f = Math.max(f, t < b ? smooth(clamp01((t - (b - 0.5)) / 0.5)) : 1 - smooth(clamp01((t - b) / 0.7)));
  flashEl.style.opacity = f;
}

// ================= frame =================
function renderAt(t) {
  const e = envAt(t);
  const set = t < B[5] ? 'hall1' : t < B[7] ? 'cosmos' : t < B[9] ? 'hall2' : 'onam';
  hall.visible = set === 'hall1' || set === 'hall2'; cosmos.visible = set === 'cosmos'; onam.visible = set === 'onam';
  if (hall.visible) poseHall(t, set === 'hall1' ? 1 : 2);
  if (cosmos.visible) poseCosmos(t);
  if (onam.visible) poseOnam(t);
  scene.environmentIntensity = set === 'cosmos' ? 0.55 : 0.3;
  bloom.strength = (set === 'cosmos' ? 0.5 : 0.4) + e * 0.12;
  placeCamera(CAM[set], t);
  captions(t); overlays(t);
  composer.render();
}

window.initScene = (tl, env, fps, total) => {
  TL = tl; SN = tl.sentences; envelope = env; FPS_ENV = fps; END = total; lastCapKey = '';
  B = SN.map((s, i) => (i + 1 < SN.length ? (s.end + SN[i + 1].start) / 2 : s.end));
  if (SN.length < 11) throw new Error(`expected 11 sentences, got ${SN.length}`);
  buildCameras();
  return true;
};
window.renderAt = renderAt;
if (window.VAMANA_FONTS) await Promise.all(window.VAMANA_FONTS.map((f) => document.fonts.load(f.spec, f.text)));
window.__ready = true;
