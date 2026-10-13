import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, state, readSave, visible, MID_SAVE } from './helpers.mjs';

test('boots to the title with no page errors', async () => {
  const { browser, page, errors } = await openGame();
  try {
    await page.waitForTimeout(800);
    assert.equal(await state(page), 'title');
    assert.equal(await visible(page, '#ovt'), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('CONTINUE is shown when a save exists', async () => {
  const { browser, page } = await openGame({ save: MID_SAVE });
  try {
    assert.equal(await visible(page, '#cont'), true);
  } finally { await browser.close(); }
});

test('pressing a key on the title with a save continues instead of erasing it', async () => {
  const { browser, page } = await openGame({ save: MID_SAVE });
  try {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    assert.equal(await state(page), 'play');
    const gm = await page.evaluate(() => ({ act: window.__gm.GM.act, gdead: window.__gm.GM.gdead, kills: window.__gm.GM.kills }));
    assert.equal(gm.act, 1);
    assert.deepEqual(gm.gdead, [true, false, false]);
    assert.equal(gm.kills, 42);
    const s = await readSave(page);
    assert.ok(s, 'save must still exist');
    assert.equal(s.act, 1);
  } finally { await browser.close(); }
});

test('tapping the title with a save continues instead of starting over', async () => {
  const { browser, page } = await openGame({ save: MID_SAVE });
  try {
    await page.mouse.click(640, 120);
    await page.waitForTimeout(300);
    assert.equal(await state(page), 'play');
    assert.equal(await page.evaluate(() => window.__gm.GM.act), 1);
    await page.waitForTimeout(500);
    assert.equal((await readSave(page)).act, 1);
  } finally { await browser.close(); }
});

test('NEW GAME needs a second confirmation before erasing the save', async () => {
  const { browser, page } = await openGame({ save: MID_SAVE });
  try {
    assert.equal(await visible(page, '#newg'), true);
    await page.click('#newg');
    await page.waitForTimeout(200);
    assert.equal(await state(page), 'title', 'first press only arms the button');
    assert.ok(await readSave(page), 'save survives the first press');
    await page.click('#newg');
    await page.waitForTimeout(300);
    assert.equal(await state(page), 'intro');
    const s = await readSave(page);
    assert.ok(!s || s.act === 0, 'old progress is gone after confirming');
  } finally { await browser.close(); }
});

test('without a save, a key on the title starts the intro', async () => {
  const { browser, page } = await openGame();
  try {
    assert.equal(await visible(page, '#cont'), false);
    assert.equal(await visible(page, '#newg'), false);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    assert.equal(await state(page), 'intro');
  } finally { await browser.close(); }
});

test('playtime, kills and falls survive save and load', async () => {
  const { browser, page } = await openGame({ save: MID_SAVE });
  try {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await page.evaluate(() => { const G = window.__gm.GM; G.kills += 5; window.__gm.saveGame(); });
    const s = await readSave(page);
    assert.equal(s.kills, 47);
    assert.equal(s.deaths, 3);
    assert.ok(s.tm >= 754);
  } finally { await browser.close(); }
});

test('a post-game save loads into free roam, not back into the final fight', async () => {
  const post = { ...MID_SAVE, act: 4, gdead: [true, true, true], sig: [true, true, true], regrown: true, leg: true, limp: false, post: true, dark: 3, decay: [0.7, 0.7, 0.7], cm: [1, 1, 1, 1], ending: 2 };
  const { browser, page } = await openGame({ save: post });
  try {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ act: window.__gm.GM.act, kind: window.__gm.B.kind, post: window.__gm.GM.post, obj: document.getElementById('obj').textContent }));
    assert.equal(r.act, 4);
    assert.equal(r.kind, 'none');
    assert.equal(r.post, true);
    assert.doesNotMatch(r.obj, /Hermit/);
  } finally { await browser.close(); }
});

test('reaching the spare ending saves as post-game', async () => {
  const late = { ...MID_SAVE, act: 3, gdead: [true, true, true], sig: [true, true, true], leg: true, limp: false, dark: 3, bombed: true, foot: true, corpse: { x: 0, y: 0, psi: 0 }, cm: [1, 1, 1, 1] };
  const { browser, page } = await openGame({ save: late });
  try {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await page.evaluate(() => { window.__gm.GM.state = 'choice'; window.__gm.chooseEnding(true); });
    // skip the dialogue and the 8s revival cutscene
    for (let i = 0; i < 40 && (await state(page)) === 'talk'; i++) { await page.evaluate(() => window.__gm.talkAdvance()); }
    await page.waitForFunction(() => window.__gm.GM.state === 'end', null, { timeout: 15000 });
    const s = await readSave(page);
    assert.equal(s.ending, 2);
  } finally { await browser.close(); }
});
