import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Settings from './components/Settings';
import FloatingAssistant from './components/FloatingAssistant';
import EvaluationResult from './components/EvaluationResult';
import Timeline from './components/Timeline';
import './index.css';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/splash" element={<Settings />} />
        <Route path="/assistant" element={<FloatingAssistant />} />
        <Route path="/evaluation" element={<EvaluationResult />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="*" element={<Navigate to="/splash" />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
