const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, nativeImage } = require('electron');
const path = require('path');

const API_URL = process.env.API_URL || 'https://grilyage.ru';
const WS_URL = process.env.WS_URL || 'wss://grilyage.ru';

let mainWindow;
let tray = null;
let callWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Грильяж Оператор',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenu(null);

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Грильяж Оператор');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть',
      click: () => {
        if (mainWindow) mainWindow.show();
        else createWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) mainWindow.show();
    else createWindow();
  });
}

function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

// === LiveKit Call Window ===
function createCallWindow(roomName, token) {
  if (callWindow) {
    callWindow.focus();
    callWindow.webContents.send('call-params', { roomName, token });
    return;
  }

  callWindow = new BrowserWindow({
    width: 400,
    height: 500,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    title: 'Звонок',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  callWindow.loadURL(`file://${path.join(__dirname, 'renderer', 'index.html')}#call`);
  callWindow.setMenu(null);

  callWindow.on('closed', () => {
    callWindow = null;
  });
}

// === IPC Handlers ===

ipcMain.handle('show-notification', (_event, title, body) => {
  showNotification(title, body);
  return true;
});

ipcMain.handle('open-call-window', (_event, roomName, token) => {
  createCallWindow(roomName, token);
  return true;
});

ipcMain.handle('close-call-window', () => {
  if (callWindow) {
    callWindow.close();
    callWindow = null;
  }
  return true;
});

ipcMain.handle('get-api-url', () => API_URL);
ipcMain.handle('get-ws-url', () => WS_URL);

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // Keep running in tray
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
