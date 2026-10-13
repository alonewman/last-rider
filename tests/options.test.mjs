import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, MID_SAVE } from './helpers.mjs';

async function paused(opts) {
  const g = await openGame({ save: MID_SAVE, ...opts });
  await g.page.keyboard.press('Enter');
  await g.page.waitForFunction(() => window.__gm.GM.state === 'play');
  await g.page.keyboard.press('Escape');
  return g;
}
const txt = (page, sel) => page.$eval(sel, (e) => e.textContent);
const opts = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('lastrider_opts') || 'null'));

test('VOLUME cycles 100 → 70 → 40 → OFF, persists, and drives the SND button', async () => {
  const { browser, page } = await paused();
  try {
    assert.match(await txt(page, '#psnd'), /VOLUME: 100%/);
    await page.click('#psnd');
    assert.match(await txt(page, '#psnd'), /70%/);
    await page.click('#psnd'); await page.click('#psnd');
    assert.match(await txt(page, '#psnd'), /OFF/);
    assert.match(await txt(page, '#mute'), /OFF/);
    assert.equal((await opts(page)).vol, 0);
    await page.reload();
    await page.waitForFunction(() => window.__gm);
    assert.match(await txt(page, '#mute'), /OFF/, 'volume survives a reload');
    assert.equal(await page.evaluate(() => window.__gm.AU.isMuted()), true);
    // the HUD SND button restores the last audible volume
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__gm.GM.state === 'play');
    await page.click('#mute');
    assert.match(await txt(page, '#mute'), /ON/);
    assert.equal((await opts(page)).vol, 1);
  } finally { await browser.close(); }
});

test('REDUCED effects caps full-screen flashes and removes screen shake', async () => {
  const { browser, page } = await paused();
  try {
    assert.match(await txt(page, '#pfx'), /EFFECTS: FULL/);
    await page.click('#pfx');
    assert.match(await txt(page, '#pfx'), /REDUCED/);
    assert.equal((await opts(page)).fx, 0);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { const G = window.__gm.GM; G.flashT = 1.2; G.shake = 5; });
    await page.waitForTimeout(80);
    const op = await page.$eval('#flashv', (e) => +getComputedStyle(e).opacity);
    assert.ok(op <= 0.25, `flash opacity ${op}`);
    const xs = [];
    for (let i = 0; i < 6; i++) { xs.push(await page.evaluate(() => window.__cav.hdr().shX)); await page.waitForTimeout(30); }
    assert.equal(new Set(xs.map((x) => x.toFixed(3))).size, 1, 'camera does not shake');
  } finally { await browser.close(); }
});

test('FULL effects still flash and shake (default unchanged)', async () => {
  const { browser, page } = await paused();
  try {
    await page.keyboard.press('Escape');
    await page.evaluate(() => { const G = window.__gm.GM; G.flashT = 1.2; G.shake = 5; });
    await page.waitForTimeout(80);
    assert.ok(await page.$eval('#flashv', (e) => +getComputedStyle(e).opacity) > 0.5);
    const xs = [];
    for (let i = 0; i < 6; i++) { xs.push(await page.evaluate(() => window.__cav.hdr().shX)); await page.waitForTimeout(30); }
    assert.ok(new Set(xs.map((x) => x.toFixed(3))).size > 1);
  } finally { await browser.close(); }
});

test('FULLSCREEN option toggles browser fullscreen on the web build', async () => {
  const { browser, page } = await paused();
  try {
    assert.match(await txt(page, '#pfull'), /FULLSCREEN/);
    await page.click('#pfull');
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 });
  } finally { await browser.close(); }
});

test('pause menu options are reachable with the keyboard', async () => {
  const { browser, page } = await paused();
  try {
    const ids = [];
    for (let i = 0; i < 5; i++) {
      ids.push(await (await page.waitForFunction(() => document.querySelector('#ovp button.sel')?.id)).jsonValue());
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(40);
    }
    assert.deepEqual(ids, ['resume', 'psnd', 'pfx', 'pfull', 'quit']);
  } finally { await browser.close(); }
});

test('touch players can pause with the HUD button', async () => {
  const { chromium } = await import('playwright');
  const { GAME_URL, SAVEKEY } = await import('./helpers.mjs');
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(GAME_URL);
    await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [SAVEKEY, MID_SAVE]);
    await page.reload();
    await page.waitForFunction(() => window.__gm);
    await page.tap('#ovt');
    await page.waitForFunction(() => window.__gm.GM.state === 'play');
    await page.tap('#pauseb');
    assert.equal(await page.evaluate(() => window.__gm.GM.state), 'pause');
    await page.tap('#resume');
    assert.equal(await page.evaluate(() => window.__gm.GM.state), 'play');
  } finally { await browser.close(); }
});
