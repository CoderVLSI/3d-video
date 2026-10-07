"""Decimate a heavy scanned/AI-generated GLB and recompress its textures with Blender (bpy module).
usage: python optimize_model.py <in.glb> <out.glb> [ratio=0.12] [max_texture=2048] [jpeg_quality=88]
The result keeps UVs, the PBR texture set and the original scale/orientation (feet at y=0, facing +Z in glTF).
"""
import sys, bpy

src, dst = sys.argv[1], sys.argv[2]
ratio = float(sys.argv[3]) if len(sys.argv) > 3 else 0.12
max_tex = int(sys.argv[4]) if len(sys.argv) > 4 else 2048
quality = int(sys.argv[5]) if len(sys.argv) > 5 else 88

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in objs:
    before = len(o.data.polygons)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    mod = o.modifiers.new('decimate', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = ratio
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.shade_smooth()
    print(f'{o.name}: {before} -> {len(o.data.polygons)} faces, {len(o.data.vertices)} verts')

for img in bpy.data.images:
    if max(img.size) > max_tex:
        s = max_tex / max(img.size)
        img.scale(int(img.size[0] * s), int(img.size[1] * s))
    print('texture', img.name, tuple(img.size))

bpy.ops.export_scene.gltf(
    filepath=dst, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=quality,
    export_apply=True, export_yup=True,
)
print('exported', dst)
