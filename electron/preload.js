// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  getEnvironment: () => ipcRenderer.invoke('get-environment'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  platform: process.platform
});