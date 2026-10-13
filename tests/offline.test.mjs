import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { GAME_URL } from './helpers.mjs';

test('runs fully offline: no network requests, bundled font loads', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const external = [];
    await page.route('**/*', (r) => {
      const u = r.request().url();
      if (u.startsWith('file:') || u.startsWith('data:')) return r.continue();
      external.push(u); return r.abort();
    });
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(GAME_URL);
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => document.fonts.check('500 16px "JetBrains Mono"') && document.fonts.check('700 16px "JetBrains Mono"') &&
      [...document.fonts].filter((f) => f.family.includes('JetBrains') && f.status === 'loaded').length);
    assert.equal(loaded, 2);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
