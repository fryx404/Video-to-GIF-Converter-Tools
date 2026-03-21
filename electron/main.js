import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 11020;
let server;

// Enable SharedArrayBuffer for ffmpeg
app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");

function startLocalServer() {
  const serverApp = express();
  // Enable Cross-Origin Isolation for ffmpeg WASM
  serverApp.use((req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });
  serverApp.use(express.static(path.join(__dirname, '../dist')));
  server = serverApp.listen(PORT, '127.0.0.1', () => {
    console.log(`Local server started at http://127.0.0.1:${PORT}`);
    createWindow();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Set necessary headers for ffmpeg on Electron side as well
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Embedder-Policy': ['require-corp'],
        'Cross-Origin-Opener-Policy': ['same-origin']
      }
    });
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // Connect to the local Express server instead of file://
    win.loadURL(`http://127.0.0.1:${PORT}`);
  }
}

app.whenReady().then(() => {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    createWindow();
  } else {
    startLocalServer();
  }
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
