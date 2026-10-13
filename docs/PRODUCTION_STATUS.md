# Last Rider: Production Status

_Last updated: 2026-10-13. Keep this short; update it after meaningful progress._

## 1. What the game is (verified from code and running build)

- **Genre:** real-time action-adventure. Small open world, isometric view, drawn entirely as coloured monospace characters on a canvas.
- **Fantasy:** a lone rider on a horse crosses a mist-drowned kingdom to break three guardians. Each victory darkens the land, the rider and the horse. A hermit gives the lamed horse an iron leg, which later turns out to be a bomb. There are two endings (KILL or SPARE the hermit), and the SPARE ending leads into free-roam post-game.
- **Core loop:** ride (momentum, stamina) → reach a camp → clear it with mounted slashes, trampling and dashes → light its sigil → wake the guardian in its arena (3-phase pattern fight with telegraphed rings and "OPEN :: STRIKE NOW" windows) → act changes, the world reacts. Side loop: wells and apple trees heal; chests upgrade speed, HP, vigor and reach; fences need a fast gallop to jump; lore stones.
- **Selling points:** a striking ASCII-isometric look (procedural terrain, rain, lightning, a horse built from shaded ellipsoids), physical horse riding, telegraphed guardian fights, and a dark twist (the iron leg). All visuals and all audio are procedural, so there are no art or music licences to clear.
- **Origin:** built for phones first (touch stick and buttons), hosted on Vercel. Commercial goal is a premium PC release on Steam.

## 2. Tech stack and how to run

| Item | Value |
|---|---|
| Game | `index.html`: one file, about 3.2k lines of ES5 JS, Canvas 2D, WebAudio. No build step and no runtime dependencies. |
| Font | `fonts/` JetBrains Mono NL 2.242 (SIL OFL 1.1, `fonts/OFL.txt`), bundled locally |
| Desktop | `desktop/`: Electron 37.10.3 wrapper, packaged with @electron/packager 18.3.6 |
| Tests | `tests/`: Node test runner + Playwright 1.56.1 (headless Chromium) |
| Web hosting | `vercel.json` (static) |

```bash
# play (web): open index.html in a browser, or serve the folder statically
npm install                 # once: Playwright for tests
npm test                    # fast suite (~1 min): save, input, pause, gamepad, offline, scaling, mobile
npm run test:campaign       # ~2 min bot that plays all acts and both endings through the real code

cd desktop && npm install   # once: Electron
npm start                   # run the desktop app (add -- --windowed for a window)
npm run smoke               # headless launch under Xvfb (Linux): boot, font, input, saving
npm run package:win         # → desktop/dist/Last Rider-win32-x64/Last Rider.exe
npm run package:linux       # → desktop/dist/Last Rider-linux-x64/
```

In the cloud container, Electron needs `--no-sandbox --disable-gpu` (the smoke script passes both). Test hooks: `window.__gm` (game state) and `window.__cav` (teleport, input, frame dump). The `LR_SMOKE` env var makes the desktop app run its self-check and exit.

## 3. Architecture (inside `index.html`)

The file is in section order, with Portuguese comments: noise and world gen (biomes: Fen in the west, Hollow Wood in the centre, Red Barrens in the east; water and pools) → character buffers and the ground pass → object sprites (trees, wells, camps, arenas) → horse and rider rasteriser → particles → game state `GM`, enemies `E` (goblin, brute, archer, hound, mystic), Stone guardian `B` → interaction, objective and compass, HUD → map → campaign (upgrades, fences, chests, lore, save/load, acts, dialogue, cutscenes, hermit, bomb, endings, region music) → Mire/Barrow/Hermit guardians → chiptune sequencer and SFX → input (touch, keyboard, menus, pause, gamepad, device hints) → `update` / `render` / `present` (glyphs batched by colour, 4-bit-per-channel quantisation) → main loop.

The state machine lives in `GM.state`: `title | intro | play | pause | map | talk | cut | choice | dead | end`.

## 4. Status by area

**Working (verified by tests or the bot):** the full campaign through 3 guardians, the hermit, the bomb, the final fight and both endings, plus post-game; save/continue; keyboard, mouse-drag, touch and gamepad; pause; offline font; desktop app boots, saves and goes fullscreen (packaged Linux build tested); 60 fps at 720p, 1080p and 1440p in headless software rendering (about 8–11 ms CPU per frame).

