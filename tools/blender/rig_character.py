"""Decimate, rig and export a static character GLB with Blender (bpy module).
usage: python rig_character.py <spec.json> <in.glb> <out.glb> [--decimate 0.2] [--test <png_prefix>]
Blender space: +X = the character's left, -Y = front, +Z = up. Joint positions in the spec were measured from
orthographic grid renders (tools/blender/ortho.py, 500 px per metre).

Skin weights are a pure function of 3D position (the glTF import splits the mesh into thousands of UV-seam islands, so
position-based weights keep seam vertices identical and the texture from tearing). Each bone has a radius: weight falls off
with distance to the bone segment divided by that radius, with a tiny broad tail so far-away vertices (toes, hems) still
follow their nearest bone. Spec "boxes" and "capsules" force accessories (pot, staff, umbrella) to ride one bone rigidly,
and the head is rigid above the neck.
"""
import sys, json, math, argparse, bpy, numpy as np
from mathutils import Vector, Matrix

ap = argparse.ArgumentParser()
ap.add_argument('spec'); ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--decimate', type=float, default=1.0)
ap.add_argument('--max-texture', type=int, default=2048)
ap.add_argument('--test', default=None)
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
spec = json.load(open(args.spec))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args.src)
mesh = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
mesh.name = spec['name']

if args.decimate < 1.0:
    bpy.context.view_layer.objects.active = mesh; mesh.select_set(True)
    before = len(mesh.data.polygons)
    mod = mesh.modifiers.new('decimate', 'DECIMATE'); mod.decimate_type = 'COLLAPSE'; mod.ratio = args.decimate; mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name); bpy.ops.object.shade_smooth()
    print(f'decimated {before} -> {len(mesh.data.polygons)} faces')
for img in bpy.data.images:
    if max(img.size) > args.max_texture:
        k = args.max_texture / max(img.size); img.scale(int(img.size[0] * k), int(img.size[1] * k))

# ---- armature ------------------------------------------------------------------------------------------------------
BONES = spec['bones']
names = list(BONES)
arm_data = bpy.data.armatures.new('Rig'); arm = bpy.data.objects.new('Rig', arm_data)
bpy.context.scene.collection.objects.link(arm); bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for n, b in BONES.items():
    eb = arm_data.edit_bones.new(n); eb.head, eb.tail = Vector(b['head']), Vector(b['tail'])
    eb.parent = arm_data.edit_bones[b['parent']] if b.get('parent') else None
bpy.ops.object.mode_set(mode='OBJECT')

# ---- weights -------------------------------------------------------------------------------------------------------
co = np.empty(len(mesh.data.vertices) * 3); mesh.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
def seg_dist(P, a, b):
    a, b = np.array(a, float), np.array(b, float); ab = b - a
    t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)
def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def box(v, f):  # f = [lo0, lo1, hi0, hi1]: ramps up over lo0..lo1, down over hi0..hi1
    return sstep(f[0], f[1], v) * (1 - sstep(f[2], f[3], v))

d = np.stack([seg_dist(co, BONES[n]['head'], BONES[n]['tail']) for n in names], axis=1)
U = d / np.array([BONES[n]['radius'] for n in names])
W = np.exp(-1.6 * U ** 2) + 0.002 * np.exp(-0.35 * U ** 2)
col = {n: i for i, n in enumerate(names)}

hd = spec['head']
d_head = seg_dist(co, *hd['seg'])
cap_mask = np.zeros(len(co))
for r in spec.get('capsules', []):  # e.g. umbrella: rigid inside r0, fades out by r1, never on the head, mostly off the holding hand
    dc = seg_dist(co, r['a'], r['b'])
    m = (1 - sstep(r['r0'], r['r1'], dc)) * sstep(hd['r0'], hd['r1'], d_head) * (co[:, 2] > r.get('min_z', -9))
    if r.get('keep_hand'):
        dh = seg_dist(co, BONES[r['keep_hand']]['head'], BONES[r['keep_hand']]['tail'])
        m = m * (1 - 0.8 * (1 - sstep(0.03, 0.07, dh)))
    W = W * (1 - m[:, None]); W[:, col[r['bone']]] += m; cap_mask = np.maximum(cap_mask, m)
for r in spec.get('boxes', []):  # accessories that ride rigidly on one bone
    m = box(co[:, 0], r['x']) * box(co[:, 1], r['y']) * box(co[:, 2], r['z'])
    W = W * (1 - m[:, None]); W[:, col[r['bone']]] += m
m_head = sstep(hd['z0'], hd['z1'], co[:, 2]) * (1 - sstep(hd['r0'], hd['r1'], d_head)) * (1 - cap_mask)
W = W * (1 - m_head[:, None]); W[:, col[hd['bone']]] += m_head

top = np.argsort(-W, axis=1)[:, :4]  # glTF supports 4 influences per vertex
keep = np.zeros_like(W, dtype=bool); np.put_along_axis(keep, top, True, axis=1)
W = np.where(keep, W, 0); W /= W.sum(axis=1, keepdims=True)
print('weights: mean influences', round(float((W > 0.02).sum(axis=1).mean()), 2), '| vertices', len(co))
for n in names: mesh.vertex_groups.new(name=n)
for vi in range(len(co)):
    for bi in np.nonzero(W[vi] > 0.01)[0]:
        mesh.vertex_groups[names[bi]].add([vi], float(W[vi, bi]), 'REPLACE')
mesh.parent = arm; mesh.matrix_parent_inverse = arm.matrix_world.inverted()
amod = mesh.modifiers.new('Armature', 'ARMATURE'); amod.object = arm

# ---- optional pose previews ---------------------------------------------------------------------------------------
def rot_world(pb, axis, deg):
    bpy.context.view_layer.update()
    pivot = arm.matrix_world @ pb.head
    R = Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-pivot)
    pb.matrix = arm.matrix_world.inverted() @ R @ arm.matrix_world @ pb.matrix
    bpy.context.view_layer.update()
def clear_pose():
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    bpy.context.view_layer.update()

if args.test:
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 10; sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = 520, 660
    sc.render.image_settings.media_type = 'IMAGE'; sc.render.image_settings.file_format = 'PNG'
    sc.world = bpy.data.worlds.new('W'); sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.6, 0.62, 0.68, 1); bg.inputs[1].default_value = 1.6
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.3
    sc.collection.objects.link(cam); sc.camera = cam
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE')
    for pname, ops in spec['test_poses'].items():
        clear_pose()
        for bone, axis, deg in ops: rot_world(arm.pose.bones[bone], axis, deg)
        for view, loc, rot in (('front', (0, -5, 1.0), (math.radians(90), 0, 0)), ('side', (5, 0, 1.0), (math.radians(90), 0, math.radians(90)))):
            cam.location, cam.rotation_euler = loc, rot
            sc.render.filepath = f'{args.test}_{pname}_{view}.png'; bpy.ops.render.render(write_still=True)
    clear_pose(); bpy.ops.object.mode_set(mode='OBJECT')

# ---- export ----------------------------------------------------------------------------------------------------------
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=args.dst, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=88,
                          use_selection=True, export_skins=True, export_animations=False, export_yup=True)
print('exported', args.dst)
