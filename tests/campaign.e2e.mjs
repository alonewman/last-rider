import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, state, readSave } from './helpers.mjs';

/*
 * Drives the whole campaign through the real game code. A bot keeps the rider
 * alive, stands next to the current guardian (or hermit leg) and strikes;
 * guardian HP is lowered once each fight begins so the run takes seconds, not
 * minutes. Fight mechanics are bypassed; what is checked is that every act
 * transition, cutscene and ending is reachable and leaves the game playable.
 */
async function bot(page, { spare }) {
  await page.evaluate((spare) => {
    const { GM, B, ARENA, HERMIT } = window.__gm, cav = window.__cav;
    window.__log = [];
    let last = '', lowered = '';
    window.__bot = setInterval(() => {
      const key = GM.act + ':' + B.kind + ':' + B.st + ':' + GM.state + ':' + (GM.finalSt || '');
      if (key !== last) { window.__log.push(key); last = key; }
      GM.inv = 9; GM.hp = GM.hpMax; GM.vig = GM.vgMax;
      if (GM.state === 'talk') { window.__gm.talkAdvance(); return; }
      if (GM.state === 'choice') { window.__gm.chooseEnding(spare); return; }
      if (GM.state !== 'play') return;
      GM.sig = [true, true, true];
      if (GM.act === 1 && !GM.leg) { cav.tp(HERMIT.x - 6, HERMIT.y, 0, 0); return; }
      if (GM.act === 3 && GM.finalSt === 'walk') { cav.tp(GM.hf.x - 6, GM.hf.y, 0, 0); return; }
      let tx = B.x, ty = B.y;
      if (B.kind === 'hermit' && B.legs) { const lg = B.legs.find((l) => l.alive); if (lg) { tx = lg.fx; ty = lg.fy; } }
      if (B.st === 'dormant' && B.kind !== 'hermit') { tx = ARENA.x; ty = ARENA.y; }
      const fight = !['dormant', 'rising', 'dying', 'dead', 'lastblow'].includes(B.st);
      if (fight && lowered !== B.kind + GM.act) { lowered = B.kind + GM.act; if (B.kind !== 'hermit') B.hp = Math.min(B.hp, 3); else B.legs.forEach((l) => { l.hp = 1; }); }
      const a = Math.random() * 6.28, r = B.kind === 'hermit' ? 3 : 6;
      cav.tp(tx + Math.cos(a) * r, ty + Math.sin(a) * r, a + Math.PI, 0);
      cav.slash();
    }, 60);
  }, spare);
}

async function run(spare) {
  const { browser, page, errors } = await openGame();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__gm.GM.state === 'intro');
  await page.evaluate(() => { window.__gm.GM.it = 2; window.__gm.GM.skipIntro(); });
  await page.evaluate(() => { const G = window.__gm.GM; G.drank = G.ate = true; });
  await bot(page, { spare });
  await page.waitForFunction(() => window.__gm.GM.state === 'end', null, { timeout: 240000, polling: 500 });
  const log = await page.evaluate(() => { clearInterval(window.__bot); return window.__log; });
  return { browser, page, errors, log };
}

test('campaign: three guardians, the hermit and the SPARE ending are reachable', { timeout: 300000 }, async () => {
  const { browser, page, errors, log } = await run(true);
  try {
    const gd = await page.evaluate(() => window.__gm.GM.gdead);
    assert.deepEqual(gd, [true, true, true], log.join('\n'));
    assert.ok(log.some((l) => l.startsWith('1:gator')), 'act 1 fights the Mire guardian');
    assert.ok(log.some((l) => l.startsWith('2:serpent')), 'act 2 fights the Barrow guardian');
    assert.ok(log.some((l) => l.startsWith('3:hermit')), 'act 3 fights the hermit');
    assert.equal(await page.evaluate(() => window.__gm.GM.bombed), true, 'the iron leg detonates in the Barrow fight');
    assert.equal(await page.evaluate(() => window.__gm.GM.ending), 2);
    assert.equal((await readSave(page)).ending, 2);
    // KEEP RIDING returns to free roam
    await page.keyboard.press('Enter');
    assert.equal(await state(page), 'play');
    assert.equal(await page.evaluate(() => window.__gm.GM.post), true);
    await page.waitForTimeout(1500);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('campaign: the KILL ending is reachable', { timeout: 300000 }, async () => {
  const { browser, page, errors } = await run(false);
  try {
    assert.equal(await page.evaluate(() => window.__gm.GM.ending), 1);
    assert.equal(await page.evaluate(() => document.getElementById('keep').offsetParent), null, 'no KEEP RIDING after KILL');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
