import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getStoreValue: (key: string) => ipcRenderer.invoke('get-store-value', key),
  setStoreValue: (key: string, value: any) => ipcRenderer.invoke('set-store-value', key, value),
  startAssistant: () => ipcRenderer.invoke('start-assistant'),
  hideAssistant: () => ipcRenderer.invoke('hide-assistant'),
  openTimeline: () => ipcRenderer.invoke('open-timeline'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  askGemini: (promptText: string, imageBase64: string | null, audioBase64: string | null, audioMime: string | null) => 
    ipcRenderer.invoke('ask-gemini', promptText, imageBase64, audioBase64, audioMime),
  evaluateInterview: (history: string[]) => ipcRenderer.invoke('evaluate-interview', history),
  onForceCapture: (callback: () => void) => {
    ipcRenderer.on('force-capture', callback);
    return () => ipcRenderer.removeAllListeners('force-capture');
  },
});
