// Narration for the Vamana video. One sentence per story beat: the scene code keys camera and poses off sentence timestamps,
// so keep exactly one terminal punctuation mark per sentence (no abbreviations or stray full stops).
export const SCRIPT = [
  'Long ago, the mighty king Bali conquered all three worlds, and even the gods trembled.',
  'Bali was generous and just, yet proud of his power, and he began a great sacrifice.',
  'Then a tiny brahmin boy arrived, carrying an umbrella; he was Vamana, the dwarf avatar of Lord Vishnu.',
  'Vamana asked for only three paces of land.',
  'Bali smiled, and gladly agreed, though his teacher Shukracharya warned him.',
  'Then the little boy began to grow, taller than the mountains, taller than the sky.',
  'With his first step, he covered the whole earth.',
  'With his second step, he covered the heavens.',
  'No room was left for a third, so Bali bowed his head, and offered it.',
  'Vamana placed his foot upon it, and sent Bali to rule the underworld of Sutala.',
  'And each year, Bali returns to visit his people, a day we celebrate as Onam.',
];

export const AMBIENCE =
  'Calm devotional Indian ambience, soft tanpura drone, gentle temple bells and a distant bamboo flute, warm and reverent, no vocals';

// Sound effects placed on the timeline: at = sentence index + fraction through that sentence.
export const SFX = [
  { key: 'bell', prompt: 'A single resonant temple bell strike with long shimmering decay', seconds: 4, at: [2, 0.0], volume: 0.7 },
  { key: 'grow', prompt: 'Epic rising magical swell with deep rumbling whoosh, cinematic growth', seconds: 6, at: [5, 0.05], volume: 0.8 },
  { key: 'boom1', prompt: 'Deep cinematic bass impact boom with reverb tail', seconds: 3, at: [6, 0.45], volume: 0.9 },
  { key: 'boom2', prompt: 'Deep cinematic bass impact boom with shimmering divine choir tail', seconds: 3, at: [7, 0.5], volume: 0.9 },
  { key: 'conch', prompt: 'A single blown conch shell note, sacred and resonant', seconds: 4, at: [9, 0.0], volume: 0.6 },
];

export const EXPECT_SENTENCES = 11;
