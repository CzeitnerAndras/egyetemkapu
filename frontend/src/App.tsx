import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import SecretPage from './pages/SecretPage';
import AIAssistantPage from './pages/AIAssistantPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage';
import CalculatorPage from './pages/CalculatorPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import ReferencePage from './pages/ReferencePage';
import FocusRoomPage from './pages/FocusRoomPage';
import IdeaBoxPage from './pages/IdeaBoxPage';
import AdminPanelPage from './pages/AdminPanelPage';
import AboutPage from './pages/AboutPage';
import FaqPage from './pages/FaqPage';
import SettingsPage from './pages/SettingsPage';
import LinksPage from './pages/LinksPage';
import { LanguageProvider } from './i18n/LanguageContext';

function App() {
  return (
    <LanguageProvider>
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-[#fdfbf7] via-[#fdfbf7] to-[#efe6d5] dark:from-[#121212] dark:via-[#121212] dark:to-[#2e1065] secret:bg-none secret:bg-[#031e08] secret:text-[#1cf85d] transition-colors duration-500">
        <Navbar />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/secret" element={<SecretPage />} />
          <Route path="/ai" element={<AIAssistantPage />} />
          <Route path="/naptar" element={<CalendarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/kalkulator" element={<CalculatorPage />} />
          <Route path="/tudastar" element={<KnowledgeBasePage />} />
          <Route path="/hivatkozas" element={<ReferencePage />} />
          <Route path="/fokusz" element={<FocusRoomPage />} />
          <Route path="/ideabox" element={<IdeaBoxPage />} />
          <Route path="/admin" element={<AdminPanelPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/links" element={<LinksPage />} />
        </Routes>
      </div>
    </Router>
    </LanguageProvider>
  );
}

export default App;