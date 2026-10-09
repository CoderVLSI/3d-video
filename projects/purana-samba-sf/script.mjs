// Bhavishya Purana, Part 1: Samba and Surya (Brahma-parva, chapters 72-74, 127-129 of the Gita Press Sankshipt Bhavishya Purana).
// One sentence per beat; the scene keys off sentence index, so keep exactly one terminal full stop per sentence.
export const MODEL_ID = 'eleven_v4';
export const LANGUAGE_CODE = 'te';

export const SCRIPT = [
  'ద్వారకా నగరంలో శ్రీకృష్ణుని కుమారుడు సాంబుడు, తన అందాన్ని చూసుకొని గర్వపడేవాడు.',
  'ఒకరోజు కృశించిన శరీరంతో, పసుపు కళ్ళతో, దుర్వాస మహర్షి ద్వారకకు వచ్చారు.',
  'ఆయన రూపాన్ని చూసి సాంబుడు నవ్వుతూ, ఆయన నడకను అనుకరించి వెక్కిరించాడు.',
  'కోపంతో వణికిపోయిన దుర్వాసుడు, ఓ సాంబా, నీవు కుష్ఠురోగివి అవుతావు, అని శపించాడు.',
  'క్షణంలో సాంబుని శరీరమంతా రోగంతో నిండిపోయింది, వైద్యులెవరూ ఆయనను బాగు చేయలేకపోయారు.',
  'శ్రీకృష్ణుడు, నాయనా, సూర్యభగవానుని ఆరాధించు, నీ రోగం తప్పక తొలగిపోతుంది, అని చెప్పాడు.',
  'నారద మహర్షి ఉపదేశంతో సాంబుడు, చంద్రభాగా నదీ తీరంలోని మిత్రవనంలో, కఠోర తపస్సు చేశాడు.',
  'సూర్యుడు ప్రత్యక్షమై, వరమిచ్చి, ఇరవై ఒక్క నామాలను ఉపదేశించగా, సాంబుని రోగం పాము కుబుసంలా తొలగిపోయింది.',
  'అప్పుడు నదిలో తేజోమయమైన సూర్య ప్రతిమ తేలుతూ వచ్చింది, సాంబుడు దానిని ప్రతిష్ఠించి, సాంబపురాన్ని నిర్మించాడు.',
  'అహంకారం పతనానికి దారితీస్తుంది, వినయం, భక్తి ఆరోగ్యాన్నీ శాంతినీ ఇస్తాయని ఈ కథ చెబుతుంది.',
];
export const EXPECT_SENTENCES = 10;
export const TITLES = { start: 'భవిష్య పురాణం · సాంబుడు', end: 'సాంబపురం' };

export const AMBIENCE = 'Calm devotional South Indian ambience, soft tanpura drone, gentle temple bells and a distant bamboo flute, warm and reverent, no vocals';
export const SFX = [
  { key: 'boom1', prompt: 'Deep cinematic bass impact boom with reverb tail', seconds: 3, at: [3, 0.55], volume: 0.9 },
  { key: 'grow', prompt: 'Epic rising magical swell with deep rumbling whoosh, cinematic growth', seconds: 6, at: [7, 0.05], volume: 0.7 },
  { key: 'bell', prompt: 'A single resonant temple bell strike with long shimmering decay', seconds: 4, at: [8, 0.55], volume: 0.7 },
  { key: 'conch', prompt: 'A single blown conch shell note, sacred and resonant', seconds: 4, at: [9, 0.0], volume: 0.6 },
];
