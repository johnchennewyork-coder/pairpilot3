/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    getStoreValue: (key: string) => Promise<any>;
    setStoreValue: (key: string, value: any) => Promise<boolean>;
    startAssistant: () => Promise<boolean>;
    hideAssistant: () => Promise<boolean>;
    openTimeline: () => Promise<boolean>;
    quitApp: () => Promise<boolean>;
    captureScreen: () => Promise<string | null>;
    askGemini: (promptText: string, imageBase64: string | null, audioBase64: string | null, audioMime: string | null) => Promise<string>;
    evaluateInterview: (history: string[]) => Promise<any>;
    onForceCapture: (callback: () => void) => () => void;
  }
}
