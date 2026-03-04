import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Briefcase, Frown, Calendar, Clock } from 'lucide-react';

interface PastInterview {
  id: string;
  date: string;
  score: number;
  signal: string;
  summary: string;
  justification: string;
}

const Timeline = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<PastInterview[]>([]);

  useEffect(() => {
    window.electronAPI.getStoreValue('pastInterviews').then((val: any) => {
      if (val && Array.isArray(val)) {
        // Sort descending by date
        val.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setInterviews(val);
      }
    });
  }, []);

  const clearHistory = async () => {
    if (confirm('Are you sure you want to clear all interview history?')) {
      await window.electronAPI.setStoreValue('pastInterviews', []);
      setInterviews([]);
    }
  };

  // Group by day (YYYY-MM-DD)
  const grouped = interviews.reduce((acc, curr) => {
    const d = new Date(curr.date);
    const dayStr = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[dayStr]) acc[dayStr] = [];
    acc[dayStr].push(curr);
    return acc;
  }, {} as Record<string, PastInterview[]>);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-10 px-6 font-sans">
      <div className="max-w-4xl w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => navigate('/splash')}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm"
          >
            <ArrowLeft size={16} />
            Back to Settings
          </button>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Interview Timeline
          </h2>
          {interviews.length > 0 ? (
            <button 
              onClick={clearHistory}
              className="text-sm font-medium text-red-600 hover:text-red-800 px-4 py-2"
            >
              Clear History
            </button>
          ) : <div className="w-24"></div>}
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="text-center bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-gray-500">
            <Calendar className="mx-auto w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No past interviews recorded yet.</p>
            <p className="text-sm mt-1">Complete a pair-programming session and hit evaluate to see it here.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(grouped).map(([day, items]) => (
              <div key={day} className="relative">
                <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur py-2 mb-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Calendar size={18} className="text-blue-600" />
                    {day}
                  </h3>
                </div>

                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row">
                        
                        <div className="bg-gray-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 min-w-[160px]">
                          <span className="text-4xl font-black text-gray-900 mb-1">{item.score}</span>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Score</span>
                          
                          <div className="flex flex-col items-center justify-center gap-1">
                            {item.signal === 'Strong Hire' && <Award className="w-6 h-6 text-green-500" />}
                            {item.signal === 'Weak Hire' && <Briefcase className="w-6 h-6 text-yellow-500" />}
                            {(item.signal === 'No Hire' || item.signal === 'Error') && <Frown className="w-6 h-6 text-red-500" />}
                            <span className={`text-sm font-bold ${
                              item.signal === 'Strong Hire' ? 'text-green-600' :
                              item.signal === 'Weak Hire' ? 'text-yellow-600' : 'text-red-600'
                            }`}>{item.signal}</span>
                          </div>
                        </div>

                        <div className="p-6 flex-1">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-md font-bold text-gray-900">Session Summary</h4>
                            <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                              <Clock size={12} />
                              {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <p className="text-gray-700 text-sm leading-relaxed mb-4">
                            {item.summary}
                          </p>

                          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                            <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-1">Justification</h5>
                            <p className="text-sm text-blue-800">{item.justification}</p>
                          </div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;
