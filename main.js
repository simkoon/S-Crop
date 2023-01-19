require('v8-compile-cache');

const { app, BrowserWindow, globalShortcut, session } = require('electron');
const path = require('path');
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();

var mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    show: false,
    icon: path.join(__dirname, './fav.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
      webSecurity: false,
    },
  });
  mainWindow.removeMenu();
  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.openDevTools();
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  //   console.log('뭐냐', details);
  //   callback({
  //     responseHeaders: {
  //       ...details.responseHeaders,
  //       'Content-Security-Policy': '',
  //     },
  //   });
  // });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  globalShortcut.register('Alt+CommandOrControl+I', () => {
    mainWindow.webContents.send('key-shortcut', 1);
  });
  globalShortcut.register('Alt+CommandOrControl+O', () => {
    mainWindow.webContents.send('key-shortcut-ocr', 2);
  });
  globalShortcut.register('Esc', () => {
    mainWindow.webContents.send('close-crop');
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    globalShortcut.unregisterAll();
    app.quit();
  }
});

app.on('browser-window-created', (_, window) => {
  remoteMain.enable(window.webContents);
});

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});
