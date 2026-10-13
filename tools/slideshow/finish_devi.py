"""Finishing pass for the Devi forms film: golden glow + warm grade + vignette, drifting golden light particles, divine background
music (ducked under the voice) and a few bell/conch accents.  usage: python3 tools/slideshow/finish_devi.py
inputs : out/devi-forms/video.mp4 (silent edit), narration_full.mp3, music/divine_A.mp3 + divine_B.mp3, durations.json
output : out/devi-forms/devi_forms_final.mp4 (+ _share.mp4)"""
import json, os, subprocess
import numpy as np
O = 'out/devi-forms'; W, H, FPS, T = 1280, 720, 30, 20  # particle loop: 20 s, seamless
dur = json.load(open(f'{O}/durations.json')); keys = list(dur); total = sum(dur.values())
starts = {}; acc = 0.0
for k in keys: starts[k] = acc; acc += dur[k]
def particles(path):
    rng = np.random.default_rng(7); N = 150; M = 20
    x0 = rng.uniform(0, W, N); y0 = rng.uniform(0, H + 2 * M, N); k = rng.integers(1, 4, N); size = rng.choice([2, 3, 4, 6, 9], N, p=[.3, .3, .2, .15, .05])
    sway = rng.uniform(6, 26, N); sph = rng.uniform(0, 6.283, N); tw = rng.integers(1, 6, N); tph = rng.uniform(0, 6.283, N)
    col = np.array([[255, 214, 130], [255, 236, 190], [255, 190, 110], [255, 200, 220]], float)[rng.choice(4, N, p=[.5, .25, .15, .1])] / 255
    sprites = {}
    for sz in set(size.tolist()):
        r = sz * 2.2; yy, xx = np.mgrid[-int(r):int(r) + 1, -int(r):int(r) + 1]; sprites[sz] = np.exp(-(xx ** 2 + yy ** 2) / (2 * (sz * 0.7) ** 2)).astype(np.float32)
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)
    for f in range(FPS * T):
        t = f / FPS; cv = np.zeros((H, W, 3), np.float32)
        for i in range(N):
            y = H + M - ((y0[i] + k[i] * (H + 2 * M) * t / T) % (H + 2 * M)); x = x0[i] + sway[i] * np.sin(2 * np.pi * t / T * (1 + i % 3) + sph[i])
            a = (0.55 + 0.45 * np.sin(2 * np.pi * tw[i] * t / T + tph[i])) * (0.5 + 0.1 * size[i])
            sp = sprites[int(size[i])]; r = sp.shape[0] // 2; xi, yi = int(x), int(y)
            ya, yb, xa, xb = max(yi - r, 0), min(yi + r + 1, H), max(xi - r, 0), min(xi + r + 1, W)
            if ya >= yb or xa >= xb: continue
            cv[ya:yb, xa:xb] += sp[ya - (yi - r):yb - (yi - r), xa - (xi - r):xb - (xi - r), None] * col[i] * a
        ff.stdin.write((np.clip(cv, 0, 1) * 255).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()
P = f'{O}/music/particles_loop.mp4'
if not os.path.exists(P): particles(P)
# music: A then B with a long crossfade, ducked under the narration
tot = f'{total:.2f}'
bell = [starts[k] + 0.2 for k in ('card_sapta', 'card_dasha', 'card_nava', 'sringeri_title')]; closing = starts['card_closing']
sfx = [(0.3, 'out/purana-samba/sfx_conch.mp3', 0.55)] + [(t, 'out/purana-samba/sfx_bell.mp3', 0.5) for t in bell] + [(closing + 0.3, 'out/purana-samba/sfx_bell.mp3', 0.6)]
inp = ['-i', f'{O}/video.mp4', '-i', f'{O}/narration_full.mp3', '-i', f'{O}/music/divine_A.mp3', '-i', f'{O}/music/divine_B.mp3', '-stream_loop', '-1', '-i', P] + sum([['-i', f] for _, f, _ in sfx], [])
fx = ';'.join(f'[{5 + i}:a]adelay={int(t * 1000)}|{int(t * 1000)},volume={v}[fx{i}]' for i, (t, _, v) in enumerate(sfx))
fl = (
 "[0:v]format=gbrp,split=2[a][b];[b]gblur=sigma=16[g];[a][g]blend=all_mode=screen:all_opacity=0.24,format=yuv420p[gl];"  # blends must run in RGB, never on YUV chroma
 "[gl]eq=saturation=1.12:contrast=1.04:gamma_r=1.03:gamma_b=0.96,vignette=angle=PI/5,format=gbrp[base];"
 f"[4:v]trim=duration={tot},setpts=PTS-STARTPTS,format=gbrp[pt];[base][pt]blend=all_mode=screen:all_opacity=0.9,format=yuv420p[v];"
 "[2:a][3:a]acrossfade=d=8:c1=tri:c2=tri[mus];"
 f"[mus]atrim=0:{tot},asetpts=N/SR/TB,volume=0.55,afade=t=in:d=3,afade=t=out:st={total - 4:.2f}:d=4[m0];"
 "[1:a]apad=pad_dur=4,asplit=2[nar][key];"
 "[m0][key]sidechaincompress=threshold=0.02:ratio=9:attack=30:release=600:makeup=1[mduck];"
 f"{fx};"
 f"[nar][mduck]{''.join(f'[fx{i}]' for i in range(len(sfx)))}amix=inputs={2 + len(sfx)}:duration=longest:normalize=0,atrim=0:{tot},afade=t=out:st={total - 2:.2f}:d=2[a]")
subprocess.run(['ffmpeg', '-y', '-v', 'error'] + inp + ['-filter_complex', fl, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-t', tot, '-movflags', '+faststart', f'{O}/devi_forms_final.mp4'], check=True)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f'{O}/devi_forms_final.mp4', '-c:v', 'libx264', '-crf', '26', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', f'{O}/devi_forms_final_share.mp4'], check=True)
print('done', total)
