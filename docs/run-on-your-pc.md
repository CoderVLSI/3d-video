# Rendering on your own PC (Windows + NVIDIA GPU)

The cloud container has no GPU and renders at ~1 frame/s. A PC with an RTX card should be many times faster.
All narration/music/timelines are committed, so you do **not** need an ElevenLabs key just to render.

## One-time setup
1. Install **Node.js 22**, **Git**, and **ffmpeg** (add ffmpeg to PATH: `winget install Gyan.FFmpeg`).
2. Clone the repo and open a terminal in it:
   ```
   git clone https://github.com/CoderVLSI/3d-video
   cd 3d-video
   git checkout ccr-57307597-khh5qh
   npm install
   npx playwright install chromium
   ```
3. Check that WebGL really uses your GPU:
   ```
   node src/render.mjs vamana-te --check-gpu
   ```
   It must print `GPU OK` (a line mentioning NVIDIA/RTX/ANGLE Direct3D11). If it says `NOT using the GPU`, update the NVIDIA driver and try `set CHROMIUM_CHANNEL=chrome` (uses your installed Chrome) first.

## Render
```
node src/render.mjs purana-samba --gpu        # Part 1, ~77 s of film
node src/render.mjs vamana-te --gpu           # Vamana (Telugu), ~96 s
```
Output: `out/<project>/video.mp4` (frames are cached in `out/<project>/frames`, so you can stop and resume).
Please tell Claude how many frames/second you get, so the plan can be sized properly.

## Notes
- The RTX 5050 has 8 GB of VRAM: keep character textures at 2K and meshes decimated (the scripts already do this).
- The scenes are fixed at 1280x720 for now; a resolution switch (1080p/4K) is a small change once the GPU path is confirmed.
