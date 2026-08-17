import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import SecretPage from './pages/SecretPage';
import AIAssistantPage from './pages/AIAssistantPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#121212] transition-colors duration-300">
        <Navbar />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/secret" element={<SecretPage />} />
          <Route path="/ai" element={<AIAssistantPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;