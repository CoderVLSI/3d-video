// Telugu narration for the Vamana video. Same 11-beat structure as projects/vamana: the scene is keyed to sentence
// index, so keep exactly one terminal full stop per sentence.
export const MODEL_ID = 'eleven_v4'; // the cloned voice only sounds right on v4; multilingual_v2 does not cover Telugu
export const LANGUAGE_CODE = 'te';

export const SCRIPT = [
  'చాలా కాలం క్రితం, శక్తిమంతుడైన బలి చక్రవర్తి మూడు లోకాలను జయించాడు, దేవతలు కూడా భయపడ్డారు.',
  'బలి దాతృత్వం, ధర్మం ఉన్నవాడు, అయినా తన శక్తికి గర్వపడ్డాడు, ఒక గొప్ప యజ్ఞాన్ని ప్రారంభించాడు.',
  'అప్పుడు గొడుగు పట్టుకున్న ఒక చిన్న బ్రాహ్మణ బాలుడు వచ్చాడు; ఆయనే శ్రీమహావిష్ణువు వామనావతారం.',
  'వామనుడు కేవలం మూడు అడుగుల నేలను అడిగాడు.',
  'బలి నవ్వి, సంతోషంగా అంగీకరించాడు, అయినా గురువు శుక్రాచార్యుడు హెచ్చరించాడు.',
  'అప్పుడు ఆ చిన్న బాలుడు పెరగడం మొదలుపెట్టాడు, పర్వతాల కంటే ఎత్తుగా, ఆకాశం కంటే ఎత్తుగా.',
  'మొదటి అడుగుతో ఆయన భూమి అంతటినీ కప్పేశాడు.',
  'రెండవ అడుగుతో స్వర్గాన్ని కప్పేశాడు.',
  'మూడవ అడుగుకు చోటు లేదు, అందుకే బలి తన తలను వంచి, దానినే సమర్పించాడు.',
  'వామనుడు తన పాదాన్ని ఆ తలపై ఉంచి, బలిని పాతాళమైన సుతల లోకానికి రాజుగా పంపాడు.',
  'ప్రతి సంవత్సరం బలి తన ప్రజలను చూడటానికి వస్తాడు, ఆ రోజునే మనం ఓనంగా జరుపుకుంటాం.',
];
export const EXPECT_SENTENCES = 11;

export const TITLES = { start: 'వామనుడు', end: 'ఓనం శుభాకాంక్షలు' };

export const AMBIENCE =
  'Calm devotional South Indian ambience, soft tanpura drone, gentle temple bells and a distant bamboo flute, warm and reverent, no vocals';

export const SFX = [
  { key: 'bell', prompt: 'A single resonant temple bell strike with long shimmering decay', seconds: 4, at: [2, 0.0], volume: 0.7 },
  { key: 'grow', prompt: 'Epic rising magical swell with deep rumbling whoosh, cinematic growth', seconds: 6, at: [5, 0.05], volume: 0.8 },
  { key: 'boom1', prompt: 'Deep cinematic bass impact boom with reverb tail', seconds: 3, at: [6, 0.45], volume: 0.9 },
  { key: 'boom2', prompt: 'Deep cinematic bass impact boom with shimmering divine choir tail', seconds: 3, at: [7, 0.5], volume: 0.9 },
  { key: 'conch', prompt: 'A single blown conch shell note, sacred and resonant', seconds: 4, at: [9, 0.0], volume: 0.6 },
];
