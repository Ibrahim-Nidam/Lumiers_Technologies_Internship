const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('server', {
  start: () => ipcRenderer.invoke('start-server'),
  stop: () => ipcRenderer.invoke('stop-server'),
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  checkStatus: () => ipcRenderer.invoke('check-server-status'),
  
  // Listen for server events
  onServerOutput: (callback) => ipcRenderer.on('server-output', callback),
  onServerError: (callback) => ipcRenderer.on('server-error', callback),
  onServerStopped: (callback) => ipcRenderer.on('server-stopped', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});