"""Orthographic front/side workbench renders of a GLB for measuring joint positions.
Pixel mapping (880x1100 image, 500 px per metre): px = 440 + 500*u, py = 1050 - 500*z, where u = x (front view) or y (side view).
usage: python ortho.py <model.glb> <out_prefix>
"""
import sys, bpy, math
from mathutils import Vector
src, prefix = sys.argv[1], sys.argv[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 6; sc.cycles.use_denoising = False  # no GPU here, so no Workbench
sc.render.resolution_x, sc.render.resolution_y = 880, 1100
sc.render.image_settings.media_type = 'IMAGE'; sc.render.image_settings.file_format = 'PNG'
sc.world = bpy.data.worlds.new('W'); sc.world.use_nodes = True
bg = sc.world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.6, 0.62, 0.68, 1); bg.inputs[1].default_value = 1.6  # flat even light
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.2
cam.data.clip_start, cam.data.clip_end = 0.01, 50
sc.collection.objects.link(cam); sc.camera = cam
for name, loc, rot in (('front', (0, -5, 1.0), (math.radians(90), 0, 0)), ('side', (5, 0, 1.0), (math.radians(90), 0, math.radians(90)))):
    cam.location, cam.rotation_euler = loc, rot
    sc.render.filepath = f'{prefix}_{name}.png'
    bpy.ops.render.render(write_still=True)
