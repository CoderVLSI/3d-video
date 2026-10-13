// Render title cards (1280x720 PNG) with the Telugu font embedded: node tools/slideshow/title_cards.mjs <out_dir> <cards.json>
// cards.json: [{ "file": "card_intro.png", "te": "...", "en": "...", "sub": "..." }]
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
const [, , outDir, cardsFile] = process.argv, cards = JSON.parse(readFileSync(cardsFile, 'utf8'));
const font = (w) => 'data:font/woff2;base64,' + readFileSync(`node_modules/@fontsource/noto-sans-telugu/files/noto-sans-telugu-telugu-${w}-normal.woff2`).toString('base64');
const html = (c) => `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:"NST";font-weight:700;src:url("${font(700)}") format("woff2");}
html,body{margin:0;width:1280px;height:720px;overflow:hidden}
body{background:radial-gradient(ellipse at 50% 40%,#5a1a2a 0%,#2e0b16 60%,#1a060d 100%);display:flex;align-items:center;justify-content:center;color:#f3d48a;text-align:center;font-family:"DejaVu Serif","Liberation Serif",serif}
.f1{position:absolute;inset:34px;border:3px solid #d9ad55;border-radius:14px}.f2{position:absolute;inset:48px;border:1px solid #b88a3c;border-radius:8px}
.te{font:700 76px/1.35 "NST",sans-serif;color:#ffe29a;text-shadow:0 3px 18px rgba(0,0,0,.7);padding:0 90px}
.en{margin-top:26px;font-size:46px;letter-spacing:.06em;font-weight:700;color:#f3d48a;padding:0 90px}.sub{margin-top:18px;font-size:30px;color:#e6c27a;letter-spacing:.05em;font-style:italic}
.rule{margin:26px auto 0;width:420px;height:2px;background:linear-gradient(90deg,transparent,#d9ad55,transparent)}</style>
<div class=f1></div><div class=f2></div><div><div class=te>${c.te}</div><div class=rule></div><div class=en>${c.en}</div>${c.sub ? `<div class=sub>${c.sub}</div>` : ''}</div>`;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
mkdirSync(outDir, { recursive: true });
for (const c of cards) { await p.setContent(html(c)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200); await p.screenshot({ path: `${outDir}/${c.file}` }); console.log('card', c.file); }
await b.close();
