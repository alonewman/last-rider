```
 _     _   ____ _____   ____  ___ ____  _____ ____
| |   / \ / ___|_   _| |  _ \|_ _|  _ \| ____|  _ \
| |  / _ \\___ \ | |   | |_) || || | | |  _| | |_) |
| |_/ ___ \___) || |   |  _ < | || |_| | |___|  _ <
|_(_)_/   \_\____/ |_|  |_| \_\___|____/|_____|_| \_\
```

tiny ASCII isometric action game. one HTML file, no build step, made for phones.

> the mist took the kingdom.
> three guardians hold the dark shut.
> someone has to ride_

**[play](https://last-rider.vercel.app)** · [site](https://www.ricardoneumann.xyz/) · [other side quests](https://github.com/alonewman)

## how it plays

- **phone:** drag to steer, tap `[ STRIKE ]` and `[DASH]`. `[II]` pauses, `[MAP]` shows where you are, `[SND:ON]` mutes.
- **keyboard:** WASD / arrows ride, SPACE strikes, SHIFT dashes, M map, ESC pause. mouse-drag steers too.
- **gamepad:** left stick rides, A strikes, B dashes, BACK map, START pause.
- the pause menu has volume, reduced flashes & shake, and fullscreen. progress saves on its own; the title offers CONTINUE.
- **HP and vigor.** moving fast drains vigor, resting brings it back. at zero you are exhausted until it recovers. dash spends stamina.
- **drink at wells, eat under apple trees.** each tree holds 3 apples and grows them back after a while.
- **gallop fast to leap fences, find chests to ride faster.**
- **clear the camps** (Scouts, Hollow, Fen, Red). clearing a sigil camp awakens a sigil and heals you.
- **three guardians** wait in the Stone, Mire and Barrow arenas.
- a kneeling hermit will ask you to `[ KILL ]` or `[ SPARE ]`. choose.
- if the mist takes you, you rise again.

## under the hood

- a single `index.html` drawn on a canvas as a grid of monospace characters (JetBrains Mono, bundled in `fonts/`), shaded with ramps like `:-=+*#%@`
- touch-first but PC-ready: about 160 columns at any resolution, HUD scales with the screen, safe-area aware
- procedural chiptune music and sound effects (WebAudio), no audio files

## run it

open `index.html` in a browser. there is no build step.

tests (Playwright, headless Chromium):

```
npm install
npm test               # fast suite
npm run test:campaign  # bot plays every act and both endings (~2 min)
```

desktop build (Electron, Windows / Linux):

```
cd desktop && npm install
npm start              # play in a window (add -- --windowed)
npm run package:win    # desktop/dist/Last Rider-win32-x64/
npm run package:linux
```

production notes, roadmap and known issues: [`docs/PRODUCTION_STATUS.md`](docs/PRODUCTION_STATUS.md).

to host your own copy, import the repo on [vercel.com/new](https://vercel.com/new) (a `vercel.json` is included).

<sub>built on a tiny budget of bytes.</sub>
