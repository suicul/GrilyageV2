const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  startService: (name) => ipcRenderer.invoke('start-service', name),
  stopService: (name) => ipcRenderer.invoke('stop-service', name),
  startAll: () => ipcRenderer.invoke('start-all'),
  stopAll: () => ipcRenderer.invoke('stop-all'),
  getLogs: (name) => ipcRenderer.invoke('get-logs', name),
  refreshStatus: () => ipcRenderer.invoke('refresh-status'),
  getChecks: () => ipcRenderer.invoke('get-checks'),
  runAction: (name) => ipcRenderer.invoke('run-action', name),
  createStaffUser: (input) => ipcRenderer.invoke('create-staff-user', input),
  createCustomerUser: (input) => ipcRenderer.invoke('create-customer-user', input),
  openTarget: (name) => ipcRenderer.invoke('open-target', name),
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (_event, data) => callback(data));
  },
  onLogAppend: (callback) => {
    ipcRenderer.on('log-append', (_event, data) => callback(data));
  },
});
