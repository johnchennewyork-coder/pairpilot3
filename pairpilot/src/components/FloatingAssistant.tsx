import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Settings, Minimize2, CheckSquare, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AudioRecorder } from '../services/capture';

const FloatingAssistant = () => {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  type ChatEntry = { time: string; msg: string; role?: 'context' | 'response' };
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [nextCaptureSec, setNextCaptureSec] = useState<number | null>(null);
  const recorderRef = useRef<AudioRecorder>(new AudioRecorder());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const screenshotCountRef = useRef(0);
  const configRef = useRef({ maxScreenshots: 50, maxTimeMin: 45, enableAudio: false });

  useEffect(() => {
    window.electronAPI.getStoreValue('interviewHistoryObjs').then((val: ChatEntry[] | unknown) => {
      if (val && Array.isArray(val)) {
        setHistory(val.map((h: { time?: string; msg: string; role?: string }) => ({
          time: h.time || '',
          msg: h.msg,
          role: h.role === 'context' ? 'context' : 'response',
        })));
      }
    });

    // Load configs
    Promise.all([
      window.electronAPI.getStoreValue('maxScreenshots'),
      window.electronAPI.getStoreValue('maxTimeMin'),
      window.electronAPI.getStoreValue('enableAudio')
    ]).then(([maxS, maxT, audioEnabled]) => {
      configRef.current.maxScreenshots = maxS || 50;
      configRef.current.maxTimeMin = maxT || 45;
      configRef.current.enableAudio = !!audioEnabled;
    });
  }, []);

  const stopRecording = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (configRef.current.enableAudio) {
      await recorderRef.current.stopAndGetBlob();
    }
    setRunning(false);
    setNextCaptureSec(null);
  };

  const startRecording = async () => {
    try {
      setRunning(true);
      screenshotCountRef.current = 0;
      
      setHistory([]);
      await window.electronAPI.setStoreValue('interviewHistoryObjs', []);
      await window.electronAPI.setStoreValue('interviewHistory', []);

      const intervalSec = (await window.electronAPI.getStoreValue('intervalSec')) || 30;

      // Start the mic stream before we attempt the first cycle
      if (configRef.current.enableAudio) {
        await recorderRef.current.start();
      }

      // Show countdown immediately and start ticking (before first capture)
      setNextCaptureSec(intervalSec);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setNextCaptureSec((prev) => {
          if (prev === null) return intervalSec;
          if (prev <= 1) return intervalSec;
          return prev - 1;
        });
      }, 1000);

      // Setup the main capture interval
      intervalRef.current = setInterval(() => {
        doCapture();
      }, intervalSec * 1000);
      
      // We don't await doCapture() here because it runs on a loop, and if it fails internally it handles its own UI state. 
      // We just fire it off.
      doCapture();

      // Stop automatically after max time
      if (configRef.current.maxTimeMin > 0) {
        timerRef.current = setTimeout(() => {
          stopRecording();
        }, configRef.current.maxTimeMin * 60 * 1000);
      }
    } catch (err: any) {
      console.error('Start Recording Error:', err);
      setHistory([{ time: new Date().toLocaleTimeString(), msg: `Start Error: ${err.message || String(err)}` }]);
      stopRecording();
    }
  };

  const doCapture = async () => {
    try {
      if (screenshotCountRef.current >= configRef.current.maxScreenshots) {
        stopRecording();
        return;
      }
      screenshotCountRef.current += 1;
      setIsProcessing(true);
      setProgressMessage('Capturing screenshot…');

      let audioBlob: Blob | null = null;
      if (configRef.current.enableAudio) {
        setProgressMessage('Capturing audio chunk…');
        audioBlob = await recorderRef.current.stopAndGetBlob();
        await recorderRef.current.start();
      }

      const imageBase64 = await window.electronAPI.captureScreen();
      setProgressMessage('Screenshot captured. Sending request to Gemini…');
      const prompt = await window.electronAPI.getStoreValue('systemPrompt') || 'Give hints and summarize progress.';

      let audioBase64: string | null = null;
      let audioMime: string | null = null;
      if (audioBlob && audioBlob.size > 0) {
        const buffer = await audioBlob.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        audioBase64 = btoa(binary);
        audioMime = audioBlob.type;
      }

      const intervalSec = await window.electronAPI.getStoreValue('intervalSec') || 30;
      setNextCaptureSec(intervalSec);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setNextCaptureSec((prev) => {
          if (prev === null) return intervalSec;
          if (prev <= 1) return intervalSec;
          return prev - 1;
        });
      }, 1000);

      setProgressMessage('Request sent. Waiting for response…');
      const now = new Date().toLocaleTimeString();
      setHistory(prev => {
        const withContext = [...prev, { time: now, msg: 'Calling model with this context.', role: 'context' as const }];
        window.electronAPI.setStoreValue('interviewHistoryObjs', withContext);
        return withContext;
      });

      const response = await window.electronAPI.askGemini(prompt, imageBase64, audioBase64, audioMime);
      setProgressMessage('Response received.');
      if (response) {
        setHistory(prev => {
          const newHist = [...prev, { time: new Date().toLocaleTimeString(), msg: response, role: 'response' as const }];
          window.electronAPI.setStoreValue('interviewHistoryObjs', newHist);
          window.electronAPI.setStoreValue('interviewHistory', newHist.filter(h => h.role === 'response').map(h => h.msg));
          return newHist;
        });
      }
    } catch (err: any) {
      console.error('doCapture Error:', err);
      setProgressMessage(`Error: ${err.message || String(err)}`);
      setHistory(prev => {
        const newHist = [...prev, { time: new Date().toLocaleTimeString(), msg: `Error: ${err.message || String(err)}`, role: 'response' as const }];
        window.electronAPI.setStoreValue('interviewHistoryObjs', newHist);
        window.electronAPI.setStoreValue('interviewHistory', newHist.filter(h => h.role === 'response').map(h => h.msg));
        return newHist;
      });
    } finally {
      setIsProcessing(false);
      setProgressMessage(null);
    }
  };

  // Subscribe to force-capture hotkey; cleanup only unsubscribes, does NOT stop recording
  useEffect(() => {
    const unsub = window.electronAPI.onForceCapture(() => {
      if (running) {
        doCapture();
      }
    });
    return () => {
      unsub();
    };
  }, [running]);

  // On unmount, stop recording and destroy recorder
  useEffect(() => {
    const recorder = recorderRef.current;
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      recorder.destroy();
    };
  }, []);

  const toggleRun = () => {
    if (running) stopRecording();
    else startRecording();
  };

  const handleEvaluate = async () => {
    await stopRecording();
    // Save to store or pass via state
    const histStrs = history.map(h => h.msg);
    await window.electronAPI.setStoreValue('interviewHistory', histStrs);
    navigate('/evaluation');
  };

  return (
    <div className="w-full h-full flex flex-col bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl rounded-xl overflow-hidden font-sans">
      <div className="bg-gray-100 flex items-center justify-between p-2 cursor-move drag-region">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-gray-700 ml-2">PairPilot Assistant</h1>
          {running && nextCaptureSec !== null && (
            <span className="text-xs font-mono font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-md border border-blue-200 whitespace-nowrap">
              next in {nextCaptureSec}s
            </span>
          )}
        </div>
        <div className="flex gap-1.5 no-drag">
          <button onClick={() => navigate('/splash')} className="text-gray-500 hover:text-gray-800 p-0.5" title="Settings">
            <Settings size={16} />
          </button>
          <button 
            onClick={() => window.electronAPI.hideAssistant()} 
            className="text-gray-500 hover:text-gray-800 p-0.5" 
            title="Minimize (Cmd+Shift+H to restore)"
          >
            <Minimize2 size={16} />
          </button>
          <button 
            onClick={async () => {
              try { await stopRecording(); } catch(e) {}
              window.electronAPI.quitApp();
            }} 
            className="text-gray-500 hover:text-red-600 p-0.5 ml-1" 
            title="Quit PairPilot (Cmd+Shift+Q)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto no-drag">
        {!running && history.length === 0 ? (
          <div className="text-gray-400 text-sm text-center mt-10 space-y-3">
            <p>Assistant is idle. Click Start to begin recording screen & audio.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {history.map((h, i) => (
              <li key={i} className={`text-sm ${h.role === 'context' ? 'flex justify-end' : ''}`}>
                <span className={`text-xs text-gray-500 block mb-1 ${h.role === 'context' ? 'text-right' : ''}`}>{h.time}</span>
                <span
                  className={
                    h.role === 'context'
                      ? 'inline-block text-gray-600 leading-relaxed bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg text-sm'
                      : 'text-gray-800 leading-relaxed bg-blue-50 p-3 rounded-lg block whitespace-pre-wrap'
                  }
                >
                  {h.msg}
                </span>
              </li>
            ))}
            {isProcessing && (
              <li className="text-sm">
                <span className="text-blue-700 font-medium leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-200 block">
                  {progressMessage || (history.length === 0 ? 'Capturing initial context…' : 'Analyzing current screen…')}
                </span>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-200 bg-gray-50 p-3 flex justify-between items-center no-drag">
        <button
          onClick={toggleRun}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            running ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {running ? <Square size={16} /> : <Play size={16} />}
          {running ? 'Stop' : 'Start'}
        </button>

        <button
          onClick={handleEvaluate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200"
          title="End Interview & Evaluate"
        >
          <CheckSquare size={16} />
          Evaluate
        </button>
      </div>
    </div>
  );
};

export default FloatingAssistant;
