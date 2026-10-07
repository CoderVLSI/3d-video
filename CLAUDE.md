# 3d-video — notes for Claude

Pipeline: ElevenLabs audio (`src/audio.mjs`) -> Three.js frames in headless Chromium (`src/render.mjs`) -> ffmpeg MP4.
Each video is a project: `projects/<name>/` (script, scene) and `out/<name>/` (generated audio, timeline, video).

    VOICE_ID=<id> node src/audio.mjs <project> [--reuse]     # --reuse keeps existing sfx/music files
    CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node src/render.mjs <project> [--stills t1,t2]

## Narration voice (important)

- The narrator is the user's mother's cloned voice, named **"sudha"** in their ElevenLabs account
  (a second clone, "Sudha nagalakshmi", exists; the user picked "sudha"). Look the ID up with `GET /v1/voices`
  and pass it as `VOICE_ID`. Do not hardcode or commit the ID.
- **Always use model `eleven_v4`.** The user listened to the same text on `eleven_multilingual_v2`, `eleven_v3`
  and `eleven_v4`: only v4 sounds like her. `audio.mjs` defaults to v4.
- **Do not override voice settings.** Leave `voice_settings` out so the voice's saved settings apply
  (stability 0.5, similarity 0.75, style 0, speaker boost on), as on the ElevenLabs website.
- The clone was trained on Telugu speech. Telugu narration (`language_code: 'te'`) is the closest match to her real voice.
- ElevenLabs credits are limited. Before generating a full narration, test the voice with a short clip
  and ask the user which language they want. Never regenerate narration, sound effects or music when
  `out/<project>/` already has usable files (use `--reuse`).

## Other notes

- Scenes key camera/poses off narration **sentence index**, so each project script needs a fixed number of sentences
  (`EXPECT_SENTENCES`) with exactly one terminal full stop each.
- The Vamana model comes from the GitHub release tagged `Vamana`. `tools/blender/optimize_model.py` shrinks it with
  Blender (`pip install bpy`; the hosted Higgsfield Blender cannot import custom files).
- Telugu captions need the Noto Sans Telugu font (`@fontsource/noto-sans-telugu`); the container has no Telugu font.
