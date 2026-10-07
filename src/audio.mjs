// Step 1: generate narration (with word timestamps), background music and sound effects via ElevenLabs.
//   VOICE_ID=<elevenlabs voice id> node src/audio.mjs <project>
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error('ELEVENLABS_API_KEY is not set');
const project = process.argv[2];
const REUSE = process.argv.includes('--reuse'); // keep existing sfx/music files in out/<project> (they are language independent)
if (!project) throw new Error('usage: node src/audio.mjs <project>');

const VOICE_ID = process.env.VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'; // default: George (stock voice)
const API = 'https://api.elevenlabs.io/v1';
const { SCRIPT, AMBIENCE, SFX = [], EXPECT_SENTENCES, MODEL_ID = 'eleven_v4', LANGUAGE_CODE, VOICE_SETTINGS } =
  await import(`../projects/${project}/script.mjs`);
const out = `out/${project}`;
mkdirSync(out, { recursive: true });

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res;
}

// Narration with character-level alignment.
const tts = await (
  await post(`/text-to-speech/${VOICE_ID}/with-timestamps?output_format=mp3_44100_128`, {
    text: SCRIPT.join(' '),
    model_id: MODEL_ID,
    ...(LANGUAGE_CODE ? { language_code: LANGUAGE_CODE } : {}),
    // no voice_settings by default: the voice's own saved settings apply, like on the ElevenLabs website (cloned voices sound closest this way)
    ...(VOICE_SETTINGS ? { voice_settings: VOICE_SETTINGS } : {}),
  })
).json();
writeFileSync(`${out}/narration.mp3`, Buffer.from(tts.audio_base64, 'base64'));

// Collapse character alignment into words.
const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = tts.alignment;
const words = [];
let cur = null;
characters.forEach((ch, i) => {
  if (/\s/.test(ch)) { if (cur) words.push(cur), (cur = null); return; }
  if (!cur) cur = { text: '', start: starts[i], end: ends[i] };
  cur.text += ch;
  cur.end = ends[i];
});
if (cur) words.push(cur);

// Sentence boundaries = words ending in . ? !
const sentences = [];
let s = { start: words[0].start, words: [] };
for (const w of words) {
  s.words.push(w);
  if (/[.?!]$/.test(w.text)) { s.end = w.end; sentences.push(s); s = { start: null, words: [] }; }
  else if (s.start === null) s.start = w.start;
}
const duration = words[words.length - 1].end;
if (EXPECT_SENTENCES && sentences.length !== EXPECT_SENTENCES) {
  throw new Error(`${project}: expected ${EXPECT_SENTENCES} sentences but found ${sentences.length}; scenes are keyed to sentence index`);
}

// Sound effects, pinned to a point inside a sentence.
const sfx = [];
for (const fx of SFX) {
  const file = `sfx_${fx.key}.mp3`;
  if (!(REUSE && existsSync(`${out}/${file}`))) {
    const res = await post('/sound-generation?output_format=mp3_44100_128', { text: fx.prompt, duration_seconds: fx.seconds, prompt_influence: 0.6 });
    writeFileSync(`${out}/${file}`, Buffer.from(await res.arrayBuffer()));
  }
  const [i, f] = fx.at, sn = sentences[i];
  sfx.push({ key: fx.key, file, at: sn.start + f * (sn.end - sn.start), volume: fx.volume ?? 1 });
  console.log(`sfx ${fx.key} @ ${sfx.at(-1).at.toFixed(2)}s`);
}

writeFileSync(`${out}/timeline.json`, JSON.stringify({ duration, sentences, words, sfx }, null, 2));
console.log(`narration: ${duration.toFixed(2)}s, ${words.length} words, ${sentences.length} sentences`);

// Background bed. Prefer the music endpoint (any length); fall back to a looped 30s sound-effect clip.
const target = Math.ceil(duration + 3);
let music = null;
if (REUSE && existsSync(`${out}/ambience.mp3`)) { console.log('ambience: reusing existing file'); process.exit(0); }
try {
  const res = await post('/music?output_format=mp3_44100_128', { prompt: AMBIENCE, music_length_ms: Math.max(10000, target * 1000), force_instrumental: true });
  music = Buffer.from(await res.arrayBuffer());
  console.log('background: music endpoint');
} catch (e) {
  console.log(`music endpoint unavailable (${String(e.message).slice(0, 120)}); falling back to looped ambience`);
  const res = await post('/sound-generation?output_format=mp3_44100_128', { text: AMBIENCE, duration_seconds: Math.min(30, target), prompt_influence: 0.5 });
  music = Buffer.from(await res.arrayBuffer());
}
writeFileSync(`${out}/ambience.mp3`, music);
console.log('ambience saved');
