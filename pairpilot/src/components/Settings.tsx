import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const defaultPrompt = `You are an expert pair-programming AI. Analyze the technical problem shown on the screen and any audio context. 
Provide a complete response structured as follows:
1) General Overview: Explain the best approach to solve the problem logically, as a human would reason through it.
2) Complexity: State the Space and Time Complexity of your approach.
3) Code Solution: Provide the full, complete, and optimal code solution.`;

  const [prompt, setPrompt] = useState(defaultPrompt);
  const [intervalSec, setIntervalSec] = useState(30);
  const [maxScreenshots, setMaxScreenshots] = useState(50);
  const [maxTimeMin, setMaxTimeMin] = useState(45);
  const [enableAudio, setEnableAudio] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      setReady(true);
      return;
    }
    Promise.all([
      window.electronAPI.getStoreValue('geminiApiKey'),
      window.electronAPI.getStoreValue('systemPrompt'),
      window.electronAPI.getStoreValue('intervalSec'),
      window.electronAPI.getStoreValue('maxScreenshots'),
      window.electronAPI.getStoreValue('maxTimeMin'),
      window.electronAPI.getStoreValue('enableAudio'),
    ])
      .then(([k, p, i, mS, mT, audio]) => {
        if (k) setApiKey(k);
        if (p) setPrompt(p);
        if (i) setIntervalSec(i);
        if (mS) setMaxScreenshots(mS);
        if (mT) setMaxTimeMin(mT);
        if (audio !== undefined) setEnableAudio(!!audio);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI) return;
    await window.electronAPI.setStoreValue('geminiApiKey', apiKey);
    await window.electronAPI.setStoreValue('systemPrompt', prompt);
    await window.electronAPI.setStoreValue('intervalSec', intervalSec);
    await window.electronAPI.setStoreValue('maxScreenshots', maxScreenshots);
    await window.electronAPI.setStoreValue('maxTimeMin', maxTimeMin);
    await window.electronAPI.setStoreValue('enableAudio', enableAudio);
    window.electronAPI.startAssistant();
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-gray-500 text-sm">Loading settings…</div>
      </div>
    );
  }

  if (typeof window !== 'undefined' && !window.electronAPI) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">PairPilot</h2>
        <p className="text-sm text-gray-600 text-center">Please run this app from Electron (e.g. npm run dev).</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          PairPilot Setup
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Configure your Gemini API Key and start the assistant.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSave}>
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                Gemini API Key
              </label>
              <div className="mt-1">
                <input
                  id="apiKey"
                  type="password"
                  required
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 flex justify-between">
                <span>System Prompt</span>
                <button 
                  type="button" 
                  onClick={() => setPrompt(defaultPrompt)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Reset Default
                </button>
              </label>
              <div className="mt-1">
                <textarea
                  id="prompt"
                  rows={4}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="interval" className="block text-sm font-medium text-gray-700">
                  Screenshot Interval (sec)
                </label>
                <div className="mt-1">
                  <input
                    id="interval"
                    type="number"
                    required
                    min={5}
                    value={intervalSec}
                    onChange={e => setIntervalSec(Number(e.target.value))}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="maxScreenshots" className="block text-sm font-medium text-gray-700">
                  Max Screenshots
                </label>
                <div className="mt-1">
                  <input
                    id="maxScreenshots"
                    type="number"
                    required
                    min={1}
                    value={maxScreenshots}
                    onChange={e => setMaxScreenshots(Number(e.target.value))}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="maxTimeMin" className="block text-sm font-medium text-gray-700">
                Max Time to Run (minutes)
              </label>
              <div className="mt-1">
                <input
                  id="maxTimeMin"
                  type="number"
                  required
                  min={1}
                  value={maxTimeMin}
                  onChange={e => setMaxTimeMin(Number(e.target.value))}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="enableAudio"
                type="checkbox"
                checked={enableAudio}
                onChange={e => setEnableAudio(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enableAudio" className="ml-2 block text-sm text-gray-900">
                Enable Microphone Recording <span className="text-xs text-orange-500 font-semibold ml-1">(Experimental)</span>
              </label>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Start Assistant
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={() => window.electronAPI.openTimeline()}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View Past Interviews
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
