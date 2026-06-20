// main.js — Electron 진입점

const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 로컬 HTTP 서버가 구동 중이라면 그 주소를, 아니면 file://로 로드
  win.loadURL('http://localhost:3000/views/room.html');
  // win.loadFile(path.join(__dirname, 'views', 'room.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
