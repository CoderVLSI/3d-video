import { chromium } from '/home/user/3d-video/node_modules/playwright-core/index.mjs';
import fs from 'fs';
const [,, idx, outDir] = process.argv;
const tl = JSON.parse(fs.readFileSync('/home/user/3d-video/out/purana-samba/timeline.json','utf8'));
const s = tl.sentences[+idx];
const font = (w)=>'data:font/woff2;base64,'+fs.readFileSync(`/home/user/3d-video/node_modules/@fontsource/noto-sans-telugu/files/noto-sans-telugu-telugu-${w}-normal.woff2`).toString('base64');
const html = (on)=>`<!doctype html><meta charset=utf-8><style>
@font-face{font-family:"Noto Sans Telugu";font-weight:600;src:url("${font(600)}") format("woff2");}
html,body{margin:0;background:transparent;width:1280px;height:720px;overflow:hidden}
#cap{position:fixed;left:0;right:0;bottom:48px;text-align:center;padding:0 110px;font:600 36px/1.55 "Noto Sans Telugu",sans-serif;color:rgba(255,255,255,.55);text-shadow:0 2px 14px rgba(0,0,0,.95),0 0 3px rgba(0,0,0,.8)}
#cap span.on{color:#fff}</style><div id=cap>${s.words.map((w,i)=>`<span class="${i<on?'on':''}">${w.text}</span>`).join(' ')}</div>`;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
fs.mkdirSync(outDir,{recursive:true});
for (let on=0; on<=s.words.length; on++){
  await p.setContent(html(on)); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(150);
  await p.screenshot({ path:`${outDir}/cap_${on}.png`, omitBackground:true });
}
await b.close();
console.log('ok', s.words.length);
