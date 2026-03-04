import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, desktopCapturer, screen, session, systemPreferences } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Store from 'electron-store';
import isDev from 'electron-is-dev';
import * as dotenv from 'dotenv';

app.disableHardwareAcceleration();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, '..');

dotenv.config({ path: path.join(process.env.APP_ROOT, '.env') });

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = isDev && VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let mainWindow: BrowserWindow | null;
let tray: Tray | null;

const store = new Store();

function createSplashWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    title: 'PairPilot Settings',
  });

  if (isDev && VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${VITE_DEV_SERVER_URL}#/splash`);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: 'splash' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTimelineWindow() {
  if (mainWindow) {
    mainWindow.close();
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    title: 'PairPilot Timeline',
  });

  if (isDev && VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${VITE_DEV_SERVER_URL}#/timeline`);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: 'timeline' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createFloatingWindow() {
  if (mainWindow) {
    mainWindow.close();
  }

  mainWindow = new BrowserWindow({
    width: 400,
    height: 800,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Position at top right
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  mainWindow.setPosition(width - 420, 40);

  if (isDev && VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${VITE_DEV_SERVER_URL}#/assistant`);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: 'assistant' });
  }
}

function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC || path.join(process.env.APP_ROOT, 'public'), 'icon.png');
  // fallback if file doesn't exist
  try {
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Settings', click: () => createSplashWindow() },
      { label: 'Timeline', click: () => createTimelineWindow() },
      { label: 'Start Assistant', click: () => createFloatingWindow() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    
    tray.setToolTip('PairPilot AI');
    tray.setContextMenu(contextMenu);
  } catch (err) {
    console.error('Failed to create tray', err);
  }
}

import { askGemini, evaluateInterview } from './gemini';

  app.whenReady().then(() => {
    // Avoid macOS "SetApplicationIsDaemon paramErr -50" by keeping dock visible (Chromium quirk with tray-only apps)
    if (process.platform === 'darwin') {
      app.dock?.show();
    }

    // Clear previous session history on fresh app start
    store.delete('interviewHistory');
    store.delete('interviewHistoryObjs');

    // Allow external requests for Gemini if needed
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss: https:;"]
        }
      })
    })

    // Create main window/tray logic
    createTray();
  
  // Show splash on start if settings missing, else start assistant
  if (!store.get('geminiApiKey') && process.env.GEMINI_API_KEY) {
    store.set('geminiApiKey', process.env.GEMINI_API_KEY);
  }

  if (!store.get('geminiApiKey')) {
    createSplashWindow();
  } else {
    createFloatingWindow();
  }

  // Register hotkeys
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (mainWindow) {
      mainWindow.webContents.send('force-capture');
    }
  });

  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });

  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    console.log('Force quit via hotkey triggered');
    if (tray && !tray.isDestroyed()) tray.destroy();
    app.exit(0);
  });

  ipcMain.handle('get-store-value', (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('set-store-value', (event, key, value) => {
    store.set(key, value);
    return true;
  });
  
  ipcMain.handle('start-assistant', () => {
    // Check mic permission on macOS proactively to trigger prompt
    if (process.platform === 'darwin') {
      const micStatus = systemPreferences.getMediaAccessStatus('microphone');
      if (micStatus === 'not-determined') {
        systemPreferences.askForMediaAccess('microphone');
      }
    }
    createFloatingWindow();
    return true;
  });

  ipcMain.handle('quit-app', () => {
    // Graceful teardown logic
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
    }
    app.exit(0);
    return true;
  });

  ipcMain.handle('hide-assistant', () => {
    if (mainWindow) {
      mainWindow.hide(); // the hotkey Cmd+Shift+H can show it again
    }
    return true;
  });

  ipcMain.handle('open-timeline', () => {
    createTimelineWindow();
    return true;
  });

  ipcMain.handle('capture-screen', async () => {
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('screen');
      if (status !== 'granted') {
        throw new Error(`Screen recording permission not granted. Status: ${status}. Please enable it in macOS System Settings -> Privacy & Security -> Screen Recording.`);
      }
    }

    // Use smaller dimensions and JPEG to stay under Gemini's inline image size limits and avoid "Unable to process input image"
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
    if (sources.length > 0) {
      const img = sources[0].thumbnail;
      if (img.isEmpty()) return null;
      const jpegBuffer = img.toJPEG(85);
      return 'data:image/jpeg;base64,' + jpegBuffer.toString('base64');
    }
    return null;
  });

  ipcMain.handle('ask-gemini', async (event, promptText, imageBase64, audioBase64, audioMime) => {
    const apiKey = store.get('geminiApiKey') as string;
    if (!apiKey) throw new Error('API Key missing');
    return await askGemini(apiKey, promptText, imageBase64, audioBase64, audioMime);
  });

  ipcMain.handle('evaluate-interview', async (event, history) => {
    const apiKey = store.get('geminiApiKey') as string;
    if (!apiKey) throw new Error('API Key missing');
    return await evaluateInterview(apiKey, history);
  });
});

app.on('window-all-closed', () => {
  // macOS apps usually stay open even when all windows are closed
  // But if the user explicitly triggers quit, we should let it close.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
