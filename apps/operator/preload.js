const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('operator', {
  // Notifications
  showNotification: (title, body) =>
    ipcRenderer.invoke('show-notification', title, body),

  // Call window (LiveKit)
  openCallWindow: (roomName, token) =>
    ipcRenderer.invoke('open-call-window', roomName, token),
  closeCallWindow: () =>
    ipcRenderer.invoke('close-call-window'),

  // Config
  getApiUrl: () => ipcRenderer.invoke('get-api-url'),
  getWsUrl: () => ipcRenderer.invoke('get-ws-url'),

  // Call window events (for the call overlay window)
  onCallParams: (callback) => {
    ipcRenderer.on('call-params', (_event, params) => callback(params));
  },
});
