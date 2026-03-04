import React, { useEffect, useState, useRef } from 'react';
import { Award, Briefcase, Frown, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EvaluationResult = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const evaluatedRef = useRef(false);

  useEffect(() => {
    const doEval = async () => {
      if (evaluatedRef.current) return;
      evaluatedRef.current = true;

      let evaluatedResult;
      try {
        const historyStrs = await window.electronAPI.getStoreValue('interviewHistory');
        if (historyStrs && historyStrs.length > 0) {
          evaluatedResult = await window.electronAPI.evaluateInterview(historyStrs);
        } else {
          evaluatedResult = {
            score: 0,
            signal: 'No Hire',
            summary: 'The session was terminated before any meaningful interaction took place.',
            justification: 'No interview history recorded.',
          };
        }
      } catch (err: any) {
        evaluatedResult = {
          score: 0,
          signal: 'Error',
          summary: 'An error occurred during evaluation parsing or network transmission.',
          justification: err.message || 'Evaluation failed.',
        };
      }

      setResult(evaluatedResult);

      // Save to past interviews
      const past = await window.electronAPI.getStoreValue('pastInterviews') || [];
      past.push({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        ...evaluatedResult
      });
      await window.electronAPI.setStoreValue('pastInterviews', past);
    };

    doEval();
  }, []);

  if (!result) return <div className="p-8 text-center text-gray-500">Loading Evaluation...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-2">Interview Evaluation</h2>
          <p className="text-blue-100 opacity-90">PairPilot Assessment Complete</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex items-center justify-center gap-6 pb-8 border-b border-gray-100">
            <div className="text-center">
              <span className="block text-5xl font-black text-gray-900 mb-2">{result.score}<span className="text-2xl text-gray-400">/100</span></span>
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">Score</span>
            </div>

            <div className="h-16 w-px bg-gray-200"></div>

            <div className="text-center flex flex-col items-center justify-center">
              {result.signal === 'Strong Hire' && <Award className="w-12 h-12 text-green-500 mb-2" />}
              {result.signal === 'Weak Hire' && <Briefcase className="w-12 h-12 text-yellow-500 mb-2" />}
              {(result.signal === 'No Hire' || result.signal === 'Error') && <Frown className="w-12 h-12 text-red-500 mb-2" />}
              <span className={`block text-xl font-bold ${
                result.signal === 'Strong Hire' ? 'text-green-600' :
                result.signal === 'Weak Hire' ? 'text-yellow-600' : 'text-red-600'
              }`}>{result.signal}</span>
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">Signal</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
              Interview Summary
            </h3>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-gray-700 leading-relaxed">
                {result.summary}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
              Assessment Justification
            </h3>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-gray-700 leading-relaxed">
                {result.justification}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-5 border-t border-gray-100 flex justify-between">
          <button 
            onClick={() => navigate('/splash')}
            className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Settings
          </button>
          <button 
            onClick={() => navigate('/timeline')}
            className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            View Timeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationResult;
