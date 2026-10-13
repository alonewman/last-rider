'use strict';
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('node:path');

let win = null;

function toggleFullscreen() { if (win) win.setFullScreen(!win.isFullScreen()); }

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 640, minHeight: 360,
    fullscreen: !process.argv.includes('--windowed'),
    backgroundColor: '#050816',
    title: 'Last Rider',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) { toggleFullscreen(); e.preventDefault(); }
  });
  // the game is fully local: never navigate away or open new windows inside the app
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.loadFile(path.join(__dirname, 'game', 'index.html'));
}

Menu.setApplicationMenu(null);
ipcMain.on('desktop:quit', () => app.quit());
ipcMain.on('desktop:fullscreen', () => toggleFullscreen());
app.whenReady().then(() => {
  createWindow();
  // LR_SMOKE=<png path>: boot, start a run, screenshot, report state, exit (used by tests/desktop smoke run)
  if (process.env.LR_SMOKE) {
    win.webContents.once('did-finish-load', async () => {
      const wc = win.webContents;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      try {
        await wait(1500);
        const boot = await wc.executeJavaScript('({state: window.__gm.GM.state, desktop: !!window.desktop, font: document.fonts.check(\'500 16px "JetBrains Mono"\'), quitShown: document.getElementById("qgame").offsetParent !== null})');
        wc.sendInputEvent({ type: 'keyDown', keyCode: 'Return' }); wc.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
        await wait(3000);
        const img = await wc.capturePage();
        require('node:fs').writeFileSync(process.env.LR_SMOKE, img.toPNG());
        const run = await wc.executeJavaScript('({state: window.__gm.GM.state, ls: (localStorage.setItem("lr_probe","1"), localStorage.getItem("lr_probe"))})');
        require('node:fs').writeFileSync(process.env.LR_SMOKE + '.json', JSON.stringify({ boot, run, fullscreen: win.isFullScreen(), size: win.getSize() }));
      } catch (e) { require('node:fs').writeFileSync(process.env.LR_SMOKE + '.json', JSON.stringify({ error: String(e) })); }
      app.quit();
    });
  }
});
app.on('window-all-closed', () => app.quit());
