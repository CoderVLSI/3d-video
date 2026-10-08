# Madhaviya Shankara Digvijaya — animated film plan

Working title: **శంకర దిగ్విజయం** (*Shankara Digvijaya*)
Format: Telugu-narrated 3D animated film, built with the existing pipeline (ElevenLabs → Three.js frames → ffmpeg).

## 1. The source

- *Madhaviya Shankara Digvijaya* (also *Sankshepa-Shankara-Vijaya*): 16 sargas, about 1,843 verses, a hagiography of Adi Shankara, traditionally attributed to Madhava-Vidyaranya (14th c.).
  Authorship and date are disputed by scholars; the film should present it as the *traditional account* ("as told in the Madhaviya Shankara Digvijaya"), not as verified history.
  Other hagiographies (Anandagiri's, Chidvilasa's) differ on details. Where they differ, **follow the Madhaviya** and note the variant.
- Best sources to work from (all blocked from the cloud container, so the user must supply a copy):
  - Sringeri matha's *abridged English translation of the Madhaviya Shankara Digvijayam* (web: sringeri.net, with a PDF `files.sringeri.net/.../sri-shankara-digvijayam.pdf`; the web version is split into parts with headings such as "Divine Descent", "Initiation and study under Sri Govinda Bhagavatpada", "Sri Shankara and Kumarila Bhatta").
  - The Sanskrit edition on the Internet Archive ("Sri Madhaviya Shrimat Shankara Digvijayah", Kashichit Shankara Kinkara), including a full-text djvu file.
- **Action needed from the user:** download the Sringeri PDF (and optionally the Sanskrit edition) and upload it to a GitHub release, as was done for the Purana PDF. Until then, the outline below rests on search summaries and general tradition; items are tagged accordingly.

Tags: **[S]** supported by a source found in this session; **[T]** traditional episode from general knowledge, to be verified against the Madhaviya text before scripting.

## 2. Story outline (the whole life, in order)

1. **Prologue — Dharma in decline.** The Vedic path is being eclipsed; the gods appeal to Shiva, who promises to descend as Shankara. [S: "Divine Descent" is the first section of the Sringeri abridgment; details T]
2. **Kalady and the boon.** Shivaguru and Aryamba of Kalady, Kerala, childless, pray at the Vadakkunnathan temple in Thrissur. Shiva grants a son. [S] The traditional choice between a brilliant short-lived son and a long-lived ordinary one, and the child's early death-of-father and upanayana. [T]
3. **A prodigy.** Shankara masters the Vedas as a child; the golden-amla episode (Kanakadhara). [T — check whether the Madhaviya includes it]
4. **The crocodile and Apat-sannyasa.** At the Purna river a crocodile seizes his leg; he asks his mother's leave to renounce; she consents; the crocodile releases him. He promises to return for her last rites. [S]
5. **The search for a guru.** He leaves Kerala for the north; at the Narmada (Omkareshwar) he meets **Govindapada**. "Who are you?" is answered with the verses now known as *Nirvana Shatakam*. [S] The Narmada flood stilled in his kamandalu. [T]
6. **Kashi.** The Chandala episode: the outcaste with four dogs is Shiva testing non-duality (*Manisha Panchakam*). [S that an episode exists; details T] Disciples gather (Sanandana/Padmapada, and later Hastamalaka, Totaka, Sureshvara). [T]
7. **Vyasa.** Vyasa meets him, reviews the commentaries, and extends his life by sixteen years to finish his mission; he advises him to meet Kumarila and Mandana. [S: popular biography; sequence T]
8. **Prayaga — Kumarila Bhatta.** Kumarila stands in a husk-fire as penance for betraying his Buddhist teacher; he refuses rescue, asks for Brahma-vidya instead, and points Shankara to Mandana Mishra (Vishvarupa). [S]
9. **Mahishmati — the great debate.** Shankara vs. **Mandana Mishra**; garlands on both, the first to wither loses; **Ubhaya Bharati** (Sharada) judges. Mandana loses and becomes **Sureshvara**. [S]
10. **Ubhaya Bharati's challenge and Parakaya-pravesha.** She challenges him on the arts of householder life; he takes a fortnight's recess, enters the body of King **Amaruka**, learns, returns, and wins. [S]
11. **South: Srisailam and the Kapalika.** *Shivananda Lahari* at Srisailam; the Kapalika who wants a head sacrificed; Narasimha enters Shankara (invoked by Padmapada) and kills him. [S]
12. **Gokarna and the long tour.** Defeating Neelakantha at Gokarna; Kapalikas defeated by King Sudhanva; further debates, hymns and temples (Kanchi, Dvaraka, Puri, Badari…) and the founding of the **four mathas**. [S for Gokarna and mathas; the rest T]
13. **Sringeri.** The Sharada Peetha established; Sureshvara placed there. [S: the tour is described as beginning from Sringeri; details T]
14. **Kashmir — Sarvajnapitha.** The temple with four doors; the southern door never opened; Shankara opens it by defeating the scholars and ascends the seat of omniscience. [S]
15. **Aryamba's last hour.** He returns to Kalady, keeps his promise, performs the rites despite community objection. [S for the chapter "Shankara's boon to Aryamba"; details T]
16. **The Himalayas — the end.** At Kedarnath the Rishis and Devas led by Brahma bring Shiva's incarnation back to Shivaloka; other traditions say he attained videha-mukti in the Kedarnath–Badri region. [S, with variants]

