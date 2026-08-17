import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import SecretPage from './pages/SecretPage';
import AIAssistantPage from './pages/AIAssistantPage';
import CalendarPage from './pages/CalendarPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-[#fdfbf7] via-[#fdfbf7] to-[#efe6d5] dark:from-[#121212] dark:via-[#121212] dark:to-[#2e1065] transition-colors duration-500">
        <Navbar />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/secret" element={<SecretPage />} />
          <Route path="/ai" element={<AIAssistantPage />} />
          <Route path="/naptar" element={<CalendarPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;