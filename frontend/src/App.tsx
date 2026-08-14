import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#fdfbf7]">
        <Navbar />
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* <Route path="/kalendar" element={<CalendarPage />} /> */}
          {/* <Route path="/ai" element={<AiSuggestionPage />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;