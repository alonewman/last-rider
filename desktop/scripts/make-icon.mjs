// Renders the app icon (placeholder: "LR_" in the game's palette and font) to desktop/build/icon.png (512px).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..', '..');
const font = 'data:font/woff2;base64,' + readFileSync(path.join(root, 'fonts', 'JetBrainsMonoNL-Bold.woff2')).toString('base64');
const out = path.resolve(import.meta.dirname, '..', 'build', 'icon.png');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 512, height: 512 } });
await p.setContent(`<style>@font-face{font-family:J;src:url(${font})}html,body{margin:0;background:transparent}
#i{width:512px;height:512px;border-radius:96px;background:radial-gradient(circle at 50% 40%,#12203f,#050816 70%);display:flex;align-items:center;justify-content:center;
font:700 250px J;letter-spacing:-12px;color:#d4e8f4;text-shadow:0 0 28px rgba(111,214,255,.55)}#i span{color:#e8b45a;text-shadow:0 0 24px rgba(232,180,90,.6)}</style>
<div id="i">LR<span>_</span></div>`);
await p.evaluate(async () => { await document.fonts.load('700 250px J'); if (!document.fonts.check('700 250px J')) throw new Error('font not loaded'); });
await p.locator('#i').screenshot({ path: out, omitBackground: true });
await b.close();
console.log('icon written to', out);
