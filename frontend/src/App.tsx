import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/HomePage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#fdfbf7]">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          {/* <Route path="/kalendar" element={<Kalendar />} /> */}
          {/* <Route path="/ai" element={<AiSuggestion />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;