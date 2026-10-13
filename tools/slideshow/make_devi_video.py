"""One silent video from the Devi picture grids (assets/images/devi-forms/): Sapta Matrikas, Dasha Mahavidyas, Navadurga,
Sringeri Sharadamba alankaras, each section opened by a title card.
usage: python3 tools/slideshow/make_devi_video.py [durations.json]   -> out/devi-forms/video.mp4 + out/devi-forms/segments.json
durations.json (optional): {"<segment key>": seconds, ...}; keys are in segments.json. Defaults: 8 s per picture, 4 s per card.
Each picture is shown full-frame over a blurred copy of itself with a slow zoom and dissolved into the next."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter
G = 'assets/images/devi-forms'; OUT = 'out/devi-forms'; TMP = f'{OUT}/panels'; CARDS = f'{OUT}/cards'
os.makedirs(TMP, exist_ok=True)
FPS, W, H, XF, INSET = 30, 1280, 720, 0.8, 4
over = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {}

def cut(profile_std, hint, size, win=30):  # the divider between pictures is a thin uniform line: lowest spread along its length
    c = int(hint * size); lo, hi = max(c - win, 1), min(c + win, size - 1)
    return lo + int(np.argmin(profile_std[lo:hi]))
def split(path, layout, row_hints):
    im = Image.open(path).convert('RGB'); g = np.asarray(im.convert('L')).astype(float); Hh, Ww = g.shape
    ry = [0] + [cut(g.std(axis=1), h, Hh) for h in row_hints] + [Hh]
    out = []
    for r, n in enumerate(layout):
        strip = g[ry[r]:ry[r + 1]]
        cx = [0] + [cut(strip.std(axis=0), k / n, Ww) for k in range(1, n)] + [Ww]
        for c in range(n):
            x0, x1 = cx[c] + (INSET if c else 0), cx[c + 1] - (INSET if c < n - 1 else 0)
            y0, y1 = ry[r] + (INSET if r else 0), ry[r + 1] - (INSET if r < len(layout) - 1 else 0)
            out.append(im.crop((x0, y0, x1, y1)))
    return out

NAMES = {
 'sapta': ['Brahmani', 'Maheshwari', 'Kaumari', 'Vaishnavi', 'Varahi', 'Indrani', 'Chamunda', 'Narasimhi', 'Yogeshwari'],
 'dasha': ['Kali', 'Tara', 'Tripurasundari', 'Bhuvaneshwari', 'Bhairavi', 'Chinnamasta', 'Dhumavati', 'Bagalamukhi', 'Matangi', 'Kamalatmika'],
 'nava': ['Shailaputri', 'Brahmacharini', 'Chandraghanta', 'Kushmanda', 'Skandamata', 'Katyayani', 'Kalaratri', 'Mahagauri', 'Siddhidatri'],
 'sringeri': ['Jagatprasutika', 'Hamsavahini Brahmi', 'Mayuravahini Kaumari', 'Rishabhavahini Maheshwari', 'Garudavahini Vaishnavi', 'Veena Sharada', 'Mohini', 'Gajalakshmi', 'Simhavahini', 'Rajarajeshwari', 'Indrani', 'Sri Sharadamba Navaratri Alankaras (title)'],
}
sapta = split(f'{G}/sapta_matrikas_grid.png', [4, 5], [0.445])
dasha = split(f'{G}/dasha_mahavidyas_grid.png', [5, 5], [0.47])
nava = split(f'{G}/navadurga_grid.png', [3, 3, 3], [0.313, 0.635])
sring = split(f'{G}/sringeri_alankaras_grid.png', [4, 4, 4], [0.32, 0.645])
segs = [('card_intro', f'{CARDS}/card_intro.png', 4.0), ('card_sapta', f'{CARDS}/card_sapta.png', 4.0)]
segs += [(f'sapta_{NAMES["sapta"][i].lower()}', sapta[i], 8.0) for i in range(7)]  # the seven Matrikas (Narasimhi and Yogeshwari, panels 8-9, are left out)
segs += [('card_dasha', f'{CARDS}/card_dasha.png', 4.0)] + [(f'dasha_{n.lower()}', dasha[i], 8.0) for i, n in enumerate(NAMES['dasha'])]
segs += [('card_nava', f'{CARDS}/card_nava.png', 4.0)] + [(f'nava_{n.lower()}', nava[i], 8.0) for i, n in enumerate(NAMES['nava'])]
segs += [('sringeri_title', sring[11], 4.0)] + [(f'sringeri_{NAMES["sringeri"][i].lower().replace(" ", "_")}', sring[i], 8.0) for i in range(11)]

segs += [('card_closing', f'{CARDS}/card_closing.png', 8.0)]  # closing lines 43-44 + "Sri Matre Namaha"
items = []
for k, src, d in segs:
    if isinstance(src, str): im = Image.open(src).convert('RGB')
    else: im = src
    f = f'{TMP}/{k}.png'
    if not isinstance(src, str) or True:
        up = im.resize((im.width * 4, im.height * 4), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2)) if im.width < 1100 else im
        up.save(f)
    items.append((k, f, im.width / im.height, float(over.get(k, d))))
vids = []
for i, (k, f, asp, d) in enumerate(items):
    L = d + (XF if i < len(items) - 1 else 0); n = int(round(L * FPS)); FH = int(round(H * 0.94 / 2)) * 2; fw = int(round(FH * asp / 2)) * 2  # picture fills 94% of the height so captions near its edge never leave the frame
    flt = (f"[0:v]split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=28:4,eq=brightness=-0.18[bg];"
           f"[b]scale=-2:{FH * 2},zoompan=z='1+0.035*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={fw}x{FH}:fps={FPS}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p")
    o = f'{TMP}/s_{i:02d}.mp4'
    if not os.path.exists(o) or os.path.getmtime(o) < os.path.getmtime(f):
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-i', f, '-t', f'{L:.3f}', '-filter_complex', flt, '-r', str(FPS), '-c:v', 'libx264', '-crf', '17', '-preset', 'veryfast', o], check=True)
    vids.append(o); print('segment', i, k, flush=True)
tot = sum(d for *_, d in items); starts = []; acc = 0.0
for k, f, asp, d in items: starts.append({'key': k, 'start': round(acc, 2), 'seconds': d}); acc += d
json.dump(starts, open(f'{OUT}/segments.json', 'w'), indent=1)
cmd = ['ffmpeg', '-y', '-v', 'error'] + sum([['-i', v] for v in vids], [])
g, prev, acc = [], '0:v', 0.0
for i in range(1, len(vids)):
    acc += items[i - 1][3]; g.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={XF}:offset={acc:.3f}[x{i}]"); prev = f'x{i}'
g.append(f"[{prev}]fade=t=in:st=0:d=0.8,fade=t=out:st={tot - 0.8:.3f}:d=0.8,format=yuv420p[v]")
subprocess.run(cmd + ['-filter_complex', ';'.join(g), '-map', '[v]', '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-movflags', '+faststart', f'{OUT}/video.mp4'], check=True)
print('done', f'{OUT}/video.mp4', round(tot, 1), 's', len(items), 'segments')
