'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  quit: () => ipcRenderer.send('desktop:quit'),
  toggleFullscreen: () => ipcRenderer.send('desktop:fullscreen'),
});
