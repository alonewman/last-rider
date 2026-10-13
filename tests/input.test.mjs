import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, state, readSave, visible, MID_SAVE } from './helpers.mjs';

async function playing(opts) {
  const g = await openGame({ save: MID_SAVE, ...opts });
  await g.page.keyboard.press('Enter');
  await g.page.waitForFunction(() => window.__gm.GM.state === 'play');
  return g;
}
const pos = (page) => page.evaluate(() => window.__cav.pos());

test('Escape pauses and freezes the simulation; Escape resumes', async () => {
  const { browser, page } = await playing();
  try {
    await page.keyboard.down('d');
    await page.waitForTimeout(600);
    await page.keyboard.press('Escape');
    assert.equal(await state(page), 'pause');
    assert.equal(await visible(page, '#ovp'), true);
    const a = await pos(page);
    await page.waitForTimeout(600);
    const b = await pos(page);
    assert.deepEqual(b.slice(0, 2), a.slice(0, 2), 'horse must not move while paused');
    await page.keyboard.up('d');
    await page.keyboard.press('Escape');
    assert.equal(await state(page), 'play');
    assert.equal(await visible(page, '#ovp'), false);
  } finally { await browser.close(); }
});

test('losing window focus pauses and releases held keys', async () => {
  const { browser, page } = await playing();
  try {
    await page.keyboard.down('d');
    await page.waitForTimeout(200);
    assert.ok(await page.evaluate(() => window.__cav.input.mag) > 0);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await state(page), 'pause');
    assert.equal(await page.evaluate(() => window.__cav.input.mag), 0);
  } finally { await browser.close(); }
});

test('SAVE & QUIT from pause saves and returns to the title with CONTINUE', async () => {
  const { browser, page } = await playing();
  try {
    await page.evaluate(() => { window.__gm.GM.kills = 99; });
    await page.keyboard.press('Escape');
    await Promise.all([page.waitForEvent('load'), page.click('#quit')]);
    await page.waitForFunction(() => window.__gm && window.__gm.GM.state === 'title');
    assert.equal((await readSave(page)).kills, 99);
    assert.equal(await visible(page, '#cont'), true);
  } finally { await browser.close(); }
});

test('the KILL / SPARE choice can be made with the keyboard', async () => {
  const { browser, page } = await playing();
  try {
    await page.evaluate(() => window.__gm.hermitChoice());
    assert.equal(await state(page), 'choice');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.querySelector('#ovc button.sel').id), 'spare');
    await page.keyboard.press('Enter');
    assert.equal(await state(page), 'talk');
  } finally { await browser.close(); }
});

test('the ending screen can be left with the keyboard', async () => {
  const { browser, page } = await playing();
  try {
    await page.evaluate(() => { window.__gm.GM.state = 'choice'; window.__gm.chooseEnding(false); });
    assert.equal(await state(page), 'end');
    // KILL ending hides KEEP RIDING, so the only option is NEW GAME
    assert.equal(await page.evaluate(() => document.querySelector('#ovw button.sel').id), 'again');
  } finally { await browser.close(); }
});

test('a gamepad steers, strikes and pauses', async () => {
  const { browser, page } = await playing();
  try {
    await page.evaluate(() => {
      window.__pad = { connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      navigator.getGamepads = () => [window.__pad];
    });
    const a = await pos(page);
    await page.evaluate(() => { window.__pad.axes[0] = 1; });
    await page.waitForTimeout(700);
    assert.ok(await page.evaluate(() => window.__cav.input.mag) > 0.5);
    const b = await pos(page);
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > 1, 'horse moved');
    await page.evaluate(() => { window.__pad.axes[0] = 0; });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__cav.input.mag), 0, 'releasing the stick stops steering');

    const sw = await page.evaluate(() => window.__gm.GM.swing);
    await page.evaluate(() => { window.__pad.buttons[0].pressed = true; });
    await page.waitForTimeout(100);
    await page.evaluate(() => { window.__pad.buttons[0].pressed = false; });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__gm.GM.swing), sw + 1, 'A strikes once per press');

    await page.evaluate(() => { window.__pad.buttons[9].pressed = true; });
    await page.waitForTimeout(100);
    assert.equal(await state(page), 'pause');
  } finally { await browser.close(); }
});

test('desktop shows keyboard hints instead of touch hints', async () => {
  const { browser, page } = await openGame();
  try {
    const hint = await page.$eval('#hint', (e) => e.textContent);
    assert.match(hint, /ESC/);
  } finally { await browser.close(); }
});

test('phones keep the touch hints and touch play still works', async () => {
  const { chromium } = await import('playwright');
  const { GAME_URL } = await import('./helpers.mjs');
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(GAME_URL);
    await page.waitForFunction(() => window.__gm);
    assert.match(await page.$eval('#hint', (e) => e.textContent), /drag/);
    await page.tap('#ovt');
    await page.waitForFunction(() => window.__gm.GM.state === 'intro');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
