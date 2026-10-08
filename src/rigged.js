// Rigged-character helpers shared by scenes (models are rigged by tools/blender/rig_character.py).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const loadRigged = async (name) => (await new GLTFLoader().loadAsync(`/assets/models/${name}_rigged.glb`)).scene;

// Bone control. Rotations are about the character's own axes ('x' pitch: negative swings a hanging limb forward / raises it;
// 'y' yaw; 'z' roll: positive abducts the left arm outward) and compose down the skeleton.
const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
export class BoneRig {
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

// A rigged character as a group 1 unit tall (feet at y=0, facing +z); scale root to the height you want.
// Materials are cloned per actor so the same model can play different roles with different looks.
export function makeActor(gltfScene) {
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const body = new THREE.Group(); root.add(body);
  const model = SkeletonUtils.clone(gltfScene); model.scale.setScalar(1 / 1.9); body.add(model);
  const mats = [];
  model.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = true; o.frustumCulled = false; mats.push(o.material); } });
  const rig = new BoneRig(model), baseColors = mats.map((m) => m.color.clone());
  return {
    root, body, model, rig, mats, rot: (n, ax, deg) => rig.rot(n, ax, deg),
    reset() { rig.reset(); body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); root.rotation.set(0, root.rotation.y, 0); },
    tint(color, k) { mats.forEach((m, i) => m.color.copy(baseColors[i]).lerp(color, k)); }, // k=0 original, 1 fully tinted
    glow(color, k) { mats.forEach((m) => { m.emissive = m.emissive || new THREE.Color(); m.emissive.set(color); m.emissiveMap = m.map; m.emissiveIntensity = k; m.needsUpdate = true; }); },
    // replace the textured material by a solid emissive "divine" material (for Surya)
    divine(color = 0xffc24a, glow = 1.4) { mats.forEach((m) => { m.map = null; m.normalMap = null; m.emissiveMap = null; m.color.set(color); m.emissive = new THREE.Color(color); m.emissiveIntensity = glow; m.metalness = 0.35; m.roughness = 0.35; m.needsUpdate = true; }); },
  };
}
