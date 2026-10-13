import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const GAME_URL = pathToFileURL(path.resolve(import.meta.dirname, '..', 'index.html')).href;
export const SAVEKEY = 'lastrider_v2';

const exe = process.env.PW_CHROMIUM || undefined;

/* Opens the game in headless Chromium. `save` (object) is written to localStorage before the game boots. */
export async function openGame({ save, viewport = { width: 1280, height: 720 } } = {}) {
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  await page.goto(GAME_URL);
  if (save !== undefined) {
    await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [SAVEKEY, save]);
    await page.reload();
  }
  await page.waitForFunction(() => window.__gm && window.__cav);
  return { browser, page, errors };
}

export const state = (page) => page.evaluate(() => window.__gm.GM.state);
export const readSave = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), SAVEKEY);
export const visible = (page, sel) => page.$eval(sel, (e) => getComputedStyle(e).display !== 'none' && e.offsetParent !== null);

/* A mid-campaign save: Stone Guardian dead, Hollow sigil lit, one chest found. */
export const MID_SAVE = {
  v: 2, act: 1, gdead: [true, false, false], sig: [true, false, false], up: { spd: 1, reach: 0, hp: 0, vg: 0 },
  hpMax: 120, vgMax: 120, leg: false, limp: true, regrown: false, dark: 1, decay: [0.62, 0, 0], post: false,
  ch: [1], cm: [1, 1, 0, 0], cp: { x: 10, y: -20 }, drank: true, ate: true, found: 1, lore: {}, bombed: false,
  foot: false, corpse: null, hm: false, tm: 754, kills: 42, deaths: 3,
};
