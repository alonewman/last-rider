// Honest play bot for pacing/balance data: follows the compass, stops at wells/trees, slashes nearby foes.
// No invulnerability or HP edits; it never dodges, so its deaths overstate difficulty.
// Usage: node tests/tools/playbot.mjs [minutes]   (prints per-minute stats and an event log)
import { openGame } from '../helpers.mjs';
const MIN = +process.argv[2] || 6;
const { browser, page, errors } = await openGame();
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__gm.GM.state === 'intro');
await page.evaluate(() => { window.__gm.GM.it = 2; window.__gm.GM.skipIntro(); });
await page.evaluate(() => {
  const { GM, E, B } = window.__gm, cav = window.__cav, SX = 4.6, SY = 0.5 * 4.6 * 0.56;
  window.__ev = []; let lastObj = '', lastHp = GM.hp, t0 = performance.now(), dmg = 0, stuck = 0, lp = null, wander = 0;
  const now = () => ((performance.now() - t0) / 1000).toFixed(0);
  window.__stats = () => ({ t: now(), hp: Math.round(GM.hp), deaths: GM.deaths, kills: GM.kills, dmg: Math.round(dmg), obj: lastObj, act: GM.act, chests: GM.found, sig: GM.sig.join() });
  setInterval(() => {
    if (GM.state === 'dead') { if (!window.__dl) { window.__dl = 1; window.__ev.push(now() + 's DIED (#' + GM.deaths + ') at ' + lastObj + (B.st !== 'dormant' ? ' boss hp ' + B.hp + '/' + B.mx : '')); } if (GM.deadShown) GM.retry(); return; }
    window.__dl = 0;
    if (GM.state === 'talk') { window.__gm.talkAdvance(); return; }
    if (GM.state !== 'play') return;
    if (GM.hp < lastHp) dmg += lastHp - GM.hp; lastHp = GM.hp;
    const o = window.__gm.objective(); if (o.txt !== lastObj) { window.__ev.push(now() + 's ' + o.txt + '  [hp ' + Math.round(GM.hp) + ']'); lastObj = o.txt; }
    const [hx, hy] = cav.pos();
    let tx = o.x, ty = o.y, mag = 1;
    // fight: nearest live enemy within 14 → ride at it and slash
    let ne = null, nd = 14; for (const e of E) { if (e.dead) continue; const d = Math.hypot(e.x - hx, e.y - hy); if (d < nd) { nd = d; ne = e; } }
    const bossOn = !['dormant', 'dead', 'dying'].includes(B.st);
    if (bossOn) { const d = Math.hypot(B.x - hx, B.y - hy); if (d < 30) { ne = B; nd = d; } }
    if (ne) { tx = ne.x; ty = ne.y; if (nd < 7) cav.slash(); }
    const d = Math.hypot(tx - hx, ty - hy);
    if (!ne && /well|tree/.test(o.txt) && d < 4.5) mag = 0;
    // retreat to heal when low and not in a fight (go back to the first well)
    if (GM.hp < GM.hpMax * 0.3 && !ne) { const w = window.__gm.SPEC[0]; tx = w.x; ty = w.y; mag = Math.hypot(w.x - hx, w.y - hy) < 4.5 ? 0 : 1; }
    // unstick
    if (lp && Math.hypot(hx - lp[0], hy - lp[1]) < 0.05 && mag > 0) stuck++; else stuck = 0; lp = [hx, hy];
    if (stuck > 20) wander = 15;
    let wx = tx - hx, wy = ty - hy;
    if (wander > 0) { wander--; const a = Math.atan2(wy, wx) + 1.4; wx = Math.cos(a); wy = Math.sin(a); }
    const sx = (wx - wy) * SX, sy = (wx + wy) * SY, l = Math.hypot(sx, sy) || 1;
    cav.input.dc = sx / l; cav.input.dr = sy / l; cav.input.mag = mag;
  }, 50);
});
for (let m = 1; m <= MIN; m++) { await page.waitForTimeout(60000); console.log('min', m, JSON.stringify(await page.evaluate(() => window.__stats()))); }
console.log((await page.evaluate(() => window.__ev)).join('\n'));
console.log('errors', errors);
await browser.close();