**Partial or unverified:**
- **Balance and difficulty:** never playtested by a human in this session; the bot bypasses fights.
- **Length:** unknown. The campaign is small: 4 camps, 3 guardians and 1 final fight, plus 18 chests and 5 lore stones. It probably runs well under 2 hours.
- **Windows build:** packaged but not run (there's no Windows/Wine in the container).
- **Audio:** an on/off switch is the only setting; there's no volume control.

**Missing for a premium PC release:** an options menu (volume, fullscreen, reduced flashes/shake), key rebinding, Steamworks (achievements, cloud saves), app icon and version metadata, code signing, a store page and capsule art, a trailer, and enough content and depth for the price point.

## 5. Changes completed (this session)

| Change | Verification |
|---|---|
| **P0 save loss fixed:** CONTINUE was never visible (CSS overrode it), any key on the title erased the save, and a title tap autosaved a new run over it. Now: CONTINUE by default, NEW GAME needs confirmation, stats and ending are saved, post-game reloads into free roam, post-game objective points at unopened chests. | 9 Playwright tests (failing before, passing after) |
| **PC input:** ESC/P pause with a true sim freeze and audio suspend; focus loss pauses and releases held keys; keyboard menus (the ending choice was mouse-only, so keyboard players could not finish); standard gamepad support; device-specific hints. | 8 tests incl. a mocked gamepad and a mobile touch regression |
| **Offline font:** bundled JetBrains Mono NL with its OFL licence, so the game makes no CDN requests. | Test that blocks all network access |
| **Resolution independence:** about 160 columns at every width. At 1440p this cut work from 32k to 8k glyphs per frame (25 → 60 fps headless). The HUD scales 1× / 1.5× / 2×. | Scaling test and screenshots |
| **Desktop wrapper:** Electron with quit-to-desktop, fullscreen toggle and RIDE/QUIT on the title. Fixed Enter-quits-on-first-launch. | `npm run smoke` on the dev build and the packaged Linux build |

## 6. Known issues and technical debt

- The single 3.2k-line file has globals shared across sections. It works and is fast, but further big features would benefit from splitting into modules (no bundler needed: ES modules or several `<script>` tags). Don't split it without a reason; every test drives the real file.
- `index.html` has no `<!doctype html>`, so it renders in quirks mode. It renders correctly today; adding a doctype needs a visual check.
- On death you respawn at the checkpoint with full HP; uncleared camps reset and the guardian resets. That is intended, but the difficulty curve is unknown.
- Electron's "Insecure CSP" warning shows in dev only. A CSP meta tag could be added once inline handlers have been reviewed.
- `GM.vm` and `spd` units are not documented anywhere; balance values are scattered as literals.

## 7. Asset licensing and distribution risks

- **Art:** procedural ASCII; no image files. **Audio:** procedural WebAudio; no sample files. Both were written in-repo (author Ricardo Neumann, plus commits co-authored with Claude). There are no third-party assets to clear.
- **Font:** JetBrains Mono, SIL OFL 1.1, which allows commercial use and bundling. Keep `fonts/OFL.txt` in builds.
- **Electron/Chromium:** MIT plus the Chromium third-party licences. Packaged builds include `LICENSE` and `LICENSES.chromium.html`; keep them.
- **Positioning risk (not a legal blocker):** the premise (a lone rider and horse breaking colossal guardians, lore stones that say "colossi") reads close to *Shadow of the Colossus*. No protected expression is copied, but the store page should lean on what is distinctive here (ASCII rendering, the iron-leg betrayal, the choice ending), and the word "colossi" in the lore could be dropped.

## 8. Prioritised roadmap

| P | Task | Impact | Effort | Depends on | Verify by |
|---|---|---|---|---|---|
| P1 | Human playtest of the full campaign on PC (time it; note deaths and confusion) | Very high: length and difficulty are unknown | 2–3 h human | none | play notes |
| P1 | Run the Windows build on a real PC (fullscreen, gamepad, save location) | High | 30 min human | none | manual |
| P1 | Options menu: master/music/SFX volume, fullscreen, reduced flashes and shake (the white flash and lightning are a photosensitivity concern) | High | S | none | Playwright tests |
| P2 | Key rebinding plus controller glyph hints | Medium | M | options menu | tests |
| P2 | Content and depth for a premium price: more camps and enemy variety per biome, a 4th guardian or optional bosses, more upgrades, a hard mode | Very high | L | playtest results | playtest |
| P2 | Balance pass driven by playtest data (guardian HP and stun windows, enemy density, apple and well healing) | High | M | playtest | playtest |
| P3 | Audio depth (per-guardian themes, ambient layers), crisper hit feedback | Medium | M | none | listening |
| P3 | Split `index.html` into modules if the content work makes it unwieldy | Medium | M | none | full test suite |
| P4 | Steamworks via steamworks.js (achievements, cloud saves), icon and version metadata, code signing, store page, capsule art, trailer | Required to ship | M–L | Steam partner account (human) | Steam build review |

**Postpone until after launch:** macOS build, localisation (the UI is English and the code comments are Portuguese), New Game+.

## 9. Open questions for the owner

1. What is the target price and length? That decides how much content P2 needs.
2. Is a Steam partner account set up yet? Steam Direct needs a human, a fee and tax/bank details.
3. Should the "colossi" wording stay?
4. Should the web/mobile version stay free (as a demo or marketing) alongside the paid PC release?
