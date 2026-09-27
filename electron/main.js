import { app, BrowserWindow, nativeTheme, session, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_URL = 'http://localhost:5173';
// Fixed port keeps the page origin stable, so localStorage (theme setting) survives restarts.
// Falls back to an OS-assigned port when it is taken.
const PREFERRED_PORT = 11020;
let server;
let serverUrl;
let mainWindow;

// Enable SharedArrayBuffer for ffmpeg
app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");

// Only one instance: a second launch focuses the existing window
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const serverApp = express();
    // Enable Cross-Origin Isolation for ffmpeg WASM
    serverApp.use((req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      next();
    });
    serverApp.use(express.static(path.join(__dirname, '../dist')));
    const listen = (port, fallback) => {
      server = serverApp.listen(port, '127.0.0.1', () => {
        serverUrl = `http://127.0.0.1:${server.address().port}`;
        console.log(`Local server started at ${serverUrl}`);
        resolve(serverUrl);
      });
      server.on('error', (err) => {
        if (fallback && err.code === 'EADDRINUSE') listen(0, false);
        else reject(err);
      });
    };
    listen(PREFERRED_PORT, true);
  });
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: `Video to GIF Converter v${app.getVersion()}`,
    icon: path.join(__dirname, '../build/icon.png'),
    autoHideMenuBar: true,
    // Matches the --bg token of the theme so the window does not flash before the page paints
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#000000' : '#FFFFFF',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Keep the page title fixed (the HTML <title> would otherwise replace it)
  mainWindow.on('page-title-updated', (e) => e.preventDefault());

  // Never navigate away from the app (e.g. a file dropped outside the drop zone)
  mainWindow.webContents.on('will-navigate', (e, targetUrl) => {
    if (!targetUrl.startsWith(url)) e.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith('https://')) shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  mainWindow.loadURL(url);
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
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

  const url = process.env.NODE_ENV === 'development' ? DEV_URL : await startLocalServer();
  createWindow(url);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
  });
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