(Abhinavagupta/Kamarupa and other episodes appear in other hagiographies; **omit unless the Madhaviya text has them**.)

## 3. Film design

- **Length:** ~20 minutes in 10 chapters of ~2 min (see §5 for why not longer).
- **Structure:**
  - Act I *The Descent* — ch. 1 Prologue + Kalady and the boon; ch. 2 prodigy and the crocodile; ch. 3 leaving home, Govindapada.
  - Act II *The Debates* — ch. 4 Kashi and Vyasa; ch. 5 Kumarila; ch. 6 Mandana Mishra; ch. 7 Ubhaya Bharati and Amaruka.
  - Act III *The Victory* — ch. 8 the Kapalika and Srisailam; ch. 9 four mathas, Sringeri, Kashmir; ch. 10 Aryamba and the Himalayas.
- **Narration:** Telugu, in the user's mother's cloned voice (sudha, `eleven_v4`, no settings override). **Dialogue** lines for characters in separate ElevenLabs voices (to be chosen by the user from the account's voices; the account has Roger, George, Will, Charlie, Eric, etc., plus clones).
- **Tone:** reverent; show *debate* through staging (two figures, text-less gestures, the garlands, camera cuts), not through subtitles of philosophy; short title cards for place names (Telugu).
- **Music:** 3–4 reusable themes (devotional drone/flute, debate tension, mountain/ethereal, ending), looped; avoid generating one track per chapter.

## 4. Cast and assets

| Character | Used in | Model status |
|---|---|---|
| Shankara (child ~8, youth ~16, adult ~32) | all | **needed**; best as 2–3 versions |
| Aryamba (mother), Shivaguru | 1–3, 10 | needed |
| Govindapada | 3 | needed |
| Shiva (also as Chandala) | 1, 4 | needed |
| Vyasa | 4 | can reuse the white-bearded Shukracharya model, retinted |
| Kumarila Bhatta | 5 | needed (or reuse a sage model) |
| Mandana Mishra, Ubhaya Bharati | 6–7 | needed |
| Padmapada, Sureshvara, Hastamalaka, Totaka | recurring disciples | needed (one base model, recolored) |
| Kapalika (Ugra Bhairava) | 8 | needed |
| Narasimha | 8 | needed (could be a stylised glowing form) |
| King Amaruka | 7 | can reuse the Bali model |

Pipeline per character: user (or Higgsfield image-to-3D, which spends the user's credits) provides a GLB → `tools/blender/optimize_model.py`/`rig_character.py` → drives bones from code. About one hour per character once the joint spec is written.
Reusable already: rigged Vamana (child), Bali, Shukracharya; the river, plaza, hall, temple, sunrise and cosmos sets.
New sets needed: Kalady house and Purna river, Narmada cave, Kashi ghats with steps, Mahishmati debate hall, forest/Prayaga husk pit, Srisailam, Sringeri on the Tunga, Kashmir temple with four doors, Kedarnath snow.

## 5. Feasibility and cost (measured on this container)

- Rendering is CPU-only: **~1.1 frames/s at 1280×720**. One minute at 30 fps = 1,800 frames ≈ 27 minutes of render.
  - 20-min film at 720p/30 ≈ **9 hours** of continuous render.
  - At 960×540 and 24 fps ≈ **4 hours**.
- The container is reclaimed whenever I stop working, so renders only progress while I am active in a turn (the resumable frame cache protects against restarts). In practice: **about 2 chapters per working session** at 720p.
- A GPU machine would make this 10–50× faster. If the film is meant to be the real thing, rendering on the user's own PC (the repo is plain Node + Chromium + ffmpeg) is worth considering.
- ElevenLabs: Telugu narration ≈ 600 characters per 75 s, so a 20-min film ≈ 10,000 characters; dialogue adds a little; music for 4 themes is the larger unknown (a track cost roughly 1,500 credits earlier). Budget on the order of **15–25k credits**; the account has ~97k.

## 6. Phases

1. **Source**: user uploads the Sringeri PDF (+ Sanskrit edition); I read it fully and fix the episode list and sarga numbering.
2. **Script bible**: Telugu narration per chapter (user reviews the Telugu), dialogue lines, shot list.
3. **Assets**: user supplies models; I rig; build new sets; test stills for each chapter.
4. **Audio**: voice test of 2–3 candidates for each character; generate narration per chapter (once approved); 4 music themes; reuse SFX.
5. **Render chapter by chapter**, deliver each as it is finished, then assemble the film with title and credits.

## 7. Decisions needed from the user

1. Upload the Sringeri PDF / Sanskrit edition (GitHub release).
2. Length and quality: 20 min at 720p (≈9 h of render) vs. shorter chapters first (pilot: ch. 2 "The crocodile" ≈ 2 min, ≈ 55 min of render)?
3. Telugu for narration, and which voices for the characters.
4. Models: supply them, or have the Higgsfield tool generate them (costs credits)? A "Shankara" model (child and adult) is the single most important asset.
5. Respectful-treatment notes (what must be shown or avoided) for the Chandala episode, Shiva, and the Mandana–Ubhaya Bharati debate.
