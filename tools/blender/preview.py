"""Render turnaround previews of a GLB with Blender (bpy module, Cycles CPU).
usage: python preview.py <model.glb> <out_prefix> [width] [height]
"""
import sys, math, bpy
from mathutils import Vector

src, prefix = sys.argv[1], sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 640
H = int(sys.argv[4]) if len(sys.argv) > 4 else 800

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
verts = sum(len(o.data.vertices) for o in meshes)
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
print('MESHES', [(o.name, len(o.data.vertices), len(o.data.polygons)) for o in meshes], 'VERTS', verts)
print('BOUNDS blender-space (Z up) min', tuple(round(v, 3) for v in lo), 'max', tuple(round(v, 3) for v in hi))
print('IMAGES', [(i.name, tuple(i.size)) for i in bpy.data.images])

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.cycles.use_denoising = False
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.image_settings.media_type = 'IMAGE'
scene.render.image_settings.file_format = 'PNG'
scene.world = bpy.data.worlds.new('W'); scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.35, 0.36, 0.42, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 1.0

center = (lo + hi) / 2
size = max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z)
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5
sun.rotation_euler = (math.radians(50), 0, math.radians(30)); scene.collection.objects.link(sun)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cam.data.lens = 70
scene.collection.objects.link(cam); scene.camera = cam
# glTF +Y up / +Z front becomes Blender Z up / -Y front; view from front, side, back
for name, ang in (('front', -90), ('side', 0), ('back', 90)):
    a = math.radians(ang)
    cam.location = center + Vector((math.cos(a), math.sin(a), 0.12)) * size * 2.2
    cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{prefix}_{name}.png'
    bpy.ops.render.render(write_still=True)
    print('rendered', scene.render.filepath)
