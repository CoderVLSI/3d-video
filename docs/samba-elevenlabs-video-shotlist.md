# Samba and Surya — ElevenLabs Image & Video shot list (low-credit plan)

Audio for each shot is already cut from the existing narration (same "sudha" voice, `eleven_v4`), so no text-to-speech credits are spent:
`out/purana-samba/lipsync/s01.mp3` … `s10.mp3` (6–9 s each). Upload one as **Audio refs** per shot.

## Why the API is not used
`POST /v1/flows/video` returns `402 paid_plan_required` on the Creator plan (needs Pro), and the spec says Seedance models need
extra approval from ElevenLabs support. The web app (Image & Video, Seedance 2.5) does work, so these shots are made there.

## Cheapest settings
- Model **Seedance 2.5**, **480p** (not 720p), aspect **16:9**, sound **Off** (the audio ref carries the voice; mix music/sfx afterwards).
- Duration: the shortest whole number of seconds that covers the clip (table below). Seedance 2.5 accepts 4–30 s.
- **Test shot 1 first** and read the credit price shown next to the send button before making the rest.
- Narration is third-person, so a face speaking it looks odd. Lip-sync only the two spoken lines (shots 4 and 6) and use
  voice-over (no lip-sync, scenic clip) for the rest. Add the audio back with ffmpeg or any editor.

| # | Audio | Secs | Lip-sync? | Prompt (add the Audio ref; add a Start frame/Image ref of the character if you have one) |
|---|---|---|---|---|
| 1 | s01 | 7 | no | Dwaraka, golden city by the sea at dawn; handsome young prince Samba admires his reflection in a polished mirror, proud. Cinematic, slow push-in. |
| 2 | s02 | 7 | no | Thin sage Durvasa with yellow eyes and matted hair walks into the gates of Dwaraka leaning on a staff. Cinematic. |
| 3 | s03 | 6 | no | Samba laughs and mimics the sage's slow walk while courtiers watch; the sage turns. Cinematic, medium shot. |
| 4 | s04 | 7 | **yes** | Durvasa, furious, trembling, pointing at Samba and cursing him; lip-synced to @Audio1. Medium close-up, facing camera. |
| 5 | s05 | 8 | no | Samba's skin turns pale and diseased, physicians shake their heads in the palace hall. Cinematic, sombre light. |
| 6 | s06 | 8 | **yes** | Lord Krishna, calm and blue-skinned with a peacock feather, advising his son; lip-synced to @Audio1. Medium close-up. |
| 7 | s07 | 8 | no | Samba performing severe penance by the river Chandrabhaga at sunrise, sage Narada blessing him, forest of Mitravana. |
| 8 | s08 | 9 | no | Surya the Sun-god appears in blazing gold light before Samba; the disease falls from his skin like a snake's slough. |
| 9 | s09 | 9 | no | A glowing image of Surya floats down the river; Samba installs it in a new temple, the city of Sambapura rises. |
| 10 | s10 | 9 | no | Wide golden shot of the Surya temple at sunset, devotees bowing, peaceful. Slow pull-back. |

Total about 76 s. Cheapest variant: make only shots 4 and 6 in the web app and keep the existing Three.js video
(`out/purana-samba/video_share.mp4`) for the other eight.

## Before publishing
Confirm ElevenLabs/ByteDance terms allow commercial use of generated video, and that your mother is happy for her voice and likeness (the "Sudha nagalakshmi" avatar) to be published.
